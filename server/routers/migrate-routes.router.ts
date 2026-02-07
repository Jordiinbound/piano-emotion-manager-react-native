/**
 * Router de Migración de Rutas
 * Piano Emotion Manager
 * 
 * Migración de datos: routeGroup (string) → routeId (foreign key)
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc.js';
import * as db from '../db.js';
import { routes, clients } from '../../drizzle/schema.js';
import { eq, and, isNotNull } from 'drizzle-orm';

export const migrateRoutesRouter = router({
  /**
   * Migrar datos de routeGroup a routeId
   * Este endpoint debe ejecutarse UNA SOLA VEZ después de desplegar el sistema de rutas
   */
  migrateRouteGroupToRouteId: protectedProcedure.mutation(async ({ ctx }) => {
    console.log('[migrate] START - Partner:', ctx.partnerId);
    
    try {
      const database = await db.getDb();
      if (!database) {
        throw new Error('Database not available');
      }

      // 1. Obtener todas las rutas del partner
      const routesList = await database
        .select()
        .from(routes)
        .where(eq(routes.partnerId, ctx.partnerId));

      console.log('[migrate] Found', routesList.length, 'routes');

      // 2. Obtener todos los clientes con routeGroup
      const clientsWithRouteGroup = await database
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.partnerId, ctx.partnerId),
            isNotNull(clients.routeGroup)
          )
        );

      console.log('[migrate] Found', clientsWithRouteGroup.length, 'clients with routeGroup');

      let migratedCount = 0;
      let notFoundCount = 0;
      const notFoundRoutes: string[] = [];

      // 3. Para cada cliente, buscar la ruta correspondiente y actualizar routeId
      for (const client of clientsWithRouteGroup) {
        if (!client.routeGroup) continue;

        // Buscar ruta por nombre
        const route = routesList.find(r => r.name === client.routeGroup);

        if (route) {
          // Actualizar routeId
          await database
            .update(clients)
            .set({ routeId: route.id })
            .where(eq(clients.id, client.id));

          migratedCount++;
          console.log(`[migrate] Client ${client.id}: "${client.routeGroup}" → Route ${route.id}`);
        } else {
          notFoundCount++;
          if (!notFoundRoutes.includes(client.routeGroup)) {
            notFoundRoutes.push(client.routeGroup);
          }
          console.warn(`[migrate] Client ${client.id}: Route "${client.routeGroup}" not found`);
        }
      }

      console.log('[migrate] SUCCESS - Migrated:', migratedCount, 'Not found:', notFoundCount);

      return {
        success: true,
        totalClients: clientsWithRouteGroup.length,
        migratedCount,
        notFoundCount,
        notFoundRoutes,
        message: `Migración completada: ${migratedCount} clientes actualizados, ${notFoundCount} rutas no encontradas`,
      };
    } catch (error) {
      console.error('[migrate] ERROR:', error);
      throw error;
    }
  }),

  /**
   * Verificar estado de migración
   */
  checkMigrationStatus: protectedProcedure.query(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) return null;

    // Contar clientes con routeGroup pero sin routeId
    const [unmigrated] = await database
      .select({ count: db.sql`COUNT(*)` })
      .from(clients)
      .where(
        and(
          eq(clients.partnerId, ctx.partnerId),
          isNotNull(clients.routeGroup),
          db.sql`${clients.routeId} IS NULL`
        )
      );

    // Contar clientes con routeId
    const [migrated] = await database
      .select({ count: db.sql`COUNT(*)` })
      .from(clients)
      .where(
        and(
          eq(clients.partnerId, ctx.partnerId),
          isNotNull(clients.routeId)
        )
      );

    return {
      unmigratedCount: Number(unmigrated?.count || 0),
      migratedCount: Number(migrated?.count || 0),
      needsMigration: Number(unmigrated?.count || 0) > 0,
    };
  }),
});
