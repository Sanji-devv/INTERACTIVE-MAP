// User Database - Global Functions
window.USER_DATABASE = {
    users: [],
    nextUserId: 1
};

function registerUser(email, username, password, passwordConfirm) {
    if (password !== passwordConfirm) {
        return { success: false, error: 'Passwords do not match' };
    }

    const existingUser = window.USER_DATABASE.users.find(u => u.email === email || u.username === username);
    if (existingUser) {
        return { success: false, error: 'User already exists' };
    }

    const newUser = {
        id: `user_${window.USER_DATABASE.nextUserId++}`,
        email: email,
        username: username,
        password: password,
        type: 'USER',
        profile: {
            nickname: username,
            avatar: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=256&q=60'
        },
        activeCharacterId: null,
        createdAt: new Date().toISOString()
    };

    window.USER_DATABASE.users.push(newUser);
    saveUserDatabase();

    return { success: true, user: newUser };
}

function loginUser(email, password) {
    const user = window.USER_DATABASE.users.find(u => u.email === email && u.password === password);
    if (!user) {
        return { success: false, error: 'Invalid email or password' };
    }

    localStorage.setItem('dnd-current-user', JSON.stringify(user));
    return { success: true, user: user };
}

function logoutUser(userId) {
    localStorage.removeItem('dnd-current-user');
    return { success: true };
}

function updateProfile(userId, updates) {
    const user = window.USER_DATABASE.users.find(u => u.id === userId);
    if (!user) {
        return { success: false, error: 'User not found' };
    }

    if (!user.profile) {
        user.profile = {};
    }

    if (updates.nickname) {
        user.profile.nickname = updates.nickname;
    }

    if (updates.avatar) {
        user.profile.avatar = updates.avatar;
    }

    if (updates.avatarPath) {
        user.profile.avatarPath = updates.avatarPath;
    }

    if (updates.avatarFileName) {
        user.profile.avatarFileName = updates.avatarFileName;
    }

    if (updates.email) {
        user.email = updates.email;
    }

    if (updates.password) {
        user.password = updates.password;
    }

    if (updates.activeCharacterId !== undefined) {
        user.activeCharacterId = updates.activeCharacterId;
    }

    saveUserDatabase();
    return { success: true, user: user };
}

function getUser(userId) {
    return window.USER_DATABASE.users.find(u => u.id === userId);
}

function saveUserDatabase() {
    try {
        localStorage.setItem('dnd-user-database', JSON.stringify(window.USER_DATABASE));
        return true;
    } catch (e) {
        console.error('Failed to save user database:', e);
        return false;
    }
}

function loadUserDatabase() {
    try {
        const stored = localStorage.getItem('dnd-user-database');
        if (stored) {
            const data = JSON.parse(stored);
            window.USER_DATABASE = data;
            return true;
        }
    } catch (e) {
        console.error('Failed to load user database:', e);
    }
    return false;
}

// Load database on script load
loadUserDatabase();
