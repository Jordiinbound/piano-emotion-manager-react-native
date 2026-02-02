// Simular el contexto de tRPC con partnerId
import { getDb } from './server/db.ts';
import { appointments } from './drizzle/schema.js';
import { and, eq, gte, lte, desc } from 'drizzle-orm';

const db = await getDb();

// Simular la petición del frontend para Febrero 2026
const input = {
  limit: 1000,
  dateFrom: '2026-02-01',
  dateTo: '2026-02-28'
};

console.log('=== TEST: Simular appointments.list con parámetros del frontend ===');
console.log('Input:', input);

// Simular el código del backend (líneas 356-362 del router)
const whereClauses = [];

if (input.dateFrom) {
  console.log('\nProbando dateFrom:', input.dateFrom);
  console.log('Conversión:', new Date(input.dateFrom).toISOString());
  whereClauses.push(gte(appointments.date, new Date(input.dateFrom).toISOString()));
}

if (input.dateTo) {
  console.log('\nProbando dateTo:', input.dateTo);
  console.log('Conversión:', new Date(input.dateTo).toISOString());
  whereClauses.push(lte(appointments.date, new Date(input.dateTo).toISOString()));
}

// IMPORTANTE: Necesitamos filtrar por partnerId
// Vamos a probar con partnerId = 1 (asumiendo que es el principal)
whereClauses.push(eq(appointments.partnerId, 1));

console.log('\n=== Ejecutando query con whereClauses ===');
const results = await db
  .select()
  .from(appointments)
  .where(and(...whereClauses))
  .orderBy(desc(appointments.date))
  .limit(input.limit);

console.log(`\nResultados encontrados: ${results.length}`);
if (results.length > 0) {
  console.log('\nPrimeras 3 citas:');
  results.slice(0, 3).forEach(apt => {
    console.log(`  - ID: ${apt.id}, Date: ${apt.date}, Title: ${apt.title}`);
  });
}

// Ahora probar SIN la conversión a ISO
console.log('\n\n=== TEST 2: Sin conversión a ISO (comparación directa) ===');
const whereClauses2 = [];
whereClauses2.push(gte(appointments.date, input.dateFrom));
whereClauses2.push(lte(appointments.date, input.dateTo));
whereClauses2.push(eq(appointments.partnerId, 1));

const results2 = await db
  .select()
  .from(appointments)
  .where(and(...whereClauses2))
  .orderBy(desc(appointments.date))
  .limit(input.limit);

console.log(`Resultados encontrados (sin ISO): ${results2.length}`);
if (results2.length > 0) {
  console.log('\nPrimeras 3 citas:');
  results2.slice(0, 3).forEach(apt => {
    console.log(`  - ID: ${apt.id}, Date: ${apt.date}, Title: ${apt.title}`);
  });
}

process.exit(0);
