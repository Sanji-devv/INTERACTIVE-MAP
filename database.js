// Simple JSON database structure
// This simulates a backend database with users and audit logs

const DATABASE = {
  users: [
    {
      id: 'user-1',
      email: 'admin@example.com',
      password: 'admin123', // In production, this should be hashed
      type: 'ADMIN',
      createdAt: new Date().toISOString()
    }
  ],
  markers: [],
  auditLog: [] // Tracks all admin changes
};

// User Management
function registerUser(email, password) {
  // Check if user exists
  if (DATABASE.users.find(u => u.email === email)) {
    return { success: false, message: 'Email already registered' };
  }
  
  const newUser = {
    id: 'user-' + Date.now(),
    email,
    password, // In production: use bcrypt or similar
    type: 'USER', // All new registrations are USER type
    createdAt: new Date().toISOString()
  };
  
  DATABASE.users.push(newUser);
  saveDatabase();
  return { success: true, message: 'Registration successful', userId: newUser.id };
}

function loginUser(email, password) {
  const user = DATABASE.users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return { success: false, message: 'Invalid email or password' };
  }
  
  return { success: true, user: { id: user.id, email: user.email, type: user.type } };
}

// Marker Management
function addMarker(markerData, userId) {
  const marker = {
    id: 'm-' + Date.now(),
    ...markerData,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  DATABASE.markers.push(marker);
  saveDatabase();
  return { success: true, marker: marker };
}

function updateMarker(markerId, updates, userId) {
  const marker = DATABASE.markers.find(m => m.id === markerId);
  
  if (!marker) {
    return { success: false, message: 'Marker not found' };
  }
  
  const oldData = JSON.parse(JSON.stringify(marker));
  Object.assign(marker, updates);
  marker.updatedAt = new Date().toISOString();
  
  // Log the change if admin
  const user = DATABASE.users.find(u => u.id === userId);
  if (user && user.type === 'ADMIN') {
    logAuditChange({
      type: 'UPDATE_MARKER',
      markerId,
      adminId: userId,
      adminEmail: user.email,
      oldData,
      newData: marker,
      timestamp: new Date().toISOString()
    });
  }
  
  saveDatabase();
  return { success: true, marker };
}

function deleteMarker(markerId, userId) {
  const markerIndex = DATABASE.markers.findIndex(m => m.id === markerId);
  
  if (markerIndex === -1) {
    return { success: false, message: 'Marker not found' };
  }
  
  const deletedMarker = DATABASE.markers[markerIndex];
  
  // Log the deletion if admin
  const user = DATABASE.users.find(u => u.id === userId);
  if (user && user.type === 'ADMIN') {
    logAuditChange({
      type: 'DELETE_MARKER',
      markerId,
      adminId: userId,
      adminEmail: user.email,
      deletedData: deletedMarker,
      timestamp: new Date().toISOString()
    });
  }
  
  DATABASE.markers.splice(markerIndex, 1);
  saveDatabase();
  return { success: true };
}

// Audit Log Management
function logAuditChange(logEntry) {
  DATABASE.auditLog.push(logEntry);
  saveDatabase();
}

function getAuditLog(filters = {}) {
  let logs = DATABASE.auditLog;
  
  if (filters.adminId) {
    logs = logs.filter(log => log.adminId === filters.adminId);
  }
  
  if (filters.type) {
    logs = logs.filter(log => log.type === filters.type);
  }
  
  if (filters.startDate && filters.endDate) {
    logs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= filters.startDate && logDate <= filters.endDate;
    });
  }
  
  return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Admin Management
function promoteUserToAdmin(userId, promotedBy) {
  const user = DATABASE.users.find(u => u.id === userId);
  const promoter = DATABASE.users.find(u => u.id === promotedBy);
  
  if (!user) {
    return { success: false, message: 'User not found' };
  }
  
  if (!promoter || promoter.type !== 'ADMIN') {
    return { success: false, message: 'Only admins can promote users' };
  }
  
  user.type = 'ADMIN';
  
  logAuditChange({
    type: 'PROMOTE_USER',
    userId,
    adminId: promotedBy,
    adminEmail: promoter.email,
    timestamp: new Date().toISOString()
  });
  
  saveDatabase();
  return { success: true, user };
}

// Database Persistence
function saveDatabase() {
  // In a real app, this would save to a backend server
  // For now, we'll save to localStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('dnd-map-database', JSON.stringify(DATABASE));
  }
}

function loadDatabase() {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('dnd-map-database');
    if (saved) {
      const data = JSON.parse(saved);
      DATABASE.users = data.users || DATABASE.users;
      DATABASE.markers = data.markers || DATABASE.markers;
      DATABASE.auditLog = data.auditLog || DATABASE.auditLog;
    }
  }
}

function exportDatabase() {
  return {
    users: DATABASE.users,
    markers: DATABASE.markers,
    auditLog: DATABASE.auditLog,
    exportedAt: new Date().toISOString()
  };
}

function importDatabase(data) {
  if (data.users) DATABASE.users = data.users;
  if (data.markers) DATABASE.markers = data.markers;
  if (data.auditLog) DATABASE.auditLog = data.auditLog;
  saveDatabase();
}

// Initialize
loadDatabase();
