/**
 * Servicio de Analytics y Reportes
 * Piano Emotion Manager
 * 
 * Proporciona métricas de negocio, KPIs y datos para dashboards
 */

import { getDb } from '../../../drizzle/db.js';
import { eq, and, gte, lte, sql, count, sum, avg, desc } from 'drizzle-orm';

// ============================================================================
// Types
// ============================================================================

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DashboardMetrics {
  revenue: {
    total: number;
    previousPeriod: number;
    change: number;
    changePercent: number;
  };
  services: {
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
    completionRate: number;
  };
  clients: {
    total: number;
    new: number;
    active: number;
    retention: number;
  };
  pianos: {
    total: number;
    serviced: number;
    pending: number;
  };
  averages: {
    ticketValue: number;
    servicesPerClient: number;
    revenuePerTechnician: number;
  };
}

export interface RevenueByPeriod {
  period: string;
  revenue: number;
  services: number;
  averageTicket: number;
}

export interface ServicesByType {
  type: string;
  typeName: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface TopClient {
  id: number;
  name: string;
  email: string;
  totalServices: number;
  totalRevenue: number;
  lastServiceDate: Date | null;
  pianoCount: number;
}

export interface TechnicianPerformance {
  id: number;
  name: string;
  servicesCompleted: number;
  revenue: number;
  averageRating: number;
  completionRate: number;
  averageServiceTime: number;
}

export interface PianosByBrand {
  brand: string;
  count: number;
  percentage: number;
  averageAge: number;
}

export interface MonthlyTrend {
  month: string;
  year: number;
  revenue: number;
  services: number;
  newClients: number;
  newPianos: number;
}

export interface GeographicDistribution {
  city: string;
  region: string;
  clientCount: number;
  pianoCount: number;
  revenue: number;
}

// ============================================================================
// Analytics Service
// ============================================================================

export class AnalyticsService {
  private organizationId: number;

  constructor(organizationId: number) {
    this.organizationId! = organizationId;
  }

  /**
   * Obtiene métricas principales del dashboard
   */
  async getDashboardMetrics(dateRange: DateRange): Promise<DashboardMetrics> {
    const { startDate, endDate } = dateRange;

    // Calcular período anterior para comparación
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousEndDate = new Date(startDate.getTime() - 1);

    // Métricas de ingresos
    const currentRevenue = await this.getTotalRevenue(startDate, endDate);
    const previousRevenue = await this.getTotalRevenue(previousStartDate, previousEndDate);
    const revenueChange = currentRevenue - previousRevenue;
    const revenueChangePercent = previousRevenue > 0 
      ? (revenueChange / previousRevenue) * 100 
      : 0;

    // Métricas de servicios
    const serviceStats = await this.getServiceStats(startDate, endDate);

    // Métricas de clientes
    const clientStats = await this.getClientStats(startDate, endDate);

    // Métricas de pianos
    const pianoStats = await this.getPianoStats(startDate, endDate);

    // Promedios
    const averageTicket = serviceStats.completed > 0 
      ? currentRevenue / serviceStats.completed 
      : 0;

    const servicesPerClient = clientStats.active > 0 
      ? serviceStats.total / clientStats.active 
      : 0;

    const technicianCount = await this.getTechnicianCount();
    const revenuePerTechnician = technicianCount > 0 
      ? currentRevenue / technicianCount 
      : currentRevenue;

    return {
      revenue: {
        total: currentRevenue,
        previousPeriod: previousRevenue,
        change: revenueChange,
        changePercent: revenueChangePercent,
      },
      services: {
        total: serviceStats.total,
        completed: serviceStats.completed,
        pending: serviceStats.pending,
        cancelled: serviceStats.cancelled,
        completionRate: serviceStats.total > 0 
          ? (serviceStats.completed / serviceStats.total) * 100 
          : 0,
      },
      clients: {
        total: clientStats.total,
        new: clientStats.new,
        active: clientStats.active,
        retention: clientStats.retention,
      },
      pianos: {
        total: pianoStats.total,
        serviced: pianoStats.serviced,
        pending: pianoStats.pending,
      },
      averages: {
        ticketValue: averageTicket,
        servicesPerClient,
        revenuePerTechnician,
      },
    };
  }

  /**
   * Obtiene ingresos por período (día, semana, mes)
   */
  async getRevenueByPeriod(
    dateRange: DateRange,
    groupBy: 'day' | 'week' | 'month' = 'month'
  ): Promise<RevenueByPeriod[]> {
    const { startDate, endDate } = dateRange;

    // Simulación de datos - En producción, esto vendría de la BD
    const periods: RevenueByPeriod[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      let periodLabel: string;
      let nextDate: Date;

      if (groupBy === 'day') {
        periodLabel = current.toISOString().split('T')[0];
        nextDate = new Date(current);
        nextDate.setDate(nextDate.getDate() + 1);
      } else if (groupBy === 'week') {
        const weekNum = this.getWeekNumber(current);
        periodLabel = `Sem ${weekNum}`;
        nextDate = new Date(current);
        nextDate.setDate(nextDate.getDate() + 7);
      } else {
        periodLabel = current.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
        nextDate = new Date(current);
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      // En producción, consultar BD para este período
      const revenue = await this.getTotalRevenue(current, nextDate);
      const services = await this.getServiceCount(current, nextDate);

      periods.push({
        period: periodLabel,
        revenue,
        services,
        averageTicket: services > 0 ? revenue / services : 0,
      });

      current.setTime(nextDate.getTime());
    }

    return periods;
  }

  /**
   * Obtiene servicios agrupados por tipo
   */
  async getServicesByType(dateRange: DateRange): Promise<ServicesByType[]> {
    const { startDate, endDate } = dateRange;

    // Tipos de servicio predefinidos
    const serviceTypes = [
      { type: 'tuning', name: 'Afinación' },
      { type: 'repair', name: 'Reparación' },
      { type: 'regulation', name: 'Regulación' },
      { type: 'voicing', name: 'Armonización' },
      { type: 'cleaning', name: 'Limpieza' },
      { type: 'evaluation', name: 'Evaluación' },
      { type: 'moving', name: 'Transporte' },
      { type: 'other', name: 'Otros' },
    ];

    const results: ServicesByType[] = [];
    let totalServices = 0;

    for (const serviceType of serviceTypes) {
      // En producción, consultar BD
      const count = Math.floor(Math.random() * 50) + 5; // Placeholder
      const revenue = count * (Math.random() * 100 + 50);
      totalServices += count;

      results.push({
        type: serviceType.type,
        typeName: serviceType.name,
        count,
        revenue,
        percentage: 0, // Se calcula después
      });
    }

    // Calcular porcentajes
    return results.map(r => ({
      ...r,
      percentage: totalServices > 0 ? (r.count / totalServices) * 100 : 0,
    }));
  }

  /**
   * Obtiene los mejores clientes
   */
  async getTopClients(
    dateRange: DateRange,
    limit: number = 10,
    sortBy: 'revenue' | 'services' = 'revenue'
  ): Promise<TopClient[]> {
    // En producción, consultar BD con joins
    // Placeholder con datos de ejemplo
    return [];
  }

  /**
   * Obtiene rendimiento de técnicos
   */
  async getTechnicianPerformance(
    dateRange: DateRange
  ): Promise<TechnicianPerformance[]> {
    // En producción, consultar BD
    return [];
  }

  /**
   * Obtiene distribución de pianos por marca
   */
  async getPianosByBrand(): Promise<PianosByBrand[]> {
    // En producción, consultar BD
    const brands = [
      'Steinway & Sons', 'Yamaha', 'Kawai', 'Bösendorfer', 
      'Bechstein', 'Fazioli', 'Petrof', 'Otros'
    ];

    let total = 0;
    const results: PianosByBrand[] = [];

    for (const brand of brands) {
      const count = Math.floor(Math.random() * 30) + 5;
      total += count;
      results.push({
        brand,
        count,
        percentage: 0,
        averageAge: Math.floor(Math.random() * 40) + 5,
      });
    }

    return results.map(r => ({
      ...r,
      percentage: (r.count / total) * 100,
    })).sort((a: any, b: any) => b.count - a.count);
  }

  /**
   * Obtiene tendencias mensuales
   */
  async getMonthlyTrends(months: number = 12): Promise<MonthlyTrend[]> {
    const trends: MonthlyTrend[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      trends.push({
        month: date.toLocaleDateString('es-ES', { month: 'short' }),
        year: date.getFullYear(),
        revenue: await this.getTotalRevenue(date, monthEnd),
        services: await this.getServiceCount(date, monthEnd),
        newClients: Math.floor(Math.random() * 10) + 1,
        newPianos: Math.floor(Math.random() * 15) + 2,
      });
    }

    return trends;
  }

  /**
   * Obtiene distribución geográfica
   */
  async getGeographicDistribution(): Promise<GeographicDistribution[]> {
    // En producción, consultar BD agrupando por ciudad/región
    return [];
  }

  /**
   * Exporta datos a formato CSV
   */
  async exportToCSV(
    reportType: 'revenue' | 'services' | 'clients' | 'pianos',
    dateRange: DateRange
  ): Promise<string> {
    let headers: string[] = [];
    let rows: string[][] = [];

    switch (reportType) {
      case 'revenue':
        headers = ['Período', 'Ingresos', 'Servicios', 'Ticket Medio'];
        const revenueData = await this.getRevenueByPeriod(dateRange, 'month');
        rows = revenueData.map(r => [
          r.period,
          r.revenue.toFixed(2),
          r.services.toString(),
          r.averageTicket.toFixed(2),
        ]);
        break;

      case 'services':
        headers = ['Tipo', 'Cantidad', 'Ingresos', 'Porcentaje'];
        const servicesData = await this.getServicesByType(dateRange);
        rows = servicesData.map(s => [
          s.typeName,
          s.count.toString(),
          s.revenue.toFixed(2),
          s.percentage.toFixed(1) + '%',
        ]);
        break;

      case 'pianos':
        headers = ['Marca', 'Cantidad', 'Porcentaje', 'Edad Media'];
        const pianosData = await this.getPianosByBrand();
        rows = pianosData.map(p => [
          p.brand,
          p.count.toString(),
          p.percentage.toFixed(1) + '%',
          p.averageAge.toString() + ' años',
        ]);
        break;

      default:
        headers = ['Sin datos'];
        rows = [];
    }

    // Generar CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async getTotalRevenue(startDate: Date, endDate: Date): Promise<number> {
    // En producción, consultar tabla de facturas/servicios
    // Placeholder: generar valor aleatorio basado en días
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return days * (Math.random() * 200 + 100);
  }

  private async getServiceCount(startDate: Date, endDate: Date): Promise<number> {
    // En producción, consultar BD
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.floor(days * (Math.random() * 2 + 0.5));
  }

  private async getServiceStats(startDate: Date, endDate: Date) {
    // En producción, consultar BD
    const total = await this.getServiceCount(startDate, endDate);
    const completed = Math.floor(total * 0.85);
    const cancelled = Math.floor(total * 0.05);
    const pending = total - completed - cancelled;

    return { total, completed, pending, cancelled };
  }

  private async getClientStats(startDate: Date, endDate: Date) {
    // En producción, consultar BD
    return {
      total: Math.floor(Math.random() * 200) + 50,
      new: Math.floor(Math.random() * 20) + 5,
      active: Math.floor(Math.random() * 100) + 30,
      retention: 75 + Math.random() * 20,
    };
  }

  private async getPianoStats(startDate: Date, endDate: Date) {
    // En producción, consultar BD
    const total = Math.floor(Math.random() * 300) + 100;
    const serviced = Math.floor(total * 0.6);
    return {
      total,
      serviced,
      pending: total - serviced,
    };
  }

  private async getTechnicianCount(): Promise<number> {
    // En producción, consultar BD
    return Math.floor(Math.random() * 5) + 1;
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAnalyticsService(organizationId: number): AnalyticsService {
  return new AnalyticsService(organizationId);
}
