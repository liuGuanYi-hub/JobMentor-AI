// background.js — 插件后台：注册右键菜单 + 打开本地应用

const APP_URL = "http://localhost:8765";
const MENU_ID = "send-jd-to-resume-expert";

// 安装/更新时注册菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "发送到「简历专家」生成定制简历",
    contexts: ["selection"],
  });
});

// 点击菜单
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  if (!info.selectionText) return;

  const jd = info.selectionText.trim();
  if (!jd) return;

  // 打开本地应用并携带 JD 参数
  const url = `${APP_URL}/?jd=${encodeURIComponent(jd)}`;
  chrome.tabs.create({ url });
});

// 监听 content script 请求（备用通道）
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "OPEN_APP_WITH_JD") {
    const jd = (msg.jd || "").trim();
    const url = `${APP_URL}/?jd=${encodeURIComponent(jd)}`;
    chrome.tabs.create({ url });
    sendResponse({ ok: true });
  }
  return true;
});
