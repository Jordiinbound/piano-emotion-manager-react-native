/**
 * Alert Settings Router
 * Piano Emotion Manager
 * 
 * Gestiona la configuración personalizada de umbrales de alertas por usuario.
 */

import { router, protectedProcedure } from '../_core/trpc.js';
import { z } from 'zod';
import * as db from '../db.js';
import { alertSettings } from '../../drizzle/schema.js';
import { eq, and } from 'drizzle-orm';

// Valores por defecto
const DEFAULT_SETTINGS = {
  // Umbrales de Pianos
  tuningPendingDays: 180,
  tuningUrgentDays: 270,
  regulationPendingDays: 730,
  regulationUrgentDays: 1095,
  
  // Citas y Servicios
  appointmentsNoticeDays: 7,
  scheduledServicesNoticeDays: 7,
  
  // Finanzas
  invoicesDueNoticeDays: 7,
  quotesExpiryNoticeDays: 7,
  contractsRenewalNoticeDays: 30,
  overduePaymentsNoticeDays: 15,
  
  // Inventario
  inventoryMinStock: 5,
  inventoryExpiryNoticeDays: 30,
  
  // Mantenimiento
  toolsMaintenanceDays: 180,
  
  // Predicción de Mantenimiento de Pianos
  maintenanceTuningIntervalDays: 180,
  maintenanceRegulationIntervalDays: 730,
  maintenancePredictionWindowMonths: 6,
  
  // Clientes
  clientFollowupDays: 90,
  clientInactiveMonths: 12,
  
  // Predicción de Riesgo de Pérdida de Clientes
  churnRiskMinDays: 180,
  churnRiskIntervalMultiplier: 1.5,
  churnRiskMinScore: 25,
  
  // Preferencias de Notificaciones
  emailNotificationsEnabled: 1,
  pushNotificationsEnabled: 0,
  weeklyDigestEnabled: 1,
  weeklyDigestDay: 1,
};

// Schema de validación para actualización
const updateSettingsSchema = z.object({
  // Umbrales de Pianos
  tuningPendingDays: z.number().int().min(1).max(365).optional(),
  tuningUrgentDays: z.number().int().min(1).max(730).optional(),
  regulationPendingDays: z.number().int().min(1).max(1825).optional(),
  regulationUrgentDays: z.number().int().min(1).max(3650).optional(),
  
  // Citas y Servicios
  appointmentsNoticeDays: z.number().int().min(0).max(90).optional(),
  scheduledServicesNoticeDays: z.number().int().min(0).max(90).optional(),
  
  // Finanzas
  invoicesDueNoticeDays: z.number().int().min(0).max(90).optional(),
  quotesExpiryNoticeDays: z.number().int().min(0).max(90).optional(),
  contractsRenewalNoticeDays: z.number().int().min(0).max(180).optional(),
  overduePaymentsNoticeDays: z.number().int().min(0).max(90).optional(),
  
  // Inventario
  inventoryMinStock: z.number().int().min(0).max(1000).optional(),
  inventoryExpiryNoticeDays: z.number().int().min(0).max(180).optional(),
  
  // Mantenimiento
  toolsMaintenanceDays: z.number().int().min(0).max(730).optional(),
  
  // Predicción de Mantenimiento de Pianos
  maintenanceTuningIntervalDays: z.number().int().min(30).max(730).optional(),
  maintenanceRegulationIntervalDays: z.number().int().min(180).max(3650).optional(),
  maintenancePredictionWindowMonths: z.number().int().min(1).max(24).optional(),
  
  // Clientes
  clientFollowupDays: z.number().int().min(0).max(365).optional(),
  clientInactiveMonths: z.number().int().min(0).max(36).optional(),
  
  // Predicción de Riesgo de Pérdida de Clientes
  churnRiskMinDays: z.number().int().min(30).max(730).optional(),
  churnRiskIntervalMultiplier: z.number().min(1.0).max(5.0).optional(),
  churnRiskMinScore: z.number().int().min(0).max(100).optional(),
  
  // Preferencias de Notificaciones
  emailNotificationsEnabled: z.number().int().min(0).max(1).optional(),
  pushNotificationsEnabled: z.number().int().min(0).max(1).optional(),
  weeklyDigestEnabled: z.number().int().min(0).max(1).optional(),
  weeklyDigestDay: z.number().int().min(0).max(6).optional(),
});

export const alertSettingsRouter = router({
  /**
   * Obtener configuración de alertas del usuario
   * Si no existe, devuelve valores por defecto
   */
  getSettings: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;
      const partnerId = ctx.user.partnerId;

      console.log('[ALERT_SETTINGS] Getting settings for user:', userId);

      try {
        // Obtener conexión a la base de datos
        const database = await db.getDb();
        
        if (!database) {
          console.error('[ALERT_SETTINGS] Database connection is null');
          throw new Error('Error de conexión a la base de datos');
        }

        // Buscar configuración existente
        const existingSettings = await database
          .select()
          .from(alertSettings)
          .where(
            and(
              eq(alertSettings.userId, userId),
              eq(alertSettings.partnerId, partnerId)
            )
          )
          .limit(1);

        if (existingSettings.length > 0) {
          console.log('[ALERT_SETTINGS] Found existing settings');
          return existingSettings[0];
        }

        // Si no existe, devolver valores por defecto
        console.log('[ALERT_SETTINGS] No settings found, returning defaults');
        return {
          ...DEFAULT_SETTINGS,
          userId,
          partnerId,
        };
      } catch (error) {
        console.error('[ALERT_SETTINGS] Error getting settings:', error);
        throw new Error('Error al obtener configuración de alertas');
      }
    }),

  /**
   * Actualizar configuración de alertas del usuario
   * Si no existe, crea una nueva
   */
  updateSettings: protectedProcedure
    .input(updateSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const partnerId = ctx.user.partnerId;

      console.log('[ALERT_SETTINGS] Updating settings for user:', userId);
      console.log('[ALERT_SETTINGS] Input:', input);

      try {
        // Obtener conexión a la base de datos
        const database = await db.getDb();
        
        if (!database) {
          console.error('[ALERT_SETTINGS] Database connection is null');
          throw new Error('Error de conexión a la base de datos');
        }

        // Buscar configuración existente
        const existingSettings = await database
          .select()
          .from(alertSettings)
          .where(
            and(
              eq(alertSettings.userId, userId),
              eq(alertSettings.partnerId, partnerId)
            )
          )
          .limit(1);

        if (existingSettings.length > 0) {
          // Actualizar configuración existente
          console.log('[ALERT_SETTINGS] Updating existing settings');
          await database
            .update(alertSettings)
            .set({
              ...input,
              updatedAt: new Date().toISOString(),
            })
            .where(
              and(
                eq(alertSettings.userId, userId),
                eq(alertSettings.partnerId, partnerId)
              )
            );
        } else {
          // Crear nueva configuración
          console.log('[ALERT_SETTINGS] Creating new settings');
          await database.insert(alertSettings).values({
            userId,
            partnerId,
            ...DEFAULT_SETTINGS,
            ...input,
          });
        }

        // Devolver configuración actualizada
        const updatedSettings = await database
          .select()
          .from(alertSettings)
          .where(
            and(
              eq(alertSettings.userId, userId),
              eq(alertSettings.partnerId, partnerId)
            )
          )
          .limit(1);

        console.log('[ALERT_SETTINGS] Settings updated successfully');
        return updatedSettings[0];
      } catch (error) {
        console.error('[ALERT_SETTINGS] Error updating settings:', error);
        throw new Error('Error al actualizar configuración de alertas');
      }
    }),

  /**
   * Resetear configuración a valores por defecto
   */
  resetToDefaults: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.user.id;
      const partnerId = ctx.user.partnerId;

      console.log('[ALERT_SETTINGS] Resetting settings to defaults for user:', userId);

      try {
        // Obtener conexión a la base de datos
        const database = await db.getDb();
        
        if (!database) {
          console.error('[ALERT_SETTINGS] Database connection is null');
          throw new Error('Error de conexión a la base de datos');
        }

        // Buscar configuración existente
        const existingSettings = await database
          .select()
          .from(alertSettings)
          .where(
            and(
              eq(alertSettings.userId, userId),
              eq(alertSettings.partnerId, partnerId)
            )
          )
          .limit(1);

        if (existingSettings.length > 0) {
          // Actualizar con valores por defecto
          await database
            .update(alertSettings)
            .set({
              ...DEFAULT_SETTINGS,
              updatedAt: new Date().toISOString(),
            })
            .where(
              and(
                eq(alertSettings.userId, userId),
                eq(alertSettings.partnerId, partnerId)
              )
            );
        } else {
          // Crear con valores por defecto
          await database.insert(alertSettings).values({
            userId,
            partnerId,
            ...DEFAULT_SETTINGS,
          });
        }

        // Devolver configuración actualizada
        const updatedSettings = await database
          .select()
          .from(alertSettings)
          .where(
            and(
              eq(alertSettings.userId, userId),
              eq(alertSettings.partnerId, partnerId)
            )
          )
          .limit(1);

        console.log('[ALERT_SETTINGS] Settings reset successfully');
        return updatedSettings[0];
      } catch (error) {
        console.error('[ALERT_SETTINGS] Error resetting settings:', error);
        throw new Error('Error al resetear configuración de alertas');
      }
    }),
});
