/**
 * ITDOG 评估脚本 v5 - 模拟点击开始检测，监听WebSocket
 */
const puppeteer = require('./node_modules/puppeteer-core');

const executablePath = '/usr/bin/chromium-browser';
const domain = 'baidu.com';

console.log(`[ITDOG评估v5] 测试域名: ${domain}`);

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
    const wsUrls = [];
    const apiRequests = [];
    
    client.on('Network.webSocketCreated', (event) => {
      console.log('[WebSocket创建]', event.url);
      wsUrls.push(event.url);
    });
    
    client.on('Network.webSocketFrameReceived', (event) => {
      const payload = event.response.payloadData;
      if (payload) {
        wsMessages.push(payload.slice(0, 300));
      }
    });
    
    // 监听XHR/Fetch
    client.on('Network.requestWillBeSent', (event) => {
      const url = event.request.url;
      if (event.type === 'XHR' || event.type === 'Fetch') {
        apiRequests.push({ url: url.slice(0, 150), method: event.request.method });
      }
    });
    
    // 先访问 HTTP 检测首页
    await page.goto('https://www.itdog.cn/http/', { waitUntil: 'networkidle0', timeout: 30000 });
    
    // 查看页面上的输入框和按钮
    const formInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
        id: i.id, name: i.name, type: i.type, placeholder: i.placeholder, value: i.value
      }));
      const buttons = Array.from(document.querySelectorAll('button, [type="submit"], [class*="check"], [class*="start"]')).map(b => ({
        id: b.id, text: b.textContent.trim().slice(0, 50), cls: b.className.slice(0, 80), tag: b.tagName
      }));
      return { inputs, buttons };
    });
    
    console.log('\n[表单信息]', JSON.stringify(formInfo, null, 2));
    
    // 尝试填入域名并点击检测
    const inputSelector = 'input[name="host"], input[id="host"], input[placeholder*="域名"], input[placeholder*="domain"], input[type="text"]';
    const btnSelector = 'button[type="submit"], #check_btn, .check_btn, button.btn-primary, [class*="check"]';
    
    try {
      // 填入域名
      await page.waitForSelector(inputSelector, { timeout: 5000 });
      await page.click(inputSelector, { clickCount: 3 });
      await page.type(inputSelector, domain);
      console.log('\n[已填入域名]', domain);
      
      // 点击检测按钮
      await page.waitForSelector(btnSelector, { timeout: 5000 });
      await page.click(btnSelector);
      console.log('[已点击检测按钮]');
    } catch (e) {
      console.log('[无法找到输入框/按钮]', e.message);
      
      // 尝试直接访问带域名的URL
      console.log('\n尝试直接访问带域名的URL...');
      await page.goto(`https://www.itdog.cn/http/${domain}/`, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // 查找并点击检测按钮
      const btnInfo = await page.evaluate(() => {
        const allBtns = Array.from(document.querySelectorAll('button, a[class*="btn"], input[type="submit"]'));
        return allBtns.map(b => ({
          text: b.textContent.trim().slice(0, 50),
          cls: b.className.slice(0, 80),
          id: b.id,
          tag: b.tagName,
        }));
      });
      console.log('[页面按钮]', JSON.stringify(btnInfo, null, 2));
    }
    
    // 等待检测结果
    console.log('\n等待检测结果（45秒）...');
    for (let i = 0; i < 9; i++) {
      await new Promise(r => setTimeout(r, 5000));
      
      const state = await page.evaluate(() => {
        const rows = document.querySelectorAll('tbody tr');
        return {
          rowCount: rows.length,
          url: window.location.href,
        };
      });
      
      console.log(`[${(i+1)*5}s] 行数: ${state.rowCount} | WS消息: ${wsMessages.length} | XHR: ${apiRequests.length} | URL: ${state.url.slice(0, 80)}`);
      
      if (state.rowCount > 0 || wsMessages.length > 5) break;
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
    console.log('\n[WebSocket URLs]', wsUrls);
    console.log('[WebSocket消息总数]', wsMessages.length);
    if (wsMessages.length > 0) {
      console.log('[WebSocket消息样本]', JSON.stringify(wsMessages.slice(0, 5), null, 2));
    }
    console.log('\n[XHR/Fetch请求]', JSON.stringify(apiRequests, null, 2));
    
  } catch (err) {
    console.error('[错误]', err.message);
  } finally {
    await browser.close();
  }
})();
