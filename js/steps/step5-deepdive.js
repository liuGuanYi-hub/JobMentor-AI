// steps/step5-deepdive.js — Step 5 经历追问

import { store } from "../store.js";
import { router } from "../router.js";
import { toast } from "../ui/toast.js";
import { chatJson } from "../ai/deepseek.js";
import { PROMPTS, buildUserPayload } from "../ai/prompts.js";
import { redact, mergeMaps, restoreTree } from "../privacy.js";

export async function renderStep5(container) {
  const existing = store.get("deepdive");
  const settings = store.get("settings");

  if (existing && existing.questions) {
    render(existing);
  } else {
    container.innerHTML = `
      <div class="step-page-header">
        <h1 class="step-page-title">经历追问</h1>
        <p class="step-page-desc">补充简历中被忽略的关键成就，让 Agent 改写为更好的 Bullet</p>
      </div>
      <div class="step-loading"><div class="spinner"></div><span>正在生成追问列表…</span></div>
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
    const matchAnalysis = store.get("matchAnalysis");
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

    try {
      const messages = [
        { role: "system", content: PROMPTS.step5 },
        { role: "user", content: buildUserPayload("step5", { input, jdText, resumeText, jdAnalysis, matchAnalysis }) },
      ];
      let result = await chatJson({ apiKey, messages, temperature: 0.5 });
      if (restoreMap) result = restoreTree(result, restoreMap);
      // 初始化用户回答字段
      result.questions = (result.questions || []).map((q, i) => ({
        ...q,
        id: q.id || `q${i + 1}`,
        userAnswer: "",
        refinedBullet: "",
      }));
      store.replace("deepdive", result);
      store.markStepDone(5);
      render(result);
    } catch (e) {
      console.error(e);
      container.innerHTML = `
        <div class="card">
          <div class="card-title">追问生成失败</div>
          <p class="text-muted">${esc(e.message)}</p>
          <button class="primary-btn mt-4" id="retryBtn">重试</button>
        </div>
      `;
      container.querySelector("#retryBtn").addEventListener("click", () => {
        store.replace("deepdive", null);
        renderStep5(container);
      });
    }
  }

  function render(data) {
    if (!data || !data.questions) {
      container.innerHTML = `<div class="card">无数据</div>`;
      return;
    }

    container.innerHTML = `
      <div class="step-page-header">
        <h1 class="step-page-title">经历追问</h1>
        <p class="step-page-desc">补全简历"经历追问" 有什么好作用？</p>
      </div>

      <div class="banner-deepdive">
        <div class="banner-deepdive-icon">💡</div>
        <div>
          <div class="title">补全简历"经历追问" 有什么好作用？</div>
          <div class="desc">
            AI 挖掘你没提到的关键成就，引导你补充简历中未充分体现的项目细节…
            <br>✅ 帮您快速生成 AI 整合金句（仅 1 AI 润色 Bullet）；⭐ 可保存到后续步骤； ❌ 可"忽略补全"以跳过问题
          </div>
        </div>
      </div>

      <div id="questionsList">
        ${data.questions.map((q, i) => questionCardHtml(q, i)).join("")}
      </div>

      <div class="step-nav-buttons">
        <button class="ghost-btn" id="prevBtn">‹ 上一步 · 匹配分析</button>
        <button class="primary-btn" id="nextBtn">下一步 · 简历优化 ›</button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    bindEvents(data);
  }

  function questionCardHtml(q, idx) {
    return `
      <div class="question-card" data-qid="${esc(q.id)}">
        <div class="question-head">
          <span class="question-num">追问${String(idx + 1).padStart(2, "0")}</span>
          <span class="question-text">${esc(q.prompt)}</span>
        </div>
        <div class="question-hint">${esc(q.hint || "")}</div>
        <div class="question-textarea-label">你的回答（填写实际事实，AI 将据此改写 Bullet）</div>
        <textarea class="textarea" data-input="answer" placeholder="填写您的真实经历、数据、决策…" style="min-height:80px;">${esc(q.userAnswer || "")}</textarea>
        <div class="question-actions">
          <button class="ghost-btn" data-action="ignore">跳过/忽略</button>
          <button class="primary-btn" data-action="refine">
            <i data-lucide="sparkles" width="14"></i>
            帮助我的 JD 生成与我优化 Bullet
          </button>
        </div>
        ${q.refinedBullet ? `
          <div class="refined-output">
            <div class="label">✨ AI 改写结果</div>
            <div class="bullet">${esc(q.refinedBullet)}</div>
          </div>
        ` : ""}
      </div>
    `;
  }

  function bindEvents(data) {
    // 监听每个卡片的输入、按钮
    const cards = container.querySelectorAll(".question-card");
    cards.forEach(card => {
      const qid = card.getAttribute("data-qid");
      const q = data.questions.find(x => x.id === qid);
      if (!q) return;

      const textarea = card.querySelector('textarea[data-input="answer"]');
      textarea.addEventListener("input", () => {
        q.userAnswer = textarea.value;
        store.replace("deepdive", data);
      });

      card.querySelector('[data-action="refine"]').addEventListener("click", async () => {
        if (!q.userAnswer || !q.userAnswer.trim()) {
          toast("请先填写您的回答", "warning");
          return;
        }
        await refineOne(q, card, data);
      });

      card.querySelector('[data-action="ignore"]').addEventListener("click", () => {
        q.userAnswer = "(已跳过)";
        q.refinedBullet = "";
        store.replace("deepdive", data);
        render(data);
      });
    });

    container.querySelector("#prevBtn").addEventListener("click", () => router.go(4));
    container.querySelector("#nextBtn").addEventListener("click", () => router.go(6));
  }

  async function refineOne(q, card, data) {
    const apiKey = store.get("settings.apiKey");
    if (!apiKey) {
      toast("请先设置 API Key", "warning");
      return;
    }
    const input = store.get("input");
    const settings = store.get("settings");
    const jdAnalysis = store.get("jdAnalysis");
    let jdContext = "";
    if (jdAnalysis) {
      jdContext = `关键词: ${(jdAnalysis.keywords || []).join(", ")}\n核心能力: ${(jdAnalysis.coreCompetencies || []).map(c => c.name).join(", ")}`;
    }

    try {
      const btn = card.querySelector('[data-action="refine"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle;"></span> <span>改写中…</span>';

      let prompt = q.prompt;
      let answer = q.userAnswer;
      let restoreMap = null;
      if (settings.privacyOn) {
        const qRedacted = redact(prompt);
        const aRedacted = redact(answer);
        prompt = qRedacted.redacted;
        answer = aRedacted.redacted;
        restoreMap = mergeMaps(qRedacted.map, aRedacted.map);
      }

      const messages = [
        { role: "system", content: PROMPTS.step5Refine },
        {
          role: "user",
          content: `【JD 关注点】\n${jdContext}\n\n【用户的追问】\n${prompt}\n\n【用户的回答】\n${answer}\n\n请把上述回答改写成 1 条简历 Bullet，要求：具体、量化、有行动力、自然、20-50 字。`,
        },
      ];
      let result = await chatJson({ apiKey, messages, temperature: 0.5 });
      if (restoreMap) result = restoreTree(result, restoreMap);
      q.refinedBullet = result.bullet || JSON.stringify(result);
      store.replace("deepdive", data);
      render(data);
      toast("AI 已完成 Bullet 改写", "success");
    } catch (e) {
      console.error(e);
      toast("改写失败：" + e.message, "error");
      btn.disabled = false;
      btn.innerHTML = '<span>帮助我的 JD 生成与我优化 Bullet</span>';
    }
  }
}

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
