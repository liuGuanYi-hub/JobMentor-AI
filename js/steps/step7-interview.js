// steps/step7-interview.js — Step 7 面试准备

import { store } from "../store.js";
import { router } from "../router.js";
import { toast } from "../ui/toast.js";
import { chatJson } from "../ai/deepseek.js";
import { PROMPTS, buildUserPayload } from "../ai/prompts.js";
import { redact, mergeMaps, restoreTree } from "../privacy.js";
import { exportFullReport } from "../export/report.js";
import { createSilverLinkInterviewExample } from "../data/silverlink-interview-example.js";
import { getInterviewQuestions, scoreInterviewAnswer } from "../features/career-insights.js";

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
    const questions = getInterviewQuestions(data);
    const practice = normalizePracticeState(store.get("interviewPractice"), questions);

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

      ${renderPracticePanel(questions, practice)}

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
    bindPracticeEvents(data, questions, render);
  }
}

function normalizePracticeState(practice, questions) {
  const attempts = Array.isArray(practice?.attempts) ? practice.attempts : [];
  const activeQuestionId = questions.some((question) => question.id === practice?.activeQuestionId)
    ? practice.activeQuestionId
    : questions[0]?.id || "";
  return { activeQuestionId, attempts };
}

function renderPracticePanel(questions, practice) {
  if (!questions.length) {
    return `
      <div class="section-card interview-practice-card" id="interviewPractice">
        <div class="card-title">面试回答训练工作台</div>
        <p class="text-muted">当前没有可训练的面试题目。</p>
      </div>
    `;
  }
  const selected = questions.find((question) => question.id === practice.activeQuestionId) || questions[0];
  const latest = practice.attempts.find((attempt) => attempt.questionId === selected.id && attempt.result);
  return `
    <div class="section-card interview-practice-card" id="interviewPractice">
      <div class="practice-header">
        <div>
          <div class="card-title">面试回答训练工作台</div>
          <p class="text-muted practice-desc">参考多维面试教练的反馈方式，把“看答案”变成“先回答、再复盘”。评分在本地完成，不调用 AI。</p>
        </div>
        <span class="badge info">本地评分 · 不消耗 Token</span>
      </div>

      <div class="practice-toolbar">
        <label class="label" for="practiceQuestionSelect">选择训练题目</label>
        <select class="select" id="practiceQuestionSelect">
          ${questions.map((question) => `
            <option value="${esc(question.id)}" ${question.id === selected.id ? "selected" : ""}>
              ${question.type === "behavior" ? "行为题" : "专业题"} · ${esc(question.question)}
            </option>
          `).join("")}
        </select>
        <span class="practice-attempt-count">已保存 ${practice.attempts.length} 次练习</span>
      </div>

      <div class="practice-workspace">
        <div class="practice-question-box">
          <div class="practice-question-label">${selected.type === "behavior" ? "行为面试" : "专业基础"}</div>
          <div class="practice-question">${esc(selected.question)}</div>
          <p class="practice-hint">建议先脱稿回答，再对照右侧评分和参考答案补缺口。</p>
        </div>
        <div class="practice-answer-box">
          <label class="label" for="practiceAnswer">你的回答</label>
          <textarea class="textarea practice-answer-input" id="practiceAnswer" rows="8" placeholder="输入你准备在面试中说的话…">${esc(latest?.answer || "")}</textarea>
          <div class="practice-actions">
            <button class="ghost-btn" id="useReferenceAnswer" ${selected.answer ? "" : "disabled"}>插入参考回答</button>
            <button class="primary-btn" id="scorePractice">评分并保存</button>
          </div>
        </div>
      </div>

      ${latest ? renderPracticeResult(latest.result) : `
        <div class="practice-empty" id="practiceEmpty">完成一次回答后，这里会显示五维评分、STAR 完整度和下一步建议。</div>
      `}
      ${renderPracticeHistory(practice.attempts, questions)}
    </div>
  `;
}

function renderPracticeResult(result) {
  if (!result) return "";
  const starLabels = [
    ["situation", "背景"],
    ["task", "任务"],
    ["action", "行动"],
    ["result", "结果"],
  ];
  return `
    <div class="practice-result" id="practiceResult">
      <div class="practice-result-header">
        <div>
          <div class="practice-result-title">本次训练反馈</div>
          <div class="practice-result-summary">${esc(result.summary)}</div>
        </div>
        <div class="practice-score"><strong>${Number(result.overall) || 0}</strong><span>/ 100</span></div>
      </div>
      <div class="practice-dimension-grid">
        ${(result.dimensions || []).map((dimension) => `
          <div class="practice-dimension">
            <div class="practice-dimension-head"><span>${esc(dimension.label)}</span><strong>${dimension.score}</strong></div>
            <div class="practice-dimension-bar"><i style="width:${Math.max(0, Math.min(100, Number(dimension.score) || 0))}%"></i></div>
            <div class="practice-dimension-tip">${esc(dimension.tip)}</div>
          </div>
        `).join("")}
      </div>
      <div class="practice-star-row">
        <span class="practice-subtitle">STAR 完整度</span>
        ${starLabels.map(([key, label]) => `<span class="practice-star ${result.star?.[key] ? "done" : "missing"}">${result.star?.[key] ? "✓" : "○"} ${label}</span>`).join("")}
      </div>
      ${(result.missing || []).length ? `
        <div class="practice-missing">
          <div class="practice-subtitle">下一步补强</div>
          <ul>${result.missing.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
        </div>
      ` : ""}
    </div>
  `;
}

function renderPracticeHistory(attempts, questions) {
  if (!attempts.length) return "";
  return `
    <div class="practice-history">
      <div class="practice-subtitle">最近练习记录</div>
      <div class="practice-history-list">
        ${attempts.slice(0, 5).map((attempt) => {
          const question = questions.find((item) => item.id === attempt.questionId);
          const time = attempt.createdAt ? new Date(attempt.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "本地记录";
          return `
            <div class="practice-history-item">
              <span class="practice-history-score">${Number(attempt.result?.overall) || 0}</span>
              <span class="practice-history-question">${esc(question?.question || attempt.question || "未命名题目")}</span>
              <span class="practice-history-time">${esc(time)}</span>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function bindPracticeEvents(data, questions, renderView) {
  const select = document.querySelector("#practiceQuestionSelect");
  const textarea = document.querySelector("#practiceAnswer");
  const referenceButton = document.querySelector("#useReferenceAnswer");
  const scoreButton = document.querySelector("#scorePractice");
  if (!select || !textarea || !scoreButton) return;

  select.addEventListener("change", () => {
    const practice = normalizePracticeState(store.get("interviewPractice"), questions);
    store.replace("interviewPractice", { ...practice, activeQuestionId: select.value });
    renderView(data);
  });

  referenceButton?.addEventListener("click", () => {
    const selected = questions.find((question) => question.id === select.value);
    if (!selected?.answer) return;
    textarea.value = selected.answer;
    textarea.focus();
    toast("已插入本地参考回答，可继续改成自己的表达", "info");
  });

  scoreButton.addEventListener("click", () => {
    const answer = textarea.value.trim();
    if (!answer) {
      toast("请先输入你的回答，再进行评分", "warning");
      textarea.focus();
      return;
    }
    const selected = questions.find((question) => question.id === select.value) || questions[0];
    const result = scoreInterviewAnswer(selected.question, answer, {
      keywords: store.get("jdAnalysis.keywords") || [],
    });
    const practice = normalizePracticeState(store.get("interviewPractice"), questions);
    const attempts = [
      {
        id: `attempt-${Date.now().toString(36)}`,
        questionId: selected.id,
        question: selected.question,
        answer,
        result,
        createdAt: Date.now(),
      },
      ...practice.attempts,
    ].slice(0, 20);
    store.replace("interviewPractice", { activeQuestionId: selected.id, attempts });
    renderView(data);
    toast(`已保存本地评分：${result.overall}/100`, "success");
  });
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
