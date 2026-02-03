import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('🔍 Verificando facturas de febrero 2026 con filtros del frontend...\n');

// Filtros EXACTOS que usa el frontend
const partnerId = 1;
const status = 'sent';
const dateFrom = '2026-01-31T23:00:00.000Z';
const dateTo = '2026-02-28T22:59:59.000Z';

console.log('📥 Filtros:');
console.log(`  - partnerId: ${partnerId}`);
console.log(`  - status: ${status}`);
console.log(`  - dateFrom: ${dateFrom}`);
console.log(`  - dateTo: ${dateTo}`);
console.log('');

// Query CON filtro de status
console.log('🔎 Query 1: CON filtro de status="sent"');
const invoicesWithStatus = await db
  .select()
  .from(schema.invoices)
  .where(
    and(
      eq(schema.invoices.partnerId, partnerId),
      eq(schema.invoices.status, status as any),
      gte(schema.invoices.date, new Date(dateFrom).toISOString()),
      lte(schema.invoices.date, new Date(dateTo).toISOString())
    )
  )
  .limit(5);

console.log(`  Resultados: ${invoicesWithStatus.length} facturas`);
if (invoicesWithStatus.length > 0) {
  console.table(invoicesWithStatus.map(inv => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    date: inv.date,
    status: inv.status,
    total: inv.total,
  })));
}
console.log('');

// Query SIN filtro de status
console.log('🔎 Query 2: SIN filtro de status');
const invoicesWithoutStatus = await db
  .select()
  .from(schema.invoices)
  .where(
    and(
      eq(schema.invoices.partnerId, partnerId),
      gte(schema.invoices.date, new Date(dateFrom).toISOString()),
      lte(schema.invoices.date, new Date(dateTo).toISOString())
    )
  )
  .limit(5);

console.log(`  Resultados: ${invoicesWithoutStatus.length} facturas`);
if (invoicesWithoutStatus.length > 0) {
  console.table(invoicesWithoutStatus.map(inv => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    date: inv.date,
    status: inv.status,
    total: inv.total,
  })));
}
console.log('');

// Verificar el tipo de dato de la columna date
console.log('🔎 Query 3: Verificar formato de fechas en BD');
const sample = await db
  .select()
  .from(schema.invoices)
  .where(eq(schema.invoices.partnerId, partnerId))
  .limit(1);

if (sample.length > 0) {
  console.log('  Ejemplo de fecha en BD:', sample[0].date);
  console.log('  Tipo:', typeof sample[0].date);
  console.log('  Fecha parseada:', new Date(sample[0].date as any));
}

await connection.end();
