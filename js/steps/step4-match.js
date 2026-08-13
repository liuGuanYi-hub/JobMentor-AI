// steps/step4-match.js — Step 4 匹配分析

import { store } from "../store.js";
import { router } from "../router.js";
import { toast } from "../ui/toast.js";
import { chatJson } from "../ai/deepseek.js";
import { PROMPTS, buildUserPayload } from "../ai/prompts.js";
import { redact, mergeMaps, restoreTree } from "../privacy.js";
import { exportFullReport } from "../export/report.js";
import { buildKeywordCoverage } from "../features/career-insights.js";

const STRENGTH_MAP = {
  "强": { cls: "success", text: "强" },
  "中": { cls: "warning", text: "中" },
  "弱": { cls: "danger", text: "弱" },
  "无": { cls: "", text: "无" },
};

export async function renderStep4(container) {
  const existing = store.get("matchAnalysis");
  const settings = store.get("settings");

  if (existing) {
    renderResult(existing);
  } else {
    container.innerHTML = `
      <div class="step-page-header">
        <div>
          <h1 class="step-page-title">匹配分析</h1>
          <p class="step-page-desc">逐条对比 JD 要求与简历证据，识别缺口与优化方向</p>
        </div>
      </div>
      <div class="step-loading"><div class="spinner"></div><span>正在生成匹配分析…</span></div>
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
        { role: "system", content: PROMPTS.step4 },
        { role: "user", content: buildUserPayload("step4", { input, jdText, resumeText, jdAnalysis }) },
      ];
      let result = await chatJson({ apiKey, messages, temperature: 0.4 });
      if (restoreMap) result = restoreTree(result, restoreMap);
      store.replace("matchAnalysis", result);
      store.markStepDone(4);
      renderResult(result);
    } catch (e) {
      console.error(e);
      container.innerHTML = `
        <div class="card">
          <div class="card-title">匹配分析失败</div>
          <p class="text-muted">${esc(e.message)}</p>
          <button class="primary-btn mt-4" id="retryBtn">重试</button>
        </div>
      `;
      container.querySelector("#retryBtn").addEventListener("click", () => {
        store.replace("matchAnalysis", null);
        renderStep4(container);
      });
    }
  }

  function renderResult(data) {
    if (!data || !data.rows) {
      container.innerHTML = `<div class="card">无数据</div>`;
      return;
    }
    const input = store.get("input") || {};
    const jdAnalysis = store.get("jdAnalysis") || {};
    const coverage = buildKeywordCoverage({
      keywords: jdAnalysis.keywords || [],
      input,
      optimize: store.get("optimize"),
    });
    container.innerHTML = `
      <div class="step-page-header">
        <div>
          <h1 class="step-page-title">匹配分析</h1>
          <p class="step-page-desc">逐条对比 JD 要求与简历证据，识别缺口与优化方向</p>
        </div>
        <button class="ghost-btn" id="exportPdf">导出全量综合报告 PDF</button>
      </div>

      <div class="match-table">
        <table>
          <thead>
            <tr>
              <th>JD 要求</th>
              <th>简历证据</th>
              <th>证据强度</th>
              <th>是否补充</th>
              <th>优化建议</th>
            </tr>
          </thead>
          <tbody>
            ${data.rows.map(r => {
              const s = STRENGTH_MAP[r.strength] || STRENGTH_MAP["中"];
              return `
                <tr>
                  <td>${esc(r.jdItem)}</td>
                  <td>${esc(r.evidence)}</td>
                  <td class="col-strength"><span class="badge ${s.cls}">${s.text}</span></td>
                  <td class="col-need">${r.needsSupplement ? `<span class="badge" style="background:var(--warning-light);color:var(--warning);">需补充</span>` : `<span class="badge success">已覆盖</span>`}</td>
                  <td>${esc(r.suggestion)}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      <div class="section-card keyword-coverage-card">
        <div class="keyword-coverage-header">
          <div>
            <div class="card-title">JD 关键词覆盖</div>
            <p class="text-muted keyword-coverage-desc">把 JD 关键词和原始简历、优化结果逐条对照，快速看出哪些词有证据、哪些词还需要补充。</p>
          </div>
          <span class="badge ${coverage.coverageRate >= 70 ? "success" : "warning"}">${coverage.coveredCount}/${coverage.total} 已覆盖</span>
        </div>
        <div class="coverage-meter" aria-label="关键词覆盖率">
          <div class="coverage-meter-fill" style="width:${coverage.coverageRate}%"></div>
        </div>
        <div class="coverage-summary">覆盖率 <strong>${coverage.coverageRate}%</strong> · ${coverage.missingCount ? `还有 ${coverage.missingCount} 个关键词缺少直接证据` : "关键词均已找到简历证据"}</div>
        <div class="keyword-coverage-list">
          ${coverage.items.length ? coverage.items.map((item) => `
            <div class="keyword-coverage-item ${item.covered ? "covered" : "missing"}">
              <div class="keyword-coverage-main">
                <span class="coverage-state">${item.covered ? "已覆盖" : "待补证"}</span>
                <strong>${esc(item.keyword)}</strong>
              </div>
              <div class="coverage-evidence">${item.covered ? `<span>${esc(item.evidence.source)}</span>${esc(item.evidence.text)}` : "原始简历和当前优化结果中未找到直接证据"}</div>
            </div>
          `).join("") : `<div class="coverage-empty">当前 JD 尚未提取出关键词。</div>`}
        </div>
      </div>

      <div class="step-nav-buttons">
        <button class="ghost-btn" id="prevBtn">‹ 上一步 · 简历诊断</button>
        <button class="primary-btn" id="nextBtn">下一步 · 经历追问 ›</button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    container.querySelector("#prevBtn").addEventListener("click", () => router.go(3));
    container.querySelector("#nextBtn").addEventListener("click", () => router.go(5));
    container.querySelector("#exportPdf").addEventListener("click", () => exportFullReport("full"));
  }
}

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
