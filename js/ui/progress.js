// ui/progress.js — 左侧步骤导航渲染 + 完成态

import { STEP_DEFS } from "../router.js";
import { store } from "../store.js";
import { router } from "../router.js";

export function renderSidebar() {
  const nav = document.getElementById("stepNav");
  if (!nav) return;

  const current = router.currentStep;
  const done = store.get("doneSteps") || [];
  const completedSet = new Set(done);

  nav.innerHTML = STEP_DEFS.map((s) => {
    const isActive = s.num === current;
    const isDone = completedSet.has(s.num) && !isActive;
    return `
      <div class="step-item ${isActive ? "active" : ""} ${isDone ? "done" : ""}" data-step="${s.num}">
        <div class="step-icon">${isDone ? "✓" : s.num}</div>
        <div class="step-meta">
          <span class="step-name">${escapeHtml(s.name)}</span>
          <span class="step-desc">${escapeHtml(s.desc)}</span>
        </div>
      </div>
    `;
  }).join("");

  // 绑定点击
  nav.querySelectorAll(".step-item").forEach((el) => {
    el.addEventListener("click", () => {
      const n = parseInt(el.getAttribute("data-step"), 10);
      router.go(n);
    });
  });

  updateProgress();
}

export function updateProgress() {
  const done = store.get("doneSteps") || [];
  const total = 8;
  const count = done.length;
  const fill = document.getElementById("stepProgressFill");
  const countEl = document.getElementById("doneCount");
  if (fill) fill.style.width = `${(count / total) * 100}%`;
  if (countEl) countEl.textContent = count;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
