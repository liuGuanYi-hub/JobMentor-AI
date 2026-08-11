// SilverLink 全量解析本地示例：供演示进度和快速查看使用，不调用 AI。

import { createSilverLinkInterviewExample } from "./silverlink-interview-example.js";

export function createSilverLinkFullAnalysisExample() {
  return {
    jdAnalysis: {
      responsibilities: [
        "参与 Android 客户端核心功能模块的设计、开发与维护",
        "负责移动端性能与稳定性优化，定位 ANR、Crash 等问题",
        "与产品、后端协作完成移动端功能迭代和接口联调",
        "参与客户端架构设计、代码评审和技术方案选型",
      ],
      hardRequirements: [
        "计算机相关专业本科及以上",
        "具备 Android 或 iOS 实际开发经验，能独立完成模块",
        "熟悉 Kotlin 或 Java，了解 Jetpack Compose / React Native",
        "掌握性能优化、架构设计和内存优化基础",
      ],
      hiddenRequirements: [
        "能在移动端、后端和产品之间推进接口与需求落地",
        "能够用数据说明性能改进和功能结果",
        "具备从问题定位到测试验证的完整闭环意识",
      ],
      keywords: ["Android", "Kotlin", "Jetpack Compose", "性能优化", "架构设计", "接口联调", "MVVM"],
      candidateProfile: "能够独立完成 Android 功能模块，理解 Compose 状态管理和客户端分层，同时具备后端接口联调、问题定位和跨团队协作能力的应届候选人。",
      coreCompetencies: [
        { name: "Android / Compose 开发", importance: "高", description: "有 SilverLink 客户端核心模块和 Compose UI 实践。" },
        { name: "分层与状态管理", importance: "高", description: "能使用 ViewModel、Repository、StateFlow 组织业务状态。" },
        { name: "接口与数据链路", importance: "高", description: "理解 Retrofit、RESTful API、Room 缓存和异常回退。" },
        { name: "性能与稳定性意识", importance: "中", description: "有查询优化、离线降级和问题排查的项目证据。" },
      ],
    },
    diagnose: {
      overall: 78,
      dimensions: [
        { name: "Android 项目经历", score: 84, reason: "SilverLink 有客户端核心模块和 Compose UI 证据。" },
        { name: "Kotlin / Compose", score: 82, reason: "技能清单包含 Kotlin、Jetpack Compose、MVVM 和 Repository。" },
        { name: "性能与稳定性", score: 72, reason: "已有查询效率优化，但缺少明确的耗时、Crash 或 ANR 指标。" },
        { name: "协作与工程流程", score: 76, reason: "有接口联调、Git、调试和后端实习经历，仍可补充具体协作结果。" },
      ],
      issues: [
        "Android 项目成果的量化指标还不够集中",
        "性能优化需要补充优化前后对比和验证方式",
        "后端经历与 Android 应聘方向之间的迁移逻辑需要在面试中讲清楚",
      ],
      recommendations: [
        "优先突出 SilverLink 的 Compose、Repository 和离线回退设计",
        "准备一次具体的性能问题定位过程，说明现象、工具、改动和结果",
        "用一条完整功能链路说明从需求、接口、页面到测试的交付过程",
      ],
    },
    matchAnalysis: {
      rows: [
        { jdItem: "Android 客户端核心模块开发", evidence: "SilverLink 独立完成 Android 客户端核心功能模块，并使用 Jetpack Compose 实现 UI。", strength: "强", needsSupplement: false, suggestion: "面试先讲个人负责范围，再补充一个完整模块的实现链路。" },
        { jdItem: "Kotlin / Java 开发能力", evidence: "技能清单包含 Kotlin、Java、Spring Boot，并有 Android 项目实践。", strength: "强", needsSupplement: false, suggestion: "准备 Kotlin 协程、生命周期和 Compose 状态管理的基础题。" },
        { jdItem: "性能优化与稳定性", evidence: "优化健康监测时序数据和服务订单流水查询，具备性能问题意识。", strength: "中", needsSupplement: true, suggestion: "补充查询耗时、数据量、优化前后或验证方法等事实。" },
        { jdItem: "接口联调与后端协作", evidence: "参与前端联调，并有后端工程师实习经历，理解接口和数据链路。", strength: "强", needsSupplement: false, suggestion: "用一个 RESTful API 例子说明参数、返回值和异常处理。" },
        { jdItem: "架构设计与工程实践", evidence: "使用 Repository 分层、离线模拟数据库降级、Git、Linux 和 Docker。", strength: "中", needsSupplement: true, suggestion: "说明为什么分层，以及各层在测试和替换数据源时的作用。" },
      ],
    },
    deepdive: {
      questions: [
        { id: "q1", prompt: "SilverLink 中你负责的 Android 核心模块具体是什么？从页面到数据层如何串起来？", hint: "按 Screen → ViewModel → Repository → Room/Retrofit 说明。", userAnswer: "", refinedBullet: "" },
        { id: "q2", prompt: "健康监测时序数据查询做了什么优化？有没有验证结果？", hint: "补充数据规模、查询路径、缓存策略和验证方式。", userAnswer: "", refinedBullet: "" },
        { id: "q3", prompt: "离线模拟数据库降级在什么情况下触发？如何避免展示错误数据？", hint: "说明远程优先、本地回退、账号隔离和来源标记。", userAnswer: "", refinedBullet: "" },
        { id: "q4", prompt: "你在前后端联调中如何定位接口问题？", hint: "按请求、响应、日志、数据映射和页面状态逐层排查。", userAnswer: "", refinedBullet: "" },
      ],
    },
    optimize: {
      sections: [
        {
          type: "summary",
          title: "Summary · 个人简介",
          items: [{ label: "求职摘要", original: "软件工程本科，做过后端和客户端项目", data: "软件工程本科，具备 Android、后端和 AI 应用工程实践", lead: "主导完成 Android 客户端核心功能并参与接口联调", authentic: "具备 Kotlin / Compose、Repository、Room / Retrofit 实践，能够从需求推进到测试验证", jdAligned: "突出 Android 模块开发、接口联调和问题定位能力" }],
        },
        {
          type: "projectExperience",
          title: "Project Experience · SilverLink 项目经验",
          period: "2024.10 - 2026.06",
          items: [
            { label: "客户端开发", original: "完成 Android 客户端功能", data: "独立完成 Android 客户端核心功能模块并持续迭代", lead: "主导客户端核心模块从页面设计到接口联调的落地", authentic: "基于 Jetpack Compose 实现 Android 客户端核心 UI 与交互流程", jdAligned: "对应 Android 客户端开发、模块设计与功能交付" },
            { label: "数据分层", original: "负责 Repository 分层", data: "建立可替换的数据访问链路，支持远程与本地数据切换", lead: "设计 Repository 分层并推动 Room / Retrofit 数据链路接入", authentic: "通过 Repository 统一远程接口与本地数据访问，降低 UI 对数据源的耦合", jdAligned: "对应架构设计、接口联调和工程效率提升" },
            { label: "离线回退", original: "支持离线模拟数据库降级", data: "网络不可用时保留核心页面和演示数据可用", lead: "主导远程优先、本地回退策略，减少网络异常对展示流程的影响", authentic: "为健康数据和服务流程保留本地回退，并区分数据来源状态", jdAligned: "对应稳定性、问题修复和用户体验保障" },
            { label: "查询优化", original: "优化健康监测数据和订单流水查询", data: "围绕时序数据和订单流水减少重复查询与等待", lead: "定位数据查询瓶颈并调整访问路径与缓存策略", authentic: "优化健康监测时序数据和服务订单流水查询，提升页面加载稳定性", jdAligned: "对应性能优化和工程效率提升" },
            { label: "联调工具", original: "协助前端联调和调试", data: "协助接口联调并完善调试与性能监控工具", lead: "推动接口联调、调试和性能监控工具落地", authentic: "协助前端联调，开发调试与性能监控工具，缩短问题定位路径", jdAligned: "对应接口联调、问题修复和工程效率提升" },
          ],
        },
        {
          type: "projectExperience",
          title: "Project Experience · 辅助智能小组原型 Agent",
          period: "2026.02",
          items: [
            { label: "多 Agent 编排", original: "集成多个 Agent", data: "基于 LangChain + WebClient 集成多 Agent", lead: "设计可热更新的多 Agent 调度策略", authentic: "基于 LangChain + WebClient 集成多 Agent，调度策略可热更新", jdAligned: "对应 AI 应用开发、接口设计和工程协作" },
            { label: "评估体系", original: "完成效果评估", data: "建立数据驱动的召回与精确率评估", lead: "构建数据驱动评估体系并定位效果瓶颈", authentic: "构建数据驱动评估体系，识别召回/精确率提升 12pt", jdAligned: "对应问题分析、数据验证和持续优化" },
          ],
        },
        {
          type: "workExperience",
          title: "Work Experience · 后端工程师实习",
          period: "2026.04 - 2026.07",
          items: [
            { label: "数据处理", original: "参与后端数据聚合服务", data: "参与数据聚合与 ETL 流程重构，吞吐提升 30%", lead: "用 Go 重构 ETL 流程并协助完成服务联调", authentic: "参与后端数据聚合服务开发维护，用 Go 重构 ETL 流程并提升数据吞吐 30%", jdAligned: "证明接口、数据处理、问题分析和工程协作能力" },
            { label: "服务维护", original: "维护数据服务", data: "参与数据聚合服务的开发、维护和问题修复", lead: "协助完成数据服务接口联调与问题修复", authentic: "参与数据聚合服务的开发与维护，涉及 Spark SQL / Flink", jdAligned: "对应后台服务开发、接口联调和问题修复" },
          ],
        },
        {
          type: "skillsAndTools",
          title: "Skills and Tools · 技能与工具",
          items: [{ label: "技术栈", original: "Android、后端、工具", data: "Kotlin / Compose / MVVM / Room / Retrofit / Java / Spring Boot / Go / MySQL / Redis", lead: "能够在移动端与后端之间完成接口和数据链路协作", authentic: "Android：Kotlin、Jetpack Compose、MVVM、Repository、Room、Retrofit；后端：Java、Spring Boot、Go、MySQL、Redis；工具：Git、Linux、Docker", jdAligned: "覆盖岗位要求的编程语言、移动端经验、数据库和 Git 工程实践" }],
        },
      ],
    },
    interview: createSilverLinkInterviewExample(),
  };
}
