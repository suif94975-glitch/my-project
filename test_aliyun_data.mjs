import puppeteer from 'puppeteer-core';
import fs from 'fs';

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium-browser',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1280,900'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

// 拦截所有网络响应，记录API数据
const apiResponses = {};

page.on('response', async (response) => {
  const url = response.url();
  if (url.includes('boce.aliyun.com') && (url.includes('api') || url.includes('data'))) {
    try {
      const text = await response.text();
      if (text && (text.startsWith('{') || text.startsWith('['))) {
        const key = url.replace('https://boce.aliyun.com', '');
        apiResponses[key] = JSON.parse(text);
        console.log('API captured:', key.substring(0, 80));
      }
    } catch {}
  }
});

// 使用 load 而非 networkidle2
await page.goto('https://boce.aliyun.com/detect/http', { waitUntil: 'load', timeout: 60000 });
console.log('Page loaded');

// 等待 input#url1 出现
await page.waitForSelector('#url1', { timeout: 30000 });
console.log('Input found');

// 填写域名
await page.evaluate(() => {
  const input = document.getElementById('url1');
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  if (nativeSetter) nativeSetter.call(input, 'baidu.com');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
});

await new Promise(r => setTimeout(r, 800));

// 点击检测按钮
const clicked = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  const btn = btns.find(b => ['OK', '立即检测', '检测'].includes(b.textContent?.trim()));
  if (btn) { btn.click(); return btn.textContent?.trim(); }
  return null;
});
console.log('Clicked button:', clicked);

// 等待结果（最多70秒）
console.log('Waiting for results...');
let found = false;
for (let i = 0; i < 35; i++) {
  await new Promise(r => setTimeout(r, 2000));
  const rows = await page.evaluate(() => document.querySelectorAll('table tr').length);
  const apiCount = Object.keys(apiResponses).length;
  console.log(`[${(i+1)*2}s] rows: ${rows}, apis: ${apiCount}`);
  if (rows > 10) { found = true; break; }
}

await new Promise(r => setTimeout(r, 3000));

// 保存所有API响应
fs.writeFileSync('/tmp/aliyun_apis.json', JSON.stringify(apiResponses, null, 2));
console.log('\nAPI keys:', Object.keys(apiResponses));

// 从DOM提取表格数据
const tableData = await page.evaluate(() => {
  const tables = document.querySelectorAll('table');
  const result = [];
  tables.forEach((table, idx) => {
    const rows = Array.from(table.querySelectorAll('tr')).map(tr => 
      Array.from(tr.querySelectorAll('td,th')).map(td => td.textContent?.trim())
    );
    if (rows.length > 0) result.push({ tableIdx: idx, rowCount: rows.length, sample: rows.slice(0, 3) });
  });
  return result;
});

console.log('\n=== Tables found ===');
console.log(JSON.stringify(tableData, null, 2));

await browser.close();
console.log('\nDone! Check /tmp/aliyun_apis.json for API data');
