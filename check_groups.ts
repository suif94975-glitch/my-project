import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { scheduledTaskGroups } from './drizzle/schema';
import * as dotenv from 'dotenv';
dotenv.config({ path: './.env' });

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(conn);
  const groups = await db.select().from(scheduledTaskGroups);
  const now = new Date();
  console.log('Current time:', now.toISOString());
  for (const g of groups) {
    const interval = g.intervalMinutes ?? 60;
    const last = g.lastScheduledAt;
    const nextRun = last ? new Date(last.getTime() + interval * 60 * 1000) : null;
    console.log('---');
    console.log('ID:', g.id, 'Name:', g.name, 'Status:', g.taskStatus, 'Enabled:', g.enabled);
    console.log('Interval:', interval, 'min, LastScheduled:', last?.toISOString(), 'NextRun:', nextRun?.toISOString());
    console.log('ShouldRun:', nextRun ? (now >= nextRun ? 'YES' : 'NO') : 'YES (never run)');
  }
  await conn.end();
}
main().catch(console.error);
