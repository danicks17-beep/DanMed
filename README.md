# DanMed

DanMed is a Manifest V3 browser extension for ModMed workflows at USFAS. Version 5.0 integrates the functionality previously delivered through the TamperMonkey and ViolentMonkey repositories into the extension itself, so the userscript browser extensions are no longer required.

## Integrated features

- Existing task snoozing, labels, colors, cached note hover previews, and the Snoozed task view.
- Appointment highlighting for New Patient, Salon, and Laser 30 appointments.
- Add Charges OTC sidebar with categories, search, favorites, default code/price/description filling, and a form for adding custom shortcuts.
- Location, provider, and staff shortcuts for ModMed `ng-select` dropdowns.
- Grouped insurance payer shortcuts.
- Fax/task type aliases from the Shortcuts userscript.
- Self-pay override processing using the full CPT charge map from the ViolentMonkey script.
- A popup settings page with a master switch and an independent toggle for each feature.
- Task-management helpers that request 100 records per page, hide Due Date, provide labeled/color tabs and filters, and expose a quick reassignment panel on task details.

## Installation

1. Open the browser extensions page and enable Developer mode.
2. Choose **Load unpacked** and select the `DanMed/DanMed` directory.
3. Open ModMed and use the DanMed toolbar button to configure the features.

The extension only matches `https://*.modmedapp.com/ema/web/practice/staff/*`. Settings and custom OTC shortcuts are stored in the browser extension's local storage.

## OTC sidebar

Open **Add Charges**. The OTC Shortcuts sidebar appears inside the dialog. Search by shortcut name, code, or description. Expand a category and click a product to select it in the real ModMed product field and populate its description and price. Use the star to add or remove Favorites. **+ Add shortcut** lets a user create a custom shortcut with a category, code, description, and optional price.

The extension does not automatically post a charge; users still review and click ModMed's Add Charge or Post buttons.

When Add Charges is open, the catalog is limited to OTC shortcuts and does not add insurance or previous-charge provider/location panels. Task labels are assigned from the Label column picker in the task grid; the Snooze dialog stores only an optional snooze note.
