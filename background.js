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
    const { baseUrl, bookId, title, markdown } = msg;
    handlePublishPage(baseUrl, bookId, title, markdown).then(sendResponse);
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

async function handlePublishPage(baseUrl, bookId, title, markdown) {
  try {
    const tab = await getOrCreateWritebookTab(baseUrl);

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: createPageInWritebook,
      args: [baseUrl, bookId, title, markdown]
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
  // This runs in the Writebook page context — has access to cookies
  return fetch(baseUrl + "/", { credentials: "same-origin" })
    .then(res => {
      if (!res.ok) throw new Error("Not logged in or Writebook not reachable");
      return res.text();
    })
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // Writebook shows books as links: /books/:id
      const books = [];
      const links = doc.querySelectorAll('a[href*="/books/"]');
      const seen = new Set();

      links.forEach(link => {
        const match = link.href.match(/\/books\/(\d+)/);
        if (match && !seen.has(match[1])) {
          seen.add(match[1]);
          // Get the book title from the link text or nearby heading
          const title = link.textContent.trim() ||
                        link.querySelector("h2, h3, span")?.textContent.trim() ||
                        `Book ${match[1]}`;
          if (title && title.length > 0) {
            books.push({ id: match[1], title: title });
          }
        }
      });

      if (books.length === 0) {
        return { ok: false, error: "No books found. Make sure you are logged into Writebook." };
      }

      return { ok: true, books: books };
    })
    .catch(err => ({ ok: false, error: err.message }));
}

function createPageInWritebook(baseUrl, bookId, title, markdown) {
  // This runs in the Writebook page context
  const bookUrl = `${baseUrl}/books/${bookId}`;

  // First fetch the book page to get the CSRF token
  return fetch(bookUrl, { credentials: "same-origin" })
    .then(res => {
      if (!res.ok) throw new Error("Could not access book (status " + res.status + ")");
      return res.text();
    })
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const csrfMeta = doc.querySelector('meta[name="csrf-token"]');
      if (!csrfMeta) throw new Error("Not logged in — no CSRF token found");
      return csrfMeta.content;
    })
    .then(csrfToken => {
      // POST to create a new page
      const formData = new FormData();
      formData.append("page[body]", markdown);
      formData.append("authenticity_token", csrfToken);

      return fetch(`${bookUrl}/pages`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "X-CSRF-Token": csrfToken,
          "Accept": "text/html,application/xhtml+xml"
        },
        body: formData,
        redirect: "follow"
      });
    })
    .then(res => {
      if (res.ok || res.redirected) {
        // The response URL after redirect is the new page
        const pageUrl = res.url || bookUrl;
        return { ok: true, url: pageUrl };
      }
      throw new Error("Failed to create page (status " + res.status + ")");
    })
    .catch(err => ({ ok: false, error: err.message }));
}
