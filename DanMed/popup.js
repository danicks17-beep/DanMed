const DEFAULT_SETTINGS = {
  masterEnable: true,
  featureTaskTools: true,
  featureHover: true,
  appointmentHighlighting: true,
  locationShortcuts: true,
  taskStaffShortcuts: true,
  staffShortcuts: true,
  providerShortcuts: true,
  payerShortcuts: true,
  faxOptionRenaming: true,
  otcChargeShortcuts: true,
  selfPayOverrides: true
};

document.addEventListener('DOMContentLoaded', () => {
  const ids = Object.keys(DEFAULT_SETTINGS);
  const controls = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
  chrome.storage.local.get(['extensionSettings'], ({ extensionSettings }) => {
    const settings = { ...DEFAULT_SETTINGS, ...(extensionSettings || {}) };
    ids.forEach(id => { if (controls[id]) controls[id].checked = settings[id] !== false; });
  });
  ids.forEach(id => {
    controls[id]?.addEventListener('change', () => {
      const settings = Object.fromEntries(ids.map(key => [key, controls[key].checked]));
      chrome.storage.local.set({ extensionSettings: settings }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          if (tabs[0]?.id) {
            try { chrome.tabs.sendMessage(tabs[0].id, { type: 'SETTINGS_UPDATED', settings }); } catch (_) { /* The active tab may not host DanMed. */ }
          }
        });
      });
    });
  });
});
