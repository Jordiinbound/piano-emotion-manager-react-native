import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { count, sql, and, eq, gte, lte } from 'drizzle-orm';
import { services } from './drizzle/schema.js';

const DATABASE_URL = process.env.DATABASE_URL;

async function testQuery() {
  console.log('🔍 Probando query SQL de tasa de finalización...\n');
  
  try {
    const connection = await mysql.createConnection(DATABASE_URL);
    const db = drizzle(connection);
    
    // Fechas de prueba: últimos 12 meses
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    
    console.log('📅 Rango de fechas:');
    console.log(`   Desde: ${startDate.toISOString()}`);
    console.log(`   Hasta: ${endDate.toISOString()}\n`);
    
    // Query problemática
    console.log('🔧 Ejecutando query con COALESCE...');
    const result = await db
      .select({
        total: count(),
        completed: sql`SUM(CASE WHEN COALESCE(${services.clientSignature}, '') != '' THEN 1 ELSE 0 END)`,
        pending: sql`SUM(CASE WHEN COALESCE(${services.clientSignature}, '') = '' THEN 1 ELSE 0 END)`,
      })
      .from(services)
      .where(
        and(
          gte(services.date, startDate.toISOString()),
          lte(services.date, endDate.toISOString())
        )
      );
    
    console.log('✅ Query ejecutada exitosamente!\n');
    console.log('📊 Resultados:');
    console.log(JSON.stringify(result, null, 2));
    
    await connection.end();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ ERROR al ejecutar query:');
    console.error(error);
    process.exit(1);
  }
}

testQuery();
