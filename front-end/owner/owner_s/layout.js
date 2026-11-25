// layout.js — re-exports / page-init helper (thin wrapper)
// This file exists so each page can call initPage() cleanly

async function initPage(pageKey, title, subtitle) {
  injectLayout(pageKey, title, subtitle);
}