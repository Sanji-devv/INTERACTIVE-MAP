(() => {

  const imagePath = 'assets/worldmap.png';

  // Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  let isDarkMode = true;
  
  themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
      document.documentElement.classList.remove('light-mode');
      themeToggle.textContent = '🌙 Night';
    } else {
      document.documentElement.classList.add('light-mode');
      themeToggle.textContent = '☀️ Day';
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

  // Players
  let players = [];
  const playerNameInput = document.getElementById('playerName');
  const addPlayerBtn = document.getElementById('addPlayerBtn');
  const playersList = document.getElementById('playersList');

  addPlayerBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (name) {
      players.push({ id: Date.now(), name });
      playerNameInput.value = '';
      renderPlayers();
    }
  });

  function renderPlayers() {
    playersList.innerHTML = players.length ? players.map(p => 
      `<div style="padding:8px;background:rgba(255,255,255,0.05);border-radius:4px;display:flex;justify-content:space-between;align-items:center;">
        <span>${p.name}</span>
        <button style="background:#ff4d4d;padding:4px 8px;font-size:11px;" onclick="window.removePlayer(${p.id})">Remove</button>
      </div>`
    ).join('') : '<p style="font-size:12px;color:rgba(255,255,255,0.6);text-align:center;">No players yet</p>';
  }

  window.removePlayer = (id) => {
    players = players.filter(p => p.id !== id);
    renderPlayers();
  };

  // state
  let ITEMS = [];
  let markers = {};
  let placing = false;
  let map, imgWidth, imgHeight, bounds;
  let selectedColor = '#f97316'; // default

  // 18 fixed colors - diverse and distinguishable
  const COLORS = ['#ffffff','#000000','#ff0000','#00ff00','#0000ff','#ffff00','#ff8800','#ff00ff','#00ffff','#c0c0c0','#800000','#008000','#000080','#808000','#800080','#008080','#ffa500','#a52a2a'];

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
    const markerFile = `assets/markers/${markerType}.png`;
    const color = item.color || selectedColor;
    const html = `<div style="position:relative;width:28px;height:28px;"><div style="position:absolute;top:0;left:0;width:28px;height:28px;background:${color};border-radius:50%;opacity:0.6;"></div><img src="${markerFile}" alt="${markerType}" style="width:100%;height:100%;position:absolute;top:0;left:0;z-index:1;filter:drop-shadow(0 0 2px rgba(0,0,0,0.5));"/></div>`;
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

    fetch('data.json').then(r => {
      if (!r.ok) return null;
      return r.json();
    }).then(arr => {
      if (!arr) return;
      arr.forEach(it => {
        if (typeof it.x === 'number' && typeof it.y === 'number') {
          it.color = it.color || selectedColor;
          ITEMS.push(it);
        } else if (Array.isArray(it.coords) && it.coords.length===2) {
          ITEMS.push({
            id: it.id || ('m'+Date.now()+Math.random()),
            name: it.name || 'Untitled',
            desc: it.desc || '',
            type: it.type || 'city',
            color: it.color || selectedColor,
            x: Math.round(it.coords[1]),
            y: Math.round(it.coords[0])
          });
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
    const id = 'm' + Date.now() + Math.floor(Math.random()*999);
    const it = {
      id,
      name: inputName.value || 'Untitled',
      desc: inputDesc.value || '',
      type: selectType.value || 'city',
      color: selectedColor,
      x, y
    };
    ITEMS.push(it);
    addMarkerToMap(it);
    applyFilters();
  }

  function addMarkerToMap(item){
    const m = L.marker([item.y, item.x], {
      icon: createIconForItem(item),
      draggable: true
    }).addTo(map);

    m.bindPopup(`<b>${escapeHtml(item.name)}</b><br>${escapeHtml(item.desc)}<br><small>${item.type}</small><br><small>(${item.x}, ${item.y})</small>`);

    m.on('dragend', ev => {
      const p = ev.target.getLatLng();
      item.x = Math.round(p.lng); item.y = Math.round(p.lat);
      m.setPopupContent(`<b>${escapeHtml(item.name)}</b><br>${escapeHtml(item.desc)}<br><small>${item.type}</small><br><small>(${item.x}, ${item.y})</small>`);
    });

    markers[item.id] = m;
  }

  placeBtn.addEventListener('click', () => {
    placing = !placing;
    placeBtn.textContent = placing ? '✓ Click on map to place marker' : 'Create Marker (click map)';
    placeBtn.style.background = placing ? '#22c55e' : '#10b981';
  });

  saveBtn.addEventListener('click', () => {
    if (editingItemId.id) {
      const item = ITEMS.find(x => x.id === editingItemId.id);
      if (item) {
        item.name = inputName.value || 'Untitled';
        item.desc = inputDesc.value || '';
        item.type = selectType.value || 'city';
        item.color = selectedColor;
        const m = markers[editingItemId.id];
        if (m) {
          m.setIcon(createIconForItem(item));
          m.setPopupContent(`<b>${escapeHtml(item.name)}</b><br>${escapeHtml(item.desc)}<br><small>${item.type}</small><br><small>(${item.x}, ${item.y})</small>`);
        }
        editingItemId.id = null;
        saveBtn.textContent = 'Place on Map (click to place)';
        saveBtn.style.background = 'var(--accent)';
        inputName.value = '';
        inputDesc.value = '';
        applyFilters();
      }
    }
  });

  exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(ITEMS, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'map-markers.json'; a.click();
    URL.revokeObjectURL(url);
  });

  importFile.addEventListener('change', (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const arr = JSON.parse(reader.result);
        for (let k in markers) { map.removeLayer(markers[k]); }
        markers = {}; ITEMS = [];
        arr.forEach(it => {
          it.color = it.color || selectedColor;
          ITEMS.push(it);
        });
        ITEMS.forEach(it => addMarkerToMap(it));
        applyFilters();
        alert('Import successful');
      } catch (e) {
        alert('Import failed: JSON error');
      }
    };
    reader.readAsText(f);
  });

  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });

  document.getElementById('importPNGBtn').addEventListener('click', () => {
    document.getElementById('importPNGFile').click();
  });

  document.getElementById('importPNGFile').addEventListener('change', (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const blob = new Blob([e.target.result], {type:'image/png'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.name;
      a.click();
      URL.revokeObjectURL(url);
      alert('PNG downloaded successfully');
    };
    reader.readAsArrayBuffer(f);
  });

  document.getElementById('exportPNGBtn').addEventListener('click', () => {
    alert('PNG export feature: Please use your browser\'s screenshot tools or export from the map view.');
  });

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

  // Login/Register handlers
  document.getElementById('loginBtn').addEventListener('click', () => {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    if (email && pass) {
      alert('Login: ' + email);
      document.getElementById('loginEmail').value = '';
      document.getElementById('loginPassword').value = '';
    }
  });

  document.getElementById('registerBtn').addEventListener('click', () => {
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;
    if (email && pass && confirm && pass === confirm) {
      alert('Registered: ' + email);
      document.getElementById('regEmail').value = '';
      document.getElementById('regPassword').value = '';
      document.getElementById('regConfirm').value = '';
    } else if (pass !== confirm) {
      alert('Passwords do not match');
    }
  });

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

})();