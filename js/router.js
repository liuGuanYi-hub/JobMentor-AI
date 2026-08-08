// router.js — 单页路由（基于 URL hash 的步骤切换）

const STEP_DEFS = [
  { num: 1, key: "input", name: "输入材料", desc: "填写 JD 与简历", icon: "📝" },
  { num: 2, key: "jd-parse", name: "JD 解析", desc: "拆解岗位需求", icon: "🔍" },
  { num: 3, key: "diagnose", name: "简历诊断", desc: "评分与匹配度", icon: "📊" },
  { num: 4, key: "match", name: "匹配分析", desc: "逐项差距对比", icon: "🎯" },
  { num: 5, key: "deepdive", name: "经历追问", desc: "挖掘项目亮点", icon: "💡" },
  { num: 6, key: "optimize", name: "简历优化", desc: "Bullet 点重撰写", icon: "✨" },
  { num: 7, key: "interview", name: "面试准备", desc: "预测与演练", icon: "🎤" },
  { num: 8, key: "final", name: "最终简历", desc: "预览与导出", icon: "📄" },
];

class Router {
  constructor(handlers = {}) {
    this.handlers = handlers;
    this._currentStep = 1;
    this._listeners = [];

    window.addEventListener("hashchange", () => this._handleHashChange());
    window.addEventListener("popstate", () => this._handleHashChange());
  }

  get defs() {
    return STEP_DEFS;
  }

  get currentStep() {
    return this._currentStep;
  }

  get currentDef() {
    return STEP_DEFS.find((s) => s.num === this._currentStep);
  }

  // 初始化 - 读取当前 hash 或默认
  init() {
    const hash = window.location.hash;
    const match = hash.match(/#\/step\/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 8) this._currentStep = num;
    }
    return this._currentStep;
  }

  // 跳转到某步骤
  go(stepNum, options = {}) {
    if (stepNum < 1 || stepNum > 8) return;
    if (!options.skipReadyCheck && !this._canEnter(stepNum)) {
      if (this.handlers.blocked) this.handlers.blocked(stepNum, this._firstUndoneBefore(stepNum));
      return;
    }
    this._currentStep = stepNum;
    if (!options.skipHash) {
      const newHash = `#/step/${stepNum}`;
      if (window.location.hash !== newHash) {
        window.location.hash = newHash;
      }
    }
    if (this.handlers.change) this.handlers.change(stepNum, options);
    this._listeners.forEach((fn) => fn(stepNum));
  }

  // 跳到下一步（前提：当前已完成）
  next() {
    if (this._currentStep < 8) this.go(this._currentStep + 1);
  }

  // 上一步
  prev() {
    if (this._currentStep > 1) this.go(this._currentStep - 1);
  }

  // 监听步骤切换
  onChange(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter((f) => f !== fn);
    };
  }

  _canEnter(stepNum) {
    // 第一步可以直接进；其余需要前序步骤已完成
    if (stepNum === 1) return true;
    return this.handlers.canEnter ? this.handlers.canEnter(stepNum) : true;
  }

  _firstUndoneBefore(stepNum) {
    for (let i = 1; i < stepNum; i++) {
      if (!this._isDone(i)) return i;
    }
    return null;
  }

  _isDone(stepNum) {
    return this.handlers.isDone ? this.handlers.isDone(stepNum) : false;
  }

  _handleHashChange() {
    const hash = window.location.hash;
    const match = hash.match(/#\/step\/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num !== this._currentStep) {
        this._currentStep = num;
        if (this.handlers.change) this.handlers.change(num, { fromHash: true });
      }
    }
  }
}

export const router = new Router();
export { STEP_DEFS };
