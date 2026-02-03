/**
 * Script para limpiar el caché de facturas en Upstash Redis
 * Esto forzará a la aplicación a recargar los datos frescos de la base de datos
 */

import { Redis } from '@upstash/redis';

// Configurar cliente de Redis con las credenciales de Upstash
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

console.log('🧹 Limpiando caché de facturas en Redis...\n');

try {
  // Obtener todas las claves que empiezan con "invoices:"
  const keys = await redis.keys('invoices:*');
  
  console.log(`📋 Encontradas ${keys.length} claves de caché de facturas:`);
  keys.forEach(key => console.log(`  - ${key}`));
  console.log('');
  
  if (keys.length === 0) {
    console.log('✅ No hay claves de caché para limpiar');
    process.exit(0);
  }
  
  // Eliminar todas las claves
  console.log('🗑️  Eliminando claves...');
  for (const key of keys) {
    await redis.del(key);
    console.log(`  ✓ Eliminada: ${key}`);
  }
  
  console.log('');
  console.log('✅ Caché de facturas limpiado exitosamente');
  console.log('');
  console.log('📝 Próximos pasos:');
  console.log('  1. Recarga la página de facturas en el navegador');
  console.log('  2. Las facturas se cargarán directamente desde la base de datos');
  console.log('  3. El nuevo caché se generará con los datos actualizados');
  
} catch (error) {
  console.error('❌ Error al limpiar el caché:', error);
  process.exit(1);
}
