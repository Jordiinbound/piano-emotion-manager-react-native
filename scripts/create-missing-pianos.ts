/**
 * Script para crear pianos para clientes que no tienen ninguno
 * Identifica clientes sin pianos y crea un piano básico para cada uno
 */
import { getDb } from '../server/db.js';
import { clients, pianos } from '../drizzle/schema.js';
import { sql, notInArray } from 'drizzle-orm';

async function createMissingPianos() {
  const db = await getDb();
  
  console.log('🔍 Identificando clientes sin pianos...\n');
  
  // Obtener IDs de clientes que tienen al menos un piano
  const clientsWithPianos = await db
    .select({ clientId: pianos.clientId })
    .from(pianos)
    .groupBy(pianos.clientId);
  
  const clientIdsWithPianos = clientsWithPianos.map(p => p.clientId);
  
  console.log(`✅ ${clientIdsWithPianos.length} clientes tienen pianos\n`);
  
  // Obtener clientes sin pianos
  let clientsWithoutPianos;
  if (clientIdsWithPianos.length > 0) {
    clientsWithoutPianos = await db
      .select()
      .from(clients)
      .where(notInArray(clients.id, clientIdsWithPianos));
  } else {
    clientsWithoutPianos = await db.select().from(clients);
  }
  
  console.log(`❌ ${clientsWithoutPianos.length} clientes SIN pianos\n`);
  
  if (clientsWithoutPianos.length === 0) {
    console.log('✅ Todos los clientes tienen al menos un piano. No hay nada que hacer.');
    process.exit(0);
  }
  
  console.log('📝 Clientes sin pianos:');
  clientsWithoutPianos.forEach((client, index) => {
    console.log(`  ${index + 1}. ${client.name} (ID: ${client.id})`);
  });
  
  console.log('\n🔨 Creando pianos para estos clientes...\n');
  
  const pianosToCreate = clientsWithoutPianos.map(client => ({
    odId: `AUTO-PIANO-${client.id}-${Date.now()}`,
    clientId: client.id,
    partnerId: client.partnerId,
    brand: 'Sin especificar',
    model: 'Sin especificar',
    serialNumber: `AUTO-${Date.now()}-${client.id}`,
    category: 'vertical' as const,
    pianoType: 'Vertical Estándar',
    condition: 'good' as const,
    location: client.fiscalAddress || client.address || 'Sin especificar',
    notes: 'Piano creado automáticamente para completar el inventario',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  
  // Insertar pianos en lotes de 50
  const batchSize = 50;
  let created = 0;
  
  for (let i = 0; i < pianosToCreate.length; i += batchSize) {
    const batch = pianosToCreate.slice(i, i + batchSize);
    await db.insert(pianos).values(batch);
    created += batch.length;
    console.log(`  ✅ Creados ${created}/${pianosToCreate.length} pianos...`);
  }
  
  console.log(`\n✅ Proceso completado: ${created} pianos creados\n`);
  
  // Verificar resultado final
  const totalClients = await db.select({ count: sql<number>`COUNT(*)` }).from(clients);
  const totalPianos = await db.select({ count: sql<number>`COUNT(*)` }).from(pianos);
  const clientsWithPianosAfter = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${pianos.clientId})` })
    .from(pianos);
  
  console.log('📊 Resumen final:');
  console.log(`  Total clientes: ${totalClients[0].count}`);
  console.log(`  Total pianos: ${totalPianos[0].count}`);
  console.log(`  Clientes con pianos: ${clientsWithPianosAfter[0].count}`);
  
  process.exit(0);
}

createMissingPianos().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
