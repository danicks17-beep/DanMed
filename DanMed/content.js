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
    if (!message.settings.masterEnable || !message.settings.featureHover) {
      removeTaskTooltip();
    }
  }
});

// --- PRECISE DOM SCRAPER FOR MODMED TASK DETAILS ---
function captureTaskNotesFromDetails() {
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
  if (!isTasksPage()) return;
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
  if (!isTasksPage() || document.getElementById('snoozed-tab-btn')) return;

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
  if (!isTasksPage()) return;
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
  if (!isTasksPage()) return;
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
  if (!isTasksPage()) return;
  const isSnoozedActive = document.getElementById('snoozed-tab-btn')?.classList.contains('active');
  if (isSnoozedActive) {
    renderSnoozedView();
  } else {
    filterReceivedTasks();
  }
}

// Watch for SPA DOM Updates & Continually Scrape Notes / Inject OTC Drawer
let observerTimeout = null;
const observer = new MutationObserver(() => {
  captureTaskNotesFromDetails();

  if (observerTimeout) return;
  
  observerTimeout = setTimeout(() => {
    observerTimeout = null;
    
    // 1. Task features (only run if on tasks page)
    if (isTasksPage()) {
      if (!document.getElementById('active-snooze-popover') && !document.querySelector('.modmed-color-palette-popup')) {
        injectSnoozedTab();
        injectTaskCustomColumns();
        applyTaskFiltering();
      }
    }

    // 2. Financial / Add Charge features (runs whenever the charge modal is opened)
    injectDrawerTriggerButton();
    injectDropdownShortcuts();

  }, 350);
});

observer.observe(document.body, { childList: true, subtree: true });

// --- OPTION 3: NATIVE DROPDOWN OTC SHORTCUTS (FROM TAMPERMONKEY) ---
const otcShortcuts = [
    { label: "⭐ Pedi C", code: "NOTCPediC", price: "75.00", desc: "Pedi-C" },
    { label: "⭐ Pedi A", code: "NOTCPecliA", price: "54.00", desc: "Pedi-A" },
    { label: "⭐ Tip (for Salon or Laser)", code: "NOTCTIP", price: "0.00", desc: "Tip" },
    { label: "⭐ Laser Package (6)", code: "NC-NOTCLS6PKG", price: "745.00", desc: "6 Laser Package" },
    { label: "⭐ Maintenance Laser Individual", code: "NC-NOTCLS50", price: "75.00", desc: "Maintenance Laser Individual" },
    { label: "⭐ Individual Laser Treatment", code: "NC-NOTCLSIND", price: "155.00", desc: "Individual Laser Treatment" },
    { label: "⭐ Selfpay Orthotic", code: "OTC-1258", price: "625.00", desc: "Selfpay Orthotic" },
    { label: "⭐ 2nd Pair Orthotics", code: "OTC-1259", price: "415.00", desc: "2nd Pair Orthotics" },
    { label: "⭐ Post-Op Kit", code: "OTC-0010", price: "19.50", desc: "Amerigel Post-Op" },
    { label: "⭐ Clarus Antifungal Solution", code: "OTC-0071", price: "41.83", desc: "Clarus Antifungal Solution" },
    { label: "⭐ Kera Nail Gel", code: "OTC-0216", price: "53.63", desc: "Kera Nail Gel" },
    { label: "⭐ VerruStat", code: "OTC-0404", price: "34.27", desc: "VerruStat Liquid Wart Solution" },
    { label: "⭐ Tolcylen Nail Solution", code: "OTC-0028", price: "75.00", desc: "Tolcylen Nail Solution" },
    { label: "⭐ Tolcylen Soak (Large bag)", code: "OTC-0370", price: "97.60", desc: "Tolcylen Soak (Large bag)" },
    { label: "⭐ Kera-42 Cream", code: "OTC-0390", price: "48.26", desc: "Kera-42 Cream" },
    { label: "⭐ PRP Injection", code: "PRPINJ2", price: "950.00", desc: "PRP Injection" },
    { label: "⭐ Post Op Shoe", code: "OTC-0302", price: "30.00", desc: "Post Op Shoe" }
    // (Add any other short items you want here)
];

function isProductSelector(selectElem) {
    if (!selectElem) return false;
    if (selectElem.closest('mmpm-charge-product-selector')) return true;
    const parentContainer = selectElem.parentElement || selectElem.closest('.form-group, td, th, div');
    if (parentContainer) {
        const labelText = parentContainer.innerText || '';
        if (labelText.includes('Product') || labelText.includes('Charge') || labelText.includes('Code')) {
            return true;
        }
    }
    const input = selectElem.querySelector('input');
    if (input) {
        const attr = (input.getAttribute('formcontrolname') || input.getAttribute('data-identifier') || '').toLowerCase();
        if (attr.includes('product') || attr.includes('charge') || attr.includes('code')) return true;
    }
    return false;
}

function injectDropdownShortcuts() {
    const panel = document.querySelector('ng-dropdown-panel');
    if (!panel || panel.dataset.shortcutsAdded) return;
    
    const activeSelect = document.querySelector('ng-select.ng-select-opened');
    if (!activeSelect || !isProductSelector(activeSelect)) return;
    
    const currentRow = activeSelect.closest('tr') || activeSelect.closest('.ema-form-row') || activeSelect.closest('.charge-row');
    const scrollHost = panel.querySelector('.scroll-host');
    if (!scrollHost) return;

    scrollHost.style.maxHeight = '120px';
    scrollHost.style.overflowY = 'auto';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'max-height: 250px; overflow-y: auto; border-bottom: 1px solid #ccc; background: transparent;';
    
    const header = document.createElement('div');
    header.className = 'ng-option-disabled ng-optgroup';
    header.style.cssText = 'color: rgb(80, 45, 127); font-weight: 700; padding: 8px 10px; font-size: 13px; cursor: default; user-select: none;';
    header.innerText = 'OTC Shortcuts';
    wrapper.appendChild(header);

    otcShortcuts.forEach(item => {
        const div = document.createElement('div');
        div.className = 'ng-option custom-shortcut-option';
        div.style.cssText = 'border-bottom: 1px solid #f0f0f0; cursor: pointer; padding: 8px 12px; font-size: 13px;';
        div.innerHTML = `<span style="font-weight: 500; color: #1565c0;">${item.label}</span>`;
        
        div.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const input = activeSelect.querySelector('input[type="text"]');
            if (input) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                nativeInputValueSetter.call(input, item.code);
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));

                const startTime = Date.now();
                const maxWait = 2000;
                const attemptSelection = () => {
                    const options = Array.from(scrollHost.querySelectorAll('.ng-option:not(.custom-shortcut-option)'));
                    const target = options.find(opt => opt.innerText.trim().includes(item.code) || opt.innerText.trim().includes(item.desc));
                    if (target) {
                        target.click();
                        setTimeout(() => {
                            if (currentRow) {
                                updateInputInRow(currentRow, 'description', item.desc);
                                updateInputInRow(currentRow, 'actual-amount', item.price);
                                updateInputInRow(currentRow, 'original-amount', item.price);
                                updateInputInRow(currentRow, 'unit-charge', item.price);
                            }
                        }, 100);
                    } else if (Date.now() - startTime < maxWait) {
                        setTimeout(attemptSelection, 50);
                    } else {
                        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
                    }
                };
                attemptSelection();
            }
        };
        wrapper.appendChild(div);
    });

    panel.insertBefore(wrapper, scrollHost);
    panel.dataset.shortcutsAdded = "true";
}

function updateInputInRow(rowElement, identifier, val) {
    if (!val || !rowElement) return;
    const el = rowElement.querySelector(`input[data-identifier="${identifier}"], input[formcontrolname="${identifier}"], input[name*="${identifier}"]`);
    if (el) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeSetter.call(el, val);
        ['input', 'change', 'blur'].forEach(ev => el.dispatchEvent(new Event(ev, { bubbles: true })));
    }
}

// --- OPTION 2: SIDE DRAWER OTC QUICK-PICKER ---

// Define your structured OTC list with categories
const otcCategories = [
  {
    category: "Injections & Procedures",
    items: [
      { label: "PRP Injection", code: "PRPINJ2", price: "950.00", desc: "PRP Injection" },
      { label: "Pedi C", code: "NOTCPediC", price: "75.00", desc: "Pedi-C" },
      { label: "Pedi A", code: "NOTCPecliA", price: "54.00", desc: "Pedi-A" }
    ]
  },
  {
    category: "Laser Treatments",
    items: [
      { label: "Laser Package (6)", code: "NC-NOTCLS6PKG", price: "745.00", desc: "6 Laser Package" },
      { label: "Maintenance Laser Individual", code: "NC-NOTCLS50", price: "75.00", desc: "Maintenance Laser Individual" },
      { label: "Individual Laser Treatment", code: "NC-NOTCLSIND", price: "155.00", desc: "Individual Laser Treatment" },
      { label: "Tip (for Salon or Laser)", code: "NOTCTIP", desc: "Tip" }
    ]
  },
  {
    category: "Orthotics & Braces",
    items: [
      { label: "Selfpay Orthotic", code: "OTC-1258", price: "625.00", desc: "Selfpay Orthotic" },
      { label: "2nd Pair Orthotics", code: "OTC-1259", price: "415.00", desc: "2nd Pair Orthotics" },
      { label: "Redi-Thotics Comfort", code: "OTC-0282", price: "56.84", desc: "Redi-Thotics Comfort" },
      { label: "Post Op Shoe", code: "OTC-0302", price: "30.00", desc: "Post Op Shoe" }
    ]
  },
  {
    category: "Solutions & Creams",
    items: [
      { label: "Tolcylen Nail Solution", code: "OTC-0028", price: "75.00", desc: "Tolcylen Nail Solution" },
      { label: "Tolcylen Soak (Large bag)", code: "OTC-0370", price: "97.60", desc: "Tolcylen Soak (Large bag)" },
      { label: "Kera Nail Gel", code: "OTC-0216", price: "53.63", desc: "Kera Nail Gel" },
      { label: "Kera-42 Cream", code: "OTC-0390", price: "48.26", desc: "Kera-42 Cream" }
    ]
  }
];

function injectDrawerTriggerButton() {
  // Check if we are inside the Add Charge modal/section
  const chargeModal = document.querySelector('mmpm-charge-product-selector, .modal-content, [id*="charge"]');
  if (!chargeModal || document.getElementById('danmed-launch-drawer')) return;

  // Find the button area container (near [Add Discount] or the bottom post buttons)
  const actionContainer = chargeModal.querySelector('.modal-footer, .button-row, div:has(> [Post Charges & Close])') || 
                          chargeModal.querySelector('div:has(> [Cancel])') ||
                          chargeModal.querySelector('mmpm-charge-product-selector').parentElement;
                          
  if (!actionContainer) return;

  // Create the trigger button
  const triggerBtn = document.createElement('button');
  triggerBtn.id = 'danmed-launch-drawer';
  triggerBtn.className = 'danmed-open-drawer-btn';
  triggerBtn.type = 'button';
  triggerBtn.innerHTML = '⚡ OTC Quick Catalog';
  
  triggerBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggleOtcDrawer(true);
  });

  // Style it nicely so it fits right into the ModMed layout toolbar
  triggerBtn.style.cssText = `
    background-color: #502d7f;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;
    margin: 8px 0;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  `;

  // Insert it cleanly under the charge items container
  actionContainer.prepend(triggerBtn);
}

function toggleOtcDrawer(open) {
  let drawer = document.getElementById('danmed-otc-drawer');
  if (!drawer && open) {
    drawer = createOtcDrawer();
    document.body.appendChild(drawer);
  }
  if (drawer) {
    if (open) {
      drawer.classList.add('open');
    } else {
      drawer.classList.remove('open');
    }
  }
}

function createOtcDrawer() {
  const drawer = document.createElement('div');
  drawer.id = 'danmed-otc-drawer';
  drawer.className = 'danmed-otc-drawer';

  // Header
  const header = document.createElement('div');
  header.className = 'danmed-otc-header';
  header.innerHTML = `<span>⚡ OTC Catalog Quick-Picker</span>`;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'danmed-otc-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = () => toggleOtcDrawer(false);
  header.appendChild(closeBtn);
  drawer.appendChild(header);

  // Search Bar
  const searchBox = document.createElement('div');
  searchBox.className = 'danmed-otc-search-box';
  const searchInput = document.createElement('input');
  searchInput.className = 'danmed-otc-search-input';
  searchInput.type = 'text';
  searchInput.placeholder = 'Search items by name or code...';
  searchBox.appendChild(searchInput);
  drawer.appendChild(searchBox);

  // Body Content Container
  const body = document.createElement('div');
  body.className = 'danmed-otc-body';
  drawer.appendChild(body);

  const renderItems = (filterText = '') => {
    body.innerHTML = '';
    const query = filterText.toLowerCase();

    otcCategories.forEach(cat => {
      const filteredItems = cat.items.filter(item => 
        item.label.toLowerCase().includes(query) || 
        item.code.toLowerCase().includes(query) || 
        item.desc.toLowerCase().includes(query)
      );

      if (filteredItems.length === 0) return;

      const catTitle = document.createElement('div');
      catTitle.className = 'danmed-otc-category-title';
      catTitle.innerText = cat.category;
      body.appendChild(catTitle);

      filteredItems.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'danmed-otc-item';
        itemEl.innerHTML = `
          <span class="danmed-otc-item-label">${item.label}</span>
          <span class="danmed-otc-item-price">$${item.price || '0.00'}</span>
        `;

        itemEl.onclick = () => {
          selectOtcItem(item);
          toggleOtcDrawer(false);
        };

        body.appendChild(itemEl);
      });
    });
  };

  searchInput.oninput = (e) => renderItems(e.target.value);
  renderItems();

  return drawer;
}

function selectOtcItem(item) {
  // Target the currently active product search input in ModMed
  const activeSelect = document.querySelector('ng-select.ng-select-opened, ng-select');
  if (!activeSelect) return;

  const input = activeSelect.querySelector('input[type="text"]');
  const currentRow = activeSelect.closest('tr') || activeSelect.closest('.ema-form-row') || activeSelect.closest('.charge-row');

  if (input) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    nativeInputValueSetter.call(input, item.code);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    // Simulate clicking the matching dropdown result
    setTimeout(() => {
      const panel = document.querySelector('ng-dropdown-panel');
      if (panel) {
        const options = Array.from(panel.querySelectorAll('.ng-option'));
        const target = options.find(opt => opt.innerText.trim().includes(item.code) || opt.innerText.trim().includes(item.desc));
        if (target) {
          target.click();
        }
      }

      // Auto-populate price and description fields in the active row
      if (currentRow) {
        updateInputInRow(currentRow, 'description', item.desc);
        updateInputInRow(currentRow, 'actual-amount', item.price);
        updateInputInRow(currentRow, 'original-amount', item.price);
        updateInputInRow(currentRow, 'unit-charge', item.price);
      }
    }, 200);
  }
}
