// app.js — 应用入口

import { store } from "./store.js";
import { router, STEP_DEFS } from "./router.js";
import { renderSidebar, updateProgress } from "./ui/progress.js";
import { showModal, closeModal, confirm } from "./ui/modal.js";
import { toast } from "./ui/toast.js";
import { setScore } from "./ui/score-ring.js";
import { initTaskbar, refreshTaskLabel } from "./ui/taskbar.js";
import { renderStep1 } from "./steps/step1-input.js";
import { renderStep2 } from "./steps/step2-jd-parse.js";
import { renderStep3 } from "./steps/step3-diagnose.js";
import { renderStep4 } from "./steps/step4-match.js";
import { renderStep5 } from "./steps/step5-deepdive.js";
import { renderStep6 } from "./steps/step6-optimize.js";
import { renderStep7 } from "./steps/step7-interview.js";
import { renderStep8 } from "./steps/step8-final.js";

const STEP_RENDERERS = {
  1: renderStep1,
  2: renderStep2,
  3: renderStep3,
  4: renderStep4,
  5: renderStep5,
  6: renderStep6,
  7: renderStep7,
  8: renderStep8,
};

// 初始化
function init() {
  store.load();

  // 初始化路由（含 canEnter 守卫）
  router.handlers.canEnter = (stepNum) => {
    if (stepNum === 1) return true;
    return (store.get("doneSteps") || []).includes(stepNum - 1);
  };
  router.handlers.blocked = (target, prevUndone) => {
    toast(`请先完成步骤 ${prevUndone}，再进入 ${target}`, "warning");
    router.go(prevUndone, { skipReadyCheck: true });
  };
  router.handlers.isDone = (stepNum) => (store.get("doneSteps") || []).includes(stepNum);
  router.handlers.change = (stepNum) => {
    onStepChange(stepNum);
  };

  const initial = router.init();
  renderSidebar();

  // 浏览器插件注入 JD（?jd=xxx）：需在 step1 渲染前写入 store
  const injectedJd = handleJdParam();
  onStepChange(initial);

  // 顶部栏事件
  document.getElementById("restartBtn")?.addEventListener("click", handleRestart);
  document.getElementById("viewFullScore")?.addEventListener("click", (e) => {
    e.preventDefault();
    if ((store.get("doneSteps") || []).includes(3)) router.go(3);
    else toast("请先完成简历诊断", "info");
  });

  // 任务管理
  initTaskbar();

  // API Key 按钮
  document.getElementById("apiKeyBtn")?.addEventListener("click", openApiKeyModal);
  updateApiKeyStatus();

  // 状态恢复
  checkRestoreBanner();

  // store 变化时同步侧栏
  store.addEventListener("change", () => {
    updateProgress();
    // 重新计算得分
    const d = store.get("diagnose");
    setScore(d?.overall ?? null);
    renderSidebar();
    refreshTaskLabel();
  });
}

async function onStepChange(stepNum) {
  const container = document.getElementById("content");
  if (!container) return;
  container.innerHTML = `<div class="step-loading"><div class="spinner"></div><span>加载中…</span></div>`;
  if (window.lucide) window.lucide.createIcons();

  const renderer = STEP_RENDERERS[stepNum];
  if (!renderer) return;
  try {
    await renderer(container);
    if (window.lucide) window.lucide.createIcons();
    renderSidebar();
    // 滚动到顶部
    window.scrollTo({ top: 0 });
    container.scrollTo?.({ top: 0 });
  } catch (e) {
    console.error(e);
    container.innerHTML = `
      <div class="card">
        <div class="card-title">加载失败</div>
        <p class="text-muted">${e.message}</p>
      </div>
    `;
  }
}

async function handleRestart() {
  if (await confirm({
    title: "重新开始当前任务？",
    message: "将清空当前任务的输入与全部 AI 分析结果（其他任务不受影响）。此操作不可恢复。",
    confirmText: "清空当前任务",
    danger: true,
  })) {
    store.resetTask();
    setScore(null);
    renderSidebar();
    router.go(1, { skipHash: false });
    toast("当前任务已重置", "success");
    checkRestoreBanner();
  }
}

// 处理浏览器插件传入的 ?jd= 参数：自动填充到当前任务的 JD 文本
function handleJdParam() {
  try {
    const params = new URLSearchParams(window.location.search);
    const jd = params.get("jd");
    if (!jd || !jd.trim()) return false;

    // 写入当前任务
    store.set({ input: { jdText: jd.trim() } });
    // 清理 URL 参数（避免刷新重复注入）
    if (window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete("jd");
      window.history.replaceState({}, "", url.toString());
    }
    toast("已从浏览器插件接收 JD（长度 " + jd.length + " 字）", "success");
    return true;
  } catch (e) {
    console.warn("JD param handling failed", e);
    return false;
  }
}

function checkRestoreBanner() {
  const banner = document.getElementById("restoreBanner");
  if (!banner) return;
  const lastStep = store.get("currentStep");
  const done = store.get("doneSteps") || [];
  if ((done.length > 0 || lastStep > 1) && localStorage.getItem("jobmentor-ai-v1")) {
    const stepEl = document.getElementById("restoreStep");
    if (stepEl) stepEl.textContent = done.length;
    banner.classList.remove("hidden");
    document.getElementById("restoreConfirm").onclick = () => {
      banner.classList.add("hidden");
      router.go(lastStep || 1, { skipReadyCheck: true });
    };
    document.getElementById("restoreDismiss").onclick = () => banner.classList.add("hidden");
  } else {
    banner.classList.add("hidden");
  }
}

function openApiKeyModal() {
  const current = store.get("settings.apiKey") || "";
  const body = document.createElement("div");
  body.innerHTML = `
    <p style="font-size:13px;color:var(--text-2);line-height:1.6;margin-bottom:var(--gap-3);">
      请输入你的 <strong>DeepSeek API Key</strong>。Key 仅保存在你本机的浏览器 localStorage，不会上传到任何服务器。
    </p>
    <div class="form-group">
      <label class="label">API Key</label>
      <input class="input" id="apiKeyInput" type="password" placeholder="sk-..." value="${current.replace(/"/g, "&quot;")}" />
      <p class="text-muted" style="font-size:11px;margin-top:6px;">
        没有 Key？前往
        <a href="https://platform.deepseek.com/" target="_blank" style="color:var(--primary);">DeepSeek 开放平台</a>
        注册并申请（注册即送额度）。模型选择 <code>deepseek-chat</code>。
      </p>
    </div>
    <div class="form-group">
      <label class="label" style="display:flex;align-items:center;gap:var(--gap-2);cursor:pointer;">
        <input type="checkbox" id="privacyOnInModal" ${store.get("settings.privacyOn") ? "checked" : ""}/>
        <span>隐私脱敏（推荐）</span>
      </label>
    </div>
  `;
  showModal({
    title: "设置 DeepSeek API Key",
    body,
    footer: `
      <button class="ghost-btn" data-action="cancel">取消</button>
      <button class="ghost-btn" data-action="test" id="testKeyBtn">测试连通性</button>
      <button class="primary-btn" data-action="save">保存</button>
    `,
  });

  const root = document.querySelector(".modal-root.active");
  const input = root.querySelector("#apiKeyInput");
  root.querySelector('[data-action="cancel"]').onclick = () => closeModal();
  root.querySelector('[data-action="save"]').onclick = () => {
    const v = input.value.trim();
    const privacy = root.querySelector("#privacyOnInModal").checked;
    store.set({
      settings: {
        apiKey: v,
        privacyOn: privacy,
      },
    });
    updateApiKeyStatus();
    closeModal();
    toast(v ? "API Key 已保存" : "已清除 API Key", "success");
  };
  root.querySelector("#testKeyBtn").onclick = async () => {
    const v = input.value.trim();
    if (!v) return toast("请先填写 API Key", "warning");
    toast("正在测试连通性…", "info");
    try {
      const resp = await fetch("https://api.deepseek.com/v1/models", {
        headers: { Authorization: `Bearer ${v}` },
      });
      if (resp.ok) toast("✓ 连通正常", "success");
      else {
        const t = await resp.text();
        toast(`✗ 连通失败：${resp.status}`, "error");
      }
    } catch (e) {
      toast(`✗ 网络错误：${e.message}`, "error");
    }
  };
}

function updateApiKeyStatus() {
  const el = document.getElementById("apiKeyStatus");
  if (!el) return;
  const key = store.get("settings.apiKey");
  el.textContent = key ? "已设置" : "未设置";
  el.style.color = key ? "var(--success)" : "var(--text-3)";
}

// 启动
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// 全局错误捕获
window.addEventListener("error", (e) => {
  console.error("Global error", e.error);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled rejection", e.reason);
});
