# Guía de Migración: Sistema de Maps API Centralizada

## Resumen

Esta guía te ayudará a aplicar los cambios necesarios en la base de datos para activar el sistema de Maps API con control de límites.

## Pre-requisitos

- Acceso a la base de datos TiDB
- Credenciales de conexión configuradas
- Node.js y pnpm instalados

## Pasos de Migración

### 1. Verificar Conexión a Base de Datos

```bash
cd /tmp/piano-repo

# Verificar que la conexión funciona
pnpm drizzle-kit introspect
```

### 2. Generar Migración

```bash
# Generar archivos de migración basados en schema.ts
pnpm drizzle-kit generate
```

Esto creará archivos SQL en el directorio `drizzle/migrations/`.

### 3. Revisar Migración Generada

Antes de aplicar, revisa los archivos generados:

```bash
ls -la drizzle/migrations/
cat drizzle/migrations/XXXX_*.sql
```

Deberías ver:

**Alteración de tabla `organizations`:**
```sql
ALTER TABLE organizations 
  ADD COLUMN mapsApiPlan ENUM('basic','pro') DEFAULT 'basic',
  ADD COLUMN mapsMonthlyRequests INT DEFAULT 0 NOT NULL,
  ADD COLUMN mapsRequestsLimit INT DEFAULT 500 NOT NULL,
  ADD COLUMN mapsLastResetDate TIMESTAMP;
```

**Creación de tabla `maps_api_usage`:**
```sql
CREATE TABLE maps_api_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  user_id INT NOT NULL,
  endpoint VARCHAR(50) NOT NULL,
  request_type VARCHAR(30) NOT NULL,
  cost INT DEFAULT 1 NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  INDEX maps_usage_org_idx (organization_id),
  INDEX maps_usage_user_idx (user_id),
  INDEX maps_usage_created_idx (created_at),
  INDEX maps_usage_org_created_idx (organization_id, created_at),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);
```

### 4. Aplicar Migración

```bash
# Aplicar cambios a la base de datos
pnpm db:push
```

Este comando:
1. Conecta a TiDB
2. Compara el schema actual con `drizzle/schema.ts`
3. Aplica los cambios necesarios

### 5. Verificar Cambios

Conéctate a TiDB y verifica:

```sql
-- Verificar nuevos campos en organizations
DESCRIBE organizations;

-- Deberías ver:
-- mapsApiPlan         | enum('basic','pro') | YES  |     | basic
-- mapsMonthlyRequests | int                 | NO   |     | 0
-- mapsRequestsLimit   | int                 | NO   |     | 500
-- mapsLastResetDate   | timestamp           | YES  |     | NULL

-- Verificar nueva tabla
DESCRIBE maps_api_usage;

-- Verificar índices
SHOW INDEX FROM maps_api_usage;
```

### 6. Inicializar Datos

Todas las organizaciones existentes tendrán automáticamente:
- `mapsApiPlan = 'basic'`
- `mapsRequestsLimit = 500`
- `mapsMonthlyRequests = 0`

No se requiere script de inicialización adicional.

### 7. Desplegar Código

```bash
# Hacer commit de los cambios
git add .
git commit -m "feat: Implementar sistema de Maps API centralizada con control de límites"

# Push a GitHub
git push origin main
```

Vercel desplegará automáticamente los cambios.

### 8. Verificar en Producción

Una vez desplegado:

1. Accede a la app en https://www.pianoemotion.com
2. Ve a Settings → Maps API Usage
3. Verifica que se muestra el dashboard correctamente
4. Prueba hacer un geocode desde la app
5. Verifica que el contador se incrementa

## Rollback (Si es necesario)

Si algo sale mal, puedes revertir los cambios:

```sql
-- Eliminar tabla nueva
DROP TABLE IF EXISTS maps_api_usage;

-- Eliminar columnas de organizations
ALTER TABLE organizations 
  DROP COLUMN mapsApiPlan,
  DROP COLUMN mapsMonthlyRequests,
  DROP COLUMN mapsRequestsLimit,
  DROP COLUMN mapsLastResetDate;
```

Luego revierte el código:

```bash
git revert HEAD
git push origin main
```

## Troubleshooting

### Error: "Column already exists"

Si ves este error, significa que la columna ya existe. Verifica manualmente:

```sql
SELECT mapsApiPlan, mapsRequestsLimit 
FROM organizations 
LIMIT 1;
```

Si funciona, la migración ya se aplicó.

### Error: "Foreign key constraint fails"

Verifica que la tabla `organizations` existe:

```sql
SHOW TABLES LIKE 'organizations';
```

### Error: "Enum values don't match"

Si necesitas cambiar los valores del enum:

```sql
ALTER TABLE organizations 
MODIFY COLUMN mapsApiPlan ENUM('basic','pro','enterprise') DEFAULT 'basic';
```

## Verificación Post-Migración

Ejecuta estos queries para confirmar que todo funciona:

```sql
-- 1. Contar organizaciones por plan
SELECT mapsApiPlan, COUNT(*) as count 
FROM organizations 
GROUP BY mapsApiPlan;

-- Resultado esperado:
-- basic | (número de organizaciones)

-- 2. Verificar límites
SELECT id, name, mapsApiPlan, mapsRequestsLimit, mapsMonthlyRequests 
FROM organizations 
LIMIT 10;

-- 3. Verificar tabla de tracking (debería estar vacía inicialmente)
SELECT COUNT(*) FROM maps_api_usage;

-- Resultado esperado: 0
```

## Próximos Pasos

Una vez completada la migración:

1. ✅ Agregar enlace al dashboard en el menú de Settings
2. ✅ Documentar el sistema para el equipo
3. ✅ Configurar alertas de uso
4. ✅ Preparar materiales de marketing para el Plan Pro
5. ✅ Monitorear uso en las primeras semanas

## Soporte

Si encuentras problemas durante la migración:

1. Revisa los logs de Drizzle: `pnpm db:push --verbose`
2. Verifica la conexión a TiDB
3. Consulta la documentación completa en `MAPS_API_SYSTEM.md`
