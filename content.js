(function () {
  let container = null;

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "SHOW_RESULT") {
      showOverlay(msg.title || "AI Result", msg.content || "");
    }
  });

  function showOverlay(title, text) {
    removeOverlay();

    container = document.createElement("div");
    container.attachShadow({ mode: "open" });
    const root = container.shadowRoot;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <style>
        .backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 2147483646;
        }
        .panel {
          position: fixed; top: 5%; right: 5%;
          width: min(520px, 90vw); max-height: 90vh;
          background: #111827; color: #e5e7eb; border-radius: 14px;
          box-shadow: 0 20px 60px rgba(0,0,0,.4);
          overflow: hidden; z-index: 2147483647; font-family: ui-sans-serif, system-ui, -apple-system;
        }
        header {
          padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; background: #1f2937;
          font-weight: 600;
        }
        .content { padding: 12px 16px; overflow: auto; max-height: 65vh; white-space: pre-wrap; }
        .actions { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #374151; background: #0b1220; }
        button {
          padding: 8px 12px; border-radius: 10px; border: 1px solid #374151; background: #111827; color: #e5e7eb; cursor: pointer;
        }
        button:hover { background: #0b1220; }
      </style>
      <div class="backdrop"></div>
      <div class="panel" role="dialog" aria-label="AI Result">
        <header>
          <span>${escapeHtml(title)}</span>
          <button id="close">✕</button>
        </header>
        <div class="content" id="text"></div>
        <div class="actions">
          <button id="copy">Copy</button>
          <button id="insert">Insert at cursor</button>
        </div>
      </div>
    `;
    root.appendChild(wrapper);

    root.getElementById("text").textContent = text;

    root.getElementById("close").onclick = removeOverlay;
    root.querySelector(".backdrop").onclick = removeOverlay;
    root.getElementById("copy").onclick = async () => {
      await navigator.clipboard.writeText(text);
      root.getElementById("copy").textContent = "Copied!";
      setTimeout(() => (root.getElementById("copy").textContent = "Copy"), 1200);
    };
    root.getElementById("insert").onclick = () => insertAtCursor(text);

    document.documentElement.appendChild(container);
  }

  function insertAtCursor(text) {
    const el = document.activeElement;
    if (!el) return;

    // Textareas and inputs
    if (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && el.type === "text")) {
      const start = el.selectionStart || 0;
      const end = el.selectionEnd || 0;
      const value = el.value;
      el.value = value.slice(0, start) + text + value.slice(end);
      el.setSelectionRange(start + text.length, start + text.length);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    // contenteditable
    if (el.isContentEditable) {
      document.execCommand("insertText", false, text);
    }
  }

  function removeOverlay() {
    if (container && container.parentNode) container.parentNode.removeChild(container);
    container = null;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
})();
