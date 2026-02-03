/**
 * Router de Debug - TEMPORAL
 * Para diagnosticar problemas con analytics
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { db } from '../db/index.js';
import { services, clients, pianos, users } from '../../drizzle/schema.js';
import { eq, sql, and, gte, lte } from 'drizzle-orm';

export const debugRouter = router({
  /**
   * Endpoint de debug completo
   */
  getDebugInfo: protectedProcedure.query(async ({ ctx }) => {
    console.log('[DEBUG] ===== INICIO DEBUG INFO =====');
    console.log('[DEBUG] ctx.user:', JSON.stringify(ctx.user, null, 2));
    console.log('[DEBUG] ctx.partnerId:', (ctx as any).partnerId);
    
    const partnerId = (ctx as any).partnerId;
    
    // 1. Información del usuario
    const userInfo = {
      userId: ctx.user?.id,
      userEmail: ctx.user?.email,
      userName: ctx.user?.name,
      partnerId: partnerId,
    };
    
    console.log('[DEBUG] userInfo:', JSON.stringify(userInfo, null, 2));
    
    // 2. Contar registros totales en cada tabla
    const totalServices = await db.select({ count: sql<number>`count(*)` }).from(services);
    const totalClients = await db.select({ count: sql<number>`count(*)` }).from(clients);
    const totalPianos = await db.select({ count: sql<number>`count(*)` }).from(pianos);
    
    const totals = {
      services: totalServices[0]?.count || 0,
      clients: totalClients[0]?.count || 0,
      pianos: totalPianos[0]?.count || 0,
    };
    
    console.log('[DEBUG] totals:', JSON.stringify(totals, null, 2));
    
    // 3. Contar registros con partnerId del usuario
    const servicesWithPartnerId = await db
      .select({ count: sql<number>`count(*)` })
      .from(services)
      .where(eq(services.partnerId, partnerId));
      
    const clientsWithPartnerId = await db
      .select({ count: sql<number>`count(*)` })
      .from(clients)
      .where(eq(clients.partnerId, partnerId));
      
    const pianosWithPartnerId = await db
      .select({ count: sql<number>`count(*)` })
      .from(pianos)
      .where(eq(pianos.partnerId, partnerId));
    
    const withPartnerId = {
      services: servicesWithPartnerId[0]?.count || 0,
      clients: clientsWithPartnerId[0]?.count || 0,
      pianos: pianosWithPartnerId[0]?.count || 0,
    };
    
    console.log('[DEBUG] withPartnerId:', JSON.stringify(withPartnerId, null, 2));
    
    // 4. Obtener valores únicos de partnerId en cada tabla
    const uniquePartnerIdsServices = await db
      .selectDistinct({ partnerId: services.partnerId })
      .from(services)
      .limit(10);
      
    const uniquePartnerIdsClients = await db
      .selectDistinct({ partnerId: clients.partnerId })
      .from(clients)
      .limit(10);
      
    const uniquePartnerIdsPianos = await db
      .selectDistinct({ partnerId: pianos.partnerId })
      .from(pianos)
      .limit(10);
    
    const uniquePartnerIds = {
      services: uniquePartnerIdsServices.map(r => r.partnerId),
      clients: uniquePartnerIdsClients.map(r => r.partnerId),
      pianos: uniquePartnerIdsPianos.map(r => r.partnerId),
    };
    
    console.log('[DEBUG] uniquePartnerIds:', JSON.stringify(uniquePartnerIds, null, 2));
    
    // 5. Obtener muestra de servicios (primeros 5)
    const sampleServices = await db
      .select({
        id: services.id,
        partnerId: services.partnerId,
        clientId: services.clientId,
        pianoId: services.pianoId,
        serviceType: services.serviceType,
        cost: services.cost,
        status: services.status,
        createdAt: services.createdAt,
      })
      .from(services)
      .limit(5);
    
    console.log('[DEBUG] sampleServices:', JSON.stringify(sampleServices, null, 2));
    
    // 6. Obtener muestra de clientes (primeros 5)
    const sampleClients = await db
      .select({
        id: clients.id,
        partnerId: clients.partnerId,
        name: clients.name,
        email: clients.email,
        createdAt: clients.createdAt,
      })
      .from(clients)
      .limit(5);
    
    console.log('[DEBUG] sampleClients:', JSON.stringify(sampleClients, null, 2));
    
    // 7. Obtener muestra de pianos (primeros 5)
    const samplePianos = await db
      .select({
        id: pianos.id,
        partnerId: pianos.partnerId,
        clientId: pianos.clientId,
        brand: pianos.brand,
        model: pianos.model,
        createdAt: pianos.createdAt,
      })
      .from(pianos)
      .limit(5);
    
    console.log('[DEBUG] samplePianos:', JSON.stringify(samplePianos, null, 2));
    
    // 8. Verificar si hay servicios en el rango de fechas típico
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    
    const servicesInRange = await db
      .select({ count: sql<number>`count(*)` })
      .from(services)
      .where(
        and(
          eq(services.partnerId, partnerId),
          gte(services.createdAt, oneYearAgo),
          lte(services.createdAt, now)
        )
      );
    
    const servicesInRangeCount = servicesInRange[0]?.count || 0;
    
    console.log('[DEBUG] servicesInRangeCount:', servicesInRangeCount);
    
    console.log('[DEBUG] ===== FIN DEBUG INFO =====');
    
    return {
      userInfo,
      totals,
      withPartnerId,
      uniquePartnerIds,
      samples: {
        services: sampleServices,
        clients: sampleClients,
        pianos: samplePianos,
      },
      dateRangeCheck: {
        startDate: oneYearAgo.toISOString(),
        endDate: now.toISOString(),
        servicesCount: servicesInRangeCount,
      },
    };
  }),
});

export type DebugRouter = typeof debugRouter;
