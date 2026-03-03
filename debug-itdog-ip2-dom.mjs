/**
 * 调试 ITDOG cells[2]（IP 归属地列）的 DOM 结构
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

    console.log('[DEBUG] 访问 ITDOG...');
    await page.goto('https://www.itdog.cn/http/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('#host', { timeout: 15000 });

    await page.evaluate((d) => {
      const input = document.getElementById('host');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (setter) setter.call(input, d);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, TEST_DOMAIN);

    await page.evaluate(() => {
      if (typeof window.check_form === 'function') window.check_form('fast');
    });

    console.log('[DEBUG] 等待检测结果（30秒）...');
    await new Promise(r => setTimeout(r, 30000));

    const result = await page.evaluate(() => {
      const table = document.getElementById('simpletable');
      if (!table) return { error: 'simpletable not found' };

      const rows = Array.from(table.querySelectorAll('tr'));
      const results = [];

      for (let i = 1; i <= Math.min(5, rows.length - 1); i++) {
        const row = rows[i];
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 3) continue;

        const cell2 = cells[2]; // IP 归属地列

        // 用修复后的逻辑提取 cells[1]
        const cell1 = cells[1];
        const realIpDiv = cell1.querySelector('div[id^="real_ip_"]');
        const ipFixed = realIpDiv
          ? (realIpDiv.textContent || '').replace(/\s+/g, ' ').trim()
          : '';

        results.push({
          rowIndex: i,
          cell0: cells[0].textContent?.replace(/\s+/g, ' ').trim(),
          // cells[1] 修复后的 IP
          cell1_fixed: ipFixed,
          // cells[2] 归属地的各种提取方式
          cell2_html: cell2.outerHTML?.substring(0, 300),
          cell2_text_raw: cell2.textContent?.replace(/\s+/g, ' ').trim(),
          cell2_innerText: cell2.innerText?.replace(/\s+/g, ' ').trim(),
          cell2_text_current: (() => {
            const clone = cell2.cloneNode(true);
            clone.querySelectorAll('ul, li, div, .dropdown, button').forEach(el => el.remove());
            return clone.textContent?.replace(/\s+/g, ' ').trim();
          })(),
          cell2_children: Array.from(cell2.children).map(c => ({
            tag: c.tagName,
            class: c.className,
            id: c.id,
            text: c.textContent?.replace(/\s+/g, ' ').trim().substring(0, 80),
          })),
        });
      }

      return { rows: results };
    });

    console.log('\n=== cells[1] 修复验证 + cells[2] 归属地结构 ===\n');
    if (result.error) {
      console.log('错误:', result.error);
    } else {
      for (const row of result.rows) {
        console.log(`\n--- 行 ${row.rowIndex}: ${row.cell0} ---`);
        console.log(`  cells[1] 修复后 IP: "${row.cell1_fixed}"`);
        console.log(`  cells[2] text_raw: "${row.cell2_text_raw}"`);
        console.log(`  cells[2] innerText: "${row.cell2_innerText}"`);
        console.log(`  cells[2] current_logic: "${row.cell2_text_current}"`);
        console.log(`  cells[2] children: ${JSON.stringify(row.cell2_children)}`);
        console.log(`  cells[2] html: ${row.cell2_html}`);
      }
    }

  } finally {
    await page.close();
    await browser.close();
    console.log('\n[DEBUG] 完成');
  }
}

main().catch(console.error);
