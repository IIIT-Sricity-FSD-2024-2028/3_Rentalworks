const UI = {
    showLoader() { document.getElementById('loader').classList.remove('hidden'); },
    hideLoader() { document.getElementById('loader').classList.add('hidden'); },
    toggleDropdown(id) { document.getElementById(id).classList.toggle('hidden'); },
    showToast(msg, type = 'info') {
        const cont = document.getElementById('toast-container');
        const t = document.createElement('div');
        t.textContent = msg;
        const colors = { error: 'var(--danger)', success: 'var(--success)', warning: '#f59e0b', info: '#3b82f6' };
        t.style.cssText = `background:${colors[type] || colors.info}; color:white; padding:12px 24px; border-radius:8px; margin-bottom:10px; font-weight:700; box-shadow:var(--shadow); animation: slideInRight 0.3s ease;`;
        cont.appendChild(t);
        setTimeout(() => { t.style.animation = 'fadeOut 0.3s ease'; setTimeout(() => t.remove(), 280); }, 3000);
    },

    // Shows an inline error under a field and shakes it
    _setFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errEl = document.getElementById('err-' + fieldId);
        if (field) {
            field.classList.add('input-error');
            field.classList.remove('input-success');
        }
        if (errEl) errEl.textContent = message;
    },

    // Marks a field as valid
    _setFieldValid(fieldId) {
        const field = document.getElementById(fieldId);
        const errEl = document.getElementById('err-' + fieldId);
        if (field) {
            field.classList.remove('input-error');
            field.classList.add('input-success');
        }
        if (errEl) errEl.textContent = '';
    },

    // Clears error on keystroke (called via oninput)
    clearFieldError(el) {
        el.classList.remove('input-error');
        const errEl = document.getElementById('err-' + el.id);
        if (errEl) errEl.textContent = '';
    },

    handleContactSubmit() {
        const name  = document.getElementById('contact-name')?.value.trim();
        const email = document.getElementById('contact-email')?.value.trim();
        const phone = document.getElementById('contact-phone')?.value.trim();
        const msg   = document.getElementById('contact-msg')?.value.trim();

        let valid = true;

        // --- Name ---
        if (!name || name.length < 2) {
            this._setFieldError('contact-name', 'Please enter your full name (at least 2 characters).');
            valid = false;
        } else {
            this._setFieldValid('contact-name');
        }

        // --- Email ---
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            this._setFieldError('contact-email', 'Email address is required.');
            valid = false;
        } else if (!emailRegex.test(email)) {
            this._setFieldError('contact-email', 'Please enter a valid email (e.g. you@example.com).');
            valid = false;
        } else {
            this._setFieldValid('contact-email');
        }

        // --- Phone ---
        const phoneDigits = phone.replace(/[\s\-\+]/g, '');
        if (!phone) {
            this._setFieldError('contact-phone', 'Phone number is required.');
            valid = false;
        } else if (!/^\d{10}$/.test(phoneDigits)) {
            this._setFieldError('contact-phone', 'Enter a valid 10-digit phone number.');
            valid = false;
        } else {
            this._setFieldValid('contact-phone');
        }

        // --- Message ---
        if (!msg || msg.length < 10) {
            this._setFieldError('contact-msg', 'Please write a message (at least 10 characters).');
            valid = false;
        } else {
            this._setFieldValid('contact-msg');
        }

        if (!valid) return;

        // All valid — simulate sending
        this.showLoader();
        setTimeout(() => {
            this.hideLoader();
            this.showToast('✅ Message sent! The owner will contact you shortly.', 'success');

            // Clear & reset fields
            ['contact-name', 'contact-email', 'contact-phone', 'contact-msg'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.value = '';
                    el.classList.remove('input-error', 'input-success');
                }
                const errEl = document.getElementById('err-' + id);
                if (errEl) errEl.textContent = '';
            });
        }, 1200);
    }
};