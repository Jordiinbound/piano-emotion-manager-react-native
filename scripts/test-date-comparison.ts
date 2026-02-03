/**
 * Script para probar la comparación de fechas
 * Simula exactamente lo que hace el backend
 */

// Fechas del frontend (formato ISO)
const dateFromISO = "2026-01-31T23:00:00.000Z";
const dateToISO = "2026-02-28T22:59:59.000Z";

// Fechas de la BD (formato MySQL)
const invoiceDates = [
  "2026-02-22 14:30:00",
  "2026-02-17 01:23:00",
  "2026-02-26 18:59:00",
  "2026-02-01 12:12:00",
  "2026-02-08 10:23:00",
];

console.log('🧪 Probando comparación de fechas...\n');

// ANTES del fix (comparación directa ISO vs MySQL)
console.log('❌ ANTES del fix (comparación ISO vs MySQL):');
console.log(`  dateFrom: "${dateFromISO}"`);
console.log(`  dateTo: "${dateToISO}"`);
console.log('');

invoiceDates.forEach((invoiceDate, i) => {
  const matchesFrom = invoiceDate >= dateFromISO;
  const matchesTo = invoiceDate <= dateToISO;
  const matches = matchesFrom && matchesTo;
  
  console.log(`  Factura ${i + 1}: "${invoiceDate}"`);
  console.log(`    >= dateFrom: ${matchesFrom}`);
  console.log(`    <= dateTo: ${matchesTo}`);
  console.log(`    ✓ Match: ${matches ? '✅' : '❌'}`);
  console.log('');
});

console.log('---\n');

// DESPUÉS del fix (conversión a formato MySQL)
console.log('✅ DESPUÉS del fix (conversión a formato MySQL):');
const dateFromMySQL = new Date(dateFromISO).toISOString().slice(0, 19).replace('T', ' ');
const dateToMySQL = new Date(dateToISO).toISOString().slice(0, 19).replace('T', ' ');

console.log(`  dateFrom: "${dateFromMySQL}"`);
console.log(`  dateTo: "${dateToMySQL}"`);
console.log('');

invoiceDates.forEach((invoiceDate, i) => {
  const matchesFrom = invoiceDate >= dateFromMySQL;
  const matchesTo = invoiceDate <= dateToMySQL;
  const matches = matchesFrom && matchesTo;
  
  console.log(`  Factura ${i + 1}: "${invoiceDate}"`);
  console.log(`    >= dateFrom: ${matchesFrom}`);
  console.log(`    <= dateTo: ${matchesTo}`);
  console.log(`    ✓ Match: ${matches ? '✅' : '❌'}`);
  console.log('');
});

console.log('---\n');

// Resumen
const beforeCount = invoiceDates.filter(date => 
  date >= dateFromISO && date <= dateToISO
).length;

const afterCount = invoiceDates.filter(date => 
  date >= dateFromMySQL && date <= dateToMySQL
).length;

console.log('📊 Resumen:');
console.log(`  Antes del fix: ${beforeCount}/5 facturas encontradas`);
console.log(`  Después del fix: ${afterCount}/5 facturas encontradas`);
console.log('');

if (afterCount > beforeCount) {
  console.log('✅ El fix RESUELVE el problema!');
} else {
  console.log('❌ El fix NO resuelve el problema');
}
