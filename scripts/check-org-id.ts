import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema';
import { isNotNull, isNull } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('🔍 Verificando organizationId en facturas...\n');

// Facturas CON organizationId
const withOrg = await db
  .select()
  .from(schema.invoices)
  .where(isNotNull(schema.invoices.organizationId))
  .limit(5);

console.log(`✅ Facturas CON organizationId: ${withOrg.length}`);
if (withOrg.length > 0) {
  console.table(withOrg.map(inv => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    date: inv.date,
    organizationId: inv.organizationId,
    partnerId: inv.partnerId,
  })));
}
console.log('');

// Facturas SIN organizationId
const withoutOrg = await db
  .select()
  .from(schema.invoices)
  .where(isNull(schema.invoices.organizationId))
  .limit(5);

console.log(`❌ Facturas SIN organizationId (null): ${withoutOrg.length}`);
if (withoutOrg.length > 0) {
  console.table(withoutOrg.map(inv => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    date: inv.date,
    organizationId: inv.organizationId,
    partnerId: inv.partnerId,
  })));
}

await connection.end();
