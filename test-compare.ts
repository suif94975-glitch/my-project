/**
 * 域名检测对比测试脚本
 * 直接调用 itdog-puppeteer 检测4个域名，输出结果供与原站对比
 */
import { enqueueItdogCheck } from './server/itdog-puppeteer';

const domains = [
  'https://www.dx4sio.vip:9961',
  'https://www.a14lfg.vip:4341',
  'https://www.rx6dhz.vip:8005',
  'https://kaiyun.com',
];

(async () => {
  for (const domain of domains) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`检测域名: ${domain}`);
    console.log('='.repeat(60));
    
    try {
      const result = await enqueueItdogCheck(domain);
      const failedNodes = result.rows.filter(r => r.httpCode === -1 || r.httpCode >= 400);
      const successNodes = result.rows.filter(r => r.httpCode >= 200 && r.httpCode < 400);
      
      console.log(`总节点: ${result.summary.total}`);
      console.log(`成功(2xx): ${result.summary.success}`);
      console.log(`失败: ${result.summary.failed}`);
      console.log(`平均延迟: ${result.summary.avgTimeMs}ms`);
      console.log(`失败节点列表:`);
      failedNodes.forEach(r => {
        console.log(`  - ${r.node}: httpCode=${r.httpCode}, 总耗时=${r.totalTimeMs}ms`);
      });
      
      // 评级逻辑
      const failedCount = result.summary.failed;
      const avgMs = result.summary.avgTimeMs;
      let grade = '质量差';
      if (failedCount <= 4 && avgMs < 5000) grade = '优秀';
      else if (failedCount <= 6 && avgMs < 8000) grade = '普通';
      else if (failedCount <= 8 && avgMs < 10000) grade = '极差';
      console.log(`评级: ${grade} (失败=${failedCount}, 均值=${avgMs}ms)`);
      
    } catch (err: any) {
      console.error('检测失败:', err.message?.slice(0, 300));
    }
  }
  process.exit(0);
})();
