(() => {
  'use strict';

  const REPORT_ROUTE = '/master-checkin/home/masterCheckinView/eligibilityReport';
  const state = { running: false, sizeTimer: null, initialized: false };
  const enabled = () => typeof window.DanMedFeatureEnabled === 'function' && window.DanMedFeatureEnabled('eligibilityHelper');
  const onReport = () => (window.location.hash || '').split('?')[0].replace(/^#\/?/, '/').replace(/\/$/, '') === REPORT_ROUTE;
  const root = () => document.querySelector('#resultsContainer');
  const rows = () => [...document.querySelectorAll('#reportTable > tbody > tr[ng-repeat*="entry in erCtrl.reportEntries"], #reportTable > tbody > tr.ng-scope')];
  const pageSizeButton = () => document.querySelector('#resultsContainer > div.ema-card-row.ema-card-body.printable-container > div > div.ng-scope.ng-isolate-scope > div > div > div > button:nth-child(4)') ||
    [...document.querySelectorAll('#resultsContainer .ng-table-counts button, #resultsContainer button[ng-click="params.count(count)"]')].find(b => b.textContent.trim() === '100');
  const pageSizeIs100 = () => !!pageSizeButton()?.classList.contains('active');
  const pageSizeSelect = () => document.querySelector('#pageSizeSelect, select[ng-model="params.count"]');
  const reportPager = () => document.querySelector('#reportTable + div[ng-table-pagination], #reportTable ~ div[ng-table-pagination]');
  const disabled = el => !el || el.disabled || el.getAttribute('aria-disabled') === 'true' || el.closest('li')?.classList.contains('disabled');
  const click = el => { if (disabled(el)) return false; el.click(); return true; };
  const waitFor = (predicate, timeout = 30000, interval = 200) => new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      let okay = false;
      try { okay = !!predicate(); } catch (_) {}
      if (okay) return resolve(true);
      if (Date.now() - started >= timeout) return reject(new Error('Timed out waiting for the Eligibility Report to update.'));
      setTimeout(tick, interval);
    };
    tick();
  });
  const setStatus = (el, text, kind = '') => {
    if (!el) return;
    el.textContent = text;
    el.style.color = kind === 'error' ? '#a94442' : kind === 'done' ? '#2b7a2b' : '';
  };
  const requestSentTime = row => row.querySelector('[ng-bind*="entry.latestHistory.requestSentTime"], [ng-bind*="latestHistory.requestSentTime"]')?.textContent.trim() || '';
  const rowStatus = row => [...row.querySelectorAll('[data-title-text="Status"], td[data-title*="Status"]')].map(el => el.textContent.trim()).join(' ');
  const unknownWithoutTimestamp = row => /\bunknown\b/i.test(rowStatus(row)) && !requestSentTime(row);
  const rowKey = row => {
    const links = [...row.querySelectorAll('a')].map(a => a.textContent.trim()).filter(Boolean);
    const policy = row.querySelector('[data-title-text="Policy Number"] a, td[data-title*="Policy Number"] a')?.textContent.trim();
    return policy || links.slice(0, 3).join('|') || row.textContent.trim().replace(/\s+/g, ' ').slice(0, 240);
  };
  const totalPatients = () => {
    const text = root()?.innerText || '';
    const values = [...text.matchAll(/\bAll\s+([\d,]+)/g)].map(m => Number(m[1].replace(/,/g, ''))).filter(Number.isFinite);
    return values.length ? Math.max(...values) : rows().length;
  };
  const pageFingerprint = () => rows().map(row => `${rowKey(row)}=${requestSentTime(row)}`).join('\n');
  const numericPage = page => [...(reportPager()?.querySelectorAll('li a, li button') || [])].find(el => Number(el.textContent.trim()) === page && !disabled(el));
  const successNotice = () => [...document.querySelectorAll('.ngn-success .ngn-message, .ngn-success [ng-bind="ngNotify.notifyMessage"]')].find(el => /eligibility checks completed for selected insurances/i.test(el.textContent.trim()));

  function setNative100(select) {
    const option = [...select.options].find(o => o.text.trim() === '100' || o.value === 'number:100');
    if (!option) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    (setter || ((value) => { select.value = value })).call(select, option.value);
    ['input', 'change'].forEach(type => select.dispatchEvent(new Event(type, { bubbles: true })));
    return true;
  }
  function enforce100() {
    if (!enabled() || !onReport()) return;
    const button = pageSizeButton();
    const select = pageSizeSelect();
    if (!pageSizeIs100() && button) button.click();
    if (select && !pageSizeIs100()) setNative100(select);
  }
  function keep100() {
    if (state.sizeTimer) return;
    enforce100();
    state.sizeTimer = setInterval(() => {
      if (!onReport() || !enabled()) { clearInterval(state.sizeTimer); state.sizeTimer = null; return; }
      enforce100();
    }, 500);
  }
  async function ensure100() {
    enforce100();
    await waitFor(pageSizeIs100, 30000);
  }
  function selectAll() {
    const master = document.querySelector('#reportTable #select_all_1, #select_all_1');
    if (master && !master.checked && !master.disabled) click(master);
    else if (!master) rows().map(row => row.querySelector('input[type="checkbox"]')).filter(cb => cb && !cb.checked && !cb.disabled).forEach(click);
  }
  async function waitForPageCompletion(before, pageNumber, totalPages, count, status) {
    let last = -1;
    let noticeWasAbsent = !successNotice();
    await waitFor(() => {
      const current = rows();
      const changed = current.filter(row => before.has(rowKey(row)) && requestSentTime(row) && requestSentTime(row) !== before.get(rowKey(row)));
      const excluded = Math.max(0, count - before.size);
      const complete = Math.min(count, excluded + changed.length);
      if (complete !== last) { last = complete; setStatus(status, `Re-checking page ${pageNumber}/${totalPages}: ${complete}/${count}…`); }
      const notice = successNotice();
      if (!notice) noticeWasAbsent = true;
      if (complete >= count || (noticeWasAbsent && notice && changed.length > 0)) return true;
      return false;
    }, 600000, 1000);
  }
  async function waitForStableNewPage(oldFingerprint) {
    let previous = '';
    let stable = 0;
    await waitFor(() => {
      const current = pageFingerprint();
      if (!current || current === oldFingerprint) { previous = ''; stable = 0; return false; }
      if (current === previous) stable++; else { previous = current; stable = 0; }
      return stable >= 3;
    }, 30000, 250);
  }
  function addUI() {
    if (!enabled() || !onReport()) return;
    const original = document.querySelector('button[name="re-check-eligibility"]');
    if (!original || original.parentElement?.querySelector('[data-danmed-eligibility-helper]')) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = original.className; button.textContent = 'Re-check All';
    button.style.marginLeft = '8px'; button.setAttribute('data-danmed-eligibility-helper', 'true');
    const status = document.createElement('span');
    status.style.cssText = 'display:inline-block;margin-left:10px;font-size:12px;vertical-align:middle;max-width:520px;white-space:normal;';
    status.setAttribute('data-danmed-eligibility-status', 'true');
    button.addEventListener('click', () => run(button, status));
    original.parentElement.append(button, status);
    state.initialized = true;
  }
  async function run(button, status) {
    if (state.running) return;
    state.running = true; button.disabled = true;
    try {
      await ensure100();
      const total = totalPatients();
      const expectedPages = Math.max(1, Math.ceil(total / 100));
      let completed = 0;
      for (let page = 1; page <= expectedPages; page++) {
        if (page > 1) await waitForStableNewPage();
        const visible = rows();
        if (!visible.length) throw new Error(`Page ${page} has no visible report rows.`);
        const actionable = visible.filter(row => !unknownWithoutTimestamp(row) && (() => { const cb = row.querySelector('input[type="checkbox"]'); return cb && !cb.disabled && !cb.readOnly; })());
        const before = new Map(actionable.map(row => [rowKey(row), requestSentTime(row)]));
        selectAll();
        const original = document.querySelector('button[name="re-check-eligibility"]');
        await waitFor(() => original && !original.disabled, 30000);
        if (!click(original)) throw new Error(`Could not click Re-check Eligibility on page ${page}.`);
        setStatus(status, `Re-checking page ${page}/${expectedPages}: ${visible.length - before.size}/${visible.length}…`);
        await waitForPageCompletion(before, page, expectedPages, visible.length, status);
        completed = Math.min(total, completed + visible.length);
        setStatus(status, `Re-checked ${completed}/${total}; page ${page}/${expectedPages} complete.`);
        if (page >= expectedPages) break;
        const old = pageFingerprint();
        const next = numericPage(page + 1) || reportPager()?.querySelector('a.pager-next, [data-identifier="pagination-next"]');
        if (!click(next)) throw new Error(`Could not move to page ${page + 1}.`);
        await waitForStableNewPage(old);
      }
      setStatus(status, `Re-check completed: ${completed}/${total} patients across ${expectedPages} pages.`, 'done');
    } catch (error) { setStatus(status, `Stopped: ${error.message}`, 'error'); }
    finally { state.running = false; button.disabled = false; }
  }
  function init() {
    if (!onReport()) return;
    keep100();
    addUI();
  }
  new MutationObserver(init).observe(document.documentElement, { childList: true, subtree: true });
  init();
})();
