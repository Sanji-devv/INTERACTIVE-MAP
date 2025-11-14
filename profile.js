
/* Profile page script
	 - Provides character creation/listing
	 - Sets an "active" character per-user (stored in localStorage)
	 - Prevents logout unless an active character is selected
	 - Saves profile data on demand and on unload
*/

(function () {
	const LS_ACTIVE_KEY = (userId) => `dnd_activeCharacter_${userId}`;

	// Helpers to safely call database functions exposed on window
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

	// DOM elements
	const els = {
		avatar: document.getElementById('avatar'),
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
		cancelCreateChar: document.getElementById('cancelCreateChar'),
		submitCreateChar: document.getElementById('submitCreateChar'),
		charactersList: document.getElementById('charactersList')
	};

	let currentUser = null;

	function findOrCreateDemoUser() {
		// If USER_DATABASE exists, attempt to use first user or create a demo user
		if (!window.USER_DATABASE) return null;
		let user = USER_DATABASE.users && USER_DATABASE.users[0];
		if (!user) {
			// Register a demo user
			const email = 'demo@example.com';
			const username = 'demo_user';
			const pass = 'demo123';
			const r = safe('registerUser', email, username, pass, pass);
			if (r && r.user) {
				user = USER_DATABASE.users.find(u => u.email === email) || r.user;
			}
		}

		if (user) {
			// Try to log in (login only if loginUser available)
			const logged = safe('loginUser', user.email, user.password || 'demo123');
			if (logged && logged.user) {
				currentUser = logged.user;
			} else {
				// fallback: use stored user object without session
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
		// best-effort save to persistent db if updateProfile supports extra field
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
		// avatar if provided
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
			info.innerHTML = `<div class="font-semibold">${escapeHtml(c.name)}</div><div class="text-sm text-gray-400">Level: ${c.level} • ${escapeHtml(c.className)}</div>`;

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

			// edit (not fully implemented) and delete
			const delBtn = document.createElement('button');
			delBtn.className = 'danger-btn';
			delBtn.textContent = 'Delete';
			delBtn.addEventListener('click', () => {
				if (!confirm('Delete this character?')) return;
				safe('deleteCharacter', c.id, currentUser.id);
				// if deleted one was active, clear active
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

	// UI wiring
	function bind() {
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
			// Force active character selection
			const active = getActiveCharacterId();
			if (!active) {
				alert('Please select an active character before logging out.');
				// scroll to characters list and highlight
				els.charactersList.scrollIntoView({ behavior: 'smooth' });
				return;
			}
			// Save profile and logout
			try { safe('saveUserDatabase'); } catch (e) { /* ok */ }
			safe('logoutUser', currentUser.id);
			alert('Logged out (session cleared).');
		});

		// Save profile on unload as well
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
		if (!name || !className) return alert('Please enter name and class');
		const result = safe('createCharacter', currentUser.id, { name, className, level, color });
		if (result && result.success) {
			showCreateModal(false);
			// clear form
			els.newCharName.value = '';
			els.newCharClass.value = '';
			els.newCharLevel.value = '1';
			// auto-select new character as active
			setTimeout(() => {
				setActiveCharacterId(result.character.id);
			}, 50);
			renderCharacters();
		} else {
			alert('Failed to create character.');
		}
	}

	// Init
	function init() {
		currentUser = findOrCreateDemoUser();
		if (!currentUser) {
			// no DB available; create a temporary client-only user
			currentUser = { id: 'guest-1', username: 'guest', profile: { nickname: 'Guest' } };
		}
		renderProfile();
		renderCharacters();
		bind();
	}

	// Kick off
	document.addEventListener('DOMContentLoaded', init);

})();
