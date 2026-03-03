import { parseNodeInfo, CHINA_PROVINCE_SET } from './server/nodeTranslate';

const testNodes = [
  '海外\n\t\t\t\t\t\t\t\t\t\t中国台湾',
  '海外\n\t\t\t\t\t\t\t\t\t\t中国香港',
  '海外\n\t\t\t\t\t\t\t\t\t\t韩国首尔',
  '海外\n\t\t\t\t\t\t\t\t\t\t美国洛杉矶',
  '海外 中国台湾',
  '海外 中国香港',
  '海外 韩国首尔',
];

for (const node of testNodes) {
  const info = parseNodeInfo(node);
  const inSet = CHINA_PROVINCE_SET.has(info.region);
  console.log(`"${node.replace(/\n\t+/g, ' ').trim()}" → region="${info.region}", inSet=${inSet}`);
}
