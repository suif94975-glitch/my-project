import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 模拟 generateUrls: vendorId=60003, cdnType='a8', poolType='main'
const [allDomains] = await conn.execute(
  "SELECT id, domain, cdnType, siteType, isUsed, category, poolType FROM vendor_domains WHERE vendorId=60003 AND poolType='main'"
);
console.log('Total domains for A8 vendor:', allDomains.length);

const notUsed = allDomains.filter(d => d.isUsed === 0 || d.isUsed === false);
console.log('Not used:', notUsed.length);

const cdnFiltered = notUsed.filter(d => {
  const effectiveCdn = 'a8';
  if (effectiveCdn && d.cdnType && d.cdnType !== effectiveCdn) return false;
  return true;
});
console.log('After CDN filter (a8):', cdnFiltered.length);

const byCategory = {};
for (const d of cdnFiltered) {
  if (byCategory[d.category] === undefined) byCategory[d.category] = [];
  byCategory[d.category].push(d.domain);
}
console.log('By category:', Object.fromEntries(Object.entries(byCategory).map(([k,v]) => [k, v.length])));
console.log('Sample domain:', cdnFiltered[0]);

await conn.end();
