/**
 * 请求安全模块
 * - 每次请求携带时间戳 + HMAC 签名
 * - 反调试：检测开发者工具，检测到后清空页面
 * - 禁用右键菜单和 F12 快捷键（生产环境）
 */

// ─── 请求签名 ─────────────────────────────────────────────────────────────────

const SIGN_SECRET = import.meta.env.VITE_APP_ID || "domain-checker-security";

async function hmacSign(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getRequestHeaders(): Promise<Record<string, string>> {
  const ts = Date.now().toString();
  const nonce = Math.random().toString(36).slice(2, 10);
  const sign = await hmacSign(`${ts}:${nonce}`, SIGN_SECRET);
  return {
    "X-Timestamp": ts,
    "X-Nonce": nonce,
    "X-Sign": sign,
  };
}

// ─── 反调试 ───────────────────────────────────────────────────────────────────

let devtoolsOpen = false;

function detectDevtools() {
  if (import.meta.env.DEV) return; // 开发环境不启用

  const threshold = 160;

  const check = () => {
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;

    if (widthDiff > threshold || heightDiff > threshold) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        handleDevtoolsOpen();
      }
    } else {
      devtoolsOpen = false;
    }
  };

  setInterval(check, 1000);
}

function handleDevtoolsOpen() {
  // 清空页面内容，显示警告
  document.documentElement.innerHTML = `
    <html>
      <head><title>访问受限</title></head>
      <body style="background:#000;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">
        <div style="text-align:center">
          <h2>⚠ 安全警告</h2>
          <p>检测到开发者工具，页面已停止运行。</p>
          <p>请关闭开发者工具后刷新页面。</p>
        </div>
      </body>
    </html>
  `;
}

// ─── 禁用右键和快捷键 ─────────────────────────────────────────────────────────

function disableContextMenu() {
  if (import.meta.env.DEV) return;

  document.addEventListener("contextmenu", e => e.preventDefault());

  document.addEventListener("keydown", e => {
    // 禁用 F12
    if (e.key === "F12") {
      e.preventDefault();
      return;
    }
    // 禁用 Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C
    if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) {
      e.preventDefault();
      return;
    }
    // 禁用 Ctrl+U（查看源码）
    if (e.ctrlKey && e.key.toUpperCase() === "U") {
      e.preventDefault();
      return;
    }
  });
}

// ─── 初始化 ───────────────────────────────────────────────────────────────────

export function initSecurity() {
  detectDevtools();
  disableContextMenu();
}
