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
    // Forward to the active tab's content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "start-recording" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Could not reach content script:", chrome.runtime.lastError.message);
          }
          sendResponse(response || { ok: false });
        });
      }
    });
    return true; // async sendResponse
  }

  // Side panel requests to stop recording
  if (msg.type === "stop-recording") {
    recording = false;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "stop-recording" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Could not reach content script:", chrome.runtime.lastError.message);
          }
          sendResponse(response || { ok: false });
        });
      }
    });
    return true; // async sendResponse
  }

  // Side panel asks for current state
  if (msg.type === "get-recording-state") {
    sendResponse({ recording });
    return false;
  }
});
