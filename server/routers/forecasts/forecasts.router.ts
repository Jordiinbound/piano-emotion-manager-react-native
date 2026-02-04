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
      console.log('[forecasts.getRevenue] ctx.partnerId:', ctx.partnerId, 'type:', typeof ctx.partnerId);
      console.log('[forecasts.getRevenue] ctx.user:', ctx.user ? { id: ctx.user.id, email: ctx.user.email } : null);
      const service = await getForecastService();
      const forecasts = await service.forecastRevenue(
        ctx.partnerId,
        input.months
      );
      console.log('[forecasts.getRevenue] forecasts result:', forecasts);
      return forecasts;
    }),

  /**
   * Obtiene clientes en riesgo de pérdida (churn)
   */
  getChurnRisk: protectedProcedure
    .query(async ({ ctx }) => {
      console.log('[forecasts.getChurnRisk] ctx.partnerId:', ctx.partnerId, 'type:', typeof ctx.partnerId);
      const service = await getForecastService();
      const risks = await service.forecastClientChurn(ctx.partnerId);
      console.log('[forecasts.getChurnRisk] risks result:', risks);
      return risks;
    }),

  /**
   * Obtiene previsión de necesidades de mantenimiento
   */
  getMaintenance: protectedProcedure
    .query(async ({ ctx }) => {
      const service = await getForecastService();
      const forecasts = await service.forecastMaintenance(ctx.partnerId);
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
        ctx.partnerId,
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
      const forecasts = await service.forecastInventoryDemand(ctx.partnerId);
      return forecasts;
    }),

  /**
   * Obtiene resumen completo de todas las previsiones
   */
  getSummary: protectedProcedure
    .query(async ({ ctx }) => {
      const service = await getForecastService();
      const summary = await service.getForecastsSummary(ctx.partnerId);
      return summary;
    }),

  /**
   * DEBUG: Muestra el contexto completo
   */
  debugContext: protectedProcedure
    .query(async ({ ctx }) => {
      return {
        hasUser: !!ctx.user,
        userId: ctx.user?.id,
        userEmail: ctx.user?.email,
        userName: ctx.user?.name,
        partnerId: ctx.partnerId,
        partnerIdType: typeof ctx.partnerId,
        language: ctx.language,
        userObject: ctx.user ? {
          id: ctx.user.id,
          email: ctx.user.email,
          name: ctx.user.name,
          openId: ctx.user.openId,
          role: ctx.user.role,
        } : null,
      };
    }),

  /**
   * DEBUG: Verifica datos históricos de servicios
   * Actualizado: 2026-02-04 - Fix ctx.partnerId
   */
  debugHistoricalData: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      
      // Query 1: Total de servicios
      const totalResult = await db.execute(
        'SELECT COUNT(*) as total FROM services WHERE partnerId = ?',
        [ctx.partnerId]
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
      `, [ctx.partnerId]);
      
      // Query 3: Rango de fechas
      const dateRangeResult = await db.execute(`
        SELECT 
          MIN(date) as first_service,
          MAX(date) as last_service,
          TIMESTAMPDIFF(MONTH, MIN(date), MAX(date)) as months_of_data
        FROM services
        WHERE partnerId = ?
      `, [ctx.partnerId]);
      
      return {
        partnerId: ctx.partnerId,
        totalServices: totalResult.rows?.[0],
        monthlyData: monthlyResult.rows,
        dateRange: dateRangeResult.rows?.[0],
      };
    }),

  /**
   * DEBUG: Verificar datos de clientes con email y teléfono
   */
  debugClientData: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      
      const result = await db.execute(`
        SELECT 
          id,
          name,
          email,
          phone,
          createdAt
        FROM clients
        WHERE partnerId = ?
        ORDER BY name
        LIMIT 20
      `, [ctx.partnerId]);
      
      return {
        partnerId: ctx.partnerId,
        clients: result.rows,
        totalClients: result.rows?.length || 0,
      };
    }),
});
