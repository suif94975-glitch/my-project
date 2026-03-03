/**
 * 实时 ITDOG 对比测试
 * 使用与生产代码完全相同的逻辑进行检测，输出详细结果
 */
import { createRequire } from 'module';
import { register } from 'node:module';
import { pathToFileURL } from 'url';
import { execSync } from 'child_process';
import path from 'path';

// 使用 tsx 运行 TypeScript
const domain = process.argv[2] || 'rx6dhz.vip:8005';
console.log(`\n${'='.repeat(60)}`);
console.log(`[实时ITDOG测试] 检测域名: ${domain}`);
console.log(`开始时间: ${new Date().toLocaleString('zh-CN')}`);
console.log(`${'='.repeat(60)}\n`);

// 直接调用 tsx 运行测试
const script = `
import { enqueueItdogCheck } from './server/itdog-puppeteer.js';

const domain = '${domain}';
const startTime = Date.now();
let rowCount = 0;
let failedCount = 0;

console.log('[检测开始] 域名:', domain);

const result = await enqueueItdogCheck(domain, (row) => {
  rowCount++;
  const isFailed = row.httpCode === -1 || row.httpCode >= 400;
  if (isFailed) {
    failedCount++;
    console.log(\`[失败节点] \${row.nodeZh || row.node} | httpCode=\${row.httpCode} | \${row.totalTimeMs}ms\`);
  }
}, (queueInfo) => {
  // 队列状态回调
});

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(\`\n[检测完成] 耗时: \${elapsed}s\`);
console.log(\`[结果统计]\`);
console.log(\`  总节点数: \${result.rows.length}\`);
console.log(\`  失败节点: \${failedCount}\`);
console.log(\`  平均延迟: \${result.summary.avgTimeMs}ms\`);
console.log(\`  最快节点: \${result.summary.minNode} \${result.summary.minTimeMs}ms\`);
console.log(\`  最慢节点: \${result.summary.maxNode} \${result.summary.maxTimeMs}ms\`);

// 计算质量评级（与 Home.tsx 完全一致）
const failedNodes = result.rows.filter(r => r.httpCode === -1 || r.httpCode >= 400).length;
const successRows = result.rows.filter(r => r.status === 'success' && r.totalTimeMs > 0);
const avgTimeMs = successRows.length > 0
  ? Math.round(successRows.reduce((s, r) => s + r.totalTimeMs, 0) / successRows.length)
  : 99999;

let grade = 'bad';
if (failedNodes <= 4 && avgTimeMs < 5000) grade = 'good';
else if (failedNodes <= 6 && avgTimeMs < 8000) grade = 'normal';
else if (failedNodes <= 8 && avgTimeMs < 10000) grade = 'poor';

console.log(\`  失败节点数: \${failedNodes}\`);
console.log(\`  成功平均延迟: \${avgTimeMs}ms\`);
console.log(\`  质量评级: \${grade}\`);

// 打印所有节点详情
console.log(\`\n[所有节点详情]\`);
for (const row of result.rows) {
  const status = row.httpCode === -1 ? '失败' : row.httpCode >= 400 ? \`错误\${row.httpCode}\` : \`\${row.httpCode}\`;
  console.log(\`  \${(row.nodeZh || row.node).padEnd(20)} | \${status.padEnd(8)} | \${row.totalTimeMs.toFixed(0).padStart(6)}ms | \${row.isp}\`);
}
`;

import { writeFileSync, unlinkSync } from 'fs';
const tmpFile = '/tmp/test-live-itdog-inner.ts';
writeFileSync(tmpFile, script);

try {
  const result = execSync(`cd /home/ubuntu/domain-checker && npx tsx ${tmpFile}`, {
    timeout: 120000,
    encoding: 'utf8',
    env: { ...process.env }
  });
  console.log(result);
} catch(e) {
  console.error('Error:', e.message);
  if (e.stdout) console.log('Stdout:', e.stdout);
  if (e.stderr) console.error('Stderr:', e.stderr);
} finally {
  try { unlinkSync(tmpFile); } catch {}
}
