import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { appointments } from './drizzle/schema.js';
import { eq, gte, lte, and, sql } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

console.log('=== TEST 1: Total de citas en la base de datos ===');
const totalResult = await db.select({ count: sql`COUNT(*)` }).from(appointments);
console.log('Total citas:', totalResult[0].count);

console.log('\n=== TEST 2: Primeras 5 citas con sus fechas ===');
const sampleAppointments = await db.select({
  id: appointments.id,
  date: appointments.date,
  title: appointments.title,
  status: appointments.status
}).from(appointments).limit(5);
console.log('Muestra de citas:', JSON.stringify(sampleAppointments, null, 2));

console.log('\n=== TEST 3: Formato del campo date ===');
if (sampleAppointments.length > 0) {
  console.log('Tipo de date:', typeof sampleAppointments[0].date);
  console.log('Valor de date:', sampleAppointments[0].date);
}

console.log('\n=== TEST 4: Rango de fechas de todas las citas ===');
const dateRange = await db.select({
  minDate: sql`MIN(date)`,
  maxDate: sql`MAX(date)`
}).from(appointments);
console.log('Rango de fechas:', dateRange[0]);

console.log('\n=== TEST 5: Citas por año ===');
const byYear = await db.select({
  year: sql`YEAR(date)`,
  count: sql`COUNT(*)`
}).from(appointments).groupBy(sql`YEAR(date)`);
console.log('Citas por año:', byYear);

console.log('\n=== TEST 6: Probar filtro con dateFrom y dateTo (Febrero 2024) ===');
const dateFrom = '2024-02-01';
const dateTo = '2024-02-29';
console.log(`Buscando citas entre ${dateFrom} y ${dateTo}`);

const filteredAppointments = await db.select({
  id: appointments.id,
  date: appointments.date,
  title: appointments.title
}).from(appointments).where(
  and(
    gte(appointments.date, dateFrom),
    lte(appointments.date, dateTo)
  )
).limit(10);
console.log(`Citas encontradas en Feb 2024: ${filteredAppointments.length}`);
console.log('Muestra:', JSON.stringify(filteredAppointments, null, 2));

await connection.end();
