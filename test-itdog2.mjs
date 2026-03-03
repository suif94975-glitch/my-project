/**
 * ITDOG 评估脚本 v3 - 监听 WebSocket 和 CDP 网络事件
 */
import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';

let executablePath = '/usr/bin/chromium-browser';
try {
  executablePath = execSync('which chromium-browser || which chromium || which google-chrome', { encoding: 'utf8' }).trim().split('\n')[0];
} catch {}

const domain = 'baidu.com';
const url = `https://www.itdog.cn/http/${domain}/`;

console.log(`[ITDOG评估v3] 访问: ${url}`);

const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // 启用 CDP 网络监控（可以捕获 WebSocket 帧）
  const client = await page.createCDPSession();
  await client.send('Network.enable');
  
  const wsMessages = [];
  const xhrResponses = [];
  
  // 监听 WebSocket 帧
  client.on('Network.webSocketFrameReceived', (event) => {
    const payload = event.response.payloadData;
    if (payload && payload.length < 2000) {
      wsMessages.push({ time: Date.now(), data: payload.slice(0, 500) });
    }
  });
  
  // 监听 XHR/Fetch 响应
  client.on('Network.responseReceived', async (event) => {
    const url = event.response.url;
    if (!url.match(/\.(png|jpg|gif|svg|woff|css)(\?|$)/)) {
      xhrResponses.push({ url: url.slice(0, 150), status: event.response.status, type: event.type });
    }
  });

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  
  // 等待检测自动开始
  console.log('等待检测（30秒）...');
  
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 5000));
    
    const state = await page.evaluate(() => {
      const rows = document.querySelectorAll('tbody tr, tr.result-row, [class*="result"] tr');
      const progressText = document.querySelector('[class*="progress"], [id*="progress"], [class*="loading"]')?.textContent?.trim();
      const allText = document.body.innerText.slice(0, 200);
      return { rowCount: rows.length, progressText, allText };
    });
    
    console.log(`[${(i+1)*5}s] 行数: ${state.rowCount} | WS消息: ${wsMessages.length} | XHR: ${xhrResponses.length}`);
    
    if (wsMessages.length > 0) {
      console.log('WebSocket消息样本:', wsMessages.slice(0, 3));
    }
  }
  
  // 最终状态
  const finalState = await page.evaluate(() => {
    const tables = document.querySelectorAll('table');
    const rows = document.querySelectorAll('tbody tr');
    return {
      tableCount: tables.length,
      tableHeaders: Array.from(tables).map(t => ({
        id: t.id,
        headers: Array.from(t.querySelectorAll('th')).map(th => th.textContent?.trim()),
        rows: t.rows.length,
      })),
      rowCount: rows.length,
      sampleRows: Array.from(rows).slice(0, 3).map(tr => ({
        cells: Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim().slice(0, 80)),
      })),
    };
  });
  
  console.log('\n[最终DOM状态]', JSON.stringify(finalState, null, 2));
  console.log('\n[全部XHR请求]', JSON.stringify(xhrResponses, null, 2));
  console.log('\n[WebSocket消息总数]', wsMessages.length);
  if (wsMessages.length > 0) {
    console.log('[WebSocket消息样本]', JSON.stringify(wsMessages.slice(0, 5), null, 2));
  }
  
} catch (err) {
  console.error('[错误]', err.message);
} finally {
  await browser.close();
}
