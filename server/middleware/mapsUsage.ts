import { db } from '../db';
import { organizations, mapsApiUsage } from '../../drizzle/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

/**
 * Límites de Maps API por plan
 */
export const MAPS_API_LIMITS = {
  basic: 1000,   // 1000 requests/mes - Suficiente para 1-3 técnicos
  pro: 5000,     // 5000 requests/mes - Para organizaciones con 4-15 técnicos
  enterprise: 20000, // 20000 requests/mes - Para grandes organizaciones (16+ técnicos)
} as const;

/**
 * Costos de diferentes tipos de requests
 */
export const MAPS_API_COSTS = {
  geocode: 1,
  reverse_geocode: 1,
  autocomplete: 1,
  directions: 2,           // Más costoso
  route_optimization: 3,   // Más costoso
  distance_matrix: 2,
  places_search: 1,
} as const;

/**
 * Verifica si la organización puede hacer un request a Maps API
 * @param organizationId ID de la organización
 * @param cost Costo del request (por defecto 1)
 * @returns Información sobre si está permitido y requests restantes
 */
export async function checkMapsUsage(
  organizationId: number,
  cost: number = 1
): Promise<{ allowed: boolean; remaining: number; plan: string; limit: number }> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!org) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Organización no encontrada',
    });
  }

  // Verificar si necesitamos resetear el contador mensual
  const now = new Date();
  const lastReset = org.mapsLastResetDate ? new Date(org.mapsLastResetDate) : null;
  
  let currentUsage = org.mapsMonthlyRequests;
  
  // Resetear si es un nuevo mes
  if (!lastReset || isNewMonth(lastReset, now)) {
    currentUsage = 0;
    await db.update(organizations)
      .set({
        mapsMonthlyRequests: 0,
        mapsLastResetDate: now.toISOString(),
      })
      .where(eq(organizations.id, organizationId));
  }

  const plan = org.mapsApiPlan || 'basic';
  const limit = org.mapsRequestsLimit || MAPS_API_LIMITS[plan];
  const remaining = Math.max(0, limit - currentUsage);

  // Verificar si excede el límite
  if (currentUsage + cost > limit) {
    return {
      allowed: false,
      remaining,
      plan,
      limit,
    };
  }

  return {
    allowed: true,
    remaining: remaining - cost,
    plan,
    limit,
  };
}

/**
 * Registra el uso de Maps API
 * @param organizationId ID de la organización
 * @param userId ID del usuario que hizo el request
 * @param endpoint Endpoint usado (geocode, directions, etc.)
 * @param requestType Tipo específico de request
 * @param cost Costo del request
 * @param metadata Datos adicionales opcionales
 */
export async function trackMapsUsage(
  organizationId: number,
  userId: number,
  endpoint: string,
  requestType: string,
  cost: number = 1,
  metadata?: any
): Promise<void> {
  // Registrar en la tabla de tracking
  await db.insert(mapsApiUsage).values({
    organizationId,
    userId,
    endpoint,
    requestType,
    cost,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });

  // Incrementar contador mensual
  await db.update(organizations)
    .set({
      mapsMonthlyRequests: sql`${organizations.mapsMonthlyRequests} + ${cost}`,
    })
    .where(eq(organizations.id, organizationId));
}

/**
 * Obtiene estadísticas de uso de Maps API para una organización
 * @param organizationId ID de la organización
 * @returns Estadísticas de uso
 */
export async function getMapsUsageStats(organizationId: number) {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!org) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Organización no encontrada',
    });
  }

  const plan = org.mapsApiPlan || 'basic';
  const limit = org.mapsRequestsLimit || MAPS_API_LIMITS[plan];
  const used = org.mapsMonthlyRequests;
  const remaining = Math.max(0, limit - used);
  const percentage = Math.min(100, Math.round((used / limit) * 100));

  // Obtener uso por tipo de request en el mes actual
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usageByType = await db
    .select({
      requestType: mapsApiUsage.requestType,
      count: sql<number>`COUNT(*)`,
      totalCost: sql<number>`SUM(${mapsApiUsage.cost})`,
    })
    .from(mapsApiUsage)
    .where(
      and(
        eq(mapsApiUsage.organizationId, organizationId),
        gte(mapsApiUsage.createdAt, startOfMonth.toISOString())
      )
    )
    .groupBy(mapsApiUsage.requestType);

  return {
    plan,
    limit,
    used,
    remaining,
    percentage,
    lastResetDate: org.mapsLastResetDate,
    usageByType: usageByType.map(u => ({
      type: u.requestType,
      count: Number(u.count),
      cost: Number(u.totalCost),
    })),
  };
}

/**
 * Actualiza el plan de Maps API de una organización
 * @param organizationId ID de la organización
 * @param newPlan Nuevo plan (basic o pro)
 */
export async function updateMapsApiPlan(
  organizationId: number,
  newPlan: 'basic' | 'pro' | 'enterprise'
): Promise<void> {
  const newLimit = MAPS_API_LIMITS[newPlan];

  await db.update(organizations)
    .set({
      mapsApiPlan: newPlan,
      mapsRequestsLimit: newLimit,
    })
    .where(eq(organizations.id, organizationId));
}

/**
 * Verifica si dos fechas están en meses diferentes
 */
function isNewMonth(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() !== date2.getFullYear() ||
    date1.getMonth() !== date2.getMonth()
  );
}

/**
 * Middleware para tRPC que verifica límites de Maps API
 */
export async function requireMapsApiAccess(
  organizationId: number,
  requestType: keyof typeof MAPS_API_COSTS = 'geocode'
) {
  const cost = MAPS_API_COSTS[requestType] || 1;
  const usage = await checkMapsUsage(organizationId, cost);

  if (!usage.allowed) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Límite mensual de Maps API alcanzado (${usage.limit} requests). Has usado ${usage.limit - usage.remaining} de ${usage.limit}. Actualiza tu plan para continuar.`,
    });
  }

  return { cost, usage };
}
