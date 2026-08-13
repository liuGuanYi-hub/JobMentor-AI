import assert from "node:assert/strict";
import test from "node:test";

import {
  redact,
  restore,
  restoreTree,
  detect,
  mergeMaps,
} from "../js/privacy.js";
import {
  chatCompletions,
  chatJson,
  checkApiKey,
  estimateInputTokens,
} from "../js/ai/deepseek.js";
import {
  runFullAnalysis,
  loadExampleAnalysisCache,
  restoreExampleAnalysisCache,
} from "../js/ai/full-analysis.js";
import {
  buildKeywordCoverage,
  scoreInterviewAnswer,
} from "../js/features/career-insights.js";
import { store } from "../js/store.js";

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
    json: async () => JSON.parse(body),
  };
}

test("隐私脱敏支持往返还原和嵌套 AI 结果还原", () => {
  const source = "联系人：13812345678，邮箱：demo@example.com，身份证：110101199001011234。";
  const first = redact(source);
  const second = redact("备用联系人：13912345678");
  const map = mergeMaps(first.map, second.map);

  assert.notEqual(first.redacted, source);
  assert.equal(restore(first.redacted, first.map), source);
  assert.deepEqual(detect(source), {
    phone: ["13812345678"],
    email: ["demo@example.com"],
    idCard: ["110101199001011234"],
  });
  assert.deepEqual(restoreTree({ nested: [first.redacted, second.redacted] }, map), {
    nested: [source, "备用联系人：13912345678"],
  });
});

test("DeepSeek JSON 非法输出会自动重试并解析", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return calls.length === 1
      ? response(200, JSON.stringify({ choices: [{ message: { content: "不是 JSON" } }] }))
      : response(200, JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }));
  };
  try {
    const result = await chatJson({ apiKey: "TEST_TOKEN", messages: [], maxRetries: 0, timeoutMs: 200 });
    assert.deepEqual(result, { ok: true });
    assert.equal(calls.length, 2);
    assert.equal(calls[0].max_tokens, 4096);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("DeepSeek HTTP 错误会分类且不暴露完整响应", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => response(401, '{"error":{"message":"invalid key"}}');
  try {
    await assert.rejects(
      () => chatCompletions({ apiKey: "TEST_TOKEN", messages: [], maxRetries: 1, timeoutMs: 200 }),
      (error) => error.code === "HTTP_401" && error.status === 401 && error.message.includes("API Key 无效") && !error.message.includes("invalid key"),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("DeepSeek 请求和 Key 连通性测试都具备超时边界", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      reject(error);
    }, { once: true });
  });
  try {
    await assert.rejects(
      () => chatCompletions({ apiKey: "TEST_TOKEN", messages: [], maxRetries: 0, timeoutMs: 10 }),
      (error) => error.code === "TIMEOUT",
    );
    await assert.rejects(
      () => checkApiKey({ apiKey: "TEST_TOKEN", timeoutMs: 10 }),
      (error) => error.code === "TIMEOUT",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("输入材料 token 估算能覆盖 JD、简历和补充信息", () => {
  const tokens = estimateInputTokens({ jdText: "岗位".repeat(100), resumeText: "简历".repeat(100), supplement: "补充".repeat(100) });
  assert.ok(tokens > 0);
});

test("JD 关键词覆盖会同时检查原始简历和优化结果证据", () => {
  const result = buildKeywordCoverage({
    keywords: ["Android", "Jetpack Compose", "Spring Boot"],
    input: { resumeText: "使用 Kotlin 和 Jetpack Compose 完成 Android 客户端项目" },
    optimize: {
      sections: [{
        title: "项目经历",
        items: [{ selectedVariant: "authentic", authentic: "通过 Repository 完成 Android 模块开发" }],
      }],
    },
  });
  assert.equal(result.total, 3);
  assert.equal(result.coveredCount, 2);
  assert.equal(result.missingCount, 1);
  assert.equal(result.items.find((item) => item.keyword === "Android").evidence.source, "原始简历");
  assert.equal(result.items.find((item) => item.keyword === "Spring Boot").covered, false);
});

test("面试回答本地评分会输出多维反馈和 STAR 完整度", () => {
  const result = scoreInterviewAnswer(
    "请介绍一次 Android 项目中的性能优化经历",
    "在 SilverLink 项目中，健康数据查询出现加载慢的问题，我负责定位日志和 Repository 查询路径，调整 Room 缓存与数据访问方式，最后通过测试确认耗时从 1.2 秒降到 0.4 秒。",
    { keywords: ["Android", "性能优化", "Room"] },
  );
  assert.equal(result.dimensions.length, 5);
  assert.ok(result.overall >= 70);
  assert.equal(result.star.action, true);
  assert.equal(result.star.result, true);
  assert.ok(Array.isArray(result.missing));
});

test("Store v2 可以隔离任务和简历版本", async () => {
  class MemoryStorage {
    #data = new Map();
    getItem(key) { return this.#data.get(key) ?? null; }
    setItem(key, value) { this.#data.set(key, String(value)); }
    removeItem(key) { this.#data.delete(key); }
  }
  globalThis.localStorage = new MemoryStorage();
  if (!globalThis.CustomEvent) {
    globalThis.CustomEvent = class extends Event {
      constructor(type, init = {}) { super(type); this.detail = init.detail; }
    };
  }
  const { store } = await import(`../js/store.js?test=${Date.now()}`);
  store.load();
  const firstId = store.currentTaskId;
  store.set({ input: { target: "安卓开发" } });
  const secondId = store.createTask("后端开发");
  assert.notEqual(firstId, secondId);
  assert.equal(store.get("input.target"), "");
  store.switchTask(firstId);
  assert.equal(store.get("input.target"), "安卓开发");
  store.set({ optimize: { sections: [{ type: "summary", items: [{ authentic: "原始版本" }] }] } });
  const version = store.createResumeVersion("V1");
  assert.equal(store.resumeVersions.length, 1);
  assert.equal(version.snapshot.optimizeSelected[0].items[0].value, "原始版本");
});

test("全量分析按依赖顺序请求一次并复用已缓存结果", async () => {
  class MemoryStorage {
    #data = new Map();
    getItem(key) { return this.#data.get(key) ?? null; }
    setItem(key, value) { this.#data.set(key, String(value)); }
    removeItem(key) { this.#data.delete(key); }
  }
  globalThis.localStorage = new MemoryStorage();
  store.load();
  store.set({ settings: { apiKey: "TEST_TOKEN" }, input: { jdText: "JD", resumeText: "Resume" } });

  const responses = [
    { responsibilities: [], hardRequirements: [], hiddenRequirements: [], keywords: [], candidateProfile: "", coreCompetencies: [] },
    { overall: 80, dimensions: [], issues: [], recommendations: [] },
    { rows: [] },
    { questions: [] },
    { sections: [] },
    { selfIntro: "", behaviorQuestions: [], techQuestions: [], skills: [], dataPoints: [] },
  ];
  const originalFetch = globalThis.fetch;
  let calls = 0;
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return {
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(responses[calls++]) } }] }),
      text: async () => "",
    };
  };
  try {
    await runFullAnalysis();
    assert.equal(calls, 6);
    assert.equal(requests[4].max_tokens, 6000);
    assert.deepEqual(requests[4].thinking, { type: "disabled" });
    const cachedExample = loadExampleAnalysisCache();
    assert.ok(cachedExample);
    assert.equal(JSON.stringify(cachedExample).includes("TEST_TOKEN"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(cachedExample, "settings"), false);
    for (const key of ["jdAnalysis", "diagnose", "matchAnalysis", "deepdive", "optimize", "interview"]) {
      store.replace(key, null, { skipPersist: true });
    }
    store.set({ doneSteps: [] }, { skipPersist: true });
    assert.equal(restoreExampleAnalysisCache(), true);
    assert.deepEqual(store.get("doneSteps"), [1, 2, 3, 4, 5, 6, 7]);
    await runFullAnalysis();
    assert.equal(calls, 6);
    assert.deepEqual(store.get("doneSteps"), [1, 2, 3, 4, 5, 6, 7]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
