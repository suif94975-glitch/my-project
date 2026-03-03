// 详细调试脚本：输出所有节点的原始 DOM 数据，找出浙江节点被错误标记为失败的原因
import { enqueueItdogCheck } from './server/itdog-puppeteer';

async function main() {
  const domain = 'https://www.rx6dhz.vip:8005';
  const allRows: any[] = [];
  
  console.log(`[调试] 开始检测 ${domain}`);
  
  const result = await enqueueItdogCheck(domain, (row) => {
    allRows.push(row);
  });
  
  console.log(`\n[原始数据] 共 ${result?.rows?.length || 0} 行`);
  
  // 输出所有 httpCode=-1 的节点
  const failedRows = (result?.rows || []).filter((r: any) => r.httpCode === -1);
  console.log(`\n[失败节点] httpCode=-1 共 ${failedRows.length} 个:`);
  failedRows.forEach((r: any) => {
    console.log(`  - ${r.isp} ${r.region} | httpCode=${r.httpCode} | totalTimeMs=${r.totalTimeMs} | rawStatus=${JSON.stringify(r.rawStatus)}`);
  });
  
  // 输出所有浙江节点
  const zhejiangRows = (result?.rows || []).filter((r: any) => r.region === '浙江');
  console.log(`\n[浙江节点] 共 ${zhejiangRows.length} 个:`);
  zhejiangRows.forEach((r: any) => {
    console.log(`  - ${r.isp} ${r.region} | httpCode=${r.httpCode} | totalTimeMs=${r.totalTimeMs}`);
  });
  
  // 输出所有节点统计
  const total = result?.rows?.length || 0;
  const success = (result?.rows || []).filter((r: any) => r.httpCode >= 200 && r.httpCode < 400).length;
  const failed = (result?.rows || []).filter((r: any) => r.httpCode === -1 || r.httpCode >= 400).length;
  const pending = (result?.rows || []).filter((r: any) => r.httpCode === 0).length;
  
  console.log(`\n[统计] 总=${total}, 成功=${success}, 失败=${failed}, 未完成=${pending}`);
  
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
