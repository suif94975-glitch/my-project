/**
 * Browserless 并行压力测试（使用 puppeteer-core）
 * 目标：找到最大稳定并行数（不出现 detached Frame / Target closed 的最大值）
 *
 * 运行方式：npx tsx test-bl-concurrency.ts
 */

import puppeteer from 'puppeteer-core';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const TOKEN = process.env.BROWSERLESS_TOKEN;
if (!TOKEN) {
  console.error('BROWSERLESS_TOKEN not found in .env');
  process.exit(1);
}

const WS_ENDPOINT = `wss://chrome.browserless.io?token=${TOKEN}&timeout=30000`;

/**
 * 单个 Browserless 连接测试
 * 连接 → 打开新页面 → 导航到 about:blank → 保持 holdMs → 关闭
 */
async function testSingleConnection(id: number, holdMs: number = 4000): Promise<{
  id: number;
  success: boolean;
  error: string | null;
  durationMs: number;
}> {
  const startTime = Date.now();
  let browser: any = null;

  try {
    browser = await puppeteer.connect({
      browserWSEndpoint: WS_ENDPOINT,
      defaultViewport: null,
    });

    const page = await browser.newPage();
    await page.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: 10000 });

    // 保持连接 holdMs
    await new Promise(r => setTimeout(r, holdMs));

    await page.close();
    browser.disconnect();

    return { id, success: true, error: null, durationMs: Date.now() - startTime };
  } catch (err: any) {
    if (browser) {
      try { browser.disconnect(); } catch {}
    }
    return { id, success: false, error: err.message?.substring(0, 80) || 'unknown', durationMs: Date.now() - startTime };
  }
}

/**
 * 测试指定并行数的成功率
 */
async function testConcurrency(n: number, holdMs: number = 4000) {
  console.log(`\n测试并行数 N=${n}（每个连接保持 ${holdMs}ms）...`);
  const promises = Array.from({ length: n }, (_, i) => testSingleConnection(i + 1, holdMs));
  const results = await Promise.all(promises);

  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success);
  const successRate = parseFloat((succeeded / n * 100).toFixed(1));

  const errorTypes: Record<string, number> = {};
  for (const f of failed) {
    const key = !f.error ? 'unknown'
      : f.error.includes('timeout') ? 'timeout'
      : f.error.includes('detached') ? 'detached Frame'
      : f.error.includes('closed') || f.error.includes('Target closed') ? 'Target closed'
      : f.error.includes('429') ? '429 Too Many'
      : f.error.includes('403') ? '403 Forbidden'
      : f.error.includes('ECONNREFUSED') ? 'ECONNREFUSED'
      : f.error.substring(0, 50);
    errorTypes[key] = (errorTypes[key] || 0) + 1;
  }

  const avgDuration = Math.round(results.reduce((s, r) => s + r.durationMs, 0) / n);

  console.log(`  成功: ${succeeded}/${n} (${successRate}%), 平均耗时: ${avgDuration}ms`);
  if (Object.keys(errorTypes).length > 0) {
    console.log(`  错误类型:`, errorTypes);
    for (const f of failed.slice(0, 3)) {
      console.log(`    [conn-${f.id}] ${f.error}`);
    }
  }

  return { n, succeeded, failed: n - succeeded, successRate, errorTypes, avgDuration };
}

async function main() {
  console.log('=== Browserless 并行压力测试 ===');
  console.log(`测试时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('');

  const allResults: any[] = [];

  // 测试序列：3, 5, 8, 10, 12, 15, 18, 20, 25, 30
  const testLevels = [3, 5, 8, 10, 12, 15, 18, 20, 25, 30];

  for (const n of testLevels) {
    const result = await testConcurrency(n, 4000);
    allResults.push(result);

    // 如果成功率低于 80%，停止测试
    if (result.successRate < 80) {
      console.log(`\n⚠️  N=${n} 成功率 ${result.successRate}% < 80%，停止增加并行数`);
      break;
    }

    // 两轮测试之间等待 5 秒，让 Browserless 恢复
    if (n < testLevels[testLevels.length - 1]) {
      console.log(`  等待 5s 让 Browserless 恢复...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log('\n=== 测试结果汇总 ===');
  console.log('并行数 | 成功率  | 平均耗时 | 状态');
  console.log('-------|---------|----------|-----');
  for (const r of allResults) {
    const status = r.successRate >= 95 ? '✅ 稳定' : r.successRate >= 80 ? '⚠️ 可用' : '❌ 不稳定';
    console.log(`  ${String(r.n).padEnd(4)} | ${String(r.successRate).padStart(5)}%  | ${String(r.avgDuration).padStart(6)}ms | ${status}`);
  }

  // 找到最佳并行数（成功率 >= 95% 的最大值）
  const stable = allResults.filter(r => r.successRate >= 95);
  const bestN = stable.length > 0 ? stable[stable.length - 1].n : allResults[0]?.n || 5;

  const schedulerN = Math.floor(bestN * 0.7);  // 70% 给定时任务
  const normalN = bestN;                         // 100% 给普通任务（无定时任务时）
  const normalWhenScheduler = Math.ceil(bestN * 0.3); // 30% 给普通任务（有定时任务时）

  console.log(`\n✅ 推荐最佳并行数: ${bestN}（成功率 ≥ 95% 的最大值）`);
  console.log(`   MAX_CONCURRENT (总上限):                ${bestN}`);
  console.log(`   SCHEDULER_SLOTS (定时任务专用 70%):     ${schedulerN}`);
  console.log(`   NORMAL_SLOTS_WHEN_SCHEDULER (普通 30%): ${normalWhenScheduler}`);
  console.log(`   普通任务无定时任务时上限 (100%):         ${normalN}`);

  // 写入结果文件
  const output = { results: allResults, bestN, schedulerN, normalN, normalWhenScheduler };
  fs.writeFileSync('/tmp/browserless-concurrency-result.json', JSON.stringify(output, null, 2));
  console.log('\n结果已写入 /tmp/browserless-concurrency-result.json');
}

main().catch(console.error);
