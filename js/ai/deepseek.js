// ai/deepseek.js — DeepSeek API 客户端

const API_BASE = "https://api.deepseek.com/v1";
const DEFAULT_MODEL = "deepseek-chat";

/**
 * 调用 DeepSeek chat/completions
 * @param {Object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.model
 * @param {Array<{role, content}>} opts.messages
 * @param {boolean} opts.jsonMode
 * @param {number} opts.temperature
 * @param {number} opts.maxRetries
 */
export async function chatCompletions({
  apiKey,
  model = DEFAULT_MODEL,
  messages,
  jsonMode = false,
  temperature = 0.4,
  maxRetries = 1,
  signal,
} = {}) {
  if (!apiKey) throw new Error("未设置 DeepSeek API Key");

  const body = {
    model,
    messages,
    temperature,
    stream: false,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  let lastErr = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const resp = await fetch(`${API_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        throw new Error(`DeepSeek ${resp.status}: ${errText.slice(0, 200)}`);
      }
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || "";
      return content;
    } catch (e) {
      lastErr = e;
      if (e.name === "AbortError") throw e;
      if (attempt === maxRetries) break;
      await sleep(800 * (attempt + 1));
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
  signal,
  validate,
  retryHint = "上次未返回合法 JSON。请直接输出 JSON 对象，不要任何解释、不要 Markdown 代码块包裹。",
} = {}) {
  let raw = await chatCompletions({
    apiKey,
    model,
    messages,
    jsonMode: true,
    temperature,
    maxRetries: 0,
    signal,
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
      maxRetries: 0,
      signal,
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
