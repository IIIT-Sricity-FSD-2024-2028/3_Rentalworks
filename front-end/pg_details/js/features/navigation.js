/**
 * Navigation Engine - PG Rental
 * Handles SPA routing, fetching HTML fragments, and initializing page logic.
 */
const Navigation = {

    // 1. Core routing function
    async navigate(page) {

        // --- NAVBAR VISIBILITY CONTROL ---
        const navbar = document.getElementById('navbar');
        if (navbar) {
            // Show navbar only on the landing page or other main content pages
            if (page === 'landing' || page === 'pending' || page === 'transactions') {
                navbar.classList.remove('hidden');
            } else {
                navbar.classList.add('hidden');
            }
        }

        // --- ROUTE GUARD ---
        if (!State.data.currentUser && page !== 'login' && page !== 'landing') {
             UI.showToast('Please sign in to access this page.', 'warning');
             setTimeout(() => { window.location.href = '../login/login/login.html'; }, 1000);
             return;
        }

        // Intercept exactly login
        if (page === 'login') {
            window.location.href = '../login/login/login.html';
            return;
        }

        UI.showLoader();

        try {
            // 2. Fetch the HTML fragment
            const response = await fetch(`pages/${page}.html`);
            
            if (!response.ok) {
                throw new Error(`Failed to load: pages/${page}.html`);
            }

            // 3. Inject the HTML into the DOM
            const htmlContent = await response.text();
            const container = document.getElementById('dynamic-page-container');
            
            if (container) {
                container.innerHTML = htmlContent;
                window.scrollTo(0, 0);
            }

            // 4. Highlight current link in Navbar
            this.updateNavHighlight(page);

            // 5. Initialize the logic for this specific page
            this.initPageLogic(page);

            // 6. Save current state
            State.data.currentPage = page;
            State.save();

        } catch (error) {
            console.error("SPA Navigation Error:", error);
            UI.showToast("Failed to load page.", "error");
        } finally {
            UI.hideLoader();
        }
    },

    // 2. Page-Specific Initializers
    initPageLogic(page) {
        switch (page) {
            case 'landing':
                // Scroll links are in the persistent navbar; re-init after page load
                setTimeout(() => { 
                    this.initScrollLinks(); 
                    if (typeof BookingLogic !== 'undefined' && BookingLogic.updateRoomAvailabilityUI) {
                        BookingLogic.updateRoomAvailabilityUI();
                    }
                }, 100);
                break;

            case 'roommate-intro':
                setTimeout(() => {
                    if (typeof RoommateLogic !== 'undefined' && RoommateLogic.initIntroPage) {
                        RoommateLogic.initIntroPage();
                    }
                }, 50);
                break;

            case 'matches':
                setTimeout(() => { if (typeof RoommateLogic !== 'undefined') RoommateLogic.render(); }, 50);
                break;

            case 'booking-review':
                setTimeout(() => { if (typeof BookingLogic !== 'undefined') BookingLogic.renderReview(); }, 50);
                break;

            case 'pending':
                setTimeout(() => { if (typeof BookingLogic !== 'undefined') BookingLogic.renderPending(); }, 50);
                break;

            case 'transactions':
                setTimeout(() => { if (typeof BookingLogic !== 'undefined') BookingLogic.renderTxns(); }, 50);
                break;

            case 'edit-profile':
                this.initProfileUI();
                break;

            case 'booking-details':
                setTimeout(() => { if (typeof BookingLogic !== 'undefined') BookingLogic.renderBookingDetails(); }, 50);
                break;

            case 'booking-confirmed':
                setTimeout(() => { if (typeof BookingLogic !== 'undefined') BookingLogic.renderConfirmed(); }, 50);
                break;

            default:
                break;
        }
    },

    /**
     * Highlights current active link in navbar safely without throwing exceptions
     */
    updateNavHighlight(page) {
        try {
            const links = document.querySelectorAll('.nav-links a, .nav-item');
            links.forEach(link => {
                link.classList.remove('active');
                const href = link.getAttribute('href');
                const datasetPage = link.getAttribute('data-page');
                if (datasetPage && datasetPage === page) {
                    link.classList.add('active');
                } else if (href && (href.includes(page) || (page === 'landing' && (href === '#' || href === '#home')))) {
                    link.classList.add('active');
                }
            });
        } catch (e) {
            console.warn("Error updating nav highlight:", e);
        }
    },

    /**
     * Smooth Scroll Handler for Landing Page
     * Attaches click listeners to persistent navbar anchor links.
     * If the landing page is not yet loaded, navigates there first then scrolls.
     */
    initScrollLinks() {
        const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

        navLinks.forEach(link => {
            // Remove any previous listener to avoid duplicates
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);

            newLink.addEventListener('click', async (e) => {
                e.preventDefault();
                const targetId = newLink.getAttribute('href').substring(1);

                // If we're not on the landing page, navigate there first
                if (State.data.currentPage !== 'landing') {
                    await Navigation.navigate('landing');
                    // Wait a bit for DOM to render
                    await new Promise(r => setTimeout(r, 150));
                }

                const element = document.getElementById(targetId);
                if (element) {
                    const navHeight = document.getElementById('navbar')?.offsetHeight || 70;
                    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                    window.scrollTo({
                        top: elementPosition - navHeight - 12,
                        behavior: 'smooth'
                    });
                }

                // Close mobile menu if open
                if (typeof closeMenu === 'function') closeMenu();
            });
        });
    },

    // Helper: Fills profile form
    initProfileUI() {
        const user = State.data.currentUser;
        if (!user) return;
        const nameInput = document.getElementById('edit-name');
        const emailInput = document.getElementById('edit-email');
        const phoneInput = document.getElementById('edit-phone');
        const addressInput = document.getElementById('edit-address');
        const profileAvatar = document.getElementById('edit-profile-avatar');
        
        if (nameInput) nameInput.value = user.name || 'Guest User';
        if (emailInput) emailInput.value = user.email || '';
        if (phoneInput) phoneInput.value = user.phone || '';
        if (addressInput) addressInput.value = user.address || '';
        if (profileAvatar) profileAvatar.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || 'User') + '&background=ca8a04&color=fff';
    }
};

// 3. Browser History Support
window.addEventListener('popstate', () => {
    const savedPage = State.data.currentPage || 'landing';
    Navigation.navigate(savedPage);
});