// ui/taskbar.js — 顶部任务下拉菜单（多任务管理）

import { store } from "../store.js";
import { router } from "../router.js";
import { toast } from "./toast.js";
import { showModal, closeModal, confirm } from "./modal.js";

let menuOpen = false;

export function initTaskbar() {
  const btn = document.getElementById("taskBtn");
  const menu = document.getElementById("taskMenu");
  if (!btn || !menu) return;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  document.getElementById("newTaskBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    createNewTask();
  });

  // 点击外部关闭
  document.addEventListener("click", (e) => {
    if (menuOpen && !e.target.closest("#taskDropdown")) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  renderTaskList();
}

// 供外部调用：store 变化时刷新按钮标题（菜单关闭时）
export function refreshTaskLabel() {
  updateBtnLabel();
}

function toggleMenu() {
  const menu = document.getElementById("taskMenu");
  if (!menu) return;
  menuOpen = !menuOpen;
  menu.classList.toggle("hidden", !menuOpen);
  if (menuOpen) renderTaskList();
}

function closeMenu() {
  const menu = document.getElementById("taskMenu");
  if (!menu) return;
  menuOpen = false;
  menu.classList.add("hidden");
}

function updateBtnLabel() {
  const list = store.taskList;
  const cur = list.find((t) => t.isCurrent);
  const el = document.getElementById("taskBtnLabel");
  if (el) el.textContent = cur ? cur.title.slice(0, 12) || "任务" : "任务";
}

function renderTaskList() {
  const listEl = document.getElementById("taskList");
  if (!listEl) return;
  const tasks = store.taskList;

  listEl.innerHTML = tasks.length
    ? tasks.map((t) => `
      <div class="task-item ${t.isCurrent ? "active" : ""}" data-task="${escAttr(t.id)}">
        <div class="task-item-meta">
          <div class="task-item-title">${esc(t.title)}</div>
          <div class="task-item-sub">
            <span>${t.progress}/8 步</span>
            <span>·</span>
            <span>${formatTime(t.updatedAt)}</span>
          </div>
        </div>
        <div class="task-item-actions">
          <button class="task-item-action" data-action="rename" title="重命名">
            <i data-lucide="pencil" width="13"></i>
          </button>
          <button class="task-item-action danger" data-action="delete" title="删除">
            <i data-lucide="trash-2" width="13"></i>
          </button>
        </div>
      </div>
    `).join("")
    : `<div style="padding:20px;text-align:center;color:var(--text-3);font-size:12px;">暂无任务</div>`;

  if (window.lucide) window.lucide.createIcons();
  bindTaskEvents(listEl);
  updateBtnLabel();
}

function bindTaskEvents(listEl) {
  listEl.querySelectorAll(".task-item").forEach((item) => {
    const taskId = item.getAttribute("data-task");

    // 点击切换
    item.addEventListener("click", (e) => {
      if (e.target.closest('[data-action]')) return; // 按钮点击不切换
      switchToTask(taskId);
    });

    item.querySelector('[data-action="rename"]')?.addEventListener("click", (e) => {
      e.stopPropagation();
      renameTask(taskId);
    });

    item.querySelector('[data-action="delete"]')?.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteTask(taskId);
    });
  });
}

async function switchToTask(taskId) {
  const target = store.tasks[taskId];
  if (!target || taskId === store.currentTaskId) {
    closeMenu();
    return;
  }
  store.switchTask(taskId);
  // 跳转到目标任务的当前步骤（有进度则跳该步，否则 step1）
  const step = target.currentStep || 1;
  router.go(step, { skipReadyCheck: true });
  closeMenu();
  toast(`已切换到「${target.title}」`, "success");
}

function createNewTask() {
  closeMenu();
  showModal({
    title: "新建任务",
    body: `
      <div class="form-group">
        <label class="label">任务名称（可留空自动生成）</label>
        <input class="input" id="newTaskName" placeholder="如：安卓开发-字节跳动" />
      </div>
    `,
    footer: `
      <button class="ghost-btn" data-action="cancel">取消</button>
      <button class="primary-btn" data-action="confirm">创建</button>
    `,
  });
  const root = document.querySelector(".modal-root.active");
  if (!root) return;
  root.querySelector('[data-action="cancel"]').addEventListener("click", () => closeModal());
  root.querySelector('[data-action="confirm"]').addEventListener("click", () => {
    const name = root.querySelector("#newTaskName")?.value.trim();
    store.createTask(name || undefined);
    closeModal();
    router.go(1, { skipReadyCheck: true });
    renderTaskList();
    toast("已创建新任务", "success");
  });
}

function renameTask(taskId) {
  const task = store.tasks[taskId];
  if (!task) return;
  closeMenu();
  showModal({
    title: "重命名任务",
    body: `
      <div class="form-group">
        <label class="label">任务名称</label>
        <input class="input" id="renameTaskName" value="${escAttr(task.title)}" />
      </div>
    `,
    footer: `
      <button class="ghost-btn" data-action="cancel">取消</button>
      <button class="primary-btn" data-action="confirm">保存</button>
    `,
  });
  const root = document.querySelector(".modal-root.active");
  if (!root) return;
  root.querySelector('[data-action="cancel"]').addEventListener("click", () => closeModal());
  root.querySelector('[data-action="confirm"]').addEventListener("click", () => {
    const name = root.querySelector("#renameTaskName")?.value.trim();
    store.renameTask(taskId, name);
    closeModal();
    renderTaskList();
    toast("已重命名", "success");
  });
}

async function deleteTask(taskId) {
  const task = store.tasks[taskId];
  if (!task) return;
  closeMenu();
  const ok = await confirm({
    title: "删除任务？",
    message: `将删除任务「${task.title}」及其全部 8 步分析结果。此操作不可恢复。`,
    confirmText: "删除",
    danger: true,
  });
  if (!ok) return;
  const wasCurrent = taskId === store.currentTaskId;
  if (store.deleteTask(taskId)) {
    renderTaskList();
    if (wasCurrent) {
      router.go(1, { skipReadyCheck: true });
    }
    toast("任务已删除", "success");
  } else {
    toast("至少需要保留一个任务", "warning");
  }
}

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60 * 1000) return "刚刚";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} 小时前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escAttr(s) {
  return esc(s).replace(/'/g, "&#039;");
}
