// ui/toast.js — 轻量提示

const ICONS = {
  info: "💡",
  success: "✅",
  warning: "⚠️",
  error: "❌",
};

export function toast(message, type = "info", duration = 3500) {
  const root = document.getElementById("toastRoot");
  if (!root) return;

  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `
    <span style="font-size:16px;line-height:1;">${ICONS[type] || ""}</span>
    <span style="flex:1;">${escapeHtml(message)}</span>
  `;
  root.appendChild(el);

  setTimeout(() => {
    el.style.transition = "opacity .25s ease, transform .25s ease";
    el.style.opacity = "0";
    el.style.transform = "translateY(-10px)";
    setTimeout(() => el.remove(), 260);
  }, duration);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
