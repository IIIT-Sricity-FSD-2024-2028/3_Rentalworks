const RoommateLogic = {
    // 1. Render Match Engine
    render() {
        const container = document.getElementById('match-display');
        if (!container) return;
        const rm = State.data.roommates[State.data.currentRmIndex];
        const tags = rm.tags.map((t, i) => `<span class="rm-tag ${i%2!==0?'alt':''}">${t}</span>`).join('');
        
        container.innerHTML = `
            <div class="match-card">
                <div style="position:relative;">
                    <img src="${rm.img}" class="rm-img">
                    <div style="position:absolute; top:20px; right:20px; background:var(--success); color:white; padding:6px 16px; border-radius:20px; font-weight:800;">${rm.match}% Match</div>
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
        State.data.currentRmIndex = (State.data.currentRmIndex + 1) % State.data.roommates.length;
        this.render();
    },
    
    // 3. Select a roommate and proceed
    select(id) {
        State.data.selectedRm = State.data.roommates.find(r => r.id === id);
        State.save();
        Navigation.navigate('booking-review');
    },

    // 4. NEW: Handle radio button clicks in Preferences
    selectRadio(element, groupClass) {
        document.querySelectorAll('.' + groupClass).forEach(el => el.classList.remove('selected'));
        element.classList.add('selected');
    }
};