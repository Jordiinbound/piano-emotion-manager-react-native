import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('🧪 Probando query de facturas con parámetros del frontend...\n');

// Parámetros exactos que envía el frontend
const dateFrom = "2026-01-31T23:00:00.000Z";
const dateTo = "2026-02-28T22:59:59.000Z";
const partnerId = 1;
const status = "sent"; // Filtro "Enviada"

console.log('📥 Parámetros:');
console.log(`  - dateFrom: ${dateFrom}`);
console.log(`  - dateTo: ${dateTo}`);
console.log(`  - partnerId: ${partnerId}`);
console.log(`  - status: ${status}`);
console.log('');

// Query exacta como la hace el backend
const whereClauses = [
  eq(schema.invoices.partnerId, partnerId)
];

if (status) {
  whereClauses.push(eq(schema.invoices.status, status as any));
}

if (dateFrom) {
  whereClauses.push(gte(schema.invoices.date, new Date(dateFrom).toISOString()));
}

if (dateTo) {
  whereClauses.push(lte(schema.invoices.date, new Date(dateTo).toISOString()));
}

console.log('🔎 Ejecutando query...');

const items = await db
  .select()
  .from(schema.invoices)
  .where(and(...whereClauses))
  .orderBy(desc(schema.invoices.date))
  .limit(100);

console.log(`✅ Facturas encontradas: ${items.length}\n`);

if (items.length > 0) {
  console.log('📋 Primeras 5 facturas:');
  console.table(items.slice(0, 5).map(inv => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    date: inv.date,
    status: inv.status,
    total: inv.total,
    clientName: inv.clientName,
  })));
} else {
  console.log('❌ No se encontraron facturas con estos filtros');
  console.log('\n🔍 Verificando facturas sin filtro de fecha:');
  
  const itemsNoDate = await db
    .select()
    .from(schema.invoices)
    .where(
      and(
        eq(schema.invoices.partnerId, partnerId),
        eq(schema.invoices.status, status as any)
      )
    )
    .orderBy(desc(schema.invoices.date))
    .limit(5);
  
  console.log(`  Facturas "sent" sin filtro de fecha: ${itemsNoDate.length}`);
  if (itemsNoDate.length > 0) {
    console.table(itemsNoDate.map(inv => ({
      id: inv.id,
      date: inv.date,
      status: inv.status,
    })));
  }
}

await connection.end();
