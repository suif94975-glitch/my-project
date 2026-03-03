/**
 * 单域名检测测试脚本
 */
import { enqueueItdogCheck } from './server/itdog-puppeteer';

const domain = process.argv[2] || 'https://www.a14lfg.vip:4341';

function gradeQuality(failedCount: number, avgMs: number): string {
  if (failedCount <= 4 && avgMs < 5000) return '优秀';
  if (failedCount <= 6 && avgMs < 8000) return '普通';
  if (failedCount <= 8 && avgMs < 10000) return '极差';
  return '质量差';
}

async function main() {
  console.log(`检测: ${domain}`);
  const result = await enqueueItdogCheck(domain);
  const { summary } = result;
  const grade = gradeQuality(summary.failed, summary.avgTimeMs);
  console.log(`总节点: ${summary.total}`);
  console.log(`成功: ${summary.success}`);
  console.log(`失败: ${summary.failed}`);
  console.log(`平均延迟: ${summary.avgTimeMs}ms`);
  console.log(`评级: ${grade}`);
  
  const failedRows = result.rows.filter(r => r.httpCode === -1 || r.httpCode >= 400);
  if (failedRows.length > 0) {
    console.log(`\n失败节点详情:`);
    failedRows.forEach(r => {
      console.log(`  ${r.nodeZh || r.node} | httpCode: ${r.httpCode} | totalTime: ${r.totalTimeMs}ms`);
    });
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
