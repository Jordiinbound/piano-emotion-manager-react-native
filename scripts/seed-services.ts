/**
 * Script para generar servicios de prueba para pianos existentes
 * 
 * Este script:
 * 1. Obtiene todos los pianos de la base de datos
 * 2. Para cada piano, genera servicios aleatorios (afinaciones, regulaciones, reparaciones)
 * 3. Distribuye los servicios en el tiempo para simular un historial realista
 * 
 * Uso:
 * npx ts-node scripts/seed-services.ts
 */

import { db } from '../server/db';
import { pianos, services } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

// Tipos de servicio disponibles
const SERVICE_TYPES = ['tuning', 'regulation', 'repair', 'voicing', 'cleaning'] as const;

// Función para generar una fecha aleatoria en el pasado
function randomPastDate(maxDaysAgo: number): Date {
  const daysAgo = Math.floor(Math.random() * maxDaysAgo);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

// Función para generar un costo aleatorio basado en el tipo de servicio
function generateCost(serviceType: string): number {
  const costs = {
    tuning: { min: 80, max: 150 },
    regulation: { min: 200, max: 500 },
    repair: { min: 100, max: 800 },
    voicing: { min: 150, max: 300 },
    cleaning: { min: 50, max: 120 },
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
      'Regulación estándar completada. Se recomienda revisión anual.',
      'Mecanismo regulado y ajustado. Excelente respuesta al tacto.',
    ],
    repair: [
      'Reparación de cuerdas rotas. Piano funcionando correctamente.',
      'Sustitución de fieltros desgastados. Mejora en el sonido.',
      'Reparación de teclas pegajosas. Problema resuelto.',
      'Reparación menor completada. Piano en buen estado.',
    ],
    voicing: [
      'Entonación de martillos realizada. Mejora en la calidad del sonido.',
      'Ajuste de timbre completado. Sonido más uniforme.',
      'Voicing estándar. Piano sonando equilibrado.',
    ],
    cleaning: [
      'Limpieza profunda completada. Piano en excelente estado estético.',
      'Limpieza interior y exterior. Polvo y suciedad eliminados.',
      'Mantenimiento de limpieza regular. Piano bien cuidado.',
    ],
  };
  
  const serviceNotes = notes[serviceType as keyof typeof notes] || ['Servicio completado correctamente.'];
  return serviceNotes[Math.floor(Math.random() * serviceNotes.length)];
}

async function seedServices() {
  try {
    console.log('🎹 Iniciando generación de servicios de prueba...\n');
    
    // Obtener todos los pianos
    const allPianos = await db.select().from(pianos);
    console.log(`📊 Encontrados ${allPianos.length} pianos en la base de datos\n`);
    
    if (allPianos.length === 0) {
      console.log('❌ No hay pianos en la base de datos. Ejecuta primero el seed de pianos.');
      return;
    }
    
    let totalServicesCreated = 0;
    
    // Para cada piano, generar servicios
    for (const piano of allPianos) {
      console.log(`\n🎹 Generando servicios para piano: ${piano.brand} ${piano.model} (${piano.id})`);
      
      const pianoAge = Math.floor((Date.now() - new Date(piano.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      console.log(`   Edad del piano en el sistema: ${pianoAge} días`);
      
      // Generar afinaciones (cada 6 meses aproximadamente)
      const tuningCount = Math.min(Math.floor(pianoAge / 180) + 1, 5); // Máximo 5 afinaciones
      console.log(`   📝 Generando ${tuningCount} afinaciones...`);
      
      for (let i = 0; i < tuningCount; i++) {
        const daysAgo = 180 * i + Math.floor(Math.random() * 60); // Cada 6 meses ± 2 meses
        const serviceDate = new Date();
        serviceDate.setDate(serviceDate.getDate() - daysAgo);
        
        await db.insert(services).values({
          pianoId: piano.id,
          serviceType: 'tuning',
          date: serviceDate.toISOString().split('T')[0],
          cost: generateCost('tuning'),
          notes: generateNotes('tuning'),
        });
        
        totalServicesCreated++;
      }
      
      // Generar regulaciones (cada 2 años aproximadamente, si el piano tiene suficiente edad)
      if (pianoAge > 730) {
        const regulationCount = Math.min(Math.floor(pianoAge / 730) + 1, 2); // Máximo 2 regulaciones
        console.log(`   🔧 Generando ${regulationCount} regulaciones...`);
        
        for (let i = 0; i < regulationCount; i++) {
          const daysAgo = 730 * i + Math.floor(Math.random() * 180); // Cada 2 años ± 6 meses
          const serviceDate = new Date();
          serviceDate.setDate(serviceDate.getDate() - daysAgo);
          
          await db.insert(services).values({
            pianoId: piano.id,
            serviceType: 'regulation',
            date: serviceDate.toISOString().split('T')[0],
            cost: generateCost('regulation'),
            notes: generateNotes('regulation'),
          });
          
          totalServicesCreated++;
        }
      }
      
      // Generar algunos servicios adicionales aleatorios (20% de probabilidad)
      if (Math.random() < 0.2) {
        const randomServiceType = SERVICE_TYPES[Math.floor(Math.random() * SERVICE_TYPES.length)];
        const serviceDate = randomPastDate(Math.min(pianoAge, 365));
        
        console.log(`   ✨ Generando servicio adicional: ${randomServiceType}...`);
        
        await db.insert(services).values({
          pianoId: piano.id,
          serviceType: randomServiceType,
          date: serviceDate.toISOString().split('T')[0],
          cost: generateCost(randomServiceType),
          notes: generateNotes(randomServiceType),
        });
        
        totalServicesCreated++;
      }
      
      console.log(`   ✅ Servicios generados para este piano`);
    }
    
    console.log(`\n\n✅ Seed completado exitosamente!`);
    console.log(`📊 Total de servicios creados: ${totalServicesCreated}`);
    console.log(`🎹 Pianos procesados: ${allPianos.length}`);
    console.log(`📈 Promedio de servicios por piano: ${(totalServicesCreated / allPianos.length).toFixed(2)}`);
    
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
