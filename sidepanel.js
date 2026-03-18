/**
 * InstantSOP — Side Panel
 * Manages the step list, handles recording toggle, and exports guides.
 */

const steps = [];
let recording = false;
let recordingStartTime = null;

// ── DOM refs ────────────────────────────────────────────────────────

const recordBtn = document.getElementById("recordBtn");
const recordIcon = document.getElementById("recordIcon");
const recordLabel = document.getElementById("recordLabel");
const clearBtn = document.getElementById("clearBtn");
const stepsList = document.getElementById("stepsList");
const emptyState = document.getElementById("emptyState");
const stepCount = document.getElementById("stepCount");
const pageInfo = document.getElementById("pageInfo");
const exportMd = document.getElementById("exportMd");
const exportHtml = document.getElementById("exportHtml");
const guideTitle = document.getElementById("guideTitle");
const toast = document.getElementById("toast");

// ── Recording Toggle ────────────────────────────────────────────────

recordBtn.addEventListener("click", () => {
  if (!recording) {
    startRecording();
  } else {
    stopRecording();
  }
});

function startRecording() {
  chrome.runtime.sendMessage({ type: "start-recording" }, (response) => {
    if (chrome.runtime.lastError) {
      showToast("Could not start — try refreshing the page");
      return;
    }
    recording = true;
    recordingStartTime = Date.now();
    recordBtn.classList.add("recording");
    recordIcon.textContent = "\u25A0"; // stop square
    recordLabel.textContent = "Stop Recording";
    showToast("Recording started — click on the page");
  });
}

function stopRecording() {
  chrome.runtime.sendMessage({ type: "stop-recording" }, () => {
    recording = false;
    recordBtn.classList.remove("recording");
    recordIcon.textContent = "\u25CF"; // circle
    recordLabel.textContent = "Start Recording";
    showToast(`Recording stopped — ${steps.length} steps captured`);
  });
}

// ── Listen for New Steps ────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "new-step") {
    addStep(msg.data);
  }
});

function addStep(data) {
  steps.push(data);
  updateUI();
  renderStep(data, steps.length);

  // Scroll to bottom
  stepsList.scrollTop = stepsList.scrollHeight;
}

function updateUI() {
  const hasSteps = steps.length > 0;
  emptyState.style.display = hasSteps ? "none" : "block";
  stepCount.textContent = steps.length;
  clearBtn.disabled = !hasSteps;
  exportMd.disabled = !hasSteps;
  exportHtml.disabled = !hasSteps;

  if (steps.length > 0) {
    const last = steps[steps.length - 1];
    pageInfo.textContent = last.pageTitle ? last.pageTitle.substring(0, 30) : "";
  }
}

function renderStep(data, num) {
  const card = document.createElement("div");
  card.className = "step-card";
  card.dataset.index = num - 1;

  const elapsed = recordingStartTime
    ? Math.round((data.timestamp - recordingStartTime) / 1000)
    : 0;
  const timeStr = formatTime(elapsed);

  card.innerHTML = `
    <div class="step-header">
      <div class="step-number">${num}</div>
      <div class="step-description">${escapeHtml(data.description)}</div>
      <span class="step-time">${timeStr}</span>
      <button class="step-delete" title="Remove step">&times;</button>
    </div>
    <img class="step-screenshot" src="${data.screenshot}" alt="Step ${num} screenshot">
    <textarea class="step-notes" placeholder="Add notes..." rows="1"></textarea>
  `;

  // Delete button
  card.querySelector(".step-delete").addEventListener("click", () => {
    const idx = parseInt(card.dataset.index);
    steps.splice(idx, 1);
    rerenderAllSteps();
  });

  // Auto-resize notes textarea
  const textarea = card.querySelector(".step-notes");
  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
    // Save note to step data
    const idx = parseInt(card.dataset.index);
    if (steps[idx]) steps[idx].notes = textarea.value;
  });

  stepsList.appendChild(card);
}

function rerenderAllSteps() {
  // Remove all step cards but keep empty state
  stepsList.querySelectorAll(".step-card").forEach(c => c.remove());
  steps.forEach((s, i) => renderStep(s, i + 1));
  updateUI();
}

// ── Clear All ───────────────────────────────────────────────────────

clearBtn.addEventListener("click", () => {
  if (steps.length === 0) return;
  steps.length = 0;
  rerenderAllSteps();
  showToast("All steps cleared");
});

// ── Export: Markdown ────────────────────────────────────────────────

exportMd.addEventListener("click", () => {
  const title = guideTitle.value || "How-To Guide";
  let md = `# ${title}\n\n`;
  md += `*Generated with InstantSOP*\n\n---\n\n`;

  steps.forEach((s, i) => {
    const num = i + 1;
    md += `## Step ${num}\n\n`;
    md += `**${s.description}**\n\n`;
    if (s.notes) md += `${s.notes}\n\n`;
    md += `![Step ${num}](${s.screenshot})\n\n`;
    md += `---\n\n`;
  });

  navigator.clipboard.writeText(md).then(() => {
    showToast("Markdown copied to clipboard");
  }).catch(() => {
    // Fallback: download as file
    downloadFile(`${slugify(title)}.md`, md, "text/markdown");
    showToast("Markdown downloaded");
  });
});

// ── Export: HTML ─────────────────────────────────────────────────────

exportHtml.addEventListener("click", () => {
  const title = guideTitle.value || "How-To Guide";
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px 24px; color: #1E1E2E; background: #fff; }
  h1 { color: #6357A5; margin-bottom: 4px; }
  .subtitle { color: #6B7280; font-size: 14px; margin-bottom: 32px; }
  .step { margin-bottom: 32px; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; }
  .step-head { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #F9FAFB; border-bottom: 1px solid #E5E7EB; }
  .step-num { background: #6357A5; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
  .step-desc { font-weight: 600; font-size: 14px; }
  .step img { width: 100%; display: block; }
  .step-notes { padding: 12px 16px; font-size: 13px; color: #374151; background: #FAFAFA; }
  hr { border: none; border-top: 1px solid #E5E7EB; margin: 0; }
  @media print { body { padding: 20px; } .step { break-inside: avoid; } }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p class="subtitle">Generated with InstantSOP</p>
`;

  steps.forEach((s, i) => {
    html += `<div class="step">
  <div class="step-head">
    <div class="step-num">${i + 1}</div>
    <div class="step-desc">${escapeHtml(s.description)}</div>
  </div>
  <img src="${s.screenshot}" alt="Step ${i + 1}">
  ${s.notes ? `<div class="step-notes">${escapeHtml(s.notes)}</div>` : ""}
</div>\n`;
  });

  html += `</body>\n</html>`;

  downloadFile(`${slugify(title)}.html`, html, "text/html");
  showToast("HTML guide downloaded");
});

// ── Helpers ─────────────────────────────────────────────────────────

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "guide";
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}
