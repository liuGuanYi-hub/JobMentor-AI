// store.js — 全局状态 + localStorage 持久化（v2：多任务支持）

const STORAGE_KEY = "jobmentor-ai-v1";
const SCHEMA_VERSION = 2;

// 任务内字段（路由到当前任务）
const TASK_FIELDS = new Set([
  "input", "jdAnalysis", "diagnose", "matchAnalysis", "deepdive",
  "optimize", "interview", "interviewPractice", "resumeConfig", "doneSteps", "currentStep",
]);
// 全局字段
const GLOBAL_FIELDS = new Set(["settings", "tasks", "currentTaskId", "version", "lastActiveAt"]);

// 任务默认结构
function defaultTask(title = "新建任务") {
  return {
    id: null,
    title,
    createdAt: 0,
    updatedAt: 0,
    input: {
      target: "",
      industry: "",
      companyScale: "中型企业(100-499人 · C/D轮 · 未上市)",
      companyScaleKey: "medium",
      careerStage: "在校实习",
      careerStageKey: "intern",
      expectedCapability: "",
      avatar: null,
      jdText: "",
      resumeText: "",
      supplement: "",
    },
    jdAnalysis: null,
    diagnose: null,
    matchAnalysis: null,
    deepdive: null,
    optimize: null,
    interview: null,
    interviewPractice: {
      activeQuestionId: "behavior-1",
      attempts: [],
    },
    resumeConfig: {
      template: "timeline",
      color: "#5B6CFF",
      showAvatar: false,
      note: "",
    },
    // 简历多版本（版本对比）
    resumeVersions: [],
    currentVersionId: null,
    doneSteps: [],
    currentStep: 1,
  };
}

// 全局默认（不含任务）
const DEFAULT_GLOBAL = {
  version: SCHEMA_VERSION,
  lastActiveAt: 0,
  settings: {
    apiKey: "",
    privacyOn: true,
    themeColor: "#5B6CFF",
  },
};

function genId() {
  return "t-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function autoTitle(input) {
  const target = input?.target || "";
  const stage = input?.careerStage || "";
  return target ? `${target}${stage ? " · " + stage : ""}` : "未命名任务";
}

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
        this._initDefault();
        return;
      }
      const parsed = JSON.parse(raw);
      this.state = this._migrate(parsed);
    } catch (e) {
      console.warn("Failed to load store, using defaults", e);
      this._initDefault();
    }
    this.state.lastActiveAt = Date.now();
  }

  _initDefault() {
    const g = JSON.parse(JSON.stringify(DEFAULT_GLOBAL));
    const task = defaultTask("新建任务");
    task.id = genId();
    task.createdAt = Date.now();
    task.updatedAt = Date.now();
    this.state = {
      ...g,
      tasks: { [task.id]: task },
      currentTaskId: task.id,
    };
  }

  // 旧版数据（v1 无 tasks）→ 迁移为第一个任务
  _migrate(parsed) {
    if (parsed.tasks && parsed.currentTaskId && parsed.tasks[parsed.currentTaskId]) {
      // 已是最新结构，做字段兜底
      for (const t of Object.values(parsed.tasks)) {
        const merged = mergeDeep(defaultTask(t.title), t);
        merged.id = t.id;
        Object.assign(t, merged);
      }
      parsed.version = SCHEMA_VERSION;
      if (!parsed.settings) parsed.settings = { ...DEFAULT_GLOBAL.settings };
      return parsed;
    }

    // v1 迁移：顶层 input/jdAnalysis/... → 任务
    const task = defaultTask(autoTitle(parsed.input));
    task.id = genId();
    task.createdAt = parsed.lastActiveAt || Date.now();
    task.updatedAt = Date.now();
    for (const f of ["input", "jdAnalysis", "diagnose", "matchAnalysis", "deepdive", "optimize", "interview", "interviewPractice", "resumeConfig", "doneSteps", "currentStep"]) {
      if (parsed[f] !== undefined) task[f] = parsed[f];
    }
    task.doneSteps = task.doneSteps || [];
    task.currentStep = task.currentStep || 1;

    const settings = parsed.settings || { ...DEFAULT_GLOBAL.settings };
    return {
      version: SCHEMA_VERSION,
      lastActiveAt: Date.now(),
      settings,
      tasks: { [task.id]: task },
      currentTaskId: task.id,
    };
  }

  // ===== 任务管理 =====

  get tasks() {
    return this.state?.tasks || {};
  }

  get currentTaskId() {
    return this.state?.currentTaskId || null;
  }

  _currentTask() {
    return this.state?.tasks?.[this.state.currentTaskId] || null;
  }

  createTask(title) {
    const task = defaultTask(title || "新建任务");
    task.id = genId();
    task.createdAt = Date.now();
    task.updatedAt = Date.now();
    this.state.tasks[task.id] = task;
    this.state.currentTaskId = task.id;
    this._emitChange();
    this._scheduleSave();
    return task.id;
  }

  switchTask(taskId) {
    if (!this.state.tasks[taskId]) return false;
    this.state.currentTaskId = taskId;
    this.state.lastActiveAt = Date.now();
    this._emitChange();
    this._scheduleSave();
    return true;
  }

  deleteTask(taskId) {
    if (!this.state.tasks[taskId]) return false;
    if (Object.keys(this.state.tasks).length <= 1) {
      // 至少保留一个任务
      return false;
    }
    delete this.state.tasks[taskId];
    if (this.state.currentTaskId === taskId) {
      const keys = Object.keys(this.state.tasks);
      this.state.currentTaskId = keys[keys.length - 1];
    }
    this._emitChange();
    this._scheduleSave();
    return true;
  }

  renameTask(taskId, title) {
    const t = this.state.tasks[taskId];
    if (!t) return false;
    t.title = title || t.title;
    t.updatedAt = Date.now();
    this._emitChange();
    this._scheduleSave();
    return true;
  }

  get taskList() {
    return Object.values(this.state?.tasks || {})
      .map((t) => ({
        id: t.id,
        title: t.title,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        progress: (t.doneSteps || []).length,
        isCurrent: t.id === this.state?.currentTaskId,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // ===== 简历版本管理 =====

  get resumeVersions() {
    const task = this._currentTask();
    return (task?.resumeVersions) || [];
  }

  get currentVersionId() {
    const task = this._currentTask();
    return task?.currentVersionId || null;
  }

  get currentVersion() {
    const task = this._currentTask();
    if (!task || !task.resumeVersions) return null;
    return task.resumeVersions.find((v) => v.id === task.currentVersionId) || null;
  }

  /**
   * 新建版本：从当前 optimize/resumeConfig 生成快照
   * @param {string} name 版本名
   */
  createResumeVersion(name) {
    const task = this._currentTask();
    if (!task) return null;
    if (!task.resumeVersions) task.resumeVersions = [];

    const snapshot = buildVersionSnapshot(task);
    const version = {
      id: "v-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6),
      name: name || `V${task.resumeVersions.length + 1} 快照`,
      createdAt: Date.now(),
      snapshot,
    };
    task.resumeVersions.push(version);
    task.currentVersionId = version.id;
    task.updatedAt = Date.now();
    this._emitChange();
    this._scheduleSave();
    return version;
  }

  switchResumeVersion(versionId) {
    const task = this._currentTask();
    if (!task || !task.resumeVersions) return false;
    if (!task.resumeVersions.find((v) => v.id === versionId)) return false;
    task.currentVersionId = versionId;
    task.updatedAt = Date.now();
    this._emitChange();
    this._scheduleSave();
    return true;
  }

  renameResumeVersion(versionId, name) {
    const task = this._currentTask();
    if (!task || !task.resumeVersions) return false;
    const v = task.resumeVersions.find((x) => x.id === versionId);
    if (!v) return false;
    v.name = name || v.name;
    task.updatedAt = Date.now();
    this._emitChange();
    this._scheduleSave();
    return true;
  }

  deleteResumeVersion(versionId) {
    const task = this._currentTask();
    if (!task || !task.resumeVersions) return false;
    if (task.resumeVersions.length <= 1) return false;
    task.resumeVersions = task.resumeVersions.filter((v) => v.id !== versionId);
    if (task.currentVersionId === versionId) {
      task.currentVersionId = task.resumeVersions[task.resumeVersions.length - 1].id;
    }
    task.updatedAt = Date.now();
    this._emitChange();
    this._scheduleSave();
    return true;
  }

  // ===== 兼容旧 API =====

  get(key) {
    if (!key) return this._view();
    // 全局字段
    if (GLOBAL_FIELDS.has(key) || key.startsWith("settings.")) {
      return key.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), this.state);
    }
    // 任务字段
    const task = this._currentTask();
    if (!task) return undefined;
    return key.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), task);
  }

  // 更新（patch 拆分为全局/任务）
  set(patch, options = {}) {
    if (!patch || typeof patch !== "object") return;
    const gPatch = {};
    const tPatch = {};
    for (const [k, v] of Object.entries(patch)) {
      if (GLOBAL_FIELDS.has(k) || k.startsWith("settings")) {
        gPatch[k] = v;
      } else if (TASK_FIELDS.has(k)) {
        tPatch[k] = v;
      } else {
        // 未知字段默认进任务（向前兼容）
        tPatch[k] = v;
      }
    }
    if (Object.keys(gPatch).length) {
      this.state = mergeDeep(this.state, gPatch);
    }
    if (Object.keys(tPatch).length) {
      const task = this._currentTask();
      if (task) {
        mergeInto(task, tPatch);
        task.updatedAt = Date.now();
      }
    }
    this._emitChange();
    if (!options.skipPersist) this._scheduleSave();
  }

  // 完全替换某个子树
  replace(keyPath, value, options = {}) {
    const isGlobal = GLOBAL_FIELDS.has(keyPath) || keyPath.startsWith("settings.");
    let cursor;
    if (isGlobal) {
      cursor = this.state;
    } else {
      cursor = this._currentTask();
      if (!cursor) return;
    }
    const keys = keyPath.split(".");
    for (let i = 0; i < keys.length - 1; i++) {
      if (cursor[keys[i]] == null) cursor[keys[i]] = {};
      cursor = cursor[keys[i]];
    }
    cursor[keys[keys.length - 1]] = value;
    if (!isGlobal) {
      const task = this._currentTask();
      if (task) task.updatedAt = Date.now();
    }
    this._emitChange();
    if (!options.skipPersist) this._scheduleSave();
  }

  // 标记某步完成（当前任务）
  markStepDone(stepNum) {
    const task = this._currentTask();
    if (!task) return;
    task.doneSteps = task.doneSteps || [];
    if (!task.doneSteps.includes(stepNum)) {
      task.doneSteps.push(stepNum);
      task.doneSteps.sort((a, b) => a - b);
      task.updatedAt = Date.now();
      this._emitChange();
      this._scheduleSave();
    }
  }

  // 检查前面步骤是否完成
  isReady(stepNum) {
    const task = this._currentTask();
    if (!task) return false;
    return (task.doneSteps || []).includes(stepNum - 1);
  }

  // 清空当前任务（重新开始当前任务）
  resetTask() {
    const id = this.state.currentTaskId;
    const task = defaultTask("新建任务");
    task.id = id;
    task.createdAt = Date.now();
    task.updatedAt = Date.now();
    this.state.tasks[id] = task;
    this._emitChange();
    this._scheduleSave();
  }

  // 兼容：reset = 清空当前任务（不删除历史任务）
  reset() {
    this.resetTask();
  }

  // ===== 内部 =====

  // 扁平视图（顶层展开当前任务字段，供 store.get() 无 key 使用）
  _view() {
    const task = this._currentTask();
    if (!task) return { ...this.state };
    return {
      ...this.state,
      ...task,
      settings: this.state.settings,
    };
  }

  _emitChange() {
    this.dispatchEvent(new CustomEvent("change", { detail: this._view() }));
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

// 就地深合并到 target（不替换 target 引用）
function mergeInto(target, source) {
  for (const [k, v] of Object.entries(source)) {
    const tv = target[k];
    if (isPlainObject(v) && isPlainObject(tv)) {
      mergeInto(tv, v);
    } else if (v === undefined) {
      // skip
    } else {
      target[k] = Array.isArray(v) ? JSON.parse(JSON.stringify(v)) : v;
    }
  }
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// 从任务当前状态构建版本快照（选定 bullet + 模板配置）
function buildVersionSnapshot(task) {
  const snapshot = {
    optimizeSelected: [],
    resumeConfig: JSON.parse(JSON.stringify(task.resumeConfig || {})),
  };
  const opt = task.optimize;
  if (opt && Array.isArray(opt.sections)) {
    snapshot.optimizeSelected = opt.sections.map((sec) => ({
      type: sec.type,
      title: sec.title,
      period: sec.period,
      items: (sec.items || []).map((it) => ({
        label: it.label,
        selectedVariant: it.selectedVariant || "authentic",
        value: it[it.selectedVariant || "authentic"] || it.authentic || it.original || "",
      })),
    }));
  }
  return snapshot;
}

export const store = new Store();

// 清理过期或失败数据的兜底
export function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}
