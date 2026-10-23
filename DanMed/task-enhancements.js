(() => {
  'use strict';

  const SETTINGS_KEY = 'extensionSettings';
  const STAFF = [
    ['Lyndsye Sellars', 'Sellars, Lyndsye'], ['Skylar Pritchett', 'Pritchett, Skylar'], ['Paige Barnes', 'Barnes, Paige'],
    ['Paige Kirk', 'Kirk, Paige'], ['Jimmy Ngo', 'Ngo, Jimmy'], ['Anjali Shah', 'Shah, Anjali'], ['Robbie Leonardo', 'Leonardo, Robert'],
    ['Madison Moraja', 'Moraja, Madison'], ['Jessica Richardson', 'Richardson, Jessica'], ['Joshua Robison', 'Robison, Joshua'],
    ['Grace Patel', 'Patel, Grace'], ['Sudhanshu Deshpande', 'Deshpande, Sudhanshu'], ['Ashton Andrews', 'Andrews, Ashton'],
    ['Sharon Higgs', 'Higgs, Sharon'], ['Meg Risinger', 'Risinger, Meg'], ['Dan Nicks', 'Nicks, Dan'], ['Sade Dennis', 'Dennis, Sade'],
    ['Shelia Hackley', 'Hackley, Shelia'], ['Deon Croom', 'Croom, Deon']
  ].map(([label, search]) => ({ label, search }));

  let settings = { masterEnable: true, featureTasks: true };
  let refreshTimer;
  let reassignmentBusy = false;
  const isTasksPage = () => window.location.hash.includes('/tasks/manage/');
  const isTaskDetails = () => /task-details|\/task\/|communication\//i.test(window.location.hash) && !isTasksPage();
  const valueText = el => (el?.innerText || el?.textContent || '').trim();
  const enabled = () => settings.masterEnable && settings.featureTasks !== false;
  const getTaskData = () => new Promise(resolve => chrome.storage.local.get(['taskLabels', 'taskLabelColors', 'customPaletteColors', 'customPaletteLabels'], result => {
    const paletteColors = result.customPaletteColors || ['#fef08a', '#bbf7d0', '#bae6fd', '#fbcfe8', '#fed7aa'];
    const savedLabels = result.customPaletteLabels || [];
    resolve({ labels: result.taskLabels || {}, colors: result.taskLabelColors || {}, paletteColors, paletteLabels: paletteColors.map((_, index) => savedLabels[index] || `Color ${index + 1}`) });
  }));
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const waitFor = async (fn, timeout = 5000, interval = 100) => { const end = Date.now() + timeout; while (Date.now() < end) { const value = fn(); if (value) return value; await wait(interval); } return null; };

  function selectLabel(select) {
    const group = select.closest('.form-group, .form-field, .field, [role="group"]');
    const label = group?.querySelector('label, .ng-label, .form-label') || select.previousElementSibling;
    return `${valueText(label)} ${select.querySelector('.ng-placeholder, input')?.getAttribute('placeholder') || ''}`.trim();
  }
  function setNativeValue(input, value) {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (setter) setter.call(input, value); else input.value = value;
  }
  function fire(el) { ['mousedown', 'mouseup', 'click'].forEach(type => el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }))); }
  function isCancellationSelect(select) { return /cancell?ation\s+reason|reason\s+for\s+cancell?ation/i.test(selectLabel(select)); }

  async function chooseNgSelect(select, search) {
    if (!select || isCancellationSelect(select)) return false;
    select.querySelector('.ng-select-container')?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    const input = await waitFor(() => select.querySelector('input[type="text"]'), 3000);
    if (!input) return false;
    setNativeValue(input, search);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const option = await waitFor(() => Array.from(document.querySelectorAll('ng-dropdown-panel .ng-option')).find(item => valueText(item).toLowerCase().includes(search.toLowerCase())), 5000);
    if (!option) return false;
    fire(option);
    await wait(250);
    return true;
  }
  function findSelect(pattern) { return Array.from(document.querySelectorAll('ng-select')).find(select => pattern.test(selectLabel(select)) && !isCancellationSelect(select)); }
  function findNativeSelect(pattern) { return Array.from(document.querySelectorAll('select')).find(select => pattern.test(valueText(select.closest('.form-group, .form-field') || select.parentElement))); }

  function setTaskPageSize() {
    if (!isTasksPage()) return;
    const native = Array.from(document.querySelectorAll('select')).find(select => /View Records By/i.test(valueText(select.closest('.form-group, .form-field, td, div') || select.parentElement)));
    if (native) { const option = Array.from(native.options).find(item => item.value === '100' || valueText(item) === '100'); if (option && native.value !== option.value) { native.value = option.value; native.dispatchEvent(new Event('change', { bubbles: true })); } }
    const ng = Array.from(document.querySelectorAll('ng-select')).find(select => /View Records By/i.test(selectLabel(select))); if (ng && !/100/.test(valueText(ng))) chooseNgSelect(ng, '100');
  }
  function taskId(row) { return typeof getTaskIdFromRow === 'function' ? getTaskIdFromRow(row) : null; }
  function labelNames(data) { return [...new Set([...Object.values(data.labels), ...data.paletteLabels].filter(Boolean))].sort((a, b) => a.localeCompare(b)); }
  function applyLabelFilter(label, labels) {
    document.querySelectorAll('table tbody tr').forEach(row => {
      const id = taskId(row);
      row.style.display = !label || labels[id] === label ? '' : 'none';
    });
  }
  function removeTaskEnhancements() {
    document.querySelectorAll('.danmed-label-tab, .danmed-label-filters, .danmed-last-visit, .danmed-reassign-panel').forEach(el => el.remove());
    document.querySelectorAll('table tbody tr').forEach(row => { if (row.dataset.danmedLabelFiltered) { row.style.display = ''; delete row.dataset.danmedLabelFiltered; } });
  }
  function injectLabelTabs(data) {
    if (!isTasksPage()) return;
    const tablist = document.querySelector('ul[role="tablist"]');
    const snoozed = document.getElementById('snoozed-tab-btn');
    if (!tablist || !snoozed) return;
    const labels = [...new Set(Object.values(data.labels).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    tablist.querySelectorAll('.danmed-label-tab').forEach(tab => { if (!labels.includes(tab.dataset.label)) tab.remove(); });
    labels.forEach(label => {
      let tab = Array.from(tablist.querySelectorAll('.danmed-label-tab')).find(item => item.dataset.label === label);
      if (!tab) {
        tab = snoozed.cloneNode(true);
        tab.removeAttribute('id');
        tab.classList.add('danmed-label-tab');
        tab.dataset.label = label;
        const link = tab.querySelector('a, button, span, div') || tab;
        link.innerHTML = '';
        link.href = '#';
        link.setAttribute('role', 'tab');
        link.classList.add('danmed-label-tab-link');
        link.innerHTML = '<span class="danmed-label-dot"></span><span class="danmed-label-name"></span>';
        link.querySelector('.danmed-label-name').textContent = label;
        link.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          tablist.querySelectorAll('li').forEach(item => item.classList.remove('active', 'selected'));
          tablist.querySelectorAll('li a, li button').forEach(item => item.classList.remove('active', 'selected'));
          tab.classList.add('active');
          link.classList.add('active');
          sessionStorage.setItem('danmed_active_label', label);
          applyLabelFilter(label, data.labels);
        });
        tab.appendChild(link);
        tablist.insertBefore(tab, snoozed.nextSibling);
      }
      tab.querySelector('.danmed-label-dot').style.backgroundColor = data.colors[Object.keys(data.labels).find(id => data.labels[id] === label)] || '#cbd5e1';
    });
  }
  function injectLabelFilters(data) {
    if (!isTasksPage()) return;
    const labels = labelNames(data);
    const anchor = Array.from(document.querySelectorAll('button, div, span')).find(el => /^Filters$/i.test(valueText(el)));
    const host = anchor?.parentElement;
    if (!host) return;
    let box = host.querySelector('.danmed-label-filters');
    if (!labels.length) { box?.remove(); return; }
    if (!box) { box = document.createElement('div'); box.className = 'danmed-label-filters'; anchor.insertAdjacentElement('afterend', box); }
    box.innerHTML = '<strong>Labels:</strong>';
    labels.forEach(label => {
      const labelEl = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox'; checkbox.checked = true; checkbox.dataset.label = label;
      const dot = document.createElement('span');
      dot.className = 'danmed-label-dot';
      const paletteIndex = data.paletteLabels.indexOf(label);
      dot.style.backgroundColor = paletteIndex >= 0 ? data.paletteColors[paletteIndex] : '#cbd5e1';
      checkbox.addEventListener('change', () => {
        const selected = [...box.querySelectorAll('input:checked')].map(input => input.dataset.label);
        document.querySelectorAll('table tbody tr').forEach(row => { const id = taskId(row); row.style.display = data.labels[id] && !selected.includes(data.labels[id]) ? 'none' : ''; });
      });
      labelEl.append(checkbox, dot, document.createTextNode(label)); box.appendChild(labelEl);
    });
  }

  function renderLastVisitProvider() {
    if (!isTaskDetails() || document.querySelector('.danmed-last-visit')) return;
    const page = valueText(document.body);
    const match = page.match(/Last (?:Finalized )?Visit[^\n]{0,100}?(?:with|Provider)?\s*[:\-]?\s*([A-Z][^\n,]{2,40}(?:,\s*[A-Z][^\n]{2,40})?)/i);
    if (!match) return;
    const card = document.createElement('div'); card.className = 'danmed-last-visit';
    const title = document.createElement('strong'); title.textContent = 'Last visit provider';
    const value = document.createElement('span'); value.textContent = match[1].trim();
    card.append(title, value); document.body.appendChild(card);
  }

  function visible(el) { return el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none'; }
  function exactText(text) {
    const target = text.trim().toLowerCase();
    return Array.from(document.querySelectorAll('button, a, [role="button"], [role="option"], li, span, div')).filter(el => visible(el) && !el.closest('.danmed-reassign-panel') && valueText(el).toLowerCase() === target).sort((a, b) => a.textContent.length - b.textContent.length)[0] || null;
  }
  const TASK_ACTION_CONTAINER_SELECTOR = '#app-content > ema-staff-nav-tabs > ema-menu-nav > div > ema-task-detail > div > div > div.container-fluid.fullscreen-header.fullscreen-header-fixed > ema-task-detail-header > div.container > div > div > div > div';
  async function clickTaskActionButton() {
    const button = await waitFor(() => {
      const container = document.querySelector(TASK_ACTION_CONTAINER_SELECTOR);
      return container?.querySelector('[data-identifier="select-task-button"], button');
    }, 3000);
    if (!button || !visible(button)) return false;
    button.click();
    return Boolean(await waitFor(() => {
      const menu = document.querySelector('[data-identifier="dropdown-basic"]');
      return menu && visible(menu) && menu.getAttribute('aria-hidden') !== 'true' ? menu : null;
    }, 4000));
  }
  async function clickTaskAction(action) {
    const identifier = `task-action-${action}`;
    const item = await waitFor(() => document.querySelector(`[data-identifier="${identifier}"]`), 4000);
    if (!item || !visible(item)) return false;
    item.click();
    return Boolean(await waitFor(() => document.querySelector('[role="dialog"]') || !document.querySelector(`[data-identifier="${identifier}"]`), 4000));
  }
  async function clickExact(text, timeout = 5000) {
    const el = await waitFor(() => exactText(text), timeout);
    if (!el) return false;
    el.click();
    await wait(250);
    return true;
  }
  async function chooseActionOption(optionText) {
    const actionSelect = Array.from(document.querySelectorAll('ng-select')).find(select => /Select Task Action/i.test(selectLabel(select)));
    if (actionSelect) return chooseNgSelect(actionSelect, optionText);
    return clickExact(optionText);
  }
  async function openReassignPath(status) {
    status.textContent = 'Opening task reassignment…';
    // Preferred path: press ModMed's task-action header button, then Assign To Me → Reassign.
    let menuOpened = await clickTaskActionButton();
    if (menuOpened && await clickExact('Assign To Me', 2500)) {
      status.textContent = 'Selecting Reassign…';
      await clickTaskActionButton();
      if (await clickExact('Reassign', 4000)) return true;
    }
    // Fallback paths begin by pressing the same header button.
    if (!menuOpened) menuOpened = await clickTaskActionButton();
    // Select Task Action → Reassign, or Select Task Action → Assign to me → Reassign.
    if (menuOpened && await clickTaskAction('REASSIGN')) return true;
    const actionSelect = await waitFor(() => Array.from(document.querySelectorAll('ng-select')).find(select => /Select Task Action/i.test(selectLabel(select))), 2500);
    if (actionSelect) {
      // Direct path: Select Task Action → Reassign.
      if (await chooseNgSelect(actionSelect, 'Reassign')) return true;
      // Alternate path: Select Task Action → Assign to me → Reassign.
      if (!(await chooseNgSelect(actionSelect, 'Assign to me'))) return false;
      status.textContent = 'Selecting Reassign…';
      return (await clickTaskAction('REASSIGN')) || (await chooseActionOption('Reassign'));
    }
    if (await clickExact('Select Task Action', 1500)) {
      if (await clickExact('Reassign', 1800)) return true;
      if (!(await clickExact('Assign to me', 4000))) return false;
      status.textContent = 'Selecting Reassign…';
      return (await clickTaskAction('REASSIGN')) || (await clickExact('Reassign', 4000));
    }
    return false;
  }
  async function fillAssignee(search) {
    const dialog = await waitFor(() => document.querySelector('[role="dialog"]'), 5000);
    const modalInput = dialog && await waitFor(() => dialog.querySelector('input[placeholder*="Search for users and groups" i], [role="combobox"] input[type="text"]'), 3000);
    if (modalInput) {
      modalInput.focus();
      setNativeValue(modalInput, search);
      modalInput.dispatchEvent(new Event('input', { bubbles: true }));
      modalInput.dispatchEvent(new Event('change', { bubbles: true }));
      const option = await waitFor(() => Array.from(document.querySelectorAll('[role="option"], ng-dropdown-panel .ng-option')).find(item => visible(item) && valueText(item).toLowerCase().includes(search.toLowerCase())), 5000);
      if (!option) return false;
      option.click();
      await wait(350);
      return Boolean(dialog && valueText(dialog).toLowerCase().includes(search.toLowerCase().split(',')[0].toLowerCase()));
    }
    const assignTo = await waitFor(() => findSelect(/^(Assign To|Assigned To)\b/i), 5000);
    if (assignTo) return chooseNgSelect(assignTo, search);
    const native = findNativeSelect(/^(Assign To|Assigned To)\b/i);
    if (native) {
      const option = Array.from(native.options).find(item => valueText(item).toLowerCase().includes(search.toLowerCase()) || item.value === search);
      if (!option) return false;
      native.value = option.value;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await wait(250);
      return true;
    }
    if (!(await clickExact('Assign To', 4000))) return false;
    const input = await waitFor(() => Array.from(document.querySelectorAll('input[type="text"], input[type="search"]')).find(candidate => visible(candidate) && !candidate.closest('.danmed-reassign-panel')), 3000);
    if (!input) return false;
    setNativeValue(input, search);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const option = await waitFor(() => Array.from(document.querySelectorAll('ng-dropdown-panel .ng-option, [role="option"]')).find(item => visible(item) && valueText(item).toLowerCase().includes(search.toLowerCase())), 5000);
    if (!option) return false;
    fire(option);
    await wait(250);
    return true;
  }
  async function reassignTask(search, status) {
    if (reassignmentBusy) return;
    reassignmentBusy = true;
    try {
      if (!(await openReassignPath(status))) throw new Error('Could not complete Assign To Me / Select Task Action → Reassign');
      status.textContent = 'Selecting Assign To…';
      if (!(await fillAssignee(search))) throw new Error('Assign To dropdown or staff option was not available');
      const dialog = document.querySelector('[role="dialog"]');
      const selected = valueText(dialog);
      if (!selected.toLowerCase().includes(search.toLowerCase().split(',')[0].toLowerCase())) throw new Error('Staff member was not confirmed in Assign To');
      const save = await waitFor(() => Array.from(dialog?.querySelectorAll('button, a, input[type="button"]') || []).find(button => visible(button) && /^Save$/i.test(valueText(button) || button.value) && !button.disabled), 5000);
      if (!save) throw new Error('Save was not available after selecting the staff member');
      status.textContent = 'Saving reassignment…';
      save.click();
      await wait(500);
      status.textContent = 'Reassigned';
    } catch (error) {
      status.textContent = error.message || 'Reassignment failed';
    } finally {
      reassignmentBusy = false;
    }
  }
  function renderReassignPanel() {
    if (!enabled() || !isTaskDetails()) { document.querySelectorAll('.danmed-reassign-panel').forEach(el => el.remove()); return; }
    if (document.querySelector('.danmed-reassign-panel')) return;
    const panel = document.createElement('aside'); panel.className = 'danmed-reassign-panel'; panel.setAttribute('data-modmed-style', 'staff-quick-view');
    panel.innerHTML = '<div class="danmed-reassign-title">Quick Reassign</div><input type="search" placeholder="Find staff…"><div class="danmed-reassign-status" role="status"></div><div class="danmed-reassign-list"></div>';
    const input = panel.querySelector('input'); const list = panel.querySelector('.danmed-reassign-list'); const status = panel.querySelector('.danmed-reassign-status');
    const render = () => { const query = input.value.toLowerCase(); list.innerHTML = ''; STAFF.filter(item => !query || `${item.label} ${item.search}`.toLowerCase().includes(query)).forEach(item => { const button = document.createElement('button'); button.type = 'button'; button.textContent = item.label; button.addEventListener('click', () => reassignTask(item.search, status)); list.appendChild(button); }); };
    input.addEventListener('input', render); document.body.appendChild(panel); render();
  }

  function refresh() {
    if (!enabled()) { removeTaskEnhancements(); return; }
    if (!isTasksPage() && !isTaskDetails()) { removeTaskEnhancements(); return; }
    if (isTasksPage()) {
      document.querySelectorAll('.danmed-reassign-panel, .danmed-last-visit').forEach(el => el.remove());
      setTaskPageSize();
      getTaskData().then(data => { injectLabelTabs(data); injectLabelFilters(data); });
    } else {
      document.querySelectorAll('.danmed-label-tab, .danmed-label-filters').forEach(el => el.remove());
      renderLastVisitProvider(); renderReassignPanel();
    }
  }

  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && (changes[SETTINGS_KEY] || changes.taskLabels || changes.taskLabelColors)) refresh(); });
  chrome.storage.local.get([SETTINGS_KEY], result => {
    settings = { ...settings, ...(result[SETTINGS_KEY] || {}) };
    const observer = new MutationObserver(() => { clearTimeout(refreshTimer); refreshTimer = setTimeout(refresh, 250); });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', refresh);
    refresh();
  });
})();
