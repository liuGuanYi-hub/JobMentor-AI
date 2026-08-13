// 简历与面试的本地洞察能力：只读当前任务数据，不发起 API 请求。

function asText(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join("\n");
  if (typeof value === "object") return asText(value.text || value.value || value.name || "");
  return String(value);
}

function normalizeText(value) {
  return asText(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function compactText(value) {
  return normalizeText(value).replace(/[^\p{L}\p{N}+#.]/gu, "");
}

function keywordText(keyword) {
  return asText(keyword?.name || keyword?.keyword || keyword?.term || keyword);
}

function selectedItemValue(item) {
  if (!item || typeof item !== "object") return "";
  const variant = item.selectedVariant || "authentic";
  return item[variant] || item.authentic || item.data || item.original || "";
}

/**
 * 收集可展示为证据的文本行，优化结果会被单独标记，避免用户误以为是原始简历内容。
 */
export function collectResumeEvidence({ input = {}, optimize = null } = {}) {
  const sources = [];
  if (input.resumeText) sources.push({ source: "原始简历", text: asText(input.resumeText) });
  if (input.supplement) sources.push({ source: "补充信息", text: asText(input.supplement) });

  for (const section of optimize?.sections || []) {
    for (const item of section.items || []) {
      const value = selectedItemValue(item);
      if (value) sources.push({ source: `优化结果 · ${section.title || "简历内容"}`, text: value });
    }
  }
  return sources;
}

function findEvidence(keyword, sources) {
  const needle = compactText(keyword);
  if (!needle) return null;
  for (const source of sources) {
    const lines = source.text.split(/\r?\n|。|；|;/).map((line) => line.trim()).filter(Boolean);
    const line = lines.find((candidate) => compactText(candidate).includes(needle));
    if (line) return { source: source.source, text: line };
  }
  return null;
}

/**
 * 根据 JD 关键词生成“已覆盖 / 待补证据”的矩阵，供匹配页和本地示例直接使用。
 */
export function buildKeywordCoverage({ keywords = [], input = {}, optimize = null } = {}) {
  const sources = collectResumeEvidence({ input, optimize });
  const items = keywords
    .map(keywordText)
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .filter((keyword, index, list) => list.findIndex((item) => compactText(item) === compactText(keyword)) === index)
    .map((keyword) => {
      const evidence = findEvidence(keyword, sources);
      return {
        keyword,
        covered: Boolean(evidence),
        evidence,
      };
    });
  const coveredCount = items.filter((item) => item.covered).length;
  const total = items.length;
  return {
    items,
    total,
    coveredCount,
    missingCount: total - coveredCount,
    coverageRate: total ? Math.round((coveredCount / total) * 100) : 0,
  };
}

function questionText(question) {
  return typeof question === "string" ? question : question?.question || question?.prompt || "";
}

function questionAnswer(question) {
  return typeof question === "string" ? "" : question?.answer || "";
}

/** 将行为题和专业题整理成稳定 ID，方便训练记录跨刷新保存。 */
export function getInterviewQuestions(interview = {}) {
  const groups = [
    ["behavior", interview.behaviorQuestions || []],
    ["tech", interview.techQuestions || []],
  ];
  return groups.flatMap(([type, list]) => list.map((question, index) => ({
    id: `${type}-${index + 1}`,
    type,
    number: index + 1,
    question: questionText(question),
    answer: questionAnswer(question),
  }))).filter((item) => item.question);
}

function extractTerms(value) {
  const text = normalizeText(value);
  const terms = text.match(/[a-z0-9+#./-]{2,}|[\u4e00-\u9fff]{2,}/g) || [];
  return [...new Set(terms)];
}

function hasAny(value, patterns) {
  return patterns.some((pattern) => pattern.test(value));
}

/**
 * 本地面试回答评分：参考多维教练产品的拆分方式，但不依赖模型和网络。
 * 分数用于练习反馈，不代表真实面试结论。
 */
export function scoreInterviewAnswer(question, answer, { keywords = [] } = {}) {
  const prompt = normalizeText(question);
  const text = normalizeText(answer);
  const length = text.length;
  const star = {
    situation: /背景|场景|当时|项目中|情况/.test(text),
    task: /目标|任务|需要|负责|要求/.test(text),
    action: /我(先|会|负责|采用|通过|使用|设计|实现|定位|处理|拆分)|采取|方案|改为|建立/.test(text),
    result: /结果|提升|降低|减少|增加|完成|验证|最终|最后|因此|达到|改善|稳定|通过测试/.test(text),
  };
  const starCount = Object.values(star).filter(Boolean).length;
  const concrete = hasAny(text, [
    /\d+(?:\.\d+)?\s*(?:%|秒|ms|s|个|次|人|天|年|月|pt)/,
    /20\d{2}/,
    /前后|优化前|优化后|日志|测试|指标|耗时|数据量/,
  ]);
  const technical = hasAny(text, [
    /android|kotlin|compose|viewmodel|stateflow|room|retrofit|hilt|spring boot|langchain/,
    /接口|协程|数据库|缓存|拦截器|repository|restful|api|sql|状态管理/,
  ]);
  const decision = hasAny(text, [/权衡|取舍|原因|为什么|优先|避免|而不是|对比|边界|降级/]);
  const promptTerms = extractTerms(prompt).filter((term) => term.length > 1);
  const answerTerms = new Set(extractTerms(text));
  const keywordTerms = keywords.flatMap(extractTerms);
  const overlap = [...new Set([...promptTerms, ...keywordTerms])].filter((term) => answerTerms.has(term)).length;

  const dimensions = [
    {
      key: "substance",
      label: "内容实质",
      score: Math.min(100, 22 + Math.min(38, Math.round(length * 0.28)) + (technical ? 18 : 0) + (concrete ? 18 : 0)),
      tip: "说明你亲自负责的模块、技术动作和结果，不只复述概念。",
    },
    {
      key: "structure",
      label: "表达结构",
      score: Math.min(100, 28 + starCount * 14 + (/(首先|然后|最后|因此|一是|二是)/.test(text) ? 10 : 0)),
      tip: "按背景、任务、行动、结果组织回答，让面试官容易追问。",
    },
    {
      key: "relevance",
      label: "题目相关",
      score: Math.min(100, 30 + Math.min(45, overlap * 12) + (technical ? 8 : 0)),
      tip: "先正面回答题目，再绑定 SilverLink 的具体页面、类或链路。",
    },
    {
      key: "credibility",
      label: "可信证据",
      score: Math.min(100, 30 + (concrete ? 38 : 0) + (technical ? 18 : 0) + (/(我|我们|负责|实现)/.test(text) ? 12 : 0)),
      tip: "补充数据、日志、测试方式或优化前后对比，避免只有形容词。",
    },
    {
      key: "differentiation",
      label: "个人判断",
      score: Math.min(100, 34 + (decision ? 34 : 0) + (star.action ? 16 : 0) + (star.result ? 16 : 0)),
      tip: "说清楚为什么这样设计、做过什么取舍，以及你的个人贡献。",
    },
  ];
  const overall = Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length);
  const missing = dimensions.filter((item) => item.score < 70).map((item) => item.tip);

  return {
    overall,
    dimensions,
    star,
    missing,
    summary: length < 20
      ? "回答过短，先补齐完整事实，再进行表达优化。"
      : overall >= 80
        ? "回答已经具备较完整的事实、结构和个人判断，可以继续练习口语化表达。"
        : "回答有基础证据，建议按反馈补充结果指标和设计取舍。",
  };
}
