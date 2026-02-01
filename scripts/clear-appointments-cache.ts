/**
 * Script para limpiar el caché de appointments en Upstash Redis
 * Uso: tsx scripts/clear-appointments-cache.ts
 */

import { Redis } from '@upstash/redis';

async function clearAppointmentsCache() {
  console.log('🧹 Iniciando limpieza de caché de appointments...\n');

  // Verificar variables de entorno
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.error('❌ Error: Variables de entorno no configuradas');
    console.error('   UPSTASH_REDIS_REST_URL:', url ? '✓' : '✗');
    console.error('   UPSTASH_REDIS_REST_TOKEN:', token ? '✓' : '✗');
    process.exit(1);
  }

  console.log('✓ Variables de entorno configuradas');
  console.log('  URL:', url.substring(0, 30) + '...');
  console.log('  Token:', token.substring(0, 20) + '...\n');

  // Conectar a Redis
  const redis = new Redis({
    url,
    token,
  });

  try {
    // Buscar todas las claves que empiecen con "appointments:"
    console.log('🔍 Buscando claves de appointments...');
    
    // Obtener todas las claves (SCAN es más eficiente que KEYS en producción)
    const pattern = 'appointments:*';
    let cursor = 0;
    let allKeys: string[] = [];
    
    do {
      const result = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = result[0];
      const keys = result[1];
      allKeys = allKeys.concat(keys);
      console.log(`  Encontradas ${keys.length} claves en esta iteración (cursor: ${cursor})`);
    } while (cursor !== 0);

    console.log(`\n📊 Total de claves encontradas: ${allKeys.length}`);

    if (allKeys.length === 0) {
      console.log('✓ No hay claves de appointments en caché');
      return;
    }

    // Mostrar las claves encontradas
    console.log('\n📋 Claves a eliminar:');
    allKeys.forEach((key, index) => {
      console.log(`  ${index + 1}. ${key}`);
    });

    // Eliminar todas las claves
    console.log('\n🗑️  Eliminando claves...');
    let deletedCount = 0;
    
    for (const key of allKeys) {
      try {
        await redis.del(key);
        deletedCount++;
        console.log(`  ✓ Eliminada: ${key}`);
      } catch (error) {
        console.error(`  ✗ Error al eliminar ${key}:`, error);
      }
    }

    console.log(`\n✅ Limpieza completada: ${deletedCount}/${allKeys.length} claves eliminadas`);
    
    // Verificar que se eliminaron
    console.log('\n🔍 Verificando limpieza...');
    const remainingKeys = await redis.keys(pattern);
    if (remainingKeys.length === 0) {
      console.log('✓ Verificación exitosa: No quedan claves de appointments en caché');
    } else {
      console.warn(`⚠️  Advertencia: Aún quedan ${remainingKeys.length} claves`);
      remainingKeys.forEach(key => console.log(`  - ${key}`));
    }

  } catch (error) {
    console.error('\n❌ Error durante la limpieza:', error);
    process.exit(1);
  }
}

// Ejecutar
clearAppointmentsCache()
  .then(() => {
    console.log('\n🎉 Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
