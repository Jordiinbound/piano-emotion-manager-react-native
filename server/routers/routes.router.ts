/**
 * Router de Rutas
 * Piano Emotion Manager
 * 
 * Gestión completa de rutas para organización de clientes
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc.js';
import * as db from '../db.js';
import { routes, clients, pianos, appointments } from '../../drizzle/schema.js';
import { eq, and, asc, count, sql } from 'drizzle-orm';

export const routesRouter = router({
  /**
   * Listar todas las rutas activas
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    console.log('[routes.list] START - Partner:', ctx.partnerId);
    
    try {
      const database = await db.getDb();
      if (!database) {
        console.error('[routes.list] ERROR: Database not available');
        return [];
      }

      const routesList = await database
        .select()
        .from(routes)
        .where(
          and(
            eq(routes.isActive, 1),
            eq(routes.partnerId, ctx.partnerId)
          )
        )
        .orderBy(asc(routes.displayOrder), asc(routes.name));

      console.log('[routes.list] SUCCESS - Found', routesList.length, 'routes');
      return routesList;
    } catch (error) {
      console.error('[routes.list] ERROR:', error);
      return [];
    }
  }),

  /**
   * Obtener una ruta por ID con estadísticas
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) return null;

      const [route] = await database
        .select()
        .from(routes)
        .where(
          and(
            eq(routes.id, input.id),
            eq(routes.partnerId, ctx.partnerId)
          )
        )
        .limit(1);

      if (!route) return null;

      // Contar clientes asignados a esta ruta
      const [stats] = await database
        .select({
          clientCount: count(clients.id),
        })
        .from(clients)
        .where(
          and(
            eq(clients.routeGroup, route.name),
            eq(clients.partnerId, ctx.partnerId)
          )
        );

      return {
        ...route,
        clientCount: stats?.clientCount || 0,
      };
    }),

  /**
   * Crear nueva ruta
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#e07a5f'),
        description: z.string().optional(),
        preferredDay: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'flexible']).default('flexible'),
        preferredTime: z.enum(['morning', 'afternoon', 'evening', 'flexible']).default('flexible'),
        displayOrder: z.number().int().min(0).default(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      console.log('[routes.create] START - Name:', input.name);
      
      const database = await db.getDb();
      if (!database) {
        throw new Error('Database not available');
      }

      const [newRoute] = await database
        .insert(routes)
        .values({
          name: input.name,
          color: input.color,
          description: input.description || null,
          preferredDay: input.preferredDay,
          preferredTime: input.preferredTime,
          displayOrder: input.displayOrder,
          isActive: 1,
          partnerId: ctx.partnerId,
          organizationId: ctx.organizationId || null,
        })
        .$returningId();

      console.log('[routes.create] SUCCESS - Route ID:', newRoute.id);
      return { id: newRoute.id, success: true };
    }),

  /**
   * Actualizar ruta existente
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        description: z.string().optional(),
        preferredDay: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'flexible']).optional(),
        preferredTime: z.enum(['morning', 'afternoon', 'evening', 'flexible']).optional(),
        displayOrder: z.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      console.log('[routes.update] START - Route ID:', input.id);
      
      const database = await db.getDb();
      if (!database) {
        throw new Error('Database not available');
      }

      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.color !== undefined) updateData.color = input.color;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.preferredDay !== undefined) updateData.preferredDay = input.preferredDay;
      if (input.preferredTime !== undefined) updateData.preferredTime = input.preferredTime;
      if (input.displayOrder !== undefined) updateData.displayOrder = input.displayOrder;
      if (input.isActive !== undefined) updateData.isActive = input.isActive ? 1 : 0;

      await database
        .update(routes)
        .set(updateData)
        .where(
          and(
            eq(routes.id, input.id),
            eq(routes.partnerId, ctx.partnerId)
          )
        );

      console.log('[routes.update] SUCCESS');
      return { success: true };
    }),

  /**
   * Eliminar ruta (soft delete)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      console.log('[routes.delete] START - Route ID:', input.id);
      
      const database = await db.getDb();
      if (!database) {
        throw new Error('Database not available');
      }

      // Soft delete: marcar como inactiva
      await database
        .update(routes)
        .set({ isActive: 0 })
        .where(
          and(
            eq(routes.id, input.id),
            eq(routes.partnerId, ctx.partnerId)
          )
        );

      console.log('[routes.delete] SUCCESS');
      return { success: true };
    }),

  /**
   * Obtener estadísticas de todas las rutas
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) return [];

    const routesList = await database
      .select()
      .from(routes)
      .where(
        and(
          eq(routes.isActive, 1),
          eq(routes.partnerId, ctx.partnerId)
        )
      )
      .orderBy(asc(routes.displayOrder), asc(routes.name));

    // Para cada ruta, contar clientes, pianos y próximas citas
    const statsPromises = routesList.map(async (route) => {
      // Contar clientes (usando routeId)
      const [clientStats] = await database
        .select({
          clientCount: count(clients.id),
        })
        .from(clients)
        .where(
          and(
            eq(clients.routeId, route.id),
            eq(clients.partnerId, ctx.partnerId)
          )
        );

      // Contar pianos de clientes en esta ruta
      const [pianoStats] = await database
        .select({
          pianoCount: count(pianos.id),
        })
        .from(pianos)
        .innerJoin(clients, eq(pianos.clientId, clients.id))
        .where(
          and(
            eq(clients.routeId, route.id),
            eq(clients.partnerId, ctx.partnerId)
          )
        );

      // Contar próximas citas (futuras) de clientes en esta ruta
      const now = new Date();
      const [appointmentStats] = await database
        .select({
          upcomingCount: count(appointments.id),
        })
        .from(appointments)
        .innerJoin(clients, eq(appointments.clientId, clients.id))
        .where(
          and(
            eq(clients.routeId, route.id),
            eq(clients.partnerId, ctx.partnerId),
            sql`${appointments.scheduledDate} >= ${now.toISOString()}`
          )
        );

      return {
        ...route,
        clientCount: clientStats?.clientCount || 0,
        pianoCount: pianoStats?.pianoCount || 0,
        upcomingAppointments: appointmentStats?.upcomingCount || 0,
      };
    });

    return await Promise.all(statsPromises);
  }),
});
