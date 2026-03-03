/**
 * 深度调试 ITDOG IP 列 DOM 结构
 * 检查 cells[1]（响应IP列）的真实 HTML 结构
 */
import puppeteer from 'puppeteer-core';
import * as dotenv from 'dotenv';
dotenv.config();

const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
const BROWSERLESS_WS = `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`;
const TEST_DOMAIN = 'https://www.0wxe2e.vip:9132';

async function main() {
  console.log('[DEBUG] 连接 Browserless...');
  const browser = await puppeteer.connect({ browserWSEndpoint: BROWSERLESS_WS });
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 不拦截资源，让页面完整加载
    console.log('[DEBUG] 访问 ITDOG...');
    await page.goto('https://www.itdog.cn/http/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('#host', { timeout: 15000 });

    // 填入域名
    await page.evaluate((d) => {
      const input = document.getElementById('host');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (setter) setter.call(input, d);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, TEST_DOMAIN);

    // 触发检测
    await page.evaluate(() => {
      if (typeof window.check_form === 'function') {
        window.check_form('fast');
      }
    });

    console.log('[DEBUG] 等待检测结果（30秒）...');
    await new Promise(r => setTimeout(r, 30000));

    // 提取 IP 列的原始 HTML 结构
    const ipCellInfo = await page.evaluate(() => {
      const table = document.getElementById('simpletable');
      if (!table) return { error: 'simpletable not found' };

      const rows = Array.from(table.querySelectorAll('tr'));
      const results = [];

      for (let i = 1; i <= Math.min(10, rows.length - 1); i++) {
        const row = rows[i];
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 2) continue;

        const cell0 = cells[0];
        const cell1 = cells[1]; // IP 列

        results.push({
          rowIndex: i,
          // 节点名（cells[0]）
          cell0_text: cell0.textContent?.replace(/\s+/g, ' ').trim(),
          // IP 列的完整 HTML
          cell1_html: cell1.outerHTML,
          // IP 列的 textContent（不处理）
          cell1_text_raw: cell1.textContent,
          // IP 列的 innerText
          cell1_innerText: cell1.innerText,
          // IP 列去掉 div 后的文本
          cell1_text_no_div: (() => {
            const clone = cell1.cloneNode(true);
            clone.querySelectorAll('div').forEach(el => el.remove());
            return clone.textContent?.replace(/\s+/g, ' ').trim();
          })(),
          // IP 列去掉 ul/li/div/.dropdown/button 后的文本（当前逻辑）
          cell1_text_current: (() => {
            const clone = cell1.cloneNode(true);
            clone.querySelectorAll('ul, li, div, .dropdown, button').forEach(el => el.remove());
            return clone.textContent?.replace(/\s+/g, ' ').trim();
          })(),
          // 直接读取 span 的文本
          cell1_span_texts: Array.from(cell1.querySelectorAll('span')).map(s => s.textContent?.trim()),
          // 直接读取 a 的文本
          cell1_a_texts: Array.from(cell1.querySelectorAll('a')).map(a => a.textContent?.trim()),
          // 子元素列表
          cell1_children: Array.from(cell1.children).map(c => ({
            tag: c.tagName,
            class: c.className,
            text: c.textContent?.replace(/\s+/g, ' ').trim().substring(0, 100),
          })),
        });
      }

      return { rows: results };
    });

    console.log('\n=== IP 列 DOM 结构分析 ===\n');
    if (ipCellInfo.error) {
      console.log('错误:', ipCellInfo.error);
    } else {
      for (const row of ipCellInfo.rows) {
        console.log(`\n--- 行 ${row.rowIndex}: ${row.cell0_text} ---`);
        console.log(`  cell1_text_raw: "${row.cell1_text_raw?.replace(/\s+/g, ' ').trim()}"`);
        console.log(`  cell1_innerText: "${row.cell1_innerText?.replace(/\s+/g, ' ').trim()}"`);
        console.log(`  cell1_text_no_div: "${row.cell1_text_no_div}"`);
        console.log(`  cell1_text_current (去掉ul/li/div/.dropdown/button): "${row.cell1_text_current}"`);
        console.log(`  cell1_span_texts: ${JSON.stringify(row.cell1_span_texts)}`);
        console.log(`  cell1_a_texts: ${JSON.stringify(row.cell1_a_texts)}`);
        console.log(`  cell1_children: ${JSON.stringify(row.cell1_children)}`);
        console.log(`  cell1_html (前200字符): ${row.cell1_html?.substring(0, 200)}`);
      }
    }

  } finally {
    await page.close();
    await browser.close();
    console.log('\n[DEBUG] 完成');
  }
}

main().catch(console.error);
