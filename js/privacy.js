// privacy.js — 敏感信息脱敏/还原

const RE = {
  phone: /(?<![\d-])(1[3-9]\d{9})(?![\d])/g,
  email: /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g,
  idCard: /(\d{17}[\dXx]|\d{15})/g,
};

// 简单 hash 生成代号，便于反向还原
function code(prefix, val) {
  return `[${prefix}:${hash(val).toString(36)}]`;
}

function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * 扫描并脱敏一段文本
 * @param {string} text
 * @returns {{ redacted: string, map: {phone: Map, email: Map, idCard: Map} }}
 */
export function redact(text) {
  const maps = {
    phone: new Map(),
    email: new Map(),
    idCard: new Map(),
  };
  let redacted = String(text || "");

  redacted = redacted.replace(RE.phone, (m) => {
    const k = code("PH", m);
    maps.phone.set(k, m);
    return k;
  });
  redacted = redacted.replace(RE.email, (m) => {
    const k = code("EM", m);
    maps.email.set(k, m);
    return k;
  });
  redacted = redacted.replace(RE.idCard, (m) => {
    const k = code("ID", m);
    maps.idCard.set(k, m);
    return k;
  });

  return { redacted, map: maps };
}

/**
 * 反向替换回原始值
 */
export function restore(text, map) {
  if (!text || !map) return text;
  let result = String(text);
  for (const [k, v] of map.phone.entries()) result = result.split(k).join(v);
  for (const [k, v] of map.email.entries()) result = result.split(k).join(v);
  for (const [k, v] of map.idCard.entries()) result = result.split(k).join(v);
  return result;
}

/**
 * 递归还原 AI 结构化结果中的敏感信息，占位符不会遗留在结果里。
 */
export function restoreTree(value, map) {
  if (typeof value === "string") return restore(value, map);
  if (Array.isArray(value)) return value.map((item) => restoreTree(item, map));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, restoreTree(item, map)]));
  }
  return value;
}

/**
 * 合并多段文本脱敏产生的映射，供一次 AI 调用统一还原结果。
 */
export function mergeMaps(...maps) {
  const merged = { phone: new Map(), email: new Map(), idCard: new Map() };
  for (const map of maps) {
    if (!map) continue;
    for (const type of Object.keys(merged)) {
      for (const [key, value] of map[type]?.entries?.() || []) merged[type].set(key, value);
    }
  }
  return merged;
}

// 自我检测：返回一段文本里所有识别出的敏感项
export function detect(text) {
  const found = { phone: [], email: [], idCard: [] };
  const t = String(text || "");
  let m;
  while ((m = RE.phone.exec(t))) found.phone.push(m[1]);
  while ((m = RE.email.exec(t))) found.email.push(m[1]);
  while ((m = RE.idCard.exec(t))) found.idCard.push(m[1]);
  return found;
}
