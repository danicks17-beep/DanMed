# DanMed

DanMed is a Manifest V3 browser extension that adds workflow shortcuts, task-management tools, billing helpers, attachment shortcuts, and display improvements to the ModMed EMA staff application.

The extension is intended for the ModMed staff application at `https://*.modmedapp.com/ema/web/practice/staff/*`.

> **Important:** DanMed changes the ModMed page interface and automates selections based on the current ModMed DOM. ModMed updates can change selectors or page behavior and may require corresponding updates to the extension. Review automated billing and insurance behavior before relying on it in a production workflow.

## Features

### Task management

- Snooze tasks and persist snooze metadata.
- Add task labels and row colors.
- Display a dedicated label column in the task list.
- Add a Snoozed task tab.
- Show note previews when hovering over task rows.
- Automatically set **View Records By** to **100** on task-management pages.

### ModMed shortcuts

- **OTC Charge Shortcuts** — quick selection of configured OTC products and charges.
- **Insurance Payer Shortcuts** — grouped payer shortcuts for common commercial, military, Medicaid, Medicare, and supplemental payers.
- **Location Shortcuts** — quick location selection, including Raleigh.
- **Task Staff Shortcuts** — quick staff assignment options in task workflows.
- **Staff Shortcuts** — staff selection shortcuts in supported ModMed forms.
- **Provider Shortcuts** — provider selection shortcuts.
- **Fax Option Renaming** — clearer labels for supported fax options.

### Appointment and billing helpers

- Highlight New Patient, Salon, and Laser appointments.
- Apply self-pay billing overrides when the configured self-pay fee schedule is detected.
- Detect unprocessed CPT codes before applying self-pay overrides.
- Preserve existing safety checks so an already-overridden bill is not repeatedly overridden unless new CPT codes are present.

### Attachment document shortcuts

When the attachment title field is available, DanMed adds two buttons:

- **L3000** — sets the title to `L3000 Proof of Delivery` and selects the `DME` category.
- **Vascular** — sets the title to `Vascular Referral` and selects the `Clinical Document` category.

The shortcuts dispatch input/change events, select the filtered Angular dropdown option, and blur the field to commit the selection.

### Page titles

DanMed updates the browser tab title as ModMed navigates between routes:

| ModMed route | Tab title |
|---|---|
| Master Check-In home | `Appt Flow` |
| Check In for a patient | `Check In: [Patient Name]` |
| Check Out for a patient | `Check Out: [Patient Name]` |
| Patient chart overview | `[Patient Name]` |
| Patient Financials | `[Patient Name]: Financials` |
| Patient Contact Info | `[Patient Name]: Contact Info` |
| Patient chart Tasks | `[Patient Name]: Tasks` |
| Patient Insurance | `[Patient Name]: Insurance` |
| Task list | `Tasks` |
| Task details | `Task Details: [Patient Name]` |
| Scheduler | `Schedule` |

Patient names are read from the visible ModMed patient header and are reapplied after delayed Angular rendering and single-page-app navigation.

### Records-per-page automation

DanMed automatically selects **100** for **View Records By** on:

- Task-management pages, which normally default to 10.
- Received faxes, which normally default to 25.

The setting is reapplied after ModMed rerenders the page or changes routes.

## Popup controls

Click the DanMed extension icon to open the controls popup. Settings are saved with `chrome.storage.local` and are sent to the active ModMed tab immediately.

- **Extension Enabled** — master switch for all DanMed functionality.
- **Task Snoozing, Labels & Colors**
- **Note Hover Previews**
- **OTC Charge Shortcuts**
- **Insurance Payer Shortcuts**
- **Location Shortcuts**
- **Task Staff Shortcuts**
- **Staff Shortcuts**
- **Provider Shortcuts**
- **Fax Option Renaming**
- **Attachment Document Shortcuts**
- **Appointment Highlighting**
- **Self-Pay Charge Overrides**

All feature switches are enabled by default. Turning off the master switch disables all feature-gated behavior without deleting saved settings.

## Installation in Chrome or Edge

1. Download or clone this repository.
2. Open the browser extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the repository's `DanMed` directory—the directory containing `manifest.json`.
6. Open or refresh a ModMed staff page.
7. Click the DanMed icon and configure the feature switches.

After pulling new changes, return to the extensions page and click **Reload** for DanMed. Refresh any open ModMed tabs afterward.

## Repository layout

```text
DanMed/
├── manifest.json   # Manifest V3 metadata, permissions, and content-script registration
├── content.js      # Shared settings, route titles, task tools, and page automation
├── features.js     # Integrated shortcut, appointment, billing, and attachment features
├── popup.html      # Extension popup UI and feature switches
├── popup.js        # Popup settings persistence and live messaging
├── styles.css      # Injected ModMed page styles
└── icon.png        # Extension icon
```

## Development

The extension is plain JavaScript and does not require a build step or package manager.

Useful checks:

```bash
node --check DanMed/content.js
node --check DanMed/features.js
node --check DanMed/popup.js
```

When adding a feature:

1. Add a default setting to both `DanMed/content.js` and `DanMed/popup.js`.
2. Add a corresponding checkbox to `DanMed/popup.html`.
3. Guard the feature with `window.DanMedFeatureEnabled('settingName')`.
4. Add cleanup behavior when the feature is disabled.
5. Test the feature after a full page load and after in-app ModMed navigation.
6. Reload the unpacked extension and refresh the ModMed tab.

## Permissions and scope

DanMed requests only the `storage` permission. Its content scripts are limited by the manifest to ModMed EMA staff routes matching:

```text
https://*.modmedapp.com/ema/web/practice/staff/*
```

The extension does not require TamperMonkey or ViolentMonkey. Integrated scripts run as part of DanMed's content-script and feature-module load order.

## Source history

The current implementation was based on the DanMed baseline at commit `8c3c366` and incorporates functionality adapted from the related TamperMonkey and ViolentMonkey repositories. The current GitHub `main` branch contains the integrated extension implementation.
