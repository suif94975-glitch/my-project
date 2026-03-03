/**
 * 调试脚本：检测 https://www.1ky8jr.vip:9010 并输出前10行原始数据
 * 重点关注 cells[1]（响应IP/解析IP）的实际内容
 */
import puppeteer from 'puppeteer-core';
import dotenv from 'dotenv';
dotenv.config();

const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
const BROWSERLESS_WS = `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`;
const TEST_DOMAIN = 'https://www.1ky8jr.vip:9010';

async function main() {
  console.log(`检测域名: ${TEST_DOMAIN}`);
  const browser = await puppeteer.connect({ browserWSEndpoint: BROWSERLESS_WS });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.itdog.cn/http/', { waitUntil: 'domcontentloaded', timeout: 20000 });

    // 填入域名并提交
    await page.evaluate((domain) => {
      const input = document.querySelector('#check_url') || document.querySelector('input[type="text"]');
      if (input) { input.value = domain; }
      const btn = document.querySelector('#check_btn') || document.querySelector('button[type="submit"]');
      if (btn) btn.click();
    }, TEST_DOMAIN);

    console.log('等待检测完成（60秒）...');
    
    // 等待进度到100%
    let progress = 0;
    let waited = 0;
    while (progress < 100 && waited < 60000) {
      await new Promise(r => setTimeout(r, 2000));
      waited += 2000;
      progress = await page.evaluate(() => {
        const text = document.body.innerText;
        const m = text.match(/(\d+)%/);
        return m ? parseInt(m[1]) : 0;
      });
      console.log(`  进度: ${progress}%`);
    }

    // 提取表头
    const headers = await page.evaluate(() => {
      const table = document.getElementById('simpletable');
      if (!table) return [];
      const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
      if (!headerRow) return [];
      return Array.from(headerRow.querySelectorAll('th, td')).map(el => el.textContent?.trim() || '');
    });
    console.log('\n=== 表头 ===');
    headers.forEach((h, i) => console.log(`  [${i}]: ${h}`));

    // 提取前15行原始数据
    const rawRows = await page.evaluate(() => {
      const table = document.getElementById('simpletable');
      if (!table) return [];
      const rows = Array.from(table.querySelectorAll('tr')).slice(1, 16);
      return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        return cells.map((td, i) => {
          const clone = td.cloneNode(true);
          clone.querySelectorAll('ul, li, div, .dropdown, button').forEach(el => el.remove());
          return { index: i, text: (clone.textContent || '').replace(/\s+/g, ' ').trim() };
        });
      });
    });

    console.log('\n=== 前15行原始数据（重点看 cells[1] 解析IP）===');
    rawRows.forEach((row, ri) => {
      if (row.length < 4) {
        console.log(`\n行 ${ri + 1}: [跳过，列数不足 ${row.length}]`);
        return;
      }
      const node = row[0]?.text || '';
      const ip = row[1]?.text || '';
      const ipLoc = row[2]?.text || '';
      const status = row[3]?.text || '';
      const total = row[4]?.text || '';
      // 截断过长的 node 名（HTTP 响应头行）
      const nodeShort = node.length > 30 ? node.substring(0, 30) + '...' : node;
      console.log(`行 ${ri + 1}: 节点="${nodeShort}" | IP="${ip}" | IP位置="${ipLoc}" | 状态="${status}" | 总耗时="${total}"`);
    });

    // 统计 IP 字段分布
    const ipDistrib = await page.evaluate(() => {
      const table = document.getElementById('simpletable');
      if (!table) return {};
      const rows = Array.from(table.querySelectorAll('tr')).slice(1);
      const ipCount = {};
      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 4) return;
        const clone = cells[1].cloneNode(true);
        clone.querySelectorAll('ul, li, div, .dropdown, button').forEach(el => el.remove());
        const ip = (clone.textContent || '').replace(/\s+/g, ' ').trim();
        if (ip) ipCount[ip] = (ipCount[ip] || 0) + 1;
      });
      return ipCount;
    });
    
    console.log('\n=== IP 分布统计 ===');
    Object.entries(ipDistrib).sort((a, b) => b[1] - a[1]).forEach(([ip, count]) => {
      console.log(`  "${ip}": ${count} 次`);
    });

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
