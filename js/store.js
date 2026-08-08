// store.js — 全局状态 + localStorage 持久化

const STORAGE_KEY = "jobmentor-ai-v1";
const SCHEMA_VERSION = 1;

// 默认状态
const DEFAULT_STATE = {
  version: SCHEMA_VERSION,
  currentStep: 1,
  doneSteps: [], // 已完成的步骤编号
  lastActiveAt: 0,

  // 用户设置
  settings: {
    apiKey: "",
    privacyOn: true,
    themeColor: "#5B6CFF",
  },

  // Step 1 输入材料
  input: {
    target: "安卓开发",
    industry: "互联网/软件工程",
    companyScale: "中型企业(100-499人 · C/D轮 · 未上市)",
    companyScaleKey: "medium", // 初创/小微/中型/大型/独角兽
    careerStage: "在校实习",
    careerStageKey: "intern", // intern/fresher/junior/mid/senior
    expectedCapability: "移动端开发",
    avatar: null,
    jdText: "",
    resumeText: "",
    supplement: "",
  },

  // Step 2 JD 解析结果
  jdAnalysis: null,

  // Step 3 简历诊断
  diagnose: null,

  // Step 4 匹配分析
  matchAnalysis: null,

  // Step 5 经历追问
  deepdive: null,

  // Step 6 简历优化
  optimize: null,

  // Step 7 面试准备
  interview: null,

  // Step 8 简历配置
  resumeConfig: {
    template: "timeline", // 选中的模板
    color: "#5B6CFF",
    showAvatar: false,
    note: "",
  },
};

class Store extends EventTarget {
  constructor() {
    super();
    this.state = null;
    this._saveTimer = null;
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        this.state.lastActiveAt = Date.now();
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed.version !== SCHEMA_VERSION) {
        // 版本不一致，重置（保守策略）
        this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        return;
      }
      // 合并默认值（防止新增字段丢失）
      this.state = mergeDeep(JSON.parse(JSON.stringify(DEFAULT_STATE)), parsed);
    } catch (e) {
      console.warn("Failed to load store, using defaults", e);
      this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
    this.state.lastActiveAt = Date.now();
  }

  get(key) {
    if (!key) return this.state;
    return key.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), this.state);
  }

  // 更新部分 state
  set(patch, options = {}) {
    if (!patch || typeof patch !== "object") return;
    // 深 patch
    this.state = mergeDeep(this.state, patch);
    this._emitChange();
    if (!options.skipPersist) this._scheduleSave();
  }

  // 完全替换某个子树
  replace(keyPath, value, options = {}) {
    const keys = keyPath.split(".");
    let cursor = this.state;
    for (let i = 0; i < keys.length - 1; i++) {
      if (cursor[keys[i]] == null) cursor[keys[i]] = {};
      cursor = cursor[keys[i]];
    }
    cursor[keys[keys.length - 1]] = value;
    this._emitChange();
    if (!options.skipPersist) this._scheduleSave();
  }

  // 标记某步完成
  markStepDone(stepNum) {
    if (!this.state.doneSteps.includes(stepNum)) {
      this.state.doneSteps.push(stepNum);
      this.state.doneSteps.sort((a, b) => a - b);
      this._emitChange();
      this._scheduleSave();
    }
  }

  // 检查前面步骤是否完成
  isReady(stepNum) {
    return this.state.doneSteps.includes(stepNum - 1);
  }

  reset() {
    this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.state.lastActiveAt = Date.now();
    this._emitChange();
    this._scheduleSave();
  }

  _emitChange() {
    this.dispatchEvent(new CustomEvent("change", { detail: this.state }));
  }

  _scheduleSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._save(), 200);
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error("Failed to save store", e);
    }
  }
}

function mergeDeep(target, source) {
  if (Array.isArray(source)) {
    return JSON.parse(JSON.stringify(source));
  }
  if (typeof source !== "object" || source === null) {
    return source;
  }
  const out = { ...(target || {}) };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = out[key];
    if (isPlainObject(sv) && isPlainObject(tv)) {
      out[key] = mergeDeep(tv, sv);
    } else if (sv === undefined) {
      // skip
    } else {
      out[key] = sv;
    }
  }
  return out;
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export const store = new Store();

// 清理过期或失败数据的兜底
export function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}
