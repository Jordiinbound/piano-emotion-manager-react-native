/**
 * Router de Previsiones
 * Piano Emotion Manager
 * 
 * Endpoints para analíticas predictivas
 */

import { router, protectedProcedure } from '../../_core/trpc.js';
import { z } from 'zod';
import ForecastService from '../../services/analytics/forecast.service.js';
import { getDb } from '../../db';

// Lazy initialization of forecast service
let forecastService: ForecastService | null = null;

async function getForecastService() {
  if (!forecastService) {
    const db = await getDb();
    forecastService = new ForecastService(db);
  }
  return forecastService;
}

export const forecastsRouter = router({
  /**
   * Obtiene previsión de ingresos para los próximos meses
   */
  getRevenue: protectedProcedure
    .input(z.object({
      months: z.number().min(1).max(12).default(3),
    }))
    .query(async ({ ctx, input }) => {
      const service = await getForecastService();
      const forecasts = await service.forecastRevenue(
        ctx.user.partnerId,
        input.months
      );
      return forecasts;
    }),

  /**
   * Obtiene clientes en riesgo de pérdida (churn)
   */
  getChurnRisk: protectedProcedure
    .query(async ({ ctx }) => {
      const service = await getForecastService();
      const risks = await service.forecastClientChurn(ctx.user.partnerId);
      return risks;
    }),

  /**
   * Obtiene previsión de necesidades de mantenimiento
   */
  getMaintenance: protectedProcedure
    .query(async ({ ctx }) => {
      const service = await getForecastService();
      const forecasts = await service.forecastMaintenance(ctx.user.partnerId);
      return forecasts;
    }),

  /**
   * Obtiene previsión de carga de trabajo
   */
  getWorkload: protectedProcedure
    .input(z.object({
      weeks: z.number().min(1).max(12).default(4),
    }))
    .query(async ({ ctx, input }) => {
      const service = await getForecastService();
      const forecasts = await service.forecastWorkload(
        ctx.user.partnerId,
        input.weeks
      );
      return forecasts;
    }),

  /**
   * Obtiene previsión de demanda de inventario
   */
  getInventoryDemand: protectedProcedure
    .query(async ({ ctx }) => {
      const service = await getForecastService();
      const forecasts = await service.forecastInventoryDemand(ctx.user.partnerId);
      return forecasts;
    }),

  /**
   * Obtiene resumen completo de todas las previsiones
   */
  getSummary: protectedProcedure
    .query(async ({ ctx }) => {
      const service = await getForecastService();
      const summary = await service.getForecastsSummary(ctx.user.partnerId);
      return summary;
    }),
});
