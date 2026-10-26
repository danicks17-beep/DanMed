'use strict';

/* Imported from ApptHighlighting.user.js; adapted for DanMed feature toggles. */
// ==UserScript==
// @name         Highlight Appointment by type
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Highlight specific appointment types (salon, laser, new patient)
// @author       Assistant
// @match        *://*/*
// @grant        none
// ==/UserScript==

// New patient

(function() {
    'use strict';
    const targetColor = '#e6e7ff';
    const selector = '.col-md-8.appt-row-center';

    const applyRule = () => {
        if (!window.DanMedFeatureEnabled('appointmentHighlighting')) return;
        document.querySelectorAll(selector).forEach(el => {
            const divs = Array.from(el.querySelectorAll('div.ng-star-inserted'));
            const hasNewPatient = divs.some(div => {
                const span = div.querySelector('span');
                return span && span.textContent.trim() === 'New Patient';
            });

            if (hasNewPatient) {
                el.style.setProperty('background-color', targetColor, 'important');
            } else if (el.style.backgroundColor === 'rgb(230, 231, 255)') {
                el.style.removeProperty('background-color');
            }
        });
    };

    // Initial run
    applyRule();

    // Use a MutationObserver to handle dynamic content
    const observer = new MutationObserver(applyRule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
})();


// Salon & Laser


(function() {
    'use strict';

    const YELLOW_COLOR = '#fcf1d2';
    const TARGET_TYPES = ['Salon', 'Laser 30'];

    function applyStyles() {
        if (!window.DanMedFeatureEnabled('appointmentHighlighting')) return;
        const rows = document.querySelectorAll('.col-md-8.appt-row-center');

        rows.forEach(row => {
            // Check the text of the entire row (including the parent if needed)
            const parentRow = row.closest('.row.appt-row') || row.parentElement;
            const rowText = parentRow ? parentRow.innerText : row.innerText;

            // If any of our target types are found in the row text
            const isMatch = TARGET_TYPES.some(type => rowText.includes(type));

            if (isMatch) {
                row.style.backgroundColor = YELLOW_COLOR;
            } else if (row.style.backgroundColor === 'rgb(252, 241, 210)') {
                // Optional: remove styling if the type changes (e.g., in a single-page app)
                row.style.backgroundColor = '';
            }
        });
    }

    // Run once on load
    applyStyles();

    // Set up a MutationObserver to watch for changes as the page loads new data
    const observer = new MutationObserver(() => {
        applyStyles();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();


/* Imported from ChargeCorrections.user.js; adapted for DanMed feature toggles. */
// ==UserScript==
// @name         OTC Product Selection
// @namespace    http://tampermonkey.net/
// @version      3.5
// @description  Performs a REAL selection of shortcuts strictly inside Product/Charge/Code dropdowns.
// @author       Assistant
// @match        *://*.modmedapp.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const shortcuts = [
        { label: "⭐ Pedi C", code: "NOTCPediC", price: "75.00", desc: "Pedi-C" },
        { label: "⭐ Pedi A", code: "NOTCPecliA", price: "54.00", desc: "Pedi-A" },
        { label: "⭐ Tip (for Salon or Laser)", code: "NOTCTIP", desc: "Tip" },
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
        { label: "⭐ Tolcylen Soak (5 pack)", code: "OTC-0368", price: "63.28", desc: "Tolcylen Soak (5 pack)" },
        { label: "⭐ Tolcylen Soak (Small bag / 7 soaks)", code: "OTC-0369", price: "74.25", desc: "Tolcylen Soak (Small bag / 7 soaks)" },
        { label: "⭐ Tolcylen Soak (Large bag)", code: "OTC-0370", price: "97.60", desc: "Tolcylen Soak (Large bag)" },
        { label: "⭐ Kera-42 Cream", code: "OTC-0390", price: "48.26", desc: "Kera-42 Cream" },
        { label: "⭐ Clean Sweep", code: "OTC-0338", price: "17.16", desc: "Clean Sweep" },
        { label: "⭐ Kamea 20", code: "OTC-0191", price: "28.96", desc: "Kamea 20" },
        { label: "⭐ Kamea G", code: "OTC-1257", price: "28.96", desc: "Kamea G" },
        { label: "⭐ Fungi Foam", code: "OTC-0027", price: "46.12", desc: "Fungi Foam 2.5 oz" },
        { label: "⭐ CN-U Clear Nail Polish", code: "OTC-0217", price: "40.76", desc: "CN-U Clear Nail Polish" },
        { label: "⭐ Clarus Tolnaftate Cream", code: "OTC-0025", price: "46.00", desc: "Clarus Tolnaftate Cream 1%" },
        { label: "⭐ Redi-Thotics Comfort", code: "OTC-0282", price: "56.84", desc: "Redi-Thotics Comfort" },
        { label: "⭐ Redi-Thotics Max", code: "OTC-0282", price: "56.84", desc: "Redi-Thotics Max" },
        { label: "⭐ Redi-Thotics Flex", code: "OTC-0282", price: "56.84", desc: "Redi-Thotics Flex" },
        { label: "⭐ Redi-thotics Freedom", code: "OTC-0282", price: "56.84", desc: "Redi-thotics Freedom" },
        { label: "⭐ Redi-Thotics 3/4", code: "OTC-0282", price: "45.05", desc: "Redi-Thotics 3/4" },
        { label: "⭐ Compression Socks", code: "OTC-0078", price: "39.68", desc: "Compression Socks" },
        { label: "⭐ Jills Hammer Toe Regulator Single", code: "OTC-0053", price: "12.87", desc: "Jill's Hammer Toe Regulator Single Toe" },
        { label: "⭐ Jills Hammer Toe Regulator Double", code: "OTC-0113", price: "13.94", desc: "Jill's Hammer Toe Regulator Double Toe" },
        { label: "⭐ Jills Gels Corn Pads", code: "OTC-0084", price: "8.58", desc: "Jills Gels Corn Pads Felt 20/Bx" },
        { label: "⭐ Jills Gel Dancer Pads", code: "OTC-0292", price: "15.02", desc: "Jills Gel Dancer Pads 2/Bx" },
        { label: "⭐ Jills Gel Bunion Cushion", code: "OTC-0055", price: "12.87", desc: "Jill's Gel Bunion Cushion" },
        { label: "⭐ Jills Felt 1/4 Heel Pad J-22", code: "OTC-1256", price: "2.15", desc: "Jill's Felt Heel Pad 1/4\" J-22" },
        { label: "⭐ Jills Ball of Foot Gel Cushions", code: "OTC-0042", price: "6.44", desc: "Jill's Ball of Foot Gel Cushions" },
        { label: "⭐ Jills U-shaped Gel Callus", code: "OTC-0062", price: "12.87", desc: "Jill's U-shaped Gel Callus Cushions" },
        { label: "⭐ Jills Callus Pads 12/Bx", code: "OTC-0063", price: "7.51", desc: "Jill's Callus Pads 12/Bx" },
        { label: "⭐ Jills Gel Tailor's bunion", code: "OTC-0054", price: "12.87", desc: "Jill's Gel Tailor's bunion Pad" },
        { label: "⭐ Jills Wrap Strap 2/pkg", code: "OTC-0366", price: "12.87", desc: "Jill's Wrap Strap 2/pkg" },
        { label: "⭐ Jills Achilles Heel Pad", code: "OTC-0002", price: "46.12", desc: "Jill's Achilles Heel Pad" },
        { label: "⭐ Jills Arch Binder", code: "OTC-0037", price: "12.87", desc: "Jill's Arch Binder" },
        { label: "⭐ Jills Gel Bunion Sleeve", code: "OTC-0145", price: "33.25", desc: "Jill's Gel Bunion Sleeve" },
        { label: "⭐ Jills Large Ribbed Tubing", code: "OTC-0152", price: "30.03", desc: "Jill's Large Ribbed Tubing 2/pkg" },
        { label: "⭐ Jills Toe Buddy", code: "OTC-0345", price: "7.51", desc: "Jill's Gel Buddy Splint" },
        { label: "⭐ Jills U shaped Heel Spur", code: "OTC-0179", price: "2.15", desc: "Jill's U shaped Heel Spur" },
        { label: "⭐ Jills Felt Dancer's Pads", code: "OTC-0099", price: "2.15", desc: "Jill's Felt 1/8\" Dancer's Pads" },
        { label: "⭐ Jills U-Shaped Lesion Pads", code: "OTC-0195", price: "5.36", desc: "Jill's U-Shaped Lesion Pads" },
        { label: "⭐ Jills Kidney Moleskin", code: "OTC-0215", price: "1.77", desc: "Jill's 3 1/2 Kidney Moleskin" },
        { label: "⭐ Jills All Gel Toe Cap", code: "OTC-0006", price: "16.09", desc: "Jill's All Gel Toe Cap" },
        { label: "⭐ Curad Band Aids", code: "OTC-0045", price: "10.73", desc: "Curad Band Aids Box" },
        { label: "⭐ Medline Felt Roll", code: "OTC-0120", price: "7.51", desc: "Medline Felt Roll 1/4\"" },
        { label: "⭐ Foam Tubing", code: "OTC-0376", price: "3.75", desc: "Foam Tubing" },
        { label: "⭐ Podiatrists Choice", code: "OTC-0043", price: "5.79", desc: "Podiatrists Choice Cushion" },
        { label: "⭐ WonderZorb Gel", code: "OTC-0092", price: "42.90", desc: "WonderZorb Gel Heel Cushion" },
        { label: "⭐ Medline PF Sleeve", code: "OTC-0257", price: "33.25", desc: "Medline Plantar Fasciitis Sleeve" },
        { label: "⭐ Wrymark Carbon Plate", code: "OTC-0435", price: "78.29", desc: "Carbon Graphite Plate" },
        { label: "⭐ TAS Toe Splint Darco", code: "OTC-0107", price: "28.96", desc: "TAS Toe Alignment Splint" },
        { label: "⭐ PRP Injection", code: "PRPINJ2", price: "950.00", desc: "PRP Injection" },
        { label: "⭐ Post Op Shoe", code: "OTC-0302", price: "30.00", desc: "Post Op Shoe" }
    ];

    function isProductSelector(selectElem) {
        if (!selectElem) return false;

        // Check 1: Dedicated Product Selector component tag
        if (selectElem.closest('mmpm-charge-product-selector')) return true;

        // Check 2: Preceding label or column context
        const parentContainer = selectElem.parentElement || selectElem.closest('.form-group, td, th, div');
        if (parentContainer) {
            const labelText = parentContainer.innerText || '';
            if (labelText.includes('Product') || labelText.includes('Charge') || labelText.includes('Code')) {
                return true;
            }
        }

        // Check 3: FormControlName / Data attributes
        const input = selectElem.querySelector('input');
        if (input) {
            const attr = (input.getAttribute('formcontrolname') || input.getAttribute('data-identifier') || '').toLowerCase();
            if (attr.includes('product') || attr.includes('charge') || attr.includes('code')) return true;
        }

        return false;
    }

    function injectShortcuts() {
        if (!window.DanMedFeatureEnabled('otcChargeShortcuts')) return;
        const panel = document.querySelector('ng-dropdown-panel');
        if (!panel || panel.dataset.shortcutsAdded) return;

        const activeSelect = document.querySelector('ng-select.ng-select-opened');

        // Strict Check: Only run injection if active select is a Product/Charge selector
        if (!activeSelect || !isProductSelector(activeSelect)) return;

        const currentRow = activeSelect.closest('tr') || activeSelect.closest('.ema-form-row') || activeSelect.closest('.charge-row');
        const scrollHost = panel.querySelector('.scroll-host');
        if (!scrollHost) return;
                if (scrollHost) {
            scrollHost.style.maxHeight = '120px';
            scrollHost.style.overflowY = 'auto';
        }

        // Inside injectShortcuts() function:

        // 1. Make OTC list longer (e.g., 300px)
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'max-height: 300px; overflow-y: auto; border-bottom: 1px solid #ccc; background: transparent;';

        // ... (rest of your shortcut injection code)

        const header = document.createElement('div');
        // Matches .ng-optgroup and the purple label inside
        header.className = 'ng-option-disabled ng-optgroup';
        header.style.cssText = 'color: rgb(80, 45, 127); font-weight: 700; padding: 8px 10px; font-size: 13px; cursor: default; user-select: none;';
        header.innerText = 'OTC Shortcuts';
        wrapper.appendChild(header);

        shortcuts.forEach(item => {
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

                    // --- IMPROVED SELECTION LOGIC ---
                    const startTime = Date.now();
                    const maxWait = 2000; // Wait up to 2 seconds for search results

                    const attemptSelection = () => {
                        // Find native options (excluding our custom shortcuts)
                        const options = Array.from(scrollHost.querySelectorAll('.ng-option:not(.custom-shortcut-option)'));
                        // Look for a match on the code or description
                        const target = options.find(opt =>
                            opt.innerText.trim().includes(item.code) ||
                            opt.innerText.trim().includes(item.desc)
                        );

                        if (target) {
                            target.click();
                            // Final sync: ensure description/charge are set after selection completes
                            setTimeout(() => {
                                if (currentRow) {
                                    updateInputInRow(currentRow, 'description', item.desc);
                                    updateInputInRow(currentRow, 'actual-amount', item.price);
                                    updateInputInRow(currentRow, 'original-amount', item.price);
                                    updateInputInRow(currentRow, 'unit-charge', item.price);
                                }
                            }, 100);
                        } else if (Date.now() - startTime < maxWait) {
                            // If not found yet, wait 50ms and try again
                            setTimeout(attemptSelection, 50);
                        } else {
                            // Fallback if search fails entirely
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

    setInterval(injectShortcuts, 350);
})();


/* Imported from InsPayerShortcuts.user.js; adapted for DanMed feature toggles. */
// ==UserScript==
// @name         Insurance Payer Shortcuts
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Grouped Insurance Shortcuts with Headers
// @author       Assistant
// @match        https://usfas.modmedapp.com/ema/web/practice/staff/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const shortcutGroups = [
        {
            category: "Commercial",
            items: [
                { label: "UHC", search: "United HealthCare of all states" },
                { label: "UMR", search: "UMR formerly Commonwealth Administrators, LLC" },
                { label: "BCBS", search: "Blue Cross Blue Shield of North Carolina" },
                { label: "Aetna", search: "Aetna Health Plans" },
                { label: "Cigna", search: "Cigna", targetIndex: 4},
                { label: "Humana", search: "Humana Health Plan" },
                { label: "Wellcare", search: "Wellcare of NC" },
                { label: "Healthspring", search: "Healthspring" },                

            ]
        },
                {
            category: "Military",
            items: [
                { label: "Tricare East", search: "Tricare East Region" },
                { label: "Tricare Prime", search: "Tricare Prime" },
                { label: "Tricare for Life", search: "Tricare for Life" },
                { label: "VA Community Care", search: "VA Community Care Network VACCN" },
                { label: "CHAMPVA", search: "CHAMPVA" },
            ]
        },
        {
            category: "Medicaid",
            items: [
                { label: "Medicaid", search: "Medicaid of North Carolina" },
                { label: "Healthy Blue", search: "Healthy Blue NC" },
                { label: "UHC Community Plan", search: "United Healthcare Community Plan UHC" },
                { label: "Carolina Complete Health", search: "Carolina Complete Health" },
                { label: "AmeriHealth", search: "AmeriHealth Caritas of NC" },
            ]
        },
        {
            category: "Medicare & Supplements",
            items: [
                { label: "Medicare", search: "Medicare of North Carolina - J11" },
                { label: "UHC AARP Medicare Supplement", search: "AARP Medicare Supplement/Fixed Indemnity by UHC" },
                { label: "Aetna Senior Supplement", search: "Aetna Senior Supplemental Insurance" }
            ]
        }
    ];

    function injectShortcuts() {
        if (!window.DanMedFeatureEnabled('payerShortcuts')) return;
        const payerSelector = document.querySelector('payer-selector#payerSelector');
        if (payerSelector && !document.getElementById('payer-shortcuts-container')) {
            payerSelector.style.display = 'block';

            const container = document.createElement('div');
            container.id = 'payer-shortcuts-container';
            container.style.cssText = 'margin-top: 10px; width: 100%;';

            shortcutGroups.forEach(group => {
                // 1. Create Header
                const header = document.createElement('div');
                header.innerText = group.category;
                header.style.cssText = 'font-weight: bold; font-size: 11px; color: #555; text-transform: uppercase; margin-top: 8px; border-bottom: 1px solid #ddd; padding-bottom: 2px; margin-bottom: 6px;';
                container.appendChild(header);

                // 2. Create Button Row
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;';

                group.items.forEach(item => {
                    const btn = document.createElement('button');
                    btn.innerText = item.label;
                    btn.className = 'btn btn-xs btn-default';
                    btn.style.cssText = 'border: 1px solid #ccc; cursor: pointer; white-space: nowrap;';
                    btn.type = 'button';

                    btn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const toggle = payerSelector.querySelector('.ui-select-toggle');
                        if (toggle) toggle.click();

                        setTimeout(() => {
                            const searchInput = payerSelector.querySelector('input[type="search"]');
                            if (searchInput) {
                                searchInput.value = item.search;
                                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                                searchInput.dispatchEvent(new Event('change', { bubbles: true }));

                                let attempts = 0;
                                const check = setInterval(() => {
                                    const choices = payerSelector.querySelectorAll('.ui-select-choices-row');
                                    if (choices.length > 0) {
                                        let targetChoice;
                                        if (item.targetIndex !== undefined) {
                                            targetChoice = choices[item.targetIndex];
                                        } else {
                                            for (let choice of choices) {
                                                if (choice.innerText.includes(item.search)) {
                                                    targetChoice = choice;
                                                    break;
                                                }
                                            }
                                        }
                                        if (targetChoice) {
                                            clearInterval(check);
                                            const inner = targetChoice.querySelector('.ui-select-choices-row-inner') || targetChoice;
                                            ['mousedown', 'mouseup', 'click'].forEach(type => {
                                                inner.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
                                            });
                                            return;
                                        }
                                    }
                                    if (++attempts > 40) clearInterval(check);
                                }, 200);
                            }
                        }, 200);
                    };
                    row.appendChild(btn);
                });
                container.appendChild(row);
            });
            payerSelector.appendChild(container);
        }
    }

    const observer = new MutationObserver(injectShortcuts);
    observer.observe(document.body, { childList: true, subtree: true });
    injectShortcuts();
})();


/* Imported from Shortcuts.user.js; adapted for DanMed feature toggles. */
// ==UserScript==
// @name         Shortcuts
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Adds quick shortcuts
// @author       Assistant
// @match        *://*.modmedapp.com/*
// @grant        none
// ==/UserScript==

///
/// Raleigh office
///


(function() {
    'use strict';

    const locationShortcuts = [
        { label: "👤 Raleigh", search: "Raleigh, NC (3801)" }
    ];

    function injectlocationShortcuts() {
        if (!window.DanMedFeatureEnabled('locationShortcuts')) return;
        // Find the dropdown panel (ng-select creates this globally when opened)
        const panel = document.querySelector('ng-dropdown-panel');
        if (!panel || panel.dataset.locationShortcutsAdded) return;

        // 1. Identify the active ng-select element
        const activeSelect = document.querySelector('ng-select.ng-select-opened');
        if (!activeSelect) return;

        // 2. Identify the field by Placeholder OR Label (Label is safer if a value is already picked)
        const placeholderEl = activeSelect.querySelector('.ng-placeholder');
        const placeholderText = placeholderEl ? placeholderEl.innerText.trim() : '';
        const labelText = activeSelect.closest('.form-group')?.querySelector('label')?.innerText || '';

        const isProviderField = placeholderText === "Search Location" || labelText.includes("Location");

        // 3. Exit if this isn't the "Search Provider" field
        if (!isProviderField) return;

        const scrollHost = panel.querySelector('.scroll-host');
        if (!scrollHost) return;

        // Create the shortcut container
        const shortcutWrapper = document.createElement('div');
        shortcutWrapper.className = 'custom-location-shortcuts';
        shortcutWrapper.style.cssText = `
            max-height: 400px;
            overflow-y: auto;
            border-bottom: 2px solid #673AB7;
            background: #fff;
        `;

        const header = document.createElement('div');
        header.style.cssText = 'color: #673AB7; font-weight: bold; padding: 8px; background: #f3e5f5; border-bottom: 1px solid #d1c4e9; position: sticky; top: 0; z-index: 10; font-size: 10px;';
        header.innerText = 'Quick Location';
        shortcutWrapper.appendChild(header);

        locationShortcuts.forEach(item => {
            const div = document.createElement('div');
            div.className = 'ng-option';
            div.style.cssText = 'background-color: #ffffff; border-bottom: 1px solid #eee; cursor: pointer; padding: 10px 10px;';
            div.innerHTML = `<span class="ng-option-label" style="font-weight: 500; color: #512DA8;">${item.label}</span>`;

            div.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const input = activeSelect.querySelector('input[type="text"]');
                if (input) {
                    // 1. Reset and Focus
                    input.focus();
                    input.value = '';
                    input.dispatchEvent(new Event('input', { bubbles: true }));

                    // 2. Set the search value
                    input.value = item.search;
                    input.dispatchEvent(new Event('input', { bubbles: true }));

                    // 3. Poll for the result in the actual scroll-host
                    let attempts = 0;
                    const maxAttempts = 30; // 3 seconds total
                    const checkExist = setInterval(() => {
                        const currentPanel = document.querySelector('ng-dropdown-panel');
                        if (!currentPanel) {
                            clearInterval(checkExist);
                            return;
                        }

                        // Target ONLY the real options inside the scroll-host
                        const resultsContainer = currentPanel.querySelector('.scroll-host');
                        if (!resultsContainer) return;

                        const options = Array.from(resultsContainer.querySelectorAll('.ng-option'));
                        const target = options.find(opt =>
                            opt.innerText.toLowerCase().includes(item.search.toLowerCase())
                        );

                        if (target) {
                            clearInterval(checkExist);
                            // Angular ng-select listens for mousedown to handle selection
                            target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                            target.click();
                        }

                        attempts++;
                        if (attempts >= maxAttempts) {
                            clearInterval(checkExist);
                            console.warn('Location shortcut: Could not find result for ' + item.search);
                        }
                    }, 100);
                }
            };
            shortcutWrapper.appendChild(div);
        });

        panel.insertBefore(shortcutWrapper, scrollHost);
        panel.dataset.locationShortcutsAdded = "true";
    }

    // Polling to detect when the dropdown opens
    setInterval(injectlocationShortcuts, 300);

///
/// Staff shortcuts for tasks
///
  
  (function() {
    'use strict';

    const staffShortcuts = [
        { label: "👤 Lyndsye Sellars", search: "Sellars, Lyndsye" },       
        { label: "👤 Skylar Pritchett", search: "Pritchett, Skylar" },
        { label: "👤 Paige Barnes", search: "Barnes, Paige" },
        { label: "👤 Paige Kirk", search: "Kirk, Paige" },
        { label: "👤 Jimmy Ngo", search: "Ngo, Jimmy" },
        { label: "👤 Anjali Shah", search: "Shah, Anjali" },
        { label: "👤 Robbie Leonardo", search: "Leonardo, Robert" },
        { label: "👤 Madison Moraja", search: "Moraja, Madison" },
        { label: "👤 Jessica Richardson", search: "Richardson, Jessica" },
        { label: "👤 Joshua Robison", search: "Robison, Joshua" },
        { label: "👤 Grace Patel", search: "Patel, Grace" },
        { label: "👤 Sudhanshu Deshpande", search: "Deshpande, Sudhanshu" },
        { label: "👤 Ashton Andrews", search: "Andrews, Ashton" },
        { label: "👤 Sharon Higgs", search: "Higgs, Sharon" },
        { label: "👤 Meg Risinger", search: "Risinger, Meg" },
        { label: "👤 Sade Dennis", search: "Dennis, Sade" },
        { label: "👤 Shelia Hackley", search: "Hackley, Shelia" },
        { label: "👤 Deon Croom", search: "Croom, Deon" }
    ];

    function injectStaffShortcuts() {
        if (!window.DanMedFeatureEnabled('taskStaffShortcuts')) return;
        const panel = document.querySelector('ng-dropdown-panel');
        if (!panel || panel.dataset.staffShortcutsAdded) return;

        const activeSelect = document.querySelector('ng-select.ng-select-opened');
        if (!activeSelect || !activeSelect.closest('ema-staff-or-group-tasks-select')) return;

        const scrollHost = panel.querySelector('.scroll-host');
        if (!scrollHost) return;

        const shortcutWrapper = document.createElement('div');
        shortcutWrapper.className = 'custom-staff-shortcuts';
        shortcutWrapper.style.cssText = `
            max-height: 300px;
            overflow-y: auto;
            border-bottom: 2px solid #673AB7;
            background: #fff;
        `;

        const header = document.createElement('div');
        header.style.cssText = 'color: #673AB7; font-weight: bold; padding: 8px; background: #f3e5f5; border-bottom: 1px solid #d1c4e9; position: sticky; top: 0; z-index: 10; font-size: 10px;';
        header.innerText = 'QUICK STAFF SELECTION';
        shortcutWrapper.appendChild(header);

        staffShortcuts.forEach(item => {
            const div = document.createElement('div');
            // We use a custom class to avoid ng-select finding these as selectable options
            div.className = 'custom-shortcut-item';
            div.style.cssText = 'background-color: #ffffff; border-bottom: 1px solid #eee; cursor: pointer; padding: 8px 15px; transition: background 0.2s;';
            div.innerHTML = `<span style="font-weight: 500; color: #512DA8; font-size: 13px;">${item.label}</span>`;

            div.onmouseover = () => div.style.backgroundColor = '#f3e5f5';
            div.onmouseout = () => div.style.backgroundColor = '#ffffff';

            div.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const input = activeSelect.querySelector('input[type="text"]');
                if (input) {
                    // 1. Reset and Focus
                    input.focus();
                    input.value = '';
                    input.dispatchEvent(new Event('input', { bubbles: true }));

                    // 2. Set the search value
                    input.value = item.search;
                    input.dispatchEvent(new Event('input', { bubbles: true }));

                    // 3. Poll for the result in the actual scroll-host
                    let attempts = 0;
                    const maxAttempts = 30; // 3 seconds total
                    const checkExist = setInterval(() => {
                        const currentPanel = document.querySelector('ng-dropdown-panel');
                        if (!currentPanel) {
                            clearInterval(checkExist);
                            return;
                        }

                        // Target ONLY the real options inside the scroll-host
                        const resultsContainer = currentPanel.querySelector('.scroll-host');
                        if (!resultsContainer) return;

                        const options = Array.from(resultsContainer.querySelectorAll('.ng-option'));
                        const target = options.find(opt =>
                            opt.innerText.toLowerCase().includes(item.search.toLowerCase())
                        );

                        if (target) {
                            clearInterval(checkExist);
                            // Angular ng-select listens for mousedown to handle selection
                            target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                            target.click();
                        }

                        attempts++;
                        if (attempts >= maxAttempts) {
                            clearInterval(checkExist);
                            console.warn('Staff shortcut: Could not find result for ' + item.search);
                        }
                    }, 100);
                }
            };
            shortcutWrapper.appendChild(div);
        });

        panel.insertBefore(shortcutWrapper, scrollHost);
        panel.dataset.staffShortcutsAdded = "true";
    }

    // Polling to detect when the dropdown opens
    setInterval(injectStaffShortcuts, 300);

})();

})();


///
/// Staff shortcuts 
///

(function() {
    'use strict';

    const staffShortcuts = [
        { label: "👤 Lyndsye Sellars", search: "Sellars, Lyndsye" },
        { label: "👤 Skylar Pritchett", search: "Pritchett, Skylar" },
        { label: "👤 Paige Barnes", search: "Barnes, Paige" },
        { label: "👤 Paige Kirk", search: "Kirk, Paige" },
        { label: "👤 Jimmy Ngo", search: "Ngo, Jimmy" },
        { label: "👤 Anjali Shah", search: "Shah, Anjali" },
        { label: "👤 Robbie Leonardo", search: "Leonardo, Robert" },
        { label: "👤 Madison Moraja", search: "Moraja, Madison" },
        { label: "👤 Jessica Richardson", search: "Richardson, Jessica" },
        { label: "👤 Joshua Robison", search: "Robison, Joshua" },
        { label: "👤 Grace Patel", search: "Patel, Grace" },
        { label: "👤 Sudhanshu Deshpande", search: "Deshpande, Sudhanshu" },
        { label: "👤 Ashton Andrews", search: "Andrews, Ashton" },
        { label: "👤 Sharon Higgs", search: "Higgs, Sharon" },
        { label: "👤 Meg Risinger", search: "Risinger, Meg" },
        { label: "👤 Dan Nicks", search: "Nicks, Dan" },
        { label: "👤 Sade Dennis", search: "Dennis, Sade" },
        { label: "👤 Shelia Hackley", search: "Hackley, Shelia" },
        { label: "👤 Deon Croom", search: "Croom, Deon" }
    ];

    function injectStaffShortcuts() {
        if (!window.DanMedFeatureEnabled('staffShortcuts')) return;
        const panel = document.querySelector('ng-dropdown-panel');
        if (!panel || panel.dataset.staffShortcutsAdded) return;

        const activeSelect = document.querySelector('ng-select.ng-select-opened');
        if (!activeSelect || !activeSelect.closest('ema-staff-or-group-select')) return;

        const scrollHost = panel.querySelector('.scroll-host');
        if (!scrollHost) return;

        const shortcutWrapper = document.createElement('div');
        shortcutWrapper.className = 'custom-staff-shortcuts';
        shortcutWrapper.style.cssText = `
            max-height: 300px;
            overflow-y: auto;
            border-bottom: 2px solid #673AB7;
            background: #fff;
        `;

        const header = document.createElement('div');
        header.style.cssText = 'color: #673AB7; font-weight: bold; padding: 8px; background: #f3e5f5; border-bottom: 1px solid #d1c4e9; position: sticky; top: 0; z-index: 10; font-size: 10px;';
        header.innerText = 'QUICK STAFF SELECTION';
        shortcutWrapper.appendChild(header);

        staffShortcuts.forEach(item => {
            const div = document.createElement('div');
            // We use a custom class to avoid ng-select finding these as selectable options
            div.className = 'custom-shortcut-item';
            div.style.cssText = 'background-color: #ffffff; border-bottom: 1px solid #eee; cursor: pointer; padding: 8px 15px; transition: background 0.2s;';
            div.innerHTML = `<span style="font-weight: 500; color: #512DA8; font-size: 13px;">${item.label}</span>`;

            div.onmouseover = () => div.style.backgroundColor = '#f3e5f5';
            div.onmouseout = () => div.style.backgroundColor = '#ffffff';

            div.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const input = activeSelect.querySelector('input[type="text"]');
                if (input) {
                    // 1. Reset and Focus
                    input.focus();
                    input.value = '';
                    input.dispatchEvent(new Event('input', { bubbles: true }));

                    // 2. Set the search value
                    input.value = item.search;
                    input.dispatchEvent(new Event('input', { bubbles: true }));

                    // 3. Poll for the result in the actual scroll-host
                    let attempts = 0;
                    const maxAttempts = 30; // 3 seconds total
                    const checkExist = setInterval(() => {
                        const currentPanel = document.querySelector('ng-dropdown-panel');
                        if (!currentPanel) {
                            clearInterval(checkExist);
                            return;
                        }

                        // Target ONLY the real options inside the scroll-host
                        const resultsContainer = currentPanel.querySelector('.scroll-host');
                        if (!resultsContainer) return;

                        const options = Array.from(resultsContainer.querySelectorAll('.ng-option'));
                        const target = options.find(opt =>
                            opt.innerText.toLowerCase().includes(item.search.toLowerCase())
                        );

                        if (target) {
                            clearInterval(checkExist);
                            // Angular ng-select listens for mousedown to handle selection
                            target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                            target.click();
                        }

                        attempts++;
                        if (attempts >= maxAttempts) {
                            clearInterval(checkExist);
                            console.warn('Staff shortcut: Could not find result for ' + item.search);
                        }
                    }, 100);
                }
            };
            shortcutWrapper.appendChild(div);
        });

        panel.insertBefore(shortcutWrapper, scrollHost);
        panel.dataset.staffShortcutsAdded = "true";
    }

    // Polling to detect when the dropdown opens
    setInterval(injectStaffShortcuts, 300);

})();


///
/// Providers
///

(function() {
    'use strict';

    const staffShortcuts = [
        { label: "👤 Patrick Dougherty", search: "Dougherty, Patrick" },
        { label: "👤 Kirk Woelffer", search: "Woelffer, Kirk" },
        { label: "👤 Douglas Smith", search: "Smith, Douglas" },
        { label: "👤 Jordan Meyers", search: "Meyers, Jordan" },
        { label: "👤 Alan Boehm", search: "Boehm, Alan" },
        { label: "👤 Charles Korba", search: "Korba, Charles" },
        { label: "👤 Daniel Narowitz", search: "Narowitz, Daniel" },
        { label: "👤 Amanda Arnold", search: "Arnold, Amanda" },
        { label: "👤 Stacey Batts", search: "Batts, Stacey" },
        { label: "👤 Asia Hall", search: "Hall, Asia" },
        { label: "👤 Mariah McFadden", search: "McFadden, Mariah" },
        { label: "👤 Tamara Volkonska", search: "Volkonska, Tamara" },
        { label: "👤 Lataijha Thomas", search: "Thomas, Lataijha" }
    ];

    function injectStaffShortcuts() {
        if (!window.DanMedFeatureEnabled('providerShortcuts')) return;
        // Find the dropdown panel (ng-select creates this globally when opened)
        const panel = document.querySelector('ng-dropdown-panel');
        if (!panel || panel.dataset.staffShortcutsAdded) return;

        // 1. Identify the active ng-select element
        const activeSelect = document.querySelector('ng-select.ng-select-opened');
        if (!activeSelect) return;

        // 2. Identify the field by Placeholder OR Label (Label is safer if a value is already picked)
        const placeholderEl = activeSelect.querySelector('.ng-placeholder');
        const placeholderText = placeholderEl ? placeholderEl.innerText.trim() : '';
        const labelText = activeSelect.closest('.form-group')?.querySelector('label')?.innerText || '';

        const isProviderField = placeholderText === "Search Provider" || labelText.includes("Provider");

        // 3. Exit if this isn't the "Search Provider" field
        if (!isProviderField) return;

        const scrollHost = panel.querySelector('.scroll-host');
        if (!scrollHost) return;

        // Create the shortcut container
        const shortcutWrapper = document.createElement('div');
        shortcutWrapper.className = 'custom-staff-shortcuts';
        shortcutWrapper.style.cssText = `
            max-height: 400px;
            overflow-y: auto;
            border-bottom: 2px solid #673AB7;
            background: #fff;
        `;

        const header = document.createElement('div');
        header.style.cssText = 'color: #673AB7; font-weight: bold; padding: 8px; background: #f3e5f5; border-bottom: 1px solid #d1c4e9; position: sticky; top: 0; z-index: 10; font-size: 10px;';
        header.innerText = 'Quick Providers';
        shortcutWrapper.appendChild(header);

        staffShortcuts.forEach(item => {
            const div = document.createElement('div');
            div.className = 'ng-option';
            div.style.cssText = 'background-color: #ffffff; border-bottom: 1px solid #eee; cursor: pointer; padding: 10px 10px;';
            div.innerHTML = `<span class="ng-option-label" style="font-weight: 500; color: #512DA8;">${item.label}</span>`;

            div.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const input = activeSelect.querySelector('input[type="text"]');
                if (input) {
                    // 1. Reset and Focus
                    input.focus();
                    input.value = '';
                    input.dispatchEvent(new Event('input', { bubbles: true }));

                    // 2. Set the search value
                    input.value = item.search;
                    input.dispatchEvent(new Event('input', { bubbles: true }));

                    // 3. Poll for the result in the actual scroll-host
                    let attempts = 0;
                    const maxAttempts = 30; // 3 seconds total
                    const checkExist = setInterval(() => {
                        const currentPanel = document.querySelector('ng-dropdown-panel');
                        if (!currentPanel) {
                            clearInterval(checkExist);
                            return;
                        }

                        // Target ONLY the real options inside the scroll-host
                        const resultsContainer = currentPanel.querySelector('.scroll-host');
                        if (!resultsContainer) return;

                        const options = Array.from(resultsContainer.querySelectorAll('.ng-option'));
                        const target = options.find(opt =>
                            opt.innerText.toLowerCase().includes(item.search.toLowerCase())
                        );

                        if (target) {
                            clearInterval(checkExist);
                            // Angular ng-select listens for mousedown to handle selection
                            target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                            target.click();
                        }

                        attempts++;
                        if (attempts >= maxAttempts) {
                            clearInterval(checkExist);
                            console.warn('Staff shortcut: Could not find result for ' + item.search);
                        }
                    }, 100);
                }
            };
            shortcutWrapper.appendChild(div);
        });

        panel.insertBefore(shortcutWrapper, scrollHost);
        panel.dataset.staffShortcutsAdded = "true";
    }

    // Polling to detect when the dropdown opens
    setInterval(injectStaffShortcuts, 300);

})();


///
/// Fax Options
///

(function() {
    'use strict';

    const observer = new MutationObserver(() => {
        if (!window.DanMedFeatureEnabled('faxOptionRenaming')) return;
        // 1. Target container by tag name (more stable than ID)
        const container = document.querySelector('typeahead-container');
        if (!container) return;

        // 2. Find the target span
        const spans = container.querySelectorAll('li span');

        spans.forEach(span => {
            if (span.textContent.trim() === "Additional Testing") {
                // Change the visual text
                span.textContent = "Referral";

                // 3. Handle the click logic
                const parentLink = span.closest('a');
                if (parentLink && !parentLink.dataset.hooked) {
                    parentLink.addEventListener('mousedown', () => {
                        // Use the stable data-identifier for the input
                        const input = document.querySelector('input[data-identifier="create-task-details"]');
                        if (input) {
                            setTimeout(() => {
                                // Force the new value into the input
                                input.value = "Referral";
                                // Dispatch events so Angular detects the change
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                                // Blur to close the dropdown if it stays open
                                input.blur();
                            }, 10);
                        }
                    }, true);
                    parentLink.dataset.hooked = "true";
                }
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();

(function() {
    'use strict';

    const observer = new MutationObserver(() => {
        // 1. Target container by tag name (more stable than ID)
        const container = document.querySelector('typeahead-container');
        if (!container) return;

        // 2. Find the target span
        const spans = container.querySelectorAll('li span');

        spans.forEach(span => {
            if (span.textContent.trim() === "Benign") {
                // Change the visual text
                span.textContent = "Vascular";

                // 3. Handle the click logic
                const parentLink = span.closest('a');
                if (parentLink && !parentLink.dataset.hooked) {
                    parentLink.addEventListener('mousedown', () => {
                        // Use the stable data-identifier for the input
                        const input = document.querySelector('input[data-identifier="create-task-details"]');
                        if (input) {
                            setTimeout(() => {
                                // Force the new value into the input
                                input.value = "Vascular";
                                // Dispatch events so Angular detects the change
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                                // Blur to close the dropdown if it stays open
                                input.blur();
                            }, 10);
                        }
                    }, true);
                    parentLink.dataset.hooked = "true";
                }
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();

(function() {
    'use strict';

    const observer = new MutationObserver(() => {
        // 1. Target container by tag name (more stable than ID)
        const container = document.querySelector('typeahead-container');
        if (!container) return;

        // 2. Find the target span
        const spans = container.querySelectorAll('li span');

        spans.forEach(span => {
            if (span.textContent.trim() === "Discuss at Follow-up") {
                // Change the visual text
                span.textContent = "Records Request";

                // 3. Handle the click logic
                const parentLink = span.closest('a');
                if (parentLink && !parentLink.dataset.hooked) {
                    parentLink.addEventListener('mousedown', () => {
                        // Use the stable data-identifier for the input
                        const input = document.querySelector('input[data-identifier="create-task-details"]');
                        if (input) {
                            setTimeout(() => {
                                // Force the new value into the input
                                input.value = "Records Request";
                                // Dispatch events so Angular detects the change
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                                // Blur to close the dropdown if it stays open
                                input.blur();
                            }, 10);
                        }
                    }, true);
                    parentLink.dataset.hooked = "true";
                }
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();

(function() {
    'use strict';

    const observer = new MutationObserver(() => {
        // 1. Target container by tag name (more stable than ID)
        const container = document.querySelector('typeahead-container');
        if (!container) return;

        // 2. Find the target span
        const spans = container.querySelectorAll('li span');

        spans.forEach(span => {
            if (span.textContent.trim() === "Follow-up Appt") {
                // Change the visual text
                span.textContent = "PT Plan of Care";

                // 3. Handle the click logic
                const parentLink = span.closest('a');
                if (parentLink && !parentLink.dataset.hooked) {
                    parentLink.addEventListener('mousedown', () => {
                        // Use the stable data-identifier for the input
                        const input = document.querySelector('input[data-identifier="create-task-details"]');
                        if (input) {
                            setTimeout(() => {
                                // Force the new value into the input
                                input.value = "PT Plan of Care";
                                // Dispatch events so Angular detects the change
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                                // Blur to close the dropdown if it stays open
                                input.blur();
                            }, 10);
                        }
                    }, true);
                    parentLink.dataset.hooked = "true";
                }
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();

(function() {
    'use strict';

    const observer = new MutationObserver(() => {
        // 1. Target container by tag name (more stable than ID)
        const container = document.querySelector('typeahead-container');
        if (!container) return;

        // 2. Find the target span
        const spans = container.querySelectorAll('li span');

        spans.forEach(span => {
            if (span.textContent.trim() === "Normal") {
                // Change the visual text
                span.textContent = "Care Considerations";

                // 3. Handle the click logic
                const parentLink = span.closest('a');
                if (parentLink && !parentLink.dataset.hooked) {
                    parentLink.addEventListener('mousedown', () => {
                        // Use the stable data-identifier for the input
                        const input = document.querySelector('input[data-identifier="create-task-details"]');
                        if (input) {
                            setTimeout(() => {
                                // Force the new value into the input
                                input.value = "Care Considerations";
                                // Dispatch events so Angular detects the change
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                                // Blur to close the dropdown if it stays open
                                input.blur();
                            }, 10);
                        }
                    }, true);
                    parentLink.dataset.hooked = "true";
                }
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();


(function() {
    'use strict';

    const observer = new MutationObserver(() => {
        // 1. Target container by tag name (more stable than ID)
        const container = document.querySelector('typeahead-container');
        if (!container) return;

        // 2. Find the target span
        const spans = container.querySelectorAll('li span');

        spans.forEach(span => {
            if (span.textContent.trim() === "No Further Treatment") {
                // Change the visual text
                span.textContent = "Disability Paperwork";

                // 3. Handle the click logic
                const parentLink = span.closest('a');
                if (parentLink && !parentLink.dataset.hooked) {
                    parentLink.addEventListener('mousedown', () => {
                        // Use the stable data-identifier for the input
                        const input = document.querySelector('input[data-identifier="create-task-details"]');
                        if (input) {
                            setTimeout(() => {
                                // Force the new value into the input
                                input.value = "Disability Paperwork";
                                // Dispatch events so Angular detects the change
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                                // Blur to close the dropdown if it stays open
                                input.blur();
                            }, 10);
                        }
                    }, true);
                    parentLink.dataset.hooked = "true";
                }
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();

(function() {
    'use strict';

    const observer = new MutationObserver(() => {
        // 1. Target container by tag name (more stable than ID)
        const container = document.querySelector('typeahead-container');
        if (!container) return;

        // 2. Find the target span
        const spans = container.querySelectorAll('li span');

        spans.forEach(span => {
            if (span.textContent.trim() === "PCP") {
                // Change the visual text
                span.textContent = "History & Physical";

                // 3. Handle the click logic
                const parentLink = span.closest('a');
                if (parentLink && !parentLink.dataset.hooked) {
                    parentLink.addEventListener('mousedown', () => {
                        // Use the stable data-identifier for the input
                        const input = document.querySelector('input[data-identifier="create-task-details"]');
                        if (input) {
                            setTimeout(() => {
                                // Force the new value into the input
                                input.value = "History & Physical";
                                // Dispatch events so Angular detects the change
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                                // Blur to close the dropdown if it stays open
                                input.blur();
                            }, 10);
                        }
                    }, true);
                    parentLink.dataset.hooked = "true";
                }
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();

(function() {
    'use strict';

    const observer = new MutationObserver(() => {
        // 1. Target container by tag name (more stable than ID)
        const container = document.querySelector('typeahead-container');
        if (!container) return;

        // 2. Find the target span
        const spans = container.querySelectorAll('li span');

        spans.forEach(span => {
            if (span.textContent.trim() === "Procedure") {
                // Change the visual text
                span.textContent = "Radiology";

                // 3. Handle the click logic
                const parentLink = span.closest('a');
                if (parentLink && !parentLink.dataset.hooked) {
                    parentLink.addEventListener('mousedown', () => {
                        // Use the stable data-identifier for the input
                        const input = document.querySelector('input[data-identifier="create-task-details"]');
                        if (input) {
                            setTimeout(() => {
                                // Force the new value into the input
                                input.value = "Radiology";
                                // Dispatch events so Angular detects the change
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                                // Blur to close the dropdown if it stays open
                                input.blur();
                            }, 10);
                        }
                    }, true);
                    parentLink.dataset.hooked = "true";
                }
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();

(function() {
    'use strict';

    const observer = new MutationObserver(() => {
        // 1. Target container by tag name (more stable than ID)
        const container = document.querySelector('typeahead-container');
        if (!container) return;

        // 2. Find the target span
        const spans = container.querySelectorAll('li span');

        spans.forEach(span => {
            if (span.textContent.trim() === "Referring Provider") {
                // Change the visual text
                span.textContent = "Progress Report";

                // 3. Handle the click logic
                const parentLink = span.closest('a');
                if (parentLink && !parentLink.dataset.hooked) {
                    parentLink.addEventListener('mousedown', () => {
                        // Use the stable data-identifier for the input
                        const input = document.querySelector('input[data-identifier="create-task-details"]');
                        if (input) {
                            setTimeout(() => {
                                // Force the new value into the input
                                input.value = "Progress Report";
                                // Dispatch events so Angular detects the change
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                                // Blur to close the dropdown if it stays open
                                input.blur();
                            }, 10);
                        }
                    }, true);
                    parentLink.dataset.hooked = "true";
                }
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();


(function() {
    'use strict';

    const observer = new MutationObserver(() => {
        // 1. Target container by tag name (more stable than ID)
        const container = document.querySelector('typeahead-container');
        if (!container) return;

        // 2. Find the target span
        const spans = container.querySelectorAll('li span');

        spans.forEach(span => {
            if (span.textContent.trim() === "Results") {
                // Change the visual text
                span.textContent = "Pathology Report";

                // 3. Handle the click logic
                const parentLink = span.closest('a');
                if (parentLink && !parentLink.dataset.hooked) {
                    parentLink.addEventListener('mousedown', () => {
                        // Use the stable data-identifier for the input
                        const input = document.querySelector('input[data-identifier="create-task-details"]');
                        if (input) {
                            setTimeout(() => {
                                // Force the new value into the input
                                input.value = "Pathology Report";
                                // Dispatch events so Angular detects the change
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                                // Blur to close the dropdown if it stays open
                                input.blur();
                            }, 10);
                        }
                    }, true);
                    parentLink.dataset.hooked = "true";
                }
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();


/* Imported from SelfPay.user.js; adapted for DanMed feature toggles. */
// ==UserScript==
// @name        Self Pay Charges Auto Override
// @namespace   Violentmonkey Scripts
// @icon        https://usfas.modmedapp.com/ema/static/images/favicon.ico
// @version     1.1.0
// @description  Clicks Override Bill and applies price map only if Provider Fee Schedule is set to Self Pay Fee Schedule Oct 2025, skipping if already overridden unless new CPT codes are detected.
// @match       https://usfas.modmedapp.com/ema/web/practice/staff/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
 
(function() {
    'use strict';
 
    // CPT Code to Charge Map
    const CHARGE_MAP = {
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
    };
 
    let hasClicked = false;
    let hasOverridden = false;
 
    function isSelfPayFeeSchedule(doc) {
        return doc.body && doc.body.innerText.includes('Self Pay Fee Schedule Oct 2025');
    }
 
    function isAlreadyOverridden(doc) {
        return doc.body && doc.body.innerText.includes('This bill has been overridden');
    }
 
    // Checks if any CPT listed on the page does NOT match the expected mapped price
    function hasUnprocessedCPTCodes(doc) {
        const rows = Array.from(doc.querySelectorAll('table tbody tr'));
 
        return rows.some(row => {
            const rowText = row.innerText || '';
 
            // Check row against mapped CPT keys
            for (const cpt in CHARGE_MAP) {
                if (rowText.includes(cpt)) {
                    const expectedPrice = CHARGE_MAP[cpt];
                    // If row lacks the mapped target price, it is an unprocessed code
                    if (!rowText.includes(`$${expectedPrice}`)) {
                        return true;
                    }
                }
            }
            return false;
        });
    }
 
    function setNativeValue(element, value) {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
        const prototypeSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')?.set;
 
        if (prototypeSetter && valueSetter !== prototypeSetter) {
            prototypeSetter.call(element, value);
        } else if (valueSetter) {
            valueSetter.call(element, value);
        } else {
            element.value = value;
        }
    }
 
    function triggerClick(element) {
        ['mousedown', 'mouseup', 'click'].forEach(eventType => {
            element.dispatchEvent(new MouseEvent(eventType, {
                bubbles: true,
                cancelable: true,
                view: window
            }));
        });
    }
 
    function clickOverrideButton(doc) {
        const buttons = Array.from(doc.querySelectorAll('button, input[type="button"], input[type="submit"], a.btn'));
        const overrideBtn = buttons.find(btn => btn.textContent.trim().includes('Override Code') || btn.value?.includes('Override Code'));
 
        if (overrideBtn) {
            overrideBtn.click();
            hasOverridden = true;
        }
    }
 
    function attemptOverride(doc) {
        if (hasClicked || !isSelfPayFeeSchedule(doc)) return;
 
        // Support both initial override and editing an existing override when new charges appear
        const overrideBtn = doc.querySelector('[data-identifier="visitOverviewOverrideBillButton"]') ||
                            Array.from(doc.querySelectorAll('a, span, button')).find(
                                el => el.textContent.trim() === 'Override Bill' || el.textContent.trim() === 'Edit Overridden Bill'
                            );
 
        if (overrideBtn) {
            hasClicked = true;
            overrideBtn.focus();
            triggerClick(overrideBtn);
        }
    }
 
    function processDocument(doc) {
        if (hasOverridden || !isSelfPayFeeSchedule(doc)) return;
 
        const rows = doc.querySelectorAll('table tbody tr');
        let valueUpdated = false;
 
        rows.forEach(row => {
            const codeInput = row.querySelector('input[data-identifier="override-bill-cpt-code"]');
            if (!codeInput) return;
 
            const currentCode = codeInput.value.trim();
 
            if (CHARGE_MAP[currentCode]) {
                const newCharge = CHARGE_MAP[currentCode];
                const chargeInput = row.querySelector('input[data-identifier="override-bill-cpt-charge"]');
 
                if (chargeInput && chargeInput.value !== newCharge) {
                    setNativeValue(chargeInput, newCharge);
                    chargeInput.dispatchEvent(new Event('input', { bubbles: true }));
                    chargeInput.dispatchEvent(new Event('change', { bubbles: true }));
                    chargeInput.dispatchEvent(new Event('blur', { bubbles: true }));
                    valueUpdated = true;
                }
            }
        });
 
        if (valueUpdated) {
            setTimeout(() => {
                clickOverrideButton(doc);
            }, 500);
        }
    }
 
    function runAllChecks() {
        if (!window.DanMedFeatureEnabled('selfPayOverrides')) return;
        const docs = [document];
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            try {
                if (iframe.contentDocument) docs.push(iframe.contentDocument);
            } catch (e) {
                // Cross-origin iframe bypass
            }
        });
 
        for (const doc of docs) {
            // If already overridden AND no new/unprocessed CPT codes exist, skip execution
            if (isAlreadyOverridden(doc) && !hasUnprocessedCPTCodes(doc)) {
                clearInterval(intervalId);
                return;
            }
        }
 
        if (hasClicked && hasOverridden) return;
 
        docs.forEach(doc => {
            if (!hasClicked) attemptOverride(doc);
            if (!hasOverridden) processDocument(doc);
        });
    }
 
    const intervalId = setInterval(() => {
        runAllChecks();
    }, 500);
})();

