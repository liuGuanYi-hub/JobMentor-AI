// SilverLink 项目面试示例答案：仅供本地示例展示，不调用 AI。

export const SILVERLINK_INTERVIEW_EXAMPLE = {
  sourceLabel: "SilverLink 项目本地示例答案",
  selfIntro: "我是一名软件工程本科生，主要做过 SilverLink 适老化社区养老平台。项目采用 Kotlin、Jetpack Compose、ViewModel、StateFlow、Room、Retrofit 和 Hilt，围绕老人、家属和管理端打通健康记录、服务订单和家属关怀流程。我在项目中重点关注角色隔离、远程接口与本地演示回退、健康数据展示以及 Compose 状态管理，希望在 Android 开发岗位继续把移动端功能做得稳定、清晰、可维护。",
  behaviorQuestions: [
    {
      question: "在SilverLink项目中，你负责了Android端核心开发，能分享一下你是如何设计和实现那三类角色（老人、家属、管理员）的权限隔离的吗？",
      answer: "我采用了“前端导航隔离 + 后端接口隔离 + 资源归属校验”三层做法。Android 端从 SessionManager 读取角色，MainActivity 根据 ELDER、FAMILY、ADMIN 选择不同的底部导航和首页入口，避免用户在界面上进入不相关模块。后端通过 AuthInterceptor 解析 Bearer 会话，再由 RoleAccessPolicy 对 /api/family、/api/manager 等路径做角色判断：家属接口只允许 FAMILY，管理端接口只允许 ADMIN，服务待办再单独允许 ADMIN 或 STAFF。最后，家属查看老人时还使用老人 ID 做资源范围校验，不能只依赖前端隐藏按钮。",
    },
    {
      question: "你在开发中遇到过最棘手的技术问题是什么？你是如何定位并解决的？",
      answer: "项目里比较棘手的是远程接口不可用时，页面不能直接变成空白，同时还要避免把不同账号的本地数据混在一起。我先把问题拆成网络层、数据层和 UI 状态层：HealthRepository 统一封装 Retrofit 异常，HealthViewModel 用 HealthSyncPolicy 标记数据来源；远程成功后写入 Room，失败时继续观察按 userId 隔离的本地数据。健康档案也采用同样的远程优先、本地回退策略。定位时我重点检查日志、返回状态和 Room 查询账号范围，而不是在页面里到处补 if。这样既能离线演示，也能明确告诉用户当前看到的是远程数据还是本地回退数据。",
    },
    {
      question: "当你和产品经理对一个功能需求有不同理解时，你会怎么处理？可以举一个具体的例子。",
      answer: "我会先把分歧从“感觉不同”转成可验证的验收条件。比如健康记录需求如果只说“支持查看健康情况”，我会和产品确认是只看最新值，还是还要趋势、风险提示、风险确认和离线查看；再用一个小流程图或 Compose 原型确认。若时间有限，我会把“记录最新值和查看历史”放进第一版，把复杂的实时告警或第三方设备接入拆到后续，并把取舍写进接口和测试清单。这样既保证当前版本可交付，也避免开发完成后才发现双方对结果的定义不一致。",
    },
    {
      question: "在时间紧任务重的情况下，你如何保证项目按时交付？你会优先做什么？",
      answer: "我会先按用户闭环排优先级，而不是按页面数量排优先级。SilverLink 中我会优先保证登录、角色进入正确首页、健康记录或服务提交、管理端接收待办这条主链路，再补同步、异常回退和关键空态；支付通道、动画和非核心视觉细节可以后置。执行上采用垂直切片，每完成一条链路就做一次最小验证，同时先锁定 Retrofit 数据契约，网络不可用时用明确的本地演示回退保证页面可看。若仍然超时，就及时同步删减范围和剩余风险，不把问题拖到最后一天。",
    },
    {
      question: "你之前实习主要是后端，现在应聘安卓开发，你如何快速适应移动端的开发节奏？你做了哪些准备？",
      answer: "后端经验让我熟悉接口、数据模型、异常处理和业务边界，但 Android 还必须补上生命周期、UI 状态和设备环境这几类能力。我在 SilverLink 中按一条完整竖切片来适应：先用 Compose 做页面，再用 ViewModel 和 StateFlow 管状态，用 Retrofit 对接接口，用 Room 做本地缓存，最后处理网络失败、旋转和返回栈。准备过程中我重点练习了 Kotlin 协程、Compose 重组、Navigation、Hilt 注入和 Android 模拟器调试，而不是只停留在把后端接口搬到页面上。",
    },
  ],
  techQuestions: [
    {
      question: "请简述Activity的生命周期，并说明在屏幕旋转、后台切换时Activity会经历哪些回调？",
      answer: "典型启动顺序是 onCreate、onStart、onResume；进入后台通常会经历 onPause、onStop，回到前台再经过 onRestart、onStart、onResume。屏幕旋转属于配置变化，默认会销毁旧 Activity 并创建新实例，常见顺序是 onPause、onSaveInstanceState、onStop、onDestroy，然后新实例重新走 onCreate、onStart、onResume。SilverLink 使用单 Activity 承载 Compose 导航，页面状态放在 ViewModel/StateFlow，持久数据放在 Room 或 DataStore；这样旋转时不会把业务状态只绑在 Activity 对象上。",
    },
    {
      question: "Kotlin协程中的launch和async有什么区别？你会在什么场景下使用async？",
      answer: "launch 返回 Job，适合执行不需要返回值的任务，例如 SilverLink 中 ViewModel 使用 viewModelScope.launch 加载数据、保存记录或更新 UI 状态；async 返回 Deferred，适合并发执行并需要通过 await 取得结果的任务。比如家属页同时请求老人摘要、近 7 日周报和用药依从性时，如果这些请求彼此独立，可以在同一个结构化协程中用 async，再用 await 或 awaitAll 汇总。若后一个请求依赖前一个结果，或者并发没有收益，就按顺序执行，避免为了使用 async 增加复杂度。",
    },
    {
      question: "你在SilverLink项目中使用了Jetpack Compose，请说说Compose和传统View系统在UI刷新方式上的主要区别。",
      answer: "传统 View 通常是命令式地找到控件，再手动 setText、notifyDataSetChanged 或修改可见性；Compose 是声明式的，UI 是状态的函数，状态变化后框架只重组受影响的部分。SilverLink 里 Screen 通过 collectAsState 观察 ViewModel 的 StateFlow，健康数据、登录角色和加载状态变化后自动刷新对应 Composable，不需要在 Activity 里手动操作控件。需要注意的是，Compose 并不意味着所有状态都放在 Composable 内，业务状态仍应放在 ViewModel，remember 只适合短生命周期的 UI 状态。",
    },
    {
      question: "在Android开发中，如何处理网络请求时Activity销毁导致的上下文泄漏问题？",
      answer: "核心是让请求的生命周期归属于 ViewModel 或明确的后台任务，而不是归属于 Activity。SilverLink 的网络调用由 Repository 提供 suspend 函数，ViewModel 用 viewModelScope.launch 发起，页面销毁时 ViewModel 结束，对应协程会取消；UI 侧再用生命周期感知的 StateFlow 收集。Repository、Retrofit 和拦截器不持有 Activity 引用，需要 Context 时只注入 ApplicationContext。必须跨页面或重启继续的同步任务才交给 WorkManager，并且结果通过持久化数据或可观察状态回传。",
    },
    {
      question: "请介绍你在项目中如何设计RESTful API的，比如健康档案模块的接口路径、请求方法、参数和返回格式。",
      answer: "我会按资源设计路径和 HTTP 方法。健康测量数据使用 GET /api/health/data/{type} 按 BLOOD_PRESSURE、BLOOD_SUGAR 等类型查询，使用 POST /api/health/data 新增，请求体包含 type、value、unit、measureTime；健康档案使用 GET /api/health/record 查询，PUT /api/health/record 整体更新，字段包括 bloodType、allergies、chronicDiseases、medicalHistory、height、weight。接口统一返回 ApiResponse，结构是 { code, message, data }，data 承载 HealthData 或 HealthRecord。客户端通过 Retrofit 声明接口，AuthHeaderInterceptor 自动携带 Bearer Token，并对一次 401 做 refresh 后重试。",
    },
  ],
  skills: ["Kotlin / 协程", "Jetpack Compose", "MVVM / StateFlow", "Room + Retrofit", "角色权限与本地回退"],
  dataPoints: [
    "单 Activity + Compose Navigation，按 ELDER / FAMILY / ADMIN 切换入口",
    "健康数据与健康档案采用 Retrofit 远程优先、Room 本地回退",
    "后端使用 AuthInterceptor + RoleAccessPolicy 做角色路径边界",
    "健康接口覆盖数据查询、新增、档案查询更新、风险确认和用药提醒",
    "网络客户端配置超时、并发上限和一次 401 refresh 重试",
  ],
};

export function createSilverLinkInterviewExample() {
  return JSON.parse(JSON.stringify(SILVERLINK_INTERVIEW_EXAMPLE));
}
