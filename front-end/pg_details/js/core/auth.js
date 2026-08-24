const Auth = {
    init() {
        // Integrate with centralized auth system
        const pgUserStr = sessionStorage.getItem('pg_user'); // Fix: global app uses sessionStorage
        if (pgUserStr) {
            try {
                const pgUser = JSON.parse(pgUserStr);
                State.data.currentUser = { 
                    name: pgUser.name || 'Guest User', 
                    email: pgUser.email || 'N/A', 
                    phone: pgUser.phone || 'N/A', 
                    role: pgUser.role || 'guest' 
                };
            } catch (e) {}
        } else {
            State.data.currentUser = null;
        }

        this.updateUI();
        // Unauthenticated guests should be allowed to browse the landing page
        Navigation.navigate('landing');
    },
    login() {
        // Redirect completely out of this folder, back to the unified authentication page
        window.location.href = '../login/login/login.html';
    },
    logout() {
        State.data.currentUser = null;
        State.save();
        sessionStorage.removeItem('pg_user'); // Log out from main system entirely
        window.location.href = '../login/login/login.html';
    },
    updateUI() {
        const userMenu = document.getElementById('nav-user-menu');
        const loginBtn = document.getElementById('nav-login-btn');
        if (State.data.currentUser) {
            userMenu.classList.remove('hidden');
            loginBtn.classList.add('hidden');
            document.getElementById('drop-email').textContent = State.data.currentUser.email;
            const dropName = document.getElementById('drop-name');
            if (dropName) dropName.textContent = State.data.currentUser.name || 'Guest User';
            const navAvatar = document.getElementById('nav-avatar');
            const storedPhoto = sessionStorage.getItem('pg_guest_photo');
            if (navAvatar) navAvatar.src = storedPhoto || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(State.data.currentUser.name || 'User') + '&background=ca8a04&color=fff');
            
            const profileAvatar = document.getElementById('edit-profile-avatar');
            if (profileAvatar) {
                profileAvatar.src = storedPhoto || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(State.data.currentUser.name || 'User') + '&background=ca8a04&color=fff');
            }
        } else {
            userMenu.classList.add('hidden');
            loginBtn.classList.remove('hidden');
        }
    },
    handlePhotoSelect(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64Photo = e.target.result;
                sessionStorage.setItem('pg_guest_photo', base64Photo);
                Auth.updateUI();
                UI.showToast('Photo updated successfully!', 'success');
            };
            reader.readAsDataURL(file);
        }
    },
    saveProfile() {
        const nameInput = document.getElementById('edit-name');
        const phoneInput = document.getElementById('edit-phone');
        const addressInput = document.getElementById('edit-address');
        
        if (!nameInput) return;
        
        const newName = nameInput.value.trim();
        const newPhone = phoneInput ? phoneInput.value.trim() : '';
        const newAddress = addressInput ? addressInput.value.trim() : '';

        if (!newName) {
            UI.showToast('Name cannot be empty.', 'error');
            return;
        }

        // Basic phone validation if provided
        if (newPhone && !/^\d{10}$/.test(newPhone.replace(/[\s-]/g, ''))) {
             UI.showToast('Please enter a valid 10-digit phone number.', 'error');
             return;
        }
        
        if (State.data.currentUser) {
            State.data.currentUser.name = newName;
            State.data.currentUser.phone = newPhone;
            State.data.currentUser.address = newAddress;
            
            State.save();
            this.updateUI(); // Updates the navbar avatar and text
            
            // Update the edit-profile page avatar
            const profileAvatar = document.getElementById('edit-profile-avatar');
            const storedPhoto = sessionStorage.getItem('pg_guest_photo');
            if (profileAvatar) {
                profileAvatar.src = storedPhoto || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(newName) + '&background=ca8a04&color=fff');
            }
            
            UI.showToast('Profile Saved successfully!', 'success');
        }
    }
};