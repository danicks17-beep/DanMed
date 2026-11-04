'use strict';

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
  eligibilityHelper: true,
  selfPayOverrides: true,
  attachmentDocumentShortcuts: true
};

const SETTING_GROUPS = [
  {
    title: 'Task management',
    description: 'Organize tasks and preview notes without leaving ModMed.',
    settings: [
      ['featureTaskTools', 'Task snoozing, labels & colors', 'Adds snoozing, labels, colors, and the Snoozed task tab.'],
      ['featureHover', 'Note hover previews', 'Shows note content when you hover over task rows.']
    ]
  },
  {
    title: 'ModMed shortcuts',
    description: 'Speed up common selections in supported forms.',
    settings: [
      ['otcChargeShortcuts', 'OTC charge shortcuts', 'Adds configured products and charges to the selector.'],
      ['payerShortcuts', 'Insurance payer shortcuts', 'Groups common commercial, military, Medicaid, Medicare, and supplemental payers.'],
      ['locationShortcuts', 'Location shortcuts', 'Adds quick location choices, including Raleigh.'],
      ['staffShortcuts', 'Staff and task staff shortcuts', 'Controls both task assignment and supported staff selectors.'],
      ['providerShortcuts', 'Provider shortcuts', 'Adds provider selection shortcuts.'],
      ['faxOptionRenaming', 'Fax option renaming', 'Uses clearer labels for supported fax options.'],
      ['eligibilityHelper', 'Eligibility helper', 'Sets the Eligibility Report to 100 records and adds guarded Re-check All pagination.']
    ]
  },
  {
    title: 'Billing & display automation',
    description: 'Apply visual helpers and guarded billing automations.',
    settings: [
      ['appointmentHighlighting', 'Appointment highlighting', 'Highlights New Patient, Salon, and Laser appointments.'],
      ['selfPayOverrides', 'Self-pay charge overrides', 'Applies configured self-pay fee schedule overrides with safety checks.'],
      ['attachmentDocumentShortcuts', 'Attachment document shortcuts', 'Adds L3000 and Vascular document shortcuts.']
    ]
  }
];

const allFeatureIds = SETTING_GROUPS.flatMap(group => group.settings.map(([id]) => id));
const settingLabels = Object.fromEntries(SETTING_GROUPS.flatMap(group => group.settings.map(([id, label]) => [id, label])));
const SHORTCUT_EDITORS = [
  ['locationShortcuts', 'Location shortcuts', 'Quick location choices used in supported ModMed forms.', false],
  ['staffShortcuts', 'Staff shortcuts', 'Shared quick staff choices used in task assignment and supported staff selectors.', false],
  ['providerShortcuts', 'Provider shortcuts', 'Quick provider choices used in supported provider selectors.', false],
  ['attachmentDocumentShortcuts', 'Attachment document shortcuts', 'Buttons that fill attachment titles and categories. These shortcuts can be edited or added, but not reordered or pinned.', false, 'attachment']
];
let settings = { ...DEFAULT_SETTINGS };
let storageSnapshot = {};
let shortcutLists = window.DanMedCleanShortcutLists(structuredClone(window.DANMED_DEFAULT_SHORTCUT_LISTS));

function setStatus(message, isError = false) {
  const status = document.getElementById('saveStatus');
  status.textContent = message;
  status.style.color = isError ? '#b91c1c' : '';
}

function renderSettings() {
  const container = document.getElementById('settingsContainer');
  container.replaceChildren();

  SETTING_GROUPS.forEach(group => {
    const section = document.createElement('section');
    section.className = 'settings-section';
    section.innerHTML = `<div class="section-heading"><h3>${group.title}</h3><p>${group.description}</p></div>`;

    group.settings.forEach(([id, label, description]) => {
      const row = document.createElement('div');
      row.className = 'setting-row';
      row.innerHTML = `<div><div class="setting-label">${label}</div><div class="setting-description">${description}</div></div>`;
      const switchLabel = document.createElement('label');
      switchLabel.className = 'switch';
      switchLabel.innerHTML = `<input type="checkbox" data-setting="${id}" aria-label="${label}"><span class="slider"></span>`;
      switchLabel.querySelector('input').checked = settings[id] !== false;
      switchLabel.querySelector('input').addEventListener('change', event => updateSetting(id, event.target.checked));
      row.appendChild(switchLabel);
      section.appendChild(row);
    });
    container.appendChild(section);
  });

  document.getElementById('masterEnable').checked = settings.masterEnable !== false;
  updateSummary();
}

function createShortcutRow(item, items, onChange, onRemove, mode = 'standard', key = '') {
  const row = document.createElement('div');
  row.className = 'shortcut-item';
  const label = document.createElement('input');
  label.type = 'text';
  label.placeholder = 'Button label';
  label.value = item.label || '';
  label.setAttribute('aria-label', 'Shortcut button label');
  const second = document.createElement('input');
  second.type = 'text';
  second.placeholder = mode === 'attachment' ? 'Document title' : 'ModMed search value';
  second.value = mode === 'attachment' ? (item.title || '') : (item.search || '');
  second.setAttribute('aria-label', second.placeholder);
  const readOnly = key === 'payerShortcuts';
  const third = mode === 'attachment' ? document.createElement('input') : null;
  if (third) {
    third.type = 'text';
    third.placeholder = 'Attachment category';
    third.value = item.category || '';
    third.setAttribute('aria-label', third.placeholder);
  }
  if (mode === 'attachment') {
    third.setAttribute('list', 'danmed-attachment-categories');
    third.addEventListener('change', () => {
      if (!window.DANMED_ATTACHMENT_CATEGORIES.includes(third.value.trim())) {
        third.value = '';
        setStatus('Choose an attachment category from the list.', true);
      }
    });
  }
  [label, second, third].filter(Boolean).forEach(input => input.addEventListener('change', () => {
    if (readOnly) return;
    item.label = label.value.trim();
    if (mode === 'attachment') {
      item.title = second.value.trim();
      if (!window.DANMED_ATTACHMENT_CATEGORIES.includes(third.value.trim())) return;
      item.category = third.value.trim();
    } else {
      item.search = second.value.trim();
    }
    onChange();
  }));
  if (readOnly) {
    label.readOnly = true;
    second.readOnly = true;
    label.title = 'Insurance payer shortcuts are managed by DanMed defaults.';
    second.title = label.title;
  }
  const actions = document.createElement('div');
  actions.className = 'shortcut-actions';
  const canReorder = key !== 'payerShortcuts' && key !== 'attachmentDocumentShortcuts';
  const canPin = canReorder;
  const canRemove = key !== 'payerShortcuts';
  const move = (direction) => {
    const index = items.indexOf(item);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return;
    [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
    saveShortcutLists('Shortcut order saved.');
    renderShortcutEditors();
  };
  if (canReorder) {
    const up = document.createElement('button');
    up.type = 'button'; up.className = 'shortcut-action'; up.textContent = '↑'; up.title = 'Move up';
    up.addEventListener('click', () => move(-1));
    const down = document.createElement('button');
    down.type = 'button'; down.className = 'shortcut-action'; down.textContent = '↓'; down.title = 'Move down';
    down.addEventListener('click', () => move(1));
    actions.append(up, down);
  }
  if (canPin) {
    const pin = document.createElement('button');
    pin.type = 'button'; pin.className = 'shortcut-action'; pin.title = item.pinned === true ? 'Unpin shortcut' : 'Pin shortcut';
    pin.textContent = item.pinned === true ? '★' : '☆';
    pin.addEventListener('click', () => {
      item.pinned = item.pinned !== true;
      saveShortcutLists(item.pinned ? 'Shortcut pinned.' : 'Shortcut unpinned.');
      renderShortcutEditors();
    });
    actions.appendChild(pin);
  }
  if (canRemove) {
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'remove-shortcut'; remove.textContent = 'Remove';
    remove.addEventListener('click', onRemove);
    actions.appendChild(remove);
  }
  row.classList.toggle('attachment-shortcut-item', mode === 'attachment');
  row.append(label, second);
  if (third) row.appendChild(third);
  row.appendChild(actions);
  return row;
}

function saveShortcutLists(message = 'Shortcut lists saved.') {
  chrome.storage.local.set({ shortcutLists }, () => {
    if (chrome.runtime.lastError) setStatus(`Could not save shortcuts: ${chrome.runtime.lastError.message}`, true);
    else setStatus(message);
  });
}

function renderShortcutEditors() {
  const container = document.getElementById('shortcutEditors');
  container.replaceChildren();

  SHORTCUT_EDITORS.forEach(([key, title, description, grouped, mode = 'standard']) => {
    const card = document.createElement('article');
    card.className = 'shortcut-editor';
    const header = document.createElement('div');
    header.className = 'shortcut-editor-header';
    header.innerHTML = `<div><h3>${title}</h3><p>${description}</p></div>`;
    const restore = document.createElement('button');
    restore.type = 'button';
    restore.className = 'button button-secondary';
    restore.textContent = 'Restore defaults';
    restore.addEventListener('click', () => {
      if (!window.confirm(`Restore the default ${title.toLowerCase()}?`)) return;
      shortcutLists[key] = structuredClone(window.DANMED_DEFAULT_SHORTCUT_LISTS[key]);
      saveShortcutLists(`${title} restored to defaults.`);
      renderShortcutEditors();
    });
    header.appendChild(restore);
    card.appendChild(header);

    if (key === 'attachmentDocumentShortcuts') {
      const datalist = document.createElement('datalist');
      datalist.id = 'danmed-attachment-categories';
      window.DANMED_ATTACHMENT_CATEGORIES.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        datalist.appendChild(option);
      });
      card.appendChild(datalist);
    }

    const list = document.createElement('div');
    list.className = 'shortcut-list';
    const addItem = (items, groupElement) => {
      const item = mode === 'attachment'
        ? { id: `danmed-attachment-${Date.now()}`, label: '', title: '', category: '' }
        : { label: '', search: '' };
      items.push(item);
      const empty = groupElement.querySelector('.empty-shortcut');
      empty?.remove();
      const row = createShortcutRow(item, items, saveShortcutLists, () => {
        items.splice(items.indexOf(item), 1);
        saveShortcutLists();
        renderShortcutEditors();
      }, mode, key);
      groupElement.querySelector('.shortcut-items').appendChild(row);
      row.querySelector('input')?.focus();
      saveShortcutLists(mode === 'attachment' ? 'New attachment shortcut added. Fill in its details.' : 'New shortcut added. Fill in its label and search value.');
    };

    const addGroup = (groupTitle, items) => {
      const group = document.createElement('div');
      group.className = 'shortcut-group';
      const titleRow = document.createElement('div');
      titleRow.className = 'shortcut-group-title';
      titleRow.textContent = groupTitle;
      const itemsContainer = document.createElement('div');
      itemsContainer.className = 'shortcut-items';
      if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-shortcut';
        empty.textContent = 'No shortcuts in this group.';
        itemsContainer.appendChild(empty);
      }
      items.forEach(item => itemsContainer.appendChild(createShortcutRow(item, items, saveShortcutLists, () => {
        items.splice(items.indexOf(item), 1);
        saveShortcutLists();
        renderShortcutEditors();
      }, mode, key)));
      if (key !== 'payerShortcuts') {
        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'button button-secondary add-shortcut';
        add.textContent = '+ Add shortcut';
        add.addEventListener('click', () => addItem(items, group));
        group.append(titleRow, itemsContainer, add);
      } else {
        group.append(titleRow, itemsContainer);
      }
      list.appendChild(group);
    };

    if (grouped) {
      (shortcutLists[key] || []).forEach(group => addGroup(group.category || 'Custom', group.items || (group.items = [])));
    } else {
      addGroup('Shortcuts', shortcutLists[key] || (shortcutLists[key] = []));
    }
    card.appendChild(list);
    container.appendChild(card);
  });
}

function updateSummary(storage = storageSnapshot) {
  const enabled = allFeatureIds.filter(id => settings[id] !== false).length;
  document.getElementById('enabledCount').textContent = `${enabled}/${allFeatureIds.length}`;
  document.getElementById('enabledDetail').textContent = settings.masterEnable === false ? 'Master switch is off' : 'Feature switches enabled';
  const snoozed = storage.snoozedTasks && typeof storage.snoozedTasks === 'object' ? Object.keys(storage.snoozedTasks).length : 0;
  const colors = storage.customPaletteColors && typeof storage.customPaletteColors === 'object' ? Object.keys(storage.customPaletteColors).length : 0;
  document.getElementById('snoozeCount').textContent = snoozed;
  document.getElementById('colorCount').textContent = colors;
}

function updateSetting(id, value) {
  settings[id] = value;
  chrome.storage.local.set({ extensionSettings: settings }, () => {
    if (chrome.runtime.lastError) {
      setStatus(`Could not save settings: ${chrome.runtime.lastError.message}`, true);
      return;
    }
    setStatus(`${settingLabels[id] || 'Setting'} ${value ? 'enabled' : 'disabled'}.`);
    renderSettings();
  });
}

function loadStorage() {
  chrome.storage.local.get(['extensionSettings', 'snoozedTasks', 'customPaletteColors', 'shortcutLists'], storage => {
    storageSnapshot = storage;
    settings = { ...DEFAULT_SETTINGS, ...(storage.extensionSettings || {}) };
    shortcutLists = window.DanMedCleanShortcutLists(structuredClone(window.DANMED_DEFAULT_SHORTCUT_LISTS));
    Object.keys(shortcutLists).forEach(key => {
      if (storage.shortcutLists?.[key]) shortcutLists[key] = storage.shortcutLists[key];
    });
    if (!storage.shortcutLists?.staffShortcuts && storage.shortcutLists?.taskStaffShortcuts) {
      shortcutLists.staffShortcuts = storage.shortcutLists.taskStaffShortcuts;
    }
    window.DanMedCleanShortcutLists(shortcutLists);
    renderSettings();
    renderShortcutEditors();
    updateSummary(storage);
  });
}

function resetSettings() {
  if (!window.confirm('Reset all DanMed feature switches to their defaults? Saved snoozed tasks and colors will not be deleted.')) return;
  settings = { ...DEFAULT_SETTINGS };
  chrome.storage.local.set({ extensionSettings: settings }, () => {
    setStatus('Settings reset to defaults.');
    renderSettings();
  });
}

function exportBackup() {
  chrome.storage.local.get(null, storage => {
    const backup = {
      format: 'danmed-settings-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: storage
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `danmed-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus('Backup exported.');
  });
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const data = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;
      const imported = {};
      if (data.extensionSettings && typeof data.extensionSettings === 'object') {
        imported.extensionSettings = { ...DEFAULT_SETTINGS, ...data.extensionSettings };
      }
      ['snoozedTasks', 'customPaletteColors'].forEach(key => {
        if (data[key] && typeof data[key] === 'object') imported[key] = data[key];
      });
      if (data.shortcutLists && typeof data.shortcutLists === 'object') imported.shortcutLists = data.shortcutLists;
      if (!Object.keys(imported).length) throw new Error('No DanMed settings were found in that file.');
      chrome.storage.local.set(imported, () => {
        setStatus('Backup imported successfully.');
        loadStorage();
      });
    } catch (error) {
      setStatus(error.message || 'Could not import that backup.', true);
    }
  };
  reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('version').textContent = `Version ${chrome.runtime.getManifest().version}`;
  document.getElementById('masterEnable').addEventListener('change', event => updateSetting('masterEnable', event.target.checked));
  document.getElementById('resetSettings').addEventListener('click', resetSettings);
  document.getElementById('exportSettings').addEventListener('click', exportBackup);
  document.getElementById('importSettings').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', event => {
    if (event.target.files[0]) importBackup(event.target.files[0]);
    event.target.value = '';
  });
  loadStorage();
});
