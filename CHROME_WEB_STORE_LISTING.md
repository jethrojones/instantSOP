# Chrome Web Store Listing — InstantSOP

Use this copy when submitting to the Chrome Web Store.

---

## Extension Name

InstantSOP

## Summary (132 characters max)

Turn any workflow into a step-by-step guide. InstantSOP captures screenshots and describes every click — no recording needed.

## Detailed Description

Stop writing SOPs by hand. InstantSOP watches you click through any workflow and builds a how-to guide automatically.

**How it works:**
- Open the side panel and hit Start Recording
- Click through your process on any website
- Every click captures a screenshot, highlights where you clicked, and describes what you interacted with
- Hit Stop Recording — your guide is done

**Smart click detection:**
InstantSOP identifies what you clicked — buttons, links, input fields, dropdowns, tabs, checkboxes — and writes a plain-English description for each step. No AI, no API keys, no external services.

**Four export options:**
- Download Markdown — saves a .md file plus all screenshots as PNGs
- Download HTML — self-contained file with embedded images, ready to print or share
- Add to Writebook — publishes directly to a Writebook instance with inline images
- Add to Basecamp — creates a document in Docs & Files with inline screenshots (requires Basecamp CLI)

**Built for teams who document processes:**
- Customer support teams creating help guides
- Operations teams writing SOPs
- Onboarding managers building training docs
- Anyone who answers "how do I do this?" more than once

**Privacy first:**
All data stays in your browser. Screenshots are stored in memory only during your session. Nothing is uploaded anywhere unless you choose to export or publish.

**Basecamp integration (new in v1.1):**
Publish guides straight to any Basecamp project's Docs & Files. Select your account and project from the side panel, and your guide appears as a document with all screenshots inline. Requires the free Basecamp CLI — see the GitHub repo for setup instructions.

**No setup required for core features:**
Install, open the side panel, and start recording. No accounts, no API keys, no configuration. Writebook and Basecamp integrations are optional.

## Category

Productivity

## Language

English

---

## Screenshot Descriptions

Capture these at 1280x800:

1. **Side panel with recorded steps** — Show 3-4 captured steps in the sidebar with thumbnails, step numbers, and descriptions. The main page should show a recognizable web app (your own site or a generic dashboard).

2. **Click highlight in action** — Show the purple highlight ring on a button or link, with the side panel open showing the step being added.

3. **Export options** — Show the bottom of the side panel with the four export buttons (Download MD, Download HTML, Add to Writebook, Add to Basecamp).

4. **Writebook settings** — Show the Writebook connection panel expanded with a book selected.

6. **Basecamp settings** — Show the Basecamp connection panel expanded with an account and project selected.

5. **Exported HTML guide** — Show the downloaded HTML file open in a browser tab, displaying a clean step-by-step guide with screenshots.

---

## Promotional Tile Text (440x280 image)

**Headline:** Click. Capture. Document.
**Subhead:** Turn any workflow into a step-by-step guide — automatically.

## Marquee Image Text (1400x560 image)

**Headline:** Stop writing SOPs by hand
**Subhead:** InstantSOP captures every click, screenshots every step, and builds the guide for you.

---

## Permission Justifications

Use these when the Chrome Web Store review asks why each permission is needed:

| Permission | Justification |
|-----------|---------------|
| `activeTab` | Required to capture screenshots of the current tab when the user clicks during recording. |
| `sidePanel` | The extension's entire UI is a side panel — it displays recorded steps, settings, and export buttons. |
| `scripting` | Injects the click detection content script into the active tab so clicks can be captured during recording. |
| `storage` | Saves user preferences: Writebook URL, selected book, Basecamp account and project selections. |
| `downloads` | Allows the user to download their guide as Markdown or HTML files. |
| `nativeMessaging` | Enables optional Basecamp integration. Communicates with a local Python script that runs the Basecamp CLI to upload screenshots and create documents. No data is sent to any third-party server — all communication is local between the extension and the user's own Basecamp CLI. |
| `host_permissions (<all_urls>)` | Required for Writebook integration — the extension needs to fetch book lists and create pages on the user's self-hosted Writebook instance, which can be on any domain. Also required to inject the click-capture content script on any page the user records. |

## Support URL

https://github.com/jethrojones/instantSOP/issues

## Website URL

https://github.com/jethrojones/instantSOP
