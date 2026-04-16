import { db } from './db/config.js';
import { sql } from 'drizzle-orm';
import { inventorySnapshots } from './db/schema.js';

async function run() {
  const result = await db.execute(sql`SELECT DISTINCT color_name FROM inventory_snapshots LIMIT 10`);
  console.log(result.rows);
  process.exit(0);
}
run();
