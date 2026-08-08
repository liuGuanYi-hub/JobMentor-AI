// ui/score-ring.js — 底部得分圆环 + 数字动画

export function animateScore(target, duration = 800) {
  const el = document.getElementById("scoreNum");
  if (!el) return;
  const start = parseInt(el.textContent.replace(/\D/g, ""), 10) || 0;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const current = Math.round(start + (target - start) * eased);
    el.textContent = current;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export function setScore(value) {
  const el = document.getElementById("scoreNum");
  if (!el) return;
  if (typeof value === "number" && !isNaN(value)) {
    animateScore(value);
  } else {
    el.textContent = "--";
  }
}
