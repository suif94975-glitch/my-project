/**
 * 详细调试脚本，输出所有节点的原始数据
 */
import { enqueueItdogCheck } from './server/itdog-puppeteer';

const domain = process.argv[2] || 'https://www.rx6dhz.vip:8005';

function gradeQuality(failedCount: number, avgMs: number): string {
  if (failedCount <= 4 && avgMs < 5000) return '优秀';
  if (failedCount <= 6 && avgMs < 8000) return '普通';
  if (failedCount <= 8 && avgMs < 10000) return '极差';
  return '质量差';
}

async function main() {
  console.log(`检测: ${domain}`);
  const result = await enqueueItdogCheck(domain);
  const { summary, rows } = result;
  const grade = gradeQuality(summary.failed, summary.avgTimeMs);
  console.log(`\n=== 汇总 ===`);
  console.log(`总节点: ${summary.total}`);
  console.log(`成功: ${summary.success}`);
  console.log(`失败: ${summary.failed}`);
  console.log(`平均延迟: ${summary.avgTimeMs}ms`);
  console.log(`评级: ${grade}`);
  
  // 显示所有 httpCode=-1 的节点
  const failedRows = rows.filter(r => r.httpCode === -1 || r.httpCode >= 400);
  console.log(`\n=== 失败节点 (${failedRows.length}个) ===`);
  failedRows.forEach(r => {
    console.log(`  ${r.nodeZh || r.node} | httpCode: ${r.httpCode} | totalTime: ${r.totalTimeMs}ms | status: ${r.status}`);
  });
  
  // 显示 httpCode=0 的节点（未完成/被过滤的节点）
  // 注意：这些节点不在 rows 中（已被过滤），需要从原始数据中获取
  console.log(`\n=== 所有节点 httpCode 分布 ===`);
  const httpCodeMap = new Map<number, number>();
  rows.forEach(r => {
    httpCodeMap.set(r.httpCode, (httpCodeMap.get(r.httpCode) || 0) + 1);
  });
  for (const [code, count] of Array.from(httpCodeMap.entries()).sort((a, b) => a[0] - b[0])) {
    console.log(`  httpCode=${code}: ${count}个节点`);
  }
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
