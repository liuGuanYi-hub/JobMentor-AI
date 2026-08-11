import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = "http://localhost:8765";
const taskId = "t-browser-smoke";

const task = {
  id: taskId,
  title: "浏览器回归任务",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  input: {
    target: "安卓开发",
    industry: "互联网/软件工程",
    companyScale: "中型企业",
    companyScaleKey: "medium",
    careerStage: "在校实习",
    careerStageKey: "intern",
    expectedCapability: "移动端开发",
    avatar: null,
    jdText: "负责 Android 客户端开发与性能优化",
    resumeText: "使用 Kotlin 和 Jetpack Compose 完成移动端项目",
    supplement: "关注可量化结果",
  },
  jdAnalysis: {
    responsibilities: ["负责 Android 客户端开发"],
    hardRequirements: ["Kotlin"],
    hiddenRequirements: ["跨团队协作"],
    keywords: ["Android", "Kotlin"],
    candidateProfile: "能够独立完成移动端模块的候选人。",
    coreCompetencies: [{ name: "移动端开发", importance: "高", description: "有真实项目经验" }],
  },
  diagnose: {
    overall: 72,
    dimensions: [{ name: "移动端开发经验", score: 70, reason: "有项目证据" }],
    issues: ["量化结果不足"],
    recommendations: ["补充性能指标"],
  },
  matchAnalysis: {
    rows: [{ jdItem: "Android", evidence: "Kotlin 项目", strength: "强", needsSupplement: false, suggestion: "保留" }],
  },
  deepdive: {
    questions: [{ id: "q1", prompt: "具体负责了什么？", hint: "说明结果", userAnswer: "完成模块", refinedBullet: "独立完成移动端模块" }],
  },
  optimize: {
    sections: [{
      type: "projectExperience",
      title: "项目经历",
      period: "2025.01 - 2026.01",
      items: [{
        label: "移动端模块",
        original: "完成模块",
        data: "完成模块并提升性能",
        lead: "主导完成模块",
        authentic: "独立完成移动端模块",
        jdAligned: "基于 Kotlin 完成 Android 模块",
        selectedVariant: "authentic",
      }],
    }],
  },
  interview: {
    selfIntro: "我是一名有移动端项目经验的软件工程学生。",
    behaviorQuestions: ["介绍一次项目协作经历"],
    techQuestions: ["如何定位 Android 性能问题？"],
    skills: ["项目类", "系统设计类"],
    dataPoints: ["性能提升 30%"],
  },
  resumeConfig: { template: "timeline", color: "#5B6CFF", showAvatar: false, note: "" },
  resumeVersions: [],
  currentVersionId: null,
  doneSteps: [1, 2, 3, 4, 5, 6, 7, 8],
  currentStep: 8,
};

const state = {
  version: 2,
  lastActiveAt: Date.now(),
  settings: { apiKey: "", privacyOn: true, themeColor: "#5B6CFF" },
  tasks: { [taskId]: task },
  currentTaskId: taskId,
};

async function assertDownload(page, selector, extension, signature) {
  const downloadPromise = page.waitForEvent("download");
  await page.locator(selector).click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), new RegExp(`\\.${extension}$`));
  const stream = await download.createReadStream();
  let head = Buffer.alloc(0);
  for await (const chunk of stream) {
    head = Buffer.concat([head, chunk]).subarray(0, 8);
    if (head.length >= 8) break;
  }
  assert.equal(head.subarray(0, signature.length).toString("latin1"), signature);
}

const browser = await chromium.launch({ headless: true, channel: "chrome" });
const context = await browser.newContext();
const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));

try {
  await page.addInitScript((initialState) => {
    localStorage.setItem("jobmentor-ai-v1", JSON.stringify(initialState));
  }, state);
  await page.goto(`${BASE_URL}/#/step/8`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#resumePreview");

  assert.equal(await page.locator(".template-card").count(), 7);
  assert.match(await page.locator(".step-page-desc").first().textContent(), /支持 7 套简历模板/);
  const previewRatio = await page.locator("#resumePreview").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width / rect.height;
  });
  assert.ok(Math.abs(previewRatio - 210 / 297) < 0.01);
  assert.equal(await page.locator(".preview-education-row").count(), 1);
  await page.locator('.template-card[data-template="doublecol"]').click();
  assert.equal(await page.locator(".template-card.active").getAttribute("data-template"), "doublecol");
  assert.ok((await page.locator("#resumePreview").getAttribute("class")).includes("template-doublecol"));
  assert.equal(await page.locator("#resumePreview .preview-body").evaluate((element) => getComputedStyle(element).display), "grid");
  await assertDownload(page, "#exportWord", "docx", "PK");
  await assertDownload(page, "#exportPdf", "pdf", "%PDF");
  await page.locator('.template-card[data-template="github"]').click();
  assert.ok((await page.locator("#resumePreview").getAttribute("class")).includes("template-github"));
  assert.equal(await page.locator("#copyText").count(), 1);
  await page.evaluate(() => { window.print = () => {}; });
  await page.locator("#exportPrint").click();
  assert.equal(await page.locator("body").evaluate((element) => element.classList.contains("printing-resume")), true);
  assert.equal(await page.locator(".print-resume-shell #resumePreview").count(), 1);
  await page.evaluate(() => {
    document.body.classList.remove("printing-resume");
    document.querySelector(".print-resume-shell")?.classList.remove("print-resume-shell");
  });
  await page.locator('.template-tab[data-tab="compare"]').click();
  assert.equal(await page.locator("#comparePanel").isVisible(), true);
  assert.doesNotMatch(await page.locator("#toastRoot").innerText(), /开发中/);
  await page.locator('.template-tab[data-tab="tech"]').click();
  assert.equal(await page.locator("#techPanel").isVisible(), true);
  await page.locator('.template-tab[data-tab="resume"]').click();

  await page.locator('.template-tab[data-tab="versions"]').click();
  await page.waitForSelector("#newVersionBtn");
  await page.locator("#newVersionBtn").click();
  await page.waitForSelector(".version-item");
  assert.equal(await page.locator(".version-item").count(), 1);
  await page.locator('.version-item [data-action="rename"]').click();
  await page.locator("#versionNameInput").fill("V1 · 浏览器回归");
  await page.locator('.modal-root.active [data-action="confirm"]').click();
  assert.ok((await page.locator(".version-item-name").textContent()).includes("浏览器回归"));

  await page.locator("#taskBtn").click();
  assert.equal(await page.locator(".task-item").count(), 1);
  await page.locator("#newTaskBtn").click();
  await page.locator("#newTaskName").fill("新建回归任务");
  await page.locator('.modal-root.active [data-action="confirm"]').click();
  await page.waitForSelector("#fJdText");
  assert.equal(await page.locator("#taskBtnLabel").textContent(), "新建回归任务");
  const uploadLayout = await page.locator("#resumeDrop").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { display: getComputedStyle(element).display, width: rect.width, height: rect.height };
  });
  assert.equal(uploadLayout.display, "block");
  assert.ok(uploadLayout.width > 500 && uploadLayout.height > 80);
  assert.equal(await page.locator("#startAnalysis").count(), 1);
  assert.equal(await page.locator("#fullAnalysisProgress").count(), 1);
  await page.locator("#apiKeyBtn").click();
  assert.equal(await page.locator("#apiKeyInput").isVisible(), true);
  await page.locator('.modal-root.active [data-action="cancel"]').click();

  const pluginPage = await context.newPage();
  await pluginPage.goto(`${BASE_URL}/?jd=${encodeURIComponent("来自浏览器插件的 JD")}`, { waitUntil: "domcontentloaded" });
  await pluginPage.waitForSelector("#fJdText");
  assert.equal(await pluginPage.locator("#fJdText").inputValue(), "来自浏览器插件的 JD");
  await pluginPage.close();

  const localFlowState = JSON.parse(JSON.stringify(state));
  localFlowState.tasks[taskId].input.isExampleData = true;
  localFlowState.tasks[taskId].input.target = "安卓开发";
  localFlowState.tasks[taskId].input.jdText = "负责 Android 客户端开发、Compose UI 和性能优化";
  localFlowState.tasks[taskId].input.resumeText = "使用 Kotlin、Jetpack Compose、Room 和 Retrofit 完成 SilverLink 项目";
  localFlowState.tasks[taskId].doneSteps = [];
  localFlowState.tasks[taskId].currentStep = 1;
  const localFlowPage = await context.newPage();
  const localFlowRequests = [];
  localFlowPage.on("request", (request) => {
    if (request.url().includes("api.deepseek.com")) localFlowRequests.push(request.url());
  });
  await localFlowPage.addInitScript((initialState) => {
    localStorage.setItem("jobmentor-ai-v1", JSON.stringify(initialState));
  }, localFlowState);
  await localFlowPage.goto(`${BASE_URL}/#/step/1`, { waitUntil: "domcontentloaded" });
  await localFlowPage.waitForSelector("#startAnalysis");
  await localFlowPage.evaluate(() => {
    window.__exampleProgressValues = [];
    const record = () => {
      const value = document.querySelector("#fullAnalysisProgressPercent")?.textContent;
      if (value) window.__exampleProgressValues.push(value);
    };
    record();
    new MutationObserver(record).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
  });
  await localFlowPage.locator("#startAnalysis").click();
  await localFlowPage.waitForSelector(".parse-card");
  const localProgressValues = await localFlowPage.evaluate(() => window.__exampleProgressValues);
  assert.ok(localProgressValues.includes("0%"));
  assert.ok(localProgressValues.includes("100%"));
  assert.equal(localFlowRequests.length, 0);
  assert.equal(await localFlowPage.locator(".parse-card").count(), 4);
  await localFlowPage.close();

  const exampleState = JSON.parse(JSON.stringify(state));
  exampleState.tasks[taskId].input.isExampleData = true;
  exampleState.tasks[taskId].doneSteps = [1, 2, 3, 4, 5, 6, 7];
  exampleState.tasks[taskId].currentStep = 7;
  const examplePage = await context.newPage();
  const examplePageErrors = [];
  const exampleApiRequests = [];
  examplePage.on("pageerror", (error) => examplePageErrors.push(error.message));
  examplePage.on("request", (request) => {
    if (request.url().includes("api.deepseek.com")) exampleApiRequests.push(request.url());
  });
  await examplePage.addInitScript((initialState) => {
    localStorage.setItem("jobmentor-ai-v1", JSON.stringify(initialState));
  }, exampleState);
  await examplePage.goto(`${BASE_URL}/#/step/7`, { waitUntil: "domcontentloaded" });
  await examplePage.waitForSelector(".interview-answer");
  assert.equal(await examplePage.locator(".interview-answer").count(), 10);
  assert.match(await examplePage.locator(".step-page-desc").first().textContent(), /SilverLink 项目本地示例答案/);
  assert.match(await examplePage.locator("body").textContent(), /AuthInterceptor/);
  assert.deepEqual(exampleApiRequests, []);
  assert.deepEqual(examplePageErrors, []);
  await examplePage.close();

  assert.deepEqual(pageErrors, []);
  console.log("浏览器回归通过：7 套模板、版本快照、任务新建、API Key 弹窗、插件 JD 注入、本地 SilverLink 面试答案、无 pageerror");
} finally {
  await browser.close();
}
