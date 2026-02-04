/**
 * Sistema de versionado de caché
 * 
 * Genera un hash de versión basado en el timestamp de build
 * Cuando se despliega código nuevo, el hash cambia automáticamente
 * invalidando toda la caché anterior sin necesidad de limpiarla manualmente
 */

// Generar hash de versión basado en timestamp de inicio del servidor
// Esto cambia en cada despliegue, invalidando automáticamente la caché anterior
const BUILD_TIMESTAMP = Date.now().toString(36);

/**
 * Obtener la versión actual de caché
 * Esta versión cambia en cada despliegue
 */
export function getCacheVersion(): string {
  return BUILD_TIMESTAMP;
}

/**
 * Generar clave de caché con versión
 * Ejemplo: "predictions:summary:123" → "v:abc123:predictions:summary:123"
 */
export function getVersionedCacheKey(key: string): string {
  return `v:${BUILD_TIMESTAMP}:${key}`;
}

/**
 * Información de versión para logging
 */
export function getCacheVersionInfo() {
  return {
    version: BUILD_TIMESTAMP,
    timestamp: new Date().toISOString(),
    note: 'Cache version changes on every deployment, automatically invalidating old cache'
  };
}
