// steps/step7-interview.js — Step 7 面试准备

import { store } from "../store.js";
import { router } from "../router.js";
import { toast } from "../ui/toast.js";
import { chatJson } from "../ai/deepseek.js";
import { PROMPTS, buildUserPayload } from "../ai/prompts.js";
import { redact, mergeMaps, restoreTree } from "../privacy.js";
import { exportFullReport } from "../export/report.js";
import { createSilverLinkInterviewExample } from "../data/silverlink-interview-example.js";

export async function renderStep7(container) {
  const input = store.get("input") || {};
  if (input.isExampleData) {
    store.replace("interview", createSilverLinkInterviewExample());
    store.markStepDone(7);
  }
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
    let restoreMap = null;
    if (settings.privacyOn) {
      const r1 = redact(jdText);
      const r2 = redact(resumeText);
      jdText = r1.redacted;
      resumeText = r2.redacted;
      restoreMap = mergeMaps(r1.map, r2.map);
    }

    const extra = optimize ? "用户已选定的 Bullet 优化方向已纳入考量" : "";

    try {
      const messages = [
        { role: "system", content: PROMPTS.step7 },
        { role: "user", content: buildUserPayload("step7", { input, jdText, resumeText, jdAnalysis, diagnose, optimize, extra }) },
      ];
      let result = await chatJson({ apiKey, messages, temperature: 0.5 });
      if (restoreMap) result = restoreTree(result, restoreMap);
      store.replace("interview", result);
      store.markStepDone(7);
      render(result);
    } catch (e) {
      console.error(e);
      container.innerHTML = `
        <div class="card">
          <div class="card-title">生成失败</div>
          <p class="text-muted">${esc(e.message)}</p>
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
          <p class="step-page-desc">基于简历与 JD，生成自我介绍、可能被追问题目、关键数据${data.sourceLabel ? ` · ${esc(data.sourceLabel)}` : ""}</p>
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
          ${(data.behaviorQuestions || []).map((q, i) => renderQuestionItem(q, i + 1)).join("")}
          ${(data.techQuestions || []).map((q, i) => renderQuestionItem(q, (data.behaviorQuestions?.length || 0) + 1 + i)).join("")}
          ${(!data.techQuestions || data.techQuestions.length === 0) ? `
            <div class="interview-item">
              <div class="interview-q-num">6</div>
              <div class="interview-q-content">
                <div class="interview-q-text">请详细介绍你最满意的一个 Android 项目，包括架构设计、个人贡献。</div>
              </div>
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

function renderQuestionItem(question, number) {
  const text = typeof question === "string" ? question : question?.question || question?.prompt || "";
  const answer = typeof question === "string" ? "" : question?.answer || "";
  return `
    <div class="interview-item">
      <div class="interview-q-num">${number}</div>
      <div class="interview-q-content">
        <div class="interview-q-text">${esc(text)}</div>
        ${answer ? `<div class="interview-answer"><strong>参考回答</strong><div>${esc(answer)}</div></div>` : ""}
      </div>
    </div>
  `;
}

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
