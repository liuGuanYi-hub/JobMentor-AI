// 通用面试示例答案（虚构）：仅供本地示例展示，不调用 AI。
// 本文件为完全虚构的通用演示内容，与任何真实个人无关。

export const GENERIC_INTERVIEW_EXAMPLE = {
  sourceLabel: "通用示例答案",
  selfIntro: "我是一名软件工程本科生，专业排名前 5%，主要做过健康管理 App 和校园服务助手 Agent 两个项目。客户端项目采用 Kotlin、响应式 UI、ViewModel、StateFlow、本地缓存和网络请求框架，独立完成登录、健康档案、数据看板、服务预约等 6 大模块，设计 Repository 分层并实现离线降级，将弱网页面可用性提升至 95%。同时做过 Agent 应用，构建数据驱动评估体系，把意图识别精确率提升 12pt。我习惯用数据量化交付结果，希望在移动端开发岗位继续把功能做得稳定、清晰、可维护。",
  behaviorQuestions: [
    {
      question: "在项目中，你负责了客户端核心开发，能分享一下你是如何设计和实现不同角色权限隔离的吗？",
      answer: "我采用了“前端导航隔离 + 后端接口隔离 + 资源归属校验”三层做法。客户端从会话管理读取角色，主界面根据角色选择不同的底部导航和首页入口，避免用户在界面上进入不相关模块。后端通过拦截器解析会话，再由角色访问策略对路径做角色判断。最后，查看用户数据时还使用用户 ID 做资源范围校验，不能只依赖前端隐藏按钮。",
    },
    {
      question: "你在开发中遇到过最棘手的技术问题是什么？你是如何定位并解决的？",
      answer: "项目里比较棘手的是远程接口不可用时，页面不能直接变成空白，同时还要避免把不同账号的本地数据混在一起。我先把问题拆成网络层、数据层和 UI 状态层：数据仓库统一封装网络异常，ViewModel 用同步策略标记数据来源；远程成功后写入本地缓存，失败时继续观察按用户 ID 隔离的本地数据。定位时我重点检查日志、返回状态和查询账号范围，而不是在页面里到处补判断。这样既能离线演示，也能明确告诉用户当前看到的是远程数据还是本地回退数据。",
    },
    {
      question: "当你和产品经理对一个功能需求有不同理解时，你会怎么处理？可以举一个具体的例子。",
      answer: "我会先把分歧从“感觉不同”转成可验证的验收条件。比如健康记录需求如果只说“支持查看健康情况”，我会和产品确认是只看最新值，还是还要趋势、风险提示、风险确认和离线查看；再用一个小流程图或原型确认。若时间有限，我会把“记录最新值和查看历史”放进第一版，把复杂的实时告警或第三方设备接入拆到后续，并把取舍写进接口和测试清单。这样既保证当前版本可交付，也避免开发完成后才发现双方对结果的定义不一致。",
    },
    {
      question: "在时间紧任务重的情况下，你如何保证项目按时交付？你会优先做什么？",
      answer: "我会先按用户闭环排优先级，而不是按页面数量排优先级。项目中我会优先保证登录、角色进入正确首页、数据记录或服务提交、管理端接收待办这条主链路，再补同步、异常回退和关键空态；支付通道、动画和非核心视觉细节可以后置。执行上采用垂直切片，每完成一条链路就做一次最小验证，同时先锁定数据契约，网络不可用时用明确的本地演示回退保证页面可看。若仍然超时，就及时同步删减范围和剩余风险，不把问题拖到最后一天。",
    },
    {
      question: "你之前实习主要是后端，现在应聘客户端开发，你如何快速适应移动端的开发节奏？你做了哪些准备？",
      answer: "后端经验让我熟悉接口、数据模型、异常处理和业务边界，但客户端还必须补上生命周期、UI 状态和设备环境这几类能力。我在项目中按一条完整竖切片来适应：先用响应式 UI 做页面，再用 ViewModel 和 StateFlow 管状态，用网络框架对接接口，用本地缓存做离线数据，最后处理网络失败、旋转和返回栈。准备过程中我重点练习了协程、UI 重组、导航、依赖注入和模拟器调试，而不是只停留在把后端接口搬到页面上。",
    },
  ],
  techQuestions: [
    {
      question: "请简述 Activity 的生命周期，并说明在屏幕旋转、后台切换时 Activity 会经历哪些回调？",
      answer: "典型启动顺序是 onCreate、onStart、onResume；进入后台通常会经历 onPause、onStop，回到前台再经过 onRestart、onStart、onResume。屏幕旋转属于配置变化，默认会销毁旧 Activity 并创建新实例，常见顺序是 onPause、onSaveInstanceState、onStop、onDestroy，然后新实例重新走 onCreate、onStart、onResume。项目使用单 Activity 承载导航，页面状态放在 ViewModel/StateFlow，持久数据放在本地缓存；这样旋转时不会把业务状态只绑在 Activity 对象上。",
    },
    {
      question: "协程中的 launch 和 async 有什么区别？你会在什么场景下使用 async？",
      answer: "launch 返回 Job，适合执行不需要返回值的任务，例如 ViewModel 中使用 viewModelScope.launch 加载数据、保存记录或更新 UI 状态；async 返回 Deferred，适合并发执行并需要通过 await 取得结果的任务。比如同时请求用户摘要、近 7 日周报和用药依从性时，如果这些请求彼此独立，可以在同一个结构化协程中用 async，再用 await 或 awaitAll 汇总。若后一个请求依赖前一个结果，或者并发没有收益，就按顺序执行，避免为了使用 async 增加复杂度。",
    },
    {
      question: "你在项目中使用了响应式 UI，请说说它和传统 View 系统在 UI 刷新方式上的主要区别。",
      answer: "传统 View 通常是命令式地找到控件，再手动设置文本、通知刷新或修改可见性；响应式 UI 是声明式的，UI 是状态的函数，状态变化后框架只重组受影响的部分。项目里界面通过 collectAsState 观察 ViewModel 的 StateFlow，数据、登录角色和加载状态变化后自动刷新对应界面，不需要在 Activity 里手动操作控件。需要注意的是，响应式 UI 并不意味着所有状态都放在界面内，业务状态仍应放在 ViewModel，remember 只适合短生命周期的 UI 状态。",
    },
    {
      question: "在移动端开发中，如何处理网络请求时 Activity 销毁导致的上下文泄漏问题？",
      answer: "核心是让请求的生命周期归属于 ViewModel 或明确的后台任务，而不是归属于 Activity。项目的网络调用由仓库层提供挂起函数，ViewModel 用 viewModelScope.launch 发起，页面销毁时 ViewModel 结束，对应协程会取消；UI 侧再用生命周期感知的状态收集。仓库层、网络框架和拦截器不持有 Activity 引用，需要 Context 时只注入 ApplicationContext。必须跨页面或重启继续的同步任务才交给 WorkManager，并且结果通过持久化数据或可观察状态回传。",
    },
    {
      question: "请介绍你在项目中如何设计 RESTful API 的，比如健康记录模块的接口路径、请求方法、参数和返回格式。",
      answer: "我会按资源设计路径和 HTTP 方法。健康测量数据使用 GET /api/health/data/{type} 按类型查询，使用 POST /api/health/data 新增，请求体包含 type、value、unit、measureTime；健康记录使用 GET /api/health/record 查询，PUT /api/health/record 整体更新，字段包括 healthType、allergies、chronicDiseases、medicalHistory、height、weight。接口统一返回 ApiResponse，结构是 { code, message, data }，data 承载具体数据。客户端通过网络框架声明接口，拦截器自动携带认证 Token，并对一次 401 做 refresh 后重试。",
    },
  ],
  skills: ["Kotlin / 协程", "响应式 UI", "MVVM / StateFlow", "Room + 网络请求", "Repository 分层 / 离线降级"],
  dataPoints: [
    "独立完成 6 大功能模块，覆盖全流程 90% 交互",
    "Repository 分层 + 本地缓存，核心模块测试覆盖率 78%",
    "离线降级策略，弱网页面可用性提升至 95%",
    "查询索引与分页缓存，列表滑动帧率 45fps → 60fps",
    "标注 500+ 条对话数据，意图识别精确率提升 12pt",
  ],
};

export function createGenericInterviewExample() {
  return JSON.parse(JSON.stringify(GENERIC_INTERVIEW_EXAMPLE));
}
