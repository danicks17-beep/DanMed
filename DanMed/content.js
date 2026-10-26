// DanMed feature settings are shared by the popup and every content feature.
const DANMED_DEFAULT_SETTINGS = {
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
  selfPayOverrides: true,
  attachmentDocumentShortcuts: true
};
let danmedSettings = { ...DANMED_DEFAULT_SETTINGS };
chrome.storage.local.get(['extensionSettings'], (result) => {
  danmedSettings = { ...DANMED_DEFAULT_SETTINGS, ...(result.extensionSettings || {}) };
});
function DanMedFeatureEnabled(feature) {
  return danmedSettings.masterEnable !== false && danmedSettings[feature] !== false;
}
window.DanMedFeatureEnabled = DanMedFeatureEnabled;

const danmedOriginalDocumentTitle = document.title;
let danmedLastRouteTitle = '';

function getDanMedStaffRoute() {
  const hash = window.location.hash || '';
  const route = hash.split('?')[0].replace(/^#\/?/, '/');
  return route.replace(/^\/practice\/staff\/?/, '/').replace(/\/$/, '') || '/';
}

function getVisiblePatientName() {
  const candidates = Array.from(document.querySelectorAll('a, h1, h2, h3, h4, [role="heading"]'))
    .map(el => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim())
    .filter(text => text && text.length <= 100 && text.split(',').length === 2);
  return candidates.find(text => {
    const parts = text.split(',').map(part => part.trim());
    return parts[0] && parts[1] && !/^(home|schedule|patients|tasks|orders|notes|manage)$/i.test(parts[0]);
  }) || '';
}

function getCheckInPatientName() {
  const patientName = getVisiblePatientName();
  // The Check In header includes a middle initial for some patients; keep the
  // requested concise format for that route while preserving full names on Check Out.
  return patientName.replace(/,\s+([^,]+)\s+[A-Z]\.$/, ', $1');
}

function updateDanMedDocumentTitle() {
  const route = getDanMedStaffRoute();
  let title = '';
  if (route === '/master-checkin/home/masterCheckinView') {
    title = 'Appt Flow';
  } else if (route.startsWith('/master-checkin/checkIn/')) {
    const patientName = getCheckInPatientName();
    title = patientName ? `Check In: ${patientName}` : 'Check In';
  } else if (route.startsWith('/master-checkin/checkOut/')) {
    const patientName = getVisiblePatientName();
    title = patientName ? `Check Out: ${patientName}` : 'Check Out';
  } else if (route.startsWith('/patient/') && route.includes('/edit-patient/financials/')) {
    const patientName = getVisiblePatientName();
    title = patientName ? `Financials: ${patientName}` : 'Financials';
  } else if (route.startsWith('/patient/') && route.includes('/edit-patient/contact-info')) {
    const patientName = getVisiblePatientName();
    title = patientName ? `Demos: ${patientName}` : 'Contact Info';
  } else if (route.startsWith('/patient/') && route.includes('/chart/tasks')) {
    const patientName = getVisiblePatientName();
    title = patientName ? `Tasks: ${patientName}` : 'Tasks';
  } else if (route.startsWith('/patient/') && route.includes('/edit-patient/patient-insurance/')) {
    const patientName = getVisiblePatientName();
    title = patientName ? `Insurance: ${patientName}` : 'Insurance';
  } else if (route.startsWith('/patient/') && route.includes('/chart/')) {
    const patientName = getVisiblePatientName();
    title = patientName || 'Patient Chart';
  } else if (route.startsWith('/tasks/task-details/')) {
    const patientName = getVisiblePatientName();
    title = patientName ? `Task: ${patientName}` : 'Task Details';
  } else if (route.startsWith('/tasks/manage/')) {
    title = 'Tasks';
  } else if (route === '/scheduler') {
    title = 'Schedule';
  } else {
    title = danmedOriginalDocumentTitle;
  }
  if (title && document.title !== title) document.title = title;
  danmedLastRouteTitle = `${route}|${title}`;
}

function setNativeSelectValue(select, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
  if (setter) setter.call(select, value);
  else select.value = value;
  ['input', 'change'].forEach(type => select.dispatchEvent(new Event(type, { bubbles: true })));
}

function setRecordsPerPage100() {
  const route = getDanMedStaffRoute();
  const isTasksManagement = route.startsWith('/tasks/manage/');
  const isFaxesManagement = route.startsWith('/faxes/manage/');
  if (!isTasksManagement && !isFaxesManagement) return;
  const selects = Array.from(document.querySelectorAll('select')).filter(select => {
    const options = Array.from(select.options || []).map(option => option.text.trim());
    const context = (select.closest('label, .form-group, td, div')?.innerText || '').replace(/\s+/g, ' ');
    return options.includes('100') && /View Records By/i.test(context) &&
      (isTasksManagement ? options.includes('10') : options.includes('25'));
  });
  selects.forEach(select => {
    if (select.value !== '100' && select.value !== 100) setNativeSelectValue(select, '100');
  });

  // Fallback for an ng-select implementation if the application replaces the native control.
  const recordLabel = Array.from(document.querySelectorAll('label, span, div')).find(el =>
    /View Records By/i.test((el.innerText || '').replace(/\s+/g, ' ')) && el.querySelector('ng-select')
  );
  const ngSelect = recordLabel?.querySelector('ng-select');
  if (ngSelect && !/\b100\b/.test(ngSelect.innerText || '')) {
    ngSelect.querySelector('.ng-select-container')?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    ngSelect.querySelector('.ng-select-container')?.click();
    setTimeout(() => {
      const option = Array.from(document.querySelectorAll('ng-dropdown-panel .ng-option'))
        .find(el => (el.innerText || '').trim() === '100');
      option?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      option?.click();
    }, 50);
  }
}

function applyDanMedRouteEnhancements() {
  updateDanMedDocumentTitle();
  setRecordsPerPage100();
}

function cleanupDanMedFeatureDom() {
  document.querySelectorAll('.custom-location-shortcuts, .custom-staff-shortcuts, #payer-shortcuts-container, .custom-shortcut-item, .custom-shortcut-option, .custom-provider-shortcuts, .danmed-attachment-shortcut, .modmed-task-tooltip').forEach(el => el.remove());
  document.querySelectorAll('ng-dropdown-panel[data-shortcuts-added]').forEach(panel => {
    panel.querySelector('.custom-shortcut-option')?.parentElement?.remove();
    delete panel.dataset.shortcutsAdded;
  });
  document.querySelectorAll('[data-shortcuts-added]').forEach(el => delete el.dataset.shortcutsAdded);
  document.querySelectorAll('.col-md-8.appt-row-center').forEach(el => {
    if (el.style.backgroundColor === 'rgb(230, 231, 255)' || el.style.backgroundColor === 'rgb(252, 241, 210)') el.style.removeProperty('background-color');
  });
}
// Check if current route is strictly in Tasks Management grid
function isTasksPage() {
  return window.location.hash.includes('/tasks/manage/');
}

// Find the task ID anywhere in the row and return the specific cell containing it
function getTaskCellAndId(row) {
  const cells = row.querySelectorAll('td');
  for (const cell of cells) {
    const match = cell.innerText.match(/([A-Z]{2,6}-\d+|\d{7,})/);
    if (match) {
      return { cell, taskId: match[1] };
    }
  }
  return { cell: null, taskId: null };
}

function getTaskIdFromRow(row) {
  const result = getTaskCellAndId(row);
  return result.taskId;
}

// Position custom column header right after the "Priority" column
function injectCustomColumnHeader() {
  const headerRow = document.querySelector('table thead tr');
  if (!headerRow) return;

  let customTh = headerRow.querySelector('.modmed-custom-th');
  if (customTh) return;

  const ths = Array.from(headerRow.querySelectorAll('th'));
  const priorityTh = ths.find(th => th.innerText.toLowerCase().includes('priority'));

  customTh = document.createElement('th');
  customTh.className = 'modmed-custom-th';
  customTh.innerText = 'Label';

  if (priorityTh) {
    priorityTh.insertAdjacentElement('afterend', customTh);
  } else {
    headerRow.appendChild(customTh);
  }
}

// Helper to apply background color safely across the row
function applyRowColor(row, color) {
  if (color) {
    row.style.setProperty('background-color', color, 'important');
    row.querySelectorAll('td').forEach(td => {
      td.style.setProperty('background-color', color, 'important');
    });
  } else {
    row.style.removeProperty('background-color');
    row.querySelectorAll('td').forEach(td => {
      td.style.removeProperty('background-color');
    });
  }
}

// Listen for live toggle updates from the popup menu instantly
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SETTINGS_UPDATED') {
    danmedSettings = { ...DANMED_DEFAULT_SETTINGS, ...(message.settings || {}) };
    if (!DanMedFeatureEnabled('featureHover')) removeTaskTooltip();
    if (!DanMedFeatureEnabled('featureTaskTools')) {
      removeTaskTooltip();
      document.querySelectorAll('.modmed-custom-th, .modmed-custom-cell, .modmed-snooze-wrapper-original, #snoozed-tab-btn').forEach(el => el.remove());
    }
    cleanupDanMedFeatureDom();
  }
});

// --- PRECISE DOM SCRAPER FOR MODMED TASK DETAILS ---
function captureTaskNotesFromDetails() {
  if (!DanMedFeatureEnabled('featureTaskTools')) return;
  const hash = window.location.hash || '';
  const urlMatch = hash.match(/(?:task-details\/|communication\/|task\/)(\d+|[A-Z]{2,6}-\d+)/i);
  let taskId = urlMatch ? urlMatch[1] : sessionStorage.getItem('modmed_last_clicked_task');

  if (!taskId) return;

  const allElements = Array.from(document.querySelectorAll('div, span, p'));
  let latestNoteFormatted = '';

  for (const el of allElements) {
    const text = el.innerText || '';
    
    if (text.includes('Task Note') && text.includes('|')) {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const headerLine = lines.find(l => l.includes('Task Note'));

      if (headerLine) {
        const cleanHeader = headerLine
          .replace('Task Note', '')
          .replace(/\|/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        const headerIndex = lines.indexOf(headerLine);
        const bodyLines = [];
        
        for (let i = headerIndex + 1; i < lines.length; i++) {
          let line = lines[i];
          if (line.includes('Task Note') || line.includes('Task History')) {
            break;
          }
          line = line.replace(/EditArchive/gi, '').trim();
          if (line) {
            bodyLines.push(line);
          }
        }

        if (bodyLines.length > 0) {
          const bodyText = bodyLines.join(' ');
          latestNoteFormatted = `${cleanHeader} : ${bodyText}`;
          break;
        }
      }
    }
  }

  if (latestNoteFormatted && latestNoteFormatted.length > 3) {
    saveCachedTaskNotes(taskId, latestNoteFormatted);
    
    const gridTaskId = sessionStorage.getItem('modmed_last_grid_task_id');
    if (gridTaskId && gridTaskId !== taskId) {
      saveCachedTaskNotes(gridTaskId, latestNoteFormatted);
    }
  }
}

function saveCachedTaskNotes(taskId, notes) {
  chrome.storage.local.get(['snoozedTasks'], (result) => {
    const snoozedTasks = result.snoozedTasks || {};
    if (!snoozedTasks[taskId]) {
      snoozedTasks[taskId] = {};
    }
    
    const timestamp = new Date().toLocaleString([], { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit' 
    });

    if (snoozedTasks[taskId].cachedNotes !== notes || !snoozedTasks[taskId].lastChecked) {
      snoozedTasks[taskId].cachedNotes = notes;
      snoozedTasks[taskId].lastChecked = timestamp;
      chrome.storage.local.set({ snoozedTasks });
    }
  });
}

// Global Event Delegation for Row Hover Previews
document.addEventListener('mouseover', (e) => {
  if (!isTasksPage()) {
    removeTaskTooltip();
    return;
  }
  
  chrome.storage.local.get(['extensionSettings'], (result) => {
    const settings = result.extensionSettings || { masterEnable: true, featureHover: true };
    if (!settings.masterEnable || !settings.featureHover) return;

    const row = e.target.closest('table tbody tr');
    if (!row) return;

    if (window.currentHoveredRow === row) return;
    window.currentHoveredRow = row;

    const { taskId } = getTaskCellAndId(row);
    if (!taskId) return;

    chrome.storage.local.get(['snoozedTasks'], (res) => {
      const snoozedTasks = res.snoozedTasks || {};
      const snoozeData = snoozedTasks[taskId] || {};
      showTaskTooltip(row, taskId, snoozeData);
    });
  });
});

document.addEventListener('mouseout', (e) => {
  const row = e.target.closest('table tbody tr');
  if (row && e.relatedTarget && !row.contains(e.relatedTarget)) {
    window.currentHoveredRow = null;
    removeTaskTooltip();
  }
});

window.addEventListener('hashchange', () => {
  applyDanMedRouteEnhancements();
  window.currentHoveredRow = null;
  removeTaskTooltip();
  
  if (isTasksPage()) {
    setTimeout(() => {
      const activeTab = sessionStorage.getItem('modmed_active_task_tab');
      if (activeTab === 'snoozed') {
        const snoozedBtn = document.getElementById('snoozed-tab-btn');
        if (snoozedBtn && !snoozedBtn.classList.contains('active')) {
          snoozedBtn.click();
        }
      }
    }, 100);
  }
});

document.addEventListener('click', () => {
  if (!isTasksPage()) {
    window.currentHoveredRow = null;
    removeTaskTooltip();
  }
});

// Track task row clicks
document.addEventListener('click', (e) => {
  const row = e.target.closest('table tbody tr');
  if (row) {
    const taskId = getTaskIdFromRow(row);
    if (taskId) {
      sessionStorage.setItem('modmed_last_clicked_task', taskId);
      sessionStorage.setItem('modmed_last_grid_task_id', taskId);
    }
  }
});

// Inject Snooze button and Color picker
function injectTaskCustomColumns() {
  if (!DanMedFeatureEnabled('featureTaskTools') || !isTasksPage()) return;
  if (document.getElementById('active-snooze-popover') || document.querySelector('.modmed-color-palette-popup')) return;

  injectCustomColumnHeader();

  chrome.storage.local.get(['snoozedTasks'], (result) => {
    if (document.getElementById('active-snooze-popover') || document.querySelector('.modmed-color-palette-popup')) return;

    const snoozedTasks = result.snoozedTasks || {};
    const rows = document.querySelectorAll('table tbody tr');

    rows.forEach((row) => {
      const { cell: taskCell, taskId } = getTaskCellAndId(row);
      if (!taskId || !taskCell) return;

      const snoozeData = snoozedTasks[taskId] || {};
      const now = new Date().getTime();
      const isCurrentlySnoozed = snoozeData.snoozeUntil && new Date(snoozedTasks[taskId].snoozeUntil).getTime() > now;
      const activeColor = snoozeData.rowColor || '';

      applyRowColor(row, activeColor);

      // --- A. INJECT SNOOZE BUTTON ---
      let existingWrapper = taskCell.querySelector('.modmed-snooze-wrapper-original');
      const currentLabelAttr = existingWrapper?.getAttribute('data-label') || '';
      const newLabelVal = snoozeData.label || '';
      const hasBadge = existingWrapper?.classList.contains('is-snoozed-mode');

      if (!existingWrapper || (hasBadge !== isCurrentlySnoozed) || (currentLabelAttr !== newLabelVal)) {
        if (existingWrapper) existingWrapper.remove();

        const wrapper = document.createElement('div');
        wrapper.className = 'modmed-snooze-wrapper-original';
        wrapper.setAttribute('data-label', newLabelVal);

        if (isCurrentlySnoozed) {
          wrapper.classList.add('is-snoozed-mode');
          const badge = document.createElement('span');
          badge.className = 'modmed-snoozed-badge';
          const dateStr = new Date(snoozedTasks[taskId].snoozeUntil).toLocaleDateString();
          badge.innerText = `💤 Snoozed: ${dateStr}`;
          wrapper.appendChild(badge);

          const editBtn = document.createElement('button');
          editBtn.className = 'modmed-action-btn modmed-edit-btn';
          editBtn.innerText = '⚙️ Edit Snooze';
          editBtn.type = 'button';
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showDatePickerPopover(editBtn, row, snoozeData);
          });
          wrapper.appendChild(editBtn);
        } else {
          const btn = document.createElement('button');
          btn.className = 'modmed-snooze-btn';
          btn.innerText = '💤 Snooze';
          btn.type = 'button';
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            showDatePickerPopover(btn, row, null);
          });
          wrapper.appendChild(btn);
        }
        taskCell.appendChild(wrapper);
      }

      // --- B. INJECT LABEL & COLOR SWATCH PICKER ---
      let customCell = row.querySelector('.modmed-custom-cell');
      const tds = Array.from(row.querySelectorAll('td'));
      const headerRow = document.querySelector('table thead tr');
      const ths = headerRow ? Array.from(headerRow.querySelectorAll('th')) : [];
      const priorityThIndex = ths.findIndex(th => th.innerText.toLowerCase().includes('priority'));

      if (!customCell) {
        customCell = document.createElement('td');
        customCell.className = 'modmed-custom-cell';
        if (priorityThIndex !== -1 && tds[priorityThIndex]) {
          tds[priorityThIndex].insertAdjacentElement('afterend', customCell);
        } else {
          row.appendChild(customCell);
        }
      }

      const currentLabelTag = customCell.querySelector('.modmed-task-label-tag');
      const labelText = currentLabelTag ? currentLabelTag.innerText : '';
      const colorSwatchTrigger = customCell.querySelector('.modmed-color-trigger');
      const currentColorAttr = colorSwatchTrigger?.getAttribute('data-color') || '';

      if (!colorSwatchTrigger || labelText !== newLabelVal || currentColorAttr !== activeColor) {
        customCell.innerHTML = '';
        const rightWrapper = document.createElement('div');
        rightWrapper.className = 'modmed-right-col-wrapper';

        if (newLabelVal) {
          const labelTag = document.createElement('span');
          labelTag.className = 'modmed-task-label-tag';
          labelTag.innerText = newLabelVal;
          rightWrapper.appendChild(labelTag);
        }

        const colorBtn = document.createElement('button');
        colorBtn.className = 'modmed-color-trigger';
        colorBtn.type = 'button';
        colorBtn.title = 'Change Row Color';
        colorBtn.setAttribute('data-color', activeColor);
        
        const dot = document.createElement('span');
        dot.className = 'modmed-color-dot';
        dot.style.backgroundColor = activeColor || '#cbd5e1';
        colorBtn.appendChild(dot);

        const labelSpan = document.createElement('span');
        labelSpan.innerText = activeColor ? 'Color' : '🎨 Color';
        colorBtn.appendChild(labelSpan);

        colorBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          showColorPalettePopup(colorBtn, row, taskId);
        });

        rightWrapper.appendChild(colorBtn);
        customCell.appendChild(rightWrapper);
      }
    });
  });
}

// --- HOVER TOOLTIP PREVIEW HELPERS ---
function showTaskTooltip(row, taskId, snoozeData) {
  removeTaskTooltip();
  if (!isTasksPage()) return;

  const notesText = snoozeData.cachedNotes ? snoozeData.cachedNotes : 'No notes viewed yet. Click into this task once to load its notes!';
  const lastCheckedTime = snoozeData.lastChecked ? snoozeData.lastChecked : 'Never';

  const tooltip = document.createElement('div');
  tooltip.className = 'modmed-task-tooltip';
  
  const titleEl = document.createElement('div');
  titleEl.className = 'modmed-tooltip-title';
  titleEl.innerHTML = `<span style="font-weight: bold; display: block;">Most Recently Viewed Task Note</span> ${lastCheckedTime}`;
  tooltip.appendChild(titleEl);

  const contentEl = document.createElement('div');
  contentEl.className = 'modmed-tooltip-content';
  contentEl.innerText = notesText;
  tooltip.appendChild(contentEl);

  if (snoozeData.label) {
    const labelEl = document.createElement('div');
    labelEl.style.marginTop = '6px';
    labelEl.style.color = '#38bdf8';
    labelEl.innerText = `Label: ${snoozeData.label}`;
    tooltip.appendChild(labelEl);
  }

  document.body.appendChild(tooltip);

  const rect = row.getBoundingClientRect();
  tooltip.style.top = `${rect.top + window.scrollY}px`;

  const removeOnMove = (e) => {
    if (!row.contains(e.target) && !tooltip.contains(e.target)) {
      removeTaskTooltip();
      document.removeEventListener('mousemove', removeOnMove);
    }
  };
  document.addEventListener('mousemove', removeOnMove);
}

function removeTaskTooltip() {
  document.querySelectorAll('.modmed-task-tooltip').forEach(el => el.remove());
}

// Visual Color Swatch Popover Palette
function showColorPalettePopup(buttonEl, row, taskId) {
  document.querySelectorAll('.modmed-color-palette-popup, .snooze-picker-popover').forEach(el => el.remove());

  chrome.storage.local.get(['customPaletteColors'], (result) => {
    const defaultColors = ['#fef08a', '#bbf7d0', '#bae6fd', '#fbcfe8', '#fed7aa'];
    const userColors = result.customPaletteColors || defaultColors;

    const palette = document.createElement('div');
    palette.className = 'modmed-color-palette-popup';

    const swatchRow = document.createElement('div');
    swatchRow.className = 'modmed-palette-row';

    const noneSwatch = document.createElement('div');
    noneSwatch.className = 'modmed-palette-swatch swatch-none';
    noneSwatch.innerText = 'Off';
    noneSwatch.title = 'Remove color';
    noneSwatch.addEventListener('click', (e) => {
      e.stopPropagation();
      applyRowColor(row, '');
      updateTaskColor(taskId, '');
      palette.remove();
      setTimeout(injectTaskCustomColumns, 50);
    });
    swatchRow.appendChild(noneSwatch);

    userColors.forEach((colorVal, index) => {
      const swatch = document.createElement('div');
      swatch.className = 'modmed-palette-swatch';
      swatch.style.backgroundColor = colorVal;
      swatch.title = `Color ${index + 1}`;

      swatch.addEventListener('click', (e) => {
        e.stopPropagation();
        applyRowColor(row, colorVal);
        updateTaskColor(taskId, colorVal);
        palette.remove();
        setTimeout(injectTaskCustomColumns, 50);
      });

      swatchRow.appendChild(swatch);
    });

    palette.appendChild(swatchRow);

    const settingsToggle = document.createElement('button');
    settingsToggle.className = 'modmed-settings-toggle';
    settingsToggle.innerText = '⚙️ Customize Colors';
    palette.appendChild(settingsToggle);

    const configContainer = document.createElement('div');
    configContainer.className = 'modmed-custom-colors-container';
    configContainer.style.display = 'none';

    const colorInputs = [];
    userColors.forEach((colorVal, index) => {
      const inputRow = document.createElement('div');
      inputRow.className = 'modmed-color-input-row';
      
      const label = document.createElement('span');
      label.innerText = `Color ${index + 1}:`;
      
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = colorVal;
      
      inputRow.appendChild(label);
      inputRow.appendChild(colorInput);
      configContainer.appendChild(inputRow);
      colorInputs.push(colorInput);
    });

    const saveCustomBtn = document.createElement('button');
    saveCustomBtn.className = 'modmed-save-colors-btn';
    saveCustomBtn.innerText = 'Save Palette';
    saveCustomBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const newColors = colorInputs.map(input => input.value);
      chrome.storage.local.set({ customPaletteColors: newColors }, () => {
        palette.remove();
      });
    });
    configContainer.appendChild(saveCustomBtn);
    palette.appendChild(configContainer);

    settingsToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      configContainer.style.display = configContainer.style.display === 'none' ? 'flex' : 'none';
    });

    const rect = buttonEl.getBoundingClientRect();
    palette.style.top = `${rect.bottom + window.scrollY + 4}px`;
    palette.style.left = `${rect.left + window.scrollX}px`;

    const closeOnOutsideClick = (e) => {
      if (!palette.contains(e.target) && e.target !== buttonEl) {
        palette.remove();
        document.removeEventListener('click', closeOnOutsideClick);
      }
    };
    setTimeout(() => document.addEventListener('click', closeOnOutsideClick), 10);

    document.body.appendChild(palette);
  });
}

// Inline Popover to pick a Snooze Date and Label
function showDatePickerPopover(buttonEl, row, existingData = null) {
  document.querySelectorAll('.modmed-color-palette-popup, .snooze-picker-popover').forEach(el => el.remove());

  const popover = document.createElement('div');
  popover.id = 'active-snooze-popover';
  popover.className = 'snooze-picker-popover';

  const title = document.createElement('div');
  title.style.fontWeight = 'bold';
  title.style.fontSize = '12px';
  title.innerText = existingData ? 'Edit Snooze / Label' : 'Snooze Task';
  popover.appendChild(title);

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  if (existingData && existingData.snoozeUntil) {
    dateInput.value = existingData.snoozeUntil.split('T')[0];
  } else {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.value = tomorrow.toISOString().split('T')[0];
  }
  popover.appendChild(dateInput);

  const labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.placeholder = 'Label (e.g. Waiting on Labs)';
  labelInput.value = existingData ? (existingData.label || '') : '';
  popover.appendChild(labelInput);

  const btnContainer = document.createElement('div');
  btnContainer.style.display = 'flex';
  btnContainer.style.gap = '4px';

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'modmed-popover-save';
  confirmBtn.innerText = 'Save';
  confirmBtn.addEventListener('click', () => {
    const selectedDate = new Date(dateInput.value);
    const taskId = getTaskIdFromRow(row);
    if (taskId && !isNaN(selectedDate.getTime())) {
      saveTaskSnoozeAndLabel(taskId, selectedDate, labelInput.value.trim());
    }
    popover.remove();
  });
  btnContainer.appendChild(confirmBtn);

  if (existingData && existingData.snoozeUntil) {
    const cancelSnoozeBtn = document.createElement('button');
    cancelSnoozeBtn.className = 'modmed-popover-cancel';
    cancelSnoozeBtn.innerText = 'Un-snooze';
    cancelSnoozeBtn.addEventListener('click', () => {
      const taskId = getTaskIdFromRow(row);
      if (taskId) {
        removeSnoozeTask(taskId);
      }
      popover.remove();
    });
    btnContainer.appendChild(cancelSnoozeBtn);
  }

  popover.appendChild(btnContainer);

  const rect = buttonEl.getBoundingClientRect();
  popover.style.top = `${rect.bottom + window.scrollY}px`;
  popover.style.left = `${rect.left + window.scrollX}px`;

  const closeOnOutsideClick = (e) => {
    if (!popover.contains(e.target) && e.target !== buttonEl) {
      popover.remove();
      document.removeEventListener('click', closeOnOutsideClick);
    }
  };
  setTimeout(() => document.addEventListener('click', closeOnOutsideClick), 10);

  document.body.appendChild(popover);
}

// Storage helpers
function saveTaskSnoozeAndLabel(taskId, snoozeUntilDate, label) {
  chrome.storage.local.get(['snoozedTasks'], (result) => {
    const snoozedTasks = result.snoozedTasks || {};
    snoozedTasks[taskId] = {
      ...snoozedTasks[taskId],
      snoozeUntil: snoozeUntilDate.toISOString(),
      snoozedAt: new Date().toISOString(),
      label: label || ''
    };
    chrome.storage.local.set({ snoozedTasks }, () => {
      applyTaskFiltering();
      injectTaskCustomColumns();
    });
  });
}

function updateTaskColor(taskId, color) {
  chrome.storage.local.get(['snoozedTasks'], (result) => {
    const snoozedTasks = result.snoozedTasks || {};
    if (!snoozedTasks[taskId]) {
      snoozedTasks[taskId] = {};
    }
    snoozedTasks[taskId].rowColor = color;
    chrome.storage.local.set({ snoozedTasks });
  });
}

function removeSnoozeTask(taskId) {
  chrome.storage.local.get(['snoozedTasks'], (result) => {
    const snoozedTasks = result.snoozedTasks || {};
    if (snoozedTasks[taskId]) {
      delete snoozedTasks[taskId].snoozeUntil;
      delete snoozedTasks[taskId].snoozedAt;
    }
    chrome.storage.local.set({ snoozedTasks }, () => {
      applyTaskFiltering();
      injectTaskCustomColumns();
    });
  });
}

// Inject Custom "Snoozed" Tab right after "All Tasks"
function injectSnoozedTab() {
  if (!DanMedFeatureEnabled('featureTaskTools') || !isTasksPage() || document.getElementById('snoozed-tab-btn')) return;

  const allTasksEl = Array.from(document.querySelectorAll('a, button, div, span')).find(el => {
    return el.innerText && el.innerText.trim() === 'All Tasks' && el.children.length === 0;
  });

  if (!allTasksEl) return;

  const tabItem = allTasksEl.closest('li') || allTasksEl.parentElement;
  const tabContainer = tabItem?.parentElement;

  if (!tabContainer) return;

  const snoozedTabItem = tabItem.cloneNode(true);
  snoozedTabItem.id = 'snoozed-tab-btn';

  const childText = snoozedTabItem.querySelector('a, span, div') || snoozedTabItem;
  childText.innerText = 'Snoozed';
  
  snoozedTabItem.classList.remove('active', 'selected');
  childText.classList.remove('active', 'selected');

  snoozedTabItem.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    tabContainer.querySelectorAll('.active, .selected').forEach(el => {
      el.classList.remove('active', 'selected');
    });

    snoozedTabItem.classList.add('active');
    childText.classList.add('active');

    sessionStorage.setItem('modmed_active_task_tab', 'snoozed');
    renderSnoozedView();
  });

  Array.from(tabContainer.children).forEach(sibling => {
    if (sibling !== snoozedTabItem) {
      sibling.addEventListener('click', () => {
        snoozedTabItem.classList.remove('active');
        childText.classList.remove('active');
        sessionStorage.setItem('modmed_active_task_tab', 'received');
        setTimeout(applyTaskFiltering, 150);
      });
    }
  });

  tabContainer.appendChild(snoozedTabItem);

  if (sessionStorage.getItem('modmed_active_task_tab') === 'snoozed') {
    snoozedTabItem.click();
  }
}

// Filter "Received" Tab
function filterReceivedTasks() {
  if (!DanMedFeatureEnabled('featureTaskTools') || !isTasksPage()) return;
  const isSnoozedActive = document.getElementById('snoozed-tab-btn')?.classList.contains('active');
  if (isSnoozedActive) return;

  chrome.storage.local.get(['snoozedTasks'], (result) => {
    const snoozedTasks = result.snoozedTasks || {};
    const now = new Date().getTime();
    const rows = document.querySelectorAll('table tbody tr');

    rows.forEach(row => {
      const taskId = getTaskIdFromRow(row);
      if (taskId && snoozedTasks[taskId] && snoozedTasks[taskId].snoozeUntil) {
        const snoozeDate = new Date(snoozedTasks[taskId].snoozeUntil).getTime();
        if (snoozeDate > now) {
          row.style.display = 'none';
        } else {
          row.style.display = '';
          delete snoozedTasks[taskId].snoozeUntil;
          chrome.storage.local.set({ snoozedTasks });
        }
      } else {
        row.style.display = '';
      }
    });
  });
}

// Render "Snoozed" Tab
function renderSnoozedView() {
  if (!DanMedFeatureEnabled('featureTaskTools') || !isTasksPage()) return;
  chrome.storage.local.get(['snoozedTasks'], (result) => {
    const snoozedTasks = result.snoozedTasks || {};
    const now = new Date().getTime();
    const rows = document.querySelectorAll('table tbody tr');

    rows.forEach(row => {
      const taskId = getTaskIdFromRow(row);
      if (taskId && snoozedTasks[taskId] && snoozedTasks[taskId].snoozeUntil) {
        const snoozeDate = new Date(snoozedTasks[taskId].snoozeUntil).getTime();
        if (snoozeDate > now) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      } else {
        row.style.display = 'none';
      }
    });
    
    injectTaskCustomColumns();
  });
}

function applyTaskFiltering() {
  if (!DanMedFeatureEnabled('featureTaskTools') || !isTasksPage()) return;
  const isSnoozedActive = document.getElementById('snoozed-tab-btn')?.classList.contains('active');
  if (isSnoozedActive) {
    renderSnoozedView();
  } else {
    filterReceivedTasks();
  }
}

// Watch for SPA DOM Updates & Continually Scrape Notes
let observerTimeout = null;
const observer = new MutationObserver(() => {
  applyDanMedRouteEnhancements();
  if (!DanMedFeatureEnabled('featureTaskTools')) return;
  captureTaskNotesFromDetails();

  if (!isTasksPage()) {
    removeTaskTooltip();
    return;
  }
  
  if (document.getElementById('active-snooze-popover') || document.querySelector('.modmed-color-palette-popup')) return;
  if (observerTimeout) return;
  
  observerTimeout = setTimeout(() => {
    observerTimeout = null;
    injectSnoozedTab();
    injectTaskCustomColumns();
    applyTaskFiltering();
  }, 300);
});

observer.observe(document.body, { childList: true, subtree: true });
applyDanMedRouteEnhancements();
setInterval(applyDanMedRouteEnhancements, 750);
