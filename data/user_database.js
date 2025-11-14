/**
 * USER DATABASE - Frontend JSON Database
 * Manages users, profiles, characters, and authentication
 * Persists to localStorage with key: 'dnd-map-user-database'
 * 
 * IMPORTANT: For production:
 * - Use a proper backend (Node.js, Python, etc.)
 * - Hash passwords with bcrypt or similar
 * - Implement JWT or session-based authentication
 * - Add rate limiting and security measures
 */

const USER_DATABASE = {
  users: [],
  characters: [],
  auditLog: [],
  version: 1
};

// In-memory session tracking
const ACTIVE_SESSIONS = {};

// ============ HELPERS ============
function _now() {
  return new Date().toISOString();
}

function _genId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
}

function _validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function _validatePassword(password) {
  return password && password.length >= 6;
}

function _validateUsername(username) {
  return username && username.length >= 3 && /^[a-zA-Z0-9_-]+$/.test(username);
}

// ============ PERSISTENCE ============
function saveUserDatabase() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dnd-map-user-database', JSON.stringify(USER_DATABASE));
    }
  } catch (e) {
    console.warn('saveUserDatabase failed:', e);
  }
}

function loadUserDatabase() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('dnd-map-user-database');
      if (raw) {
        const d = JSON.parse(raw);
        if (d.users) USER_DATABASE.users = d.users;
        if (d.characters) USER_DATABASE.characters = d.characters;
        if (d.auditLog) USER_DATABASE.auditLog = d.auditLog;
        if (d.version) USER_DATABASE.version = d.version;
      }
    }
  } catch (e) {
    console.warn('loadUserDatabase failed:', e);
  }
}

function exportUserDatabase() {
  return {
    users: USER_DATABASE.users,
    characters: USER_DATABASE.characters,
    auditLog: USER_DATABASE.auditLog,
    version: USER_DATABASE.version,
    exportedAt: _now()
  };
}

function importUserDatabase(data) {
  if (data.users) USER_DATABASE.users = data.users;
  if (data.characters) USER_DATABASE.characters = data.characters;
  if (data.auditLog) USER_DATABASE.auditLog = data.auditLog;
  if (data.version) USER_DATABASE.version = data.version;
  saveUserDatabase();
  return { success: true, message: 'User database imported successfully' };
}

// ============ USER MANAGEMENT ============
function registerUser(email, username, password, passwordConfirm) {
  // Validation
  if (!email || !username || !password || !passwordConfirm) {
    return { success: false, message: 'All fields are required' };
  }

  if (!_validateEmail(email)) {
    return { success: false, message: 'Invalid email format' };
  }

  if (!_validateUsername(username)) {
    return { success: false, message: 'Username must be 3+ characters (alphanumeric, underscore, hyphen)' };
  }

  if (!_validatePassword(password)) {
    return { success: false, message: 'Password must be at least 6 characters' };
  }

  if (password !== passwordConfirm) {
    return { success: false, message: 'Passwords do not match' };
  }

  // Check uniqueness
  if (USER_DATABASE.users.find(u => u.email === email)) {
    return { success: false, message: 'Email already registered' };
  }

  if (USER_DATABASE.users.find(u => u.username === username)) {
    return { success: false, message: 'Username already taken' };
  }

  // Create user
  const user = {
    id: _genId('user'),
    email,
    username,
    password, // TODO: Hash with bcrypt in production!
    type: 'USER', // USER or ADMIN
    profile: {
      nickname: username,
      bio: '',
      avatar: ''
    },
    createdAt: _now(),
    updatedAt: _now()
  };

  USER_DATABASE.users.push(user);

  logUserAuditChange({
    type: 'USER_REGISTERED',
    userId: user.id,
    email: user.email,
    username: user.username,
    timestamp: _now()
  });

  saveUserDatabase();

  // Return user without password
  return {
    success: true,
    message: 'User registered successfully',
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      type: user.type,
      profile: user.profile
    }
  };
}

function loginUser(email, password) {
  // Validation
  if (!email || !password) {
    return { success: false, message: 'Email and password required' };
  }

  // Find user
  const user = USER_DATABASE.users.find(u => u.email === email);
  if (!user) {
    return { success: false, message: 'Invalid email or password' };
  }

  // Check password (in production, use bcrypt comparison)
  if (user.password !== password) {
    return { success: false, message: 'Invalid email or password' };
  }

  // Create session
  const sessionId = _genId('session');
  ACTIVE_SESSIONS[sessionId] = {
    userId: user.id,
    email: user.email,
    username: user.username,
    createdAt: _now()
  };

  logUserAuditChange({
    type: 'USER_LOGIN',
    userId: user.id,
    email: user.email,
    username: user.username,
    timestamp: _now()
  });

  // Return user without password
  return {
    success: true,
    message: 'Logged in successfully',
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      type: user.type,
      profile: user.profile
    },
    sessionId: sessionId
  };
}

function logoutUser(userId) {
  // Clear sessions for this user
  Object.keys(ACTIVE_SESSIONS).forEach(key => {
    if (ACTIVE_SESSIONS[key].userId === userId) {
      delete ACTIVE_SESSIONS[key];
    }
  });

  logUserAuditChange({
    type: 'USER_LOGOUT',
    userId: userId,
    timestamp: _now()
  });

  return { success: true, message: 'Logged out successfully' };
}

function updateProfile(userId, profileUpdates) {
  const user = USER_DATABASE.users.find(u => u.id === userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  // Update only allowed fields
  if (profileUpdates.nickname !== undefined) user.profile.nickname = profileUpdates.nickname;
  if (profileUpdates.bio !== undefined) user.profile.bio = profileUpdates.bio;
  if (profileUpdates.avatar !== undefined) user.profile.avatar = profileUpdates.avatar;

  user.updatedAt = _now();

  logUserAuditChange({
    type: 'PROFILE_UPDATED',
    userId: user.id,
    email: user.email,
    username: user.username,
    timestamp: _now()
  });

  saveUserDatabase();

  return {
    success: true,
    message: 'Profile updated successfully',
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      type: user.type,
      profile: user.profile
    }
  };
}

function getUserById(userId) {
  const user = USER_DATABASE.users.find(u => u.id === userId);
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    type: user.type,
    profile: user.profile,
    createdAt: user.createdAt
  };
}

function getAllUsers() {
  return USER_DATABASE.users.map(u => ({
    id: u.id,
    email: u.email,
    username: u.username,
    type: u.type,
    profile: u.profile,
    createdAt: u.createdAt
  }));
}

function validateSession(sessionId) {
  return ACTIVE_SESSIONS[sessionId] || null;
}

// ============ CHARACTER MANAGEMENT ============
function createCharacter(userId, characterData) {
  const user = USER_DATABASE.users.find(u => u.id === userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  if (!characterData.name || !characterData.className) {
    return { success: false, message: 'Character name and class are required' };
  }

  const character = {
    id: _genId('char'),
    ownerId: userId,
    ownerEmail: user.email,
    ownerUsername: user.username,
    name: characterData.name.trim(),
    className: characterData.className.trim(),
    level: characterData.level || 1,
    x: typeof characterData.x === 'number' ? characterData.x : 0,
    y: typeof characterData.y === 'number' ? characterData.y : 0,
    status: 'active', // active, inactive, deleted
    color: characterData.color || '#ef4444',
    createdAt: _now(),
    updatedAt: _now()
  };

  USER_DATABASE.characters.push(character);

  logUserAuditChange({
    type: 'CHARACTER_CREATED',
    userId: user.id,
    characterId: character.id,
    characterName: character.name,
    className: character.className,
    timestamp: _now()
  });

  saveUserDatabase();

  return {
    success: true,
    message: 'Character created successfully',
    character
  };
}

function getCharactersByUser(userId) {
  return USER_DATABASE.characters.filter(c => c.ownerId === userId && c.status !== 'deleted');
}

function getCharacterById(characterId) {
  return USER_DATABASE.characters.find(c => c.id === characterId && c.status !== 'deleted') || null;
}

function updateCharacter(characterId, updates, userId) {
  const character = getCharacterById(characterId);
  if (!character) {
    return { success: false, message: 'Character not found' };
  }

  // Only owner or admin can update
  const user = USER_DATABASE.users.find(u => u.id === userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  if (character.ownerId !== userId && user.type !== 'ADMIN') {
    return { success: false, message: 'Not authorized to update this character' };
  }

  // Update allowed fields
  if (updates.name !== undefined) character.name = updates.name.trim();
  if (updates.className !== undefined) character.className = updates.className.trim();
  if (updates.level !== undefined) character.level = Math.max(1, parseInt(updates.level) || 1);
  if (typeof updates.x === 'number') character.x = updates.x;
  if (typeof updates.y === 'number') character.y = updates.y;
  if (updates.color !== undefined) character.color = updates.color;

  character.updatedAt = _now();

  logUserAuditChange({
    type: 'CHARACTER_UPDATED',
    userId: userId,
    characterId: character.id,
    changes: updates,
    timestamp: _now()
  });

  saveUserDatabase();

  return {
    success: true,
    message: 'Character updated successfully',
    character
  };
}

function moveCharacter(characterId, x, y, userId) {
  const character = getCharacterById(characterId);
  if (!character) {
    return { success: false, message: 'Character not found' };
  }

  const user = USER_DATABASE.users.find(u => u.id === userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  if (character.ownerId !== userId && user.type !== 'ADMIN') {
    return { success: false, message: 'Not authorized to move this character' };
  }

  const oldX = character.x;
  const oldY = character.y;
  character.x = x;
  character.y = y;
  character.updatedAt = _now();

  logUserAuditChange({
    type: 'CHARACTER_MOVED',
    userId: userId,
    characterId: character.id,
    from: { x: oldX, y: oldY },
    to: { x, y },
    timestamp: _now()
  });

  saveUserDatabase();

  return {
    success: true,
    message: 'Character moved successfully',
    character
  };
}

function deleteCharacter(characterId, userId) {
  const character = getCharacterById(characterId);
  if (!character) {
    return { success: false, message: 'Character not found' };
  }

  const user = USER_DATABASE.users.find(u => u.id === userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  if (character.ownerId !== userId && user.type !== 'ADMIN') {
    return { success: false, message: 'Not authorized to delete this character' };
  }

  character.status = 'deleted';
  character.updatedAt = _now();

  logUserAuditChange({
    type: 'CHARACTER_DELETED',
    userId: userId,
    characterId: character.id,
    characterName: character.name,
    timestamp: _now()
  });

  saveUserDatabase();

  return {
    success: true,
    message: 'Character deleted successfully'
  };
}

// ============ ADMIN FUNCTIONS ============
function promoteUserToAdmin(userId, promotedBy) {
  const promoter = USER_DATABASE.users.find(u => u.id === promotedBy);
  if (!promoter || promoter.type !== 'ADMIN') {
    return { success: false, message: 'Only admins can promote users' };
  }

  const user = USER_DATABASE.users.find(u => u.id === userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  user.type = 'ADMIN';
  user.updatedAt = _now();

  logUserAuditChange({
    type: 'USER_PROMOTED_TO_ADMIN',
    userId: user.id,
    email: user.email,
    username: user.username,
    promotedBy: promotedBy,
    promoterEmail: promoter.email,
    timestamp: _now()
  });

  saveUserDatabase();

  return {
    success: true,
    message: 'User promoted to admin successfully',
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      type: user.type
    }
  };
}

function demoteAdminToUser(userId, demotedBy) {
  const demoter = USER_DATABASE.users.find(u => u.id === demotedBy);
  if (!demoter || demoter.type !== 'ADMIN') {
    return { success: false, message: 'Only admins can demote users' };
  }

  const user = USER_DATABASE.users.find(u => u.id === userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  user.type = 'USER';
  user.updatedAt = _now();

  logUserAuditChange({
    type: 'ADMIN_DEMOTED_TO_USER',
    userId: user.id,
    email: user.email,
    username: user.username,
    demotedBy: demotedBy,
    demoterEmail: demoter.email,
    timestamp: _now()
  });

  saveUserDatabase();

  return {
    success: true,
    message: 'Admin demoted to user successfully',
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      type: user.type
    }
  };
}

// ============ AUDIT LOG ============
function logUserAuditChange(entry) {
  const log = {
    id: _genId('audit'),
    ...entry,
    timestamp: entry.timestamp || _now()
  };
  USER_DATABASE.auditLog.push(log);
  saveUserDatabase();
}

function getUserAuditLog(filters = {}) {
  let logs = USER_DATABASE.auditLog.slice();

  if (filters.userId) {
    logs = logs.filter(l => l.userId === filters.userId);
  }

  if (filters.type) {
    logs = logs.filter(l => l.type === filters.type);
  }

  if (filters.startDate && filters.endDate) {
    logs = logs.filter(l => {
      const logDate = new Date(l.timestamp);
      return logDate >= filters.startDate && logDate <= filters.endDate;
    });
  }

  return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// ============ INITIALIZATION ============
// Load persisted data on script load
loadUserDatabase();

// Expose to window for use in map.js (browser)
window.USER_DATABASE = USER_DATABASE;
window.ACTIVE_SESSIONS = ACTIVE_SESSIONS;
window.registerUser = registerUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;
window.updateProfile = updateProfile;
window.getUserById = getUserById;
window.getAllUsers = getAllUsers;
window.validateSession = validateSession;
window.createCharacter = createCharacter;
window.getCharactersByUser = getCharactersByUser;
window.getCharacterById = getCharacterById;
window.updateCharacter = updateCharacter;
window.moveCharacter = moveCharacter;
window.deleteCharacter = deleteCharacter;
window.logUserAuditChange = logUserAuditChange;
window.getUserAuditLog = getUserAuditLog;
window.promoteUserToAdmin = promoteUserToAdmin;
window.demoteAdminToUser = demoteAdminToUser;
window.saveUserDatabase = saveUserDatabase;
window.loadUserDatabase = loadUserDatabase;
window.exportUserDatabase = exportUserDatabase;
window.importUserDatabase = importUserDatabase;

// Export functions for use in map.js (Node.js / Module systems)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    USER_DATABASE,
    ACTIVE_SESSIONS,
    registerUser,
    loginUser,
    logoutUser,
    updateProfile,
    getUserById,
    getAllUsers,
    validateSession,
    createCharacter,
    getCharactersByUser,
    getCharacterById,
    updateCharacter,
    moveCharacter,
    deleteCharacter,
    logUserAuditChange,
    getUserAuditLog,
    promoteUserToAdmin,
    demoteAdminToUser,
    saveUserDatabase,
    loadUserDatabase,
    exportUserDatabase,
    importUserDatabase
  };
}
