/**
 * 直接调用 ITDOG 检测接口，验证 IP 字段是否正确返回
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

    console.log('等待检测完成...');
    
    // 等待进度到100%
    let progress = 0;
    let waited = 0;
    while (progress < 100 && waited < 90000) {
      await new Promise(r => setTimeout(r, 3000));
      waited += 3000;
      progress = await page.evaluate(() => {
        const text = document.body.innerText;
        const m = text.match(/(\d+)%/);
        return m ? parseInt(m[1]) : 0;
      });
      const rowCount = await page.evaluate(() => {
        const table = document.getElementById('simpletable');
        if (!table) return 0;
        return table.querySelectorAll('tr').length - 1;
      });
      console.log(`  进度: ${progress}%, 行数: ${rowCount}`);
      if (progress >= 100) break;
    }

    // 提取所有行数据（模拟我们的 parseDomRow 逻辑）
    const rows = await page.evaluate(() => {
      const table = document.getElementById('simpletable');
      if (!table) return [];
      const allRows = Array.from(table.querySelectorAll('tr')).slice(1);
      return allRows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 5) return null;
        return cells.map((td, i) => {
          const clone = td.cloneNode(true);
          clone.querySelectorAll('ul, li, div, .dropdown, button').forEach(el => el.remove());
          return (clone.textContent || '').replace(/\s+/g, ' ').trim();
        });
      }).filter(Boolean);
    });

    console.log(`\n=== 共 ${rows.length} 行数据 ===`);
    
    // 统计 IP 字段
    const ipSet = new Set();
    const emptyIpRows = [];
    const validRows = [];
    
    rows.forEach((cells, i) => {
      const node = cells[0] || '';
      const ip = cells[1] || '';
      const status = cells[3] || '';
      const total = cells[4] || '';
      
      // 跳过 HTTP 响应头展开行（节点名过长）
      if (node.length > 50) return;
      
      if (!ip || ip === '–' || ip === '-') {
        emptyIpRows.push({ node, ip, status });
      } else {
        ipSet.add(ip);
        validRows.push({ node, ip, status, total });
      }
    });
    
    console.log(`\n有效行（有IP）: ${validRows.length}`);
    console.log(`无IP行: ${emptyIpRows.length}`);
    
    console.log('\n=== 前10行有效数据 ===');
    validRows.slice(0, 10).forEach(r => {
      console.log(`  节点: ${r.node.padEnd(20)} | IP: ${r.ip.padEnd(20)} | 状态: ${r.status} | 耗时: ${r.total}`);
    });
    
    console.log('\n=== IP 分布 ===');
    ipSet.forEach(ip => console.log(`  ${ip}`));
    
    if (emptyIpRows.length > 0) {
      console.log('\n=== 无IP的行（前5条）===');
      emptyIpRows.slice(0, 5).forEach(r => {
        console.log(`  节点: "${r.node.substring(0, 30)}" | IP: "${r.ip}" | 状态: "${r.status}"`);
      });
    }

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
