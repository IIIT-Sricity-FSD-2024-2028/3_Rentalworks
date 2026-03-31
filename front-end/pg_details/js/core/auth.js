const Auth = {
    init() {
        // Integrate with centralized auth system
        const pgUserStr = sessionStorage.getItem('pg_user'); // Fix: global app uses sessionStorage
        if (pgUserStr) {
            try {
                const pgUser = JSON.parse(pgUserStr);
                State.data.currentUser = { name: pgUser.username || 'Guest User', email: pgUser.username + '@example.com', role: pgUser.role || 'guest' };
            } catch (e) {}
        } else {
            State.data.currentUser = null;
        }

        // Seed mock data for guests checking out pending requests with no history
        if (State.data.currentUser && (!State.data.bookings || State.data.bookings.length === 0)) {
            const mockBk = { 
                id: 'BK-' + Date.now().toString().slice(-6), 
                pg: 'Demo Test PG', 
                location: 'Indiranagar, Bangalore',
                room: 'Private Single',
                roommate: null, 
                rent: 10000, 
                deposit: 5000,
                date: '05 April 2026',
                img: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500',
                status: 'pending' 
            };
            State.data.bookings = [mockBk];
            State.save();
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
            if (navAvatar) navAvatar.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(State.data.currentUser.name || 'User') + '&background=ca8a04&color=fff';
        } else {
            userMenu.classList.add('hidden');
            loginBtn.classList.remove('hidden');
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
            if (profileAvatar) {
                profileAvatar.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(newName) + '&background=ca8a04&color=fff';
            }
            
            UI.showToast('Profile Saved successfully!', 'success');
        }
    }
};