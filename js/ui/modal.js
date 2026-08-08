// ui/modal.js — 模态弹窗

let activeModal = null;
let cleanupListeners = null;

export function showModal({
  title = "提示",
  body = "",
  footer = null,
  width = 480,
  onClose,
} = {}) {
  const root = document.getElementById("modalRoot");
  if (!root) return null;

  closeModal(); // 关闭任何已打开的

  const wrap = document.createElement("div");
  wrap.className = "modal-root active";
  wrap.style.zIndex = "9999";
  wrap.innerHTML = `
    <div class="modal" style="max-width:${width}px;">
      <div class="modal-header">
        <span class="modal-title">${escapeHtml(title)}</span>
        <button class="modal-close" data-action="close">×</button>
      </div>
      <div class="modal-body">${typeof body === "string" ? body : ""}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ""}
    </div>
  `;

  // 如果 body 是 DOM 元素，附加
  if (typeof body !== "string" && body instanceof HTMLElement) {
    const bodyEl = wrap.querySelector(".modal-body");
    bodyEl.innerHTML = "";
    bodyEl.appendChild(body);
  }

  root.appendChild(wrap);
  activeModal = wrap;

  // 事件
  const onBackdropClick = (e) => {
    if (e.target === wrap) {
      closeModal();
      if (onClose) onClose();
    }
  };
  wrap.addEventListener("click", onBackdropClick);
  wrap.querySelector('[data-action="close"]').addEventListener("click", () => {
    closeModal();
    if (onClose) onClose();
  });

  // ESC
  const onKey = (e) => {
    if (e.key === "Escape") {
      closeModal();
      if (onClose) onClose();
    }
  };
  document.addEventListener("keydown", onKey);

  cleanupListeners = () => {
    wrap.removeEventListener("click", onBackdropClick);
    document.removeEventListener("keydown", onKey);
  };

  return wrap;
}

export function closeModal() {
  if (cleanupListeners) {
    cleanupListeners();
    cleanupListeners = null;
  }
  if (activeModal) {
    activeModal.remove();
    activeModal = null;
  }
}

export function confirm({
  title = "确认操作",
  message = "是否继续？",
  confirmText = "确定",
  cancelText = "取消",
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    showModal({
      title,
      body: `<p style="font-size:13px;color:var(--text-2);line-height:1.6;margin:0;">${escapeHtml(message)}</p>`,
      footer: `
        <button class="ghost-btn" data-action="cancel">${escapeHtml(cancelText)}</button>
        <button class="primary-btn ${danger ? "danger" : ""}" data-action="confirm"
          style="${danger ? "background:linear-gradient(135deg,#EF4444,#F87171);" : ""}">
          ${escapeHtml(confirmText)}
        </button>
      `,
      onClose: () => resolve(false),
    });

    const wrap = document.querySelector(".modal-root.active");
    if (!wrap) return;
    wrap.querySelector('[data-action="cancel"]').addEventListener("click", () => {
      closeModal();
      resolve(false);
    });
    wrap.querySelector('[data-action="confirm"]').addEventListener("click", () => {
      closeModal();
      resolve(true);
    });
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
