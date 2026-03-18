/**
 * InstantSOP — Background Service Worker
 * Handles screenshot capture and message routing between content script and side panel.
 */

let recording = false;

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Allow side panel to open on all tabs
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Listen for messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // Content script reports a click — take screenshot and forward to side panel
  if (msg.type === "click-captured") {
    const tabId = sender.tab?.id;
    if (!tabId) return;

    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error("Screenshot failed:", chrome.runtime.lastError.message);
        return;
      }

      // Forward screenshot + click data to side panel
      chrome.runtime.sendMessage({
        type: "new-step",
        data: {
          ...msg.data,
          screenshot: dataUrl
        }
      });
    });

    // Async response not needed — screenshot forwarded via separate message
    return false;
  }

  // Side panel requests to start recording
  if (msg.type === "start-recording") {
    recording = true;
    handleStartRecording().then(sendResponse);
    return true; // async sendResponse
  }

  // Side panel requests to stop recording
  if (msg.type === "stop-recording") {
    recording = false;
    handleStopRecording().then(sendResponse);
    return true; // async sendResponse
  }

  // Side panel asks for current state
  if (msg.type === "get-recording-state") {
    sendResponse({ recording });
    return false;
  }

  // ── Writebook: Fetch books list ─────────────────────────────────

  if (msg.type === "fetch-writebook-books") {
    const baseUrl = msg.url.replace(/\/+$/, "");
    handleFetchBooks(baseUrl).then(sendResponse);
    return true; // async
  }

  // ── Writebook: Publish page ─────────────────────────────────────

  if (msg.type === "publish-to-writebook") {
    const { baseUrl, bookId, bookSlug, title, markdown, steps } = msg;
    handlePublishPage(baseUrl, bookId, bookSlug, title, markdown, steps).then(sendResponse);
    return true; // async
  }
});

// ── Recording Helpers ──────────────────────────────────────────────

async function handleStartRecording() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab) return { ok: false, error: "No active tab found" };

  // Skip chrome:// and other restricted pages
  if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://") || tab.url.startsWith("about:")) {
    return { ok: false, error: "Cannot record on this page — navigate to a website first" };
  }

  // Always inject the content script to ensure it's present.
  // If it's already there, the duplicate just re-runs (listeners are guarded by the recording flag).
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
  } catch (err) {
    console.error("Failed to inject content script:", err);
    return { ok: false, error: "Cannot access this page — try refreshing" };
  }

  // Small delay to let the script initialize
  await new Promise(r => setTimeout(r, 100));

  // Now send the start message
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, { type: "start-recording" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Content script error:", chrome.runtime.lastError.message);
        resolve({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response || { ok: true });
      }
    });
  });
}

async function handleStopRecording() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab) return { ok: false };

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, { type: "stop-recording" }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script gone — that's fine, recording is stopped anyway
        resolve({ ok: true });
      } else {
        resolve(response || { ok: true });
      }
    });
  });
}

// ── Writebook Helpers ──────────────────────────────────────────────

async function getOrCreateWritebookTab(baseUrl) {
  // Look for an existing tab on this Writebook instance
  const tabs = await chrome.tabs.query({ url: `${baseUrl}/*` });
  if (tabs.length > 0) {
    // Bring it to focus
    await chrome.tabs.update(tabs[0].id, { active: true });
    return tabs[0];
  }

  // Open a new tab
  const tab = await chrome.tabs.create({ url: baseUrl, active: false });

  // Wait for it to load
  return new Promise((resolve) => {
    function listener(tabId, info) {
      if (tabId === tab.id && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(tab);
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function handleFetchBooks(baseUrl) {
  try {
    const tab = await getOrCreateWritebookTab(baseUrl);

    // Always navigate to the homepage to ensure we can read the book list
    await chrome.tabs.update(tab.id, { url: baseUrl + "/" });
    await waitForTabLoad(tab.id);

    // Small extra delay for DOM to settle
    await new Promise(r => setTimeout(r, 500));

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fetchBooksFromPage,
      args: [baseUrl]
    });

    if (results && results[0] && results[0].result) {
      return results[0].result;
    }
    return { ok: false, error: "Could not read books from page" };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    function listener(id, info) {
      if (id === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function handlePublishPage(baseUrl, bookId, bookSlug, title, markdown, steps) {
  try {
    const tab = await getOrCreateWritebookTab(baseUrl);

    // Navigate to the book page so the CSRF token is available
    await chrome.tabs.update(tab.id, { url: `${baseUrl}/${bookId}/${bookSlug}` });
    await waitForTabLoad(tab.id);
    await new Promise(r => setTimeout(r, 500));

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: createPageInWritebook,
      args: [baseUrl, bookId, bookSlug, title, markdown, steps]
    });

    if (results && results[0] && results[0].result) {
      return results[0].result;
    }
    return { ok: false, error: "Could not create page" };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Functions injected into Writebook tab context ──────────────────

function fetchBooksFromPage(baseUrl) {
  // This runs in the Writebook page context — has access to cookies.
  // Writebook's homepage shows books as <figure class="library__book"> elements.
  // Each book has a link like /<id>/<slug> and an <h2> with the title.

  const books = [];
  const figures = document.querySelectorAll("figure.library__book");

  figures.forEach(fig => {
    // Skip the "create new book" placeholder
    if (fig.querySelector(".library__book--empty")) return;
    if (fig.querySelector('a[href="/books/new"]')) return;

    // Find the book link: /<id>/<slug>
    const link = fig.querySelector("a.bookmark__link");
    if (!link) return;

    const href = link.getAttribute("href") || "";
    const match = href.match(/^\/(\d+)\/(.+)/);
    if (!match) return;

    const id = match[1];
    const slug = match[2];

    // Get title from the h2 inside the figure
    const h2 = fig.querySelector("h2");
    const titleSpan = fig.querySelector(".book__title");
    const title = titleSpan?.textContent.trim() || h2?.textContent.trim() || `Book ${id}`;

    books.push({ id, slug, title });
  });

  if (books.length === 0) {
    // Fallback: maybe we're not on the homepage or not logged in.
    // Check if there's a login form
    if (document.querySelector('form[action*="session"]')) {
      return Promise.resolve({ ok: false, error: "Not logged in — please log into Writebook first." });
    }
    return Promise.resolve({ ok: false, error: "No books found. Make sure you are logged into Writebook." });
  }

  return Promise.resolve({ ok: true, books });
}

async function createPageInWritebook(baseUrl, bookId, bookSlug, title, markdown, steps) {
  // This runs in the Writebook page context.
  // Creates ONE page with all steps as text + inline screenshot images.
  //
  // Flow:
  //   1. Create blank page → get page ID
  //   2. Navigate to page edit to get the upload URL from <house-md>
  //   3. Upload each screenshot → get /u/filename.png URLs
  //   4. Build page body with ## headings, notes, and ![](imageUrl)
  //   5. PATCH page with the full body

  const booksPath = `${baseUrl}/books/${bookId}`;
  const turboAccept = "text/vnd.turbo-stream.html, text/html, application/xhtml+xml";

  let csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
  if (!csrfToken) {
    const res = await fetch(`${baseUrl}/${bookId}/${bookSlug}`, { credentials: "same-origin" });
    if (!res.ok) return { ok: false, error: "Could not access book (status " + res.status + ")" };
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    csrfToken = doc.querySelector('meta[name="csrf-token"]')?.content;
    if (!csrfToken) return { ok: false, error: "Not logged in — no CSRF token found" };
  }

  const headers = { "X-CSRF-Token": csrfToken, "Accept": turboAccept };

  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(",");
    const mime = parts[0].match(/:(.*?);/)[1];
    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type: mime });
  }

  try {
    // 1. Create blank page
    const pageRes = await fetch(booksPath + "/pages", {
      method: "POST",
      credentials: "same-origin",
      headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ authenticity_token: csrfToken })
    });
    if (!pageRes.ok) return { ok: false, error: "Failed to create page (status " + pageRes.status + ")" };

    const pageHtml = await pageRes.text();
    const pageIdMatch = pageHtml.match(/\/pages\/(\d+)/);
    if (!pageIdMatch) return { ok: false, error: "Could not find new page ID" };
    const pageId = pageIdMatch[1];

    // 2. Fetch the edit page to get the upload URL from <house-md data-uploads-url="...">
    const editRes = await fetch(booksPath + "/pages/" + pageId + "/edit", { credentials: "same-origin" });
    if (!editRes.ok) return { ok: false, error: "Could not open page editor (status " + editRes.status + ")" };
    const editHtml = await editRes.text();
    const editDoc = new DOMParser().parseFromString(editHtml, "text/html");
    const uploadsUrl = editDoc.querySelector("house-md")?.getAttribute("data-uploads-url");

    // Also grab fresh CSRF token from edit page
    const freshToken = editDoc.querySelector('meta[name="csrf-token"]')?.content || csrfToken;

    // 3. Upload each screenshot and collect URLs
    const imageUrls = [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step.screenshot || !uploadsUrl) {
        imageUrls.push(null);
        continue;
      }

      const blob = dataUrlToBlob(step.screenshot);
      const formData = new FormData();
      formData.append("file", blob, "step-" + (i + 1) + ".png");

      const uploadRes = await fetch(uploadsUrl, {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-CSRF-Token": freshToken },
        body: formData
      });

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        imageUrls.push(uploadData.fileUrl || null);
      } else {
        imageUrls.push(null);
      }
    }

    // 4. Build page body with steps + inline images
    let body = "";
    steps.forEach((step, i) => {
      body += `## Step ${i + 1}: ${step.description}\n\n`;
      if (step.notes) body += `${step.notes}\n\n`;
      if (imageUrls[i]) body += `![Step ${i + 1}](${imageUrls[i]})\n\n`;
    });

    // 5. Save page with title and body
    const updateRes = await fetch(booksPath + "/pages/" + pageId, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        authenticity_token: freshToken,
        "page[body]": body,
        "leaf[title]": title
      })
    });
    if (!updateRes.ok) return { ok: false, error: "Failed to save page (status " + updateRes.status + ")" };

    const bookUrl = `${baseUrl}/${bookId}/${bookSlug}`;
    return { ok: true, url: bookUrl };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
