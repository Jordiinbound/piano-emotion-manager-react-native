/**
 * Router de Predicciones
 * Piano Emotion Manager
 * 
 * Endpoints para el servicio de predicciones basado en algoritmos locales
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../../trpc.js';
import { PredictionService } from '../../services/analytics/prediction.service.js';
import { db } from '../../db.js';

// Crear instancia del servicio de predicciones
const createPredictionService = (partnerId: number) => {
  return new PredictionService(db);
};

// ============================================================================
// Router de Predicciones
// ============================================================================

export const predictionsRouter = router({
  /**
   * Obtiene el resumen completo de todas las predicciones
   */
  getSummary: protectedProcedure.query(async ({ ctx }) => {
    // ✅ VERIFICAR LÍMITES DE SUSCRIPCIÓN
    const { requireAIFeature, recordAIUsage } = await import('../../_core/subscription-middleware.js');
    await requireAIFeature(ctx.user.openId, 'prediction');
    
    const service = createPredictionService(ctx.partnerId!);
    const result = await service.getPredictionsSummary(ctx.partnerId!);
    
    // ✅ REGISTRAR USO
    await recordAIUsage(ctx.user.openId, 'prediction');
    
    return result;
  }),

  /**
   * Obtiene predicciones de ingresos
   */
  getRevenue: protectedProcedure
    .input(
      z.object({
        months: z.number().min(1).max(12).optional().default(3),
      })
    )
    .query(async ({ ctx, input }) => {
      const service = createPredictionService(ctx.partnerId!);
      return service.predictRevenue(ctx.partnerId!, input.months);
    }),

  /**
   * Obtiene clientes en riesgo de pérdida (churn)
   */
  getChurnRisk: protectedProcedure.query(async ({ ctx }) => {
    const service = createPredictionService(ctx.partnerId!);
    return service.predictClientChurn(ctx.partnerId!);
  }),

  /**
   * Obtiene predicciones de mantenimiento de pianos
   */
  getMaintenance: protectedProcedure.query(async ({ ctx }) => {
    const service = createPredictionService(ctx.partnerId!);
    return service.predictMaintenance(ctx.partnerId!);
  }),

  /**
   * Obtiene predicciones de carga de trabajo
   */
  getWorkload: protectedProcedure
    .input(
      z.object({
        weeks: z.number().min(1).max(12).optional().default(4),
      })
    )
    .query(async ({ ctx, input }) => {
      const service = createPredictionService(ctx.partnerId!);
      return service.predictWorkload(ctx.partnerId!, input.weeks);
    }),

  /**
   * Obtiene predicciones de demanda de inventario
   */
  getInventoryDemand: protectedProcedure.query(async ({ ctx }) => {
    const service = createPredictionService(ctx.partnerId!);
    return service.predictInventoryDemand(ctx.partnerId!);
  }),
});

export type PredictionsRouter = typeof predictionsRouter;
