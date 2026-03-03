/**
 * 调试脚本：抓取 ITDOG 真实 DOM 表格列结构
 * 运行：node debug-itdog-columns.mjs
 */
import puppeteer from 'puppeteer-core';
import dotenv from 'dotenv';
dotenv.config();

const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
const BROWSERLESS_WS = `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`;
const TEST_DOMAIN = 'https://www.1ky8jr.vip:9010';

async function main() {
  console.log('连接 Browserless...');
  const browser = await puppeteer.connect({ browserWSEndpoint: BROWSERLESS_WS });
  const page = await browser.newPage();

  try {
    console.log('打开 ITDOG...');
    await page.goto('https://www.itdog.cn/http/', { waitUntil: 'domcontentloaded', timeout: 20000 });

    // 填入域名
    await page.evaluate((domain) => {
      const input = document.querySelector('#check_url') || document.querySelector('input[type="text"]');
      if (input) { input.value = domain; }
    }, TEST_DOMAIN);

    // 点击检测按钮
    await page.evaluate(() => {
      const btn = document.querySelector('#check_btn') || document.querySelector('button[type="submit"]');
      if (btn) btn.click();
    });

    console.log('等待结果（30秒）...');
    await new Promise(r => setTimeout(r, 30000));

    // 提取表头
    const headers = await page.evaluate(() => {
      const table = document.getElementById('simpletable');
      if (!table) return [];
      const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
      if (!headerRow) return [];
      return Array.from(headerRow.querySelectorAll('th, td')).map(el => el.textContent?.trim() || '');
    });
    console.log('\n=== 表头列名 ===');
    headers.forEach((h, i) => console.log(`  cells[${i}]: ${h}`));

    // 提取前5行数据（原始文本）
    const rawRows = await page.evaluate(() => {
      const table = document.getElementById('simpletable');
      if (!table) return [];
      const rows = Array.from(table.querySelectorAll('tr')).slice(1, 6);
      return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        return cells.map((td, i) => {
          const clone = td.cloneNode(true);
          clone.querySelectorAll('ul, li, div, .dropdown, button').forEach(el => el.remove());
          return { index: i, text: (clone.textContent || '').replace(/\s+/g, ' ').trim() };
        });
      });
    });

    console.log('\n=== 前5行原始数据 ===');
    rawRows.forEach((row, ri) => {
      console.log(`\n行 ${ri + 1}:`);
      row.forEach(cell => console.log(`  cells[${cell.index}]: "${cell.text}"`));
    });

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
