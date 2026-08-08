// content.js — 页面内脚本：提供选中文本的快捷发送能力

// 监听右键菜单由 background 的 contextMenus 处理（selection 场景）
// 这里额外提供：双击选中文本时在右上角显示浮动按钮（可选增强）

(() => {
  let floatBtn = null;

  function showFloatBtn(rect, text) {
    if (!text || text.length < 20) return;
    removeFloatBtn();

    floatBtn = document.createElement("button");
    floatBtn.textContent = "✨ 发到简历专家";
    floatBtn.style.cssText = `
      position: fixed;
      left: ${Math.min(rect.left, window.innerWidth - 160)}px;
      top: ${rect.bottom + 8}px;
      z-index: 2147483647;
      background: linear-gradient(135deg, #6B7BFF, #8E6BFF);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 13px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(91, 108, 255, .35);
    `;
    floatBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_APP_WITH_JD", jd: text });
      removeFloatBtn();
    });
    document.body.appendChild(floatBtn);
  }

  function removeFloatBtn() {
    if (floatBtn) {
      floatBtn.remove();
      floatBtn = null;
    }
  }

  document.addEventListener("mouseup", () => {
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        removeFloatBtn();
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 20) {
        removeFloatBtn();
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      showFloatBtn(rect, text);
    }, 10);
  });

  document.addEventListener("scroll", removeFloatBtn, { passive: true });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") removeFloatBtn();
  });
})();
