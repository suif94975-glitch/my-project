/**
 * 测试节点名称解析
 */
import { parseNodeInfo, CHINA_PROVINCE_SET } from './server/nodeTranslate';

const testNodes = [
  '联通 山东济南',
  '电信 山东青岛',
  '移动 山东济南',
  '联通 海外',
  '海外 联通',
  '电信 美国',
  '联通 日本东京',
  '移动 香港',
  '联通 台湾',
  '电信 澳门',
  '电信 福建龙岩',
  '联通 广东广州',
];

for (const node of testNodes) {
  const info = parseNodeInfo(node);
  const inSet = CHINA_PROVINCE_SET.has(info.region);
  console.log(`"${node}" → region="${info.region}", isp="${info.isp}", inSet=${inSet}`);
}
