(() => {

  const imagePath = 'assets/worldmap.png';

  // Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  let isDarkMode = true;
  
  themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
      document.documentElement.classList.remove('light-mode');
      themeToggle.textContent = '🌙';
    } else {
      document.documentElement.classList.add('light-mode');
      themeToggle.textContent = '☀️';
    }
  });

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });

  // DOM
  const placeBtn = document.getElementById('placeBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importFile = document.getElementById('importFile');
  const clearBtn = document.getElementById('clearBtn');
  const disableAllBtn = document.getElementById('disableAllBtn');
  const mapSizeEl = document.getElementById('mapSize');

  const inputName = document.getElementById('name');
  const inputDesc = document.getElementById('desc');
  const selectType = document.getElementById('type');
  const colorSwatchesEl = document.getElementById('colorSwatches');

  const filters = Array.from(document.querySelectorAll('.filter-btn'));

  // Open Profile button placed in the Account tab (hidden until login)
  const openProfileBtn = document.getElementById('openProfileBtn');

  // Fallback in-page user DB shim (only if real `user_database.js` isn't loaded)
  if (typeof registerUser !== 'function') {
    (function(){
      const LS_KEY = 'dnd-user-db';
      function load(){ try { return JSON.parse(localStorage.getItem(LS_KEY)) || {users:[]}; } catch(e){ return {users:[]}; } }
      function save(db){ localStorage.setItem(LS_KEY, JSON.stringify(db)); }
      function findByEmail(email){ const db=load(); return db.users.find(u=>u.email===email); }
      function findById(id){ const db=load(); return db.users.find(u=>u.id===id); }

      window.registerUser = function(email, username, password, confirm){
        if (!email || !username || !password) return { success:false, message:'Missing fields' };
        const db = load();
        if (db.users.find(u=>u.email===email)) return { success:false, message:'Email already exists' };
        const id = 'u'+Date.now();
        const user = { id, email, username, password, type:'USER', profile: { nickname: username, bio:'' }, createdAt: Date.now() };
        db.users.push(user); save(db);
        return { success:true, user };
      };

      window.loginUser = function(email, password){
        const u = findByEmail(email);
        if (!u) return { success:false, message:'User not found' };
        if (u.password !== password) return { success:false, message:'Invalid password' };
        return { success:true, user: u };
      };

      window.logoutUser = function(userId){ return { success:true }; };

      window.updateProfile = function(userId, updates){
        const db = load(); const u = db.users.find(x=>x.id===userId); if(!u) return { success:false, message:'User not found' };
        u.profile = Object.assign({}, u.profile||{}, updates);
        save(db);
        return { success:true, user: u };
      };

      window.exportUserDatabase = function(){ return load(); };
      window.importUserDatabase = function(data){ if (!data) return; localStorage.setItem(LS_KEY, JSON.stringify(data)); };
    })();
  }

  // state
  let ITEMS = [];
  let markers = {};
  let placing = false;
  let map, imgWidth, imgHeight, bounds;
  let selectedColor = '#f97316'; // default

  // Helper function to generate random color
  function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  // 18 colors - first 9 fixed, next 9 random
  const COLORS = [
    '#ffffff','#000000','#ff0000','#00ff00','#0000ff',
    '#ffff00','#ff8800','#ff00ff','#00ffff',
    getRandomColor(),getRandomColor(),getRandomColor(),
    getRandomColor(),getRandomColor(),getRandomColor(),
    getRandomColor(),getRandomColor(),getRandomColor()
  ];

  // build swatches
  COLORS.forEach(c => {
    const d = document.createElement('div');
    d.className = 'swatch';
    d.style.background = c;
    d.title = c;
    d.dataset.color = c;
    d.addEventListener('click', () => {
      selectedColor = c;
      document.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
      d.classList.add('selected');
    });
    colorSwatchesEl.appendChild(d);
  });
  // select first by default
  const first = colorSwatchesEl.querySelector('.swatch');
  if (first) first.classList.add('selected');

  // helper create divIcon with type-specific marker images and color overlay
  function createIconForItem(item){
    const markerType = item.type || 'city';
    // use assets/MARKER_PNG which contains the project's marker images
    const markerFile = `assets/MARKER_PNG/${markerType}.png`;
    // fallback to a generic marker if specific type image missing
    const fallbackFile = 'assets/MARKER_PNG/marker.png';
    const color = item.color || selectedColor;
    const html = `<div style="position:relative;width:28px;height:28px;"><div style="position:absolute;top:0;left:0;width:28px;height:28px;background:${color};border-radius:50%;opacity:0.6;"></div><img src="${markerFile}" onerror="this.src='${fallbackFile}'" alt="${markerType}" style="width:100%;height:100%;position:absolute;top:0;left:0;z-index:1;filter:drop-shadow(0 0 2px rgba(0,0,0,0.5));"/></div>`;
    return L.divIcon({
      className: '',
      html,
      iconSize: [28,28],
      iconAnchor: [14,14],
      popupAnchor: [0,-28]
    });
  }

  // load image to get size and init map
  const img = new Image();
  img.onload = () => {
    imgWidth = img.width; imgHeight = img.height;
    mapSizeEl.textContent = `${imgWidth} × ${imgHeight}px`;

    map = L.map('map', {
      crs: L.CRS.Simple,
      minZoom:-5,
      maxZoom:4,
      zoomSnap: 0.25
    });

    bounds = [[0,0],[imgHeight, imgWidth]];
    L.imageOverlay(imagePath, bounds).addTo(map);
    map.fitBounds(bounds);

    map.on('click', e => {
      const {lat, lng} = e.latlng;
      if (placing) {
        const x = Math.round(lng), y = Math.round(lat);
        addItemFromFormAt(x,y);
        placing = false;
        placeBtn.textContent = 'Place on Map (click to place)';
        return;
      }
    });

    // Load markers from database
    try {
      const markers = getAllMarkers();
      markers.forEach(it => {
        if (typeof it.x === 'number' && typeof it.y === 'number') {
          it.color = it.color || selectedColor;
          ITEMS.push(it);
        }
      });
      ITEMS.forEach(it => addMarkerToMap(it));
      applyFilters();

      // attach popup handlers for Edit/Delete using popupopen event
      map.on('popupopen', e => {
        try {
          const popupNode = e.popup._contentNode;
          if (!popupNode) return;
          const delBtn = popupNode.querySelector('.popup-delete');
          const editBtn = popupNode.querySelector('.popup-edit');
          const id = popupNode.querySelector('[data-id]')?.dataset.id;

          if (delBtn && id) {
            delBtn.onclick = () => {
              if (!currentUser) { alert('Please login to delete markers'); return; }
              if (!confirm('Delete this marker?')) return;
              if (typeof deleteMarker !== 'function') {
                alert('deleteMarker not available');
                return;
              }
              const res = deleteMarker(id, currentUser.id);
              if (res && res.success) {
                // remove from ITEMS and map
                const idx = ITEMS.findIndex(x => x.id === id);
                if (idx > -1) ITEMS.splice(idx, 1);
                if (markers[id]) { map.removeLayer(markers[id]); delete markers[id]; }
                map.closePopup();
              } else {
                alert('Delete failed: ' + (res ? res.message : 'unknown'));
              }
            };
          }

          if (editBtn && id) {
            editBtn.onclick = () => {
              if (!currentUser) { alert('Please login to edit markers'); return; }
              const item = ITEMS.find(x => x.id === id);
              if (!item) return;
              const formHtml = `
                <div>
                  <input id="edit-name-${id}" value="${escapeHtml(item.name)}" style="width:100%;margin-bottom:6px;padding:6px;background:#0f172a;border:1px solid #475569;color:#fff;border-radius:4px;" />
                  <input id="edit-desc-${id}" value="${escapeHtml(item.desc)}" style="width:100%;margin-bottom:6px;padding:6px;background:#0f172a;border:1px solid #475569;color:#fff;border-radius:4px;" />
                  <div style="display:flex;gap:8px;">
                    <button id="save-${id}" style="background:#10b981;color:#fff;border:0;padding:6px 10px;border-radius:4px;cursor:pointer;">Save</button>
                    <button id="cancel-${id}" style="background:#64748b;color:#fff;border:0;padding:6px 10px;border-radius:4px;cursor:pointer;">Cancel</button>
                  </div>
                </div>`;

              const marker = markers[id];
              if (!marker) return;
              marker.setPopupContent(formHtml);
              // after content is set, get the node
              const newNode = marker.getPopup()._contentNode;
              newNode.querySelector('#save-' + id).onclick = () => {
                const newName = newNode.querySelector('#edit-name-' + id).value;
                const newDesc = newNode.querySelector('#edit-desc-' + id).value;
                if (typeof updateMarker !== 'function') { alert('updateMarker not available'); marker.setPopupContent('Error'); return; }
                const r = updateMarker(id, { name: newName, description: newDesc }, currentUser.id);
                if (r && r.success) {
                  item.name = newName; item.desc = newDesc;
                  marker.setPopupContent(`<b>${escapeHtml(item.name)}</b><br>${escapeHtml(item.desc)}<br><small>${item.type}</small><br><small>(${item.x}, ${item.y})</small>`);
                } else {
                  alert('Update failed: ' + (r ? r.message : 'unknown'));
                  marker.setPopupContent(`<b>${escapeHtml(item.name)}</b><br>${escapeHtml(item.desc)}</b>`);
                }
              };
              newNode.querySelector('#cancel-' + id).onclick = () => {
                const marker = markers[id]; if (marker) marker.setPopupContent(`<b>${escapeHtml(item.name)}</b><br>${escapeHtml(item.desc)}<br><small>${item.type}</small><br><small>(${item.x}, ${item.y})</small>`);
              };
            };
          }
        } catch (e) { console.warn('popup handler error', e); }
      });
    } catch(e) {
      console.warn('Failed to load markers:', e);
    }

    // Try to load backup from data.json
    fetch('data.json').then(r => {
      if (!r.ok) return null;
      return r.json();
    }).then(arr => {
      if (!arr) return;
      arr.forEach(it => {
        // only add if not already loaded from database
        if (!ITEMS.find(existing => existing.id === it.id)) {
          if (typeof it.x === 'number' && typeof it.y === 'number') {
            it.color = it.color || selectedColor;
            ITEMS.push(it);
          }
        }
      });
      ITEMS.forEach(it => addMarkerToMap(it));
      applyFilters();
    }).catch(()=>{});

  };
  img.onerror = () => {
    alert('assets/worldmap.png not found. Place worldmap.png in the assets folder and refresh the page.');
  };
  img.src = imagePath;

  function addItemFromFormAt(x,y){
    // Only logged-in users can create markers
    if (!currentUser) {
      alert('Please login first to create markers');
      return;
    }

    const markerData = {
      name: inputName.value || 'Untitled',
      description: inputDesc.value || '',
      type: selectType.value || 'city',
      color: selectedColor,
      x, y
    };

    const result = addMarker(markerData, currentUser.id, currentUser.email);
    if (result.success) {
      const item = result.marker;
      ITEMS.push(item);
      addMarkerToMap(item);
      applyFilters();
      // Clear form
      inputName.value = '';
      inputDesc.value = '';
      selectType.value = 'city';
    } else {
      alert('Failed to create marker: ' + result.message);
    }
  }

  function addMarkerToMap(item){
    const m = L.marker([item.y, item.x], {
      icon: createIconForItem(item),
      draggable: true
    }).addTo(map);

    function getPopupHtml(it){
      return `<div class="popup-content"><b>${escapeHtml(it.name)}</b><br>${escapeHtml(it.desc)}<br><small>${it.type}</small><br><small>(${it.x}, ${it.y})</small>
        <div style="margin-top:6px;display:flex;gap:6px;">
          <button class="popup-edit" data-id="${it.id}" style="background:#3b82f6;color:#fff;border:0;padding:4px 8px;border-radius:4px;cursor:pointer;">Edit</button>
          <button class="popup-delete" data-id="${it.id}" style="background:#ef4444;color:#fff;border:0;padding:4px 8px;border-radius:4px;cursor:pointer;">Delete</button>
        </div>
      </div>`;
    }

    m.bindPopup(getPopupHtml(item));

    m.on('dragend', ev => {
      const p = ev.target.getLatLng();
      const newX = Math.round(p.lng), newY = Math.round(p.lat);
      // try to persist via updateMarker if available
      if (typeof updateMarker === 'function' && currentUser) {
        const res = updateMarker(item.id, { x: newX, y: newY }, currentUser.id);
        if (res && res.success) {
          item.x = newX; item.y = newY;
          m.setPopupContent(getPopupHtml(item));
        } else {
          alert('Unable to move marker: ' + (res ? res.message : 'Permission denied'));
          m.setLatLng([item.y, item.x]); // revert
        }
      } else {
        // fallback: update local state
        item.x = newX; item.y = newY;
        m.setPopupContent(getPopupHtml(item));
      }
    });

    markers[item.id] = m;
  }

  if (placeBtn) {
    placeBtn.addEventListener('click', () => {
      placing = !placing;
      placeBtn.textContent = placing ? '✓ Click on map to place marker' : 'Create Marker (click map)';
      placeBtn.style.background = placing ? '#22c55e' : '#10b981';
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
    // Export both databases
    const mapData = exportDatabase();
    const userData = exportUserDatabase();
    const combined = {
      map: mapData,
      user: userData,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(combined, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `dnd-map-backup-${new Date().toISOString().split('T')[0]}.json`; 
    a.click();
    URL.revokeObjectURL(url);
    alert('Database exported successfully');
    });
  }

  if (importFile) {
    importFile.addEventListener('change', (ev) => {
      const f = ev.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          
          // Import map database
          if (data.map || data.markers) {
            const mapData = data.map || data;
            importDatabase(mapData);
          }
          
          // Import user database
          if (data.user) {
            importUserDatabase(data.user);
          }
          
          // Clear the current markers from map
          for (let k in markers) { if (map && map.removeLayer) map.removeLayer(markers[k]); }
          markers = {}; 
          ITEMS = [];
          
          // Reload markers from database
          try {
            const loadedMarkers = getAllMarkers();
            loadedMarkers.forEach(markerData => {
              const it = {
                id: markerData.id,
                name: markerData.name,
                desc: markerData.description || '',
                type: markerData.type,
                color: markerData.color || selectedColor,
                x: markerData.x,
                y: markerData.y
              };
              ITEMS.push(it);
            });
          } catch(e) {
            console.warn('Could not reload markers:', e);
          }
          
          ITEMS.forEach(it => addMarkerToMap(it));
          applyFilters();
          alert('Import successful - ' + ITEMS.length + ' markers loaded');
        } catch (e) {
          alert('Import failed: ' + e.message);
        }
      };
      reader.readAsText(f);
    });
  }

  const importBtn = document.getElementById('importBtn');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      if (importFile) importFile.click();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!confirm('Clear all markers? This cannot be undone.')) return;
      // Clear from database
      ITEMS.forEach(it => {
        if (currentUser && typeof deleteMarker === 'function') {
          try { deleteMarker(it.id, currentUser.id); } catch(e){}
        }
      });
      // Clear from map
      for (let k in markers) { if (map && map.removeLayer) map.removeLayer(markers[k]); }
      markers = {};
      ITEMS = [];
      applyFilters();
      alert('All markers cleared');
    });
  }

  disableAllBtn.addEventListener('click', () => {
    filters.forEach(f => {
      f.classList.remove('active');
    });
    applyFilters();
  });

  filters.forEach(btn => btn.addEventListener('click', (e) => {
    e.target.closest('.filter-btn').classList.toggle('active');
    applyFilters();
  }));

  function applyFilters(){
    const active = {};
    filters.forEach(f => { 
      if (f.classList.contains('active')) active[f.dataset.type] = true; 
    });
    Object.entries(markers).forEach(([id,m]) => {
      const it = ITEMS.find(x => x.id === id);
      if (!it) return;
      if (active[it.type]) {
        if (!map.hasLayer(m)) m.addTo(map);
      } else {
        if (map.hasLayer(m)) map.removeLayer(m);
      }
    });
  }

  // Set all filters active by default
  filters.forEach(f => f.classList.add('active'));
  applyFilters();

  colorSwatchesEl.addEventListener('click', (e) => {
    const s = e.target.closest('.swatch');
    if (!s) return;
    selectedColor = s.dataset.color;
  });

  // Auth tab switching (buttons inside Account tab)
  document.querySelectorAll('.auth-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.authTab;
      document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.auth-tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`${tabName}Form`).classList.add('active');
    });
  });

  // Global current user
  let currentUser = null;
  // character markers map
  const characterMarkers = {};

  // Profile / Character DOM
  const regUsernameInput = document.getElementById('regUsername');

  // Helper to normalize error/message fields from different DB implementations
  function getResultMessage(res) {
    if (!res) return 'Unknown error';
    if (typeof res === 'string') return res;
    return res.message || res.error || (res.data && (res.data.message || res.data.error)) || 'Unknown error';
  }

  // restore current user from localStorage if present
  (function restoreSession(){
    try {
      const s = localStorage.getItem('dnd-current-user');
      if (!s) return;
      const u = JSON.parse(s);
      if (u && u.id) {
        currentUser = u;
        showUserInfo();
        if (openProfileBtn) {
          openProfileBtn.style.display = 'block';
          openProfileBtn.onclick = () => window.open('profile.html', '_blank');
        }
      }
    } catch(e) { console.warn('restore session failed', e); }
  })();

  function showAuthForm() {
    document.getElementById('authForm').style.display = 'block';
    document.getElementById('userInfo').style.display = 'none';
  }

  function showUserInfo() {
    document.getElementById('authForm').style.display = 'none';
    document.getElementById('userInfo').style.display = 'block';
    document.getElementById('currentUser').textContent = `${currentUser.username} (${currentUser.email})`;
    document.getElementById('userType').textContent = `Type: ${currentUser.type}`;
  }

  // Login handler (defensive)
  (function(){
    const loginBtn = document.getElementById('loginBtn');
    if (!loginBtn) return;
    loginBtn.addEventListener('click', () => {
      const emailEl = document.getElementById('loginEmail');
      const passEl = document.getElementById('loginPassword');
      const email = emailEl ? emailEl.value.trim() : '';
      const pass = passEl ? passEl.value : '';
      if (!email || !pass) {
        alert('Please enter email and password');
        return;
      }
      const result = (typeof loginUser === 'function') ? loginUser(email, pass) : { success: false, message: 'loginUser not available' };
      if (result && result.success) {
        currentUser = result.user;
        if (emailEl) emailEl.value = '';
        if (passEl) passEl.value = '';
        // Store user in localStorage for profile page
        try { localStorage.setItem('dnd-current-user', JSON.stringify(currentUser)); } catch(e){}
        showUserInfo();
        if (openProfileBtn) {
          openProfileBtn.style.display = 'block';
          openProfileBtn.onclick = () => window.open('profile.html', '_blank');
        }
      } else {
        alert('Login failed: ' + getResultMessage(result));
      }
    });
  })();

  // Register handler (defensive)
  (function(){
    const registerBtn = document.getElementById('registerBtn');
    if (!registerBtn) return;
    registerBtn.addEventListener('click', () => {
      const emailEl = document.getElementById('regEmail');
      const passEl = document.getElementById('regPassword');
      const confirmEl = document.getElementById('regConfirm');
      const usernameEl = regUsernameInput;
      const username = usernameEl ? usernameEl.value.trim() : '';
      const email = emailEl ? emailEl.value.trim() : '';
      const pass = passEl ? passEl.value : '';
      const confirm = confirmEl ? confirmEl.value : '';
      if (!email || !username || !pass || !confirm) {
        alert('Please fill all fields');
        return;
      }
      if (pass !== confirm) {
        alert('Passwords do not match');
        return;
      }
      const result = (typeof registerUser === 'function') ? registerUser(email, username, pass, confirm) : { success: false, message: 'registerUser not available' };
      if (result && result.success) {
        if (emailEl) emailEl.value = '';
        if (usernameEl) usernameEl.value = '';
        if (passEl) passEl.value = '';
        if (confirmEl) confirmEl.value = '';
        const loginResult = (typeof loginUser === 'function') ? loginUser(email, pass) : { success: false };
        if (loginResult && loginResult.success) {
          currentUser = loginResult.user;
          try { localStorage.setItem('dnd-current-user', JSON.stringify(currentUser)); } catch(e){}
          showUserInfo();
          if (openProfileBtn) {
            openProfileBtn.style.display = 'block';
            openProfileBtn.onclick = () => window.open('profile.html', '_blank');
          }
        } else {
          alert('Auto-login failed: ' + getResultMessage(loginResult));
        }
      } else {
        alert('Registration failed: ' + getResultMessage(result));
      }
    });
  })();

  // Logout handler (defensive)
  (function(){
    const logoutBtnEl = document.getElementById('logoutBtn');
    if (!logoutBtnEl) return;
    logoutBtnEl.addEventListener('click', () => {
      if (currentUser && typeof logoutUser === 'function') {
        try { logoutUser(currentUser.id); } catch(e){}
      }
      currentUser = null;
      // Clear user from localStorage
      localStorage.removeItem('dnd-current-user');
      showAuthForm();
      alert('Logged out');
      if (openProfileBtn) openProfileBtn.style.display = 'none';
      Object.values(characterMarkers).forEach(m => { if (map && map.hasLayer && map.hasLayer(m)) map.removeLayer(m); });
      Object.keys(characterMarkers).forEach(k => delete characterMarkers[k]);
    });
  })();

  // Update profile (defensive)
  (function(){
    // Profile update moved to profile.html
  })();

  // Create character (defensive)
  (function(){
    // Character creation moved to profile.html
  })();

  // Add or update marker for a character
  function addCharacterMarker(ch){
    if (!map) return; // map not ready yet
    // remove old
    if (characterMarkers[ch.id]) { if (map.hasLayer(characterMarkers[ch.id])) map.removeLayer(characterMarkers[ch.id]); }
    const itemLike = { id: ch.id, name: ch.name, desc: ch.className, type: 'player', color: ch.color || '#ef4444', x: ch.x, y: ch.y };
    const m = L.marker([ch.y, ch.x], { icon: createIconForItem(itemLike), draggable: (currentUser && (currentUser.id === ch.ownerId || currentUser.type === 'ADMIN')) });
    m.bindPopup(`<b>${escapeHtml(ch.name)}</b><br>${escapeHtml(ch.className)} (Lvl ${ch.level})<br><small>(${Math.round(ch.x)}, ${Math.round(ch.y)})</small>`);
    m.on('dragend', ev => {
      const p = ev.target.getLatLng();
      const tx = Math.round(p.lng), ty = Math.round(p.lat);
      const actorId = currentUser ? currentUser.id : null;
      const res = moveCharacter(ch.id, tx, ty, actorId);
      if (res.success) {
        updateCharacterPosition(res.character.id, tx, ty, res.character.name, currentUser?.username || 'Unknown');
        addCharacterMarker(res.character);
        renderCharacters();
      } else {
        alert('Not authorized to move this character');
        // reset marker position
        m.setLatLng([ch.y, ch.x]);
      }
    });
    m.addTo(map);
    characterMarkers[ch.id] = m;
  }

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

})();