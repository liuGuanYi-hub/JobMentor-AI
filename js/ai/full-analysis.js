// ai/full-analysis.js — 一次性全量分析流水线

import { store } from "../store.js";
import { chatJson } from "./deepseek.js";
import { PROMPTS, buildUserPayload } from "./prompts.js";
import { redact, mergeMaps, restoreTree } from "../privacy.js";

export const FULL_ANALYSIS_STEPS = [
  { step: 2, key: "jdAnalysis", label: "JD 解析", promptKey: "step2", temperature: 0.4 },
  { step: 3, key: "diagnose", label: "简历诊断", promptKey: "step3", temperature: 0.4 },
  { step: 4, key: "matchAnalysis", label: "匹配分析", promptKey: "step4", temperature: 0.4 },
  { step: 5, key: "deepdive", label: "经历追问", promptKey: "step5", temperature: 0.5 },
  { step: 6, key: "optimize", label: "简历优化", promptKey: "step6", temperature: 0.5, maxRetries: 1 },
  { step: 7, key: "interview", label: "面试准备", promptKey: "step7", temperature: 0.5 },
];

/**
 * 按步骤依赖顺序执行一次全量分析。
 * 已经存在的结果直接复用，失败重试时不会重复请求已完成的步骤。
 */
export async function runFullAnalysis({ onProgress = () => {} } = {}) {
  const apiKey = store.get("settings.apiKey");
  if (!apiKey) throw new Error("请先在右上角设置 API Key");

  const input = store.get("input") || {};
  const settings = store.get("settings") || {};

  for (const definition of FULL_ANALYSIS_STEPS) {
    const cached = store.get(definition.key);
    if (cached) {
      store.markStepDone(definition.step);
      onProgress({ ...definition, status: "cached" });
      continue;
    }

    onProgress({ ...definition, status: "running" });
    try {
      const result = await runOneStep(definition, { apiKey, input, settings });
      store.replace(definition.key, result);
      store.markStepDone(definition.step);
      onProgress({ ...definition, status: "done" });
    } catch (error) {
      onProgress({ ...definition, status: "error", error });
      error.analysisStep = definition.step;
      error.analysisLabel = definition.label;
      throw error;
    }
  }

  return FULL_ANALYSIS_STEPS.map(({ step, key, label }) => ({ step, key, label, status: "done" }));
}

async function runOneStep(definition, { apiKey, input, settings }) {
  const context = buildAnalysisContext(input, settings, definition.step);
  const state = {
    input,
    jdText: context.jdText,
    resumeText: context.resumeText,
    jdAnalysis: store.get("jdAnalysis"),
    diagnose: store.get("diagnose"),
    matchAnalysis: store.get("matchAnalysis"),
    deepdive: store.get("deepdive"),
    optimize: store.get("optimize"),
  };

  const messages = [
    { role: "system", content: PROMPTS[definition.promptKey] },
    { role: "user", content: buildUserPayload(definition.promptKey, buildStepPayload(definition.step, state)) },
  ];
  let result = await chatJson({
    apiKey,
    messages,
    temperature: definition.temperature,
    maxRetries: definition.maxRetries ?? 1,
  });

  if (context.restoreMap) result = restoreTree(result, context.restoreMap);
  return normalizeResult(definition.step, result);
}

function buildStepPayload(step, state) {
  if (step === 2) return { input: state.input, jdText: state.jdText };
  if (step === 3) return { input: state.input, jdText: state.jdText, resumeText: state.resumeText, jdAnalysis: state.jdAnalysis };
  if (step === 4) return { input: state.input, jdText: state.jdText, resumeText: state.resumeText, jdAnalysis: state.jdAnalysis };
  if (step === 5) return { input: state.input, jdText: state.jdText, resumeText: state.resumeText, jdAnalysis: state.jdAnalysis, matchAnalysis: state.matchAnalysis };
  if (step === 6) {
    const extra = state.deepdive
      ? state.deepdive.questions.filter((q) => q.refinedBullet).map((q) => `${q.prompt}\n回答: ${q.userAnswer}\n改写为: ${q.refinedBullet}`).join("\n\n")
      : "";
    return { input: state.input, jdText: state.jdText, resumeText: state.resumeText, jdAnalysis: state.jdAnalysis, deepdive: state.deepdive, extra };
  }
  const extra = state.optimize ? "用户已选定的 Bullet 优化方向已纳入考虑" : "";
  return { input: state.input, jdText: state.jdText, resumeText: state.resumeText, jdAnalysis: state.jdAnalysis, diagnose: state.diagnose, optimize: state.optimize, extra };
}

function buildAnalysisContext(input, settings, step) {
  const jdText = input.jdText || "";
  const resumeText = input.resumeText || "";
  if (!settings.privacyOn) return { jdText, resumeText, restoreMap: null };

  const jdResult = redact(jdText);
  if (step === 2) return { jdText: jdResult.redacted, resumeText, restoreMap: jdResult.map };

  const resumeResult = redact(resumeText);
  return {
    jdText: jdResult.redacted,
    resumeText: resumeResult.redacted,
    restoreMap: mergeMaps(jdResult.map, resumeResult.map),
  };
}

function normalizeResult(step, result) {
  if (step === 5) {
    result.questions = (result.questions || []).map((question, index) => ({
      ...question,
      id: question.id || `q${index + 1}`,
      userAnswer: question.userAnswer || "",
      refinedBullet: question.refinedBullet || "",
    }));
  }
  if (step === 6) {
    result.sections = (result.sections || []).map((section) => ({
      ...section,
      items: (section.items || []).map((item) => ({ ...item, selectedVariant: item.selectedVariant || "authentic" })),
    }));
  }
  return result;
}
