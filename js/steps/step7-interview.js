// steps/step7-interview.js — Step 7 面试准备

import { store } from "../store.js";
import { router } from "../router.js";
import { toast } from "../ui/toast.js";
import { chatJson } from "../ai/deepseek.js";
import { PROMPTS, buildUserPayload } from "../ai/prompts.js";
import { redact } from "../privacy.js";
import { exportFullReport } from "../export/report.js";

export async function renderStep7(container) {
  const existing = store.get("interview");
  const settings = store.get("settings");

  if (existing) {
    render(existing);
  } else {
    container.innerHTML = `
      <div class="step-page-header">
        <h1 class="step-page-title">面试准备</h1>
        <p class="step-page-desc">基于简历与 JD，生成自我介绍、可能被追问题目、关键数据</p>
      </div>
      <div class="step-loading"><div class="spinner"></div><span>正在生成面试准备…</span></div>
    `;
    runAnalysis();
  }

  async function runAnalysis() {
    const apiKey = store.get("settings.apiKey");
    if (!apiKey) {
      container.innerHTML = `<div class="card"><div class="card-title">未设置 API Key</div></div>`;
      return;
    }
    const input = store.get("input");
    const jdAnalysis = store.get("jdAnalysis");
    const diagnose = store.get("diagnose");
    const optimize = store.get("optimize");
    let jdText = input.jdText;
    let resumeText = input.resumeText;
    if (settings.privacyOn) {
      jdText = redact(jdText).redacted;
      resumeText = redact(resumeText).redacted;
    }

    const extra = optimize ? "用户已选定的 Bullet 优化方向已纳入考量" : "";

    try {
      const messages = [
        { role: "system", content: PROMPTS.step7 },
        { role: "user", content: buildUserPayload("step7", { input, jdText, resumeText, jdAnalysis, diagnose, optimize, extra }) },
      ];
      const result = await chatJson({ apiKey, messages, temperature: 0.5 });
      store.replace("interview", result);
      store.markStepDone(7);
      render(result);
    } catch (e) {
      console.error(e);
      container.innerHTML = `
        <div class="card">
          <div class="card-title">生成失败</div>
          <p class="text-muted">${e.message}</p>
          <button class="primary-btn mt-4" id="retryBtn">重试</button>
        </div>
      `;
      container.querySelector("#retryBtn").addEventListener("click", () => {
        store.replace("interview", null);
        renderStep7(container);
      });
    }
  }

  function render(data) {
    if (!data) {
      container.innerHTML = `<div class="card">无数据</div>`;
      return;
    }

    container.innerHTML = `
      <div class="step-page-header">
        <div>
          <h1 class="step-page-title">面试准备</h1>
          <p class="step-page-desc">基于简历与 JD，生成自我介绍、可能被追问题目、关键数据</p>
        </div>
        <div class="flex gap-2">
          <button class="ghost-btn" id="exportJd">导出简历初稿 PDF</button>
          <button class="ghost-btn" id="exportReport">导出全量综合报告 PDF</button>
        </div>
      </div>

      <!-- 自我介绍 -->
      <div class="section-card">
        <div class="card-title">自我介绍</div>
        <p class="text-muted" style="font-size:12px;">${esc(data.selfIntro?.slice(0, 30) || "")}…</p>
        <div class="self-intro" contenteditable="true">${esc(data.selfIntro || "")}</div>
      </div>

      <!-- 可能被追问 -->
      <div class="section-card">
        <div class="card-title">可能被追问（10 题）</div>
        <p class="text-muted" style="font-size:12px;">行为面试 5-10 题 + 专业基础知识 5-10 题</p>

        <div class="interview-list">
          ${(data.behaviorQuestions || []).map((q, i) => `
            <div class="interview-item">
              <div class="interview-q-num">${i + 1}</div>
              <div class="interview-q-text">${esc(q)}</div>
            </div>
          `).join("")}
          ${(data.techQuestions || []).map((q, i) => `
            <div class="interview-item">
              <div class="interview-q-num">${(data.behaviorQuestions?.length || 0) + 1 + i}</div>
              <div class="interview-q-text">${esc(q)}</div>
            </div>
          `).join("")}
          ${(!data.techQuestions || data.techQuestions.length === 0) ? `
            <div class="interview-item">
              <div class="interview-q-num">6</div>
              <div class="interview-q-text">请详细介绍你最满意的一个 Android 项目，包括架构设计、个人贡献。</div>
            </div>
          ` : ""}
        </div>
      </div>

      <!-- 常见考察能力 -->
      <div class="section-card">
        <div class="card-title">常见考察的能力</div>
        <div class="skill-tags">
          ${(data.skills || ["项目类", "系统设计类", "专业基础类", "价值观类"]).map(s => `<span class="chip active">${esc(s)}</span>`).join("")}
        </div>
      </div>

      <!-- 可能准备的数据 -->
      <div class="section-card">
        <div class="card-title">可能准备的数据</div>
        <div class="data-point-list">
          ${(data.dataPoints || []).map(d => `<div class="data-point">${esc(d)}</div>`).join("")}
        </div>
      </div>

      <div class="step-nav-buttons">
        <button class="ghost-btn" id="prevBtn">‹ 上一步 · 简历优化</button>
        <button class="primary-btn" id="nextBtn">下一步 · 最终简历 ›</button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    container.querySelector("#prevBtn").addEventListener("click", () => router.go(6));
    container.querySelector("#nextBtn").addEventListener("click", () => router.go(8));
    container.querySelector("#exportJd").addEventListener("click", () => exportFullReport("jd"));
    container.querySelector("#exportReport").addEventListener("click", () => exportFullReport("full"));
  }
}

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
