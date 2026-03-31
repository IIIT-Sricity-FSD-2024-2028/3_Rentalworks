const UI = {
  showLoader() { document.getElementById("loader").classList.remove("hidden"); },
  hideLoader() { document.getElementById("loader").classList.add("hidden"); },

  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
  },

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
  },

  showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const borderColors = { success: 'green', error: 'red', info: 'blue' };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `background: white; padding: 12px 18px; margin-top: 10px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-left: 5px solid ${borderColors[type]}; display: flex; gap: 10px; font-weight: 500;`;
    toast.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
  }
};