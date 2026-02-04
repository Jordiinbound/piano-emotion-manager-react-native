/**
 * Router de Analytics y Reportes
 * Piano Emotion Manager
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../../trpc.js';
import { createAnalyticsService, createPDFGenerator } from '../../services/reports/index.js';

// ============================================================================
// Input Schemas
// ============================================================================

const dateRangeSchema = z.object({
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)),
});

const periodSchema = z.enum(['day', 'week', 'month']);

const reportTypeSchema = z.enum(['revenue', 'services', 'clients', 'pianos']);

const exportFormatSchema = z.enum(['csv', 'pdf', 'excel']);

// ============================================================================
// Router
// ============================================================================

export const analyticsRouter = router({
  /**
   * Obtiene TODOS los datos del dashboard en una sola llamada (optimizado)
   * Combina: metrics + revenue chart + services by type
   */
  getDashboardData: protectedProcedure
    .input(
      z.object({
        dateRange: dateRangeSchema,
        groupBy: periodSchema.optional().default('month'),
      })
    )
    .query(async ({ ctx, input }) => {
      const analytics = createAnalyticsService((ctx as any).partnerId);
      
      // Ejecutar todas las queries en paralelo para máximo rendimiento
      const [metrics, revenueByPeriod, servicesByType] = await Promise.all([
        analytics.getDashboardMetrics(input.dateRange),
        analytics.getRevenueByPeriod(input.dateRange, input.groupBy),
        analytics.getServicesByType(input.dateRange),
      ]);

      return {
        metrics,
        revenueByPeriod,
        servicesByType,
      };
    }),

  /**
   * Obtiene métricas principales del dashboard
   */
  getDashboardMetrics: protectedProcedure
    .input(dateRangeSchema)
    .query(async ({ ctx, input }) => {
      console.log('[DEBUG] getDashboardMetrics - partnerId:', (ctx as any).partnerId);
      console.log('[DEBUG] getDashboardMetrics - input:', input);
      const analytics = createAnalyticsService((ctx as any).partnerId);
      const result = await analytics.getDashboardMetrics(input);
      console.log('[DEBUG] getDashboardMetrics - result:', result);
      return result;
    }),

  /**
   * Obtiene ingresos por período
   */
  getRevenueByPeriod: protectedProcedure
    .input(
      z.object({
        dateRange: dateRangeSchema,
        groupBy: periodSchema.optional().default('month'),
      })
    )
    .query(async ({ ctx, input }) => {
      const analytics = createAnalyticsService((ctx as any).partnerId);
      return analytics.getRevenueByPeriod(input.dateRange, input.groupBy);
    }),

  /**
   * Obtiene servicios por tipo
   */
  getServicesByType: protectedProcedure
    .input(dateRangeSchema)
    .query(async ({ ctx, input }) => {
      const analytics = createAnalyticsService((ctx as any).partnerId);
      return analytics.getServicesByType(input);
    }),

  /**
   * Obtiene mejores clientes
   */
  getTopClients: protectedProcedure
    .input(
      z.object({
        dateRange: dateRangeSchema,
        limit: z.number().min(1).max(100).optional().default(10),
        sortBy: z.enum(['revenue', 'services']).optional().default('revenue'),
      })
    )
    .query(async ({ ctx, input }) => {
      const analytics = createAnalyticsService((ctx as any).partnerId);
      return analytics.getTopClients(input.dateRange, input.limit, input.sortBy);
    }),

  /**
   * Obtiene rendimiento de técnicos
   */
  getTechnicianPerformance: protectedProcedure
    .input(dateRangeSchema)
    .query(async ({ ctx, input }) => {
      const analytics = createAnalyticsService((ctx as any).partnerId);
      return analytics.getTechnicianPerformance(input);
    }),

  /**
   * Obtiene pianos por marca
   */
  getPianosByBrand: protectedProcedure.query(async ({ ctx }) => {
    const analytics = createAnalyticsService((ctx as any).partnerId);
    return analytics.getPianosByBrand();
  }),

  /**
   * Obtiene tendencias mensuales
   */
  getMonthlyTrends: protectedProcedure
    .input(
      z.object({
        months: z.number().min(1).max(24).optional().default(12),
      })
    )
    .query(async ({ ctx, input }) => {
      const analytics = createAnalyticsService((ctx as any).partnerId);
      return analytics.getMonthlyTrends(input.months);
    }),

  /**
   * Obtiene distribución geográfica
   */
  getGeographicDistribution: protectedProcedure.query(async ({ ctx }) => {
    const analytics = createAnalyticsService((ctx as any).partnerId);
    return analytics.getGeographicDistribution();
  }),

  /**
   * Exporta datos a CSV
   */
  exportToCSV: protectedProcedure
    .input(
      z.object({
        reportType: reportTypeSchema,
        dateRange: dateRangeSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const analytics = createAnalyticsService((ctx as any).partnerId);
      const csv = await analytics.exportToCSV(input.reportType, input.dateRange);
      return { content: csv, filename: `reporte_${input.reportType}.csv` };
    }),

  /**
   * Genera reporte PDF - Resumen Ejecutivo
   */
  generateExecutiveSummary: protectedProcedure
    .input(dateRangeSchema)
    .mutation(async ({ ctx, input }) => {
      const generator = createPDFGenerator((ctx as any).partnerId);
      return generator.generateExecutiveSummary(input);
    }),

  /**
   * Genera reporte PDF - Servicios
   */
  generateServicesReport: protectedProcedure
    .input(dateRangeSchema)
    .mutation(async ({ ctx, input }) => {
      const generator = createPDFGenerator((ctx as any).partnerId);
      return generator.generateServicesReport(input);
    }),

  /**
   * Genera reporte PDF - Financiero
   */
  generateFinancialReport: protectedProcedure
    .input(dateRangeSchema)
    .mutation(async ({ ctx, input }) => {
      const generator = createPDFGenerator((ctx as any).partnerId);
      return generator.generateFinancialReport(input);
    }),

  /**
   * Genera reporte PDF - Clientes
   */
  generateClientsReport: protectedProcedure
    .input(dateRangeSchema)
    .mutation(async ({ ctx, input }) => {
      const generator = createPDFGenerator((ctx as any).partnerId);
      return generator.generateClientsReport(input);
    }),

  /**
   * Obtiene KPIs rápidos para widget
   */
  getQuickKPIs: protectedProcedure.query(async ({ ctx }) => {
    const analytics = createAnalyticsService((ctx as any).partnerId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const metrics = await analytics.getDashboardMetrics({
      startDate: startOfMonth,
      endDate: now,
    });

    return {
      monthlyRevenue: metrics.revenue.total,
      revenueChange: metrics.revenue.changePercent,
      servicesThisMonth: metrics.services.total,
      completionRate: metrics.services.completionRate,
      activeClients: metrics.clients.active,
      newClients: metrics.clients.new,
    };
  }),

  /**
   * Obtiene comparativa año actual vs anterior
   */
  getYearOverYearComparison: protectedProcedure.query(async ({ ctx }) => {
    const analytics = createAnalyticsService((ctx as any).partnerId);
    const now = new Date();
    
    // Año actual
    const currentYearStart = new Date(now.getFullYear(), 0, 1);
    const currentMetrics = await analytics.getDashboardMetrics({
      startDate: currentYearStart,
      endDate: now,
    });

    // Año anterior (mismo período)
    const previousYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const previousYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const previousMetrics = await analytics.getDashboardMetrics({
      startDate: previousYearStart,
      endDate: previousYearEnd,
    });

    return {
      currentYear: {
        revenue: currentMetrics.revenue.total,
        services: currentMetrics.services.total,
        clients: currentMetrics.clients.total,
      },
      previousYear: {
        revenue: previousMetrics.revenue.total,
        services: previousMetrics.services.total,
        clients: previousMetrics.clients.total,
      },
      changes: {
        revenue: currentMetrics.revenue.total - previousMetrics.revenue.total,
        revenuePercent: previousMetrics.revenue.total > 0
          ? ((currentMetrics.revenue.total - previousMetrics.revenue.total) / previousMetrics.revenue.total) * 100
          : 0,
        services: currentMetrics.services.total - previousMetrics.services.total,
        clients: currentMetrics.clients.total - previousMetrics.clients.total,
      },
    };
  }),
});

export type AnalyticsRouter = typeof analyticsRouter;
