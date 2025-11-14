const CHARACTER_DB = {
  characters: [],
  version: 1
};

const CHAR_LS_KEY = 'dnd-character-database';

function _char_now() { return new Date().toISOString(); }
function _char_genId(prefix = 'char') { return `${prefix}-${Date.now()}-${Math.floor(Math.random()*9000)+1000}`; }

function saveCharacterDatabase() {
  try {
    localStorage.setItem(CHAR_LS_KEY, JSON.stringify(CHARACTER_DB));
    return true;
  } catch (e) {
    console.warn('Failed to save character DB', e);
    return false;
  }
}

function loadCharacterDatabase() {
  try {
    const raw = localStorage.getItem(CHAR_LS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.characters) CHARACTER_DB.characters = data.characters;
    if (data.version) CHARACTER_DB.version = data.version;
  } catch (e) {
    console.warn('Failed to load character DB', e);
  }
}

function exportCharacterDatabase() {
  return {
    characters: CHARACTER_DB.characters,
    version: CHARACTER_DB.version,
    exportedAt: _char_now()
  };
}

function importCharacterDatabase(data) {
  if (data.characters) CHARACTER_DB.characters = data.characters;
  if (data.version) CHARACTER_DB.version = data.version;
  saveCharacterDatabase();
  return { success: true };
}

function createCharacter(userId, characterData) {
  if (!userId) return { success: false, message: 'No userId' };
  if (!characterData || !characterData.name || !characterData.className) return { success: false, message: 'Missing fields' };

  const character = {
    id: _char_genId('char'),
    ownerId: userId,
    name: characterData.name.trim(),
    className: characterData.className.trim(),
    level: characterData.level || 1,
    x: typeof characterData.x === 'number' ? characterData.x : 0,
    y: typeof characterData.y === 'number' ? characterData.y : 0,
    status: 'active',
    color: characterData.color || '#ef4444',
    createdAt: _char_now(),
    updatedAt: _char_now()
  };

  CHARACTER_DB.characters.push(character);
  saveCharacterDatabase();

  return { success: true, message: 'Character created', character };
}

function getCharactersByUser(userId) {
  return CHARACTER_DB.characters.filter(c => c.ownerId === userId && c.status !== 'deleted');
}

function getCharacterById(characterId) {
  return CHARACTER_DB.characters.find(c => c.id === characterId && c.status !== 'deleted') || null;
}

function updateCharacter(characterId, updates, userId) {
  const ch = CHARACTER_DB.characters.find(c => c.id === characterId);
  if (!ch) return { success: false, message: 'Character not found' };
  if (ch.ownerId !== userId) return { success: false, message: 'Not owner' };
  if (updates.name !== undefined) ch.name = updates.name;
  if (updates.className !== undefined) ch.className = updates.className;
  if (updates.level !== undefined) ch.level = updates.level;
  if (typeof updates.x === 'number') ch.x = updates.x;
  if (typeof updates.y === 'number') ch.y = updates.y;
  if (updates.color !== undefined) ch.color = updates.color;
  ch.updatedAt = _char_now();
  saveCharacterDatabase();
  return { success: true, character: ch };
}

function moveCharacter(characterId, x, y, userId) {
  const ch = CHARACTER_DB.characters.find(c => c.id === characterId);
  if (!ch) return { success: false, message: 'Character not found' };
  if (ch.ownerId !== userId) return { success: false, message: 'Not owner' };
  ch.x = x; ch.y = y; ch.updatedAt = _char_now();
  saveCharacterDatabase();
  return { success: true, character: ch };
}

function deleteCharacter(characterId, userId) {
  const ch = CHARACTER_DB.characters.find(c => c.id === characterId);
  if (!ch) return { success: false, message: 'Character not found' };
  if (ch.ownerId !== userId) return { success: false, message: 'Not owner' };
  ch.status = 'deleted'; ch.updatedAt = _char_now();
  saveCharacterDatabase();
  return { success: true };
}

loadCharacterDatabase();

window.CHARACTER_DB = CHARACTER_DB;
window.createCharacter = createCharacter;
window.getCharactersByUser = getCharactersByUser;
window.getCharacterById = getCharacterById;
window.updateCharacter = updateCharacter;
window.moveCharacter = moveCharacter;
window.deleteCharacter = deleteCharacter;
window.saveCharacterDatabase = saveCharacterDatabase;
window.loadCharacterDatabase = loadCharacterDatabase;
window.exportCharacterDatabase = exportCharacterDatabase;
window.importCharacterDatabase = importCharacterDatabase;
