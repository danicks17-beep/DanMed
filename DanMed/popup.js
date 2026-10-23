document.addEventListener('DOMContentLoaded', () => {
  const masterEnable = document.getElementById('masterEnable');
  const featureHover = document.getElementById('featureHover');

  const toggles = [masterEnable, featureHover];

  // Load saved states from storage
  chrome.storage.local.get(['extensionSettings'], (result) => {
    const settings = result.extensionSettings || {
      masterEnable: true,
      featureHover: true
    };

    masterEnable.checked = settings.masterEnable;
    featureHover.checked = settings.featureHover;
  });

  // Listen for changes and save to storage
  toggles.forEach(toggle => {
    toggle.addEventListener('change', () => {
      const settings = {
        masterEnable: masterEnable.checked,
        featureHover: featureHover.checked
      };

      chrome.storage.local.set({ extensionSettings: settings }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'SETTINGS_UPDATED', settings });
          }
        });
      });
    });
  });
});