/**
 * 独立测试脚本：直接调用 ITDOG puppeteer 检测4个域名并输出结果
 * 用于与 ITDOG 原站数据对比
 */
import { createRequire } from 'module';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 使用 tsx 运行 TypeScript 文件
const domains = [
  'https://www.dx4sio.vip:9961',
  'https://www.a14lfg.vip:4341',
  'https://www.rx6dhz.vip:8005',
  'https://kaiyun.com',
];

console.log('开始检测4个域名...\n');

for (const domain of domains) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`检测域名: ${domain}`);
  console.log('='.repeat(60));
  
  try {
    const result = execSync(
      `npx tsx -e "
import { enqueueItdogCheck } from './server/itdog-puppeteer.ts';
const result = await enqueueItdogCheck('${domain}');
console.log(JSON.stringify({
  domain: result.domain,
  total: result.summary.total,
  success: result.summary.success,
  failed: result.summary.failed,
  avgTimeMs: result.summary.avgTimeMs,
  failedNodes: result.rows.filter(r => r.httpCode === -1 || r.httpCode >= 400).map(r => ({
    node: r.node,
    httpCode: r.httpCode,
    totalTimeMs: r.totalTimeMs
  }))
}));
"`,
      { cwd: __dirname, timeout: 120000, encoding: 'utf8' }
    );
    const data = JSON.parse(result.trim().split('\n').pop());
    console.log(`总节点: ${data.total}`);
    console.log(`成功: ${data.success}`);
    console.log(`失败: ${data.failed}`);
    console.log(`平均延迟: ${data.avgTimeMs}ms`);
    console.log(`失败节点:`, data.failedNodes);
  } catch (err) {
    console.error('检测失败:', err.message?.slice(0, 200));
  }
}
