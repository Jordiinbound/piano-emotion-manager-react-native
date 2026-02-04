/**
 * Router de Previsiones
 * Piano Emotion Manager
 * 
 * Endpoints para analíticas predictivas
 */

import { router, protectedProcedure } from '../../trpc';
import { z } from 'zod';
import ForecastService from '../../services/analytics/forecast.service';
import { db } from '../../db';

const forecastService = new ForecastService(db);

export const forecastsRouter = router({
  /**
   * Obtiene previsión de ingresos para los próximos meses
   */
  getRevenue: protectedProcedure
    .input(z.object({
      months: z.number().min(1).max(12).default(3),
    }))
    .query(async ({ ctx, input }) => {
      const forecasts = await forecastService.forecastRevenue(
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
      const risks = await forecastService.forecastClientChurn(ctx.user.partnerId);
      return risks;
    }),

  /**
   * Obtiene previsión de necesidades de mantenimiento
   */
  getMaintenance: protectedProcedure
    .query(async ({ ctx }) => {
      const forecasts = await forecastService.forecastMaintenance(ctx.user.partnerId);
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
      const forecasts = await forecastService.forecastWorkload(
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
      const forecasts = await forecastService.forecastInventoryDemand(ctx.user.partnerId);
      return forecasts;
    }),

  /**
   * Obtiene resumen completo de todas las previsiones
   */
  getSummary: protectedProcedure
    .query(async ({ ctx }) => {
      const summary = await forecastService.getForecastsSummary(ctx.user.partnerId);
      return summary;
    }),
});
