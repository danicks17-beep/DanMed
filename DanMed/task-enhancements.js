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
  const getTaskData = () => new Promise(resolve => chrome.storage.local.get(['taskLabels', 'taskLabelColors'], result => resolve({ labels: result.taskLabels || {}, colors: result.taskLabelColors || {} })));
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
  function hideDueDateColumn() {
    if (!isTasksPage()) return;
    const header = Array.from(document.querySelectorAll('table thead th')).find(th => /^Due Date$/i.test(valueText(th)));
    if (!header) return;
    const index = Array.from(header.parentElement.children).indexOf(header);
    header.style.display = 'none';
    header.parentElement.parentElement.querySelectorAll('tbody tr').forEach(row => { if (row.children[index]) row.children[index].style.display = 'none'; });
  }

  function taskId(row) { return typeof getTaskIdFromRow === 'function' ? getTaskIdFromRow(row) : null; }
  function labelNames(labels) { return [...new Set(Object.values(labels).filter(Boolean))].sort((a, b) => a.localeCompare(b)); }
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
    const labels = labelNames(data.labels);
    tablist.querySelectorAll('.danmed-label-tab').forEach(tab => { if (!labels.includes(tab.dataset.label)) tab.remove(); });
    labels.forEach(label => {
      let tab = Array.from(tablist.querySelectorAll('.danmed-label-tab')).find(item => item.dataset.label === label);
      if (!tab) {
        tab = document.createElement('li');
        tab.className = 'danmed-label-tab';
        tab.dataset.label = label;
        const link = document.createElement('a');
        link.href = '#';
        link.setAttribute('role', 'tab');
        link.className = 'danmed-label-tab-link';
        link.innerHTML = '<span class="danmed-label-dot"></span><span class="danmed-label-name"></span>';
        link.querySelector('.danmed-label-name').textContent = label;
        link.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          tablist.querySelectorAll('li').forEach(item => item.classList.remove('active', 'selected'));
          tab.classList.add('active');
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
    const labels = labelNames(data.labels);
    const anchor = Array.from(document.querySelectorAll('button, div, span')).find(el => /^Filters$/i.test(valueText(el)));
    const host = anchor?.parentElement;
    if (!host) return;
    let box = host.querySelector('.danmed-label-filters');
    if (!labels.length) { box?.remove(); return; }
    if (!box) { box = document.createElement('div'); box.className = 'danmed-label-filters'; host.appendChild(box); }
    box.innerHTML = '<strong>Labels:</strong>';
    labels.forEach(label => {
      const labelEl = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox'; checkbox.checked = true; checkbox.dataset.label = label;
      checkbox.addEventListener('change', () => {
        const selected = [...box.querySelectorAll('input:checked')].map(input => input.dataset.label);
        document.querySelectorAll('table tbody tr').forEach(row => { const id = taskId(row); row.style.display = data.labels[id] && !selected.includes(data.labels[id]) ? 'none' : ''; });
      });
      labelEl.append(checkbox, document.createTextNode(label)); box.appendChild(labelEl);
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

  async function reassignTask(search, status) {
    if (reassignmentBusy) return;
    reassignmentBusy = true;
    status.textContent = 'Opening reassignment…';
    try {
      const action = await waitFor(() => Array.from(document.querySelectorAll('ng-select')).find(select => /Select Task Action/i.test(selectLabel(select))));
      if (!action || !(await chooseNgSelect(action, 'Reassign'))) throw new Error('Reassign action was not available');
      const assignTo = await waitFor(() => findSelect(/^(Assign To|Assigned To)\b/i), 5000);
      if (!assignTo || !(await chooseNgSelect(assignTo, search))) throw new Error('Assign To selector was not available');
      const selected = valueText(assignTo);
      if (!selected.toLowerCase().includes(search.toLowerCase().split(',')[0].toLowerCase())) throw new Error('Assignee selection was not confirmed');
      const save = await waitFor(() => Array.from(document.querySelectorAll('button, a, input[type="button"]')).find(button => /^Save$/i.test(valueText(button) || button.value) && !button.disabled), 5000);
      if (!save) throw new Error('Save button was not available after selecting the assignee');
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
      setTaskPageSize(); hideDueDateColumn();
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
