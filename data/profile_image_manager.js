// Profile Image Manager - Profil resimlerini yönetmek için
window.ProfileImageManager = {
    // Profil resmini Base64'ten dosyaya dönüştür ve klasöre kaydet
    saveProfileImage: function(userId, imageData) {
        if (!imageData || !imageData.startsWith('data:image')) return null;

        try {
            const timestamp = Date.now();
            const fileName = `avatar_${userId}_${timestamp}.png`;
            const filePath = `assets/PROFILE_PNG/${fileName}`;

            // localStorage'da kaydet (Base64 olarak)
            const profileImages = JSON.parse(localStorage.getItem('dnd-profile-images') || '{}');
            profileImages[userId] = {
                fileName: fileName,
                filePath: filePath,
                imageData: imageData,
                timestamp: timestamp
            };
            localStorage.setItem('dnd-profile-images', JSON.stringify(profileImages));

            return { fileName, filePath };
        } catch (e) {
            console.error('Failed to save profile image:', e);
            return null;
        }
    },

    // Kullanıcının profil resmini yükle
    loadProfileImage: function(userId) {
        try {
            const profileImages = JSON.parse(localStorage.getItem('dnd-profile-images') || '{}');
            return profileImages[userId] || null;
        } catch (e) {
            console.error('Failed to load profile image:', e);
            return null;
        }
    },

    // Tüm profil resimlerini al
    getAllProfileImages: function() {
        try {
            return JSON.parse(localStorage.getItem('dnd-profile-images') || '{}');
        } catch (e) {
            console.error('Failed to load profile images:', e);
            return {};
        }
    },

    // Profil resmini sil
    deleteProfileImage: function(userId) {
        try {
            const profileImages = JSON.parse(localStorage.getItem('dnd-profile-images') || '{}');
            delete profileImages[userId];
            localStorage.setItem('dnd-profile-images', JSON.stringify(profileImages));
            return true;
        } catch (e) {
            console.error('Failed to delete profile image:', e);
            return false;
        }
    }
};

// Sayfa yüklenirken profil resimlerini yükle
window.addEventListener('DOMContentLoaded', function() {
    // Profil resimlerini localStorage'dan yükle
    const storedImages = localStorage.getItem('dnd-profile-images');
    if (!storedImages) {
        localStorage.setItem('dnd-profile-images', JSON.stringify({}));
    }
});
