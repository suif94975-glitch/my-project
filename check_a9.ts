import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { scheduledDomains, scheduledTaskGroups } from './drizzle/schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config({ path: './.env' });

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL as string);
  const db = drizzle(conn);
  
  const groups = await db.select().from(scheduledTaskGroups).where(eq(scheduledTaskGroups.id, 30003));
  const g = groups[0];
  console.log('A9 group lastScheduledAt:', g?.lastScheduledAt?.toISOString());
  
  const domains = await db.select().from(scheduledDomains).where(eq(scheduledDomains.groupId, 30003));
  console.log('Domain count:', domains.length);
  for (const d of domains) {
    console.log(`  ${d.domain} | status:${d.lastStatus} | lastChecked:${d.lastCheckedAt?.toISOString()} | created:${d.createdAt?.toISOString()}`);
  }
  await conn.end();
}
main().catch(console.error);
