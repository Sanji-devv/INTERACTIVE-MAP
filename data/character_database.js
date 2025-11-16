// Character Database - Global Functions
window.CHARACTER_DATABASE = {
    characters: [],
    nextCharacterId: 1
};

function createCharacter(userId, charData) {
    if (!userId || !charData || !charData.name || !charData.className) {
        return { success: false, error: 'Invalid character data' };
    }
    
    const newChar = {
        id: `char_${window.CHARACTER_DATABASE.nextCharacterId++}`,
        userId: userId,
        name: charData.name,
        className: charData.className,
        level: charData.level || 1,
        color: charData.color || '#ef4444',
        image: charData.image || null,
        createdAt: new Date().toISOString()
    };
    
    window.CHARACTER_DATABASE.characters.push(newChar);
    saveCharacterDatabase();
    
    return { success: true, character: newChar };
}

function getCharactersByUser(userId) {
    return window.CHARACTER_DATABASE.characters.filter(c => c.userId === userId);
}

function getCharacter(characterId) {
    return window.CHARACTER_DATABASE.characters.find(c => c.id === characterId);
}

function updateCharacter(characterId, updates) {
    const char = window.CHARACTER_DATABASE.characters.find(c => c.id === characterId);
    if (!char) {
        return { success: false, error: 'Character not found' };
    }
    
    if (updates.name) char.name = updates.name;
    if (updates.className) char.className = updates.className;
    if (updates.level) char.level = updates.level;
    if (updates.color) char.color = updates.color;
    if (updates.image) char.image = updates.image;
    
    saveCharacterDatabase();
    return { success: true, character: char };
}

function deleteCharacter(characterId, userId) {
    const index = window.CHARACTER_DATABASE.characters.findIndex(c => c.id === characterId && c.userId === userId);
    if (index === -1) {
        return { success: false, error: 'Character not found' };
    }
    
    const deleted = window.CHARACTER_DATABASE.characters.splice(index, 1);
    saveCharacterDatabase();
    return { success: true, character: deleted[0] };
}

function saveCharacterDatabase() {
    try {
        localStorage.setItem('dnd-character-database', JSON.stringify(window.CHARACTER_DATABASE));
        return true;
    } catch (e) {
        console.error('Failed to save character database:', e);
        return false;
    }
}

function loadCharacterDatabase() {
    try {
        const stored = localStorage.getItem('dnd-character-database');
        if (stored) {
            const data = JSON.parse(stored);
            window.CHARACTER_DATABASE = data;
            return true;
        }
    } catch (e) {
        console.error('Failed to load character database:', e);
    }
    return false;
}

// Load database on script load
loadCharacterDatabase();
