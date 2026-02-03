import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('🔍 Comparando facturas que funcionan vs las que no...\n');

// Facturas de diciembre 2025 (que SÍ funcionan)
console.log('✅ Facturas de DICIEMBRE 2025 (que SÍ se muestran):');
const dec2025 = await db
  .select()
  .from(schema.invoices)
  .where(
    and(
      eq(schema.invoices.partnerId, 1),
      gte(schema.invoices.date, '2025-12-01'),
      lte(schema.invoices.date, '2025-12-31')
    )
  )
  .limit(3);

console.table(dec2025.map(inv => ({
  id: inv.id,
  invoiceNumber: inv.invoiceNumber,
  date: inv.date,
  status: inv.status,
  total: inv.total,
  partnerId: inv.partnerId,
  organizationId: inv.organizationId,
  clientId: inv.clientId,
})));
console.log('');

// Facturas de febrero 2026 (que NO funcionan)
console.log('❌ Facturas de FEBRERO 2026 (que NO se muestran):');
const feb2026 = await db
  .select()
  .from(schema.invoices)
  .where(
    and(
      eq(schema.invoices.partnerId, 1),
      gte(schema.invoices.date, '2026-02-01'),
      lte(schema.invoices.date, '2026-02-28')
    )
  )
  .limit(3);

console.table(feb2026.map(inv => ({
  id: inv.id,
  invoiceNumber: inv.invoiceNumber,
  date: inv.date,
  status: inv.status,
  total: inv.total,
  partnerId: inv.partnerId,
  organizationId: inv.organizationId,
  clientId: inv.clientId,
})));
console.log('');

// Comparar estructura
console.log('🔎 Comparando estructura de datos:\n');

if (dec2025.length > 0 && feb2026.length > 0) {
  const dec = dec2025[0];
  const feb = feb2026[0];
  
  console.log('Campos de diciembre 2025:');
  Object.keys(dec).forEach(key => {
    console.log(`  ${key}: ${typeof (dec as any)[key]} = ${(dec as any)[key]}`);
  });
  console.log('');
  
  console.log('Campos de febrero 2026:');
  Object.keys(feb).forEach(key => {
    console.log(`  ${key}: ${typeof (feb as any)[key]} = ${(feb as any)[key]}`);
  });
  console.log('');
  
  // Buscar diferencias
  console.log('⚠️  Diferencias encontradas:');
  const allKeys = new Set([...Object.keys(dec), ...Object.keys(feb)]);
  let foundDiff = false;
  
  allKeys.forEach(key => {
    const decVal = (dec as any)[key];
    const febVal = (feb as any)[key];
    const decType = typeof decVal;
    const febType = typeof febVal;
    
    if (decType !== febType) {
      console.log(`  - ${key}: tipo diferente (${decType} vs ${febType})`);
      foundDiff = true;
    } else if (key === 'partnerId' || key === 'organizationId' || key === 'clientId') {
      if (decVal !== febVal) {
        console.log(`  - ${key}: valor diferente (${decVal} vs ${febVal})`);
        foundDiff = true;
      }
    }
  });
  
  if (!foundDiff) {
    console.log('  ✅ No se encontraron diferencias significativas en la estructura');
  }
}

await connection.end();
