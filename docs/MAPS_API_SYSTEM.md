# Sistema de Maps API Centralizada

## Descripción General

Este sistema implementa un modelo SaaS multi-tenant para gestionar el uso de Google Maps API con control de límites por organización. Permite a Piano Emotion Manager ofrecer funcionalidades de mapas a sus clientes mientras controla costos y monetiza el servicio.

## Arquitectura

### 1. Base de Datos

#### Tabla `organizations` (Extendida)

Nuevos campos agregados:

```sql
-- Plan de Maps API (basic o pro)
mapsApiPlan ENUM('basic', 'pro') DEFAULT 'basic'

-- Contador de requests del mes actual
mapsMonthlyRequests INT DEFAULT 0 NOT NULL

-- Límite mensual de requests (500 para basic, 5000 para pro)
mapsRequestsLimit INT DEFAULT 500 NOT NULL

-- Última fecha de reset del contador mensual
mapsLastResetDate TIMESTAMP
```

#### Tabla `maps_api_usage` (Nueva)

Registra cada uso de la API para auditoría y análisis:

```sql
CREATE TABLE maps_api_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  userId INT NOT NULL,
  endpoint VARCHAR(50) NOT NULL,        -- 'geocode', 'directions', etc.
  requestType VARCHAR(30) NOT NULL,     -- Tipo específico de request
  cost INT DEFAULT 1 NOT NULL,          -- Costo en requests
  metadata JSON,                         -- Datos adicionales
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX maps_usage_org_idx (organizationId),
  INDEX maps_usage_user_idx (userId),
  INDEX maps_usage_created_idx (createdAt),
  INDEX maps_usage_org_created_idx (organizationId, createdAt),
  
  FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE
);
```

### 2. Middleware (`server/middleware/mapsUsage.ts`)

#### Funciones Principales

**`checkMapsUsage(organizationId, cost)`**
- Verifica si la organización puede hacer un request
- Resetea contador si es un nuevo mes
- Retorna: `{ allowed, remaining, plan, limit }`

**`trackMapsUsage(organizationId, userId, endpoint, requestType, cost, metadata)`**
- Registra el uso en `maps_api_usage`
- Incrementa el contador mensual en `organizations`

**`getMapsUsageStats(organizationId)`**
- Obtiene estadísticas completas de uso
- Retorna: plan, límite, usado, restante, porcentaje, uso por tipo

**`updateMapsApiPlan(organizationId, newPlan)`**
- Actualiza el plan de la organización
- Ajusta el límite mensual automáticamente

**`requireMapsApiAccess(organizationId, requestType)`**
- Middleware para tRPC
- Verifica límites antes de ejecutar la operación
- Lanza error si se excede el límite

#### Costos por Operación

```typescript
const MAPS_API_COSTS = {
  geocode: 1,
  reverse_geocode: 1,
  autocomplete: 1,
  directions: 2,           // Más costoso
  route_optimization: 3,   // Más costoso
  distance_matrix: 2,
  places_search: 1,
};
```

### 3. Router tRPC (`server/routers/maps-api.router.ts`)

#### Endpoints Disponibles

**`mapsApi.geocode`** (Query)
- Input: `{ address: string }`
- Geocodifica una dirección a coordenadas
- Costo: 1 request

**`mapsApi.reverseGeocode`** (Query)
- Input: `{ lat: number, lng: number }`
- Convierte coordenadas a dirección
- Costo: 1 request

**`mapsApi.directions`** (Query)
- Input: `{ origin, destination, waypoints?, optimize? }`
- Calcula ruta entre dos puntos
- Costo: 2 requests

**`mapsApi.optimizeRoute`** (Mutation)
- Input: `{ origin, destination, waypoints[] }`
- Optimiza ruta con múltiples paradas
- Costo: 3 requests

**`mapsApi.getUsageStats`** (Query)
- Obtiene estadísticas de uso de la organización
- Sin costo

**`mapsApi.updatePlan`** (Mutation)
- Input: `{ plan: 'basic' | 'pro' }`
- Actualiza el plan de Maps API
- Requiere permisos de admin

**`mapsApi.getPlans`** (Query)
- Obtiene información de planes disponibles
- Sin costo

### 4. Dashboard UI (`app/settings/maps-api-usage.tsx`)

Componente React Native que muestra:

- **Barra de progreso** con alertas visuales (verde/amarillo/rojo)
- **Estadísticas principales**: usado, límite, restante, porcentaje
- **Uso por tipo de request**: desglose detallado
- **Planes disponibles**: comparación con precios
- **Actualización de plan**: botón para cambiar plan
- **Costos de operaciones**: tabla de referencia

## Flujo de Uso

### 1. Request de Geocodificación

```typescript
// Frontend (React Native)
const { data, error } = trpc.mapsApi.geocode.useQuery({
  address: "Calle Mayor 1, Madrid"
});

// Backend (automático)
// 1. requireMapsApiAccess() verifica límites
// 2. Si OK, llama a Google Maps API
// 3. trackMapsUsage() registra el uso
// 4. Retorna resultado al frontend
```

### 2. Verificación de Límites

```typescript
// Antes de cada request:
const usage = await checkMapsUsage(organizationId, cost);

if (!usage.allowed) {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: `Límite mensual alcanzado (${usage.limit} requests)`
  });
}
```

### 3. Reset Mensual Automático

```typescript
// En checkMapsUsage():
const now = new Date();
const lastReset = org.mapsLastResetDate;

if (isNewMonth(lastReset, now)) {
  // Resetear contador
  await db.update(organizations).set({
    mapsMonthlyRequests: 0,
    mapsLastResetDate: now
  });
}
```

## Modelo de Negocio

### Planes

| Plan | Requests/Mes | Precio | Características |
|------|--------------|--------|-----------------|
| **Básico** | 500 | Incluido | Geocodificación, rutas básicas |
| **Pro** | 5,000 | +29€/mes | Optimización de rutas, soporte prioritario |

### Costos Estimados

**Uso típico de un técnico de pianos:**
- 5 servicios/día × 20 días = 100 servicios/mes
- 1 geocode por servicio = 100 requests
- 1 ruta optimizada/día = 20 × 3 = 60 requests
- **Total: ~160 requests/mes** → Plan Básico suficiente

**Organización con 5 técnicos:**
- 160 × 5 = 800 requests/mes → **Necesita Plan Pro**

### Monetización

1. **Plan Básico**: Incluido en suscripción base
2. **Plan Pro**: +29€/mes por organización
3. **Margen**: Google Maps cobra ~$5 por 1000 requests
   - Pro (5000 req) = $25/mes de costo
   - Precio: 29€/mes (~$31)
   - Margen: ~$6/mes por cliente Pro

## Instalación y Migración

### 1. Ejecutar Migración de Base de Datos

```bash
cd /tmp/piano-repo

# Generar migración
pnpm drizzle-kit generate

# Aplicar cambios a la base de datos
pnpm db:push
```

### 2. Verificar Tablas

```sql
-- Verificar nuevos campos en organizations
DESCRIBE organizations;

-- Verificar nueva tabla
DESCRIBE maps_api_usage;

-- Verificar datos iniciales
SELECT id, name, mapsApiPlan, mapsRequestsLimit, mapsMonthlyRequests 
FROM organizations 
LIMIT 5;
```

### 3. Configurar Variable de Entorno

Ya configurada en Vercel:
```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAXlnMSzae6Spws_GcRdDm0D1zZyefvqHw
```

### 4. Agregar Ruta al Menú

Editar el archivo de navegación de Settings para agregar:

```typescript
{
  name: 'Uso de Maps API',
  route: '/settings/maps-api-usage',
  icon: 'map',
}
```

## Uso en el Código

### Ejemplo: Geocodificar Dirección de Cliente

```typescript
import { trpc } from '@/utils/trpc';

function ClientAddressMap({ address }: { address: string }) {
  const { data, isLoading, error } = trpc.mapsApi.geocode.useQuery({
    address
  });

  if (isLoading) return <ActivityIndicator />;
  if (error) return <Text>Error: {error.message}</Text>;

  const location = data?.results[0]?.geometry.location;

  return (
    <MapView
      initialRegion={{
        latitude: location.lat,
        longitude: location.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    >
      <Marker coordinate={location} />
    </MapView>
  );
}
```

### Ejemplo: Optimizar Ruta de Servicios

```typescript
const optimizeRouteMutation = trpc.mapsApi.optimizeRoute.useMutation();

async function optimizeServiceRoute(services: Service[]) {
  const waypoints = services.map(s => s.clientAddress);
  
  const result = await optimizeRouteMutation.mutateAsync({
    origin: "Oficina Central",
    destination: "Oficina Central",
    waypoints,
  });

  // result.waypointOrder contiene el orden optimizado
  const optimizedServices = result.waypointOrder.map(i => services[i]);
  return optimizedServices;
}
```

## Monitoreo y Alertas

### Alertas Automáticas

El sistema muestra alertas visuales en el dashboard cuando:

- **80-99% de uso**: Alerta amarilla "Estás cerca de alcanzar tu límite"
- **100% de uso**: Alerta roja "Has alcanzado tu límite mensual"

### Métricas Recomendadas

Monitorear en producción:

1. **Uso promedio por organización**: Para ajustar límites
2. **Tasa de conversión a Pro**: Cuántas organizaciones upgradan
3. **Requests por tipo**: Qué operaciones son más usadas
4. **Organizaciones que alcanzan límite**: Oportunidad de upsell

## Mejoras Futuras

### Fase 2: BYOK (Bring Your Own Key)

Para clientes Enterprise:

```typescript
// Agregar a schema
export const organizations = mysqlTable('organizations', {
  // ... campos existentes
  googleMapsApiKey: text('google_maps_api_key'), // Encriptada
});

// Modificar middleware
const apiKey = org.googleMapsApiKey 
  ? decrypt(org.googleMapsApiKey)
  : process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
```

### Otras Mejoras

- [ ] Webhook para notificar al owner cuando se alcanza 90% de uso
- [ ] Exportación de reportes de uso en CSV
- [ ] Gráficos de tendencia de uso mensual
- [ ] Alertas por email cuando se alcanza límite
- [ ] API pública para que clientes consulten su uso
- [ ] Descuentos por volumen para organizaciones grandes

## Soporte

Para problemas o preguntas:

1. Revisar logs en `maps_api_usage` tabla
2. Verificar estadísticas con `mapsApi.getUsageStats`
3. Comprobar límites en tabla `organizations`
4. Revisar logs del servidor para errores de Google Maps API

## Referencias

- [Google Maps Geocoding API](https://developers.google.com/maps/documentation/geocoding)
- [Google Maps Directions API](https://developers.google.com/maps/documentation/directions)
- [Pricing de Google Maps](https://developers.google.com/maps/billing-and-pricing/pricing)
