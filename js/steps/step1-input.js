// steps/step1-input.js — Step 1 输入材料页面

import { store } from "../store.js";
import { router } from "../router.js";
import { toast } from "../ui/toast.js";
import { showModal, confirm } from "../ui/modal.js";
import { redact, detect } from "../privacy.js";
import { parsePdf } from "../parsers/pdf.js";
import { parseDocx } from "../parsers/docx.js";

const INDUSTRY_TAGS = [
  "互联网/软件工程", "人工智能/AIGC", "互联网/SaaS", "芯片/半导体",
  "新能源/智能汽车", "金融科技/FinTech", "电商/跨境电商", "医疗健康",
  "教育/培训", "游戏/电竞", "企业服务", "网络安全",
  "物流/供应链", "消费零售", "广告/营销", "传媒/内容",
  "房地产/建筑", "工业制造", "农业/食品", "航空航天",
  "通信/运营商", "能源/环保", "旅游/酒店", "设计/创意",
  "法律/合规",
];

const COMPANY_SCALES = [
  { key: "startup", label: "初创公司 (0-20人 · 天使轮/未融资)" },
  { key: "small", label: "小微企业 (20-99人 · A轮)" },
  { key: "medium", label: "中型企业 (100-499人 · C/D轮 · 未上市)" },
  { key: "large", label: "大型企业 (500-999人 · 已上市)" },
  { key: "unicorn", label: "独角兽/上市公司 (1000+ · 已上市)" },
];

const SCALE_TIPS = {
  startup: "强调 0→1 全栈能力、自驱、容忍模糊。关注产品快速迭代中的主动补位。",
  small: "强调多面手、灵活性、对业务全链路负责。关注个人产出对结果的直接影响。",
  medium: "兼顾业务高速扩张与规范化，强调独当一面的业务突破力与快速产出。",
  large: "强调流程规范、跨部门协作、专业深度与体系化思考。关注 KPI 量化与流程优化。",
  unicorn: "强调系统化思维、数据驱动决策、抗压能力。关注规模化挑战与组织协同。",
};

const CAREER_STAGES = [
  { key: "intern", label: "在校实习 (在校生 · 0 经验)" },
  { key: "fresher", label: "应届生（含校招）(应届 · 0-1 年)" },
  { key: "junior", label: "1-3 年经验 (初级社招)" },
  { key: "mid", label: "3-5 年经验 (中级社招)" },
  { key: "senior", label: "5+ 年经验 (高级/资深社招)" },
];

const STAGE_TIPS = {
  intern: "挖掘学习能力、抗压能力、潜力。展示 Demo实践与快速上手能力；避免过分要求多年工作经验。",
  fresher: "聚焦学习潜力、基础知识扎实度、团队协作适配性。Demos 实践经验与GitHub 项目加分。",
  junior: "已有 1-2 段可展示的项目经历，能独立完成中等模块。突出技术深度与业务理解力。",
  mid: "能独立承担重要模块，主导过中型项目。突出数据驱动、跨团队协作、决策质量。",
  senior: "能主导系统性架构，对业务结果有明确贡献。突出团队管理、技术战略、复杂问题解决。",
};

export async function renderStep1(container) {
  const input = store.get("input");
  const settings = store.get("settings");
  const jdText = input.jdText || "";
  const resumeText = input.resumeText || "";

  container.innerHTML = `
    <div class="step-page-header">
      <h1 class="step-page-title">输入材料</h1>
      <p class="step-page-desc">填写目标岗位信息与原始简历，Agent 将基于 JD 进行定制分析与优化</p>
    </div>

    <div class="privacy-banner">
      <span class="privacy-icon">
        <i data-lucide="shield-check" width="14"></i>
      </span>
      <span class="privacy-text">
        <strong>AI 敏感隐私数据保护</strong>
        开启后，手机号、电子邮箱、姓名等个人隐私将在发送给 AI 前自动加密脱敏，分析完成后自动解密还原。
        <span id="privacyDetect" style="display:none;margin-left:4px;color:var(--success);font-weight:500;"></span>
      </span>
      <label class="switch">
        <input type="checkbox" id="privacyToggle" ${settings.privacyOn ? "checked" : ""}>
        <span class="slider"></span>
      </label>
    </div>

    <!-- 目标岗位信息 -->
    <div class="card">
      <div class="card-title">目标岗位信息</div>
      <div class="card-desc">帮助 Agent 理解你的求职方向</div>

      <div class="form-row">
        <div class="form-group">
          <label class="label">目标岗位</label>
          <input class="input" id="fTarget" placeholder="如：安卓开发" value="${esc(input.target)}" />
        </div>
        <div class="form-group">
          <label class="label">行业<span class="label-tip">（可选）</span>
            <a class="text-btn" style="float:right;font-size:12px;" id="industrySmartBtn">✨ 智能识别</a>
          </label>
          <input class="input" id="fIndustry" placeholder="如：互联网 / 软件工程" value="${esc(input.industry)}" />
          <div class="parse-tags" id="industryTags" style="margin-top:var(--gap-2);">
            ${INDUSTRY_TAGS.slice(0, 8).map(t => `<span class="chip ${t === input.industry ? "active" : ""}" data-tag="${esc(t)}">${esc(t)}</span>`).join("")}
            <a class="text-btn" id="industryMore" style="font-size:12px;">更多行业 (${INDUSTRY_TAGS.length}) ⌄</a>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="label">目标公司规模与类型（模仿 BOSS 直聘）
          <span class="label-tip">选择目标企业规模以激活 AI 针对性模型润色</span>
        </label>
        <select class="select" id="fCompanyScale">
          ${COMPANY_SCALES.map(s => `<option value="${s.key}" ${s.key === input.companyScaleKey ? "selected" : ""}>${esc(s.label)}</option>`).join("")}
        </select>
        <div class="info-callout" id="scaleTip">
          💡 <strong>AI 润色策略：</strong>针对 <strong>【${esc(COMPANY_SCALES.find(s => s.key === input.companyScaleKey)?.label || "")}】</strong>进行定制分析
          <div style="margin-top:4px;">${esc(SCALE_TIPS[input.companyScaleKey] || "")}</div>
          <div class="pill-group">
            ${pillBar(input.companyScale)}
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="label">求职阶段与经验定位（实习/校招/社招/转型）
          <span class="label-tip">选择当前求职阶段以匹配正确的考核预期</span>
        </label>
        <select class="select" id="fCareerStage">
          ${CAREER_STAGES.map(s => `<option value="${s.key}" ${s.key === input.careerStageKey ? "selected" : ""}>${esc(s.label)}</option>`).join("")}
        </select>
        <div class="info-callout" id="stageTip">
          💡 <strong>AI 润色策略：</strong>针对 <strong>【${esc(CAREER_STAGES.find(s => s.key === input.careerStageKey)?.label || "")}】</strong>重锤详细
          <div style="margin-top:4px;">${esc(STAGE_TIPS[input.careerStageKey] || "")}</div>
          <div class="pill-group">
            ${pillBar(input.careerStage)}
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="label">期望实习的能力</label>
        <input class="input" id="fExpected" placeholder="如：移动端开发" value="${esc(input.expectedCapability)}" />
      </div>

      <div class="form-group">
        <label class="label">个人证书/头像<span class="label-tip">（可选）</span></label>
        <label class="upload-mini" id="avatarUpload">
          <span class="upload-mini-icon"><i data-lucide="user" width="18"></i></span>
          <span>上传证件照 · 解析后还原</span>
          ${input.avatar ? `<span style="margin-left:auto;color:var(--success);">✓ 已上传</span>` : ""}
          <input type="file" accept="image/*" hidden>
        </label>
      </div>
    </div>

    <!-- 目标 JD -->
    <div class="card">
      <div class="card-title">目标 JD</div>
      <div class="card-desc">粘贴完整岗位描述原文，Agent 将解析职责与要求</div>
      <textarea class="textarea" id="fJdText" placeholder="将岗位 JD 完整粘贴在这里…" style="min-height:140px;">${esc(jdText)}</textarea>
    </div>

    <!-- 原始简历 -->
    <div class="card">
      <div class="card-title">原始简历</div>
      <div class="card-desc">支持拖拽 PDF / Word .docx 简历到下方，直接粘贴也可</div>

      <label class="file-drop" id="resumeDrop">
        <div class="file-drop-icon" style="margin-bottom:6px;">
          <i data-lucide="upload-cloud" width="28"></i>
        </div>
        <div class="file-drop-text">点击或拖拽上传 · 支持 PDF / Word / docx</div>
        <input type="file" accept=".pdf,.doc,.docx,application/pdf" hidden id="resumeFile">
      </label>

      <div class="form-group" style="margin-top:var(--gap-3);">
        <textarea class="textarea" id="fResumeText" placeholder="上传后会自动填入解析文本；也可直接粘贴…" style="min-height:120px;">${esc(resumeText)}</textarea>
      </div>
    </div>

    <!-- 补充信息 -->
    <div class="card">
      <div class="card-title">补充信息<span class="label-tip" style="margin-left:4px;color:var(--text-4);font-weight:400;">（可选）</span></div>
      <div class="card-desc">项目培训、转正情况、特长说明等</div>
      <textarea class="textarea" id="fSupplement" placeholder="如：希望突出在 移动端开发 功能模块、架构设计或数据驱动优化方面的丰富经验与项目成果…" style="min-height:80px;">${esc(input.supplement)}</textarea>
    </div>

    <!-- 底部行动栏 -->
    <div class="start-bar">
      <div class="left-tip">
        <i data-lucide="zap" width="14"></i>
        <span>已消耗合理额度，随时可发起 AI 智能诊断</span>
      </div>
      <div class="right-actions">
        <button class="ghost-btn" id="fillExampleBtn">使用示例数据</button>
        <button class="primary-btn" id="startAnalysis">
          <i data-lucide="zap" width="14"></i>
          <span>开始 AI 匹配分析</span>
        </button>
      </div>
    </div>
  `;

  // 图标初始化
  if (window.lucide) window.lucide.createIcons();

  bindEvents(container);

  function pillBar(str) {
    if (!str) return "";
    return str.split(/[·]/)[0].trim().split(/\s+/).slice(0, 3).map(s =>
      `<span class="badge info">${esc(s)}</span>`
    ).join("");
  }

  function bindEvents(container) {
    // 隐私开关
    container.querySelector("#privacyToggle").addEventListener("change", (e) => {
      store.set({ settings: { privacyOn: e.target.checked } });
      toast(e.target.checked ? "隐私保护已开启" : "隐私保护已关闭，将直接发送原文", "info");
    });

    // 字段变化保存
    const fields = [
      ["fTarget", "target"],
      ["fIndustry", "industry"],
      ["fExpected", "expectedCapability"],
      ["fJdText", "jdText", true],
      ["fResumeText", "resumeText", true],
      ["fSupplement", "supplement", true],
    ];
    fields.forEach(([id, key]) => {
      const el = container.querySelector("#" + id);
      if (el) {
        el.addEventListener("input", () => {
          const value = el.value;
          store.set({ input: { [key]: value } });
          updatePrivacyWarn(container, value);
        });
      }
    });

    // 公司规模切换
    container.querySelector("#fCompanyScale").addEventListener("change", (e) => {
      const key = e.target.value;
      const item = COMPANY_SCALES.find(s => s.key === key);
      store.set({ input: { companyScaleKey: key, companyScale: item.label } });
      updateCompanyTip(container);
    });

    // 求职阶段切换
    container.querySelector("#fCareerStage").addEventListener("change", (e) => {
      const key = e.target.value;
      const item = CAREER_STAGES.find(s => s.key === key);
      store.set({ input: { careerStageKey: key, careerStage: item.label } });
      updateStageTip(container);
    });

    // 行业标签
    container.querySelectorAll("#industryTags .chip[data-tag]").forEach(chip => {
      chip.addEventListener("click", () => {
        const tag = chip.getAttribute("data-tag");
        container.querySelector("#fIndustry").value = tag;
        store.set({ input: { industry: tag } });
        container.querySelectorAll("#industryTags .chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
      });
    });

    // 智能识别（mock）
    container.querySelector("#industrySmartBtn").addEventListener("click", () => {
      const text = container.querySelector("#fIndustry").value || container.querySelector("#fJdText").value;
      if (!text) {
        toast("请先填写行业或粘贴 JD", "warning");
        return;
      }
      // 简易猜测
      const guess = INDUSTRY_TAGS.find(t => text.includes(t.split("/")[0])) || INDUSTRY_TAGS[0];
      container.querySelector("#fIndustry").value = guess;
      store.set({ input: { industry: guess } });
      toast(`识别为：${guess}`, "success");
    });

    // 简历上传
    const fileInput = container.querySelector("#resumeFile");
    container.querySelector("#resumeDrop").addEventListener("click", (e) => {
      if (e.target.closest("input")) return;
      fileInput.click();
    });
    fileInput.addEventListener("change", (e) => {
      const f = e.target.files[0];
      if (f) handleResumeFile(f, container);
    });
    // 拖拽
    ["dragover", "dragenter"].forEach(evt => {
      container.querySelector("#resumeDrop").addEventListener(evt, (e) => {
        e.preventDefault();
        e.currentTarget.classList.add("drag-over");
      });
    });
    ["dragleave", "drop"].forEach(evt => {
      container.querySelector("#resumeDrop").addEventListener(evt, (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove("drag-over");
      });
    });
    container.querySelector("#resumeDrop").addEventListener("drop", (e) => {
      const f = e.dataTransfer.files[0];
      if (f) handleResumeFile(f, container);
    });

    // 头像上传
    container.querySelector("#avatarUpload input").addEventListener("change", (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        store.set({ input: { avatar: reader.result } });
        toast("头像已上传", "success");
      };
      reader.readAsDataURL(f);
    });

    // 示例数据
    container.querySelector("#fillExampleBtn").addEventListener("click", () => {
      fillExampleData(container);
    });

    // 开始分析
    container.querySelector("#startAnalysis").addEventListener("click", () => {
      handleStart(container);
    });
  }

  function updatePrivacyWarn(container, text) {
    const privacyOn = store.get("settings.privacyOn");
    const el = container.querySelector("#privacyDetect");
    if (!el) return;
    if (!privacyOn) {
      el.style.display = "none";
      return;
    }
    const detected = detect(text);
    const count = detected.phone.length + detected.email.length + detected.idCard.length;
    if (count > 0) {
      const parts = [];
      if (detected.phone.length) parts.push(`${detected.phone.length} 个手机号`);
      if (detected.email.length) parts.push(`${detected.email.length} 个邮箱`);
      if (detected.idCard.length) parts.push(`${detected.idCard.length} 个身份证`);
      el.textContent = `（已识别 ${parts.join("、")}，将自动脱敏）`;
      el.style.display = "inline";
    } else {
      el.style.display = "none";
    }
  }
}

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function updateCompanyTip(container) {
  const key = container.querySelector("#fCompanyScale").value;
  const item = COMPANY_SCALES.find(s => s.key === key);
  const tip = container.querySelector("#scaleTip");
  if (tip) {
    tip.innerHTML = `
      💡 <strong>AI 润色策略：</strong>针对 <strong>【${esc(item.label)}】</strong>进行定制分析
      <div style="margin-top:4px;">${esc(SCALE_TIPS[key])}</div>
      <div class="pill-group">
        ${item.label.split(/[·]/)[0].trim().split(/\s+/).slice(0, 3).map(s =>
          `<span class="badge info">${esc(s)}</span>`).join("")}
      </div>
    `;
  }
}

function updateStageTip(container) {
  const key = container.querySelector("#fCareerStage").value;
  const item = CAREER_STAGES.find(s => s.key === key);
  const tip = container.querySelector("#stageTip");
  if (tip) {
    tip.innerHTML = `
      💡 <strong>AI 润色策略：</strong>针对 <strong>【${esc(item.label)}】</strong>重锤详细
      <div style="margin-top:4px;">${esc(STAGE_TIPS[key])}</div>
      <div class="pill-group">
        ${item.label.split(/[·]/)[0].trim().split(/\s+/).slice(0, 3).map(s =>
          `<span class="badge info">${esc(s)}</span>`).join("")}
      </div>
    `;
  }
}

async function handleResumeFile(file, container) {
  const name = file.name.toLowerCase();
  if (file.size > 8 * 1024 * 1024) {
    toast("文件过大（>8MB），建议压缩后上传", "warning");
  }
  toast(`正在解析 ${name}…`, "info", 2000);
  try {
    let text = "";
    if (name.endsWith(".pdf")) {
      text = await parsePdf(file);
    } else if (name.endsWith(".doc") || name.endsWith(".docx")) {
      text = await parseDocx(file);
    } else {
      text = await file.text();
    }
    container.querySelector("#fResumeText").value = text;
    store.set({ input: { resumeText: text } });
    toast(`解析完成（${text.length} 字）`, "success");
  } catch (e) {
    console.error(e);
    toast(`解析失败：${e.message}`, "error");
  }
}

function fillExampleData(container) {
  const jd = `我们是一家 100-499 人的互联网医疗公司（C 轮融资），专注于用 AI + 移动端技术重塑慢病管理体验。

【岗位职责】
1. 参与 Android 客户端的设计、开发与维护，负责核心功能模块
2. 负责 Android 端性能优化与稳定性提升，处理 ANR、Crash 等问题
3. 与产品、后端协作，完成移动端功能的迭代与落地
4. 参与客户端架构设计、代码评审与技术方案选型

【任职要求】
1. 计算机相关专业本科及以上
2. 有 Android 或 iOS 实际开发经验，能独立完成功能模块
3. 熟练掌握 Kotlin / Java 至少一种，了解 Jetpack Compose / React Native 优先
4. 有性能优化、架构设计、内存优化经验加分

【加分项】
- 有开源贡献 / 实际作品 Demo
- 有跨端开发（Flutter / React Native）经验
- 熟悉 MVVM / MVI / Clean Architecture`;

  const resume = `曾子丹
2027 届软件工程本科 | 专业成绩 5% | 后端工程师实习 · 客户端项目实践

【项目经验】
SilverLink · 独立社区患者服务系统 + Android 客户端研发（实习）
时间：2024.10 - 2026.06
- 独立完成 Android 客户端核心功能模块，基于 Jetpack Compose 实现主要 UI
- 负责通用 Repository 分层、离线模拟数据库降级与非破坏性回收机制
- 优化健康监测时序数据和服药订单流水查询，提升数据加载效率
- 协助前端联调，开发调试 / 性能监控工具

【实习经历】
广东中科院信息工程研究所 · 后端工程师实习生
时间：2026.04 - 2026.07
- 参与后端数据聚合服务的开发与维护
- 用 Go 重构 ETL 流程，提升数据吞吐 30%

【技能清单】
- Android: Kotlin, Jetpack Compose, MVVM, Repository, Room
- 后端: Java, Spring Boot, Go, MySQL, Redis
- 工具: Git, Linux, Docker`;

  container.querySelector("#fJdText").value = jd;
  container.querySelector("#fResumeText").value = resume;
  container.querySelector("#fTarget").value = "安卓开发";
  container.querySelector("#fIndustry").value = "互联网/软件工程";
  container.querySelector("#fExpected").value = "移动端开发";

  store.set({
    input: {
      target: "安卓开发",
      industry: "互联网/软件工程",
      jdText: jd,
      resumeText: resume,
      expectedCapability: "移动端开发",
    },
  });

  toast("示例数据已填入，可直接开始分析", "success");
}

async function handleStart(container) {
  const input = store.get("input");
  const settings = store.get("settings");

  if (!input.target && !input.jdText && !input.resumeText) {
    toast("请至少填写目标岗位、JD 或简历其一", "warning");
    return;
  }
  if (!input.jdText.trim()) {
    toast("请粘贴目标 JD", "warning");
    return;
  }
  if (!input.resumeText.trim()) {
    toast("请粘贴或上传原始简历", "warning");
    return;
  }

  // 标记 step1 完成
  store.markStepDone(1);

  // 隐私脱敏演示（在生产中会在每次 AI 调用时透明进行）
  if (settings.privacyOn) {
    const r = detect(input.jdText + "\n" + input.resumeText);
    const total = r.phone.length + r.email.length + r.idCard.length;
    if (total > 0) {
      toast(`已脱敏 ${total} 项敏感信息`, "success");
    }
  }

  router.go(2);
}
