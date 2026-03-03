/**
 * 服务器端检测测试脚本
 * 直接调用 itdog-puppeteer 检测指定域名，输出统计结果
 */
import { enqueueItdogCheck } from './server/itdog-puppeteer';

const domains = [
  'https://www.0wxe2e.vip:9132',
  'https://www.dx4sio.vip:9961',
];

async function main() {
  for (const domain of domains) {
    console.log(`\n========== 检测: ${domain} ==========`);
    try {
      const result = await enqueueItdogCheck(domain);
      const { summary } = result;
      console.log(`总节点: ${summary.total}`);
      console.log(`成功: ${summary.success}`);
      console.log(`失败: ${summary.failed}`);
      console.log(`平均延迟: ${summary.avgTimeMs}ms`);
      console.log(`最快: ${summary.minNode}`);
      console.log(`最慢: ${summary.maxNode}`);
      
      // 显示失败节点详情
      const failedRows = result.rows.filter(r => r.httpCode === -1 || r.httpCode >= 400);
      if (failedRows.length > 0) {
        console.log(`\n失败节点详情 (前10个):`);
        failedRows.slice(0, 10).forEach(r => {
          console.log(`  ${r.nodeZh || r.node} | IP: ${r.ip} | httpCode: ${r.httpCode} | totalTime: ${r.totalTimeMs}ms`);
        });
      }
    } catch (err) {
      console.error(`检测失败: ${err}`);
    }
  }
  process.exit(0);
}

main().catch(console.error);
