document.addEventListener('DOMContentLoaded', () => {
  const defaults = {
    masterEnable: true,
    featureHover: true,
    featureTasks: true,
    featureAppointments: true,
    featureCharges: true,
    featureInsurance: true,
    featureLocation: true,
    featureStaff: true,
    featureFaxLabels: true,
    featureSelfPay: true
  };
  const ids = Object.keys(defaults);
  const controls = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
  const status = document.getElementById('status');

  chrome.storage.local.get(['extensionSettings'], result => {
    const settings = { ...defaults, ...(result.extensionSettings || {}) };
    ids.forEach(id => { controls[id].checked = Boolean(settings[id]); });
  });

  ids.forEach(id => controls[id].addEventListener('change', () => {
    const settings = Object.fromEntries(ids.map(key => [key, controls[key].checked]));
    chrome.storage.local.set({ extensionSettings: settings }, () => {
      status.textContent = 'Saved';
      setTimeout(() => { status.textContent = ''; }, 900);
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const tabId = tabs[0]?.id;
        if (tabId) chrome.tabs.sendMessage(tabId, { type: 'SETTINGS_UPDATED', settings }).catch(() => {});
      });
    });
  }));
});
