/**
 * MAP DATABASE - Frontend JSON Database
 * Manages markers and character positions on the map
 * Persists to localStorage with key: 'dnd-map-database'
 * 
 * User, profile, and character data are stored in user_database.js
 * This database focuses only on map-related data:
 * - Markers (locations, names, descriptions, types)
 * - Character positions (synced from user_database)
 */

const DATABASE = {
  markers: [],
  characterPositions: [], // Cache of character positions for map rendering
  version: 1
};

// ============ HELPERS ============
function _now() {
  return new Date().toISOString();
}

function _genId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
}

// ============ PERSISTENCE ============
function saveDatabase() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dnd-map-database', JSON.stringify(DATABASE));
    }
  } catch (e) {
    console.warn('saveDatabase failed:', e);
  }
}

function loadDatabase() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('dnd-map-database');
      if (raw) {
        const d = JSON.parse(raw);
        if (d.markers) DATABASE.markers = d.markers;
        if (d.characterPositions) DATABASE.characterPositions = d.characterPositions;
        if (d.version) DATABASE.version = d.version;
      }
    }
  } catch (e) {
    console.warn('loadDatabase failed:', e);
  }
}

function exportDatabase() {
  return {
    markers: DATABASE.markers,
    characterPositions: DATABASE.characterPositions,
    version: DATABASE.version,
    exportedAt: _now()
  };
}

function importDatabase(data) {
  if (data.markers) DATABASE.markers = data.markers;
  if (data.characterPositions) DATABASE.characterPositions = data.characterPositions;
  if (data.version) DATABASE.version = data.version;
  saveDatabase();
  return { success: true, message: 'Map database imported successfully' };
}

// ============ MARKER MANAGEMENT ============
function addMarker(markerData, userId, userEmail) {
  const marker = {
    id: _genId('marker'),
    name: markerData.name || 'Untitled',
    description: markerData.description || '',
    type: markerData.type || 'city',
    color: markerData.color || '#60a5fa',
    x: typeof markerData.x === 'number' ? markerData.x : 0,
    y: typeof markerData.y === 'number' ? markerData.y : 0,
    createdBy: userId,
    createdByEmail: userEmail,
    createdAt: _now(),
    updatedAt: _now()
  };

  DATABASE.markers.push(marker);
  saveDatabase();

  return {
    success: true,
    message: 'Marker created successfully',
    marker
  };
}

function updateMarker(markerId, updates, userId) {
  const marker = DATABASE.markers.find(m => m.id === markerId);
  if (!marker) {
    return { success: false, message: 'Marker not found' };
  }

  // Creator or admin can update (admin check delegated to map.js)
  if (marker.createdBy !== userId) {
    return { success: false, message: 'Not authorized to update this marker' };
  }

  if (updates.name !== undefined) marker.name = updates.name;
  if (updates.description !== undefined) marker.description = updates.description;
  if (updates.type !== undefined) marker.type = updates.type;
  if (updates.color !== undefined) marker.color = updates.color;
  if (typeof updates.x === 'number') marker.x = updates.x;
  if (typeof updates.y === 'number') marker.y = updates.y;

  marker.updatedAt = _now();
  saveDatabase();

  return {
    success: true,
    message: 'Marker updated successfully',
    marker
  };
}

function deleteMarker(markerId, userId) {
  const idx = DATABASE.markers.findIndex(m => m.id === markerId);
  if (idx === -1) {
    return { success: false, message: 'Marker not found' };
  }

  const marker = DATABASE.markers[idx];
  if (marker.createdBy !== userId) {
    return { success: false, message: 'Not authorized to delete this marker' };
  }

  DATABASE.markers.splice(idx, 1);
  saveDatabase();

  return {
    success: true,
    message: 'Marker deleted successfully'
  };
}

function getAllMarkers() {
  return DATABASE.markers;
}

function getMarkerById(markerId) {
  return DATABASE.markers.find(m => m.id === markerId) || null;
}

// ============ CHARACTER POSITION CACHE ============
// Syncs character positions from user_database for quick map rendering
function updateCharacterPosition(characterId, x, y, characterName, ownerUsername) {
  let pos = DATABASE.characterPositions.find(p => p.id === characterId);
  
  if (!pos) {
    pos = {
      id: characterId,
      characterName: characterName,
      ownerUsername: ownerUsername,
      x: x,
      y: y,
      updatedAt: _now()
    };
    DATABASE.characterPositions.push(pos);
  } else {
    pos.x = x;
    pos.y = y;
    pos.characterName = characterName;
    pos.ownerUsername = ownerUsername;
    pos.updatedAt = _now();
  }

  saveDatabase();
  return pos;
}

function removeCharacterPosition(characterId) {
  const idx = DATABASE.characterPositions.findIndex(p => p.id === characterId);
  if (idx !== -1) {
    DATABASE.characterPositions.splice(idx, 1);
    saveDatabase();
    return { success: true };
  }
  return { success: false, message: 'Character position not found' };
}

function getAllCharacterPositions() {
  return DATABASE.characterPositions;
}

function getCharacterPosition(characterId) {
  return DATABASE.characterPositions.find(p => p.id === characterId) || null;
}

// ============ INITIALIZATION ============
// Load persisted data on script load
loadDatabase();

// Expose to window for debugging
window.DATABASE = DATABASE;

// Export functions for use in map.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DATABASE,
    addMarker,
    updateMarker,
    deleteMarker,
    getAllMarkers,
    getMarkerById,
    updateCharacterPosition,
    removeCharacterPosition,
    getAllCharacterPositions,
    getCharacterPosition,
    saveDatabase,
    loadDatabase,
    exportDatabase,
    importDatabase
  };
}
