/**
 * Hooks de Reportes y Analytics
 * Piano Emotion Manager
 */

export {
  useDashboardData,
  useDashboardMetrics,
  useRevenueChart,
  useServicesByType,
  useMonthlyTrends,
  useQuickKPIs,
  useYearComparison,
  useReportExport,
  getDateRangeFromPreset,
} from './use-analytics';

export type {
  DateRange,
  PeriodPreset,
} from './use-analytics';
