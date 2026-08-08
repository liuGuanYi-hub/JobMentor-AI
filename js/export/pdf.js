// export/pdf.js — 通用 PDF 导出（html2canvas + jsPDF）

/**
 * 把 HTML 元素导出为 PDF（自动分页）
 * @param {HTMLElement} el
 * @param {Object} opts
 * @param {string} opts.filename
 * @param {string} opts.format - 'a4' | 'a3' | 'letter'
 * @param {number} opts.scale - 截图倍率，默认 2
 */
export async function exportElementToPdf(el, { filename = "export.pdf", format = "a4", scale = 2 } = {}) {
  if (!window.html2canvas || !window.jspdf) {
    throw new Error("PDF 库未加载，请检查网络");
  }
  const canvas = await window.html2canvas(el, { scale, useCORS: true, backgroundColor: "#ffffff" });
  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "p", unit: "pt", format });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
  heightLeft -= pageHeight - margin * 2;

  while (heightLeft > 0) {
    position = position - (pageHeight - margin * 2);
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;
  }

  pdf.save(filename);
  return { pageCount: pdf.internal.getNumberOfPages() };
}

/**
 * 生成"全量综合报告"HTML 字符串（汇总 8 步的分析结果），
 * 供导出 PDF 前渲染到临时容器
 * @returns {string} HTML
 */
export function buildFullReportHtml(state) {
  const { input, jdAnalysis, diagnose, matchAnalysis, deepdive, optimize, interview } = state || {};

  function bulletList(items) {
    if (!items || items.length === 0) return `<p style="color:#999;">（无）</p>`;
    return `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  }

  return `
    <div style="font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;font-size:12px;color:#333;line-height:1.6;padding:24px;">
      <h1 style="font-size:20px;color:#5B6CFF;margin-bottom:4px;">简历专家 · 全量综合分析报告</h1>
      <p style="color:#999;font-size:11px;margin-bottom:20px;">生成时间：${new Date().toLocaleString("zh-CN")}</p>

      <h2 style="font-size:15px;color:#111;border-bottom:2px solid #5B6CFF;padding-bottom:6px;margin:20px 0 10px;">1. 输入材料</h2>
      <p>目标岗位：${esc(input?.target || "-")} ｜ 行业：${esc(input?.industry || "-")}</p>
      <p>公司规模：${esc(input?.companyScale || "-")} ｜ 求职阶段：${esc(input?.careerStage || "-")}</p>

      <h2 style="font-size:15px;color:#111;border-bottom:2px solid #5B6CFF;padding-bottom:6px;margin:20px 0 10px;">2. JD 解析</h2>
      ${jdAnalysis ? `
        <p><b>职责</b></p>${bulletList(jdAnalysis.responsibilities)}
        <p><b>硬性要求</b></p>${bulletList(jdAnalysis.hardRequirements)}
        <p><b>隐性要求</b></p>${bulletList(jdAnalysis.hiddenRequirements)}
        <p><b>关键词</b>：${(jdAnalysis.keywords || []).map(esc).join("、")}</p>
        <p><b>理想候选人画像</b>：${esc(jdAnalysis.candidateProfile)}</p>
      ` : "<p style='color:#999;'>（未生成）</p>"}

      <h2 style="font-size:15px;color:#111;border-bottom:2px solid #5B6CFF;padding-bottom:6px;margin:20px 0 10px;">3. 简历诊断</h2>
      ${diagnose ? `
        <p><b>综合匹配度：${diagnose.overall} / 100</b></p>
        <table style="width:100%;border-collapse:collapse;margin:8px 0;">
          ${(diagnose.dimensions || []).map((d) => `
            <tr>
              <td style="border:1px solid #eee;padding:6px 8px;width:35%;">${esc(d.name)}</td>
              <td style="border:1px solid #eee;padding:6px 8px;width:12%;font-weight:bold;">${d.score}</td>
              <td style="border:1px solid #eee;padding:6px 8px;">${esc(d.reason)}</td>
            </tr>
          `).join("")}
        </table>
        <p><b>主要问题</b></p>${bulletList(diagnose.issues)}
        <p><b>优先级建议</b></p>${bulletList(diagnose.recommendations)}
      ` : "<p style='color:#999;'>（未生成）</p>"}

      <h2 style="font-size:15px;color:#111;border-bottom:2px solid #5B6CFF;padding-bottom:6px;margin:20px 0 10px;">4. 匹配分析</h2>
      ${matchAnalysis?.rows?.length ? `
        <table style="width:100%;border-collapse:collapse;margin:8px 0;">
          <tr style="background:#f5f7fb;">
            <th style="border:1px solid #eee;padding:6px 8px;text-align:left;width:20%;">JD 要求</th>
            <th style="border:1px solid #eee;padding:6px 8px;text-align:left;width:35%;">简历证据</th>
            <th style="border:1px solid #eee;padding:6px 8px;text-align:left;width:10%;">强度</th>
            <th style="border:1px solid #eee;padding:6px 8px;text-align:left;">优化建议</th>
          </tr>
          ${matchAnalysis.rows.map((r) => `
            <tr>
              <td style="border:1px solid #eee;padding:6px 8px;">${esc(r.jdItem)}</td>
              <td style="border:1px solid #eee;padding:6px 8px;">${esc(r.evidence)}</td>
              <td style="border:1px solid #eee;padding:6px 8px;">${esc(r.strength)}${r.needsSupplement ? " ⚠" : ""}</td>
              <td style="border:1px solid #eee;padding:6px 8px;">${esc(r.suggestion)}</td>
            </tr>
          `).join("")}
        </table>
      ` : "<p style='color:#999;'>（未生成）</p>"}

      <h2 style="font-size:15px;color:#111;border-bottom:2px solid #5B6CFF;padding-bottom:6px;margin:20px 0 10px;">5. 经历追问</h2>
      ${deepdive?.questions?.length ? `
        ${deepdive.questions.map((q, i) => `
          <p><b>追问 ${i + 1}：</b>${esc(q.prompt)}</p>
          <p style="color:#555;padding-left:12px;">回答：${esc(q.userAnswer || "（未填写）")}</p>
          ${q.refinedBullet ? `<p style="color:#5B6CFF;padding-left:12px;">AI 改写：${esc(q.refinedBullet)}</p>` : ""}
        `).join("")}
      ` : "<p style='color:#999;'>（未生成）</p>"}

      <h2 style="font-size:15px;color:#111;border-bottom:2px solid #5B6CFF;padding-bottom:6px;margin:20px 0 10px;">6. 简历优化</h2>
      ${optimize?.sections?.length ? `
        ${optimize.sections.map((sec) => `
          <p><b>${esc(sec.title || sec.type)}</b></p>
          <ul>
            ${(sec.items || []).map((it) => `
              <li>${esc(it[it.selectedVariant || "authentic"] || it.authentic || it.original || "")}</li>
            `).join("")}
          </ul>
        `).join("")}
      ` : "<p style='color:#999;'>（未生成）</p>"}

      <h2 style="font-size:15px;color:#111;border-bottom:2px solid #5B6CFF;padding-bottom:6px;margin:20px 0 10px;">7. 面试准备</h2>
      ${interview ? `
        <p><b>自我介绍</b>：${esc(interview.selfIntro)}</p>
        <p><b>行为面试</b></p>${bulletList(interview.behaviorQuestions)}
        <p><b>专业基础</b></p>${bulletList(interview.techQuestions)}
        <p><b>关键数据</b></p>${bulletList(interview.dataPoints)}
      ` : "<p style='color:#999;'>（未生成）</p>"}

      <p style="margin-top:30px;color:#bbb;font-size:10px;text-align:center;">— 由 简历专家 · JD 定制简历优化 Agent 生成 —</p>
    </div>
  `;
}

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
