/**
 * Script para listar todas las claves en Upstash Redis
 */

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

console.log('🔍 Listando todas las claves en Redis...\n');

try {
  // Obtener todas las claves
  const allKeys = await redis.keys('*');
  
  console.log(`📋 Total de claves: ${allKeys.length}\n`);
  
  if (allKeys.length === 0) {
    console.log('✅ Redis está vacío (no hay claves)');
    process.exit(0);
  }
  
  // Agrupar por prefijo
  const grouped = {};
  allKeys.forEach(key => {
    const prefix = key.split(':')[0];
    if (!grouped[prefix]) {
      grouped[prefix] = [];
    }
    grouped[prefix].push(key);
  });
  
  // Mostrar agrupado
  console.log('📊 Claves agrupadas por prefijo:\n');
  Object.entries(grouped).forEach(([prefix, keys]) => {
    console.log(`  ${prefix}: (${keys.length} claves)`);
    keys.slice(0, 5).forEach(key => console.log(`    - ${key}`));
    if (keys.length > 5) {
      console.log(`    ... y ${keys.length - 5} más`);
    }
    console.log('');
  });
  
} catch (error) {
  console.error('❌ Error al listar claves:', error);
  process.exit(1);
}
