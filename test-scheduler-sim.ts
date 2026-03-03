/**
 * 模拟定时检测调用方式（无 onRow 回调），对比 ITDOG 原站数据
 * 用法: npx tsx test-scheduler-sim.ts
 */
import { enqueueItdogCheck } from './server/itdog-puppeteer';

const DOMAINS = [
  'https://www.rx6dhz.vip:8005',  // 质量一般，ITDOG原站9个失败节点
  'https://www.0wxe2e.vip:9132',  // 基准域名，ITDOG原站2个失败节点（快速测试25节点）
];

async function main() {
  for (const domain of DOMAINS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[定时检测模拟] 检测域名: ${domain}`);
    console.log(`开始时间: ${new Date().toLocaleString('zh-CN')}`);
    const startTs = Date.now();
    
    try {
      // 模拟定时检测：无 onRow 回调，等待完整结果
      const result = await enqueueItdogCheck(domain);
      const elapsed = Date.now() - startTs;
      
      const rows = result.rows || [];
      const failedRows = rows.filter(r => r.httpCode === -1 || r.httpCode >= 400);
      const successRows = rows.filter(r => r.status === 'success' && r.totalTimeMs > 0);
      const avgTimeMs = successRows.length > 0
        ? Math.round(successRows.reduce((s, r) => s + r.totalTimeMs, 0) / successRows.length)
        : 99999;
      
      // 评级规则
      let grade: string;
      if (failedRows.length <= 4 && avgTimeMs < 5000) {
        grade = '优秀';
      } else if (failedRows.length <= 6 && avgTimeMs < 8000) {
        grade = '普通';
      } else if (failedRows.length <= 8 && avgTimeMs < 10000) {
        grade = '极差';
      } else {
        grade = '质量差';
      }
      
      console.log(`\n[结果汇总]`);
      console.log(`  耗时: ${elapsed}ms`);
      console.log(`  总节点: ${rows.length}`);
      console.log(`  成功节点: ${successRows.length}`);
      console.log(`  失败节点: ${failedRows.length}`);
      console.log(`  平均延迟: ${avgTimeMs}ms`);
      console.log(`  评级: ${grade}`);
      
      if (failedRows.length > 0) {
        console.log(`\n[失败节点列表]`);
        failedRows.forEach(r => {
          console.log(`  - ${r.isp} ${r.region}${r.city ? ' ' + r.city : ''} | httpCode=${r.httpCode} | ${r.totalTimeMs}ms`);
        });
      }
      
      // 输出 summary 字段（定时检测存入数据库的内容）
      console.log(`\n[数据库存储 summary]: ${grade}（失败节点 ${failedRows.length} 个，平均延迟 ${avgTimeMs}ms）`);
      
    } catch (err: any) {
      console.error(`[错误] ${err.message}`);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('全部检测完成');
  process.exit(0);
}

main().catch(console.error);
