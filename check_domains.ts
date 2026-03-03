import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { scheduledDomains } from './drizzle/schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config({ path: './.env' });

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL as string);
  const db = drizzle(conn);
  const domains = await db.select().from(scheduledDomains).where(eq(scheduledDomains.groupId, 30003));
  console.log('A9 domains count:', domains.length);
  for (const d of domains) {
    console.log(`Domain:${d.domain} Status:${d.lastStatus} LastChecked:${d.lastCheckedAt?.toISOString()}`);
  }
  await conn.end();
}
main().catch(console.error);
