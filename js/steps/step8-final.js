// steps/step8-final.js — Step 8 最终简历 · 模板选择 + 预览 + 导出

import { store } from "../store.js";
import { toast } from "../ui/toast.js";
import { showModal, closeModal, confirm } from "../ui/modal.js";
import { exportElementToPdf, buildFullReportHtml } from "../export/pdf.js";
import { exportResumeToDocx } from "../export/docx.js";

const TEMPLATES = [
  { key: "modern", name: "简约现代卡片", description: "清晰留白，适合校招与实习", recommended: false },
  { key: "timeline", name: "时间轴模板", description: "突出成长路径与项目节奏", recommended: true },
  { key: "classic", name: "经典 Header", description: "正式稳重，适合传统岗位", recommended: false },
  { key: "doublecol", name: "双栏卡片版", description: "侧栏承载技能，正文更紧凑", recommended: false },
  { key: "comprehensive", name: "经典综合稿件", description: "信息密度高，适合完整履历", recommended: false },
  { key: "github", name: "GitHub 综合版", description: "技术感强，适合开发岗位", recommended: false },
  { key: "ai", name: "AI 工具稿件", description: "突出 AI 项目与技术栈", recommended: false },
];

const COLORS = [
  "#5B6CFF", "#8E6BFF", "#22C55E", "#F59E0B", "#EF4444",
];

function getTemplate(key) {
  return TEMPLATES.find((template) => template.key === key) || TEMPLATES[0];
}

export async function renderStep8(container) {
  const config = {
    template: "timeline",
    color: "#5B6CFF",
    showAvatar: false,
    note: "",
    ...(store.get("resumeConfig") || {}),
  };
  const input = store.get("input");
  const optimize = store.get("optimize");
  const jdAnalysis = store.get("jdAnalysis");
  const diagnose = store.get("diagnose");
  const interview = store.get("interview");
  const previewData = collectBullets(optimize, input);
  const previewDensityClass = getPreviewDensityClass(previewData);

  container.innerHTML = `
    <div class="step-page-header final-page-header">
      <div>
        <h1 class="step-page-title">最终简历的导出与对比</h1>
        <p class="step-page-desc">支持 7 套简历模板。完整经历与 AI 优化结果都会保留，内容较多时自动分页为 2 张 A4。</p>
      </div>
      <div class="final-page-status"><span class="status-dot"></span>分析已完成 · 8/8</div>
    </div>

    <div class="template-tabs">
      <button class="template-tab active" data-tab="resume">增强简历</button>
      <button class="template-tab" data-tab="versions">版本管理</button>
      <button class="template-tab" data-tab="compare">面试对照</button>
      <button class="template-tab" data-tab="tech">技术词汇</button>
    </div>

    <!-- 版本管理面板 -->
    <div class="section-card hidden" id="versionPanel">
      <div class="card-title" style="display:flex;align-items:center;justify-content:space-between;">
        <span>简历版本管理</span>
        <button class="ghost-btn" id="newVersionBtn">
          <i data-lucide="copy-plus" width="14"></i>
          <span>快照当前版本</span>
        </button>
      </div>
      <p class="text-muted" style="font-size:12px;">为同一份简历保存多个定制版本（如不同岗位方向），可切换预览、并排对比。</p>
      <div class="version-list" id="versionList"></div>
      <div class="version-compare" id="versionCompare"></div>
    </div>

    <div class="section-card final-tab-panel hidden" id="comparePanel">
      <div class="card-title">面试对照</div>
      <p class="text-muted" style="font-size:12px;">把最终简历中的重点经历与面试准备结果放在一起，方便导出前快速复核。</p>
      <div class="final-tab-grid">
        <div class="final-tab-block">
          <div class="final-tab-block-title">自我介绍</div>
          <p>${esc(interview?.selfIntro || previewData.summary || "暂无面试准备结果")}</p>
        </div>
        <div class="final-tab-block">
          <div class="final-tab-block-title">重点追问</div>
          <ul class="final-tab-list">
            ${(interview?.behaviorQuestions || []).slice(0, 3).map((question) => `<li>${esc(typeof question === "string" ? question : question.question)}</li>`).join("") || "<li>暂无行为面试问题</li>"}
            ${(interview?.techQuestions || []).slice(0, 3).map((question) => `<li>${esc(typeof question === "string" ? question : question.question)}</li>`).join("")}
          </ul>
        </div>
      </div>
      <a class="ghost-btn final-tab-link" href="#/step/7">查看完整面试准备 →</a>
    </div>

    <div class="section-card final-tab-panel hidden" id="techPanel">
      <div class="card-title">技术词汇</div>
      <p class="text-muted" style="font-size:12px;">来自 JD 与简历优化结果的关键词，可在导出前检查是否覆盖目标岗位要求。</p>
      <div class="tech-vocabulary-group">
        <div class="final-tab-block-title">JD 关键词</div>
        <div class="tech-vocabulary-list">
          ${(jdAnalysis?.keywords || []).map((keyword) => `<span class="preview-skill">${esc(keyword)}</span>`).join("") || "<span class=\"text-muted\">暂无 JD 关键词</span>"}
        </div>
      </div>
      <div class="tech-vocabulary-group">
        <div class="final-tab-block-title">简历技术栈</div>
        <div class="tech-vocabulary-list">
          ${(previewData.skills || []).map((skill) => `<span class="preview-skill">${esc(skill)}</span>`).join("")}
        </div>
      </div>
    </div>

    <!-- 模板画廊 -->
    <div class="section-card template-section">
      <div class="template-section-heading">
        <div>
          <div class="card-title">选择简历模板</div>
          <p class="text-muted" style="font-size:12px;">点击模板即可切换预览，导出的 PDF 会保持当前版式。</p>
        </div>
        <div class="template-current" id="activeTemplateLabel">当前：${esc(getTemplate(config.template).name)}</div>
      </div>
      <div class="template-gallery">
        ${TEMPLATES.map(t => `
          <button type="button" class="template-card ${t.key === config.template ? "active" : ""}" data-template="${t.key}" aria-pressed="${t.key === config.template}">
            <div class="template-card-img">
              ${t.recommended ? `<span class="rec-badge">推荐</span>` : ""}
              <span class="template-card-check">${t.key === config.template ? "当前选择" : ""}</span>
              <div class="thumb-decor thumb-${t.key === "github" ? "github" : t.key === "ai" ? "ai" : t.key === "timeline" ? "timeline" : t.key === "classic" ? "classic" : t.key === "doublecol" ? "doublecol" : t.key === "comprehensive" ? "comprehensive" : "modern"}">
                ${thumbInner(t.key)}
              </div>
            </div>
            <span class="template-card-name">${t.name}</span>
            <span class="template-card-desc">${t.description}</span>
          </button>
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

      <div id="resumePreview" class="resume-preview template-${config.template}${previewDensityClass}">
        ${buildPreviewHTML(config, input, optimize, jdAnalysis)}
      </div>
    </div>

    <!-- 完整简历分析 -->
    <div class="section-card">
      <div class="card-title">分析摘要</div>
      <p class="text-muted" style="font-size:12px;">这里汇总本次分析结果；如需投递，请导出上方的当前简历预览。</p>
      <div class="grid grid-cols-3 gap-3" style="display:grid;grid-template-columns:repeat(3, 1fr);gap:var(--gap-3);margin-top:var(--gap-3);">
        <div class="card text-center">
          <div class="text-muted" style="font-size:11px;">匹配综合得分</div>
          <div style="font-size:32px;font-weight:700;color:var(--primary);font-variant-numeric:tabular-nums;">${diagnose?.overall || 0}<span style="font-size:14px;color:var(--text-3);"> / 100</span></div>
        </div>
        <div class="card text-center">
          <div class="text-muted" style="font-size:11px;">简历优化状态</div>
          <div style="font-size:32px;font-weight:700;color:var(--text-1);">${optimize ? "已生成" : "待生成"}</div>
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
        <div class="export-eyebrow">EXPORT STUDIO</div>
        <div style="font-size:13px;font-weight:600;">导出当前模板</div>
        <div class="text-muted" style="font-size:11px;">当前：<span id="exportTemplateLabel">${esc(getTemplate(config.template).name)}</span> · Word 可编辑，PDF 适合投递</div>
      </div>
      <div class="export-actions">
        <button class="primary-btn" id="finalExportPdf">
          <i data-lucide="download" width="14"></i>
          <span>导出 PDF</span>
        </button>
        <button class="ghost-btn" id="exportWord2">导出 Word</button>
        <button class="ghost-btn" id="exportPrint">打印 / 另存为 PDF</button>
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
  bindEvents(container, config);
}

function thumbInner(key) {
  // 共享微缩简历内容（姓名/职位/联系方式/章节标题/章节内容/技能标签）
  const nameRow = `<div class="t-name">王小明</div><div class="t-title">Android 客户端</div>`;
  const contact = `<div class="t-contact"><span>📞</span><span>✉</span><span>📍</span></div>`;
  const sec = (title) => `<div class="t-sec">${title}</div>`;
  const bullet = (cls = "") => `<div class="t-bullet ${cls}"></div>`;
  const skills = `<div class="t-skills"><span class="t-tag">Kotlin</span><span class="t-tag">Compose</span><span class="t-tag">MVVM</span></div>`;

  switch (key) {
    case "modern":
      return `${nameRow}
              <div class="t-thin-line"></div>
              ${contact}
              ${sec("核心能力")}
              ${skills}
              ${sec("项目经验")}
              ${bullet()}${bullet()}${bullet()}`;
    case "timeline":
      return `<div class="t-name">王小明</div><div class="t-thin-line mx"></div>
              ${sec("项目经验")}
              <div class="t-tl"><div class="t-dot"></div><div class="t-tl-body"><div class="t-tl-name">健康管理 App</div><div class="t-bullet"></div><div class="t-bullet"></div></div></div>
              <div class="t-tl"><div class="t-dot"></div><div class="t-tl-body"><div class="t-tl-name">校园服务 Agent</div><div class="t-bullet"></div></div></div>`;
    case "classic":
      return `<div class="t-header">王小明</div>
              <div class="t-header-sub">ANDROID 客户端</div>
              ${sec("核心能力")}
              ${skills}
              ${sec("项目经验")}
              ${bullet()}${bullet()}${bullet()}`;
    case "doublecol":
      return `${nameRow}
              <div class="t-thin-line"></div>
              <div class="t-cols">
                <div class="t-col t-col-aside">
                  <div class="t-mini-sec">技能</div>
                  ${skills}
                </div>
                <div class="t-col t-col-main">
                  ${sec("项目")}
                  ${bullet()}${bullet()}
                </div>
              </div>`;
    case "comprehensive":
      return `${nameRow}
              ${contact}
              <div class="t-title-bar">项目经验</div>
              <div class="t-card">
                <div class="t-card-name">健康管理 App</div>
                ${bullet()}${bullet()}${bullet()}
              </div>
              <div class="t-title-bar">技能工具</div>
              ${skills}`;
    case "github":
      return `<div class="t-header">README.md</div>
              <div class="t-gh-name"># 王小明</div>
              <div class="t-gh-h2">## 核心能力</div>
              <div class="t-gh-line">+ Kotlin</div>
              <div class="t-gh-line">+ Compose</div>
              <div class="t-gh-h2">## 项目</div>
              <div class="t-gh-line">+ 健康管理 App</div>`;
    case "ai":
      return `<div class="t-ai-head">
                <span class="t-ai-name">王小明</span>
                <span class="t-ai-tag">AI</span>
                <span class="t-ai-tag">LLM</span>
              </div>
              <div class="t-ai-title">Android · Agent · LLM</div>
              ${sec("项目经验")}
              <div class="t-ai-card">
                <div class="t-bullet"></div>
                <div class="t-bullet"></div>
              </div>`;
    default:
      return "";
  }
}

function buildPreviewHTML(config, input, optimize, jdAnalysis) {
  const color = config.color || "#5B6CFF";
  const selectedBullets = collectBullets(optimize, input);
  const profile = extractResumeProfile(input?.resumeText);
  const note = config.note || "";
  const showAvatar = !!config.showAvatar;
  const input_avatar = input.avatar;
  const tpl = config.template || "modern";
  const target = input?.target || "";

  // 联系信息结构化展示（不同模板可差异排版）
  const contactItems = [
    profile.phone ? { icon: "📞", label: profile.phone } : null,
    profile.email ? { icon: "✉️", label: profile.email } : null,
    target ? { icon: "📍", label: target } : null,
    profile.education ? { icon: "🎓", label: `${profile.education}${profile.educationDetail ? " · " + profile.educationDetail : ""}` } : null,
  ].filter(Boolean);

  // 技能分组渲染
  const coreSkills = (jdAnalysis?.coreCompetencies || []).map((c) => c.name);
  const allSkills = [...new Set([...coreSkills, ...(selectedBullets.skills || [])])].slice(0, 12);

  return `
    <div class="preview-header ${tpl === "classic" ? "preview-header-classic" : ""}" ${tpl === "classic" ? `style="background:${color};"` : ""}>
      ${showAvatar && input_avatar ? `<img class="preview-avatar-img" src="${input_avatar}" alt="头像" />` : ""}
      <div class="preview-name">${esc(profile.name || "王小明（示例）")}</div>
      ${target ? `<div class="preview-title">${esc(target)}</div>` : ""}
      <div class="preview-contact">
        ${contactItems.map((it) => `<span class="preview-contact-item"><i>${it.icon}</i>${esc(it.label)}</span>`).join("")}
      </div>
      ${note ? `<div class="preview-note">${esc(note)}</div>` : ""}
    </div>

    <div class="preview-body">
      <aside class="preview-aside">
    <div class="preview-section" style="--accent-color:${color};">
      <div class="preview-section-title">核心能力</div>
      <div class="preview-skills">
        ${allSkills.map((s) => `<span class="preview-skill" style="background:${color}15;color:${color};">${esc(s)}</span>`).join("")}
      </div>
    </div>

      </aside>
      <div class="preview-main">
    ${selectedBullets.summary ? `
    <div class="preview-section preview-summary">
      <div class="preview-section-title">个人简介</div>
      <p class="preview-summary-text">${esc(selectedBullets.summary)}</p>
    </div>
    ` : ""}
    <div class="preview-section preview-education">
      <div class="preview-section-title">教育背景</div>
      <div class="preview-education-row">
        <strong>${esc(profile.education || "软件工程本科")}</strong>
        <span>${esc(profile.educationDetail || "2027 届 · 专业前 5%")}</span>
      </div>
    </div>
    <div class="preview-section">
      <div class="preview-section-title">工作 / 实习经历</div>
      ${(selectedBullets.work || []).map(w => `
        <div class="timeline-item">
          <div class="timeline-item-head">
            <span class="timeline-item-title">${esc(w.company)}</span>
            ${w.role ? `<span class="timeline-item-role">${esc(w.role)}</span>` : ""}
            <span class="timeline-item-period">${esc(w.period)}</span>
          </div>
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
          <div class="timeline-item-head">
            <span class="timeline-item-title">${esc(p.name)}</span>
            ${p.role ? `<span class="timeline-item-role">${esc(p.role)}</span>` : ""}
            <span class="timeline-item-period">${esc(p.period)}</span>
          </div>
          <ul class="preview-bullet-list">
            ${(p.bullets || []).map(b => `<li class="preview-bullet">${esc(b)}</li>`).join("")}
          </ul>
        </div>
      `).join("")}
    </div>

    <div class="preview-section">
      <div class="preview-section-title">技能工具</div>
      <div class="preview-skills">
        ${(selectedBullets.skills || []).map((skill) => `<span class="preview-skill" style="background:${color}15;color:${color};">${esc(skill)}</span>`).join("")}
      </div>
    </div>
      </div>
    </div>
  `;
}

function collectBullets(optimize, input = {}) {
  const source = extractResumeProfile(input.resumeText);
  if (!optimize || !optimize.sections) {
    return mergeResumeContent({
      summary: "软件工程本科，具备移动端客户端与后端服务实践。熟悉 Kotlin、MVVM、Repository、本地缓存与网络请求框架，能够从需求拆解、页面与接口开发推进到联调、问题定位和测试验证。",
      work: [{ company: "某互联网科技公司", role: "后端工程师实习生", period: "2026.04 - 2026.07", bullets: [
        "参与数据服务的开发与维护，涉及 SQL 查询与数据管道",
        "使用 Java 重构数据处理流程，吞吐提升约 30%",
      ]}],
      projects: [{ name: "健康管理 App · 移动端客户端研发", role: "移动端客户端", period: "2024.10 - 2026.06", bullets: [
        "基于响应式 UI 独立完成客户端核心模块",
        "设计 Repository 分层与离线数据降级机制，缓存回收无破坏性",
        "优化数据查询，加载耗时从 1.2s 降至 0.4s",
      ]}, { name: "校园服务助手 Agent · AI 应用开发", role: "AI 应用", period: "2026.02", bullets: [
        "基于 Agent 框架集成多智能体，调度策略可热更新",
        "构建数据驱动评估体系，识别效果提升 12pt",
        "面向事务咨询、通知查询等场景，基于大语言模型与 Agent 框架搭建校园服务对话引擎，支持多轮对话与任务流程梳理",
        "将高频事务拆解为可调用技能，设计意图识别、上下文记忆和任务状态联动",
        "通过 Webhook/WebSocket 接入协同平台，设计事件触发链路，处理对话消息、流程节点和任务状态之间的联动",
      ]}],
      skills: ["Kotlin", "MVVM", "Coroutines", "Flow", "网络请求", "本地缓存", "Git"],
    }, source);
  }

  const result = { summary: "", work: [], projects: [], skills: [] };
  optimize.sections.forEach(sec => {
    const items = (sec.items || []).map(pickSelectedText).filter(Boolean);
    if (sec.type === "summary") {
      result.summary = items[0] || result.summary;
      return;
    }
    if (sec.type === "workExperience") {
      result.work.push({ company: sec.title || "实习", role: "", period: sec.period || "", bullets: items });
    } else if (sec.type === "projectExperience") {
      result.projects.push({ name: sec.title || "项目", role: "", period: sec.period || "", bullets: items });
    } else if (sec.type === "skillsAndTools") {
      result.skills.push(...items.flatMap((item) => item.split(/[/；;、|,:：,，]/).map((skill) => skill.replace(/^[-•·]\s*/, "").trim()).filter(Boolean)));
    }
  });
  if (!result.skills.length) {
    result.skills = ["Kotlin", "MVVM", "Coroutines", "Flow", "网络请求", "本地缓存", "Git"];
  }
  // 有 optimize 数据时不再合并 resumeText 提取的重复内容，避免双层渲染
  if (!result.summary && source.summary) result.summary = source.summary;
  return result;
}

function mergeResumeContent(result, source) {
  const merged = {
    summary: result.summary || source.summary || "",
    work: [...(result.work || [])],
    projects: [...(result.projects || [])],
    skills: [...(result.skills || [])],
  };
  for (const item of source.work || []) mergeExperience(merged.work, item);
  for (const item of source.projects || []) mergeExperience(merged.projects, item);
  const seenSkills = new Set();
  merged.skills = [...merged.skills, ...(source.skills || [])].map(cleanSkill).filter((skill) => {
    if (!skill || /^(后端|工具|技术栈)$/i.test(skill)) return false;
    const key = skill.toLowerCase();
    if (seenSkills.has(key)) return false;
    seenSkills.add(key);
    return true;
  });
  return merged;
}

function cleanSkill(skill = "") {
  return String(skill).replace(/^[-•·]\s*/, "").replace(/\s*[-–—]\s*(后端|工具)$/i, "").trim();
}

function mergeExperience(target, incoming) {
  const match = target.find((item) => {
    const left = `${item.name || item.company || ""}`;
    const right = `${incoming.name || incoming.company || ""}`;
    return (left && right && (left.includes(right) || right.includes(left))) ||
      (item.period && incoming.period && item.period === incoming.period);
  });
  if (!match) {
    target.push(incoming);
    return;
  }
  const existing = match.bullets || [];
  for (const bullet of incoming.bullets || []) {
    if (!existing.some((current) => isEquivalentBullet(current, bullet))) existing.push(bullet);
  }
  match.bullets = existing;
}

function isEquivalentBullet(left = "", right = "") {
  const tokenize = (value) => value.toLowerCase().match(/[a-z][a-z0-9+#./-]*|[\u4e00-\u9fff]{2,4}/g) || [];
  const a = new Set(tokenize(left));
  const b = new Set(tokenize(right));
  if (!a.size || !b.size) return left.trim() === right.trim();
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / Math.min(a.size, b.size) >= 0.28;
}

function extractResumeProfile(text = "") {
  const lines = String(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const profile = { name: lines[0] || "", phone: "", email: "", education: "", educationDetail: "", summary: "", work: [], projects: [], skills: [] };
  if (!lines.length) return profile;
  profile.phone = lines.find((line) => /(?:1[3-9]\d{9}|电话|手机)/.test(line))?.match(/1[3-9]\d{9}/)?.[0] || "";
  profile.email = lines.find((line) => /@/.test(line))?.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] || "";
  const educationLine = lines.find((line) => /本科|硕士|博士|专业前|届/.test(line));
  if (educationLine) {
    const parts = educationLine.split(/[|｜]/).map((part) => part.trim()).filter(Boolean);
    profile.education = parts[0] || "";
    profile.educationDetail = parts.slice(1).join(" · ");
  }
  const sections = { project: [], work: [], skills: [] };
  let current = "";
  for (const line of lines.slice(1)) {
    if (/项目经验|项目经历/.test(line)) { current = "project"; continue; }
    if (/实习经历|工作经历|工作经验/.test(line)) { current = "work"; continue; }
    if (/技能清单|技能工具|技术栈/.test(line)) { current = "skills"; continue; }
    if (/^【.*】$/.test(line)) { current = ""; continue; }
    if (current) sections[current].push(line);
  }
  profile.projects = parseExperienceLines(sections.project, "项目");
  profile.work = parseExperienceLines(sections.work, "实习");
  profile.skills = sections.skills.join(" ").split(/[/,，、;；|:：]/).map((skill) => skill.replace(/^[-•·]\s*/, "").trim()).filter((skill) => skill && !/^(后端|工具|技术栈)$/i.test(skill) && skill.length < 30);
  const intro = lines.slice(1).find((line) => !/^【|^[-•·]/.test(line) && !/时间[：:]/.test(line) && !/本科|专业前/.test(line));
  profile.summary = intro || "";
  return profile;
}

function parseExperienceLines(lines, fallbackRole) {
  const result = [];
  let current = null;
  for (const line of lines) {
    if (/^[-•·]/.test(line)) {
      if (current) current.bullets.push(line.replace(/^[-•·]\s*/, ""));
      continue;
    }
    const period = line.match(/时间[：:]\s*(.+)/);
    if (period && current) { current.period = period[1].trim(); continue; }
    if (line && !period) {
      current = { name: line, company: line, role: fallbackRole, period: "", bullets: [] };
      result.push(current);
    }
  }
  return result.filter((item) => item.bullets.length || item.period);
}

function pickSelectedText(item) {
  if (!item) return "";
  return item[item.selectedVariant || "authentic"] || item.authentic || item.jdAligned || item.lead || item.original || "";
}

function getPreviewDensityClass(previewData) {
  const bulletCount = (previewData.work || []).flatMap((item) => item.bullets || []).length +
    (previewData.projects || []).flatMap((item) => item.bullets || []).length;
  return bulletCount > 8 || (previewData.skills || []).length > 18 ? " resume-preview--multi" : "";
}

function bindEvents(container, config) {
  // 模板选择
  container.querySelectorAll(".template-card").forEach(card => {
    const selectTemplate = () => {
      const tpl = card.getAttribute("data-template");
      store.set({ resumeConfig: { template: tpl } });
      syncTemplateUi(container);
      rerenderPreview(container);
    };
    card.addEventListener("click", selectTemplate);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectTemplate();
      }
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
      const tabName = tab.getAttribute("data-tab");
      const panels = {
        versions: container.querySelector("#versionPanel"),
        compare: container.querySelector("#comparePanel"),
        tech: container.querySelector("#techPanel"),
      };
      Object.entries(panels).forEach(([name, panel]) => {
        panel?.classList.toggle("hidden", tabName !== name);
      });
      if (tabName === "versions") {
        renderVersionList(container);
      } else if (tabName !== "resume" && !["compare", "tech"].includes(tabName)) {
        toast(`「${tab.textContent}」视图开发中…`, "info");
      }
    });
  });

  // 版本管理
  container.querySelector("#newVersionBtn")?.addEventListener("click", () => {
    createVersion(container);
  });

  // 导出按钮
  container.querySelector("#copyText")?.addEventListener("click", copyTextToClipboard);
  container.querySelector("#exportWord")?.addEventListener("click", exportToWord);
  container.querySelector("#exportPdf")?.addEventListener("click", exportToPdf);
  container.querySelector("#finalExportPdf")?.addEventListener("click", exportToPdf);
  container.querySelector("#exportWord2")?.addEventListener("click", exportToWord);
  container.querySelector("#exportPrint")?.addEventListener("click", printResume);

  // 标记完成
  store.markStepDone(8);

  function rerenderPreview(c) {
    const cur = store.get("resumeConfig");
    const input = store.get("input");
    const optimize = store.get("optimize");
    const jdAnalysis = store.get("jdAnalysis");
    const previewEl = c.querySelector("#resumePreview");
    if (previewEl) {
      previewEl.className = `resume-preview template-${cur.template}${getPreviewDensityClass(collectBullets(optimize, input))}`;
      previewEl.innerHTML = buildPreviewHTML(cur, input, optimize, jdAnalysis);
    }
    syncTemplateUi(c);
  }

  function syncTemplateUi(c) {
    const current = store.get("resumeConfig") || {};
    const template = getTemplate(current.template);
    c.querySelectorAll(".template-card").forEach((card) => {
      const selected = card.getAttribute("data-template") === template.key;
      card.classList.toggle("active", selected);
      card.setAttribute("aria-pressed", String(selected));
      const check = card.querySelector(".template-card-check");
      if (check) check.textContent = selected ? "当前选择" : "";
    });
    const activeLabel = c.querySelector("#activeTemplateLabel");
    if (activeLabel) activeLabel.textContent = `当前：${template.name}`;
    const exportLabel = c.querySelector("#exportTemplateLabel");
    if (exportLabel) exportLabel.textContent = template.name;
  }

  // 渲染版本列表
  function renderVersionList(c) {
    const listEl = c.querySelector("#versionList");
    if (!listEl) return;
    const versions = store.resumeVersions;
    const currentId = store.currentVersionId;

    if (!versions.length) {
      listEl.innerHTML = `
        <div style="padding:20px;text-align:center;color:var(--text-3);font-size:12px;">
          暂无版本，点击上方「快照当前版本」保存第一个版本
        </div>
      `;
      renderVersionCompare(c, []);
      return;
    }

    listEl.innerHTML = versions.map(v => `
      <div class="version-item ${v.id === currentId ? "active" : ""}" data-version="${v.id}">
        <div class="version-item-info">
          <div class="version-item-name">${esc(v.name)}</div>
          <div class="version-item-meta">${formatTime(v.createdAt)} · ${v.snapshot?.optimizeSelected?.length || 0} 个区块</div>
        </div>
        <div class="version-item-actions">
          <button class="version-item-action" data-action="compare" title="对比">
            <i data-lucide="columns-2" width="13"></i>
          </button>
          <button class="version-item-action" data-action="rename" title="重命名">
            <i data-lucide="pencil" width="13"></i>
          </button>
          <button class="version-item-action danger" data-action="delete" title="删除">
            <i data-lucide="trash-2" width="13"></i>
          </button>
        </div>
      </div>
    `).join("");
    if (window.lucide) window.lucide.createIcons();

    // 绑定
    listEl.querySelectorAll(".version-item").forEach(item => {
      const vid = item.getAttribute("data-version");
      item.addEventListener("click", (e) => {
        if (e.target.closest("[data-action]")) return;
        applyVersion(vid, c);
      });
      item.querySelector('[data-action="compare"]')?.addEventListener("click", (e) => {
        e.stopPropagation();
        renderVersionCompare(c, versions);
      });
      item.querySelector('[data-action="rename"]')?.addEventListener("click", (e) => {
        e.stopPropagation();
        renameVersion(vid, c);
      });
      item.querySelector('[data-action="delete"]')?.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteVersion(vid, c);
      });
    });

    // 默认对比当前与最新
    if (versions.length >= 1) renderVersionCompare(c, versions);
  }

  // 应用版本：恢复 resumeConfig + optimize 选中项
  function applyVersion(vid, c) {
    const version = store.resumeVersions.find(v => v.id === vid);
    if (!version) return;
    store.switchResumeVersion(vid);

    // 恢复 resumeConfig
    const snap = version.snapshot || {};
    if (snap.resumeConfig) {
      store.set({ resumeConfig: snap.resumeConfig });
    }
    // 恢复 optimize 选中项
    const optimize = store.get("optimize");
    if (optimize && snap.optimizeSelected && optimize.sections) {
      const byType = {};
      snap.optimizeSelected.forEach(sec => { byType[sec.type] = sec; });
      optimize.sections.forEach(sec => {
        const snapSec = byType[sec.type];
        if (!snapSec) return;
        (sec.items || []).forEach((it, idx) => {
          const snapItem = snapSec.items && snapSec.items[idx];
          if (snapItem && snapItem.selectedVariant) {
            it.selectedVariant = snapItem.selectedVariant;
          }
        });
      });
      store.replace("optimize", optimize);
    }
    renderVersionList(c);
    rerenderPreview(c);
    syncVersionUi(c, snap);
    toast(`已应用版本「${version.name}」`, "success");
  }

  // 同步版本快照相关的 UI（备注、模板、颜色选中态）
  function syncVersionUi(c, snap) {
    const rc = snap.resumeConfig || {};
    const noteEl = c.querySelector("#resumeNote");
    if (noteEl) noteEl.value = rc.note || "";
    const templateCard = c.querySelector(`.template-card[data-template="${rc.template}"]`);
    c.querySelectorAll(".template-card").forEach(t => t.classList.remove("active"));
    if (templateCard) templateCard.classList.add("active");
    c.querySelectorAll(".color-swatch").forEach(sw => {
      sw.classList.toggle("active", sw.getAttribute("data-color") === rc.color);
    });
    const avatarCheck = c.querySelector("#showAvatar");
    if (avatarCheck) avatarCheck.checked = !!rc.showAvatar;
  }

  // 新建版本快照
  function createVersion(c) {
    const versions = store.resumeVersions;
    const n = versions.length + 1;
    store.createResumeVersion(`V${n} 快照`);
    renderVersionList(c);
    toast("已保存版本快照", "success");
  }

  function renameVersion(vid, c) {
    const version = store.resumeVersions.find(v => v.id === vid);
    if (!version) return;
    showVersionModal(version.name, (name) => {
      store.renameResumeVersion(vid, name);
      renderVersionList(c);
      toast("已重命名", "success");
    });
  }

  async function deleteVersion(vid, c) {
    const ok = await confirm({
      title: "删除版本？",
      message: "删除该版本快照后不可恢复。",
      confirmText: "删除",
      danger: true,
    });
    if (!ok) return;
    if (store.deleteResumeVersion(vid)) {
      renderVersionList(c);
      rerenderPreview(c);
      toast("版本已删除", "success");
    } else {
      toast("至少需要保留一个版本", "warning");
    }
  }

  // 并排对比（带真实 diff 标记）
  function renderVersionCompare(c, versions) {
    const cmp = c.querySelector("#versionCompare");
    if (!cmp) return;
    if (!versions || versions.length < 2) {
      cmp.classList.remove("active");
      cmp.innerHTML = "";
      return;
    }
    const currentId = store.currentVersionId;
    const others = versions.filter(v => v.id !== currentId);
    const a = versions.find(v => v.id === currentId) || versions[0];
    const b = others[0] || versions[1];

    // 计算差异集合（按优化区块的 value 文本对比）
    const aLines = flattenLines(a);
    const bLines = flattenLines(b);
    const diffA = new Set(aLines);
    const diffB = new Set(bLines);

    cmp.classList.add("active");
    cmp.innerHTML = `
      <div class="compare-legend">
        <span class="lg diff">有差异</span>
        <span class="lg same">相同</span>
      </div>
      <div class="compare-grid">
        <div class="compare-col">
          <div class="compare-col-head">${esc(a.name)}</div>
          <div class="compare-col-body">${renderCompareBody(a, diffB, aLines, bLines)}</div>
        </div>
        <div class="compare-col">
          <div class="compare-col-head">${esc(b.name)}</div>
          <div class="compare-col-body">${renderCompareBody(b, diffA, bLines, aLines)}</div>
        </div>
      </div>
    `;
  }

  // 提取版本的所有 bullet 文本集合（用于 diff）
  function flattenLines(version) {
    const lines = [];
    const sections = version.snapshot?.optimizeSelected || [];
    sections.forEach(sec => {
      (sec.items || []).forEach(it => {
        if (it.value) lines.push(it.value);
      });
    });
    return lines;
  }

  function renderCompareBody(version, otherLineSet, ownLines, otherLines) {
    const snap = version.snapshot || {};
    const sections = snap.optimizeSelected || [];
    if (!sections.length) return `<div class="text-muted">（该版本无优化数据）</div>`;
    return sections.map(sec => `
      <div class="cmp-section">
        <div class="cmp-section-title">${esc(sec.title || sec.type)}</div>
        ${(sec.items || []).map(it => {
          const val = it.value || "";
          // 该行是否在另一版本中相同存在 → same；否则 diff
          const isSame = otherLineSet.has(val);
          return `<div class="cmp-line ${isSame ? "same" : "diff"}">${esc(val)}</div>`;
        }).join("")}
      </div>
    `).join("");
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
  const template = getTemplate(store.get("resumeConfig")?.template).key;
  const button = document.activeElement;
  setExportBusy(true);
  toast("正在生成 PDF…", "info", 5000);
  try {
    await exportElementToPdf(previewEl, {
      filename: `resume-${template}-${Date.now()}.pdf`,
      format: "a4",
      scale: 2,
    });
    toast("PDF 已下载", "success");
  } catch (e) {
    console.error(e);
    toast("PDF 导出失败：" + e.message, "error");
  } finally {
    setExportBusy(false, button);
  }
}

async function exportToWord() {
  const previewEl = document.getElementById("resumePreview");
  if (!previewEl) return;
  const button = document.activeElement;
  const config = store.get("resumeConfig") || {};
  setExportBusy(true);
  try {
    const resume = buildResumeObjectFromPreview(previewEl);
    await exportResumeToDocx(resume, `resume-${getTemplate(config.template).key}-${Date.now()}.docx`, {
      template: config.template,
      color: config.color,
    });
    toast("Word 文档已下载", "success");
  } catch (e) {
    console.error(e);
    toast("Word 导出失败：" + e.message, "error");
  } finally {
    setExportBusy(false, button);
  }
}

function setExportBusy(busy, restoreFocus = null) {
  const root = document.getElementById("content");
  if (!root) return;
  root.querySelectorAll("#copyText, #exportWord, #exportPdf, #finalExportPdf, #exportWord2, #exportPrint")
    .forEach((button) => {
      button.disabled = busy;
      button.classList.toggle("is-loading", busy);
    });
  if (!busy && restoreFocus?.focus) restoreFocus.focus();
}

function printResume() {
  const preview = document.getElementById("resumePreview");
  if (!preview) return;
  const shell = preview.closest(".card");
  document.body.classList.add("printing-resume");
  shell?.classList.add("print-resume-shell");
  const cleanup = () => {
    document.body.classList.remove("printing-resume");
    shell?.classList.remove("print-resume-shell");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
}

// 从预览 DOM 提取结构化简历（供 Word 导出）
function buildResumeObjectFromPreview(previewEl) {
  const resume = {
    basics: {
      name: previewEl.querySelector(".preview-name")?.textContent?.trim() || "我的简历",
    },
    summary: previewEl.querySelector(".preview-summary-text")?.textContent?.trim() || "",
    education: previewEl.querySelector(".preview-education-row")?.textContent?.trim() || "",
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
  const head = sec.querySelector(".timeline-item-head, .timeline-item > div, div[style*='font-weight:600']");
  const periodEl = sec.querySelector(".timeline-item-period, .preview-timeline-period, .timeline-period");
  const titleEl = sec.querySelector(".timeline-item-title");
  const roleEl = sec.querySelector(".timeline-item-role");
  const item = {
    name: titleEl?.textContent?.trim() || head?.textContent?.split("·")[0]?.trim() || "",
    role: roleEl?.textContent?.trim() || head?.textContent?.split("·")[1]?.trim() || "",
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

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60 * 1000) return "刚刚";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} 小时前`;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function showVersionModal(currentName, onSave) {
  showModal({
    title: "重命名版本",
    body: `
      <div class="form-group">
        <label class="label">版本名称</label>
        <input class="input" id="versionNameInput" value="${escAttr(currentName)}" />
      </div>
    `,
    footer: `
      <button class="ghost-btn" data-action="cancel">取消</button>
      <button class="primary-btn" data-action="confirm">保存</button>
    `,
  });
  const root = document.querySelector(".modal-root.active");
  if (!root) return;
  root.querySelector('[data-action="cancel"]').addEventListener("click", () => closeModal());
  root.querySelector('[data-action="confirm"]').addEventListener("click", () => {
    const name = root.querySelector("#versionNameInput")?.value.trim();
    closeModal();
    onSave(name);
  });
}

function escAttr(s) {
  return esc(s).replace(/'/g, "&#039;");
}
