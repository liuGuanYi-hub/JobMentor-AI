// popup.js — 插件弹窗逻辑

const APP_URL = "http://localhost:8765";

document.getElementById("openApp").addEventListener("click", async () => {
  const statusEl = document.getElementById("status");
  statusEl.textContent = "检测本地服务…";
  statusEl.className = "status";

  try {
    // 探测本地应用是否在运行
    const resp = await fetch(`${APP_URL}/index.html`, { method: "HEAD" });
    if (resp.ok) {
      chrome.tabs.create({ url: APP_URL });
      statusEl.textContent = "✓ 已打开简历专家";
      statusEl.className = "status ok";
    } else {
      statusEl.textContent = "✗ 本地服务未就绪（HTTP " + resp.status + "）";
      statusEl.className = "status err";
    }
  } catch (e) {
    statusEl.textContent = "✗ 无法连接本地服务，请先运行 node dev-server.mjs";
    statusEl.className = "status err";
  }
});
