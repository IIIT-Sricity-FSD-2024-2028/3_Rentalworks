const BookingLogic = {
    // 0a. Check room capacity against active/pending bookings
    checkRoomCapacity(pgName, roomType) {
        const targetPG = pgName || State.data.selectedPG || 'Sunrise PG Residency';
        const activeRoom = roomType || State.data.activeRoomType || 'Double Sharing';
        const capacity = State.getRoomCapacity(targetPG, activeRoom);
        const currentOccupied = State.getOccupiedCount(targetPG, activeRoom);
        // Calculate Occupied Beds + Pending Approved Bookings + Current Booking (1)
        if (currentOccupied + 1 > capacity) {
            return false;
        }
        return true;
    },

    // 0b. Dynamically update landing page room buttons based on current occupancy
    updateRoomAvailabilityUI() {
        const targetPG = State.data.selectedPG || 'Sunrise PG Residency';
        const roomCards = document.querySelectorAll('.room-img-card');
        roomCards.forEach(card => {
            const titleEl = card.querySelector('h3');
            const btn = card.querySelector('button');
            if (!titleEl || !btn) return;
            const roomType = titleEl.textContent.trim();
            const capacity = State.getRoomCapacity(targetPG, roomType);
            const currentOccupied = State.getOccupiedCount(targetPG, roomType);
            if (currentOccupied >= capacity) {
                btn.textContent = "No rooms available.";
                btn.disabled = true;
                btn.style.background = "#f1f5f9";
                btn.style.color = "var(--text-light)";
                btn.style.cursor = "not-allowed";
                btn.onclick = null;
                card.style.opacity = "0.7";
            } else {
                btn.textContent = "Book Now";
                btn.disabled = false;
                btn.style.background = "var(--primary)";
                btn.style.color = "white";
                btn.style.cursor = "pointer";
                btn.onclick = () => BookingLogic.startBooking(roomType);
                card.style.opacity = "1";
            }
        });
    },

    // 1. GATEKEEPER: Forces login before booking
    startBooking(roomType) {
        if (!State.data.currentUser) {
            UI.showToast("Please sign in to book a room", "warning");
            setTimeout(() => {
                window.location.href = '../login/login/login.html';
            }, 1000);
            return;
        }

        const targetPG = State.data.selectedPG || 'Sunrise PG Residency';
        if (!BookingLogic.checkRoomCapacity(targetPG, roomType)) {
            UI.showToast("No rooms available.", "error");
            return;
        }

        State.data.activeRoomType = roomType;
        State.data.selectedRm = null;
        State.data.selectedRoomNumber = null;
        State.save();

        if ((roomType || '').toLowerCase().includes('single')) {
            Navigation.navigate('booking-review');
        } else {
            Navigation.navigate('roommate-intro');
        }
    },

    // 2. BYPASS AI MATCHING
    skipMatching() {
        State.data.selectedRm = null; // Clears any selected roommate
        State.save();
        Navigation.navigate('booking-review');
    },

    getRentAndDeposit(roomType) {
        const cfg = State.getRoomConfig(roomType);
        return { rent: cfg.rent, deposit: cfg.deposit };
    },

    toggleFriendDetails(isFriend) {
        State.data.bookingFor = isFriend ? 'friend' : 'self';
        const box = document.getElementById('friend-details-box');
        if (box) box.style.display = isFriend ? 'grid' : 'none';
    },

    // 3. RENDER INITIAL REVIEW (Before sending to admin)
    renderReview() {
        const rm = State.data.selectedRm;
        const targetPG = State.data.selectedPG || 'Sunrise PG Residency';
        const roomType = State.data.activeRoomType || 'Double Sharing';
        const { rent, deposit } = BookingLogic.getRentAndDeposit(roomType);
        
        const durInput = document.getElementById('bk-duration');
        const months = durInput ? parseInt(durInput.value) || 1 : 1;
        
        // Monthly rent is flat. Security deposit uses the configured base deposit.
        const finalRent = rent; 
        const finalDeposit = deposit;
        const total = finalRent + finalDeposit;

        const setElTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
        setElTxt('br-pg', targetPG);
        setElTxt('rev-left-pg', targetPG);
        setElTxt('br-loc', State.data.selectedLocation || 'Koramangala, Bangalore');
        setElTxt('br-room', roomType);
        setElTxt('rev-left-room', roomType);
        setElTxt('br-roommate', rm ? rm.name : 'None');
        setElTxt('br-rent', `₹${finalRent.toLocaleString()}`);
        setElTxt('rev-left-rent', `₹${finalRent.toLocaleString()}`);
        setElTxt('br-deposit', `₹${finalDeposit.toLocaleString()}`);
        setElTxt('br-total', `₹${total.toLocaleString()}`);

        const reviewRmBox = document.getElementById('review-rm-box');
        const summaryRmBox = document.getElementById('summary-rm-name');

        if(rm && reviewRmBox) {
            reviewRmBox.innerHTML = `
                <div style="display: flex; gap: 16px; align-items: center;">
                    <img src="${rm.img || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500'}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <strong style="font-size: 16px;">${rm.name} <span style="color: var(--text-gray); font-weight: 400; font-size: 14px;">${rm.age || ''}</span></strong>
                        <p style="font-size: 13px; color: var(--text-gray); margin-top: 2px;">${rm.job || 'Tenant'}</p>
                    </div>
                </div>
            `;
            if (summaryRmBox) summaryRmBox.textContent = rm.name;
        } else if (reviewRmBox) {
            reviewRmBox.innerHTML = `<p style="color: var(--text-gray); font-size: 14px;">No roommate selected. One will be assigned upon arrival.</p>`;
            if (summaryRmBox) summaryRmBox.textContent = "None";
        }
    },

    // 4. SUBMIT WITH MANDATORY VALIDATION & INSTANT 15-MIN RESERVATION
    submitRequest() {
        const targetPG = State.data.selectedPG || 'Sunrise PG Residency';
        const roomType = State.data.activeRoomType || 'Double Sharing';
        const errBanner = document.getElementById('bk-error-banner');
        if (errBanner) {
            errBanner.style.display = 'none';
            errBanner.textContent = '';
        }

        // Reset borders
        ['bk-date', 'bk-duration', 'bk-friend-name', 'bk-friend-email', 'bk-friend-phone'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.borderColor = 'var(--border)';
        });

        const showError = (msg, inputId) => {
            if (errBanner) {
                errBanner.style.display = 'block';
                errBanner.textContent = msg;
            }
            if (inputId) {
                const el = document.getElementById(inputId);
                if (el) {
                    el.style.borderColor = '#ef4444';
                    el.focus();
                }
            }
            UI.showToast(msg, "error");
        };

        const dateInput = document.getElementById('bk-date');
        const durInput = document.getElementById('bk-duration');

        if (!dateInput || !dateInput.value.trim()) {
            return showError("Move-in Date is a mandatory field. Please select your move-in date.", 'bk-date');
        }
        if (!durInput || !durInput.value || durInput.value === '') {
            return showError("Duration is a mandatory field. Please select your stay duration.", 'bk-duration');
        }

        const bookingFor = State.data.bookingFor || 'self';
        let guestName = State.data.currentUser ? State.data.currentUser.name : 'Guest User';
        let guestEmail = State.data.currentUser ? (State.data.currentUser.email || '') : '';
        let guestPhone = State.data.currentUser ? (State.data.currentUser.phone || '') : '';

        if (bookingFor === 'friend') {
            const fName = document.getElementById('bk-friend-name')?.value?.trim();
            const fEmail = document.getElementById('bk-friend-email')?.value?.trim();
            const fPhone = document.getElementById('bk-friend-phone')?.value?.trim();

            if (!fName) {
                return showError("Guest / Friend's full name is required when booking for a friend.", 'bk-friend-name');
            }
            if (!fEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fEmail)) {
                return showError("Please enter a valid email address for the guest / friend.", 'bk-friend-email');
            }
            if (!fPhone || !/^\+?[0-9\s\-]{10,15}$/.test(fPhone)) {
                return showError("Please enter a valid 10-15 digit phone number for the guest / friend.", 'bk-friend-phone');
            }
            guestName = fName;
            guestEmail = fEmail;
            guestPhone = fPhone;
        }

        // Check duplicate active/reserved bookings
        const duplicate = (State.data.bookings || []).find(b => b && b.pg === targetPG && b.room === roomType && (b.status === 'approved' || b.status === 'confirmed'));
        if (duplicate) {
            return showError("You already have an active booking for " + roomType + " at " + targetPG + ".");
        }

        const userId = State.data.currentUser ? (State.data.currentUser.email || State.data.currentUser.name) : 'guest';
        const bookingId = 'BK-' + Date.now().toString().slice(-6);

        // Try reserving a seat for 15 minutes
        const res = State.RoomOccupancy.reserveSeat(roomType, userId, bookingId);
        if (!res.success) {
            return BookingLogic.showReservationBlockedModal(roomType, res);
        }

        UI.showLoader();
        setTimeout(() => {
            const reqDate = new Date(dateInput.value).toLocaleDateString('en-GB');
            const reqDur = durInput.value;
            const months = parseInt(reqDur) || 1;
            const { rent, deposit } = BookingLogic.getRentAndDeposit(roomType);
            const totalRent = rent;

            const newBk = { 
                id: bookingId,
                roomId: res.roomId,
                pg: targetPG, 
                location: State.data.selectedLocation || 'Koramangala, Bangalore',
                room: roomType,
                roomNumber: Math.floor(Math.random() * 400) + 101, // Random room number (e.g., 101-500)
                roommate: State.data.selectedRm, 
                rent: totalRent, 
                deposit: deposit,
                date: reqDate,
                duration: reqDur,
                user: State.data.currentUser,
                bookedBy: State.data.currentUser ? State.data.currentUser.name : 'Guest User',
                bookingFor: bookingFor,
                guestName: guestName,
                guestEmail: guestEmail,
                guestPhone: guestPhone,
                img: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500',
                status: 'approved',
                reservationExpiresAt: res.expiresAt
            };
            State.data.bookings.unshift(newBk);
            State.data.activeBooking = newBk;
            State.save();
            
            UI.hideLoader();
            UI.showToast("Room Seat Reserved for 15 Minutes!", "success");
            Navigation.navigate('booking-details');
        }, 800);
    },

   // 5. RENDER PENDING LIST (Updated to handle Confirmed/Paid status)
    renderPending() {
        const cont = document.getElementById('pending-list');
        if (!cont) return;

        const activeList = State.data.bookings.filter(b => b && b.status !== 'cancelled');
        if (activeList.length === 0) {
            cont.innerHTML = `<p class="text-gray">You have no active requests.</p>`;
            return;
        }

        cont.innerHTML = activeList.map(b => `
            <div class="modern-card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column; cursor: pointer;" onclick="BookingLogic.viewDetails('${b.id}')">
                <div style="position: relative;">
                    <img src="${b.img || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500'}" style="width: 100%; height: 180px; object-fit: cover;">
                    <div style="position: absolute; top: 16px; right: 16px; padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; 
                        background: ${b.status === 'confirmed' ? '#dcfce7' : b.status === 'approved' ? '#dbeafe' : '#fef3c7'}; 
                        color: ${b.status === 'confirmed' ? '#15803d' : b.status === 'approved' ? '#1e40af' : '#b45309'}; 
                        box-shadow: var(--shadow-sm);">
                        ${b.status}
                    </div>
                </div>
                <div style="padding: 24px; display: flex; flex-direction: column; flex: 1;">
                    <h3 style="font-size: 20px; font-weight: 800; margin-bottom: 4px;">${b.pg}</h3>
                    <p style="color: var(--text-gray); font-size: 13px; margin-bottom: 24px;">📍 ${b.location || 'Koramangala, Bangalore'}</p>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px; align-items: center;">
                        <span style="color: var(--text-gray); font-size: 13px;">Room Type:</span>
                        <strong style="font-size: 13px; text-align: right;">${b.room}</strong>
                        
                        <span style="color: var(--text-gray); font-size: 13px;">Monthly Rent:</span>
                        <strong style="color: var(--primary); font-size: 14px; text-align: right;">₹${(b.rent || 8500).toLocaleString()}</strong>
                    </div>
                    
                    <div style="margin-top: auto; display: flex; flex-direction: column; gap: 8px;">
                        ${b.status === 'confirmed' 
                            ? `<div style="background: #f0fdf4; color: #16a34a; padding: 16px; border-radius: 12px; text-align: center; font-size: 14px; font-weight: 700; border: 1px solid #bbf7d0;">✓ Paid & Confirmed</div>`
                            : b.status === 'approved' 
                                ? `<button class="btn btn-primary btn-full" style="padding: 16px; font-size: 15px;" onclick="event.stopPropagation(); BookingLogic.initPaymentUI('${b.id}')">Proceed to Payment</button>
                                   <button class="btn-full" style="padding: 12px; font-size: 13px; background: transparent; color: var(--text-gray); border: none; cursor: pointer; font-weight: 600;" onclick="event.stopPropagation(); BookingLogic.deleteBooking('${b.id}')">Cancel Request</button>`
                                : `<div style="background: var(--bg-main); color: var(--primary); padding: 16px; border-radius: 12px; text-align: center; font-size: 14px; font-weight: 700;">● Pending Admin Approval</div>
                                   <button class="btn-full" style="padding: 12px; font-size: 13px; background: transparent; color: var(--text-gray); border: none; cursor: pointer; font-weight: 600;" onclick="event.stopPropagation(); BookingLogic.deleteBooking('${b.id}')">Cancel Request</button>`
                        }
                    </div>
                </div>
            </div>
        `).join('');
    },

    // 6. DEV TOOL: Quick approve
    devApproveAll() {
        State.data.bookings.forEach(b => {
            if(b.status === 'pending') b.status = 'approved';
        });
        State.save();
        this.renderPending();
        UI.showToast("All requests approved for testing!", "success");
    },

    // 6b. User action to delete booking instance
    deleteBooking(id) {
        if (!confirm("Are you sure you want to cancel and delete this booking request?")) return;
        
        State.data.bookings = State.data.bookings.filter(b => b.id !== id && b.status !== 'cancelled');
        
        // Update active booking if deleted
        if (State.data.activeBooking && State.data.activeBooking.id === id) {
            State.data.activeBooking = null;
        }

        State.save();
        this.renderPending();
        if (typeof this.updateRoomAvailabilityUI === 'function') {
            this.updateRoomAvailabilityUI();
        }
        UI.showToast("Booking request cancelled successfully.", "info");
    },

    // 7. VIEW SPECIFIC BOOKING DETAILS
    viewDetails(id) {
        const booking = State.data.bookings.find(x => x.id === id);
        if (!booking) return;

        State.data.activeBooking = booking;
        State.save();

        if (booking.status === 'confirmed') {
            Navigation.navigate('booking-confirmed');
        } else {
            Navigation.navigate('booking-details');
        }
    },

    // 8. RENDER BOOKING DETAILS PAGE
    renderBookingDetails() {
        const b = State.data.activeBooking || (State.data.bookings && State.data.bookings.length > 0 ? State.data.bookings[0] : null);
        if (!b) return Navigation.navigate('pending');

        // Robust DOM selection with fallbacks
        document.querySelectorAll('.dyn-pg-name').forEach(el => el.textContent = b.pg);
        document.querySelectorAll('.dyn-booking-id').forEach(el => el.textContent = b.id || 'BK-XXXXXX');
        document.querySelectorAll('.dyn-location').forEach(el => el.textContent = '📍 ' + (b.location || 'Koramangala, Bangalore'));
        document.querySelectorAll('.dyn-room').forEach(el => el.textContent = b.room);
        document.querySelectorAll('.dyn-date').forEach(el => el.textContent = b.date || '20 March 2026');
        
        const rent = b.rent || 8500;
        const deposit = b.deposit || 3500;
        const fee = 500;
        
        document.querySelectorAll('.dyn-rent').forEach(el => el.textContent = `₹${rent.toLocaleString()}`);
        document.querySelectorAll('.dyn-deposit').forEach(el => el.textContent = `₹${deposit.toLocaleString()}`);
        document.querySelectorAll('.dyn-total').forEach(el => el.textContent = `₹${(rent + deposit + fee).toLocaleString()}`);
        
        
        const rmBox = document.getElementById('details-rm-box');
        const rmName = document.getElementById('details-rm-name');
        if (b.roommate && rmBox) {
            rmBox.innerHTML = `
                <div style="display: flex; gap: 16px; align-items: center;">
                    <img src="${b.roommate.img}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <strong style="font-size: 15px;">${b.roommate.name}</strong>
                        <p style="font-size: 12px; color: var(--text-gray);">${b.roommate.job || 'Professional'}</p>
                    </div>
                </div>
            `;
            if (rmName) rmName.textContent = b.roommate.name;
        } else if (rmBox) {
            rmBox.innerHTML = `<p class="text-gray text-sm">No roommate selected.</p>`;
            if (rmName) rmName.textContent = "None";
        }
        
        const statusBox = document.getElementById('booking-details-status');
        if (statusBox) {
            if (b.status === 'confirmed') {
                statusBox.innerHTML = `
                    <div style="background: var(--success-light); border: 1px solid var(--success); border-radius: 8px; padding: 12px; margin-bottom: 24px; text-align: center;">
                        <strong style="color: var(--success); font-size: 14px;">✓ Booking Confirmed & Paid</strong>
                    </div>
                `;
            } else if (b.status === 'approved') {
                statusBox.innerHTML = `
                    <div style="background: #eff6ff; border: 1px solid #3b82f6; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center;">
                        <strong style="color: #1e3a8a; font-size: 15px; display: block; margin-bottom: 6px;">✓ Your Room Seat is RESERVED</strong>
                        <p style="color: #1e40af; font-size: 13px; margin-bottom: 12px;">Please complete payment within 15 minutes to guarantee your room.</p>
                        <div id="res-timer-${b.id}" style="font-size: 26px; font-weight: 800; color: #dc2626; background: white; padding: 8px 20px; border-radius: 8px; display: inline-block; border: 2px solid #fecaca; margin-bottom: 16px; font-family: monospace;">
                            15:00
                        </div>
                        <div>
                            <button class="btn btn-primary btn-full" onclick="BookingLogic.initPaymentUI('${b.id}')" style="padding: 14px; font-size: 15px;">Proceed to Payment</button>
                        </div>
                    </div>
                `;
                BookingLogic.startReservationTimer(b);
            } else {
                statusBox.innerHTML = `
                    <div style="background: #fef3c7; border: 1px solid #b45309; border-radius: 8px; padding: 12px; margin-bottom: 24px; text-align: center;">
                        <strong style="color: #b45309; font-size: 14px;">⏳ Pending Admin Verification</strong>
                    </div>
                    <div style="background: var(--bg-main); padding: 16px; border-radius: 12px; margin-bottom: 24px;">
                        <p class="text-gray" style="font-size: 12px; line-height: 1.5;">Your request is under review. You'll be notified once verified.</p>
                    </div>
                    <button class="btn btn-full" style="background: #f1f5f9; color: var(--text-light); cursor: not-allowed;" disabled>Proceed to Payment</button>
                `;
            }
        }
    },

    startReservationTimer(b) {
        if (BookingLogic._timerInterval) clearInterval(BookingLogic._timerInterval);
        const expiresAt = b.reservationExpiresAt || (Date.now() + 15 * 60 * 1000);
        const update = () => {
            const el = document.getElementById('res-timer-' + b.id);
            if (!el) {
                if (BookingLogic._timerInterval) clearInterval(BookingLogic._timerInterval);
                return;
            }
            const diff = Math.max(0, expiresAt - Date.now());
            if (diff <= 0) {
                if (BookingLogic._timerInterval) clearInterval(BookingLogic._timerInterval);
                el.textContent = "00:00";
                el.style.color = "#991b1b";
                UI.showToast("Your 15-minute room reservation has expired.", "error");
                b.status = 'expired';
                State.RoomOccupancy.releaseSeat(b.room, b.id);
                State.save();
                return;
            }
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            el.textContent = (mins < 10 ? '0' : '') + mins + ":" + (secs < 10 ? '0' : '') + secs;
        };
        update();
        BookingLogic._timerInterval = setInterval(update, 1000);
    },

    showReservationBlockedModal(roomType, res) {
        const existingModal = document.getElementById('reserved-blocked-modal');
        if (existingModal) existingModal.remove();

        const remainingMs = res ? Math.max(0, (res.expiresAt || Date.now() + 15 * 60 * 1000) - Date.now()) : 15 * 60 * 1000;
        const rmMins = Math.floor(remainingMs / 60000);
        const rmSecs = Math.floor((remainingMs % 60000) / 1000);
        const timerStr = `${rmMins} min ${rmSecs} sec`;
        const waitCount = res && res.waitingCount ? res.waitingCount : 0;

        const overlay = document.createElement('div');
        overlay.id = 'reserved-blocked-modal';
        overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px;';
        overlay.innerHTML = `
            <div class="modern-card" style="width: 100%; max-width: 440px; padding: 28px; background: white; border-radius: 16px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);">
                <div style="width: 60px; height: 60px; background: #fff1f2; color: #e11d48; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 32px;">⏳</div>
                <h3 style="font-size: 20px; font-weight: 800; margin-bottom: 8px; color: var(--text-dark);">Room Temporarily Reserved</h3>
                <p style="color: var(--text-gray); font-size: 14px; margin-bottom: 16px; line-height: 1.5;">
                    The last available <strong>${roomType}</strong> seat is currently reserved by another user completing payment.
                </p>
                <div style="background: #fff1f2; border: 1px solid #fecdd3; padding: 16px; border-radius: 12px; margin-bottom: 24px;">
                    <span style="font-size: 12px; color: #9f1239; font-weight: 700; display: block; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Reservation Expires In</span>
                    <div style="font-size: 24px; font-weight: 800; color: #e11d48; font-family: monospace;">${timerStr}</div>
                    <div style="font-size: 12px; color: #881337; margin-top: 8px;">Waiting list count: <strong>${waitCount}</strong> person(s) in line</div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button class="btn btn-primary btn-full" onclick="BookingLogic.handleJoinWaitingList('${roomType}')" style="padding: 14px; font-size: 15px;">
                        <span class="material-icons-outlined" style="font-size:20px; vertical-align:middle; margin-right:4px;">group_add</span> Join Waiting List
                    </button>
                    <button class="btn btn-full" onclick="BookingLogic.closeReservedModal(); Navigation.navigate('landing');" style="background: #f1f5f9; color: var(--text-dark); padding: 12px; font-size: 14px; font-weight: 600;">
                        View Similar Rooms
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    closeReservedModal() {
        const modal = document.getElementById('reserved-blocked-modal');
        if (modal) modal.remove();
    },

    handleJoinWaitingList(roomType) {
        BookingLogic.closeReservedModal();
        const userName = State.data.currentUser ? State.data.currentUser.name : 'Guest User';
        const phone = State.data.currentUser ? State.data.currentUser.phone : '';
        const waitRes = State.RoomOccupancy.joinWaitingList(roomType, userName, phone);
        UI.showToast(`You are #${waitRes.position} on the Waiting List for ${roomType}! We will notify you when a room becomes available.`, "success");
    },

 // 9. PREPARE PAYMENT GATEWAY (Updated with Security Guard & Navigation)
    initPaymentUI(id) {
       const booking = State.data.bookings.find(x => x.id === id);

        // BLOCK 1: If it's already confirmed/paid, don't let them in
        if (booking && booking.status === 'confirmed') {
            UI.showToast("This booking is already paid and confirmed!", "success");
            return Navigation.navigate('booking-confirmed'); // Redirect to success page instead
        }

        // BLOCK 2: Standard Guard for pending status
        if (!booking || booking.status !== 'approved') {
            UI.showToast("Admin approval is required before payment.", "warning");
            return; 
        }

        // 3. Set this as the active booking and save to local storage
        State.data.activeBooking = booking;
        State.save();
        
        // 4. NAVIGATE: Move the user to the payment gateway page
        Navigation.navigate('payment-gateway');

        // 5. RENDER: Fill the payment page with data
        // Using a small timeout (100ms) to ensure the new HTML has loaded 
        // into the DOM before we try to find the IDs below.
        setTimeout(() => {
            const b = State.data.activeBooking;
            if (!b) return;

            // Select elements from payment-gateway.html
            const elPg = document.getElementById('pay-pg');
            const elRoom = document.getElementById('pay-room');
            const elRm = document.getElementById('pay-rm');
            const elDate = document.getElementById('pay-date');
            const elRent = document.getElementById('pay-rent');
            const elDeposit = document.getElementById('pay-deposit');
            const elTotal = document.getElementById('pay-total');

            // Safely update text content
            if(elPg) elPg.textContent = b.pg;
            if(elRoom) elRoom.textContent = b.room;
            if(elRm) elRm.textContent = b.roommate ? b.roommate.name : 'None';
            if(elDate) elDate.textContent = b.date || '20 March 2026';
            if(elRent) elRent.textContent = `₹${(b.rent || 8500).toLocaleString()}`;
            if(elDeposit) elDeposit.textContent = `₹${(b.deposit || 3500).toLocaleString()}`;
            
            // Calculate and display Total (Rent + Deposit + 500 Service Fee)
            const total = (b.rent || 8500) + (b.deposit || 3500) + 500;
            if(elTotal) elTotal.textContent = `₹${total.toLocaleString()}`;

            // Set default payment method
            State.data.selectedPaymentMethod = 'upi';
            State.save();
        }, 100);
    },

    // 10. SELECT PAYMENT METHOD (Accordion)
    selectPayment(method) {
        State.data.selectedPaymentMethod = method;
        
        document.querySelectorAll('.pay-method-box').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.pay-form').forEach(el => el.classList.add('hidden'));

        const methodBox = document.getElementById('method-' + method);
        const formBox = document.getElementById('form-' + method);
        
        if (methodBox) methodBox.classList.add('active');
        if (formBox) formBox.classList.remove('hidden');
    },

    // 11. PROCESS PAYMENT (With Strict Validation)
    processPayment() {
        const method = State.data.selectedPaymentMethod || 'upi';
        let valid = false;
        let errorMsg = '';

        if (method === 'upi') {
            const upiId = document.getElementById('upi-id') ? document.getElementById('upi-id').value : '';
            if (!upiId || !upiId.includes('@')) errorMsg = 'Please enter a valid UPI ID (e.g., name@upi)';
            else valid = true;
        } 
        else if (method === 'card') {
            const num = document.getElementById('card-num') ? document.getElementById('card-num').value : '';
            const exp = document.getElementById('card-exp') ? document.getElementById('card-exp').value : '';
            const cvv = document.getElementById('card-cvv') ? document.getElementById('card-cvv').value : '';
            
            if (num.length < 16) errorMsg = 'Please enter a valid 16-digit card number';
            else if (!exp.includes('/')) errorMsg = 'Please enter Expiry Date as MM/YY';
            else if (cvv.length < 3) errorMsg = 'Please enter a valid 3-digit CVV';
            else valid = true;
        } 
        else if (method === 'net') {
            const bank = document.getElementById('net-bank') ? document.getElementById('net-bank').value : '';
            if (!bank) errorMsg = 'Please select a bank from the list';
            else valid = true;
        }

        if (!valid) {
            return UI.showToast(errorMsg, 'error');
        }

        const btn = document.getElementById('pay-btn');
        if (btn) {
            btn.innerHTML = `<span style="display:inline-block; animation: spin 1s linear infinite; margin-right: 8px;">⟳</span> Processing...`;
            btn.style.opacity = '0.8';
            btn.style.pointerEvents = 'none';
        }

        setTimeout(() => {
            const b = State.data.activeBooking;
            if (!b) return Navigation.navigate('landing');

            const total = (b.rent || 8500) + (b.deposit || 3500) + 500;
            const txnId = 'TXN-'+Date.now().toString().slice(-6);
            
            State.data.transactions.unshift({
                id: txnId,
                desc: 'Booking Payment: ' + b.pg,
                amount: '₹'+total.toLocaleString(),
                status: 'Success',
                date: new Date().toLocaleDateString()
            });
            
            const idx = State.data.bookings.findIndex(x => x.id === b.id);
            if (idx > -1) {
                State.data.bookings[idx].status = 'confirmed';
                State.data.bookings[idx].txnId = txnId;
                State.RoomOccupancy.confirmSeat(b.room, b.id);
            }
            
            State.save();
            
            // Save to global_payments for Admin dashboard (status: pending so admin verifies and generates credentials)
            let globalPayments = JSON.parse(localStorage.getItem('global_payments') || '[]');
            const finalTenantName = b.bookingFor === 'friend' ? b.guestName : (State.data.currentUser ? State.data.currentUser.name : 'Guest User');
            globalPayments.push({
                id: Date.now() + Math.floor(Math.random() * 1000),
                tenant: finalTenantName,
                property: b.pg || 'Unknown PG',
                room: b.room || '-',
                amount: total,
                method: method === 'upi' ? 'UPI' : (method === 'card' ? 'Card' : 'Net Banking'),
                transactionId: txnId,
                paidDate: new Date().toLocaleDateString('en-CA'),
                status: 'pending',
                clearance: 'Pending'
            });
            localStorage.setItem('global_payments', JSON.stringify(globalPayments));

            // Notify Admin & Owner
            let crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
            crossNotifs.push({
                id: Date.now().toString(),
                type: 'payment',
                target: 'admin',
                message: `New Payment TXN ${txnId} from ${State.data.currentUser ? State.data.currentUser.name : 'Guest User'} for ${b.pg}. Ready for verification and tenant credential generation.`,
                time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                read: false
            });
            crossNotifs.push({
                id: Date.now() + 1,
                title: 'New Guest Booking Paid',
                message: `${State.data.currentUser ? State.data.currentUser.name : 'A Guest'} has paid ₹${total.toLocaleString()} and confirmed booking for ${b.pg}.`,
                type: 'update',
                priority: 'important',
                targetRole: 'owner',
                by: 'Guest',
                sentAt: new Date().toLocaleString()
            });

            if (b.roommate && b.roommate.name) {
                crossNotifs.push({
                    id: Date.now() + 2,
                    title: 'New Roommate Alert',
                    message: `${b.guestName || (State.data.currentUser ? State.data.currentUser.name : 'A new guest')} is joining your room (${b.room}) at ${b.pg}!`,
                    type: 'announcement',
                    priority: 'routine',
                    targetRole: 'tenant', // Target specifically the tenant dashboard
                    targetUser: b.roommate.name, // specifically targeted user
                    by: 'System',
                    sentAt: new Date().toLocaleString()
                });
            }

            localStorage.setItem('cross_notifications', JSON.stringify(crossNotifs));
            
            Navigation.navigate('booking-confirmed');
        }, 2500);
    },

    // 12. CONFIRMED PAGE
    renderConfirmed() {
        const b = State.data.activeBooking;
        if (!b) return Navigation.navigate('landing');

        const elId = document.getElementById('conf-id');
        const elTxn = document.getElementById('conf-txn');
        const elPg = document.getElementById('conf-pg');
        const elPgLoc = document.getElementById('conf-pg-loc');
        const elRoom = document.getElementById('conf-room');
        const elDate = document.getElementById('conf-date');
        
        const elUserName = document.getElementById('conf-user-name');
        const elUserEmail = document.getElementById('conf-user-email');
        const elUserPhone = document.getElementById('conf-user-phone');
        
        const elRent = document.getElementById('conf-rent');
        const elDeposit = document.getElementById('conf-deposit');
        const elTotal = document.getElementById('conf-total');

        if(elId) elId.textContent = b.id || 'BK-12345';
        if(elTxn) elTxn.textContent = b.txnId || ('TXN-' + Date.now().toString().slice(-6));
        
        if(elPg) elPg.textContent = b.pg;
        if(elPgLoc) elPgLoc.textContent = b.location || 'Koramangala, Bangalore';
        if(elRoom) elRoom.textContent = b.room + (b.roomNumber ? ` (Room #${b.roomNumber})` : '');
        if(elDate) elDate.textContent = b.date || '20 March 2026';
        
        if(elUserName) elUserName.textContent = b.guestName || 'Guest User';
        if(elUserEmail) elUserEmail.textContent = b.guestEmail || 'user@example.com';
        if(elUserPhone) elUserPhone.textContent = b.guestPhone || 'Not Provided';

        const rent = b.rent || 8500;
        const deposit = b.deposit || 3500;
        const fee = 500;
        const total = rent + deposit + fee;

        if(elRent) elRent.textContent = `₹${rent.toLocaleString()}`;
        if(elDeposit) elDeposit.textContent = `₹${deposit.toLocaleString()}`;
        if(elTotal) elTotal.textContent = `₹${total.toLocaleString()}`;

        const rmBox = document.getElementById('conf-rm-box');
        if (b.room.toLowerCase().includes('single')) {
            if (rmBox) rmBox.innerHTML = `<p class="text-gray mt-16" style="padding: 12px; background: var(--bg-main); border-radius: 8px;">Single Room selected. Private occupancy.</p>`;
        } else if (b.roommate && rmBox) {
            rmBox.innerHTML = `
                <div style="display: flex; gap: 16px; align-items: flex-start; margin-top: 16px;">
                    <img src="${b.roommate.img}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <strong style="font-size: 15px;">${b.roommate.name}</strong>
                        <p style="font-size: 12px; color: var(--text-gray);">${b.roommate.age || 24} years, ${b.roommate.job || 'Professional'}</p>
                        <p style="font-size: 13px; color: var(--primary); margin-top: 4px; font-weight: 600;">📞 +91 98765 43210</p>
                        <p style="font-size: 13px; color: var(--primary); font-weight: 600;">✉️ ${b.roommate.name.split(' ')[0].toLowerCase()}@example.com</p>
                    </div>
                </div>
            `;
        } else if (rmBox) {
            rmBox.innerHTML = `<p class="text-gray mt-16">You have opted for a private room or will be assigned a roommate by the admin.</p>`;
        }
    },

    // 13. TRANSACTIONS
    renderTxns() {
        const tb = document.getElementById('txn-body');
        if(!tb) return;
        tb.innerHTML = State.data.transactions.map(t => `
            <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:16px;">${t.date}</td>
                <td style="padding:16px;"><strong>${t.desc}</strong><br><small style="color:var(--text-light)">ID: ${t.id}</small></td>
                <td style="padding:16px;"><strong>${t.amount}</strong></td>
                <td style="padding:16px;"><span class="badge badge-success">Success</span></td>
            </tr>
        `).join('');
    }
};

