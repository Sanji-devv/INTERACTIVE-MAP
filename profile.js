(function () {
	const LS_ACTIVE_KEY = (userId) => `dnd_activeCharacter_${userId}`;

	function safe(fnName, ...args) {
		try {
			if (window && typeof window[fnName] === 'function') {
				return window[fnName](...args);
			}
		} catch (e) {
			console.warn(`safe:${fnName} failed`, e);
		}
		return null;
	}

	const els = {
		avatar: document.getElementById('avatar'),
		avatarInput: document.getElementById('avatarInput'),
		displayName: document.getElementById('displayName'),
		displaySubtitle: document.getElementById('displaySubtitle'),
		nickname: document.getElementById('nickname'),
		email: document.getElementById('email'),
		password: document.getElementById('password'),
		togglePassword: document.getElementById('togglePassword'),
		saveProfileBtn: document.getElementById('saveProfileBtn'),
		logoutBtn: document.getElementById('logoutBtn'),
		openCreateCharacter: document.getElementById('openCreateCharacter'),
		createCharacterModal: document.getElementById('createCharacterModal'),
		newCharName: document.getElementById('newCharName'),
		newCharClass: document.getElementById('newCharClass'),
		newCharLevel: document.getElementById('newCharLevel'),
		newCharColor: document.getElementById('newCharColor'),
		newCharImage: document.getElementById('newCharImage'),
		charImagePreview: document.getElementById('charImagePreview'),
		cancelCreateChar: document.getElementById('cancelCreateChar'),
		submitCreateChar: document.getElementById('submitCreateChar'),
		charactersList: document.getElementById('charactersList')
	};

	let currentUser = null;

	function findOrCreateDemoUser() {
		if (!window.USER_DATABASE) return null;
		let user = USER_DATABASE.users && USER_DATABASE.users[0];
		if (!user) {
			const email = 'demo@example.com';
			const username = 'demo_user';
			const pass = 'demo123';
			const r = safe('registerUser', email, username, pass, pass);
			if (r && r.user) {
				user = USER_DATABASE.users.find(u => u.email === email) || r.user;
			}
		}

		if (user) {
			const logged = safe('loginUser', user.email, user.password || 'demo123');
			if (logged && logged.user) {
				currentUser = logged.user;
			} else {
				currentUser = user;
			}
		}
		return currentUser;
	}

	function getActiveCharacterId() {
		if (!currentUser) return null;
		return localStorage.getItem(LS_ACTIVE_KEY(currentUser.id));
	}

	function setActiveCharacterId(charId) {
		if (!currentUser) return;
		localStorage.setItem(LS_ACTIVE_KEY(currentUser.id), charId);
		if (typeof window.updateProfile === 'function') {
			try {
				updateProfile(currentUser.id, { activeCharacterId: charId });
			} catch (e) { /* ignore */ }
		}
		renderCharacters();
	}

	function renderProfile() {
		if (!currentUser) return;
		els.displayName.textContent = currentUser.profile && currentUser.profile.nickname ? currentUser.profile.nickname : currentUser.username;
		els.displaySubtitle.textContent = currentUser.type || 'Player';
		els.nickname.value = currentUser.profile && currentUser.profile.nickname ? currentUser.profile.nickname : currentUser.username;
		els.email.value = currentUser.email || '';
		// Keep password field empty for security - user will need to re-enter if they want to change it
		els.password.value = '';
		const avatarUrl = currentUser.profile && currentUser.profile.avatar;
		if (avatarUrl) els.avatar.style.backgroundImage = `url('${avatarUrl}')`;
	}

	function renderCharacters() {
		if (!currentUser) return;
		const chars = safe('getCharactersByUser', currentUser.id) || [];
		const activeId = getActiveCharacterId();
		els.charactersList.innerHTML = '';
		if (chars.length === 0) {
			els.charactersList.innerHTML = '<div class="text-sm text-gray-400">No characters yet. Create one.</div>';
			return;
		}

		chars.forEach(c => {
			const card = document.createElement('div');
			card.className = 'char-card';

			const meta = document.createElement('div');
			meta.className = 'char-meta';

			const color = document.createElement('div');
			color.className = 'char-color';
			color.style.background = c.color || '#ef4444';

			const info = document.createElement('div');
			
			// Add character image if available
			let imgHtml = '';
			if (c.image) {
				imgHtml = `<div class="char-image" style="background-image: url('${c.image}');"></div>`;
			}
			
			info.innerHTML = `${imgHtml}<div><div class="font-semibold text-gray-100">${escapeHtml(c.name)}</div><div class="text-sm text-gray-400">Level: ${c.level} • ${escapeHtml(c.className)}</div></div>`;

			meta.appendChild(color);
			meta.appendChild(info);

			const actions = document.createElement('div');
			actions.style.display = 'flex';
			actions.style.gap = '0.5rem';
			actions.style.alignItems = 'center';

			if (c.id === activeId) {
				const badge = document.createElement('div');
				badge.className = 'active-badge';
				badge.textContent = 'Active';
				actions.appendChild(badge);
			} else {
				const setBtn = document.createElement('button');
				setBtn.className = 'muted-btn';
				setBtn.textContent = 'Set Active';
				setBtn.addEventListener('click', () => setActiveCharacterId(c.id));
				actions.appendChild(setBtn);
			}

			const delBtn = document.createElement('button');
			delBtn.className = 'danger-btn';
			delBtn.textContent = 'Delete';
			delBtn.addEventListener('click', () => {
				if (!confirm('Delete this character?')) return;
				safe('deleteCharacter', c.id, currentUser.id);
				if (getActiveCharacterId() === c.id) {
					localStorage.removeItem(LS_ACTIVE_KEY(currentUser.id));
				}
				renderCharacters();
			});
			actions.appendChild(delBtn);

			card.appendChild(meta);
			card.appendChild(actions);
			els.charactersList.appendChild(card);
		});
	}

	function escapeHtml(str) {
		if (!str) return '';
		return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
	}

	function bind() {
		// Avatar photo upload
		els.avatar.addEventListener('click', () => {
			els.avatarInput.click();
		});

		els.avatarInput.addEventListener('change', (e) => {
			const file = e.target.files[0];
			if (!file) return;

			const reader = new FileReader();
			reader.onload = (event) => {
				const imageData = event.target.result;
				els.avatar.style.backgroundImage = `url('${imageData}')`;
				
				// Save to profile with ProfileImageManager
				if (currentUser) {
					// Profil resmini yönetici ile kaydet
					const imageInfo = window.ProfileImageManager.saveProfileImage(currentUser.id, imageData);
					
					if (imageInfo) {
						const updates = {
							avatar: imageData,
							avatarPath: imageInfo.filePath,
							avatarFileName: imageInfo.fileName
						};
						
						const res = safe('updateProfile', currentUser.id, updates);
						if (res && res.success) {
							currentUser = res.user;
							alert('✓ Profil fotoğrafı başarıyla kaydedildi!');
						}
					}
				}
			};
			reader.readAsDataURL(file);
		});

		// Character image preview
		els.newCharImage.addEventListener('change', (e) => {
			const file = e.target.files[0];
			if (!file) return;

			const reader = new FileReader();
			reader.onload = (event) => {
				const imageData = event.target.result;
				els.charImagePreview.style.backgroundImage = `url('${imageData}')`;
				els.charImagePreview.classList.remove('hidden');
				// Store the image data in a data attribute
				els.newCharImage.dataset.imageData = imageData;
			};
			reader.readAsDataURL(file);
		});

		els.togglePassword.addEventListener('click', () => {
			if (els.password.type === 'password') {
				els.password.type = 'text';
				els.togglePassword.querySelector('span').textContent = 'visibility';
			} else {
				els.password.type = 'password';
				els.togglePassword.querySelector('span').textContent = 'visibility_off';
			}
		});

		els.saveProfileBtn.addEventListener('click', () => {
			if (!currentUser) return alert('No user');
			const updates = { nickname: els.nickname.value };
			const res = safe('updateProfile', currentUser.id, updates);
			if (res && res.success) {
				currentUser = res.user;
				renderProfile();
				alert('Profile saved');
			} else {
				alert('Profile saved locally');
			}
		});

		els.openCreateCharacter.addEventListener('click', () => showCreateModal(true));
		els.cancelCreateChar.addEventListener('click', () => showCreateModal(false));
		els.submitCreateChar.addEventListener('click', createCharacterFromForm);

		els.logoutBtn.addEventListener('click', () => {
			const active = getActiveCharacterId();
			if (!active) {
				alert('Please select an active character before logging out.');
				els.charactersList.scrollIntoView({ behavior: 'smooth' });
				return;
			}
			try { safe('saveUserDatabase'); } catch (e) { /* ok */ }
			safe('logoutUser', currentUser.id);
			// Clear the stored user from localStorage
			localStorage.removeItem('dnd-current-user');
			alert('Logged out successfully. You must log in again.');
			// Redirect to map.html
			window.location.href = 'map.html';
		});

		window.addEventListener('beforeunload', () => {
			if (!currentUser) return;
			try { safe('updateProfile', currentUser.id, { nickname: els.nickname.value }); } catch (e) {}
			try { safe('saveUserDatabase'); } catch (e) {}
		});
	}

	function showCreateModal(show) {
		if (!els.createCharacterModal) return;
		if (show) {
			els.createCharacterModal.style.display = 'flex';
			els.createCharacterModal.setAttribute('aria-open', 'true');
		} else {
			els.createCharacterModal.style.display = 'none';
			els.createCharacterModal.removeAttribute('aria-open');
		}
	}

	function createCharacterFromForm() {
		if (!currentUser) return alert('No user to attach character to');
		const name = els.newCharName.value.trim();
		const className = els.newCharClass.value.trim();
		const level = parseInt(els.newCharLevel.value, 10) || 1;
		const color = els.newCharColor.value || '#ef4444';
		const imageData = els.newCharImage.dataset.imageData || null;

		if (!name || !className) return alert('Please enter name and class');

		const charData = {
			name,
			className,
			level,
			color,
			image: imageData
		};

		const result = safe('createCharacter', currentUser.id, charData);
		if (result && result.success) {
			showCreateModal(false);
			els.newCharName.value = '';
			els.newCharClass.value = '';
			els.newCharLevel.value = '1';
			els.newCharColor.value = '#ef4444';
			els.newCharImage.value = '';
			els.newCharImage.dataset.imageData = '';
			els.charImagePreview.classList.add('hidden');
			els.charImagePreview.style.backgroundImage = '';

			setTimeout(() => {
				setActiveCharacterId(result.character.id);
			}, 50);
			renderCharacters();
		} else {
			alert('Failed to create character.');
		}
	}

	function init() {
		// First try to load currentUser from localStorage (set by map.html on login)
		const storedUser = localStorage.getItem('dnd-current-user');
		if (storedUser) {
			try {
				currentUser = JSON.parse(storedUser);
			} catch (e) {
				console.warn('Failed to parse stored user:', e);
				currentUser = findOrCreateDemoUser();
			}
		} else {
			currentUser = findOrCreateDemoUser();
		}
		
		if (!currentUser) {
			currentUser = { id: 'guest-1', username: 'guest', profile: { nickname: 'Guest' } };
		}

		// Profil resmini localStorage'dan yükle
		if (currentUser && window.ProfileImageManager) {
			const savedImage = window.ProfileImageManager.loadProfileImage(currentUser.id);
			if (savedImage && savedImage.imageData) {
				// Eğer profil resmini veri tabanında tutmuyor ise, localStorage'dan yükle
				if (!currentUser.profile.avatar && savedImage.imageData) {
					currentUser.profile.avatar = savedImage.imageData;
				}
			}
		}

		renderProfile();
		renderCharacters();
		bind();
	}

	document.addEventListener('DOMContentLoaded', init);

})();
