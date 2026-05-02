const RoommateLogic = {
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