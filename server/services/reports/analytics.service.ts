/**
 * Servicio de Analytics y Reportes
 * Piano Emotion Manager
 * 
 * Proporciona métricas de negocio, KPIs y datos para dashboards
 */

import { getDb } from '../../../drizzle/db.js';
import { eq, and, gte, lte, sql, count, sum, avg, desc } from 'drizzle-orm';
import { clients, pianos, services, invoices } from '../../../drizzle/schema.js';

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
  private partnerId: number;

  constructor(partnerId: number) {
    this.partnerId = partnerId;
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

    // Ejecutar todas las queries en paralelo para mejorar el rendimiento
    const [
      currentRevenue,
      previousRevenue,
      serviceStats,
      clientStats,
      pianoStats,
      technicianCount,
    ] = await Promise.all([
      this.getTotalRevenue(startDate, endDate),
      this.getTotalRevenue(previousStartDate, previousEndDate),
      this.getServiceStats(startDate, endDate),
      this.getClientStats(startDate, endDate),
      this.getPianoStats(startDate, endDate),
      this.getTechnicianCount(),
    ]);

    // Calcular métricas derivadas
    const revenueChange = currentRevenue - previousRevenue;
    const revenueChangePercent = previousRevenue > 0 
      ? (revenueChange / previousRevenue) * 100 
      : 0;

    const averageTicket = serviceStats.completed > 0 
      ? currentRevenue / serviceStats.completed 
      : 0;

    const servicesPerClient = clientStats.active > 0 
      ? serviceStats.total / clientStats.active 
      : 0;

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
        new: pianoStats.new,
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
    const db = await getDb();

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

      // Consultar BD para este período
      const revenue = await this.getTotalRevenue(current, nextDate);
      const servicesCount = await this.getServiceCount(current, nextDate);

      periods.push({
        period: periodLabel,
        revenue,
        services: servicesCount,
        averageTicket: servicesCount > 0 ? revenue / servicesCount : 0,
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
    const db = await getDb();

    // Tipos de servicio predefinidos
    const serviceTypes = [
      { type: 'tuning', name: 'Afinación' },
      { type: 'repair', name: 'Reparación' },
      { type: 'regulation', name: 'Regulación' },
      { type: 'maintenance_basic', name: 'Mantenimiento Básico' },
      { type: 'maintenance_complete', name: 'Mantenimiento Completo' },
      { type: 'maintenance_premium', name: 'Mantenimiento Premium' },
      { type: 'inspection', name: 'Inspección' },
      { type: 'restoration', name: 'Restauración' },
      { type: 'other', name: 'Otros' },
    ];

    const results: ServicesByType[] = [];
    let totalServices = 0;

    for (const serviceType of serviceTypes) {
      // Consultar BD para este tipo de servicio
      const result = await db
        .select({
          count: count(),
          totalCost: sum(services.cost),
        })
        .from(services)
        .where(
          and(
            eq(services.partnerId, this.partnerId),
            eq(services.serviceType, serviceType.type as any),
            gte(services.date, startDate.toISOString()),
            lte(services.date, endDate.toISOString())
          )
        );

      const serviceCount = result[0]?.count || 0;
      const revenue = Number(result[0]?.totalCost || 0);
      totalServices += serviceCount;

      if (serviceCount > 0) {
        results.push({
          type: serviceType.type,
          typeName: serviceType.name,
          count: serviceCount,
          revenue,
          percentage: 0, // Se calcula después
        });
      }
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
    const db = await getDb();
    const { startDate, endDate } = dateRange;

    const result = await db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        totalServices: count(services.id),
        totalRevenue: sum(services.cost),
      })
      .from(clients)
      .leftJoin(services, eq(clients.id, services.clientId))
      .where(
        and(
          eq(clients.partnerId, this.partnerId),
          gte(services.date, startDate.toISOString()),
          lte(services.date, endDate.toISOString())
        )
      )
      .groupBy(clients.id)
      .orderBy(sortBy === 'revenue' ? desc(sum(services.cost)) : desc(count(services.id)))
      .limit(limit);

    return result.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email || '',
      totalServices: r.totalServices || 0,
      totalRevenue: Number(r.totalRevenue || 0),
      lastServiceDate: null,
      pianoCount: 0,
    }));
  }

  /**
   * Obtiene rendimiento de técnicos
   */
  async getTechnicianPerformance(
    dateRange: DateRange
  ): Promise<TechnicianPerformance[]> {
    // Esta funcionalidad requiere tabla de técnicos
    return [];
  }

  /**
   * Obtiene distribución de pianos por marca
   */
  async getPianosByBrand(): Promise<PianosByBrand[]> {
    const db = await getDb();

    const result = await db
      .select({
        brand: pianos.brand,
        count: count(),
        avgYear: avg(pianos.year),
      })
      .from(pianos)
      .where(eq(pianos.partnerId, this.partnerId))
      .groupBy(pianos.brand)
      .orderBy(desc(count()));

    const total = result.reduce((sum, r) => sum + (r.count || 0), 0);
    const currentYear = new Date().getFullYear();

    return result.map(r => ({
      brand: r.brand,
      count: r.count || 0,
      percentage: total > 0 ? ((r.count || 0) / total) * 100 : 0,
      averageAge: r.avgYear ? currentYear - Number(r.avgYear) : 0,
    }));
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

      const revenue = await this.getTotalRevenue(date, monthEnd);
      const servicesCount = await this.getServiceCount(date, monthEnd);
      const newClientsCount = await this.getNewClientsCount(date, monthEnd);
      const newPianosCount = await this.getNewPianosCount(date, monthEnd);

      trends.push({
        month: date.toLocaleDateString('es-ES', { month: 'short' }),
        year: date.getFullYear(),
        revenue,
        services: servicesCount,
        newClients: newClientsCount,
        newPianos: newPianosCount,
      });
    }

    return trends;
  }

  /**
   * Obtiene distribución geográfica
   */
  async getGeographicDistribution(): Promise<GeographicDistribution[]> {
    const db = await getDb();

    const result = await db
      .select({
        city: clients.city,
        region: clients.region,
        clientCount: count(clients.id),
      })
      .from(clients)
      .where(
        and(
          eq(clients.partnerId, this.partnerId),
          sql`${clients.city} IS NOT NULL`
        )
      )
      .groupBy(clients.city, clients.region)
      .orderBy(desc(count(clients.id)));

    return result.map(r => ({
      city: r.city || '',
      region: r.region || '',
      clientCount: r.clientCount || 0,
      pianoCount: 0,
      revenue: 0,
    }));
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
    try {
      console.log('[getTotalRevenue] Starting with params:', {
        partnerId: this.partnerId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      const db = await getDb();
      
      // Calcular ingresos desde facturas pagadas, no desde costos de servicios
      const result = await db
        .select({
          total: sum(invoices.total),
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.partnerId, this.partnerId),
            eq(invoices.status, 'paid'),
            gte(invoices.date, startDate.toISOString()),
            lte(invoices.date, endDate.toISOString())
          )
        );

      console.log('[getTotalRevenue] Query result:', result);
      const total = Number(result[0]?.total || 0);
      console.log('[getTotalRevenue] Returning total:', total);
      
      return total;
    } catch (error) {
      console.error('[getTotalRevenue] ERROR:', error);
      console.error('[getTotalRevenue] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  private async getServiceCount(startDate: Date, endDate: Date): Promise<number> {
    const db = await getDb();
    
    const result = await db
      .select({
        count: count(),
      })
      .from(services)
      .where(
        and(
          eq(services.partnerId, this.partnerId),
          gte(services.date, startDate.toISOString()),
          lte(services.date, endDate.toISOString())
        )
      );

    return result[0]?.count || 0;
  }

  private async getServiceStats(startDate: Date, endDate: Date) {
    const db = await getDb();
    
    // Total de servicios en el período
    const total = await this.getServiceCount(startDate, endDate);
    
    // Por ahora, asumimos que todos los servicios están completados
    // En el futuro, se puede agregar un campo 'status' a la tabla services
    const completed = total;
    const cancelled = 0;
    const pending = 0;

    return { total, completed, pending, cancelled };
  }

  private async getClientStats(startDate: Date, endDate: Date) {
    const db = await getDb();
    
    // Total de clientes
    const totalResult = await db
      .select({ count: count() })
      .from(clients)
      .where(eq(clients.partnerId, this.partnerId));
    const total = totalResult[0]?.count || 0;

    // Nuevos clientes en el período
    const newResult = await db
      .select({ count: count() })
      .from(clients)
      .where(
        and(
          eq(clients.partnerId, this.partnerId),
          gte(clients.createdAt, startDate.toISOString()),
          lte(clients.createdAt, endDate.toISOString())
        )
      );
    const newClients = newResult[0]?.count || 0;

    // Clientes activos (con al menos un servicio en el período)
    const activeResult = await db
      .selectDistinct({ clientId: services.clientId })
      .from(services)
      .where(
        and(
          eq(services.partnerId, this.partnerId),
          gte(services.date, startDate.toISOString()),
          lte(services.date, endDate.toISOString())
        )
      );
    const active = activeResult.length;

    // Retención (porcentaje de clientes activos vs total)
    const retention = total > 0 ? (active / total) * 100 : 0;

    return {
      total,
      new: newClients,
      active,
      retention,
    };
  }

  private async getPianoStats(startDate: Date, endDate: Date) {
    const db = await getDb();
    
    // Total de pianos
    const totalResult = await db
      .select({ count: count() })
      .from(pianos)
      .where(eq(pianos.partnerId, this.partnerId));
    const total = totalResult[0]?.count || 0;

    // Nuevos pianos en el período
    const newResult = await db
      .select({ count: count() })
      .from(pianos)
      .where(
        and(
          eq(pianos.partnerId, this.partnerId),
          gte(pianos.createdAt, startDate.toISOString()),
          lte(pianos.createdAt, endDate.toISOString())
        )
      );
    const newPianos = newResult[0]?.count || 0;

    // Pianos con servicio en el período
    const servicedResult = await db
      .selectDistinct({ pianoId: services.pianoId })
      .from(services)
      .where(
        and(
          eq(services.partnerId, this.partnerId),
          gte(services.date, startDate.toISOString()),
          lte(services.date, endDate.toISOString())
        )
      );
    const serviced = servicedResult.length;

    return {
      total,
      new: newPianos,
      serviced,
      pending: total - serviced,
    };
  }

  private async getNewClientsCount(startDate: Date, endDate: Date): Promise<number> {
    const db = await getDb();
    
    const result = await db
      .select({ count: count() })
      .from(clients)
      .where(
        and(
          eq(clients.partnerId, this.partnerId),
          gte(clients.createdAt, startDate.toISOString()),
          lte(clients.createdAt, endDate.toISOString())
        )
      );

    return result[0]?.count || 0;
  }

  private async getNewPianosCount(startDate: Date, endDate: Date): Promise<number> {
    const db = await getDb();
    
    const result = await db
      .select({ count: count() })
      .from(pianos)
      .where(
        and(
          eq(pianos.partnerId, this.partnerId),
          gte(pianos.createdAt, startDate.toISOString()),
          lte(pianos.createdAt, endDate.toISOString())
        )
      );

    return result[0]?.count || 0;
  }

  private async getTechnicianCount(): Promise<number> {
    // Por ahora retornamos 1 (el técnico principal)
    // En el futuro se puede consultar la tabla de miembros del equipo
    return 1;
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

export function createAnalyticsService(partnerId: number): AnalyticsService {
  return new AnalyticsService(partnerId);
}
