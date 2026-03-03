import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 查询所有厂商
const [vendors] = await conn.execute('SELECT id, name, vendor_cdnType FROM port_vendors');
console.log('厂商列表:', vendors);

// 模拟 randomItem 100 次
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const counts = {};
for (let i = 0; i < 100; i++) {
  const picked = randomItem(vendors);
  counts[picked.name] = (counts[picked.name] || 0) + 1;
}
console.log('\n100次随机分布:', counts);

await conn.end();
