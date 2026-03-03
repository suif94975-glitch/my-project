import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 各厂商域名数量和CDN分布
const [rows] = await conn.execute(`
  SELECT pv.id, pv.name, pv.vendor_cdnType as vendorCdn, 
         vd.cdn_type as domainCdn, COUNT(*) as cnt
  FROM port_vendors pv
  LEFT JOIN vendor_domains vd ON vd.vendor_id = pv.id
  GROUP BY pv.id, pv.name, pv.vendor_cdnType, vd.cdn_type
  ORDER BY pv.id, vd.cdn_type
`);
console.log('厂商域名CDN分布:');
rows.forEach(r => console.log(`  厂商[${r.id}]${r.name}(绑定CDN:${r.vendorCdn}) - 域名CDN:${r.domainCdn} - 数量:${r.cnt}`));

await conn.end();
