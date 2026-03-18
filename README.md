# InstantSOP

A Chrome extension that generates step-by-step how-to guides automatically. Just click through a workflow and InstantSOP captures each step with a screenshot and description.

## How It Works

1. Open the side panel and click **Start Recording**
2. Navigate and click through any workflow on any website
3. Each click automatically:
   - Captures a screenshot of the page
   - Highlights where you clicked (purple ring)
   - Describes what you clicked (button, link, input, etc.)
4. Click **Stop Recording** when done
5. Export your guide as **Markdown** or **HTML**

## Install

1. Clone or download this repo
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select this folder
5. Click the InstantSOP icon in your toolbar to open the side panel

## Features

- Automatic screenshot on every click
- Smart element descriptions (buttons, links, inputs, dropdowns, images)
- Visual click highlight captured in screenshots
- Editable notes on each step
- Delete or reorder steps
- Export to Markdown (clipboard) or self-contained HTML
- Zero external dependencies — no API keys needed
- All data stays local in your browser

## Export Formats

### Markdown
Copies to clipboard. Each step includes the description, optional notes, and an embedded screenshot.

### HTML
Downloads a self-contained HTML file with embedded images. Print-friendly — works great as a PDF via the browser's print dialog.

## Permissions

- **activeTab**: Required to capture screenshots of the current tab
- **sidePanel**: Required for the sidebar UI
- **scripting**: Required to inject the click detection script
