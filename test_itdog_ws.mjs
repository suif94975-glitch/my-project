/**
 * 测试 ITDOG WebSocket 消息格式
 */
import puppeteer from 'puppeteer-core';

const CHROMIUM_PATH = '/usr/bin/chromium-browser';
const DOMAIN = 'baidu.com';

async function main() {
  console.log('启动浏览器...');
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1280,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  const client = await page.createCDPSession();
  await client.send('Network.enable');

  const wsMessages = [];

  client.on('Network.webSocketCreated', (event) => {
    console.log('[WS Created]', event.url);
  });

  client.on('Network.webSocketFrameReceived', (event) => {
    const payload = event.response.payloadData;
    if (payload && payload.trim()) {
      try {
        const data = JSON.parse(payload);
        wsMessages.push(data);
        if (wsMessages.length <= 3) {
          console.log(`[WS MSG #${wsMessages.length}]`, JSON.stringify(data));
        }
      } catch {
        if (wsMessages.length < 5) console.log('[WS RAW]', payload.substring(0, 200));
      }
    }
  });

  console.log('访问 ITDOG 主页...');
  await page.goto('https://www.itdog.cn/http/', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const pageInfo = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).map(b => ({ text: b.textContent.trim().substring(0, 30), id: b.id }));
    const inputs = Array.from(document.querySelectorAll('input')).map(i => ({ id: i.id, type: i.type, placeholder: i.placeholder?.substring(0, 50) }));
    return { btns, inputs };
  });
  console.log('按钮:', JSON.stringify(pageInfo.btns));
  console.log('输入框:', JSON.stringify(pageInfo.inputs));

  const inputFilled = await page.evaluate((domain) => {
    const input = document.getElementById('host');
    if (!input) return 'no_input';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, domain);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return 'filled: ' + input.value;
  }, DOMAIN);
  console.log('填写域名:', inputFilled);

  const clicked = await page.evaluate(() => {
    if (typeof check_form === 'function') { check_form('fast'); return 'check_form(fast)'; }
    const btns = Array.from(document.querySelectorAll('button'));
    const fastBtn = btns.find(b => b.textContent.includes('快速') || b.textContent.includes('单次'));
    if (fastBtn) { fastBtn.click(); return 'click: ' + fastBtn.textContent.trim(); }
    return 'no_action';
  });
  console.log('触发检测:', clicked);

  console.log('\n等待检测结果 (60秒)...');
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const progress = await page.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/(\d+)%/);
      return { text: match ? match[0] : '未知', tableRows: document.querySelectorAll('table tr').length };
    });
    console.log(`[${(i+1)*2}s] 进度: ${progress.text}, 表格行数: ${progress.tableRows}, WS消息数: ${wsMessages.length}`);
    if (progress.text === '100%' || (wsMessages.length > 20 && progress.tableRows > 10)) {
      await new Promise(r => setTimeout(r, 3000));
      break;
    }
  }

  console.log('\n=== WebSocket 消息统计 ===');
  console.log('总消息数:', wsMessages.length);
  const types = {};
  for (const msg of wsMessages) {
    const t = msg.type || JSON.stringify(Object.keys(msg)).substring(0, 50);
    types[t] = (types[t] || 0) + 1;
  }
  console.log('消息类型分布:', JSON.stringify(types));
  
  if (wsMessages.length > 0) {
    console.log('\n前3条消息:');
    wsMessages.slice(0, 3).forEach((m, i) => console.log(`  [${i}]`, JSON.stringify(m)));
    if (wsMessages.length > 3) {
      console.log('\n后3条消息:');
      wsMessages.slice(-3).forEach((m, i) => console.log(`  [${wsMessages.length - 3 + i}]`, JSON.stringify(m)));
    }
  }

  const domData = await page.evaluate(() => {
    const tables = document.querySelectorAll('table');
    let maxTable = null, maxRows = 0;
    tables.forEach(t => { const rows = t.querySelectorAll('tr').length; if (rows > maxRows) { maxRows = rows; maxTable = t; } });
    if (!maxTable) return { rows: [], headers: [], totalRows: 0 };
    const allRows = Array.from(maxTable.querySelectorAll('tr'));
    const headers = Array.from(allRows[0]?.querySelectorAll('th,td') || []).map(c => c.textContent.trim());
    const rows = allRows.slice(1, 6).map(row => Array.from(row.querySelectorAll('td')).map(c => c.textContent.trim()));
    return { headers, rows, totalRows: allRows.length - 1 };
  });
  
  console.log('\n=== DOM 表格数据 ===');
  console.log('表头:', JSON.stringify(domData.headers));
  console.log('总行数:', domData.totalRows);
  domData.rows.forEach((row, i) => console.log(`  [${i}]`, JSON.stringify(row)));

  await browser.close();
  console.log('\n完成！');
}

main().catch(console.error);
