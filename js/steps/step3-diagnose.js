// steps/step3-diagnose.js — Step 3 简历诊断

import { store } from "../store.js";
import { router } from "../router.js";
import { toast } from "../ui/toast.js";
import { setScore } from "../ui/score-ring.js";
import { chatJson } from "../ai/deepseek.js";
import { PROMPTS, buildUserPayload } from "../ai/prompts.js";
import { redact, mergeMaps, restoreTree } from "../privacy.js";
import { exportFullReport } from "../export/report.js";

export async function renderStep3(container) {
  const existing = store.get("diagnose");
  const settings = store.get("settings");

  if (existing) {
    renderResult(existing);
  } else {
    container.innerHTML = `
      <div class="step-page-header">
        <h1 class="step-page-title">简历诊断</h1>
        <p class="step-page-desc">基于 JD 要求评估当前简历的匹配度与主要问题</p>
      </div>
      <div class="step-loading"><div class="spinner"></div><span>正在调用 AI 诊断…</span></div>
    `;
    runAnalysis();
  }

  async function runAnalysis() {
    const apiKey = store.get("settings.apiKey");
    if (!apiKey) {
      container.innerHTML = `
        <div class="card">
          <div class="card-title">未设置 API Key</div>
          <p class="text-muted">请先在右上角"重新开始"旁设置 DeepSeek API Key</p>
        </div>
      `;
      return;
    }

    const input = store.get("input");
    const jdAnalysis = store.get("jdAnalysis");
    let jdText = input.jdText;
    let resumeText = input.resumeText;
    let restoreMap = null;

    if (settings.privacyOn) {
      const r1 = redact(jdText);
      jdText = r1.redacted;
      const r2 = redact(resumeText);
      resumeText = r2.redacted;
      restoreMap = mergeMaps(r1.map, r2.map);
    }

    try {
      const messages = [
        { role: "system", content: PROMPTS.step3 },
        { role: "user", content: buildUserPayload("step3", { input, jdText, resumeText, jdAnalysis }) },
      ];
      let result = await chatJson({ apiKey, messages, temperature: 0.4 });
      if (restoreMap) result = restoreTree(result, restoreMap);
      store.replace("diagnose", result);
      store.markStepDone(3);
      renderResult(result);
    } catch (e) {
      console.error(e);
      container.innerHTML = `
        <div class="card">
          <div class="card-title">诊断失败</div>
          <p class="text-muted">${esc(e.message)}</p>
          <button class="primary-btn mt-4" id="retryBtn">重试</button>
        </div>
      `;
      container.querySelector("#retryBtn").addEventListener("click", () => {
        store.replace("diagnose", null);
        renderStep3(container);
      });
    }
  }

  function renderResult(data) {
    if (!data) return;
    setScore(data.overall || 0);

    container.innerHTML = `
      <div class="step-page-header">
        <div>
          <h1 class="step-page-title">简历诊断</h1>
          <p class="step-page-desc">基于 JD 要求评估当前简历的匹配度与主要问题</p>
        </div>
        <button class="ghost-btn" id="exportPdf">导出全量综合报告 PDF</button>
      </div>

      <div class="diagnose-layout">
        <div class="score-big-card">
          <div class="score-ring">
            <svg width="140" height="140" viewBox="0 0 140 140">
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#5B6CFF" />
                  <stop offset="100%" stop-color="#22C55E" />
                </linearGradient>
              </defs>
              <circle class="ring-bg" cx="70" cy="70" r="60"></circle>
              <circle class="ring-fg" id="ringFg" cx="70" cy="70" r="60"
                stroke-dasharray="${2 * Math.PI * 60}"
                stroke-dashoffset="${2 * Math.PI * 60}"></circle>
            </svg>
            <div class="score-ring-num">
              ${data.overall}
              <span class="score-label-sub">匹配度</span>
            </div>
          </div>
        </div>

        <div class="dimension-list">
          ${(data.dimensions || []).map(d => `
            <div class="dimension-item">
              <div class="dimension-head">
                <span>${esc(d.name)}</span>
                <span class="dimension-num">${d.score}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill ${d.score < 60 ? "low" : ""}" style="width:${d.score}%;"></div>
              </div>
              <div class="dimension-reason">${esc(d.reason)}</div>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="suggestion-grid">
        <div class="card">
          <div class="card-title">主要问题</div>
          <ul class="parse-list">
            ${(data.issues || []).map(i => `<li>${esc(i)}</li>`).join("")}
          </ul>
        </div>
        <div class="card">
          <div class="card-title">优先级建议</div>
          <ul class="parse-list">
            ${(data.recommendations || []).map(r => `<li>${esc(r)}</li>`).join("")}
          </ul>
        </div>
      </div>

      <div class="step-nav-buttons">
        <button class="ghost-btn" id="prevBtn">‹ 上一步 · JD 解析</button>
        <button class="primary-btn" id="nextBtn">下一步 · 匹配分析 ›</button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    // 圆环动画
    requestAnimationFrame(() => {
      const fg = container.querySelector("#ringFg");
      if (!fg) return;
      const target = data.overall;
      const circumference = 2 * Math.PI * 60;
      const offset = circumference * (1 - target / 100);
      fg.style.strokeDashoffset = circumference;
      requestAnimationFrame(() => {
        fg.style.transition = "stroke-dashoffset 1s ease";
        fg.style.strokeDashoffset = offset;
      });
    });

    bindNav();
  }

  function bindNav() {
    container.querySelector("#prevBtn").addEventListener("click", () => router.go(2));
    container.querySelector("#nextBtn").addEventListener("click", () => router.go(4));
    container.querySelector("#exportPdf").addEventListener("click", () => exportFullReport("full"));
  }
}

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
