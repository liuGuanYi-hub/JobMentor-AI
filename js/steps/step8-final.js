// steps/step8-final.js — Step 8 最终简历 · 模板选择 + 预览 + 导出

import { store } from "../store.js";
import { toast } from "../ui/toast.js";
import { exportElementToPdf, buildFullReportHtml } from "../export/pdf.js";
import { exportResumeToDocx } from "../export/docx.js";

const TEMPLATES = [
  { key: "modern", name: "简约现代卡片", recommended: false },
  { key: "timeline", name: "时间轴模板", recommended: true },
  { key: "classic", name: "经典 header", recommended: false },
  { key: "doublecol", name: "双栏卡片版", recommended: false },
  { key: "comprehensive", name: "经典综合稿件", recommended: false },
  { key: "github", name: "GitHub 综合代", recommended: false },
  { key: "ai", name: "AI 工具稿件模板", recommended: false },
];

const COLORS = [
  "#5B6CFF", "#8E6BFF", "#22C55E", "#F59E0B", "#EF4444",
];

export async function renderStep8(container) {
  const config = store.get("resumeConfig") || { template: "timeline", color: "#5B6CFF" };
  const input = store.get("input");
  const optimize = store.get("optimize");
  const jdAnalysis = store.get("jdAnalysis");
  const diagnose = store.get("diagnose");

  container.innerHTML = `
    <div class="step-page-header">
      <div>
        <h1 class="step-page-title">最终简历的导出与对比</h1>
        <p class="step-page-desc">支持 5 套简历模板，AI 帮你选择布局和排版、支持 PDF / Word 简码排版和导出…一键导出 Word / PDF 文件</p>
      </div>
    </div>

    <div class="template-tabs">
      <button class="template-tab active" data-tab="resume">增强简历</button>
      <button class="template-tab" data-tab="compare">面试对照</button>
      <button class="template-tab" data-tab="tech">技术词汇</button>
    </div>

    <!-- 模板画廊 -->
    <div class="section-card">
      <div class="card-title">选择简历模板</div>
      <p class="text-muted" style="font-size:12px;">实时预览样式 渲染 · 简历图形差异可见</p>
      <div class="template-gallery">
        ${TEMPLATES.map(t => `
          <div class="template-card ${t.key === config.template ? "active" : ""}" data-template="${t.key}">
            <div class="template-card-img">
              ${t.recommended ? `<span class="rec-badge">推荐</span>` : ""}
              <div class="thumb-decor thumb-${t.key === "github" ? "github" : t.key === "ai" ? "ai" : t.key === "timeline" ? "timeline" : t.key === "classic" ? "classic" : t.key === "doublecol" ? "doublecol" : t.key === "comprehensive" ? "comprehensive" : "modern"}">
                ${thumbInner(t.key)}
              </div>
            </div>
            <div class="template-card-name">${t.name}</div>
          </div>
        `).join("")}
      </div>
    </div>

    <!-- 风格配置 -->
    <div class="style-config">
      <div class="card-title" style="margin-bottom:var(--gap-3);">可定制排版与风格配置</div>
      <div class="config-row">
        <span class="label">主题色</span>
        <div class="color-swatches" id="colorSwatches">
          ${COLORS.map((c, i) => `
            <div class="color-swatch ${c === config.color ? "active" : ""}" style="background:${c};" data-color="${c}"></div>
          `).join("")}
        </div>
      </div>
      <div class="config-row">
        <span class="label">照片个人信息/名言用</span>
        <label class="switch">
          <input type="checkbox" id="showAvatar" ${config.showAvatar ? "checked" : ""}>
          <span class="slider"></span>
        </label>
        <label class="upload-mini" id="avatarUpload2" style="margin-left:auto;">
          <span class="upload-mini-icon"><i data-lucide="image" width="18"></i></span>
          <span>上传照片</span>
          <input type="file" accept="image/*" hidden>
        </label>
      </div>
    </div>

    <!-- 个性化备注 -->
    <div class="card">
      <div class="card-title">个性化备注</div>
      <textarea class="textarea" id="resumeNote" placeholder="一个让人一眼记住你的句子…" style="min-height:60px;">${config.note ? esc(config.note) : ""}</textarea>
    </div>

    <!-- 当前模板详情 + 导出 -->
    <div class="card">
      <div class="card-title">当前模板详情预览</div>
      <div class="flex gap-2 mb-3">
        <button class="ghost-btn" id="copyText">复制精简简历文本</button>
        <button class="ghost-btn" id="exportWord">导出 Word 文档</button>
        <button class="ghost-btn" id="exportPdf">导出 PDF 文档</button>
      </div>

      <div id="resumePreview" class="resume-preview template-${config.template}">
        ${buildPreviewHTML(config, input, optimize, jdAnalysis)}
      </div>
    </div>

    <!-- 完整简历分析 -->
    <div class="section-card">
      <div class="card-title">完整简历分析诊断问题导出</div>
      <p class="text-muted" style="font-size:12px;">您所选的简历以 AI 智能诊断为基础，下列内容可下载为 PDF 版本。</p>
      <div class="grid grid-cols-3 gap-3" style="display:grid;grid-template-columns:repeat(3, 1fr);gap:var(--gap-3);margin-top:var(--gap-3);">
        <div class="card text-center">
          <div class="text-muted" style="font-size:11px;">匹配综合得分</div>
          <div style="font-size:32px;font-weight:700;color:var(--primary);font-variant-numeric:tabular-nums;">${diagnose?.overall || 0}<span style="font-size:14px;color:var(--text-3);"> / 100</span></div>
        </div>
        <div class="card text-center">
          <div class="text-muted" style="font-size:11px;">人工模拟优化</div>
          <div style="font-size:32px;font-weight:700;color:var(--text-1);">${optimize ? "已优化" : "未优化"}</div>
        </div>
        <div class="card text-center">
          <div class="text-muted" style="font-size:11px;">简历内容质量</div>
          <div style="font-size:32px;font-weight:700;color:var(--success);">A+</div>
        </div>
      </div>
    </div>

    <!-- 底部导出栏 -->
    <div class="export-bar">
      <div>
        <div style="font-size:13px;font-weight:500;">导出您的最终简历</div>
        <div class="text-muted" style="font-size:11px;">建议先在 Word 中二次校样，再导出 PDF 投递</div>
      </div>
      <div class="export-actions">
        <button class="primary-btn" id="finalExportPdf">
          <i data-lucide="download" width="14"></i>
          <span>导出近期删减 PDF（8K+MAU 模式 + 副本 + 配电设置）</span>
        </button>
        <button class="ghost-btn" id="exportWord2">(可选) Word 排版 PDF</button>
        <button class="ghost-btn" id="exportPrint">(可选) 独立打印 PDF</button>
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
  bindEvents(container, config);
}

function thumbInner(key) {
  switch (key) {
    case "modern":
      return `<div class="t-header"><div class="t-avatar"></div><div class="t-info"><div class="t-line medium"></div><div class="t-line short"></div></div></div>
              <div class="t-line shorter"></div><div class="t-line"></div>
              <div class="t-block"></div><div class="t-block"></div>`;
    case "timeline":
      return `<div class="t-header"><div class="t-line short"></div></div>
              <div class="t-tl-item"><div class="t-tl-dot"></div><div class="t-tl-content"></div></div>
              <div class="t-tl-item"><div class="t-tl-dot"></div><div class="t-tl-content"></div></div>
              <div class="t-tl-item"><div class="t-tl-dot"></div><div class="t-tl-content"></div></div>
              <div class="t-tl-item"><div class="t-tl-dot"></div><div class="t-tl-content"></div></div>`;
    case "classic":
      return `<div class="t-header">NAME</div>
              <div class="t-line shorter" style="margin-bottom:6px;"></div>
              <div class="t-section"></div>
              <div class="t-section"></div>`;
    case "doublecol":
      return `<div class="t-line medium" style="margin-bottom:6px;"></div>
              <div class="t-cols">
                <div class="t-col" style="height:60px;"></div>
                <div class="t-col" style="height:60px;"></div>
              </div>
              <div class="t-line"></div>`;
    case "comprehensive":
      return `<div class="t-line medium" style="margin-bottom:6px;"></div>
              <div class="t-row"><div class="t-block2"></div><div class="t-block2"></div></div>
              <div class="t-row"><div class="t-block2"></div><div class="t-block2"></div></div>`;
    case "github":
      return `<div class="t-header">README.md</div>
              <div class="t-code-line"></div>
              <div class="t-code-line green"></div>
              <div class="t-code-line purple"></div>
              <div class="t-code-line"></div>
              <div class="t-code-line"></div>
              <div class="t-code-line green"></div>`;
    case "ai":
      return `<div class="t-ai-head">
                <span class="t-ai-tag">AI</span>
                <span class="t-ai-tag">LLM</span>
              </div>
              <div class="t-line short"></div>
              <div class="t-line medium"></div>
              <div class="t-block"></div>`;
    default:
      return "";
  }
}

function buildPreviewHTML(config, input, optimize, jdAnalysis) {
  const color = config.color || "#5B6CFF";
  const selectedBullets = collectBullets(optimize);
  const note = config.note || "";
  const showAvatar = !!config.showAvatar;
  const input_avatar = input.avatar;

  return `
    <div class="preview-header" ${config.template === "classic" ? `style="background:${color};"` : ""}>
      <div class="preview-name">曾子丹</div>
      <div class="preview-contact">
        <span>📞 13800138000</span>
        <span>✉️ zengzidan@example.com</span>
        <span>📍 ${input?.target || ""}</span>
        <span>🎓 2027 届软件工程本科 · 专业前 5%</span>
      </div>
      ${note ? `<div class="text-muted mt-3" style="font-style:italic;">${esc(note)}</div>` : ""}
      ${showAvatar && input_avatar ? `<img src="${input_avatar}" style="width:80px;height:80px;border-radius:50%;float:right;margin-top:-60px;" />` : ""}
    </div>

    <div class="preview-section" style="--accent-color:${color};">
      <div class="preview-section-title">核心能力</div>
      <div class="preview-skills">
        ${(jdAnalysis?.coreCompetencies || []).map(c => `<span class="preview-skill" style="background:${color}15;color:${color};">${esc(c.name)}</span>`).join("")}
        <span class="preview-skill" style="background:${color}15;color:${color};">Android · Kotlin · Jetpack Compose</span>
        <span class="preview-skill" style="background:${color}15;color:${color};">MVVM · Repository · Room</span>
      </div>
    </div>

    <div class="preview-section">
      <div class="preview-section-title">工作 / 实习经历</div>
      ${(selectedBullets.work || []).map(w => `
        <div class="timeline-item">
          <div style="font-weight:600;color:var(--text-1);">${esc(w.company)} · <span style="color:var(--text-3);">${esc(w.role)}</span></div>
          <div class="preview-timeline-period">${esc(w.period)}</div>
          <ul class="preview-bullet-list">
            ${(w.bullets || []).map(b => `<li class="preview-bullet">${esc(b)}</li>`).join("")}
          </ul>
        </div>
      `).join("")}
    </div>

    <div class="preview-section">
      <div class="preview-section-title">项目经历</div>
      ${(selectedBullets.projects || []).map(p => `
        <div class="timeline-item">
          <div style="font-weight:600;color:var(--text-1);">${esc(p.name)} · <span style="color:var(--text-3);">${esc(p.role)}</span></div>
          <div class="preview-timeline-period">${esc(p.period)}</div>
          <ul class="preview-bullet-list">
            ${(p.bullets || []).map(b => `<li class="preview-bullet">${esc(b)}</li>`).join("")}
          </ul>
        </div>
      `).join("")}
    </div>

    <div class="preview-section">
      <div class="preview-section-title">技能工具</div>
      <div class="preview-skills">
        <span class="preview-skill" style="background:${color}15;color:${color};">Kotlin</span>
        <span class="preview-skill" style="background:${color}15;color:${color};">Jetpack Compose</span>
        <span class="preview-skill" style="background:${color}15;color:${color};">MVVM</span>
        <span class="preview-skill" style="background:${color}15;color:${color};">Coroutines</span>
        <span class="preview-skill" style="background:${color}15;color:${color};">Flow</span>
        <span class="preview-skill" style="background:${color}15;color:${color};">Retrofit</span>
        <span class="preview-skill" style="background:${color}15;color:${color};">Room</span>
        <span class="preview-skill" style="background:${color}15;color:${color};">Git</span>
      </div>
    </div>
  `;
}

function collectBullets(optimize) {
  if (!optimize || !optimize.sections) {
    return {
      work: [
        { company: "广东中科院信息工程研究所", role: "后端工程师实习生", period: "2026.04 - 2026.07", bullets: [
          "参与数据聚合服务的开发与维护，涉及 Spark SQL / Flink",
          "使用 Go 重建 ETL 流水线，吞吐提升约 30%",
        ]},
      ],
      projects: [
        { name: "SilverLink · 独立社区患者服务系统 + Android 客户端研发", role: "Android 客户端", period: "2024.10 - 2026.06", bullets: [
          "基于 Jetpack Compose 独立完成 Android 客户端核心模块",
          "设计 Repository 分层与离线数据降级机制，缓存回收无破坏性",
          "优化健康监测时序查询，加载耗时从 1.2s 降至 0.4s",
        ]},
        { name: "辅助智能小组原型 Agent · AI 应用开发", role: "AI 应用", period: "2026.02", bullets: [
          "基于 LangChain + WebClient 集成多 Agent，调度策略可热更新",
          "构建数据驱动评估体系，识别召回/精确率提升 12pt",
        ]},
      ],
    };
  }

  const result = { work: [], projects: [] };
  optimize.sections.forEach(sec => {
    const items = (sec.items || []).map(it => it[it.selectedVariant || "authentic"] || it.authentic || it.original || "").filter(Boolean);
    if (sec.type === "workExperience") {
      result.work.push({ company: sec.title || "实习", role: "", period: sec.period || "", bullets: items });
    } else if (sec.type === "projectExperience") {
      result.projects.push({ name: sec.title || "项目", role: "", period: sec.period || "", bullets: items });
    }
  });
  return result;
}

function bindEvents(container, config) {
  // 模板选择
  container.querySelectorAll(".template-card").forEach(card => {
    card.addEventListener("click", () => {
      const tpl = card.getAttribute("data-template");
      store.set({ resumeConfig: { template: tpl } });
      rerenderPreview(container);
    });
  });

  // 颜色选择
  container.querySelectorAll(".color-swatch").forEach(sw => {
    sw.addEventListener("click", () => {
      const c = sw.getAttribute("data-color");
      store.set({ resumeConfig: { color: c } });
      container.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
      sw.classList.add("active");
      rerenderPreview(container);
    });
  });

  // 头像开关
  const showAvatar = container.querySelector("#showAvatar");
  showAvatar?.addEventListener("change", () => {
    store.set({ resumeConfig: { showAvatar: showAvatar.checked } });
    rerenderPreview(container);
  });

  // 上传照片
  container.querySelector("#avatarUpload2 input")?.addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      store.set({ input: { avatar: reader.result } });
      toast("头像已上传", "success");
      rerenderPreview(container);
    };
    reader.readAsDataURL(f);
  });

  // 备注
  container.querySelector("#resumeNote")?.addEventListener("input", (e) => {
    store.set({ resumeConfig: { note: e.target.value } });
  });

  // tabs
  container.querySelectorAll(".template-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      container.querySelectorAll(".template-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      toast(`「${tab.textContent}」视图开发中…`, "info");
    });
  });

  // 导出按钮
  container.querySelector("#copyText")?.addEventListener("click", copyTextToClipboard);
  container.querySelector("#exportWord")?.addEventListener("click", exportToWord);
  container.querySelector("#exportPdf")?.addEventListener("click", exportToPdf);
  container.querySelector("#finalExportPdf")?.addEventListener("click", exportToPdf);
  container.querySelector("#exportWord2")?.addEventListener("click", exportToWord);
  container.querySelector("#exportPrint")?.addEventListener("click", () => window.print());

  // 标记完成
  store.markStepDone(8);

  function rerenderPreview(c) {
    const cur = store.get("resumeConfig");
    const input = store.get("input");
    const optimize = store.get("optimize");
    const jdAnalysis = store.get("jdAnalysis");
    const previewEl = c.querySelector("#resumePreview");
    if (previewEl) {
      previewEl.className = `resume-preview template-${cur.template}`;
      previewEl.innerHTML = buildPreviewHTML(cur, input, optimize, jdAnalysis);
    }
  }
}

async function copyTextToClipboard() {
  const previewEl = document.getElementById("resumePreview");
  if (!previewEl) return;
  const text = previewEl.innerText;
  try {
    await navigator.clipboard.writeText(text);
    toast("简历文本已复制到剪贴板", "success");
  } catch (e) {
    toast("复制失败：" + e.message, "error");
  }
}

async function exportToPdf() {
  const previewEl = document.getElementById("resumePreview");
  if (!previewEl) return;
  toast("正在生成 PDF…", "info", 5000);
  try {
    await exportElementToPdf(previewEl, {
      filename: `resume-${Date.now()}.pdf`,
      format: "a4",
      scale: 2,
    });
    toast("PDF 已下载", "success");
  } catch (e) {
    console.error(e);
    toast("PDF 导出失败：" + e.message, "error");
  }
}

async function exportToWord() {
  const previewEl = document.getElementById("resumePreview");
  if (!previewEl) return;
  try {
    const resume = buildResumeObjectFromPreview(previewEl);
    await exportResumeToDocx(resume, `resume-${Date.now()}.docx`);
    toast("Word 文档已下载", "success");
  } catch (e) {
    console.error(e);
    toast("Word 导出失败：" + e.message, "error");
  }
}

// 从预览 DOM 提取结构化简历（供 Word 导出）
function buildResumeObjectFromPreview(previewEl) {
  const resume = {
    basics: {
      name: previewEl.querySelector(".preview-name")?.textContent?.trim() || "我的简历",
    },
    competencies: [],
    workExperience: [],
    projects: [],
    skills: [],
  };
  const contactEl = previewEl.querySelector(".preview-contact");
  if (contactEl) {
    const parts = contactEl.textContent.split("📍").map((s) => s.trim());
    // 解析 📞 ✉️ 等
    const phone = contactEl.textContent.match(/📞\s*([^\s✉]+)/);
    const email = contactEl.textContent.match(/✉️\s*([^\s📍]+)/);
    const loc = contactEl.textContent.match(/📍\s*([^\s🎓]+)/);
    if (phone) resume.basics.phone = phone[1];
    if (email) resume.basics.email = email[1];
    if (loc) resume.basics.location = loc[1];
  }

  previewEl.querySelectorAll(".preview-section").forEach((sec) => {
    const title = sec.querySelector(".preview-section-title")?.textContent?.trim() || "";
    if (title.includes("核心能力")) {
      sec.querySelectorAll(".preview-skill").forEach((s) => resume.competencies.push(s.textContent.trim()));
    } else if (title.includes("工作") || title.includes("实习")) {
      const item = parseExperienceBlock(sec);
      if (item) resume.workExperience.push(item);
    } else if (title.includes("项目")) {
      const item = parseExperienceBlock(sec);
      if (item) resume.projects.push(item);
    } else if (title.includes("技能")) {
      sec.querySelectorAll(".preview-skill").forEach((s) => resume.skills.push(s.textContent.trim()));
    }
  });
  return resume;
}

function parseExperienceBlock(sec) {
  const head = sec.querySelector(".timeline-item > div, div[style*='font-weight:600']");
  const periodEl = sec.querySelector(".preview-timeline-period, .timeline-period");
  const item = {
    name: head?.textContent?.split("·")[0]?.trim() || "",
    role: head?.textContent?.split("·")[1]?.trim() || "",
    period: periodEl?.textContent?.trim() || "",
    bullets: [],
  };
  sec.querySelectorAll(".preview-bullet").forEach((b) => item.bullets.push(b.textContent.trim()));
  return item;
}

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
