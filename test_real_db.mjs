import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { appointments, partners } from './drizzle/schema.js';
import { eq, gte, lte, and, sql } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

console.log('=== TEST 1: Verificar partners en la BD ===');
const allPartners = await db.select({
  id: partners.id,
  name: partners.name,
  email: partners.email
}).from(partners).limit(5);
console.log('Partners encontrados:', JSON.stringify(allPartners, null, 2));

console.log('\n=== TEST 2: Total de citas por partnerId ===');
const citasPorPartner = await db.select({
  partnerId: appointments.partnerId,
  count: sql`COUNT(*)`
}).from(appointments).groupBy(appointments.partnerId);
console.log('Citas por partner:', citasPorPartner);

console.log('\n=== TEST 3: Total general de citas ===');
const totalResult = await db.select({ count: sql`COUNT(*)` }).from(appointments);
console.log('Total citas en la BD:', totalResult[0].count);

console.log('\n=== TEST 4: Muestra de citas con partnerId ===');
const sampleWithPartner = await db.select({
  id: appointments.id,
  partnerId: appointments.partnerId,
  date: appointments.date,
  title: appointments.title
}).from(appointments).limit(10);
console.log('Muestra:', JSON.stringify(sampleWithPartner, null, 2));

console.log('\n=== TEST 5: Rango de fechas ===');
const dateRange = await db.select({
  minDate: sql`MIN(date)`,
  maxDate: sql`MAX(date)`
}).from(appointments);
console.log('Rango:', dateRange[0]);

await connection.end();
