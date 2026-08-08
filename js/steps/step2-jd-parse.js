// steps/step2-jd-parse.js — Step 2 JD 解析

import { store } from "../store.js";
import { router } from "../router.js";
import { toast } from "../ui/toast.js";
import { chatJson } from "../ai/deepseek.js";
import { PROMPTS, buildUserPayload } from "../ai/prompts.js";
import { redact, restore } from "../privacy.js";
import { exportFullReport } from "../export/report.js";

export async function renderStep2(container) {
  const input = store.get("input");
  const existing = store.get("jdAnalysis");
  const settings = store.get("settings");

  container.innerHTML = `
    <div class="step-page-header" style="display:flex;align-items:flex-start;justify-content:space-between;">
      <div>
        <h1 class="step-page-title">JD 解析</h1>
        <p class="step-page-desc">从目标岗位描述中提取职责、要求、关键词与理想候选人画像</p>
      </div>
      <div class="flex gap-2">
        <button class="ghost-btn" id="exportJD" disabled>导出 JD 解析 PDF</button>
        <button class="ghost-btn" id="exportFull" disabled>导出全量综合报告 PDF</button>
      </div>
    </div>

    <div class="target-card">
      <span class="target-icon">🏢</span>
      <div class="target-meta">
        <div class="target-meta-row">
          <span><strong>目标企业：</strong><span id="metaCompany">${esc(input.companyScale || "未填")}</span></span>
          <span class="badge primary" id="metaStage">${esc(input.careerStage || "未填")}</span>
        </div>
        <div class="target-tip-line">${esc(input.supplement || "（无补充信息）")}</div>
      </div>
    </div>

    <div id="contentArea">
      ${existing ? renderResult(existing) : `<div class="step-loading"><div class="spinner"></div><span>正在调用 AI 解析…</span></div>`}
    </div>
  `;

  if (existing) {
    bindActions();
  } else {
    runAnalysis();
  }

  async function runAnalysis() {
    const apiKey = store.get("settings.apiKey");
    if (!apiKey) {
      contentArea(`
        <div class="step-loading" style="padding:80px;">
          <span>未设置 DeepSeek API Key，请在右上角设置后再开始</span>
        </div>
      `);
      return;
    }

    // 隐私脱敏
    const text = input.jdText || "";
    let finalText = text;
    let restoreMap = null;
    if (settings.privacyOn) {
      const { redacted, map } = redact(text);
      finalText = redacted;
      restoreMap = map;
    }

    try {
      const messages = [
        { role: "system", content: PROMPTS.step2 },
        { role: "user", content: buildUserPayload("step2", { input, jdText: finalText }) },
      ];
      const result = await chatJson({ apiKey, messages, temperature: 0.4 });

      // 还原
      if (restoreMap) {
        restoreInPlace(result, restoreMap);
      }

      store.replace("jdAnalysis", result);
      store.markStepDone(2);
      contentArea(renderResult(result));
      bindActions();
      toast("JD 解析完成", "success");
    } catch (e) {
      console.error(e);
      contentArea(`
        <div class="card">
          <div class="card-title">解析失败</div>
          <p class="text-muted">${esc(e.message)}</p>
          <button class="primary-btn mt-4" id="retryBtn">重新生成</button>
        </div>
      `);
      container.querySelector("#retryBtn")?.addEventListener("click", () => {
        store.replace("jdAnalysis", null);
        renderStep2(container);
      });
      toast(`解析失败：${e.message}`, "error");
    }
  }

  function contentArea(html) {
    container.querySelector("#contentArea").innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }

  function bindActions() {
    const btnJD = container.querySelector("#exportJD");
    const btnFull = container.querySelector("#exportFull");
    if (btnJD) btnJD.disabled = false;
    if (btnFull) btnFull.disabled = false;
    btnJD?.addEventListener("click", () => exportFullReport("jd"));
    btnFull?.addEventListener("click", () => exportFullReport("full"));
    // 绑定导航按钮
    container.querySelector("#prevBtn")?.addEventListener("click", () => router.go(1));
    container.querySelector("#nextBtn")?.addEventListener("click", () => router.go(3));
  }
}

function renderResult(data) {
  if (!data) return `<div class="card">无数据</div>`;
  return `
    <div class="parse-grid">
      <div class="parse-card">
        <div class="parse-card-title"><span class="dot"></span>岗位职责</div>
        <ul class="parse-list">${(data.responsibilities || []).map(t => `<li>${esc(t)}</li>`).join("")}</ul>
      </div>
      <div class="parse-card">
        <div class="parse-card-title"><span class="dot"></span>硬性要求</div>
        <ul class="parse-list">${(data.hardRequirements || []).map(t => `<li>${esc(t)}</li>`).join("")}</ul>
      </div>
      <div class="parse-card">
        <div class="parse-card-title"><span class="dot"></span>隐性要求</div>
        <ul class="parse-list">${(data.hiddenRequirements || []).map(t => `<li>${esc(t)}</li>`).join("")}</ul>
      </div>
      <div class="parse-card">
        <div class="parse-card-title"><span class="dot"></span>关键词</div>
        <div class="parse-tags">
          ${(data.keywords || []).map(k => `<span class="chip">${esc(k)}</span>`).join("")}
        </div>
      </div>
    </div>

    <div class="profile-section">
      <div class="profile-title">理想候选人画像</div>
      <div class="profile-text">${esc(data.candidateProfile || "")}</div>
    </div>

    <div class="competency-table">
      <div class="competency-row header">
        <span>核心能力</span>
        <span>重要性</span>
        <span>说明</span>
      </div>
      ${(data.coreCompetencies || []).map(c => `
        <div class="competency-row">
          <span class="col-name">${esc(c.name)}</span>
          <span><span class="badge ${c.importance === "高" ? "primary" : "warning"}">${esc(c.importance)}</span></span>
          <span class="text-muted">${esc(c.description)}</span>
        </div>
      `).join("")}
    </div>

    <div class="step-nav-buttons">
      <button class="ghost-btn" id="prevBtn">‹ 上一步 · 输入材料</button>
      <button class="primary-btn" id="nextBtn">下一步 · 简历诊断 ›</button>
    </div>
  `;
}

function restoreInPlace(obj, map) {
  // 递归处理：将字符串值中的占位符还原为原文
  if (obj == null) return;
  if (typeof obj === "string") {
    // 无法直接修改原始字符串，由调用方替换（见下方 restoreTree 用法）
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => {
      if (typeof v === "string") {
        obj[i] = restore(v, map);
      } else {
        restoreInPlace(v, map);
      }
    });
  } else if (typeof obj === "object") {
    Object.entries(obj).forEach(([k, v]) => {
      if (typeof v === "string") {
        obj[k] = restore(v, map);
      } else {
        restoreInPlace(v, map);
      }
    });
  }
}

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
