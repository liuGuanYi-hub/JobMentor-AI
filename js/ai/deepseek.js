// ai/deepseek.js — DeepSeek API 客户端

const API_BASE = "https://api.deepseek.com/v1";
const DEFAULT_MODEL = "deepseek-v4-flash";
const DEFAULT_TIMEOUT_MS = 60_000;
export const DEFAULT_MAX_TOKENS = 4_096;
const API_KEY_CHECK_TIMEOUT_MS = 15_000;
export const INPUT_WARN_TOKENS = 12_000;
export const INPUT_MAX_TOKENS = 16_000;

/**
 * 调用 DeepSeek chat/completions
 * @param {Object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.model
 * @param {Array<{role, content}>} opts.messages
 * @param {boolean} opts.jsonMode
 * @param {number} opts.temperature
 * @param {number} opts.maxRetries
 * @param {number} opts.timeoutMs
 */
export async function chatCompletions({
  apiKey,
  model = DEFAULT_MODEL,
  messages,
  jsonMode = false,
  temperature = 0.4,
  maxRetries = 1,
  maxTokens = DEFAULT_MAX_TOKENS,
  thinking,
  signal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (!apiKey) throw new Error("未设置 DeepSeek API Key");

  const body = {
    model,
    messages,
    temperature,
    stream: false,
  };
  if (Number.isFinite(maxTokens) && maxTokens > 0) body.max_tokens = maxTokens;
  if (thinking) body.thinking = thinking;
  if (jsonMode) body.response_format = { type: "json_object" };

  let lastErr = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const request = createRequestSignal(signal, timeoutMs);
    try {
      const resp = await fetch(`${API_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: request.signal,
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        throw createApiError(resp.status, errText);
      }
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || "";
      return content;
    } catch (e) {
      if (signal?.aborted) throw e;
      if (request.didTimeout()) {
        const timeoutError = new Error(`DeepSeek 请求超时（${Math.ceil(timeoutMs / 1000)} 秒），请检查网络后重试`);
        timeoutError.code = "TIMEOUT";
        timeoutError.retryable = true;
        throw timeoutError;
      }
      lastErr = e;
      if (e.retryable === false || e.name === "AbortError") throw e;
      if (attempt === maxRetries) break;
      await sleep(800 * (attempt + 1));
    } finally {
      request.cleanup();
    }
  }
  throw lastErr;
}

/**
 * 解析 JSON 输出（带容错：自动剥离 markdown 代码块 + 自动重试）
 */
export async function chatJson({
  apiKey,
  model,
  messages,
  temperature,
  maxTokens = DEFAULT_MAX_TOKENS,
  thinking,
  signal,
  validate,
  maxRetries = 1,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retryHint = "上次未返回合法 JSON。请直接输出 JSON 对象，不要任何解释、不要 Markdown 代码块包裹。",
} = {}) {
  let raw = await chatCompletions({
    apiKey,
    model,
    messages,
    jsonMode: true,
    temperature,
    maxRetries,
    maxTokens,
    thinking,
    signal,
    timeoutMs,
  });

  let parsed = tryParseJson(raw);
  if (!parsed) {
    // 自动重试一次
    const retryMessages = [
      ...messages,
      { role: "user", content: `${retryHint}\n\n原始输出:\n${raw.slice(0, 1000)}` },
    ];
    raw = await chatCompletions({
      apiKey,
      model,
      messages: retryMessages,
      jsonMode: true,
      temperature: 0.2,
      maxRetries,
      maxTokens,
      thinking,
      signal,
      timeoutMs,
    });
    parsed = tryParseJson(raw);
  }

  if (!parsed) {
    const err = new Error("AI 输出无法解析为 JSON");
    err.raw = raw;
    throw err;
  }

  if (validate && !validate(parsed)) {
    const err = new Error("AI 输出未通过校验");
    err.raw = raw;
    err.parsed = parsed;
    throw err;
  }

  return parsed;
}

/**
 * 只验证 Key 和网络连通性，不保存、不输出 Key。
 */
export async function checkApiKey({ apiKey, timeoutMs = API_KEY_CHECK_TIMEOUT_MS } = {}) {
  if (!apiKey) throw new Error("未设置 DeepSeek API Key");
  const request = createRequestSignal(null, timeoutMs);
  try {
    const resp = await fetch(`${API_BASE}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: request.signal,
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw createApiError(resp.status, errText);
    }
    return true;
  } catch (e) {
    if (request.didTimeout()) {
      const timeoutError = new Error(`DeepSeek 连通性测试超时（${Math.ceil(timeoutMs / 1000)} 秒）`);
      timeoutError.code = "TIMEOUT";
      throw timeoutError;
    }
    throw e;
  } finally {
    request.cleanup();
  }
}

function createApiError(status, detail = "") {
  const messages = {
    400: "请求参数无效",
    401: "API Key 无效或已过期",
    402: "账户余额或 API 额度不足",
    403: "API Key 没有权限执行此请求",
    429: "请求过于频繁，请稍后重试",
  };
  const message = messages[status] || (status >= 500 ? "DeepSeek 服务暂时不可用，请稍后重试" : "DeepSeek 请求失败");
  const error = new Error(`${message}（HTTP ${status}）`);
  error.name = "DeepSeekApiError";
  error.status = status;
  error.code = `HTTP_${status}`;
  error.retryable = status === 429 || status >= 500;
  error.detail = detail.slice(0, 200);
  return error;
}

function createRequestSignal(parentSignal, timeoutMs) {
  const controller = new AbortController();
  let timedOut = false;
  let timer = null;
  let onAbort = null;

  if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
  }
  if (parentSignal) {
    onAbort = () => controller.abort(parentSignal.reason);
    if (parentSignal.aborted) onAbort();
    else parentSignal.addEventListener("abort", onAbort, { once: true });
  }

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      if (timer) clearTimeout(timer);
      if (parentSignal && onAbort) parentSignal.removeEventListener("abort", onAbort);
    },
  };
}

function tryParseJson(text) {
  if (!text) return null;
  // 1. 直接尝试
  let m = text.match(/\{[\s\S]*\}/);
  let s = m ? m[0] : text;
  try {
    return JSON.parse(s);
  } catch (e) {}
  // 2. 去掉 markdown 代码块
  s = text.replace(/```json\s*([\s\S]*?)```/g, "$1").replace(/```/g, "").trim();
  m = s.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch (e) {}
  }
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// 估算 token（粗略 1 token ≈ 0.75 中文字 ≈ 4 英文字符）
export function estimateTokens(text) {
  if (!text) return 0;
  const cn = (text.match(/[一-龥]/g) || []).length;
  const en = text.length - cn;
  return Math.ceil(cn * 0.75 + en * 0.25);
}

export function estimateInputTokens({ jdText = "", resumeText = "", supplement = "" } = {}) {
  return estimateTokens([jdText, resumeText, supplement].filter(Boolean).join("\n"));
}
