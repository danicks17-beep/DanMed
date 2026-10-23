(() => {
  'use strict';

  const DEFAULT_SETTINGS = {
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

  const STORAGE_KEY = 'extensionSettings';
  const OTC_KEY = 'danmedOtcShortcuts';
  const FAV_KEY = 'danmedOtcFavorites';
  let settings = { ...DEFAULT_SETTINGS };
  let refreshTimer = null;

  const OTC_DEFAULTS = [
    { label: 'Pedi C', code: 'NOTCPediC', price: '75.00', desc: 'Pedi-C', category: 'Clinical & Procedures' },
    { label: 'Pedi A', code: 'NOTCPecliA', price: '54.00', desc: 'Pedi-A', category: 'Clinical & Procedures' },
    { label: 'Tip (for Salon or Laser)', code: 'NOTCTIP', desc: 'Tip', category: 'Clinical & Procedures' },
    { label: 'Laser Package (6)', code: 'NC-NOTCLS6PKG', price: '745.00', desc: '6 Laser Package', category: 'Clinical & Procedures' },
    { label: 'Maintenance Laser Individual', code: 'NC-NOTCLS50', price: '75.00', desc: 'Maintenance Laser Individual', category: 'Clinical & Procedures' },
    { label: 'Individual Laser Treatment', code: 'NC-NOTCLSIND', price: '155.00', desc: 'Individual Laser Treatment', category: 'Clinical & Procedures' },
    { label: 'Selfpay Orthotic', code: 'OTC-1258', price: '625.00', desc: 'Selfpay Orthotic', category: 'Orthotics & Supports' },
    { label: '2nd Pair Orthotics', code: 'OTC-1259', price: '415.00', desc: '2nd Pair Orthotics', category: 'Orthotics & Supports' },
    { label: 'Post-Op Kit', code: 'OTC-0010', price: '19.50', desc: 'Amerigel Post-Op', category: 'Wound Care' },
    { label: 'Clarus Antifungal Solution', code: 'OTC-0071', price: '41.83', desc: 'Clarus Antifungal Solution', category: 'Antifungal & Nail Care' },
    { label: 'Kera Nail Gel', code: 'OTC-0216', price: '53.63', desc: 'Kera Nail Gel', category: 'Antifungal & Nail Care' },
    { label: 'VerruStat', code: 'OTC-0404', price: '34.27', desc: 'VerruStat Liquid Wart Solution', category: 'Antifungal & Nail Care' },
    { label: 'Tolcylen Nail Solution', code: 'OTC-0028', price: '75.00', desc: 'Tolcylen Nail Solution', category: 'Antifungal & Nail Care' },
    { label: 'Tolcylen Soak (5 pack)', code: 'OTC-0368', price: '63.28', desc: 'Tolcylen Soak (5 pack)', category: 'Antifungal & Nail Care' },
    { label: 'Tolcylen Soak (Small bag / 7 soaks)', code: 'OTC-0369', price: '74.25', desc: 'Tolcylen Soak (Small bag / 7 soaks)', category: 'Antifungal & Nail Care' },
    { label: 'Tolcylen Soak (Large bag)', code: 'OTC-0370', price: '97.60', desc: 'Tolcylen Soak (Large bag)', category: 'Antifungal & Nail Care' },
    { label: 'Kera-42 Cream', code: 'OTC-0390', price: '48.26', desc: 'Kera-42 Cream', category: 'Antifungal & Nail Care' },
    { label: 'Clean Sweep', code: 'OTC-0338', price: '17.16', desc: 'Clean Sweep', category: 'Antifungal & Nail Care' },
    { label: 'Kamea 20', code: 'OTC-0191', price: '28.96', desc: 'Kamea 20', category: 'Antifungal & Nail Care' },
    { label: 'Kamea G', code: 'OTC-1257', price: '28.96', desc: 'Kamea G', category: 'Antifungal & Nail Care' },
    { label: 'Fungi Foam', code: 'OTC-0027', price: '46.12', desc: 'Fungi Foam 2.5 oz', category: 'Antifungal & Nail Care' },
    { label: 'CN-U Clear Nail Polish', code: 'OTC-0217', price: '40.76', desc: 'CN-U Clear Nail Polish', category: 'Antifungal & Nail Care' },
    { label: 'Clarus Tolnaftate Cream', code: 'OTC-0025', price: '46.00', desc: 'Clarus Tolnaftate Cream 1%', category: 'Antifungal & Nail Care' },
    { label: 'Compression Socks', code: 'OTC-0078', price: '39.68', desc: 'Compression Socks', category: 'Supports & Accessories' },
    { label: 'Jills Hammer Toe Regulator Single', code: 'OTC-0053', price: '12.87', desc: "Jill's Hammer Toe Regulator Single Toe", category: 'Supports & Accessories' },
    { label: 'Jills Hammer Toe Regulator Double', code: 'OTC-0113', price: '13.94', desc: "Jill's Hammer Toe Regulator Double Toe", category: 'Supports & Accessories' },
    { label: 'Jills Gels Corn Pads', code: 'OTC-0084', price: '8.58', desc: "Jill's Gels Corn Pads Felt 20/Bx", category: 'Supports & Accessories' },
    { label: 'Jills Gel Dancer Pads', code: 'OTC-0292', price: '15.02', desc: "Jill's Gel Dancer Pads 2/Bx", category: 'Supports & Accessories' },
    { label: 'Jills Gel Bunion Cushion', code: 'OTC-0055', price: '12.87', desc: "Jill's Gel Bunion Cushion", category: 'Supports & Accessories' },
    { label: 'Jills Felt 1/4 Heel Pad J-22', code: 'OTC-1256', price: '2.15', desc: 'Jill\'s Felt Heel Pad 1/4" J-22', category: 'Supports & Accessories' },
    { label: 'Jills Ball of Foot Gel Cushions', code: 'OTC-0042', price: '6.44', desc: "Jill's Ball of Foot Gel Cushions", category: 'Supports & Accessories' },
    { label: 'Jills U-shaped Gel Callus', code: 'OTC-0062', price: '12.87', desc: "Jill's U-shaped Gel Callus Cushions", category: 'Supports & Accessories' },
    { label: 'Jills Callus Pads 12/Bx', code: 'OTC-0063', price: '7.51', desc: "Jill's Callus Pads 12/Bx", category: 'Supports & Accessories' },
    { label: 'Jills Gel Tailor\'s bunion', code: 'OTC-0054', price: '12.87', desc: "Jill's Gel Tailor's bunion Pad", category: 'Supports & Accessories' },
    { label: 'Jills Wrap Strap 2/pkg', code: 'OTC-0366', price: '12.87', desc: "Jill's Wrap Strap 2/pkg", category: 'Supports & Accessories' },
    { label: 'Jills Achilles Heel Pad', code: 'OTC-0002', price: '46.12', desc: "Jill's Achilles Heel Pad", category: 'Supports & Accessories' },
    { label: 'Jills Arch Binder', code: 'OTC-0037', price: '12.87', desc: "Jill's Arch Binder", category: 'Supports & Accessories' },
    { label: 'Jills Gel Bunion Sleeve', code: 'OTC-0145', price: '33.25', desc: "Jill's Gel Bunion Sleeve", category: 'Supports & Accessories' },
    { label: 'Jills Large Ribbed Tubing', code: 'OTC-0152', price: '30.03', desc: "Medline Large Ribbed Tubing 2/pkg", category: 'Supports & Accessories' },
    { label: 'Jills Toe Buddy', code: 'OTC-0345', price: '7.51', desc: "Jill's Gel Buddy Splint", category: 'Supports & Accessories' },
    { label: 'Jills U shaped Heel Spur', code: 'OTC-0179', price: '2.15', desc: "Jill's U shaped Heel Spur", category: 'Supports & Accessories' },
    { label: 'Jills Felt Dancer\'s Pads', code: 'OTC-0099', price: '2.15', desc: "Jill's Felt 1/8\" Dancer's Pads", category: 'Supports & Accessories' },
    { label: 'Jills U-Shaped Lesion Pads', code: 'OTC-0195', price: '5.36', desc: "Jill's U-Shaped Lesion Pads", category: 'Supports & Accessories' },
    { label: 'Jills Kidney Moleskin', code: 'OTC-0215', price: '1.77', desc: "Jill's 3 1/2 Kidney Moleskin", category: 'Supports & Accessories' },
    { label: 'Jills All Gel Toe Cap', code: 'OTC-0006', price: '16.09', desc: "Jill's All Gel Toe Cap", category: 'Supports & Accessories' },
    { label: 'Curad Band Aids', code: 'OTC-0045', price: '10.73', desc: 'Curad Band Aids Box', category: 'Wound Care' },
    { label: 'Medline Felt Roll', code: 'OTC-0120', price: '7.51', desc: 'Medline Felt Roll 1/4"', category: 'Wound Care' },
    { label: 'Foam Tubing', code: 'OTC-0376', price: '3.75', desc: 'Foam Tubing', category: 'Wound Care' },
    { label: 'Podiatrists Choice', code: 'OTC-0043', price: '5.79', desc: 'Podiatrists Choice Cushion', category: 'Supports & Accessories' },
    { label: 'WonderZorb Gel', code: 'OTC-0092', price: '42.90', desc: 'WonderZorb Gel Heel Cushion', category: 'Supports & Accessories' },
    { label: 'Medline PF Sleeve', code: 'OTC-0257', price: '33.25', desc: 'Medline Plantar Fasciitis Sleeve', category: 'Supports & Accessories' },
    { label: 'Wrymark Carbon Plate', code: 'OTC-0435', price: '78.29', desc: 'Carbon Graphite Plate', category: 'Orthotics & Supports' },
    { label: 'TAS Toe Splint Darco', code: 'OTC-0107', price: '28.96', desc: 'TAS Toe Alignment Splint', category: 'Orthotics & Supports' },
    { label: 'PRP Injection', code: 'PRPINJ2', price: '950.00', desc: 'PRP Injection', category: 'Clinical & Procedures' },
    { label: 'Post Op Shoe', code: 'OTC-0302', price: '30.00', desc: 'Post Op Shoe', category: 'Orthotics & Supports' }
  ];

  const LOCATION_SHORTCUTS = [{ label: 'Raleigh', search: 'Raleigh, NC (3801)' }];
  const PROVIDER_SHORTCUTS = [
    ['Patrick Dougherty', 'Dougherty, Patrick'], ['Kirk Woelffer', 'Woelffer, Kirk'], ['Douglas Smith', 'Smith, Douglas'],
    ['Jordan Meyers', 'Meyers, Jordan'], ['Alan Boehm', 'Boehm, Alan'], ['Charles Korba', 'Korba, Charles'],
    ['Daniel Narowitz', 'Narowitz, Daniel'], ['Amanda Arnold', 'Arnold, Amanda'], ['Stacey Batts', 'Batts, Stacey'],
    ['Asia Hall', 'Hall, Asia'], ['Mariah McFadden', 'McFadden, Mariah'], ['Tamara Volkonska', 'Volkonska, Tamara'],
    ['Lataijha Thomas', 'Thomas, Lataijha']
  ].map(([label, search]) => ({ label, search }));
  const STAFF_SHORTCUTS = [
    ['Lyndsye Sellars', 'Sellars, Lyndsye'], ['Skylar Pritchett', 'Pritchett, Skylar'], ['Paige Barnes', 'Barnes, Paige'],
    ['Paige Kirk', 'Kirk, Paige'], ['Jimmy Ngo', 'Ngo, Jimmy'], ['Anjali Shah', 'Shah, Anjali'],
    ['Robbie Leonardo', 'Leonardo, Robert'], ['Madison Moraja', 'Moraja, Madison'], ['Jessica Richardson', 'Richardson, Jessica'],
    ['Joshua Robison', 'Robison, Joshua'], ['Grace Patel', 'Patel, Grace'], ['Sudhanshu Deshpande', 'Deshpande, Sudhanshu'],
    ['Ashton Andrews', 'Andrews, Ashton'], ['Sharon Higgs', 'Higgs, Sharon'], ['Meg Risinger', 'Risinger, Meg'],
    ['Dan Nicks', 'Nicks, Dan'], ['Sade Dennis', 'Dennis, Sade'], ['Shelia Hackley', 'Hackley, Shelia'], ['Deon Croom', 'Croom, Deon']
  ].map(([label, search]) => ({ label, search }));
  const PAYER_GROUPS = [
    ['Commercial', [['UHC', 'United HealthCare of all states'], ['UMR', 'UMR formerly Commonwealth Administrators, LLC'], ['BCBS', 'Blue Cross Blue Shield of North Carolina'], ['Aetna', 'Aetna Health Plans'], ['Cigna', 'Cigna'], ['Humana', 'Humana Health Plan'], ['Wellcare', 'Wellcare of NC'], ['Healthspring', 'Healthspring']]],
    ['Military', [['Tricare East', 'Tricare East Region'], ['Tricare Prime', 'Tricare Prime'], ['Tricare for Life', 'Tricare for Life'], ['VA Community Care', 'VA Community Care Network VACCN'], ['CHAMPVA', 'CHAMPVA']]],
    ['Medicaid', [['Medicaid', 'Medicaid of North Carolina'], ['Healthy Blue', 'Healthy Blue NC'], ['UHC Community Plan', 'United Healthcare Community Plan UHC'], ['Carolina Complete Health', 'Carolina Complete Health'], ['AmeriHealth', 'AmeriHealth Caritas of NC']]],
    ['Medicare & Supplements', [['Medicare', 'Medicare of North Carolina - J11'], ['UHC AARP Medicare Supplement', 'AARP Medicare Supplement/Fixed Indemnity by UHC'], ['Aetna Senior Supplement', 'Aetna Senior Supplemental Insurance']]]
  ].map(([category, items]) => ({ category, items: items.map(([label, search]) => ({ label, search })) }));
  const FAX_LABELS = { 'Additional Testing': 'Referral', 'Benign': 'Vascular', 'Discuss at Follow-up': 'Records Request', 'Follow-up Appt': 'PT Plan of Care', 'Normal': 'Care Considerations', 'No Further Treatment': 'Disability Paperwork', 'PCP': 'History & Physical', 'Procedure': 'Radiology', 'Referring Provider': 'Progress Report', 'Results': 'Pathology Report' };

  function getSettings() { return new Promise(resolve => chrome.storage.local.get([STORAGE_KEY], r => resolve({ ...DEFAULT_SETTINGS, ...(r[STORAGE_KEY] || {}) }))); }
  function saveSettings(next) { settings = { ...DEFAULT_SETTINGS, ...next }; chrome.storage.local.set({ [STORAGE_KEY]: settings }); }
  function enabled(name) { return settings.masterEnable && settings[name]; }
  function setNativeValue(input, value) { const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set; if (setter) setter.call(input, value); else input.value = value; }
  function emit(input, type = 'input') { input.dispatchEvent(new Event(type, { bubbles: true })); }
  function fireSelection(el) { ['mousedown', 'mouseup', 'click'].forEach(type => el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }))); }
  function text(el) { return (el?.innerText || el?.textContent || '').trim(); }

  function selectLabel(select) {
    const group = select.closest('.form-group, .form-field, .field, [role="group"]');
    const label = group?.querySelector('label, .ng-label, .form-label') || select.previousElementSibling;
    return `${text(label)} ${select.querySelector('.ng-placeholder, input')?.getAttribute('placeholder') || ''}`.trim();
  }
  function isCancellationSelect(select) {
    return /(?:reason\s+for\s+)?cancell?ation\s+reason|reason\s+for\s+cancell?ation/i.test(selectLabel(select));
  }
  function activeNgSelect(labelPattern) {
    return Array.from(document.querySelectorAll('ng-select.ng-select-opened')).find(select => !isCancellationSelect(select) && labelPattern.test(selectLabel(select))) || null;
  }
  function addNgShortcuts(select, title, items, marker) {
    const panel = document.querySelector('ng-dropdown-panel'); const host = panel?.querySelector('.scroll-host');
    if (!panel || !host || panel.dataset[marker]) return;
    panel.dataset[marker] = 'true';
    const wrapper = document.createElement('div'); wrapper.className = 'danmed-dropdown-shortcuts'; wrapper.dataset.danmedShortcutScope = marker;
    const header = document.createElement('div'); header.className = 'danmed-dropdown-title'; header.textContent = title; wrapper.appendChild(header);
    const filter = document.createElement('input'); filter.type = 'search'; filter.className = 'danmed-shortcut-filter'; filter.placeholder = 'Filter shortcuts…'; wrapper.appendChild(filter);
    const itemsBox = document.createElement('div'); itemsBox.className = 'danmed-dropdown-items'; wrapper.appendChild(itemsBox);
    items.forEach(item => { const button = document.createElement('button'); button.type = 'button'; button.className = 'danmed-dropdown-item'; button.textContent = item.label; button.dataset.searchText = `${item.label} ${item.search}`.toLowerCase(); button.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); chooseNgOption(select, item.search); }); itemsBox.appendChild(button); });
    filter.addEventListener('input', () => { const query = filter.value.toLowerCase(); itemsBox.querySelectorAll('.danmed-dropdown-item').forEach(button => { button.hidden = query && !button.dataset.searchText.includes(query); }); });
    panel.insertBefore(wrapper, host);
  }
  function chooseNgOption(select, search) {
    const input = select.querySelector('input[type="text"]'); if (!input) return;
    input.focus(); setNativeValue(input, search); emit(input); emit(input, 'change');
    let attempts = 0; const timer = setInterval(() => { const host = document.querySelector('ng-dropdown-panel .scroll-host'); const option = Array.from(host?.querySelectorAll('.ng-option') || []).find(o => text(o).toLowerCase().includes(search.toLowerCase())); if (option) { clearInterval(timer); fireSelection(option); } else if (++attempts > 30) clearInterval(timer); }, 100);
  }

  function renderAppointmentHighlights() {
    if (!enabled('featureAppointments')) { document.querySelectorAll('.col-md-8.appt-row-center').forEach(el => { if (el.style.backgroundColor === 'rgb(230, 231, 255)' || el.style.backgroundColor === 'rgb(252, 241, 210)') el.style.removeProperty('background-color'); }); return; }
    document.querySelectorAll('.col-md-8.appt-row-center').forEach(row => {
      const container = row.closest('.row.appt-row') || row.parentElement; const value = text(container || row);
      const color = value.includes('New Patient') ? '#e6e7ff' : (value.includes('Salon') || value.includes('Laser 30') ? '#fcf1d2' : '');
      row.style.setProperty('background-color', color, color ? 'important' : '');
    });
  }
  function renderDropdownShortcuts() {
    const removeScope = (scope) => document.querySelectorAll(`.danmed-dropdown-shortcuts[data-danmed-shortcut-scope="${scope}"]`).forEach(el => {
      const panel = el.closest('ng-dropdown-panel');
      el.remove();
      if (panel) delete panel.dataset[scope];
    });
    if (!enabled('featureLocation')) removeScope('danmedLocationAdded');
    if (!enabled('featureStaff')) {
      removeScope('danmedStaffAdded');
      removeScope('danmedProviderAdded');
    }
    if (!enabled('featureLocation') && !enabled('featureStaff')) return;
    if (enabled('featureLocation')) { const select = activeNgSelect(/Search Location|^Location\b/i); if (select) addNgShortcuts(select, 'Quick Location', LOCATION_SHORTCUTS, 'danmedLocationAdded'); }
    if (enabled('featureStaff')) {
      const taskStaff = activeNgSelect(/^(Staff|Assigned To|Select Staff|Task Staff)\b/i);
      const provider = activeNgSelect(/^(Provider|Search Provider)\b/i);
      const select = taskStaff || provider;
      if (select) addNgShortcuts(select, taskStaff ? 'Quick Staff' : 'Quick Providers', taskStaff ? STAFF_SHORTCUTS : PROVIDER_SHORTCUTS, taskStaff ? 'danmedStaffAdded' : 'danmedProviderAdded');
    }
  }
  function renderPayerShortcuts() {
    if (!enabled('featureInsurance')) { document.querySelectorAll('.danmed-payer-shortcuts').forEach(el => el.remove()); return; } const payer = document.querySelector('payer-selector#payerSelector'); if (!payer || payer.querySelector('.danmed-payer-shortcuts')) return;
    const box = document.createElement('div'); box.className = 'danmed-payer-shortcuts'; const title = document.createElement('div'); title.className = 'danmed-shortcut-heading'; title.textContent = 'Quick Payer Selection'; box.appendChild(title);
    PAYER_GROUPS.forEach(group => { const details = document.createElement('details'); details.open = false; const summary = document.createElement('summary'); summary.textContent = group.category; details.appendChild(summary); const row = document.createElement('div'); row.className = 'danmed-payer-row'; group.items.forEach(item => { const b = document.createElement('button'); b.type = 'button'; b.textContent = item.label; b.addEventListener('click', () => { payer.querySelector('.ui-select-toggle')?.click(); setTimeout(() => { const input = payer.querySelector('input[type="search"]'); if (!input) return; setNativeValue(input, item.search); emit(input); emit(input, 'change'); let n = 0; const t = setInterval(() => { const choice = Array.from(payer.querySelectorAll('.ui-select-choices-row')).find(c => text(c).includes(item.search)); if (choice) { clearInterval(t); fireSelection(choice.querySelector('.ui-select-choices-row-inner') || choice); } else if (++n > 30) clearInterval(t); }, 100); }, 120); }); row.appendChild(b); }); details.appendChild(row); box.appendChild(details); }); payer.appendChild(box);
  }

  function otcItems() { return new Promise(resolve => chrome.storage.local.get([OTC_KEY], r => resolve([...(r[OTC_KEY] || OTC_DEFAULTS)]))); }
  function otcFavorites() { return new Promise(resolve => chrome.storage.local.get([FAV_KEY], r => resolve(r[FAV_KEY] || []))); }
  function saveOtcItems(items) { chrome.storage.local.set({ [OTC_KEY]: items }); }
  function saveFavorites(items) { chrome.storage.local.set({ [FAV_KEY]: items }); }
  function findChargeSelect(dialog) { return Array.from(dialog.querySelectorAll('ng-select')).find(s => /Product|Charge|Code/i.test(selectLabel(s)) || /Product|Charge|Code/i.test(text(s))); }
  function updateChargeInput(dialog, patterns, value) { const input = Array.from(dialog.querySelectorAll('input')).find(i => patterns.some(p => (i.dataset.identifier || i.getAttribute('formcontrolname') || i.name || '').toLowerCase().includes(p))); if (input) { setNativeValue(input, value); emit(input); emit(input, 'change'); emit(input, 'blur'); } }
  function openChargeProductSearch(dialog, query = '') { const select = findChargeSelect(dialog); if (!select) return null; select.querySelector('.ng-select-container')?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window })); const input = select.querySelector('input[type="text"]'); if (input && query) { input.focus(); setNativeValue(input, query); emit(input); emit(input, 'change'); } return input; }
  function chooseOtc(dialog, item) { const input = openChargeProductSearch(dialog, item.code); if (!input) return; let n = 0; const t = setInterval(() => { const option = Array.from(document.querySelectorAll('ng-dropdown-panel .ng-option')).find(o => text(o).includes(item.code) || text(o).toLowerCase().includes(item.desc.toLowerCase())); if (option) { clearInterval(t); fireSelection(option); setTimeout(() => { updateChargeInput(dialog, ['description'], item.desc); if (item.price) { updateChargeInput(dialog, ['unit-charge', 'unitcharge', 'charge'], item.price); updateChargeInput(dialog, ['actual-amount', 'original-amount', 'total'], item.price); } }, 150); } else if (++n > 30) clearInterval(t); }, 100); }
  function previousChargeDefaults() { const rows = Array.from(document.querySelectorAll('table tbody tr')).filter(row => /,\s*(DPM|MD|DO)\b/i.test(text(row)) && /\([0-9]{3,}\)/.test(text(row))); const rowText = text(rows[rows.length - 1]); const match = rowText.match(/([^,\n]+),\s*(DPM|MD|DO)\b[^,\n]*,\s*(.+?\([0-9]{3,}\))/i); if (!match) return null; const words = match[1].trim().split(/\s+/); return { provider: words.length > 1 ? `${words.slice(1).join(' ')}, ${words[0]}` : match[1].trim(), providerDisplay: match[1].trim(), location: match[3].trim() }; }
  function chooseChargeSelect(dialog, pattern, search) { const select = Array.from(dialog.querySelectorAll('ng-select')).find(candidate => pattern.test(selectLabel(candidate))); if (!select) return; select.querySelector('.ng-select-container')?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window })); setTimeout(() => chooseNgOption(select, search), 80); }
  function renderChargeSuggestions(dialog) { if (dialog.querySelector('.danmed-charge-suggestions')) return; const defaults = previousChargeDefaults(); if (!defaults) return; const box = document.createElement('div'); box.className = 'danmed-charge-suggestions'; const heading = document.createElement('strong'); heading.textContent = 'Previous charge suggestions'; box.appendChild(heading); [['Provider', defaults.providerDisplay, /^(Provider|Search Provider)\b/i, defaults.provider], ['Location', defaults.location, /Search Location|^Location\b/i, defaults.location]].forEach(([label, display, pattern, search]) => { const button = document.createElement('button'); button.type = 'button'; button.innerHTML = `<span>${label}</span><strong>${display}</strong>`; button.addEventListener('click', () => chooseChargeSelect(dialog, pattern, search)); box.appendChild(button); }); dialog.insertBefore(box, dialog.firstChild); }
  function renderInsuranceSummary(dialog) { if (dialog.querySelector('.danmed-insurance-summary')) return; const box = document.createElement('section'); box.className = 'danmed-insurance-summary'; const heading = document.createElement('strong'); heading.textContent = 'Patient insurance'; box.appendChild(heading); const candidates = Array.from(document.querySelectorAll('[id*="insurance" i], [class*="insurance" i]')).map(text).filter(value => value.length > 10 && value.length < 1200).sort((a, b) => a.length - b.length); const content = document.createElement('div'); content.textContent = candidates[0] || 'Deductible, out-of-pocket maximum, and coinsurance values are not exposed on the current Financials/Add Charges view. Open the patient Insurance section to review them.'; box.appendChild(content); dialog.insertBefore(box, dialog.firstChild); }
  function renderChargeSidebar() {
    if (!enabled('featureCharges')) { document.querySelectorAll('.danmed-otc-sidebar').forEach(el => el.remove()); return; }
    const dialog = Array.from(document.querySelectorAll('[role="dialog"]')).find(candidate => /Add Charge/i.test(text(candidate)));
    if (!dialog || dialog.dataset.danmedOtcClosed === 'true' || dialog.querySelector('.danmed-otc-sidebar')) return;
    const sidebar = document.createElement('aside'); sidebar.className = 'danmed-otc-sidebar';
    const header = document.createElement('div'); header.className = 'danmed-otc-header'; const title = document.createElement('strong'); title.textContent = 'OTC Quick Catalog'; const close = document.createElement('button'); close.type = 'button'; close.className = 'danmed-otc-close'; close.textContent = '×'; header.append(title, close);
    const body = document.createElement('div'); body.className = 'danmed-otc-body'; const search = document.createElement('input'); search.type = 'search'; search.placeholder = 'Search items…'; body.appendChild(search); const list = document.createElement('div'); list.className = 'danmed-otc-list'; body.appendChild(list);
    const add = document.createElement('button'); add.type = 'button'; add.className = 'danmed-otc-add'; add.textContent = '+ Add shortcut'; body.appendChild(add); sidebar.append(header, body); close.addEventListener('click', () => { dialog.dataset.danmedOtcClosed = 'true'; sidebar.remove(); });
    add.addEventListener('click', () => renderAddShortcutForm());
    function renderAddShortcutForm() { list.innerHTML = ''; const form = document.createElement('form'); form.className = 'danmed-otc-form'; form.innerHTML = '<h3>Add OTC shortcut</h3><label>Name<input name="label" required></label><label>Code<input name="code" required><button type="button" class="danmed-otc-search-code">Search Product/Charge/Code</button></label><label>Description<input name="desc"></label><label>Price<input name="price" inputmode="decimal"></label><label>Category<input name="category" value="Custom"></label><div class="danmed-otc-form-actions"><button type="button" class="danmed-otc-cancel">Cancel</button><button type="submit">Save shortcut</button></div><div class="danmed-otc-form-error" role="alert"></div>'; list.appendChild(form); form.querySelector('.danmed-otc-cancel').addEventListener('click', render); form.querySelector('.danmed-otc-search-code').addEventListener('click', () => openChargeProductSearch(dialog, form.elements.code.value.trim())); form.addEventListener('submit', async event => { event.preventDefault(); const values = Object.fromEntries(new FormData(form)); const items = await otcItems(); const duplicate = items.find(item => item.code.trim().toLowerCase() === values.code.trim().toLowerCase() || item.label.trim().toLowerCase() === values.label.trim().toLowerCase()); if (duplicate) { form.querySelector('.danmed-otc-form-error').textContent = `Already exists: ${duplicate.label} (${duplicate.code})`; return; } items.push({ label: values.label.trim(), code: values.code.trim(), desc: values.desc.trim() || values.label.trim(), price: values.price.trim(), category: values.category.trim() || 'Custom' }); saveOtcItems(items); render(); }); }
    async function render() { const [items, favorites] = await Promise.all([otcItems(), otcFavorites()]); const query = search.value.toLowerCase(); list.innerHTML = ''; const groups = {}; const filtered = items.filter(i => !query || `${i.label} ${i.code} ${i.desc}`.toLowerCase().includes(query)); const favoriteItems = filtered.filter(i => favorites.includes(i.code)); if (favoriteItems.length) groups.Favorites = favoriteItems; filtered.filter(i => !favorites.includes(i.code)).forEach(i => (groups[i.category || 'Other'] ||= []).push(i)); Object.entries(groups).forEach(([category, group]) => { const details = document.createElement('details'); details.open = category === 'Favorites' || Boolean(query); const summary = document.createElement('summary'); summary.textContent = `${category} (${group.length})`; details.appendChild(summary); group.forEach(item => { const row = document.createElement('div'); row.className = 'danmed-otc-item'; const button = document.createElement('button'); button.type = 'button'; button.innerHTML = `<strong>${item.label}</strong><small>${item.code}${item.price ? ` · $${item.price}` : ''}</small>`; button.addEventListener('click', () => chooseOtc(dialog, item)); const star = document.createElement('button'); star.type = 'button'; star.className = 'danmed-otc-star'; star.textContent = favorites.includes(item.code) ? '★' : '☆'; star.title = 'Toggle favorite'; star.addEventListener('click', () => { const next = favorites.includes(item.code) ? favorites.filter(x => x !== item.code) : [...favorites, item.code]; saveFavorites(next); render(); }); row.append(button, star); details.appendChild(row); }); list.appendChild(details); }); }
    search.addEventListener('input', render); document.body.appendChild(sidebar); renderChargeSuggestions(dialog); renderInsuranceSummary(dialog); render();
  }

  function renderFaxLabels() {
    const spans = document.querySelectorAll('typeahead-container li span');
    if (!enabled('featureFaxLabels')) {
      spans.forEach(span => {
        if (span.dataset.danmedOriginalText) span.textContent = span.dataset.danmedOriginalText;
      });
      return;
    }
    spans.forEach(span => {
      const original = span.dataset.danmedOriginalText || text(span);
      const replacement = FAX_LABELS[original];
      if (!replacement) return;
      span.dataset.danmedOriginalText = original;
      span.textContent = replacement;
      const link = span.closest('a');
      if (link && !link.dataset.danmedFaxHooked) {
        link.dataset.danmedFaxHooked = 'true';
        link.addEventListener('mousedown', () => setTimeout(() => {
          const input = document.querySelector('input[data-identifier="create-task-details"]');
          if (input) { setNativeValue(input, replacement); emit(input); emit(input, 'change'); input.blur(); }
        }, 10), true);
      }
    });
  }

  const SELF_PAY_CHARGE_MAP = {
        '10061': '200.00', '10120': '100.00', '10121': '200.00', '10140': '200.00',
        '10160': '100.00', '11042': '130.00', '11043': '100.00', '11044': '150.00',
        '11045': '75.00',  '11046': '0.00',   '11047': '0.00',   '11055': '0.00',
        '11056': '75.00',  '11057': '157.72', '11100': '203.24', '11101': '63.36',
        '11104': '200.00', '11300': '192.92', '11301': '235.02', '11305': '203.76',
        '11306': '238.66', '11307': '279.24', '11400': '242.82', '11401': '296.60',
        '11402': '329.18', '11403': '380.36', '11420': '245.48', '11421': '309.94',
        '11422': '348.64', '11423': '396.92', '11426': '658.60', '11600': '382.20',
        '11601': '445.00', '11603': '547.26', '11620': '384.14', '11621': '446.94',
        '11719': '27.58',  '11720': '63.66',  '11721': '88.70',  '11730': '250.00',
        '11732': '63.78',  '11740': '1035.52','11750': '250.00', '11755': '238.12',
        '11900': '106.72', '12001': '175.52', '12002': '215.14', '12020': '572.66',
        '12031': '488.16', '12032': '585.98', '12041': '489.88', '13160': '1578.36',
        '14040': '1478.10','15002': '684.40', '15004': '783.32', '15271': '292.68',
        '15273': '609.26', '15275': '307.60', '15277': '668.64', '17000': '126.52',
        '17003': '11.62',  '17110': '150.00', '17111': '0.00',   '17250': '163.84',
        '20005': '610.54', '20225': '809.66', '20550': '60.00',  '20551': '60.00',
        '20552': '60.00',  '20600': '50.00',  '20604': '590.00', '20605': '124.00',
        '20606': '124.00', '20612': '120.56', '20670': '712.40', '20680': '1198.38',
        '20690': '1179.68','20694': '834.32', '20900': '790.14', '27603': '1043.36',
        '27613': '492.38', '27630': '1077.50','27650': '1300.98','27654': '1420.00',
        '27658': '736.10', '27659': '0.00',   '27664': '711.68', '27685': '1299.44',
        '27687': '904.40', '27695': '968.58', '27698': '1264.58','27703': '2077.70',
        '27750': '674.38', '27752': '1051.28','27760': '650.96', '27762': '938.32',
        '27786': '613.32', '27788': '832.20', '27808': '650.72', '27810': '918.88',
        '27816': '636.82', '27818': '954.24', '27829': '1406.70','28001': '551.72',
        '28002': '876.52', '28010': '460.72', '28011': '626.82', '28020': '985.00',
        '28035': '2047.00','28039': '979.30', '28043': '775.80', '28045': '687.62',
        '28047': '2075.20','28060': '1019.66','28080': '1037.42','28090': '921.98',
        '28108': '325.00', '28110': '910.28', '28112': '0.00',   '28113': '1160.50',
        '28118': '1183.74','28119': '1035.64','28120': '1336.06','28122': '1177.98',
        '28124': '946.12', '28126': '774.02', '28153': '814.72', '28160': '819.16',
        '28200': '973.34', '28208': '949.36', '28220': '0.00',   '28232': '758.84',
        '28234': '806.28', '28238': '0.00',   '28250': '1145.38','28270': '972.42',
        '28272': '771.10', '28285': '1060.52','28288': '1256.38','28289': '1598.60',
        '28291': '1353.64','28292': '1018.04','28295': '1000.00','28296': '1959.58',
        '28297': '1759.58','28298': '1660.40','28299': '1246.34','28307': '1194.88',
        '28308': '1122.84','28310': '1080.16','28313': '1033.90','28315': '951.96',
        '28400': '482.98', '28405': '762.40', '28430': '466.66', '28435': '711.54',
        '28450': '414.22', '28470': '426.72', '28475': '505.32', '28476': '719.92',
        '28485': '1092.74','28490': '277.12', '28495': '348.46', '28510': '237.22',
        '28515': '319.12', '28530': '225.76', '28540': '382.72', '28555': '0.00',
        '28630': '306.86', '28635': '345.34', '28660': '233.16', '28665': '303.36',
        '28675': '1122.50','28730': '1457.46','28740': '1655.80','28750': '1572.18',
        '28760': '1547.28','28805': '1442.88','28810': '850.42', '28820': '1101.58',
        '28825': '1052.90','29405': '154.24', '29425': '148.34', '29445': '255.96',
        '29515': '138.32', '29540': '55.96',  '29550': '37.26',  '29580': '122.60',
        '29581': '173.28', '29799': '0.00',   '29893': '1254.52','29898': '1117.40',
        '36415': '0.00',   '64450': '90.00',  '64455': '95.68',  '64632': '172.90',
        '64640': '481.00', '64722': '0.00',   '73600': '60.30',  '73610': '66.40',
        '73620': '50.00',  '73630': '75.00',  '73650': '75.00',  '76881': '149.82',
        '76882': '110.18', '76942': '111.64', '93923': '252.46', '97033': '40.80',
        '97035': '28.46',  '97110': '60.42',  '97112': '69.40',  '97116': '59.76',
        '97140': '55.62',  '97161': '168.56', '97162': '168.56', '97163': '168.56',
        '97530': '77.16',  '97597': '187.00', '97598': '75.00',  '97605': '0.00',
        '97750': '0.00',   '99201': '0.00',   '99202': '140.00', '99203': '150.00',
        '99204': '200.00', '99211': '100.00', '99212': '100.00', '99213': '100.00',
        '99214': '100.00', '99242': '0.00',   '99243': '0.00',   'A5500': '150.00',
        'A5512': '52.00',  'A5513': '86.00',  'A5514': '86.00',  'A6212': '65.00',
        'E0114': '0.00',   'G0127': '0.00',   'J0702': '0.00',   'J1030': '0.00',
        'J1100': '0.00',   'J3301': '0.00',   'L1902': '87.00',  'L1906': '60.00',
        'L1907': '100.00', 'L1932': '100.00', 'L1940': '475.00', 'L1951': '825.00',
        'L1960': '65.00',  'L1970': '500.00', 'L1971': '175.00', 'L2210': '22.50',
        'L2275': '0.00',   'L2330': '250.00', 'L2820': '100.00', 'L3000': '312.50',
        'L3010': '220.50', 'L3260': '30.00',  'L4210': '75.00',  'L4350': '100.00',
        'L4360': '225.00', 'L4361': '225.00', 'L4387': '150.00', 'L4396': '180.00',
        'L4397': '60.00',  'L5000': '450.00', 'Q4038': '82.00',  'Q4131': '300.00',
        'Q4180': '344.50', 'S0395': '40.00'
    };;
  function runSelfPay() {
    if (!enabled('featureSelfPay')) return;
    if (!text(document.body).includes('Self Pay Fee Schedule Oct 2025')) return;
    const override = Array.from(document.querySelectorAll('a,button,span')).find(el => /^(Override Bill|Edit Overridden Bill)$/.test(text(el)));
    if (override && !override.dataset.danmedClicked) { override.dataset.danmedClicked = 'true'; fireSelection(override); }
    document.querySelectorAll('table tbody tr').forEach(row => {
      const codeInput = row.querySelector('input[data-identifier="override-bill-cpt-code"]');
      const chargeInput = row.querySelector('input[data-identifier="override-bill-cpt-charge"]');
      const code = codeInput?.value?.trim();
      const price = code && SELF_PAY_CHARGE_MAP[code];
      if (!chargeInput || price === undefined || chargeInput.value === price) return;
      setNativeValue(chargeInput, price); emit(chargeInput); emit(chargeInput, 'change'); emit(chargeInput, 'blur');
    });
  }

  function disableInjectedFeatures() {
    document.querySelectorAll('.danmed-otc-sidebar, .danmed-payer-shortcuts, .danmed-dropdown-shortcuts').forEach(el => el.remove());
    document.querySelectorAll('.col-md-8.appt-row-center').forEach(el => { if (el.style.backgroundColor === 'rgb(230, 231, 255)' || el.style.backgroundColor === 'rgb(252, 241, 210)') el.style.removeProperty('background-color'); });
  }
  function refresh() { if (!settings.masterEnable) { disableInjectedFeatures(); return; } renderAppointmentHighlights(); renderDropdownShortcuts(); renderPayerShortcuts(); renderChargeSidebar(); renderFaxLabels(); runSelfPay(); }
  function scheduleRefresh() { clearTimeout(refreshTimer); refreshTimer = setTimeout(refresh, 80); }
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes[STORAGE_KEY]) { settings = { ...DEFAULT_SETTINGS, ...(changes[STORAGE_KEY].newValue || {}) }; scheduleRefresh(); } });
  getSettings().then(s => { settings = s; const observer = new MutationObserver(scheduleRefresh); observer.observe(document.body, { childList: true, subtree: true, characterData: true }); document.addEventListener('click', e => { if (e.target.closest('#addChargesBtn') || /Add Charges/i.test(text(e.target))) scheduleRefresh(); }, true); window.addEventListener('hashchange', scheduleRefresh); scheduleRefresh(); });
})();
