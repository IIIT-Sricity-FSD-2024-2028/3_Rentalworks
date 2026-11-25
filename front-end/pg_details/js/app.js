document.addEventListener('DOMContentLoaded', () => {
    State.init();
    Auth.init();
    // Wire up navbar anchor scroll links immediately on load
    setTimeout(() => { Navigation.initScrollLinks(); }, 200);
});