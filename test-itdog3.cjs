/**
 * ITDOG 评估脚本 v4 - CommonJS格式，监听所有网络请求
 */
const puppeteer = require('./node_modules/puppeteer-core');

const executablePath = '/usr/bin/chromium-browser';
const domain = 'baidu.com';
const url = `https://www.itdog.cn/http/${domain}/`;

console.log(`[ITDOG评估] 访问: ${url}`);

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // 启用 CDP 网络监控
    const client = await page.createCDPSession();
    await client.send('Network.enable');
    
    const wsMessages = [];
    const allRequests = [];
    
    // 监听 WebSocket 帧
    client.on('Network.webSocketFrameReceived', (event) => {
      const payload = event.response.payloadData;
      if (payload && payload.length < 2000) {
        wsMessages.push({ time: Date.now(), data: payload.slice(0, 500) });
      }
    });
    
    client.on('Network.webSocketCreated', (event) => {
      console.log('[WebSocket创建]', event.url);
    });
    
    // 监听所有请求
    page.on('request', req => {
      const reqUrl = req.url();
      const isStatic = /\.(png|jpg|gif|svg|woff|woff2|ttf|ico|css)(\?|$)/.test(reqUrl);
      if (!isStatic) {
        allRequests.push({ url: reqUrl.slice(0, 150), method: req.method(), type: req.resourceType() });
      }
    });
    
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    console.log('\n等待检测（30秒）...');
    
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 5000));
      
      const state = await page.evaluate(() => {
        const rows = document.querySelectorAll('tbody tr');
        return {
          rowCount: rows.length,
          bodySnippet: document.body.innerText.slice(0, 100),
        };
      });
      
      console.log(`[${(i+1)*5}s] 行数: ${state.rowCount} | WS消息: ${wsMessages.length} | 请求数: ${allRequests.length}`);
    }
    
    // 最终状态
    const finalState = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      const rows = document.querySelectorAll('tbody tr');
      return {
        tableCount: tables.length,
        tableHeaders: Array.from(tables).map(t => ({
          id: t.id,
          headers: Array.from(t.querySelectorAll('th')).map(th => th.textContent.trim()),
          rows: t.rows.length,
        })),
        rowCount: rows.length,
        sampleRows: Array.from(rows).slice(0, 3).map(tr => ({
          cells: Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim().slice(0, 80)),
        })),
      };
    });
    
    console.log('\n[最终DOM状态]', JSON.stringify(finalState, null, 2));
    console.log('\n[所有非静态请求]', JSON.stringify(allRequests, null, 2));
    console.log('\n[WebSocket消息总数]', wsMessages.length);
    if (wsMessages.length > 0) {
      console.log('[WebSocket消息样本]', JSON.stringify(wsMessages.slice(0, 5), null, 2));
    }
    
  } catch (err) {
    console.error('[错误]', err.message);
  } finally {
    await browser.close();
  }
})();
