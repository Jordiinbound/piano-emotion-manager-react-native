/**
 * Servicio de Previsiones
 * Piano Emotion Manager
 * 
 * Analíticas predictivas para anticipar necesidades del negocio
 */

import type { MySql2Database } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

// Tipos de previsión
type ForecastType = 
  | 'revenue'           // Previsión de ingresos
  | 'services'          // Previsión de servicios
  | 'client_churn'      // Riesgo de pérdida de clientes
  | 'maintenance'       // Necesidades de mantenimiento
  | 'inventory'         // Demanda de inventario
  | 'workload';         // Carga de trabajo

// Interfaz de previsión
interface Forecast {
  type: ForecastType;
  period: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  factors: string[];
  recommendations: string[];
}

// Interfaz de cliente en riesgo
interface ChurnRisk {
  clientId: string;
  clientName: string;
  riskScore: number;
  lastServiceDate: Date;
  daysSinceLastService: number;
  averageServiceInterval: number;
  totalSpent: number;
  serviceCount: number;
  factors: string[];
  suggestedAction: string;
}

// Interfaz de previsión de mantenimiento
interface MaintenanceForecast {
  pianoId: string;
  pianoInfo: string;
  clientName: string;
  predictedDate: Date;
  serviceType: string;
  basedOn: string;
}

export class ForecastService {
  private db: MySql2Database<Record<string, never>>;

  constructor(db: MySql2Database<Record<string, never>>) {
    this.db = db;
  }

  // ============================================
  // PREVISIÓN DE INGRESOS
  // ============================================

  /**
   * Predice los ingresos para los próximos meses usando regresión logarítmica mejorada
   */
  async forecastRevenue(partnerId: string, months: number = 3): Promise<Forecast[]> {
    console.log('[DEBUG] forecastRevenue called with:', { partnerId, months });
    const historicalData = await this.getHistoricalRevenue(partnerId, 12);
    console.log('[DEBUG] historicalData length:', historicalData.length);
    console.log('[DEBUG] historicalData:', historicalData);
    
    if (historicalData.length < 3) {
      console.log('[DEBUG] Insufficient data, returning empty forecast');
      return [{
        type: 'revenue',
        period: 'Próximos meses',
        value: 0,
        trend: 'stable',
        factors: ['Datos insuficientes para previsión'],
        recommendations: ['Registra más servicios para obtener previsiones precisas'],
      }];
    }

    // Eliminar outliers usando IQR
    const cleanedData = this.removeOutliers(historicalData);
    
    // Calcular tendencia con regresión logarítmica
    const trend = this.calculateLogTrend(cleanedData);
    const seasonality = this.calculateSeasonality(cleanedData);
    const average = cleanedData.reduce((a, b) => a + b, 0) / cleanedData.length;

    const forecasts: Forecast[] = [];
    const now = new Date();

    for (let i = 1; i <= months; i++) {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthIndex = targetMonth.getMonth();
      
      // Previsión con suavizado exponencial
      const logFactor = Math.log(cleanedData.length + i);
      const baseValue = average * (1 + trend * logFactor);
      const seasonalFactor = seasonality[monthIndex] || 1;
      const predictedValue = baseValue * seasonalFactor;

      forecasts.push({
        type: 'revenue',
        period: targetMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
        value: Math.round(predictedValue * 100) / 100,
        trend: trend > 0.02 ? 'up' : trend < -0.02 ? 'down' : 'stable',
        factors: this.getRevenueFactors(trend, seasonalFactor),
        recommendations: this.getRevenueRecommendations(trend, predictedValue, average),
      });
    }

    return forecasts;
  }

  private async getHistoricalRevenue(partnerId: string, months: number): Promise<number[]> {
    try {
      console.log('[DEBUG] getHistoricalRevenue called with:', { partnerId, months });
      
      const result = await this.db.execute(sql`
        SELECT 
          DATE_FORMAT(date, '%Y-%m-01') as month,
          COALESCE(SUM(cost), 0) as total
        FROM services
        WHERE partnerId = ${partnerId}
          AND date >= DATE_SUB(NOW(), INTERVAL ${months} MONTH)
        GROUP BY DATE_FORMAT(date, '%Y-%m-01')
        ORDER BY month
      `);

      console.log('[DEBUG] Query result:', result[0]);
      console.log('[DEBUG] Number of rows:', result[0]?.length || 0);
      
      const values = (result[0] || []).map((r: any) => parseFloat(r.total) || 0);
      console.log('[DEBUG] Parsed values:', values);
      
      return values;
    } catch (error) {
      console.error('[ForecastService] Error getting historical revenue:', error);
      return [];
    }
  }

  private removeOutliers(data: number[]): number[] {
    if (data.length < 4) return data;
    
    const sorted = [...data].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return data.filter(v => v >= lowerBound && v <= upperBound);
  }

  private calculateLogTrend(data: number[]): number {
    if (data.length < 2) return 0;
    
    const n = data.length;
    let sumLogX = 0, sumY = 0, sumLogXY = 0, sumLogX2 = 0;
    
    for (let i = 0; i < n; i++) {
      const logX = Math.log(i + 1);
      sumLogX += logX;
      sumY += data[i];
      sumLogXY += logX * data[i];
      sumLogX2 += logX * logX;
    }
    
    const slope = (n * sumLogXY - sumLogX * sumY) / (n * sumLogX2 - sumLogX * sumLogX);
    const average = sumY / n;
    
    return average > 0 ? slope / average : 0;
  }

  private calculateSeasonality(data: number[]): number[] {
    const seasonality = new Array(12).fill(1);
    const average = data.reduce((a, b) => a + b, 0) / data.length;
    
    if (average > 0) {
      data.forEach((value, index) => {
        const monthIndex = (new Date().getMonth() - data.length + index + 1 + 12) % 12;
        seasonality[monthIndex] = value / average;
      });
    }
    
    return seasonality;
  }

  private getRevenueFactors(trend: number, seasonalFactor: number): string[] {
    const factors: string[] = [];
    
    if (trend > 0.05) factors.push('Tendencia de crecimiento sostenido');
    else if (trend < -0.05) factors.push('Tendencia de decrecimiento');
    else factors.push('Ingresos estables');
    
    if (seasonalFactor > 1.1) factors.push('Temporada alta esperada');
    else if (seasonalFactor < 0.9) factors.push('Temporada baja esperada');
    
    return factors;
  }

  private getRevenueRecommendations(trend: number, predicted: number, average: number): string[] {
    const recommendations: string[] = [];
    
    if (trend < -0.05) {
      recommendations.push('Considera campañas de marketing para reactivar clientes');
      recommendations.push('Revisa precios y ofertas de la competencia');
    }
    
    if (predicted > average * 1.2) {
      recommendations.push('Prepárate para mayor demanda');
      recommendations.push('Considera contratar ayuda temporal');
    }
    
    if (predicted < average * 0.8) {
      recommendations.push('Buen momento para mantenimiento de equipos');
      recommendations.push('Contacta clientes inactivos');
    }
    
    return recommendations.length > 0 ? recommendations : ['Mantén el ritmo actual de trabajo'];
  }

  // ============================================
  // PREVISIÓN DE PÉRDIDA DE CLIENTES (CHURN)
  // ============================================

  /**
   * Identifica clientes en riesgo de pérdida con análisis mejorado
   */
  async forecastClientChurn(partnerId: string): Promise<ChurnRisk[]> {
    try {
      const result = await this.db.execute(sql`
        SELECT 
          c.id,
          c.name,
          c.email,
          c.phone,
          MAX(s.date) as last_service,
          COUNT(s.id) as service_count,
          COALESCE(SUM(s.cost), 0) as total_spent,
          180 as avg_interval_days
        FROM clients c
        LEFT JOIN services s ON s.clientId = c.id
        WHERE c.partnerId = ${partnerId}
        GROUP BY c.id, c.name, c.email, c.phone
        HAVING COUNT(s.id) > 0
      `);

      const churnRisks: ChurnRisk[] = [];
      const now = new Date();

      for (const client of result[0] || []) {
        const lastServiceDate = new Date((client as any).last_service);
        const daysSinceLastService = Math.floor((now.getTime() - lastServiceDate.getTime()) / (1000 * 60 * 60 * 24));
        const avgInterval = parseFloat((client as any).avg_interval_days) || 180;
        const totalSpent = parseFloat((client as any).total_spent) || 0;
        const serviceCount = parseInt((client as any).service_count) || 0;

        let riskScore = 0;
        const factors: string[] = [];

        // Factor 1: Tiempo desde último servicio (40 puntos)
        const intervalRatio = daysSinceLastService / avgInterval;
        if (intervalRatio > 2) {
          riskScore += 40;
          factors.push('Muy por encima del intervalo habitual');
        } else if (intervalRatio > 1.5) {
          riskScore += 25;
          factors.push('Por encima del intervalo habitual');
        } else if (intervalRatio > 1) {
          riskScore += 10;
          factors.push('Cerca del intervalo habitual');
        }

        // Factor 2: Días absolutos sin servicio (30 puntos)
        if (daysSinceLastService > 365) {
          riskScore += 30;
          factors.push('Más de 1 año sin servicio');
        } else if (daysSinceLastService > 180) {
          riskScore += 15;
          factors.push('Más de 6 meses sin servicio');
        }

        // Factor 3: Valor del cliente (20 puntos)
        if (totalSpent > 1000 && serviceCount > 3) {
          // Cliente valioso - aumentar riesgo si está inactivo
          if (daysSinceLastService > avgInterval) {
            riskScore += 20;
            factors.push('Cliente de alto valor inactivo');
          }
        } else if (serviceCount < 2) {
          riskScore += 15;
          factors.push('Pocos servicios históricos');
        }

        // Factor 4: Tendencia de gasto (10 puntos)
        if (serviceCount >= 3) {
          // Aquí podrías agregar análisis de tendencia de gasto
          // Por ahora, simplificado
        }

        if (riskScore >= 25) {
          churnRisks.push({
            clientId: (client as any).id,
            clientName: (client as any).name,
            clientEmail: (client as any).email,
            clientPhone: (client as any).phone,
            riskScore: Math.min(100, riskScore),
            lastServiceDate,
            daysSinceLastService,
            averageServiceInterval: Math.round(avgInterval),
            totalSpent,
            serviceCount,
            factors,
            suggestedAction: this.getSuggestedChurnAction(riskScore, daysSinceLastService, totalSpent),
          });
        }
      }

      return churnRisks.sort((a, b) => b.daysSinceLastService - a.daysSinceLastService);
    } catch (error) {
      console.error('[ForecastService] Error forecasting client churn:', error);
      return [];
    }
  }

  private getSuggestedChurnAction(riskScore: number, daysSince: number, totalSpent: number): string {
    if (riskScore >= 70) {
      return totalSpent > 1000 
        ? 'Contactar urgentemente con oferta especial (cliente VIP)'
        : 'Contactar urgentemente con oferta especial';
    } else if (riskScore >= 50) {
      return 'Enviar recordatorio de mantenimiento';
    } else if (daysSince > 180) {
      return 'Enviar email de seguimiento';
    }
    return 'Programar contacto de cortesía';
  }

  // ============================================
  // PREVISIÓN DE MANTENIMIENTO
  // ============================================

  async forecastMaintenance(partnerId: string): Promise<MaintenanceForecast[]> {
    try {
      const result = await this.db.execute(sql`
        SELECT 
          p.id as piano_id,
          p.brand,
          p.model,
          p.pianoType as type,
          c.name as client_name,
          c.email as client_email,
          c.phone as client_phone,
          s.serviceType,
          s.date as service_date
        FROM pianos p
        JOIN clients c ON p.clientId = c.id
        LEFT JOIN services s ON s.pianoId = p.id
        WHERE p.partnerId = ${partnerId}
        ORDER BY p.id, s.serviceType, s.date DESC
      `);

      const forecasts: MaintenanceForecast[] = [];
      const pianoServices: Map<string, Map<string, Date[]>> = new Map();

      for (const row of result[0] || []) {
        if (!(row as any).service_date) continue;

        const pianoKey = (row as any).piano_id;
        if (!pianoServices.has(pianoKey)) {
          pianoServices.set(pianoKey, new Map());
        }

        const serviceType = (row as any).serviceType || 'general';
        if (!pianoServices.get(pianoKey)!.has(serviceType)) {
          pianoServices.get(pianoKey)!.set(serviceType, []);
        }

        pianoServices.get(pianoKey)!.get(serviceType)!.push(new Date((row as any).service_date));
      }

      const now = new Date();
      const processedPianos = new Set<string>();

      for (const row of result[0] || []) {
        if (!(row as any).piano_id || processedPianos.has((row as any).piano_id)) continue;
        processedPianos.add((row as any).piano_id);

        const pianoData = pianoServices.get((row as any).piano_id);
        if (!pianoData) continue;

        for (const [serviceType, dates] of pianoData.entries()) {
          if (dates.length < 1) continue;

          let avgInterval = 180;
          if (dates.length >= 2) {
            const intervals: number[] = [];
            for (let i = 1; i < dates.length; i++) {
              const diff = dates[i - 1].getTime() - dates[i].getTime();
              intervals.push(diff / (1000 * 60 * 60 * 24));
            }
            avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          }

          const lastService = dates[0];
          const predictedDate = new Date(lastService.getTime() + avgInterval * 24 * 60 * 60 * 1000);

          const sixMonthsFromNow = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
          if (predictedDate > now && predictedDate < sixMonthsFromNow) {
            forecasts.push({
              pianoId: (row as any).piano_id,
              pianoInfo: `${(row as any).brand} ${(row as any).model} (${(row as any).type})`,
              clientName: (row as any).client_name,
              clientEmail: (row as any).client_email,
              clientPhone: (row as any).client_phone,
              predictedDate,
              serviceType: serviceType === 'general' ? 'Mantenimiento general' : serviceType,
              basedOn: `${dates.length} servicios anteriores, intervalo promedio: ${Math.round(avgInterval)} días`,
            });
          }
        }
      }

      return forecasts.sort((a, b) => a.predictedDate.getTime() - b.predictedDate.getTime());
    } catch (error) {
      console.error('[ForecastService] Error forecasting maintenance:', error);
      return [];
    }
  }

  // ============================================
  // PREVISIÓN DE CARGA DE TRABAJO
  // ============================================

  async forecastWorkload(partnerId: string, weeks: number = 4): Promise<any[]> {
    try {
      const upcomingResult = await this.db.execute(sql`
        SELECT 
          DATE_FORMAT(date, '%Y-%m-%d') as week,
          COUNT(*) as appointments
        FROM appointments
        WHERE partnerId = ${partnerId} AND date >= CURDATE()
        GROUP BY WEEK(date, 1), DATE_FORMAT(date, '%Y-%m-%d')
        ORDER BY week
      `);

      const historicalResult = await this.db.execute(sql`
        SELECT 
          DAYOFWEEK(date) as day_of_week,
          COUNT(*) as services
        FROM services
        WHERE partnerId = ${partnerId} AND date >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
        GROUP BY DAYOFWEEK(date)
      `);

      const dayDistribution = new Array(7).fill(0);
      let totalServices = 0;
      for (const row of historicalResult[0] || []) {
        dayDistribution[parseInt((row as any).day_of_week)] = parseInt((row as any).services);
        totalServices += parseInt((row as any).services);
      }

      if (totalServices > 0) {
        for (let i = 0; i < 7; i++) {
          dayDistribution[i] = dayDistribution[i] / totalServices;
        }
      }

      const forecasts = [];
      const now = new Date();

      for (let w = 0; w < weeks; w++) {
        const weekStart = new Date(now.getTime() + w * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

        const scheduledAppointments = (upcomingResult[0] || []).find((r: any) => {
          const weekDate = new Date(r.week);
          return weekDate >= weekStart && weekDate <= weekEnd;
        });

        const scheduled = parseInt((scheduledAppointments as any)?.appointments) || 0;
        const avgWeeklyServices = totalServices / 13;
        const estimatedAdditional = Math.round(avgWeeklyServices * 0.3);

        forecasts.push({
          week: `Semana del ${weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`,
          scheduledAppointments: scheduled,
          estimatedTotal: scheduled + estimatedAdditional,
          busyDays: this.getBusyDays(dayDistribution),
          recommendation: this.getWorkloadRecommendation(scheduled + estimatedAdditional, avgWeeklyServices),
        });
      }

      return forecasts;
    } catch (error) {
      console.error('[ForecastService] Error forecasting workload:', error);
      return [];
    }
  }

  private getBusyDays(distribution: number[]): string[] {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const threshold = 1 / 7;
    
    return distribution
      .map((value, index) => ({ day: days[index], value }))
      .filter(d => d.value > threshold * 1.2)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map(d => d.day);
  }

  private getWorkloadRecommendation(estimated: number, average: number): string {
    const ratio = estimated / (average || 1);
    
    if (ratio > 1.5) {
      return 'Semana muy ocupada - considera reorganizar citas';
    } else if (ratio > 1.2) {
      return 'Semana ocupada - planifica con antelación';
    } else if (ratio < 0.5) {
      return 'Semana tranquila - buen momento para contactar clientes';
    }
    return 'Carga de trabajo normal';
  }

  // ============================================
  // PREVISIÓN DE INVENTARIO
  // ============================================

  async forecastInventoryDemand(partnerId: string): Promise<any[]> {
    try {
      const result = await this.db.execute(sql`
        SELECT 
          i.id,
          i.name,
          i.quantity as current_stock,
          i.minStock as min_stock,
          i.unit,
          COUNT(im.id) as usage_count,
          SUM(CASE WHEN im.type = 'out' THEN im.quantity ELSE 0 END) as total_used,
          AVG(CASE WHEN im.type = 'out' THEN im.quantity ELSE 0 END) as avg_per_service
        FROM inventory i
        LEFT JOIN inventory_movements im ON im.item_id = i.id AND im.type = 'out' AND im.created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
        WHERE i.partnerId = ${partnerId}
        GROUP BY i.id, i.name, i.quantity, i.minStock, i.unit
      `);

      const forecasts = [];

      for (const item of result[0] || []) {
        const monthlyUsage = (parseFloat((item as any).total_used) || 0) / 3;
        const currentStock = parseFloat((item as any).current_stock) || 0;
        const minStock = parseFloat((item as any).min_stock) || 0;

        // Mostrar TODOS los items
        if (monthlyUsage > 0) {
          const monthsUntilEmpty = currentStock / monthlyUsage;
          const monthsUntilMin = (currentStock - minStock) / monthlyUsage;

          forecasts.push({
            itemId: (item as any).id,
            itemName: (item as any).name,
            currentStock,
            minStock,
            unit: (item as any).unit,
            monthlyUsage: Math.round(monthlyUsage * 10) / 10,
            monthsUntilMin: Math.max(0, Math.round(monthsUntilMin * 10) / 10),
            monthsUntilEmpty: Math.max(0, Math.round(monthsUntilEmpty * 10) / 10),
            suggestedOrder: Math.max(0, Math.ceil(monthlyUsage * 3 - currentStock)),
            urgency: monthsUntilMin < 1 ? 'high' : monthsUntilMin < 2 ? 'medium' : 'low',
          });
        } else {
          // Items sin movimientos recientes: mostrar todos
          forecasts.push({
            itemId: (item as any).id,
            itemName: (item as any).name,
            currentStock,
            minStock,
            unit: (item as any).unit,
            monthlyUsage: 0,
            monthsUntilMin: currentStock <= minStock ? 0 : 999,
            monthsUntilEmpty: 999,
            suggestedOrder: currentStock <= minStock ? Math.max(0, Math.ceil(minStock * 2 - currentStock)) : 0,
            urgency: currentStock === 0 ? 'high' : currentStock <= minStock ? 'medium' : 'low',
          });
        }
      }

      return forecasts.sort((a, b) => {
        const urgencyOrder = { high: 0, medium: 1, low: 2 };
        return urgencyOrder[a.urgency as keyof typeof urgencyOrder] - urgencyOrder[b.urgency as keyof typeof urgencyOrder];
      });
    } catch (error) {
      console.error('[ForecastService] Error forecasting inventory demand:', error);
      return [];
    }
  }

  // ============================================
  // RESUMEN DE PREVISIONES
  // ============================================

  async getForecastsSummary(partnerId: string): Promise<any> {
    const [revenue, churn, maintenance, workload, inventory] = await Promise.all([
      this.forecastRevenue(partnerId, 3),
      this.forecastClientChurn(partnerId),
      this.forecastMaintenance(partnerId),
      this.forecastWorkload(partnerId, 4),
      this.forecastInventoryDemand(partnerId),
    ]);

    return {
      revenue: {
        forecasts: revenue,
        trend: revenue[0]?.trend || 'stable',
        nextMonthValue: revenue[0]?.value || 0,
      },
      clientChurn: {
        atRiskCount: churn.length,
        highRiskCount: churn.filter(c => c.riskScore >= 70).length,
        topRiskClients: churn.slice(0, 5),
      },
      maintenance: {
        upcomingCount: maintenance.length,
        nextMonth: maintenance.filter(m => {
          const now = new Date();
          const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          return m.predictedDate >= now && m.predictedDate <= next30Days;
        }).length,
        forecasts: maintenance.slice(0, 10),
      },
      workload: {
        forecasts: workload,
        totalNext30Days: workload.reduce((sum, w) => sum + w.estimatedTotal, 0),
        busiestWeek: workload.length > 0 ? workload.reduce((max, w) => w.estimatedTotal > max.estimatedTotal ? w : max, workload[0]) : null,
      },
      inventory: {
        urgentItems: inventory.filter(i => i.urgency === 'high').length,
        forecasts: inventory.slice(0, 10),
      },
      generatedAt: new Date(),
    };
  }
}

export default ForecastService;
