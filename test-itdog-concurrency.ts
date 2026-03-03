/**
 * ITDOG 真实检测并行压力测试
 * 目标：找到 ITDOG 检测场景下的最大稳定并行数
 *
 * 测试策略：
 * - 每轮测试 N 个并行 ITDOG 检测（使用 enqueueItdogCheck）
 * - 统计成功率、错误类型、平均耗时
 * - 从 N=3 开始，逐步增加到 N=20
 *
 * 注意：每轮测试间隔 10 秒，避免影响正常服务
 */

import { enqueueItdogCheck } from './server/itdog-puppeteer';
import * as dotenv from 'dotenv';

dotenv.config();

// 测试域名（使用简单快速的域名）
const TEST_DOMAINS = [
  'https://www.baidu.com',
  'https://www.qq.com',
  'https://www.163.com',
  'https://www.jd.com',
  'https://www.taobao.com',
];

/**
 * 单个 ITDOG 检测测试
 */
async function testSingleItdog(id: number, domain: string): Promise<{
  id: number;
  domain: string;
  success: boolean;
  error: string | null;
  durationMs: number;
  rows: number;
  failed: number;
  avgTimeMs: number;
}> {
  const startTime = Date.now();
  try {
    const result = await enqueueItdogCheck(domain, 0); // priority=0 普通任务
    return {
      id,
      domain,
      success: true,
      error: null,
      durationMs: Date.now() - startTime,
      rows: result.summary.total,
      failed: result.summary.failed,
      avgTimeMs: result.summary.avgTimeMs,
    };
  } catch (err: any) {
    return {
      id,
      domain,
      success: false,
      error: err.message?.substring(0, 80) || 'unknown',
      durationMs: Date.now() - startTime,
      rows: 0,
      failed: 0,
      avgTimeMs: 0,
    };
  }
}

/**
 * 测试指定并行数的成功率
 */
async function testConcurrency(n: number) {
  console.log(`\n测试并行数 N=${n}（真实 ITDOG 检测）...`);
  
  // 循环使用测试域名
  const tasks = Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    domain: TEST_DOMAINS[i % TEST_DOMAINS.length],
  }));
  
  const promises = tasks.map(t => testSingleItdog(t.id, t.domain));
  const results = await Promise.all(promises);

  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success);
  const successRate = parseFloat((succeeded / n * 100).toFixed(1));

  const errorTypes: Record<string, number> = {};
  for (const f of failed) {
    const key = !f.error ? 'unknown'
      : f.error.includes('timeout') ? 'timeout'
      : f.error.includes('detached') || f.error.includes('Detached') ? 'detached Frame'
      : f.error.includes('closed') || f.error.includes('Target closed') ? 'Target closed'
      : f.error.includes('0 行') ? '提取0行'
      : f.error.substring(0, 50);
    errorTypes[key] = (errorTypes[key] || 0) + 1;
  }

  const avgDuration = Math.round(results.filter(r => r.success).reduce((s, r) => s + r.durationMs, 0) / Math.max(succeeded, 1));
  const avgRows = Math.round(results.filter(r => r.success).reduce((s, r) => s + r.rows, 0) / Math.max(succeeded, 1));

  console.log(`  成功: ${succeeded}/${n} (${successRate}%), 平均耗时: ${avgDuration}ms, 平均行数: ${avgRows}`);
  if (Object.keys(errorTypes).length > 0) {
    console.log(`  错误类型:`, errorTypes);
    for (const f of failed.slice(0, 2)) {
      console.log(`    [${f.id}] ${f.domain}: ${f.error}`);
    }
  }

  return { n, succeeded, failedCount: n - succeeded, successRate, errorTypes, avgDuration, avgRows };
}

async function main() {
  console.log('=== ITDOG 真实检测并行压力测试 ===');
  console.log(`测试时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`测试域名: ${TEST_DOMAINS.join(', ')}`);
  console.log('');

  const allResults: any[] = [];

  // 测试序列：3, 5, 8, 10, 12, 15, 20
  const testLevels = [3, 5, 8, 10, 12, 15, 20];

  for (const n of testLevels) {
    const result = await testConcurrency(n);
    allResults.push(result);

    // 如果成功率低于 80%，停止测试
    if (result.successRate < 80) {
      console.log(`\n⚠️  N=${n} 成功率 ${result.successRate}% < 80%，停止增加并行数`);
      break;
    }

    // 两轮测试之间等待 10 秒，让 Browserless 恢复
    if (n < testLevels[testLevels.length - 1]) {
      console.log(`  等待 10s 让 Browserless 恢复...`);
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  console.log('\n=== 测试结果汇总 ===');
  console.log('并行数 | 成功率  | 平均耗时  | 平均行数 | 状态');
  console.log('-------|---------|-----------|----------|-----');
  for (const r of allResults) {
    const status = r.successRate >= 95 ? '✅ 稳定' : r.successRate >= 80 ? '⚠️ 可用' : '❌ 不稳定';
    console.log(`  ${String(r.n).padEnd(4)} | ${String(r.successRate).padStart(5)}%  | ${String(r.avgDuration).padStart(7)}ms | ${String(r.avgRows).padStart(6)}行 | ${status}`);
  }

  // 找到最佳并行数（成功率 >= 95% 的最大值）
  const stable = allResults.filter(r => r.successRate >= 95);
  const bestN = stable.length > 0 ? stable[stable.length - 1].n : allResults[0]?.n || 3;

  const schedulerN = Math.floor(bestN * 0.7);
  const normalWhenScheduler = Math.ceil(bestN * 0.3);

  console.log(`\n✅ 推荐最佳并行数（ITDOG 真实检测）: ${bestN}`);
  console.log(`   MAX_CONCURRENT (总上限):                ${bestN}`);
  console.log(`   SCHEDULER_SLOTS (定时任务专用 70%):     ${schedulerN}`);
  console.log(`   NORMAL_SLOTS_WHEN_SCHEDULER (普通 30%): ${normalWhenScheduler}`);
  console.log(`   普通任务无定时任务时上限 (100%):         ${bestN}`);

  process.exit(0);
}

main().catch(console.error);
