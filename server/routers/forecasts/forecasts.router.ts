/**
 * Router de Previsiones
 * Piano Emotion Manager
 * 
 * Endpoints para analíticas predictivas
 */

import { router, protectedProcedure } from '../../_core/trpc.js';
import { z } from 'zod';
import ForecastService from '../../services/analytics/forecast.service.js';
import { getDb } from '../../db.js';

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

  /**
   * DEBUG: Verifica datos históricos de servicios
   */
  debugHistoricalData: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      
      // Query 1: Total de servicios
      const totalResult = await db.execute(
        'SELECT COUNT(*) as total FROM services WHERE partnerId = ?',
        [ctx.user.partnerId]
      );
      
      // Query 2: Servicios por mes (últimos 12 meses)
      const monthlyResult = await db.execute(`
        SELECT 
          DATE_FORMAT(date, '%Y-%m-01') as month,
          COALESCE(SUM(cost), 0) as total,
          COUNT(*) as service_count
        FROM services
        WHERE partnerId = ?
          AND date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(date, '%Y-%m-01')
        ORDER BY month
      `, [ctx.user.partnerId]);
      
      // Query 3: Rango de fechas
      const dateRangeResult = await db.execute(`
        SELECT 
          MIN(date) as first_service,
          MAX(date) as last_service,
          TIMESTAMPDIFF(MONTH, MIN(date), MAX(date)) as months_of_data
        FROM services
        WHERE partnerId = ?
      `, [ctx.user.partnerId]);
      
      return {
        partnerId: ctx.user.partnerId,
        totalServices: totalResult.rows?.[0],
        monthlyData: monthlyResult.rows,
        dateRange: dateRangeResult.rows?.[0],
      };
    }),
});
