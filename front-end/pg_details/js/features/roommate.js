const RoommateLogic = {
    // 0. Initialize Roommate Intro Page with Smart Matching & Manual Roommate Selection
    getExistingTenantsForPG(pgName) {
        const targetPG = pgName || State.data.selectedPG || 'Sunrise PG Residency';
        
        // Base known residents in the project (from backend USERS and LOGIN_MOCK)
        const baseResidents = [
            { id: 101, name: 'Amit Sharma', pg: 'Sunrise PG Residency', room: 'Room 101', roomNum: '101', sharing: 'Double Sharing', totalCapacity: 2, info: 'Software Engineer • 24 yrs', age: 24, job: 'Software Engineer', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500' },
            { id: 102, name: 'Demo Tenant', pg: 'Sunrise PG Residency', room: 'Room 201', roomNum: '201', sharing: 'Double Sharing', totalCapacity: 2, info: 'Product Designer • 25 yrs', age: 25, job: 'Product Designer', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500' },
            { id: 103, name: 'Rahul Singh', pg: 'Sunrise PG Residency', room: 'Room 202', roomNum: '202', sharing: 'Triple Sharing', totalCapacity: 3, info: 'Data Scientist • 26 yrs', age: 26, job: 'Data Scientist', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500' },
            { id: 104, name: 'Vikram Desai', pg: 'Sunrise PG Residency', room: 'Room 305', roomNum: '305', sharing: 'Quad Sharing', totalCapacity: 4, info: 'Financial Analyst • 25 yrs', age: 25, job: 'Financial Analyst', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500' },
            { id: 105, name: 'Rohan Kumar', pg: 'Green Valley PG', room: 'Room 101', roomNum: '101', sharing: 'Double Sharing', totalCapacity: 2, info: 'Marketing Lead • 27 yrs', age: 27, job: 'Marketing Lead', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500' },
            { id: 106, name: 'Anita Verma', pg: 'Sunrise Heights', room: 'Room 201', roomNum: '201', sharing: 'Double Sharing', totalCapacity: 2, info: 'Financial Analyst • 25 yrs', age: 25, job: 'Financial Analyst', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500' }
        ];

        let allResidents = [...baseResidents];
        try {
            const adminUsers = JSON.parse(localStorage.getItem('admin_users') || "[]");
            adminUsers.forEach(u => {
                if (u && u.property === targetPG && !allResidents.some(r => r.name === u.name)) {
                    allResidents.push({
                        id: u.id || Date.now() + Math.random(),
                        name: u.name,
                        pg: u.property,
                        room: u.room ? ('Room ' + u.room) : 'Room 102',
                        roomNum: u.room || '102',
                        sharing: 'Double Sharing',
                        totalCapacity: 2,
                        info: (u.role || 'Tenant') + ' • resident',
                        age: 25,
                        job: u.role || 'Professional',
                        img: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500'
                    });
                }
            });
        } catch (e) {}

        const pgResidents = allResidents.filter(r => r.pg === targetPG);

        // Compute room occupancy (count residents + active bookings in localStorage for each room)
        const roomOccupancy = {};
        pgResidents.forEach(r => {
            roomOccupancy[r.roomNum] = (roomOccupancy[r.roomNum] || 0) + 1;
        });

        // Add bookings from localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sunrise_pg_state_')) {
                try {
                    const st = JSON.parse(localStorage.getItem(key));
                    if (st && Array.isArray(st.bookings)) {
                        st.bookings.forEach(b => {
                            if (b && b.pg === targetPG && b.status !== 'cancelled' && b.roomNumber) {
                                roomOccupancy[b.roomNumber] = (roomOccupancy[b.roomNumber] || 0) + 1;
                            }
                        });
                    }
                } catch (e) {}
            }
        }

        // Return resident profiles with calculated occupancy and available seats
        return pgResidents.map(r => {
            const occupied = roomOccupancy[r.roomNum] || 1;
            const availableSeats = Math.max(0, r.totalCapacity - occupied);
            return {
                ...r,
                occupiedSeats: occupied,
                availableSeats: availableSeats
            };
        }).filter(r => r.availableSeats > 0);
    },

    // 0. Initialize Roommate Intro Page with Smart Matching & Manual Roommate Selection
    initIntroPage() {
        const roomType = State.data.activeRoomType || 'Double Sharing';
        if ((roomType || '').toLowerCase().includes('single')) {
            Navigation.navigate('booking-review');
            return;
        }

        const aiContainer = document.getElementById('ai-match-container');
        const alertBox = document.getElementById('no-match-alert');

        const availableTenants = RoommateLogic.getExistingTenantsForPG(State.data.selectedPG);

        // Filter existing roommates to strictly match the selected sharing type
        const activeType = (roomType || '').trim().toLowerCase();
        const matchingTenants = availableTenants.filter(t => {
            const tSharing = (t.sharing || '').trim().toLowerCase();
            if (activeType === tSharing) return true;
            if (activeType.includes('double') && tSharing.includes('double')) return true;
            if (activeType.includes('triple') && tSharing.includes('triple')) return true;
            if (activeType.includes('quad') && tSharing.includes('quad')) return true;
            return false;
        });

        // Check if compatible AI profiles exist in State.data.roommates
        const aiRoommates = State.data.roommates || [];
        const compatibleExist = aiRoommates.length > 0;
        if (aiContainer && alertBox) {
            if (!compatibleExist) {
                aiContainer.style.display = 'none';
                alertBox.style.display = 'block';
            } else {
                aiContainer.style.display = 'block';
                alertBox.style.display = 'none';
            }
        }

        const cont = document.getElementById('manual-roommate-list');
        if (cont) {
            if (matchingTenants.length === 0) {
                cont.innerHTML = `<p style="color: var(--text-gray); font-size: 13px; padding: 16px; text-align: center;">No existing roommate rooms currently have vacant sharing capacity for ${roomType}.</p>`;
            } else {
                cont.innerHTML = matchingTenants.map(t => `
                    <div class="modern-card" style="padding: 16px; border: 1px solid var(--border); border-radius: 12px; display: flex; justify-content: space-between; align-items: center; background: white; box-shadow: var(--shadow-sm);">
                        <div style="display: flex; gap: 12px; align-items: center;">
                            <img src="${t.img}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">
                            <div>
                                <strong style="font-size: 15px; color: var(--text-dark); display: block;">${t.name}</strong>
                                <div style="font-size: 13px; color: var(--text-gray); margin: 2px 0;">
                                    <span style="font-weight: 600; color: var(--text-dark);">${t.room}</span> • <span>${t.sharing}</span>
                                </div>
                                <div style="font-size: 12px; color: var(--text-gray); margin: 2px 0;">
                                    ${t.occupiedSeats} / ${t.totalCapacity} Occupied • <span style="color: #15803d; font-weight: 700;">${t.availableSeats} seat${t.availableSeats > 1 ? 's' : ''} available</span>
                                </div>
                                <div style="font-size: 12px; color: var(--text-light); margin-top: 2px;">${t.info}</div>
                            </div>
                        </div>
                        <button class="btn btn-outline" style="padding: 8px 16px; font-size: 13px; font-weight: 600;" onclick="RoommateLogic.selectManualRoommate(${t.id})">Select Roommate</button>
                    </div>
                `).join('');
            }
        }
    },

    // 0b. Select an existing tenant roommate manually
    selectManualRoommate(id) {
        const availableTenants = RoommateLogic.getExistingTenantsForPG(State.data.selectedPG);
        const chosen = availableTenants.find(t => t.id === id);
        if (chosen) {
            State.data.selectedRm = chosen;
            State.data.selectedRoomNumber = chosen.roomNum;
            State.save();
            UI.showToast(`Selected ${chosen.name} in ${chosen.room}`, 'success');
            Navigation.navigate('booking-review');
        }
    },

    // 1. Render Match Engine
    render() {
        const container = document.getElementById('match-display');
        if (!container) return;
        
        // Use filtered roommates if available, otherwise fallback to all
        const roommatesToUse = State.data.filteredRm || State.data.roommates;
        if (!roommatesToUse || roommatesToUse.length === 0) {
            container.innerHTML = `<div style="padding:40px; text-align:center;">No matching roommates found based on your preferences.</div>`;
            return;
        }

        const rm = roommatesToUse[State.data.currentRmIndex || 0];
        const tags = rm.tags.map((t, i) => `<span class="rm-tag ${i%2!==0?'alt':''}">${t}</span>`).join('');
        
        container.innerHTML = `
            <div class="match-card">
                <div style="position:relative;">
                    <img src="${rm.img}" class="rm-img">
                </div>
                <div>
                    <h2 style="font-size:32px; font-weight:800;">${rm.name}, ${rm.age}</h2>
                    <p style="color:var(--primary); font-weight:700; font-size:18px; margin-bottom:16px;">💼 ${rm.job}</p>
                    <div class="rm-tags">${tags}</div>
                    <p style="color:var(--text-gray); line-height:1.7; margin-bottom:30px;">"${rm.bio}"</p>
                    <div style="display:flex; gap:16px;">
                        <button class="btn btn-outline" style="flex:1;" onclick="RoommateLogic.next()">⏭ Next</button>
                        <button class="btn btn-primary" style="flex:2;" onclick="RoommateLogic.select(${rm.id})">💚 Connect & Book</button>
                    </div>
                </div>
            </div>`;
    },
    
    // 2. Cycle to next roommate
    next() {
        const roommatesToUse = State.data.filteredRm || State.data.roommates;
        if (!roommatesToUse || roommatesToUse.length === 0) return;
        State.data.currentRmIndex = ((State.data.currentRmIndex || 0) + 1) % roommatesToUse.length;
        this.render();
    },
    
    // 3. Select a roommate and proceed
    select(id) {
        const roommatesToUse = State.data.filteredRm || State.data.roommates;
        State.data.selectedRm = roommatesToUse.find(r => r.id === id);
        State.save();
        Navigation.navigate('booking-review');
    },

    // 4. Handle radio button clicks in Preferences
    selectRadio(element, groupClass) {
        document.querySelectorAll('.' + groupClass).forEach(el => el.classList.remove('selected'));
        element.classList.add('selected');
    },

    // 5. NEW: Filter roommates based on preferences and start matching
    startMatching() {
        const sleepEl = document.querySelector('.p-sleep.selected');
        let filtered = State.data.roommates;

        if (sleepEl) {
            const sleepPref = sleepEl.textContent.toLowerCase();
            if (sleepPref.includes('late')) {
                // Filter out early risers
                filtered = filtered.filter(rm => !rm.bio.toLowerCase().includes('early') && !rm.tags.some(t => t.toLowerCase().includes('early')));
            } else if (sleepPref.includes('early')) {
                // Filter out late/night owls
                filtered = filtered.filter(rm => !rm.bio.toLowerCase().includes('late') && !rm.bio.toLowerCase().includes('night owl') && !rm.tags.some(t => t.toLowerCase().includes('night')));
            }
        }

        // Save filtered list to state, fallback to all if filtering removed everyone
        State.data.filteredRm = filtered.length > 0 ? filtered : State.data.roommates;
        State.data.currentRmIndex = 0;
        Navigation.navigate('matches');
    }
};