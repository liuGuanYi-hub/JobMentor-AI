// export/report.js — 全量综合报告导出辅助（供各步骤按钮复用）

import { store } from "../store.js";
import { toast } from "../ui/toast.js";
import { exportElementToPdf, buildFullReportHtml } from "./pdf.js";

/**
 * 导出全量综合报告 PDF
 * @param {string} scope - 'jd' 仅 JD 解析 / 'full' 全量
 */
export async function exportFullReport(scope = "full") {
  const state = store.get();
  if (scope === "jd" && !state.jdAnalysis) {
    toast("尚无 JD 解析结果", "warning");
    return;
  }
  if (scope === "full" && !state.jdAnalysis) {
    toast("请先完成 JD 解析", "warning");
    return;
  }

  const host = document.createElement("div");
  // 离屏渲染：置于视口内但视觉隐藏（opacity 0.01），避免 html2canvas 对 left:-99999 元素捕获失败
  host.style.cssText = "position:fixed;top:0;left:0;width:800px;background:#fff;z-index:-1;opacity:0.01;pointer-events:none;";
  if (scope === "jd") {
    host.innerHTML = buildJdReportHtml(state);
  } else {
    host.innerHTML = buildFullReportHtml(state);
  }
  document.body.appendChild(host);

  // 等待渲染
  await new Promise((r) => setTimeout(r, 50));

  toast("正在生成报告 PDF…", "info", 8000);
  try {
    await exportElementToPdf(host, {
      filename: scope === "jd" ? `jd-analysis-${Date.now()}.pdf` : `full-report-${Date.now()}.pdf`,
      format: "a4",
      scale: 2,
    });
    toast("报告 PDF 已下载", "success");
  } catch (e) {
    console.error(e);
    toast("导出失败：" + e.message, "error");
  } finally {
    document.body.removeChild(host);
  }
}

function buildJdReportHtml(state) {
  const { input, jdAnalysis } = state;
  return `
    <div style="font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;font-size:12px;color:#333;line-height:1.6;padding:24px;">
      <h1 style="font-size:20px;color:#5B6CFF;margin-bottom:4px;">JD 解析报告</h1>
      <p style="color:#999;font-size:11px;margin-bottom:20px;">
        目标岗位：${esc(input?.target || "-")} ｜ ${esc(input?.companyScale || "-")} ｜ ${esc(input?.careerStage || "-")}
        <br>生成时间：${new Date().toLocaleString("zh-CN")}
      </p>

      <h2 style="font-size:15px;color:#111;border-bottom:2px solid #5B6CFF;padding-bottom:6px;margin:20px 0 10px;">岗位职责</h2>
      <ul>${(jdAnalysis?.responsibilities || []).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>

      <h2 style="font-size:15px;color:#111;border-bottom:2px solid #5B6CFF;padding-bottom:6px;margin:20px 0 10px;">硬性要求</h2>
      <ul>${(jdAnalysis?.hardRequirements || []).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>

      <h2 style="font-size:15px;color:#111;border-bottom:2px solid #5B6CFF;padding-bottom:6px;margin:20px 0 10px;">隐性要求</h2>
      <ul>${(jdAnalysis?.hiddenRequirements || []).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>

      <h2 style="font-size:15px;color:#111;border-bottom:2px solid #5B6CFF;padding-bottom:6px;margin:20px 0 10px;">关键词</h2>
      <p>${(jdAnalysis?.keywords || []).map(esc).join("、")}</p>

      <h2 style="font-size:15px;color:#111;border-bottom:2px solid #5B6CFF;padding-bottom:6px;margin:20px 0 10px;">理想候选人画像</h2>
      <p>${esc(jdAnalysis?.candidateProfile || "")}</p>

      <h2 style="font-size:15px;color:#111;border-bottom:2px solid #5B6CFF;padding-bottom:6px;margin:20px 0 10px;">核心能力评估</h2>
      <table style="width:100%;border-collapse:collapse;margin:8px 0;">
        ${(jdAnalysis?.coreCompetencies || []).map((c) => `
          <tr>
            <td style="border:1px solid #eee;padding:6px 8px;width:25%;"><b>${esc(c.name)}</b></td>
            <td style="border:1px solid #eee;padding:6px 8px;width:12%;">${esc(c.importance)}</td>
            <td style="border:1px solid #eee;padding:6px 8px;">${esc(c.description)}</td>
          </tr>
        `).join("")}
      </table>

      <p style="margin-top:30px;color:#bbb;font-size:10px;text-align:center;">— 由 简历专家 · JD 定制简历优化 Agent 生成 —</p>
    </div>
  `;
}

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
