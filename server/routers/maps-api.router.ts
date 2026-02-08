import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import {
  checkMapsUsage,
  trackMapsUsage,
  getMapsUsageStats,
  updateMapsApiPlan,
  requireMapsApiAccess,
  MAPS_API_COSTS,
  MAPS_API_LIMITS,
} from '../middleware/mapsUsage';
import { TRPCError } from '@trpc/server';

/**
 * Router para operaciones de Maps API con control de límites
 */
export const mapsApiRouter = router({
  /**
   * Geocodificar una dirección
   */
  geocode: protectedProcedure
    .input(
      z.object({
        address: z.string().min(1, 'La dirección es requerida'),
      })
    )
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.user.organizationId;
      if (!organizationId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Usuario no pertenece a ninguna organización',
        });
      }

      // Verificar límites
      const { cost } = await requireMapsApiAccess(organizationId, 'geocode');

      try {
        // Llamar a Google Maps API
        const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Google Maps API key no configurada',
          });
        }

        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          input.address
        )}&key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Error de geocodificación: ${data.status}`,
          });
        }

        // Registrar uso
        await trackMapsUsage(
          organizationId,
          ctx.user.id,
          'geocode',
          'geocode',
          cost,
          { address: input.address }
        );

        return {
          results: data.results,
          status: data.status,
        };
      } catch (error) {
        console.error('Error en geocode:', error);
        throw error;
      }
    }),

  /**
   * Geocodificación inversa (coordenadas a dirección)
   */
  reverseGeocode: protectedProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.user.organizationId;
      if (!organizationId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Usuario no pertenece a ninguna organización',
        });
      }

      const { cost } = await requireMapsApiAccess(organizationId, 'reverse_geocode');

      try {
        const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Google Maps API key no configurada',
          });
        }

        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${input.lat},${input.lng}&key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Error de geocodificación inversa: ${data.status}`,
          });
        }

        await trackMapsUsage(
          organizationId,
          ctx.user.id,
          'geocode',
          'reverse_geocode',
          cost,
          { lat: input.lat, lng: input.lng }
        );

        return {
          results: data.results,
          status: data.status,
        };
      } catch (error) {
        console.error('Error en reverseGeocode:', error);
        throw error;
      }
    }),

  /**
   * Calcular ruta entre dos puntos
   */
  directions: protectedProcedure
    .input(
      z.object({
        origin: z.string().min(1),
        destination: z.string().min(1),
        waypoints: z.array(z.string()).optional(),
        optimize: z.boolean().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.user.organizationId;
      if (!organizationId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Usuario no pertenece a ninguna organización',
        });
      }

      const { cost } = await requireMapsApiAccess(organizationId, 'directions');

      try {
        const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Google Maps API key no configurada',
          });
        }

        let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
          input.origin
        )}&destination=${encodeURIComponent(input.destination)}&key=${apiKey}`;

        if (input.waypoints && input.waypoints.length > 0) {
          const waypointsStr = input.waypoints.join('|');
          url += `&waypoints=${input.optimize ? 'optimize:true|' : ''}${encodeURIComponent(
            waypointsStr
          )}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Error al calcular ruta: ${data.status}`,
          });
        }

        await trackMapsUsage(
          organizationId,
          ctx.user.id,
          'directions',
          'directions',
          cost,
          {
            origin: input.origin,
            destination: input.destination,
            waypoints: input.waypoints,
          }
        );

        return {
          routes: data.routes,
          status: data.status,
        };
      } catch (error) {
        console.error('Error en directions:', error);
        throw error;
      }
    }),

  /**
   * Optimizar ruta con múltiples paradas
   */
  optimizeRoute: protectedProcedure
    .input(
      z.object({
        origin: z.string().min(1),
        destination: z.string().min(1),
        waypoints: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.user.organizationId;
      if (!organizationId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Usuario no pertenece a ninguna organización',
        });
      }

      const { cost } = await requireMapsApiAccess(organizationId, 'route_optimization');

      try {
        const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Google Maps API key no configurada',
          });
        }

        const waypointsStr = input.waypoints.join('|');
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
          input.origin
        )}&destination=${encodeURIComponent(
          input.destination
        )}&waypoints=optimize:true|${encodeURIComponent(waypointsStr)}&key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Error al optimizar ruta: ${data.status}`,
          });
        }

        await trackMapsUsage(
          organizationId,
          ctx.user.id,
          'directions',
          'route_optimization',
          cost,
          {
            origin: input.origin,
            destination: input.destination,
            waypointCount: input.waypoints.length,
          }
        );

        return {
          routes: data.routes,
          waypointOrder: data.routes[0]?.waypoint_order || [],
          status: data.status,
        };
      } catch (error) {
        console.error('Error en optimizeRoute:', error);
        throw error;
      }
    }),

  /**
   * Obtener estadísticas de uso de Maps API
   */
  getUsageStats: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.user.organizationId;
    if (!organizationId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Usuario no pertenece a ninguna organización',
      });
    }

    return await getMapsUsageStats(organizationId);
  }),

  /**
   * Actualizar plan de Maps API (solo para admins)
   */
  updatePlan: protectedProcedure
    .input(
      z.object({
        plan: z.enum(['basic', 'pro', 'enterprise']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.user.organizationId;
      if (!organizationId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Usuario no pertenece a ninguna organización',
        });
      }

      // TODO: Verificar que el usuario sea admin de la organización

      await updateMapsApiPlan(organizationId, input.plan);

      return {
        success: true,
        plan: input.plan,
        newLimit: MAPS_API_LIMITS[input.plan],
      };
    }),

  /**
   * Obtener información de planes disponibles
   */
  getPlans: protectedProcedure.query(async () => {
    return {
      plans: [
        {
          id: 'basic',
          name: 'Básico',
          limit: MAPS_API_LIMITS.basic,
          price: 0, // Incluido en suscripción base
          technicians: '1-3 técnicos',
          features: [
            '1,000 requests/mes',
            'Geocodificación ilimitada',
            'Optimización de rutas diarias',
            'Ideal para 1-3 técnicos',
            'Soporte estándar',
          ],
        },
        {
          id: 'pro',
          name: 'Pro',
          limit: MAPS_API_LIMITS.pro,
          price: 19, // €19/mes adicionales
          technicians: '4-15 técnicos',
          features: [
            '5,000 requests/mes',
            'Geocodificación ilimitada',
            'Optimización de rutas avanzada',
            'Ideal para 4-15 técnicos',
            'Soporte prioritario',
          ],
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          limit: MAPS_API_LIMITS.enterprise,
          price: 49, // €49/mes adicionales
          technicians: '16+ técnicos',
          features: [
            '20,000 requests/mes',
            'Geocodificación ilimitada',
            'Optimización de rutas avanzada',
            'Ideal para grandes organizaciones',
            'API dedicada (opcional)',
            'Soporte premium 24/7',
          ],
        },
      ],
      costs: MAPS_API_COSTS,
    };
  }),
});
