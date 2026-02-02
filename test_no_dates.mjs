import { getDb } from './server/db.ts';
import { appointments } from './drizzle/schema.js';
import { and, eq, desc } from 'drizzle-orm';

const db = await getDb();

console.log('=== TEST: Sin dateFrom/dateTo (como funcionaba antes) ===');

const whereClauses = [eq(appointments.partnerId, 1)];

const results = await db
  .select()
  .from(appointments)
  .where(and(...whereClauses))
  .orderBy(desc(appointments.date))
  .limit(30);

console.log(`Resultados encontrados: ${results.length}`);
if (results.length > 0) {
  console.log('\nPrimeras 5 citas:');
  results.slice(0, 5).forEach(apt => {
    console.log(`  - ID: ${apt.id}, Date: ${apt.date}, Title: ${apt.title}`);
  });
}

process.exit(0);
