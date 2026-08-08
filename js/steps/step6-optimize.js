// steps/step6-optimize.js — Step 6 简历优化

import { store } from "../store.js";
import { router } from "../router.js";
import { toast } from "../ui/toast.js";
import { chatJson } from "../ai/deepseek.js";
import { PROMPTS, buildUserPayload } from "../ai/prompts.js";
import { redact } from "../privacy.js";
import { exportFullReport } from "../export/report.js";

export async function renderStep6(container) {
  const existing = store.get("optimize");
  const settings = store.get("settings");

  if (existing) {
    render(existing);
  } else {
    container.innerHTML = `
      <div class="step-page-header">
        <h1 class="step-page-title">简历优化</h1>
        <p class="step-page-desc">根据原简历初稿与步骤 5 补充，按 5 个方向精炼呈现</p>
      </div>
      <div class="step-loading"><div class="spinner"></div><span>正在生成对照表…</span></div>
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
    const deepdive = store.get("deepdive");
    let jdText = input.jdText;
    let resumeText = input.resumeText;
    if (settings.privacyOn) {
      jdText = redact(jdText).redacted;
      resumeText = redact(resumeText).redacted;
    }

    const extra = deepdive ? deepdive.questions.filter(q => q.refinedBullet).map(q => `${q.prompt}\n回答: ${q.userAnswer}\n改写为: ${q.refinedBullet}`).join("\n\n") : "";

    try {
      const messages = [
        { role: "system", content: PROMPTS.step6 },
        { role: "user", content: buildUserPayload("step6", { input, jdText, resumeText, jdAnalysis, deepdive, extra }) },
      ];
      const result = await chatJson({ apiKey, messages, temperature: 0.5, maxRetries: 1 });
      // 默认选 authentic 列为最终版
      result.sections = (result.sections || []).map(s => ({
        ...s,
        items: (s.items || []).map(it => ({ ...it, selectedVariant: it.selectedVariant || "authentic" })),
      }));
      store.replace("optimize", result);
      store.markStepDone(6);
      render(result);
    } catch (e) {
      console.error(e);
      container.innerHTML = `
        <div class="card">
          <div class="card-title">优化失败</div>
          <p class="text-muted">${e.message}</p>
          <button class="primary-btn mt-4" id="retryBtn">重试</button>
        </div>
      `;
      container.querySelector("#retryBtn").addEventListener("click", () => {
        store.replace("optimize", null);
        renderStep6(container);
      });
    }
  }

  function render(data) {
    if (!data || !data.sections) {
      container.innerHTML = `<div class="card">无数据</div>`;
      return;
    }

    container.innerHTML = `
      <div class="step-page-header">
        <div>
          <h1 class="step-page-title">简历优化</h1>
          <p class="step-page-desc">根据原简历初稿与步骤 5 补充，按 5 个方向精炼呈现</p>
        </div>
        <button class="ghost-btn" id="exportPdf">导出全量综合报告 PDF</button>
      </div>

      <div class="optimize-intro card">
        <div class="card-title">润色提炼与可拓展点（动态化新增 Bullet Points）</div>
        <ul class="parse-list text-muted" style="font-size:12px;line-height:1.6;">
          <li>所有简历项目已被您排列提炼，AI 生成对照表便于选择；</li>
          <li>每行可选择不同变体作为您应用的最终版本；</li>
          <li>完成后可在最后步骤选择简历模板并导出。</li>
        </ul>
      </div>

      <div class="optimize-table">
        <table>
          <thead>
            <tr>
              <th class="col-original">原始描述</th>
              <th class="col-data">突出数据强化</th>
              <th class="col-lead">强化主导力</th>
              <th class="col-authentic">真实宝贝</th>
              <th class="col-jd">关联岗位 JD</th>
            </tr>
          </thead>
          <tbody id="optTbody">
            ${renderSections(data.sections)}
          </tbody>
        </table>
      </div>

      <div class="step-nav-buttons">
        <button class="ghost-btn" id="prevBtn">‹ 上一步 · 经历追问</button>
        <button class="primary-btn" id="nextBtn">下一步 · 面试准备 ›</button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    bindEvents(data);
  }

  function renderSections(sections) {
    let html = "";
    sections.forEach((sec, si) => {
      const headerText = sec.title || (sec.type === "summary" ? "Summary · 个人简介"
        : sec.type === "projectExperience" ? "Project Experience · 项目经验"
        : sec.type === "workExperience" ? "Work Experience · 实习/工作经历"
        : sec.type === "consultant" ? "Consultant · 核心技术架构"
        : sec.type === "skillsAndTools" ? "Skills and Tools · 技能与工具"
        : sec.type);

      html += `<tr class="optimize-section-header"><td colspan="5">${esc(headerText)}${sec.period ? ` <span style="color:var(--text-3);margin-left:8px;font-weight:normal;">${esc(sec.period)}</span>` : ""}</td></tr>`;

      (sec.items || []).forEach((it, idx) => {
        html += `
          <tr data-section="${si}" data-item="${idx}">
            <td>${esc(it.original || "")}<br><small style="color:var(--text-3);">[${esc(it.label || "")}]</small></td>
            <td class="variant-cell" data-variant="data">${esc(it.data || "")}</td>
            <td class="variant-cell" data-variant="lead">${esc(it.lead || "")}</td>
            <td class="variant-cell" data-variant="authentic">${esc(it.authentic || "")}</td>
            <td class="variant-cell" data-variant="jdAligned">${esc(it.jdAligned || "")}</td>
          </tr>
        `;
      });
    });
    return html;
  }

  function bindEvents(data) {
    // 点击 variant 选择
    container.querySelectorAll(".variant-cell").forEach(cell => {
      cell.addEventListener("click", () => {
        const tr = cell.closest("tr");
        const si = parseInt(tr.getAttribute("data-section"), 10);
        const ii = parseInt(tr.getAttribute("data-item"), 10);
        const variant = cell.getAttribute("data-variant");
        data.sections[si].items[ii].selectedVariant = variant;
        // 视觉反馈
        const row = tr;
        row.querySelectorAll(".variant-cell").forEach(c => c.style.outline = "");
        cell.style.outline = "2px solid var(--primary)";
        cell.style.outlineOffset = "-2px";
        store.replace("optimize", data);
      });
    });

    container.querySelector("#prevBtn").addEventListener("click", () => router.go(5));
    container.querySelector("#nextBtn").addEventListener("click", () => router.go(7));
    container.querySelector("#exportPdf").addEventListener("click", () => exportFullReport("full"));
  }
}

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
