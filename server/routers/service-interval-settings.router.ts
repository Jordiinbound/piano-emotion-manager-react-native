/**
 * Service Interval Settings Router
 * Piano Emotion Manager
 * 
 * Gestiona la configuración de intervalos de servicio por tipo de cliente.
 */

import { router, protectedProcedure } from '../_core/trpc.js';
import { z } from 'zod';
import * as db from '../db.js';
import { serviceIntervalSettings } from '../../drizzle/schema.js';
import { eq, and } from 'drizzle-orm';

// Valores por defecto recomendados por tipo de cliente
const DEFAULT_INTERVALS = {
  particular: {
    tuningIntervalDays: 180,      // 6 meses - uso doméstico moderado
    regulationIntervalDays: 730,  // 2 años
  },
  student: {
    tuningIntervalDays: 120,      // 4 meses - práctica diaria intensiva
    regulationIntervalDays: 365,  // 1 año
  },
  professional: {
    tuningIntervalDays: 90,       // 3 meses - uso profesional frecuente
    regulationIntervalDays: 365,  // 1 año
  },
  music_school: {
    tuningIntervalDays: 60,       // 2 meses - múltiples usuarios diarios
    regulationIntervalDays: 180,  // 6 meses
  },
  conservatory: {
    tuningIntervalDays: 45,       // 1.5 meses - uso intensivo profesional
    regulationIntervalDays: 180,  // 6 meses
  },
  concert_hall: {
    tuningIntervalDays: 30,       // 1 mes - exigencia máxima
    regulationIntervalDays: 120,  // 4 meses
  },
};

// Schema de validación
const clientTypeEnum = z.enum(['particular', 'student', 'professional', 'music_school', 'conservatory', 'concert_hall']);

const updateIntervalSchema = z.object({
  clientType: clientTypeEnum,
  tuningIntervalDays: z.number().int().min(15).max(730),
  regulationIntervalDays: z.number().int().min(30).max(3650),
});

const getIntervalSchema = z.object({
  clientType: clientTypeEnum.optional(),
});

export const serviceIntervalSettingsRouter = router({
  /**
   * Obtener configuración de intervalos para un tipo de cliente específico
   * o todos los tipos si no se especifica
   */
  get: protectedProcedure
    .input(getIntervalSchema)
    .query(async ({ ctx, input }) => {
      const partnerId = ctx.partnerId;

      console.log('[SERVICE_INTERVALS] Getting intervals for partner:', partnerId, 'clientType:', input.clientType);

      try {
        const database = await db.getDb();
        
        if (!database) {
          console.error('[SERVICE_INTERVALS] Database connection is null');
          throw new Error('Error de conexión a la base de datos');
        }

        if (input.clientType) {
          // Buscar configuración para un tipo específico
          const settings = await database
            .select()
            .from(serviceIntervalSettings)
            .where(
              and(
                eq(serviceIntervalSettings.partnerId, partnerId),
                eq(serviceIntervalSettings.clientType, input.clientType)
              )
            )
            .limit(1);

          if (settings.length > 0) {
            console.log('[SERVICE_INTERVALS] Found settings for', input.clientType);
            return settings[0];
          }

          // Si no existe, devolver valores por defecto
          console.log('[SERVICE_INTERVALS] No settings found, returning defaults for', input.clientType);
          return {
            partnerId,
            clientType: input.clientType,
            ...DEFAULT_INTERVALS[input.clientType],
          };
        } else {
          // Obtener configuración para todos los tipos
          const allSettings = await database
            .select()
            .from(serviceIntervalSettings)
            .where(eq(serviceIntervalSettings.partnerId, partnerId));

          console.log('[SERVICE_INTERVALS] Found', allSettings.length, 'settings');

          // Crear un mapa con los valores existentes
          const settingsMap = new Map(
            allSettings.map(s => [s.clientType, s])
          );

          // Devolver todos los tipos con valores existentes o por defecto
          const clientTypes: Array<keyof typeof DEFAULT_INTERVALS> = [
            'particular',
            'student',
            'professional',
            'music_school',
            'conservatory',
            'concert_hall',
          ];

          return clientTypes.map(clientType => {
            const existing = settingsMap.get(clientType);
            if (existing) {
              return existing;
            }
            return {
              partnerId,
              clientType,
              ...DEFAULT_INTERVALS[clientType],
            };
          });
        }
      } catch (error) {
        console.error('[SERVICE_INTERVALS] Error getting settings:', error);
        throw new Error('Error al obtener configuración de intervalos');
      }
    }),

  /**
   * Actualizar configuración de intervalos para un tipo de cliente
   */
  update: protectedProcedure
    .input(updateIntervalSchema)
    .mutation(async ({ ctx, input }) => {
      const partnerId = ctx.partnerId;

      console.log('[SERVICE_INTERVALS] Updating intervals for partner:', partnerId);
      console.log('[SERVICE_INTERVALS] Input:', input);

      try {
        const database = await db.getDb();
        
        if (!database) {
          console.error('[SERVICE_INTERVALS] Database connection is null');
          throw new Error('Error de conexión a la base de datos');
        }

        // Buscar configuración existente
        const existingSettings = await database
          .select()
          .from(serviceIntervalSettings)
          .where(
            and(
              eq(serviceIntervalSettings.partnerId, partnerId),
              eq(serviceIntervalSettings.clientType, input.clientType)
            )
          )
          .limit(1);

        if (existingSettings.length > 0) {
          // Actualizar configuración existente
          console.log('[SERVICE_INTERVALS] Updating existing settings');
          await database
            .update(serviceIntervalSettings)
            .set({
              tuningIntervalDays: input.tuningIntervalDays,
              regulationIntervalDays: input.regulationIntervalDays,
              updatedAt: new Date().toISOString(),
            })
            .where(
              and(
                eq(serviceIntervalSettings.partnerId, partnerId),
                eq(serviceIntervalSettings.clientType, input.clientType)
              )
            );
        } else {
          // Crear nueva configuración
          console.log('[SERVICE_INTERVALS] Creating new settings');
          await database.insert(serviceIntervalSettings).values({
            partnerId,
            clientType: input.clientType,
            tuningIntervalDays: input.tuningIntervalDays,
            regulationIntervalDays: input.regulationIntervalDays,
          });
        }

        // Devolver configuración actualizada
        const updatedSettings = await database
          .select()
          .from(serviceIntervalSettings)
          .where(
            and(
              eq(serviceIntervalSettings.partnerId, partnerId),
              eq(serviceIntervalSettings.clientType, input.clientType)
            )
          )
          .limit(1);

        console.log('[SERVICE_INTERVALS] Settings updated successfully');
        return updatedSettings[0];
      } catch (error) {
        console.error('[SERVICE_INTERVALS] Error updating settings:', error);
        throw new Error('Error al actualizar configuración de intervalos');
      }
    }),

  /**
   * Resetear configuración a valores por defecto para un tipo de cliente
   */
  resetToDefaults: protectedProcedure
    .input(z.object({ clientType: clientTypeEnum }))
    .mutation(async ({ ctx, input }) => {
      const partnerId = ctx.partnerId;

      console.log('[SERVICE_INTERVALS] Resetting to defaults for:', input.clientType);

      try {
        const database = await db.getDb();
        
        if (!database) {
          console.error('[SERVICE_INTERVALS] Database connection is null');
          throw new Error('Error de conexión a la base de datos');
        }

        const defaults = DEFAULT_INTERVALS[input.clientType];

        // Buscar configuración existente
        const existingSettings = await database
          .select()
          .from(serviceIntervalSettings)
          .where(
            and(
              eq(serviceIntervalSettings.partnerId, partnerId),
              eq(serviceIntervalSettings.clientType, input.clientType)
            )
          )
          .limit(1);

        if (existingSettings.length > 0) {
          // Actualizar con valores por defecto
          await database
            .update(serviceIntervalSettings)
            .set({
              ...defaults,
              updatedAt: new Date().toISOString(),
            })
            .where(
              and(
                eq(serviceIntervalSettings.partnerId, partnerId),
                eq(serviceIntervalSettings.clientType, input.clientType)
              )
            );
        } else {
          // Crear con valores por defecto
          await database.insert(serviceIntervalSettings).values({
            partnerId,
            clientType: input.clientType,
            ...defaults,
          });
        }

        // Devolver configuración actualizada
        const updatedSettings = await database
          .select()
          .from(serviceIntervalSettings)
          .where(
            and(
              eq(serviceIntervalSettings.partnerId, partnerId),
              eq(serviceIntervalSettings.clientType, input.clientType)
            )
          )
          .limit(1);

        console.log('[SERVICE_INTERVALS] Settings reset successfully');
        return updatedSettings[0];
      } catch (error) {
        console.error('[SERVICE_INTERVALS] Error resetting settings:', error);
        throw new Error('Error al resetear configuración de intervalos');
      }
    }),
});
