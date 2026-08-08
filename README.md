# 简历专家 · JD 定制简历优化 Agent

> 基于目标岗位 JD · 诊断 · 匹配 · 优化 · 面试准备

纯前端单页应用，由 DeepSeek 驱动的 8 步简历定制流程。最终产出多模板简历 + 完整面试准备材料。

## 快速开始

### 1. 启动本地服务（必须）

由于使用了 ES Module 和第三方 CDN，**不能直接双击 `index.html` 打开**，必须走 HTTP 协议：

```bash
# 任选一种
python -m http.server 8080
# 或
npx serve .
# 或
npx http-server -p 8080
# 或（项目自带，推荐）
node dev-server.mjs
# 默认 8765 端口，可用环境变量改：PORT=9000 node dev-server.mjs
```

打开浏览器访问 `http://localhost:8080` 即可。

### 2. 设置 DeepSeek API Key

- 点击右上角「未设置」按钮
- 输入 DeepSeek API Key（[DeepSeek 开放平台](https://platform.deepseek.com/) 注册即送额度）
- Key 仅保存在本机 localStorage，不会上传任何服务器
- 模型：`deepseek-chat`（默认）

## 功能亮点

- **8 步完整流程**：输入材料 → JD 解析 → 简历诊断 → 匹配分析 → 经历追问 → 简历优化 → 面试准备 → 最终简历
- **多任务管理**：本地保存多份分析任务（不同岗位/公司），可新建/切换/重命名/删除，数据完全隔离
- **简历版本对比**：同一份简历保存多个定制版本（不同岗位方向），并排 diff 对比，一键应用
- **隐私脱敏**：手机号 / 邮箱 / 身份证 自动替换为占位符，AI 返回后还原
- **多模板导出**：5 套简历模板（时间轴 / 经典 / 双栏 / GitHub / AI）+ 主题色 + 头像
- **多种导出格式**：复制精简文本 / 导出 PDF / 导出 Word / 全量综合报告 PDF / JD 解析 PDF
- **PDF / Word 简历解析**：前端本地解析，不上传服务器
- **状态恢复**：未完成的进度自动保存到 localStorage，下次打开可恢复
- **API Key 连通性测试**：设置 Key 时可一键验证网络可达性
- **浏览器插件联动**：Chrome 插件选中网页 JD 一键发送到本地应用（见 `extension/`）

## 技术栈

- 纯前端：HTML + ES Module + 原生 JS
- 无构建步骤，浏览器直接运行
- UI 库：lucide 图标（CDN）
- PDF 解析：pdfjs-dist（CDN）
- DOCX 解析：mammoth.js（CDN）
- PDF 导出：html2canvas + jspdf（CDN）
- Word 导出：docx.js（CDN）
- AI：DeepSeek API（用户自带 Key）
- 浏览器插件：Chrome Extension MV3

## 文件结构

```
JobMentor AI/
├── index.html                  # 单页入口
├── dev-server.mjs              # 本地静态服务器（node 自带）
├── README.md                   # 本文档
├── css/
│   ├── base.css                # 变量、reset、字体
│   ├── layout.css              # 整体栅格
│   ├── components.css          # 通用组件
│   ├── steps.css               # 8 步专属样式
│   └── templates.css           # 5 套简历模板样式
└── js/
    ├── app.js                  # 入口
    ├── store.js                # localStorage 状态
    ├── router.js               # 步骤路由
    ├── privacy.js              # 隐私脱敏
    ├── ai/
    │   ├── deepseek.js         # API 客户端
    │   └── prompts.js          # 8 步 Prompt 模板
    ├── parsers/
    │   ├── pdf.js              # PDF 解析
    │   └── docx.js             # DOCX 解析
    ├── export/
    │   ├── pdf.js              # PDF 导出 + 报告 HTML 构建
    │   ├── docx.js             # Word 导出
    │   └── report.js           # 全量综合报告导出（复用入口）
    ├── ui/
    │   ├── toast.js
    │   ├── modal.js
    │   ├── score-ring.js
    │   ├── progress.js
    │   └── taskbar.js           # 顶部任务下拉菜单（多任务管理）
    └── steps/
        ├── step1-input.js      # 输入材料
        ├── step2-jd-parse.js   # JD 解析
        ├── step3-diagnose.js   # 简历诊断
        ├── step4-match.js      # 匹配分析
        ├── step5-deepdive.js   # 经历追问
        ├── step6-optimize.js   # 简历优化
        ├── step7-interview.js  # 面试准备
        └── step8-final.js      # 最终简历（含版本管理）
extension/                      # Chrome 浏览器插件（独立子工程）
├── manifest.json               # MV3 清单
├── background.js               # 右键菜单 → 打开本地应用
├── content.js                  # 选中文本浮动按钮
├── popup.html / popup.js       # 插件弹窗
└── icons/                      # 16/48/128 图标
```

## 浏览器插件安装（可选）

1. 先启动本地应用：`node dev-server.mjs`
2. 打开 Chrome → `chrome://extensions` → 打开「开发者模式」
3. 点击「加载已解压的扩展程序」→ 选择本项目的 `extension/` 目录
4. 在招聘网站（BOSS直聘 / 拉勾等）选中 JD 文本：
   - 方式一：右键 → 「发送到简历专家生成定制简历」
   - 方式二：选中后点击页面上的 ✨ 浮动按钮
5. 浏览器自动打开本地应用，JD 已自动填入输入框

## 开发备注

- 所有 AI 调用走 DeepSeek `deepseek-chat` 模型
- 强制 JSON 输出模式 + 失败自动重试
- localStorage key：`jobmentor-ai-v1`（v2 结构：多任务 + 多版本）
- 数据隔离：所有用户数据存在本机，不上传服务器
- 浏览器自动化测试（可选）：`npm i -D @playwright/cli` 后
  `playwright-cli open http://localhost:8765 --browser=chrome` 可做端到端验证
- API Key：仅 localStorage 直存（注意个人使用，不要分享 state）
- 插件 → 本地应用参数：`http://localhost:8765/?jd=<编码后的 JD 文本>`
