import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('🔍 Verificando facturas de febrero y marzo 2026...\n');

const result = await db.execute(sql`
  SELECT 
    COUNT(*) as total,
    YEAR(date) as año,
    MONTH(date) as mes,
    status
  FROM invoices 
  WHERE partnerId = 1 
    AND YEAR(date) = 2026 
    AND MONTH(date) IN (2, 3)
  GROUP BY YEAR(date), MONTH(date), status
  ORDER BY año, mes
`);

console.log('📊 Facturas por mes y estado:');
console.table(result[0]);

const febInvoices = await db.select({
  id: schema.invoices.id,
  invoiceNumber: schema.invoices.invoiceNumber,
  date: schema.invoices.date,
  status: schema.invoices.status,
  total: schema.invoices.total,
  clientName: schema.invoices.clientName,
}).from(schema.invoices)
  .where(
    and(
      eq(schema.invoices.partnerId, 1),
      gte(schema.invoices.date, '2026-02-01'),
      lte(schema.invoices.date, '2026-02-28 23:59:59')
    )
  )
  .limit(5);

console.log('\n📋 Primeras 5 facturas de febrero 2026:');
console.table(febInvoices);

await connection.end();
