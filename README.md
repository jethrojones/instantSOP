# InstantSOP

Turn any workflow into a step-by-step guide — automatically.

InstantSOP is a Chrome extension that watches you click through a process and builds a how-to guide as you go. Every click captures a screenshot, highlights where you clicked, and describes what you interacted with. When you're done, export the guide or publish it directly to a Writebook instance.

No video recording. No manual screenshots. No writing. Just do the thing, and InstantSOP documents it.

## What It Does

1. You open the side panel and click **Start Recording**
2. You click through any workflow on any website — logging into a tool, creating an invoice, setting up a user account, whatever
3. On every click, InstantSOP automatically:
   - Takes a full-page screenshot
   - Draws a purple highlight ring where you clicked (captured in the screenshot)
   - Identifies what you clicked — "Clicked the 'Save' button", "Clicked link 'Dashboard'", "Clicked the 'Email' input field"
4. You click **Stop Recording**
5. You now have a complete guide with numbered steps, descriptions, and screenshots
6. Export as **Markdown**, **HTML**, or publish directly to **Writebook**

## Install (Developer Mode)

Since InstantSOP is not on the Chrome Web Store, you install it as an unpacked extension:

1. **Download the code**
   - Click the green **Code** button on GitHub, then **Download ZIP**
   - Unzip it somewhere on your computer (e.g., your Desktop or Documents folder)
   - Or if you use git: `git clone https://github.com/jethrojones/instantSOP.git`

2. **Open Chrome's extension page**
   - Type `chrome://extensions` in your address bar and hit Enter

3. **Enable Developer Mode**
   - Flip the **Developer mode** toggle in the top-right corner of the page

4. **Load the extension**
   - Click **Load unpacked**
   - Navigate to the folder you downloaded/unzipped and select it
   - You should see "InstantSOP" appear in your extensions list

5. **Pin it to your toolbar** (optional but recommended)
   - Click the puzzle piece icon in Chrome's toolbar
   - Find InstantSOP and click the pin icon

6. **Open the side panel**
   - Click the InstantSOP icon in your toolbar — the side panel opens on the right

You're ready to record.

## Using InstantSOP

### Recording a Guide

1. Navigate to the page where your workflow starts
2. Click the InstantSOP icon to open the side panel
3. Give your guide a title (e.g., "How to Create an Invoice in HubSpot")
4. Click **Start Recording** — the button turns red
5. Click through your workflow normally — each click is captured as a step
6. Click **Stop Recording** when you're done

### Editing Steps

- **Add notes**: Click the text area below any screenshot to add context or instructions
- **Delete a step**: Click the X button on any step to remove it (e.g., an accidental click)
- Steps are numbered automatically

### Exporting

- **Copy Markdown**: Copies the full guide to your clipboard with embedded screenshots — paste into any markdown editor
- **Download HTML**: Downloads a self-contained HTML file with all images embedded — open it in any browser or print to PDF

### Publishing to Writebook

If you use [Writebook](https://once.com/writebook) (Basecamp's free publishing tool):

1. Click the **Writebook** section in the side panel to expand settings
2. Enter your Writebook URL (e.g., `https://books.yourcompany.com`)
3. Click **Connect** — you must already be logged into Writebook in your browser
4. Select which book to add the guide to
5. After recording your steps, click **Add to Writebook**
6. A new page is created in your book with all the step descriptions — the page opens automatically

Your Writebook URL and book selection are saved so you don't have to configure it again.

## Publishing to the Chrome Web Store

To make InstantSOP available to others without Developer Mode, you'd need to publish it to the Chrome Web Store. Here's what's involved:

1. **Create a Chrome Web Store developer account** at https://chrome.google.com/webstore/devconsole — there's a one-time $5 registration fee

2. **Prepare the package**
   - Zip the extension folder (all the files, not the parent folder)
   - Create screenshots of the extension in action (1280x800 recommended)
   - Create a promotional image (440x280)
   - Write a store description

3. **Upload and submit**
   - Go to the Developer Dashboard
   - Click "New Item" and upload the zip
   - Fill in the listing details, screenshots, and privacy practices
   - Submit for review

4. **Review process**
   - Google reviews all extensions before publishing
   - Typically takes 1-3 business days
   - They check for policy compliance (permissions must be justified, no malware, etc.)
   - The `<all_urls>` host permission and `activeTab` will require a privacy policy explaining why you need page access

5. **Ongoing**
   - Updates go through the same review process
   - You can publish to specific testers first using "unlisted" visibility

For internal/team use, you can also skip the store entirely and distribute the zip file — anyone can install it in Developer Mode using the steps above.

## Permissions Explained

| Permission | Why It's Needed |
|-----------|----------------|
| `activeTab` | Capture screenshots of the page you're viewing |
| `sidePanel` | Display the InstantSOP sidebar UI |
| `scripting` | Inject the click detection script into web pages |
| `storage` | Save your Writebook URL and book selection |
| `host_permissions (all URLs)` | Required for Writebook integration — lets the extension communicate with your Writebook instance on any domain |

All data stays local in your browser. Screenshots are stored in memory only during your session — nothing is uploaded anywhere unless you explicitly publish to Writebook.

## License

MIT
