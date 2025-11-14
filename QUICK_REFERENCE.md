# Quick Reference - D&D Interactive Map

## 🚀 QUICK START

1. **Open the application** → `map.html` in browser
2. **Register account** → Bottom-right panel, Register tab
3. **Login** → Use registered credentials
4. **Create marker** → Fill form, click "Create Marker", click map
5. **Export data** → Filters tab, "Export JSON" button

---

## 🔑 DEMO CREDENTIALS

```
Email: admin@example.com
Password: admin123
Type: ADMIN
```

---

## 📊 DATABASE FUNCTIONS

### User Management
```javascript
registerUser(email, password)
→ { success: bool, message: string, user: object }

loginUser(email, password)
→ { success: bool, user: object }

promoteUserToAdmin(userId, promotedBy)
→ Updates user type to "ADMIN", logs change
```

### Marker Operations
```javascript
addMarker(markerData, userId)
→ { success: bool, marker: object }

updateMarker(markerId, updates, userId)
→ { success: bool, message: string }
// Auto-logs if admin

deleteMarker(markerId, userId)
→ { success: bool, message: string }
// Auto-logs if admin
```

### Data Management
```javascript
exportDatabase()
→ { users: [], markers: [], auditLog: [], exportedAt: string }

importDatabase(data)
→ Loads complete database from JSON

saveDatabase()
→ Persists to localStorage

loadDatabase()
→ Retrieves from localStorage
```

---

## 🎨 UI COMPONENTS

### Left Sidebar
- **Editor Tab**: Create markers (Type, Name, Description, Color)
- **Filters Tab**: Toggle marker types, Export/Import, Clear/Disable All
- **Players Tab**: Add/manage campaign players

### Bottom-Right Auth Panel
- **Login Tab**: Email + Password login
- **Register Tab**: Create new USER accounts
- **User Info**: Shows logged-in user and logout button

### Map
- **Click to place**: After creating marker form, click map location
- **Drag to adjust**: Click and drag any marker to reposition

---

## 🔐 AUTHENTICATION FLOW

```
Start
  ↓
┌─────────────────┐
│ Auth Panel      │
│ (bottom-right)  │
└─────────────────┘
  ↓
┌─────────────────────────┐
│ Register Tab? → Create  │
│ (new USER type)         │
└─────────────────────────┘
  ↓
┌─────────────────────────┐
│ Login Tab → Authenticate│
│ (sets currentUser)      │
└─────────────────────────┘
  ↓
┌─────────────────────────┐
│ Create Markers          │
│ (auto-tracked by userId)│
└─────────────────────────┘
  ↓
┌─────────────────────────┐
│ Export Data             │
│ (data.json with users,  │
│  markers, audit log)    │
└─────────────────────────┘
  ↓
┌─────────────────────────┐
│ Logout                  │
│ (clear currentUser)     │
└─────────────────────────┘
```

---

## 📦 MARKER DATA STRUCTURE

```javascript
{
  id: "marker-1234567890",           // Auto-generated
  name: "Eldoria City",              // User input
  description: "Trading hub",         // User input
  type: "city",                       // city|village|dungeon|resource|player
  color: "#ff0000",                   // From 18-color palette
  x: 500,                            // Map X coordinate
  y: 350,                            // Map Y coordinate
  createdBy: "user-1234567890",      // User ID who created
  createdAt: "2024-01-01T12:00:00Z", // ISO timestamp
  updatedAt: "2024-01-01T12:00:00Z"  // ISO timestamp
}
```

---

## 📋 AUDIT LOG STRUCTURE

```javascript
{
  id: "audit-1234567890",              // Auto-generated
  type: "marker_created",              // marker_created|updated|deleted|user_promoted
  timestamp: "2024-01-01T12:00:00Z",  // ISO timestamp
  admin: "admin@example.com",          // Admin who made change
  action: "Created marker",            // Human-readable action
  details: {                           // Change details
    markerId: "marker-1234567890",
    name: "Eldoria City",
    type: "city"
  }
}
```

---

## 🎯 COLOR PALETTE (18 colors)

```
Primary:
#ffffff (White)  #000000 (Black)   #ff0000 (Red)
#00ff00 (Green)  #0000ff (Blue)    #ffff00 (Yellow)

Secondary:
#ff8800 (Orange) #ff00ff (Magenta) #00ffff (Cyan)
#c0c0c0 (Silver) #800000 (Maroon)  #008000 (Dark Green)
#000080 (Navy)   #808000 (Olive)   #800080 (Purple)
#008080 (Teal)   #ffa500 (Orange)  #a52a2a (Brown)
```

---

## 🔍 BROWSER CONSOLE TIPS

```javascript
// View entire database
console.log(DATABASE)

// Check current logged-in user
console.log(currentUser)

// View all markers on map
console.log(ITEMS)

// List all users
console.log(DATABASE.users)

// View audit log
console.log(DATABASE.auditLog)

// Get user by ID
DATABASE.users.find(u => u.id === "user-xxx")

// Find markers created by specific user
DATABASE.markers.filter(m => m.createdBy === "user-xxx")

// Check if user is admin
currentUser?.type === "ADMIN"

// Manually log something
logAuditChange({
  type: "custom_action",
  timestamp: new Date().toISOString(),
  admin: currentUser.email,
  action: "Did something",
  details: { key: "value" }
})
```

---

## ⚙️ THEME TOGGLE

```javascript
// Toggle dark/light mode
document.getElementById('themeToggle').click()

// Check current theme
document.documentElement.classList.contains('light-mode')
// Returns: true (light) or false (dark)
```

---

## 📁 FILE LOCATIONS

```
c:\PROJECTS_ERDEM\INTERACTIVE-MAP\
├── map.html          ← Open this in browser
├── map.css           ← All styling
├── map.js            ← Main application logic
├── database.js       ← User/marker/audit system
├── assets/
│   ├── worldmap.png
│   └── markers/
│       ├── city.png
│       ├── village.png
│       ├── dungeon.png
│       ├── resource.png
│       ├── player.png
│       └── marker.png
└── INTEGRATION_COMPLETE.txt  ← Detailed report
```

---

## ✅ VERIFICATION CHECKLIST

- [x] Auth panel in bottom-right corner
- [x] Login/Register tabs switchable
- [x] User registration creates USER type
- [x] Login stores currentUser globally
- [x] Markers track createdBy userId
- [x] Export downloads data.json
- [x] Import loads complete database
- [x] Audit log tracks admin changes
- [x] All marker icons display correctly
- [x] Color overlays visible
- [x] Theme toggle works
- [x] No console errors
- [x] localStorage persistence active

---

## 🚨 COMMON ISSUES & FIXES

**Issue**: "Please login first to create markers"
→ **Fix**: Register and login in auth panel

**Issue**: Markers don't appear
→ **Fix**: Check worldmap.png exists in assets folder

**Issue**: Colors don't show
→ **Fix**: Check assets/markers/ folder has icon files

**Issue**: Theme toggle doesn't work
→ **Fix**: Refresh page (F5)

**Issue**: Data lost after refresh
→ **Fix**: Check localStorage size (some browsers limit it)

**Issue**: Import not working
→ **Fix**: Ensure JSON format is valid (use exported file as template)

---

## 🔗 INTEGRATION CHAIN

```
database.js (user/marker/audit logic)
    ↓ (imported by)
map.html (DOM structure)
    ↓ (uses)
map.js (event handlers, map logic)
    ↓ (calls functions from)
database.js ← comes full circle ↺
```

All three files work together seamlessly.

---

## 📞 FUNCTION CALL EXAMPLES

```javascript
// Create new user
registerUser("user@example.com", "password123")

// Login user
const result = loginUser("user@example.com", "password123")
if (result.success) {
  currentUser = result.user
}

// Create marker (requires logged-in user)
addMarker({
  name: "Castle",
  description: "Ancient fortress",
  type: "dungeon",
  color: "#ff0000",
  x: 250,
  y: 150
}, currentUser.id)

// Update marker (admin auto-logs)
updateMarker("marker-123", {
  name: "New Name"
}, currentUser.id)

// Delete marker (admin auto-logs)
deleteMarker("marker-123", currentUser.id)

// Export for backup
const backup = exportDatabase()
// Save to file: backup.json

// Import from backup
importDatabase(JSON.parse(localStorage.getItem('backup')))
```

---

**Status**: ✅ Production Ready for Testing
**Last Updated**: After Integration Complete
