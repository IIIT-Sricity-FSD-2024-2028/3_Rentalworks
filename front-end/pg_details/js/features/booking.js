const BookingLogic = {
    // 1. GATEKEEPER: Forces login before booking
    startBooking(roomType) {
        if (!State.data.currentUser) {
            UI.showToast("Please sign in to book a room", "warning");
            setTimeout(() => {
                window.location.href = '../login/login/login.html';
            }, 1000);
            return;
        }

        // Prevent redundant bookings early in the workflow
        const targetPG = 'Sunrise PG Residency';
        const hasExisting = State.data.bookings.find(b => b.pg === targetPG && ['pending', 'approved', 'confirmed'].includes(b.status));
        if (hasExisting) {
            let msg = `You already have an active request for ${targetPG}`;
            if (hasExisting.status === 'confirmed') {
                msg = `You have already successfully booked ${targetPG}. Enjoy your stay!`;
            }
            UI.showToast(msg, 'warning');
            return Navigation.navigate('pending');
        }

        State.data.activeRoomType = roomType;
        State.save();
        Navigation.navigate('roommate-intro');
    },

    // 2. BYPASS AI MATCHING
    skipMatching() {
        State.data.selectedRm = null; // Clears any selected roommate
        State.save();
        Navigation.navigate('booking-review');
    },

    // 3. RENDER INITIAL REVIEW (Before sending to admin)
    renderReview() {
        const rm = State.data.selectedRm;
        const reviewRmBox = document.getElementById('review-rm-box');
        const summaryRmBox = document.getElementById('summary-rm-name');

        if(rm && reviewRmBox) {
            reviewRmBox.innerHTML = `
                <div style="display: flex; gap: 16px; align-items: center;">
                    <img src="${rm.img}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <strong style="font-size: 16px;">${rm.name} <span style="color: var(--text-gray); font-weight: 400; font-size: 14px;">${rm.age}</span></strong>
                        <p style="font-size: 13px; color: var(--text-gray); margin-top: 2px;">${rm.job}</p>
                    </div>
                </div>
            `;
            if (summaryRmBox) summaryRmBox.textContent = rm.name;
        } else if (reviewRmBox) {
            reviewRmBox.innerHTML = `<p style="color: var(--text-gray); font-size: 14px;">No roommate selected. One will be assigned upon arrival.</p>`;
            if (summaryRmBox) summaryRmBox.textContent = "None";
        }
    },

    // 4. SUBMIT TO ADMIN (With Validation to prevent duplicates)
    submitRequest() {
        const targetPG = 'Sunrise PG Residency';
        const hasExisting = State.data.bookings.find(b => b.pg === targetPG && ['pending', 'approved', 'confirmed'].includes(b.status));
        
        if (hasExisting) {
            UI.showToast(`You already have an active request for ${targetPG}`, 'error');
            return Navigation.navigate('pending');
        }

        UI.showLoader();
        setTimeout(() => {
            const dateInput = document.getElementById('bk-date');
            const durInput = document.getElementById('bk-duration');
            const reqDate = (dateInput && dateInput.value) ? new Date(dateInput.value).toLocaleDateString('en-GB') : '20 March 2026';
            const reqDur = (durInput && durInput.value) ? durInput.value : '11 Months';

            const newBk = { 
                id: 'BK-' + Date.now().toString().slice(-6), 
                pg: targetPG, 
                location: 'Koramangala, Bangalore',
                room: State.data.activeRoomType || 'Double Sharing',
                roommate: State.data.selectedRm, 
                rent: 10000, 
                deposit: 5000,
                date: reqDate,
                duration: reqDur,
                user: State.data.currentUser,
                // Fallback string added to prevent 404 undefined errors
                img: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500',
                status: 'pending' 
            };
            State.data.bookings.unshift(newBk);
            State.data.activeBooking = newBk;
            State.save();
            
            // Push Notification to Admin Dashboard Database (cross_notifications)
            let crossNotifs = [];
            try { crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || "[]"); } catch(e){}
            crossNotifs.push({
                id: Date.now().toString(),
                type: 'booking',
                target: 'admin',
                message: `New Booking Request from ${State.data.currentUser.name} for ${targetPG}`,
                time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                read: false
            });
            localStorage.setItem('cross_notifications', JSON.stringify(crossNotifs));

            UI.hideLoader();
            UI.showToast("Request Submitted to Admin!", "success");
            Navigation.navigate('booking-details');
        }, 1500);
    },

   // 5. RENDER PENDING LIST (Updated to handle Confirmed/Paid status)
    renderPending() {
        const cont = document.getElementById('pending-list');
        if (!cont) return;

        if (State.data.bookings.length === 0) {
            cont.innerHTML = `<p class="text-gray">You have no active requests.</p>`;
            return;
        }

        cont.innerHTML = State.data.bookings.map(b => `
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
        
        State.data.bookings = State.data.bookings.filter(b => b.id !== id);
        
        // Update active booking if deleted
        if (State.data.activeBooking && State.data.activeBooking.id === id) {
            State.data.activeBooking = null;
        }

        State.save();
        this.renderPending();
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
        const b = State.data.activeBooking;
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
                    <div style="background: var(--success-light); border: 1px solid var(--success); border-radius: 8px; padding: 12px; margin-bottom: 24px; text-align: center;">
                        <strong style="color: var(--success); font-size: 14px;">✓ Admin Approved</strong>
                    </div>

                    <div style="background: var(--bg-main); padding: 16px; border-radius: 12px; margin-bottom: 24px;">
                        <strong class="text-success" style="display: block; margin-bottom: 8px; font-size: 14px;">Booking Request Approved</strong>
                        <p class="text-gray" style="font-size: 12px; line-height: 1.5;">Your request is verified. Please proceed to payment to secure your room.</p>
                    </div>

                    <button class="btn btn-primary btn-full" onclick="BookingLogic.initPaymentUI('${b.id}')">Proceed to Payment</button>
                `;
            } else {
                statusBox.innerHTML = `
                    <div style="background: #fef3c7; border: 1px solid #b45309; border-radius: 8px; padding: 12px; margin-bottom: 24px; text-align: center;">
                        <strong style="color: #b45309; font-size: 14px;">⏳ Pending Admin Approval</strong>
                    </div>

                    <div style="background: var(--bg-main); padding: 16px; border-radius: 12px; margin-bottom: 24px;">
                        <p class="text-gray" style="font-size: 12px; line-height: 1.5;">Your request is under review. You'll be able to proceed to payment once the admin approves it.</p>
                    </div>
                    
                    <button class="btn btn-full" style="background: #f1f5f9; color: var(--text-light); cursor: not-allowed;" disabled>Proceed to Payment</button>
                `;
            }
        }
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
            }
            
            State.save();
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
        if(elRoom) elRoom.textContent = b.room;
        if(elDate) elDate.textContent = b.date || '20 March 2026';
        
        const user = State.data.currentUser || {};
        if(elUserName) elUserName.textContent = user.name || 'Guest User';
        if(elUserEmail) elUserEmail.textContent = user.email || 'user@example.com';
        if(elUserPhone) elUserPhone.textContent = user.phone || 'Not Provided';

        const rent = b.rent || 8500;
        const deposit = b.deposit || 3500;
        const fee = 500;
        const total = rent + deposit + fee;

        if(elRent) elRent.textContent = `₹${rent.toLocaleString()}`;
        if(elDeposit) elDeposit.textContent = `₹${deposit.toLocaleString()}`;
        if(elTotal) elTotal.textContent = `₹${total.toLocaleString()}`;

        const rmBox = document.getElementById('conf-rm-box');
        if (b.roommate && rmBox) {
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

