/**
 * InstantSOP — Content Script
 * Injected into every page. Listens for clicks when recording,
 * describes the clicked element, draws a highlight, and notifies background.
 */

// Guard against duplicate injection
if (window.__instantSOPLoaded) {
  // Already loaded — skip re-initialization
} else {
window.__instantSOPLoaded = true;

let isRecording = false;
let stepCounter = 0;

// ── Element Description ─────────────────────────────────────────────

function describeElement(el) {
  const tag = el.tagName.toLowerCase();
  const text = (el.innerText || "").trim().substring(0, 80);
  const ariaLabel = el.getAttribute("aria-label") || "";
  const placeholder = el.getAttribute("placeholder") || "";
  const title = el.getAttribute("title") || "";
  const alt = el.getAttribute("alt") || "";
  const type = el.getAttribute("type") || "";
  const role = el.getAttribute("role") || "";
  const href = el.getAttribute("href") || "";
  const name = el.getAttribute("name") || "";

  // Pick the best label for this element
  const label = text || ariaLabel || placeholder || title || alt || name || "";
  const quoted = label ? `"${label}"` : "";

  // Buttons
  if (tag === "button" || type === "submit" || type === "button" || role === "button") {
    return `Clicked the ${quoted || "a"} button`;
  }

  // Links
  if (tag === "a") {
    const linkText = quoted || (href ? `"${href}"` : "a");
    return `Clicked link ${linkText}`;
  }

  // Text inputs
  if (tag === "input" && ["text", "email", "password", "search", "url", "tel", "number"].includes(type)) {
    return `Clicked the ${quoted || "an"} input field`;
  }

  // Checkboxes and radios
  if (type === "checkbox") {
    return `Toggled the ${quoted || "a"} checkbox`;
  }
  if (type === "radio") {
    return `Selected the ${quoted || "a"} radio option`;
  }

  // Textareas
  if (tag === "textarea") {
    return `Clicked the ${quoted || "a"} text area`;
  }

  // Selects / dropdowns
  if (tag === "select" || role === "listbox" || role === "combobox") {
    return `Clicked the ${quoted || "a"} dropdown`;
  }

  // Images
  if (tag === "img") {
    return `Clicked image ${quoted || "(no alt text)"}`;
  }

  // Tabs
  if (role === "tab") {
    return `Clicked the ${quoted || "a"} tab`;
  }

  // Menu items
  if (role === "menuitem" || role === "option") {
    return `Selected ${quoted || "an option"}`;
  }

  // Generic with text
  if (label) {
    return `Clicked ${quoted}`;
  }

  return `Clicked a ${tag} element`;
}

// ── Click Highlight ─────────────────────────────────────────────────

function drawHighlight(x, y) {
  const ring = document.createElement("div");
  ring.className = "instantsop-click-highlight";
  ring.style.cssText = `
    position: fixed;
    left: ${x - 20}px;
    top: ${y - 20}px;
    width: 40px;
    height: 40px;
    border: 3px solid #6357A5;
    border-radius: 50%;
    background: rgba(99, 87, 165, 0.15);
    pointer-events: none;
    z-index: 2147483647;
    animation: instantsop-pulse 0.6s ease-out forwards;
    box-shadow: 0 0 0 2px rgba(99, 87, 165, 0.3);
  `;
  document.body.appendChild(ring);

  // Also add a small dot at center
  const dot = document.createElement("div");
  dot.className = "instantsop-click-dot";
  dot.style.cssText = `
    position: fixed;
    left: ${x - 5}px;
    top: ${y - 5}px;
    width: 10px;
    height: 10px;
    background: #6357A5;
    border-radius: 50%;
    pointer-events: none;
    z-index: 2147483647;
    animation: instantsop-fade 0.8s ease-out forwards;
  `;
  document.body.appendChild(dot);

  // Remove after animation
  setTimeout(() => {
    ring.remove();
    dot.remove();
  }, 1000);
}

// ── Inject Animation Styles (once) ─────────────────────────────────

function injectStyles() {
  if (document.getElementById("instantsop-styles")) return;
  const style = document.createElement("style");
  style.id = "instantsop-styles";
  style.textContent = `
    @keyframes instantsop-pulse {
      0% { transform: scale(0.5); opacity: 1; }
      100% { transform: scale(2); opacity: 0; }
    }
    @keyframes instantsop-fade {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.2); }
      100% { opacity: 0; transform: scale(0.5); }
    }
  `;
  document.head.appendChild(style);
}

// ── Click Handler ───────────────────────────────────────────────────

function handleClick(e) {
  if (!isRecording) return;

  const el = e.target;
  const description = describeElement(el);
  const x = e.clientX;
  const y = e.clientY;

  // Draw highlight on page
  drawHighlight(x, y);
  stepCounter++;

  // Wait for highlight to render, then tell background to screenshot
  setTimeout(() => {
    chrome.runtime.sendMessage({
      type: "click-captured",
      data: {
        step: stepCounter,
        description: description,
        x: x,
        y: y,
        pageX: e.pageX,
        pageY: e.pageY,
        url: window.location.href,
        pageTitle: document.title,
        timestamp: Date.now()
      }
    });
  }, 300);
}

// ── Message Listener ────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "start-recording") {
    isRecording = true;
    stepCounter = 0;
    injectStyles();
    document.addEventListener("click", handleClick, true);
    sendResponse({ ok: true });
  }

  if (msg.type === "stop-recording") {
    isRecording = false;
    document.removeEventListener("click", handleClick, true);
    sendResponse({ ok: true });
  }

  if (msg.type === "get-status") {
    sendResponse({ recording: isRecording, steps: stepCounter });
  }
});

} // end duplicate-injection guard
