// --- Generic Database API Client ---
const api = {
    async get(dbName) {
        try {
            const response = await fetch(`/api/database/${dbName}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${dbName} database`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error GETting ${dbName}:`, error);
            // Return a default empty state on error
            if (dbName === 'user') return { users: [], nextUserId: 1 };
            if (dbName === 'character') return { characters: [], nextCharacterId: 1 };
            return {};
        }
    },
    async post(dbName, data) {
        try {
            const response = await fetch(`/api/database/${dbName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error(`Failed to save ${dbName} database`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error POSTing ${dbName}:`, error);
            return { success: false, error: error.message };
        }
    }
};

// --- Marker Database Functions ---
let MARKER_DB = { markers: [], nextMarkerId: 1 };

// LocalStorage fallback key
const MAP_LS_KEY = 'dnd-map-db';

// Try to initialize from localStorage (fast, synchronous). If not present, the MARKER_DB default remains.
(function tryLoadLocal(){
    try {
        const raw = localStorage.getItem(MAP_LS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.markers)) {
                MARKER_DB = parsed;
            }
        }
    } catch (e) {
        console.warn('Failed to load marker DB from localStorage', e);
    }
})();

async function loadMarkerDatabase() {
    // Try remote API first, fall back to localStorage which may have the latest state.
    try {
        initializeDatabase('map_data', { markers: [], nextMarkerId: 1 });
        const remote = await api.get('map_data');
        if (remote && remote.markers && Array.isArray(remote.markers)) {
            MARKER_DB = remote;
            // also mirror into localStorage for offline resilience
            try { localStorage.setItem(MAP_LS_KEY, JSON.stringify(MARKER_DB)); } catch(e){}
            return MARKER_DB;
        }
    } catch (e) {
        console.warn('Remote marker DB load failed, using local copy', e);
    }
    return MARKER_DB;
}

// Save to remote API and always mirror to localStorage as a robust fallback
async function saveMarkerDatabase() {
    try {
        const res = await api.post('map_data', MARKER_DB);
        try { localStorage.setItem(MAP_LS_KEY, JSON.stringify(MARKER_DB)); } catch(e){}
        return res;
    } catch (e) {
        try { localStorage.setItem(MAP_LS_KEY, JSON.stringify(MARKER_DB)); } catch(err){}
        return { success: false, error: e && e.message ? e.message : 'Save failed' };
    }
}

function getAllMarkers() {
    return MARKER_DB.markers || [];
}

function addMarker(markerData, userId) {
    if (!userId) {
        return { success: false, message: 'User must be logged in to add markers.' };
    }
    const newMarker = {
        ...markerData,
        id: `marker_${MARKER_DB.nextMarkerId++}`,
        ownerId: userId,
        createdAt: new Date().toISOString()
    };
    MARKER_DB.markers.push(newMarker);
    saveMarkerDatabase();
    return { success: true, marker: newMarker };
}

function updateMarker(markerId, updates, userId) {
    const marker = MARKER_DB.markers.find(m => m.id === markerId);
    if (!marker) {
        return { success: false, message: 'Marker not found.' };
    }
    // Simple ownership check
    if (marker.ownerId !== userId) {
        return { success: false, message: 'You are not authorized to edit this marker.' };
    }
    Object.assign(marker, updates);
    saveMarkerDatabase();
    return { success: true, marker: marker };
}

function deleteMarker(markerId, userId) {
    const markerIndex = MARKER_DB.markers.findIndex(m => m.id === markerId);
    if (markerIndex === -1) {
        return { success: false, message: 'Marker not found.' };
    }
    const marker = MARKER_DB.markers[markerIndex];
    if (marker.ownerId !== userId) {
        return { success: false, message: 'You are not authorized to delete this marker.' };
    }
    MARKER_DB.markers.splice(markerIndex, 1);
    saveMarkerDatabase();
    return { success: true };
}

// Legacy export/import for compatibility with existing buttons.
function exportDatabase() {
    return MARKER_DB;
}

function importDatabase(data) {
    if (data && data.markers && Array.isArray(data.markers)) {
        MARKER_DB = {
            markers: data.markers,
            nextMarkerId: Math.max(0, ...data.markers.map(m => parseInt(m.id.split('_')[1] || 0))) + 1
        };
        saveMarkerDatabase();
        return { success: true };
    }
    return { success: false, message: 'Invalid data format.' };
}
