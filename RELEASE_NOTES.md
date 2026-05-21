# Release Notes — InstantSOP v1.2.0

We are excited to release **InstantSOP v1.2.0**, bringing highly requested stability improvements, automatic session persistence, full system Dark Mode, and premium visual polish to the click-to-document workflow.

---

## 🚀 What's New in v1.2.0

### 💾 Stateless Storage & Session Persistence
* **Stateless Service Worker**: Refactored the service worker in `background.js` to store active state in `chrome.storage.local`. The extension is now fully resilient against Google Chrome's ephemeral Manifest V3 service worker suspends (~30s of inactivity).
* **Side Panel Recovery**: Recorded steps, notes, captured timestamps, and the custom guide title are now written to local storage in real time. Accidental side panel closures or page navigation changes will no longer result in lost guides.
* **Guide Title Persistence**: The active working title inside the side panel input is fully preserved and restored upon reloading.

### 🎨 Modern Premium Visual Design
* **Adaptive Dark Theme**: Full out-of-the-box support for system preference Dark Mode. The UI seamlessly pivots color schemes using harmonized dark HSL values.
* **Plus Jakarta Sans Typography**: Replaced default browser system sans font with the elegant modern sans-serif *Plus Jakarta Sans* for clean, modern legibility.
* **Fluid Keyframe Entrance Animations**: Captured step cards now ease-in with a smooth custom cubic-bezier translate/scale translation when populated in the list.
* **Tactile Button Press Interactions**: Added physical scaling transitions on `:active` button triggers to make the sidebar feel dynamic and alive.

### 🐞 Bug Fixes & Architecture Repairs
* **Missing `tabs` Permission Fix**: Declared `"tabs"` permission explicitly inside `manifest.json`. This resolves a total blocker where launching a recording from the side panel returned an `undefined` URL, crashing the recording trigger with the error: `"Cannot record on this page"`.
* **Step Notes Redraw Fix**: Solved a bug where deleting a step card or triggering a list redraw would wipe out text inside note fields due to missing text node value initialization.
* **Basecamp Host Path Corrected**: Updated the hardcoded basecamp bridge path in `basecamp_host_manifest.json` from the stale `howto-generator` repository name to the corrected project workspace folder.

---

## 💾 Installation & Update

To update your unpacked extension in Chrome:
1. Open `chrome://extensions`.
2. Locate the **InstantSOP** card.
3. Click the circular **Reload/Refresh** icon in the bottom-right corner of the card.
