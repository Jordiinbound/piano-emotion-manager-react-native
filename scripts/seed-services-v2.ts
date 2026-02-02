/**
 * Script para generar servicios de prueba REALISTAS para pianos existentes
 * 
 * Distribución de servicios:
 * 
 * AFINACIONES (cada año):
 * - 70% pianos: última afinación hace 0-6 meses (OK, no aparecen en alertas)
 * - 20% pianos: última afinación hace 6-12 meses (Warning)
 * - 10% pianos: última afinación hace 12+ meses (Urgente)
 * 
 * REGULACIONES (cada 2-3 años):
 * - 70% pianos: última regulación hace 0-2 años (OK, no aparecen en alertas)
 * - 20% pianos: última regulación hace 2-3 años (Warning)
 * - 10% pianos: última regulación hace 3+ años (Urgente)
 * 
 * Uso:
 * DATABASE_URL="..." npx tsx scripts/seed-services-v2.ts
 */

import { getDb } from '../server/db';
import { pianos, services } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

// Tipos de servicio disponibles
const SERVICE_TYPES = ['tuning', 'regulation', 'repair', 'maintenance_basic', 'maintenance_complete'] as const;

// Función para generar una fecha hace X días
function dateFromDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

// Función para generar un número aleatorio en un rango
function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Función para generar un costo aleatorio basado en el tipo de servicio
function generateCost(serviceType: string): number {
  const costs = {
    tuning: { min: 80, max: 150 },
    regulation: { min: 200, max: 500 },
    repair: { min: 100, max: 800 },
    maintenance_basic: { min: 50, max: 100 },
    maintenance_complete: { min: 150, max: 300 },
  };
  
  const range = costs[serviceType as keyof typeof costs] || { min: 50, max: 200 };
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

// Función para generar notas aleatorias
function generateNotes(serviceType: string): string {
  const notes = {
    tuning: [
      'Afinación completa realizada. Piano en buen estado.',
      'Afinación estándar A440. Algunas cuerdas necesitarán atención en el futuro.',
      'Piano afinado correctamente. Se recomienda afinación regular.',
      'Afinación realizada sin problemas. Mecanismo funcionando bien.',
    ],
    regulation: [
      'Regulación completa del mecanismo. Mejora significativa en la respuesta.',
      'Ajuste de martillos y teclas. Piano respondiendo correctamente.',
      'Regulación estándar completada. Se recomienda revisión cada 2-3 años.',
      'Mecanismo regulado y ajustado. Excelente respuesta al tacto.',
    ],
    repair: [
      'Reparación de cuerdas rotas. Piano funcionando correctamente.',
      'Sustitución de fieltros desgastados. Mejora en el sonido.',
      'Reparación de teclas pegajosas. Problema resuelto.',
      'Reparación menor completada. Piano en buen estado.',
    ],
    maintenance_basic: [
      'Mantenimiento básico completado. Limpieza y revisión general.',
      'Revisión rutinaria realizada. Piano en buen estado.',
      'Mantenimiento preventivo básico. Todo funcionando correctamente.',
    ],
    maintenance_complete: [
      'Mantenimiento completo realizado. Limpieza profunda y ajustes.',
      'Servicio completo de mantenimiento. Piano en óptimas condiciones.',
      'Mantenimiento exhaustivo completado. Mejora general del instrumento.',
    ],
  };
  
  const serviceNotes = notes[serviceType as keyof typeof notes] || ['Servicio completado correctamente.'];
  return serviceNotes[Math.floor(Math.random() * serviceNotes.length)];
}

async function seedServices() {
  try {
    console.log('🎹 Iniciando generación de servicios REALISTAS...\n');
    
    // Obtener instancia de db
    const db = await getDb();
    
    // PASO 1: Limpiar servicios existentes
    console.log('🧹 Limpiando servicios existentes...');
    await db.delete(services);
    console.log('✅ Servicios anteriores eliminados\n');
    
    // Obtener todos los pianos
    const allPianos = await db.select().from(pianos);
    console.log(`📊 Encontrados ${allPianos.length} pianos en la base de datos\n`);
    
    if (allPianos.length === 0) {
      console.log('❌ No hay pianos en la base de datos.');
      return;
    }
    
    let totalServicesCreated = 0;
    let tuningStats = { ok: 0, warning: 0, urgent: 0 };
    let regulationStats = { ok: 0, warning: 0, urgent: 0 };
    
    // Para cada piano, generar servicios según distribución realista
    for (let index = 0; index < allPianos.length; index++) {
      const piano = allPianos[index];
      const progress = Math.floor((index / allPianos.length) * 100);
      
      if (index % 50 === 0) {
        console.log(`\n📊 Progreso: ${progress}% (${index}/${allPianos.length} pianos procesados)`);
      }
      
      // Determinar categoría del piano para afinaciones (70% ok, 20% warning, 10% urgent)
      const tuningRandom = Math.random();
      let lastTuningDaysAgo: number;
      
      if (tuningRandom < 0.70) {
        // 70% - OK: 0-6 meses (0-180 días)
        lastTuningDaysAgo = randomInRange(0, 180);
        tuningStats.ok++;
      } else if (tuningRandom < 0.90) {
        // 20% - Warning: 6-12 meses (181-365 días)
        lastTuningDaysAgo = randomInRange(181, 365);
        tuningStats.warning++;
      } else {
        // 10% - Urgent: 12+ meses (366-730 días)
        lastTuningDaysAgo = randomInRange(366, 730);
        tuningStats.urgent++;
      }
      
      // Generar historial de afinaciones (última + 2-3 anteriores)
      const tuningDates = [
        lastTuningDaysAgo,
        lastTuningDaysAgo + randomInRange(180, 240), // ~6-8 meses antes
        lastTuningDaysAgo + randomInRange(365, 450), // ~12-15 meses antes
        lastTuningDaysAgo + randomInRange(550, 730), // ~18-24 meses antes
      ];
      
      for (const days of tuningDates) {
        const serviceDate = dateFromDaysAgo(days);
        
        await db.insert(services).values({
          odId: piano.odId || `PI${piano.id}`,
          pianoId: piano.id,
          clientId: piano.clientId || 1,
          serviceType: 'tuning',
          date: serviceDate.toISOString().split('T')[0],
          cost: generateCost('tuning'),
          notes: generateNotes('tuning'),
          partnerId: 1,
          organizationId: 1,
        });
        
        totalServicesCreated++;
      }
      
      // Determinar categoría del piano para regulaciones (70% ok, 20% warning, 10% urgent)
      const regulationRandom = Math.random();
      let lastRegulationDaysAgo: number;
      
      if (regulationRandom < 0.70) {
        // 70% - OK: 0-2 años (0-730 días)
        lastRegulationDaysAgo = randomInRange(0, 730);
        regulationStats.ok++;
      } else if (regulationRandom < 0.90) {
        // 20% - Warning: 2-3 años (731-1095 días)
        lastRegulationDaysAgo = randomInRange(731, 1095);
        regulationStats.warning++;
      } else {
        // 10% - Urgent: 3+ años (1096-1825 días, máximo 5 años)
        lastRegulationDaysAgo = randomInRange(1096, 1825);
        regulationStats.urgent++;
      }
      
      // Generar historial de regulaciones (última + 1-2 anteriores)
      const regulationDates = [
        lastRegulationDaysAgo,
        lastRegulationDaysAgo + randomInRange(730, 1095), // ~2-3 años antes
      ];
      
      for (const days of regulationDates) {
        const serviceDate = dateFromDaysAgo(days);
        
        await db.insert(services).values({
          odId: piano.odId || `PI${piano.id}`,
          pianoId: piano.id,
          clientId: piano.clientId || 1,
          serviceType: 'regulation',
          date: serviceDate.toISOString().split('T')[0],
          cost: generateCost('regulation'),
          notes: generateNotes('regulation'),
          partnerId: 1,
          organizationId: 1,
        });
        
        totalServicesCreated++;
      }
      
      // Generar algunos servicios adicionales aleatorios (10% de probabilidad)
      if (Math.random() < 0.10) {
        const randomServiceType = ['repair', 'maintenance_basic', 'maintenance_complete'][Math.floor(Math.random() * 3)];
        const serviceDate = dateFromDaysAgo(randomInRange(0, 365));
        
        await db.insert(services).values({
          odId: piano.odId || `PI${piano.id}`,
          pianoId: piano.id,
          clientId: piano.clientId || 1,
          serviceType: randomServiceType as any,
          date: serviceDate.toISOString().split('T')[0],
          cost: generateCost(randomServiceType),
          notes: generateNotes(randomServiceType),
          partnerId: 1,
          organizationId: 1,
        });
        
        totalServicesCreated++;
      }
    }
    
    console.log(`\n\n✅ Seed completado exitosamente!`);
    console.log(`\n📊 ESTADÍSTICAS GENERALES:`);
    console.log(`   Total de servicios creados: ${totalServicesCreated}`);
    console.log(`   Pianos procesados: ${allPianos.length}`);
    console.log(`   Promedio de servicios por piano: ${(totalServicesCreated / allPianos.length).toFixed(2)}`);
    
    console.log(`\n🎵 ESTADÍSTICAS DE AFINACIONES:`);
    console.log(`   ✅ OK (0-6 meses): ${tuningStats.ok} pianos (${((tuningStats.ok / allPianos.length) * 100).toFixed(1)}%)`);
    console.log(`   ⚠️  Warning (6-12 meses): ${tuningStats.warning} pianos (${((tuningStats.warning / allPianos.length) * 100).toFixed(1)}%)`);
    console.log(`   🚨 Urgente (12+ meses): ${tuningStats.urgent} pianos (${((tuningStats.urgent / allPianos.length) * 100).toFixed(1)}%)`);
    
    console.log(`\n🔧 ESTADÍSTICAS DE REGULACIONES:`);
    console.log(`   ✅ OK (0-2 años): ${regulationStats.ok} pianos (${((regulationStats.ok / allPianos.length) * 100).toFixed(1)}%)`);
    console.log(`   ⚠️  Warning (2-3 años): ${regulationStats.warning} pianos (${((regulationStats.warning / allPianos.length) * 100).toFixed(1)}%)`);
    console.log(`   🚨 Urgente (3+ años): ${regulationStats.urgent} pianos (${((regulationStats.urgent / allPianos.length) * 100).toFixed(1)}%)`);
    
    console.log(`\n📈 ALERTAS ESPERADAS:`);
    console.log(`   Afinaciones pendientes: ${tuningStats.warning + tuningStats.urgent} pianos`);
    console.log(`   Regulaciones pendientes: ${regulationStats.warning + regulationStats.urgent} pianos`);
    
  } catch (error) {
    console.error('❌ Error al generar servicios:', error);
    throw error;
  }
}

// Ejecutar el seed
seedServices()
  .then(() => {
    console.log('\n🎉 Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
