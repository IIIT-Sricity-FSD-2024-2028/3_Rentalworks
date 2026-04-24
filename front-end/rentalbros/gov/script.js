/**
 * PG RENTAL HUB – SCRIPT.JS
 * Handles: Login, Page Navigation, Mobile Menu, FAQ Accordion,
 * Roommate Matching Flow, Booking Flow, Payment, Form Validation
 */

/* ============================================================
   STATE
   ============================================================ */
let selectedRoommate = null; // { id, name, age, job, match }
let currentBookingType = 'double';
let selectedPaymentMethod = null;

/* ============================================================
   UTILITY: SHOW/HIDE PAGES
   ============================================================ */
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // Show target
    const target = document.getElementById(pageId);
    if (target) {
        target.classList.add('active');
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function goBack(pageId) {
    showPage(pageId);
}

/* ============================================================
   LOGIN
   ============================================================ */
function togglePassword() {
    const input = document.getElementById('login-pass');
    input.type = input.type === 'password' ? 'text' : 'password';
}

function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    let valid = true;

    // Clear previous errors
    document.getElementById('err-email').textContent = '';
    document.getElementById('err-pass').textContent = '';

    // Validate email / phone
    if (!email) {
        document.getElementById('err-email').textContent = 'Email or phone is required.';
        valid = false;
    }
    // Validate password
    if (!pass) {
        document.getElementById('err-pass').textContent = 'Password is required.';
        valid = false;
    }

    if (valid) {
        // Proceed to main site
        showPage('page-main');
    }
}

function handleLogout() {
    closeUserMenu();
    showPage('page-login');
}

/* ============================================================
   NAVBAR
   ============================================================ */
function toggleMenu() {
    const navLinks = document.getElementById('nav-links');
    const hamburger = document.getElementById('hamburger');
    navLinks.classList.toggle('open');
    hamburger.classList.toggle('active');
}

function closeMenu() {
    document.getElementById('nav-links').classList.remove('open');
    document.getElementById('hamburger').classList.remove('active');
}

function toggleUserMenu() {
    document.getElementById('user-dropdown').classList.toggle('open');
}

function closeUserMenu() {
    document.getElementById('user-dropdown').classList.remove('open');
}

// Close user dropdown on outside click
document.addEventListener('click', function (e) {
    const btn = document.getElementById('user-btn');
    const menu = document.getElementById('user-dropdown');
    if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('open');
    }
});

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================================
   FAQ ACCORDION
   ============================================================ */
function toggleFaq(btn) {
    const allQuestions = document.querySelectorAll('.faq-question');
    const allAnswers = document.querySelectorAll('.faq-answer');

    const answer = btn.nextElementSibling;
    const isOpen = btn.classList.contains('open');

    // Close all
    allQuestions.forEach(q => q.classList.remove('open'));
    allAnswers.forEach(a => a.classList.remove('open'));

    // Open clicked if it was closed
    if (!isOpen) {
        btn.classList.add('open');
        answer.classList.add('open');
    }
}

/* ============================================================
   CONTACT FORM VALIDATION
   ============================================================ */
function submitContactForm() {
    const name = document.getElementById('c-name').value.trim();
    const email = document.getElementById('c-email').value.trim();
    const phone = document.getElementById('c-phone').value.trim();
    const message = document.getElementById('c-message').value.trim();
    let valid = true;

    // Clear errors
    ['c-name', 'c-email', 'c-phone', 'c-message'].forEach(id => {
        document.getElementById('err-' + id).textContent = '';
    });
    document.getElementById('form-success').classList.remove('show');

    if (!name) { document.getElementById('err-c-name').textContent = 'Name is required.'; valid = false; }
    if (!email) {
        document.getElementById('err-c-email').textContent = 'Email is required.'; valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        document.getElementById('err-c-email').textContent = 'Enter a valid email address.'; valid = false;
    }
    if (!phone) {
        document.getElementById('err-c-phone').textContent = 'Phone number is required.'; valid = false;
    } else if (!/^\d{10}$/.test(phone.replace(/\s|-/g, ''))) {
        document.getElementById('err-c-phone').textContent = 'Enter a valid 10-digit phone number.'; valid = false;
    }
    if (!message) { document.getElementById('err-c-message').textContent = 'Message is required.'; valid = false; }

    if (valid) {
        document.getElementById('form-success').classList.add('show');
        // Clear fields
        document.getElementById('c-name').value = '';
        document.getElementById('c-email').value = '';
        document.getElementById('c-phone').value = '';
        document.getElementById('c-message').value = '';
        setTimeout(() => document.getElementById('form-success').classList.remove('show'), 4000);
    }
}

/* ============================================================
   ROOMMATE MATCHING FLOW
   ============================================================ */

// Step 0: Triggered from "Book Now" on a room card
function startRoommateMatching(roomType) {
    currentBookingType = roomType;
    showPage('page-roommate-intro');
}

// Step 1: User clicks "Yes, Find My Match"
function showPreferences() {
    showPage('page-preferences');
}

// Step 1b: User clicks "Skip Matching"
function skipMatching() {
    selectedRoommate = null;
    prepareBookingReview(null);
    showPage('page-booking-review');
}

// Preference Selection
function selectPref(btn) {
    const group = btn.getAttribute('data-group');
    // Deselect all in same group
    document.querySelectorAll(`.pref-opt[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
    // Select clicked
    btn.classList.add('active');
}

function toggleInterest(btn) {
    btn.classList.toggle('active');
}

// Step 2: Show match profiles
function showMatches() {
    // Reset to profile 1
    document.getElementById('profile-1').classList.remove('hidden');
    document.getElementById('profile-2').classList.add('hidden');
    updateMatchCount();
    showPage('page-matches');
}

// Skip a profile
function skipProfile(id) {
    const current = document.getElementById('profile-' + id);
    const next = document.getElementById('profile-' + (id + 1));

    if (next) {
        current.classList.add('hidden');
        next.classList.remove('hidden');
    } else {
        // No more profiles – proceed with no roommate selected
        selectedRoommate = null;
        showSelectedReview();
    }
}

// Connect (select) a profile
function connectProfile(id) {
    if (id === 1) {
        selectedRoommate = {
            id: 1, name: 'Rahul Sharma', age: 24, job: 'Software Engineer', match: 95,
            img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80',
            bio: 'Working professional, looking for a clean and quiet space. Love coding and reading in my free time.',
            interests: ['Reading', 'Gaming', 'Cooking']
        };
    } else {
        selectedRoommate = {
            id: 2, name: 'Arjun Reddy', age: 25, job: 'Data Analyst', match: 85,
            img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&q=80',
            bio: 'Love to cook and share meals. Enjoy weekend gaming sessions.',
            interests: ['Cooking', 'Gaming', 'Sports']
        };
    }
    updateMatchCount();
    showSelectedReview();
}

function updateMatchCount() {
    const count = document.getElementById('match-count');
    if (count) count.textContent = (selectedRoommate ? '1' : '0') + ' / 1 selected';
}

// Step 3: Review selection
function showSelectedReview() {
    const display = document.getElementById('selected-roommate-display');
    if (selectedRoommate) {
        display.innerHTML = `
      <img src="${selectedRoommate.img}" alt="${selectedRoommate.name}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;flex-shrink:0;">
      <div style="text-align:left;">
        <strong>${selectedRoommate.name}, ${selectedRoommate.age}</strong>
        <span class="match-badge-sm green" style="margin-left:8px;">${selectedRoommate.match}% Match</span>
        <p style="font-size:0.82rem;color:var(--text-muted);margin:2px 0 8px;">${selectedRoommate.job}</p>
        <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:8px;">${selectedRoommate.bio}</p>
        <div class="profile-tags">
          ${selectedRoommate.interests.map(i => `<span class="tag grey">${i}</span>`).join('')}
        </div>
      </div>`;
    } else {
        display.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;padding:16px;">No roommate selected. You can be assigned one later.</p>';
    }
    showPage('page-selected');
}

/* ============================================================
   BOOKING FLOW
   ============================================================ */
function prepareBookingReview(roommate) {
    const card = document.getElementById('br-roommate-card');
    const nameField = document.getElementById('bs-roommate-name');

    if (roommate) {
        card.innerHTML = `
      <div class="mini-avatar"><img src="${roommate.img}" alt="${roommate.name}"></div>
      <div>
        <strong>${roommate.name}</strong> <small>${roommate.age}</small><br>
        <small>${roommate.job}</small><br>
        <p style="font-size:0.82rem;margin:6px 0 8px;">${roommate.bio}</p>
        <div class="profile-tags">
          ${roommate.interests.map(i => `<span class="tag orange">${i}</span>`).join('')}
        </div>
      </div>`;
        if (nameField) nameField.innerHTML = '<small>Selected Roommate</small><strong>' + roommate.name + '</strong>';
    } else {
        card.innerHTML = '<p style="color:var(--text-muted);font-size:0.88rem;">No roommate selected. You will be assigned one on arrival.</p>';
        if (nameField) nameField.innerHTML = '<small>Selected Roommate</small><strong>None</strong>';
    }
}

function showBookingReview() {
    prepareBookingReview(selectedRoommate);
    showPage('page-booking-review');
}

// Simulate sending request (with loading state)
function sendBookingRequest() {
    const btn = event.target;
    btn.textContent = '⏳ Sending...';
    btn.disabled = true;
    setTimeout(() => {
        btn.textContent = 'Send Booking Request';
        btn.disabled = false;
        showPage('page-request-sent');
    }, 1500);
}

// Pending requests page
function showPendingRequests() {
    showPage('page-pending');
}

// Booking details
function showBookingDetails(status) {
    showPage('page-booking-details');
}

// Payment
function showPaymentPage() {
    showPage('page-payment');
}

/* ============================================================
   PAYMENT
   ============================================================ */
function selectPayment(method) {
    selectedPaymentMethod = method;

    // Reset all
    document.querySelectorAll('.pay-option').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.pay-form').forEach(el => el.classList.add('hidden'));

    // Activate selected
    document.getElementById('pay-' + method).classList.add('active');
    document.getElementById('form-' + method).classList.remove('hidden');
}

function processPayment() {
    const btn = document.getElementById('pay-btn');

    if (!selectedPaymentMethod) {
        alert('Please select a payment method to continue.');
        return;
    }

    // Simulate processing
    btn.textContent = '⏳ Processing...';
    btn.disabled = true;
    btn.style.background = 'var(--text-muted)';

    setTimeout(() => {
        showPage('page-confirmed');
    }, 2000);
}

/* ============================================================
   RECEIPT DOWNLOAD (stub)
   ============================================================ */
function downloadReceipt() {
    alert('📄 Receipt downloaded! (Booking ID: BK2026030912345)');
}

/* ============================================================
   SMOOTH SCROLL (for navbar links)
   ============================================================ */
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

/* ============================================================
   NAVBAR SCROLL EFFECT
   ============================================================ */
window.addEventListener('scroll', function () {
    const navbar = document.getElementById('navbar');
    if (navbar) {
        if (window.scrollY > 10) {
            navbar.style.boxShadow = '0 4px 24px rgba(0,0,0,0.1)';
        } else {
            navbar.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
        }
    }
});

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
    // Show login page first
    showPage('page-login');
});