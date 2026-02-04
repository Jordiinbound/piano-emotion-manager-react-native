/**
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { getDb } from "../../db.js";
import { cacheService } from '../../lib/cache.service.js';
type any = MySql2Database<Record<string, never>>;
 * Servicio de Predicción de Demanda
 * 
 * Analíticas predictivas para anticipar necesidades del negocio
 */

// Tipos de predicción
type PredictionType = 
  | 'revenue'           // Predicción de ingresos
  | 'services'          // Predicción de servicios
  | 'client_churn'      // Riesgo de pérdida de clientes
  | 'maintenance'       // Necesidades de mantenimiento
  | 'inventory'         // Demanda de inventario
  | 'workload';         // Carga de trabajo

// Interfaz de predicción
interface Prediction {
  type: PredictionType;
  period: string;
  value: number;
  confidence: number;      // 0-100%
  trend: 'up' | 'down' | 'stable';
  factors: string[];       // Factores que influyen
  recommendations: string[];
}

// Interfaz de cliente en riesgo
interface ChurnRisk {
  clientId: string;
  clientName: string;
  riskScore: number;       // 0-100
  lastServiceDate: Date;
  daysSinceLastService: number;
  averageServiceInterval: number;
  factors: string[];
  suggestedAction: string;
}

// Interfaz de predicción de mantenimiento
interface MaintenancePrediction {
  pianoId: string;
  pianoInfo: string;
  clientName: string;
  predictedDate: Date;
  serviceType: string;
  confidence: number;
  basedOn: string;
}

export class PredictionService {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  // ============================================
  // PREDICCIÓN DE INGRESOS
  // ============================================

  /**
   * Predice los ingresos para los próximos meses
   */
  async predictRevenue(partnerId: string, months: number = 3): Promise<Prediction[]> {
    // Obtener datos históricos de los últimos 12 meses
    const historicalData = await this.getHistoricalRevenue(partnerId, 12);
    
    if (historicalData.length < 3) {
      return [{
        type: 'revenue',
        period: 'Próximos meses',
        value: 0,
        confidence: 0,
        trend: 'stable',
        factors: ['Datos insuficientes para predicción'],
        recommendations: ['Registra más servicios para obtener predicciones precisas'],
      }];
    }

    // Calcular tendencia y estacionalidad
    const trend = this.calculateTrend(historicalData);
    const seasonality = this.calculateSeasonality(historicalData);
    const average = historicalData.reduce((a: any, b: any) => a + b, 0) / historicalData.length;

    const predictions: Prediction[] = [];
    const now = new Date();

    for (let i = 1; i <= months; i++) {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthIndex = targetMonth.getMonth();
      
      // Predicción logarítmica: y = average * (1 + trend * ln(x))
      const logFactor = Math.log(historicalData.length + i);
      const baseValue = average * (1 + trend * logFactor);
      const seasonalFactor = seasonality[monthIndex] || 1;
      const predictedValue = baseValue * seasonalFactor;

      // Confianza basada en cantidad de datos y variabilidad
      const variance = this.calculateVariance(historicalData);
      const confidence = Math.max(30, Math.min(90, 100 - variance * 100));

      predictions.push({
        type: 'revenue',
        period: targetMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
        value: Math.round(predictedValue * 100) / 100,
        confidence: Math.round(confidence),
        trend: trend > 0.02 ? 'up' : trend < -0.02 ? 'down' : 'stable',
        factors: this.getRevenueFactor(trend, seasonalFactor),
        recommendations: this.getRevenueRecommendations(trend, predictedValue, average),
      });
    }

    return predictions;
  }

  private async getHistoricalRevenue(partnerId: string, months: number): Promise<number[]> {
    try {
      const result = await this.db.execute(`
        SELECT 
          DATE_FORMAT(date, '%Y-%m-01') as month,
          COALESCE(SUM(cost), 0) as total
        FROM services
        WHERE partnerId = ${partnerId}
          AND date >= DATE_SUB(NOW(), INTERVAL ${months} MONTH)
        GROUP BY DATE_FORMAT(date, '%Y-%m-01')
        ORDER BY month
      `);

      return (result.rows || []).map((r: { total: string }) => parseFloat(r.total) || 0);
    } catch (error) {
      console.error('[PredictionService] Error getting historical revenue:', error);
      return [];
    }
  }

  private calculateTrend(data: number[]): number {
    if (data.length < 2) return 0;
    
    // Usar regresión logarítmica para capturar crecimiento no lineal
    const n = data.length;
    let sumLogX = 0, sumY = 0, sumLogXY = 0, sumLogX2 = 0;
    
    for (let i = 0; i < n; i++) {
      const logX = Math.log(i + 1); // +1 para evitar log(0)
      sumLogX += logX;
      sumY += data[i];
      sumLogXY += logX * data[i];
      sumLogX2 += logX * logX;
    }
    
    // Calcular pendiente logarítmica: y = a + b*ln(x)
    const slope = (n * sumLogXY - sumLogX * sumY) / (n * sumLogX2 - sumLogX * sumLogX);
    const average = sumY / n;
    
    return average > 0 ? slope / average : 0;
  }

  private calculateSeasonality(data: number[]): number[] {
    // Simplificado: retorna factores estacionales basados en datos históricos
    const seasonality = new Array(12).fill(1);
    const average = data.reduce((a: any, b: any) => a + b, 0) / data.length;
    
    if (average > 0) {
      data.forEach((value, index) => {
        const monthIndex = (new Date().getMonth() - data.length + index + 1 + 12) % 12;
        seasonality[monthIndex] = value / average;
      });
    }
    
    return seasonality;
  }

  private calculateVariance(data: number[]): number {
    if (data.length < 2) return 0;
    const mean = data.reduce((a: any, b: any) => a + b, 0) / data.length;
    const squaredDiffs = data.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a: any, b: any) => a + b, 0) / data.length;
    return Math.sqrt(avgSquaredDiff) / (mean || 1);
  }

  private getRevenueFactor(trend: number, seasonalFactor: number): string[] {
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
  // PREDICCIÓN DE PÉRDIDA DE CLIENTES (CHURN)
  // ============================================

  /**
   * Identifica clientes en riesgo de pérdida
   */
  async predictClientChurn(partnerId: string): Promise<ChurnRisk[]> {
    try {
      // Obtener configuración del usuario
      const settingsResult = await this.db.execute(`
        SELECT churnRiskMinDays, churnRiskIntervalMultiplier, churnRiskMinScore
        FROM alert_settings
        WHERE partnerId = ${partnerId}
        LIMIT 1
      `);
      
      const settings = settingsResult.rows?.[0] || {
        churnRiskMinDays: 180,
        churnRiskIntervalMultiplier: 1.5,
        churnRiskMinScore: 25
      };
      
      // Obtener clientes con su historial de servicios
      const result = await this.db.execute(`
      SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        MAX(s.date) as last_service,
        COUNT(s.id) as service_count,
        AVG(TIMESTAMPDIFF(DAY, 
          LAG(s.date) OVER (PARTITION BY c.id ORDER BY s.date),
          s.date
        )) as avg_interval_days
      FROM clients c
      LEFT JOIN services s ON s.client_id = c.id
      WHERE c.partner_id = ${partnerId}
      GROUP BY c.id, c.name, c.email, c.phone
      HAVING COUNT(s.id) > 0
    `);

    const churnRisks: ChurnRisk[] = [];
    const now = new Date();

    for (const client of result.rows || []) {
      const lastServiceDate = new Date(client.last_service);
      const daysSinceLastService = Math.floor((now.getTime() - lastServiceDate.getTime()) / (1000 * 60 * 60 * 24));
      const avgInterval = parseFloat(client.avg_interval_days) || 180; // Default 6 meses

      // Calcular score de riesgo
      let riskScore = 0;
      const factors: string[] = [];

      // Factor 1: Tiempo desde último servicio vs intervalo promedio (configurable)
      const intervalRatio = daysSinceLastService / avgInterval;
      const multiplier = parseFloat(settings.churnRiskIntervalMultiplier) || 1.5;
      if (intervalRatio > (multiplier * 1.33)) { // ej: 2x si multiplier es 1.5
        riskScore += 40;
        factors.push('Muy por encima del intervalo habitual');
      } else if (intervalRatio > multiplier) {
        riskScore += 25;
        factors.push('Por encima del intervalo habitual');
      } else if (intervalRatio > (multiplier * 0.67)) {
        riskScore += 10;
        factors.push('Cerca del intervalo habitual');
      }

      // Factor 2: Días absolutos sin servicio (configurable)
      const minDays = parseInt(settings.churnRiskMinDays) || 180;
      if (daysSinceLastService > (minDays * 2)) {
        riskScore += 30;
        factors.push(`Más de ${Math.round(minDays * 2 / 30)} meses sin servicio`);
      } else if (daysSinceLastService > minDays) {
        riskScore += 15;
        factors.push(`Más de ${Math.round(minDays / 30)} meses sin servicio`);
      }

      // Factor 3: Frecuencia histórica
      if (client.service_count < 2) {
        riskScore += 15;
        factors.push('Pocos servicios históricos');
      }

      // Solo incluir clientes con riesgo significativo (configurable)
      const minScore = parseInt(settings.churnRiskMinScore) || 25;
      if (riskScore >= minScore) {
        churnRisks.push({
          clientId: client.id,
          clientName: client.name,
          clientEmail: client.email,
          clientPhone: client.phone,
          riskScore: Math.min(100, riskScore),
          lastServiceDate,
          daysSinceLastService,
          averageServiceInterval: Math.round(avgInterval),
          factors,
          suggestedAction: this.getSuggestedChurnAction(riskScore, daysSinceLastService),
        });
      }
    }

      // Ordenar por días sin servicio descendente (más días primero)
      return churnRisks.sort((a: any, b: any) => b.daysSinceLastService - a.daysSinceLastService);
    } catch (error) {
      console.error('[PredictionService] Error predicting client churn:', error);
      return [];
    }
  }

  private getSuggestedChurnAction(riskScore: number, daysSince: number): string {
    if (riskScore >= 70) {
      return 'Contactar urgentemente con oferta especial';
    } else if (riskScore >= 50) {
      return 'Enviar recordatorio de mantenimiento';
    } else if (daysSince > 180) {
      return 'Enviar email de seguimiento';
    }
    return 'Programar contacto de cortesía';
  }

  // ============================================
  // PREDICCIÓN DE MANTENIMIENTO
  // ============================================

  /**
   * Predice cuándo los pianos necesitarán mantenimiento
   */
  async predictMaintenance(partnerId: string): Promise<MaintenancePrediction[]> {
    try {
      // Obtener configuración del usuario
      const settingsResult = await this.db.execute(`
        SELECT maintenanceTuningIntervalDays, maintenanceRegulationIntervalDays, maintenancePredictionWindowMonths
        FROM alert_settings
        WHERE partnerId = ${partnerId}
        LIMIT 1
      `);
      
      const settings = settingsResult.rows?.[0] || {
        maintenanceTuningIntervalDays: 180,
        maintenanceRegulationIntervalDays: 730,
        maintenancePredictionWindowMonths: 6
      };
      
      // Obtener pianos con su historial de servicios
      const result = await this.db.execute(`
      SELECT 
        p.id as piano_id,
        p.brand,
        p.model,
        p.type,
        c.name as client_name,
        c.email as client_email,
        c.phone as client_phone,
        s.service_type,
        s.date as service_date,
        LAG(s.date) OVER (PARTITION BY p.id, s.service_type ORDER BY s.date) as prev_service_date
      FROM pianos p
      JOIN clients c ON p.clientId = c.id
      LEFT JOIN services s ON s.pianoId = p.id
      WHERE p.partnerId = ${partnerId}
      ORDER BY p.id, s.service_type, s.date DESC
    `);

    const predictions: MaintenancePrediction[] = [];
    const pianoServices: Map<string, Map<string, Date[]>> = new Map();

    // Agrupar servicios por piano y tipo
    for (const row of result.rows || []) {
      if (!row.service_date) continue;

      const pianoKey = row.piano_id;
      if (!pianoServices.has(pianoKey)) {
        pianoServices.set(pianoKey, new Map());
      }

      const serviceType = row.service_type || 'general';
      if (!pianoServices.get(pianoKey)!.has(serviceType)) {
        pianoServices.get(pianoKey)!.set(serviceType, []);
      }

      pianoServices.get(pianoKey)!.get(serviceType)!.push(new Date(row.service_date));
    }

    // Calcular predicciones
    const now = new Date();
    const processedPianos = new Set<string>();

    for (const row of result.rows || []) {
      if (!row.piano_id || processedPianos.has(row.piano_id)) continue;
      processedPianos.add(row.piano_id);

      const pianoData = pianoServices.get(row.piano_id);
      if (!pianoData) continue;

      // Calcular intervalo promedio para cada tipo de servicio
      for (const [serviceType, dates] of pianoData.entries()) {
        if (dates.length < 1) continue;

        // Calcular intervalo promedio
        let avgInterval = 180; // Default 6 meses
        if (dates.length >= 2) {
          const intervals: number[] = [];
          for (let i = 1; i < dates.length; i++) {
            const diff = dates[i - 1].getTime() - dates[i].getTime();
            intervals.push(diff / (1000 * 60 * 60 * 24));
          }
          avgInterval = intervals.reduce((a: any, b: any) => a + b, 0) / intervals.length;
        }

        // Predecir próxima fecha
        const lastService = dates[0];
        const predictedDate = new Date(lastService.getTime() + avgInterval * 24 * 60 * 60 * 1000);

        // Solo incluir si la fecha predicha está en el futuro cercano (próximos 6 meses)
        const predictionWindowDays = (settings.maintenancePredictionWindowMonths || 6) * 30;
        const predictionWindowEnd = new Date(now.getTime() + predictionWindowDays * 24 * 60 * 60 * 1000);
        if (predictedDate > now && predictedDate < predictionWindowEnd) {
          predictions.push({
            pianoId: row.piano_id,
            pianoInfo: `${row.brand} ${row.model} (${row.type})`,
            clientName: row.client_name,
            clientEmail: row.client_email,
            clientPhone: row.client_phone,
            predictedDate,
            serviceType: serviceType === 'general' ? 'Mantenimiento general' : serviceType === 'tuning' ? 'Afinación' : serviceType === 'regulation' ? 'Regulación' : serviceType,
            confidence: Math.min(90, 50 + dates.length * 10),
            basedOn: `Basado en ${dates.length} ${dates.length === 1 ? 'servicio anterior' : 'servicios anteriores'}. Intervalo promedio: ${Math.round(avgInterval)} días (${(avgInterval / 30).toFixed(1)} meses)`,
          });
        }
      }
    }

      // Ordenar por fecha predicha
      return predictions.sort((a: any, b: any) => a.predictedDate.getTime() - b.predictedDate.getTime());
    } catch (error) {
      console.error('[PredictionService] Error predicting maintenance:', error);
      return [];
    }
  }

  // ============================================
  // PREDICCIÓN DE CARGA DE TRABAJO
  // ============================================

  /**
   * Predice la carga de trabajo para las próximas semanas
   */
  async predictWorkload(partnerId: string, weeks: number = 4): Promise<any[]> {
    try {
      // Obtener citas programadas
      const upcomingResult = await this.db.execute(`
      SELECT 
        DATE_FORMAT(date, '%Y-%m-%d') as week,
        COUNT(*) as appointments
      FROM appointments
      WHERE partner_id = ${partnerId} AND date >= CURDATE()
      GROUP BY WEEK(date, 1)
      ORDER BY week
    `);

    // Obtener histórico de servicios por día de la semana
    const historicalResult = await this.db.execute(`
      SELECT 
        DAYOFWEEK(date) as day_of_week,
        COUNT(*) as services
      FROM services
      WHERE partner_id = ${partnerId} AND date >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
      GROUP BY DAYOFWEEK(date)
    `);

    const dayDistribution = new Array(7).fill(0);
    let totalServices = 0;
    for (const row of historicalResult.rows || []) {
      dayDistribution[parseInt(row.day_of_week)] = parseInt(row.services);
      totalServices += parseInt(row.services);
    }

    // Normalizar distribución
    if (totalServices > 0) {
      for (let i = 0; i < 7; i++) {
        dayDistribution[i] = dayDistribution[i] / totalServices;
      }
    }

    const predictions = [];
    const now = new Date();

    for (let w = 0; w < weeks; w++) {
      const weekStart = new Date(now.getTime() + w * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

      // Buscar citas programadas para esta semana
      const scheduledAppointments = (upcomingResult.rows || []).find((r: { week: string; appointments?: string }) => {
        const weekDate = new Date(r.week);
        return weekDate >= weekStart && weekDate <= weekEnd;
      });

      const scheduled = parseInt(scheduledAppointments?.appointments) || 0;
      
      // Estimar servicios adicionales basados en histórico
      const avgWeeklyServices = totalServices / 13; // 3 meses = ~13 semanas
      const estimatedAdditional = Math.round(avgWeeklyServices * 0.3); // 30% de servicios no programados

      predictions.push({
        week: `Semana del ${weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`,
        scheduledAppointments: scheduled,
        estimatedTotal: scheduled + estimatedAdditional,
        busyDays: this.getBusyDays(dayDistribution),
        recommendation: this.getWorkloadRecommendation(scheduled + estimatedAdditional, avgWeeklyServices),
      });
    }

      return predictions;
    } catch (error) {
      console.error('[PredictionService] Error predicting workload:', error);
      return [];
    }
  }

  private getBusyDays(distribution: number[]): string[] {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const threshold = 1 / 7; // Promedio
    
    return distribution
      .map((value, index) => ({ day: days[index], value }))
      .filter(d => d.value > threshold * 1.2)
      .sort((a: any, b: any) => b.value - a.value)
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
  // PREDICCIÓN DE INVENTARIO
  // ============================================

  /**
   * Predice la demanda de inventario
   */
  async predictInventoryDemand(partnerId: string): Promise<any[]> {
    try {
      // Obtener consumo histórico de inventario
      const result = await this.db.execute(`
      SELECT 
        i.id,
        i.name,
        i.quantity as current_stock,
        i.minStock as min_stock,
        i.unit,
        COUNT(im.id) as usage_count,
        COALESCE(SUM(im.quantity), 0) as total_used,
        COALESCE(AVG(im.quantity), 0) as avg_per_service
      FROM inventory i
      LEFT JOIN inventory_movements im ON im.item_id = i.id AND im.type = 'out' AND im.createdAt >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
      WHERE i.partnerId = ${partnerId}
      GROUP BY i.id, i.name, i.quantity, i.minStock, i.unit
    `);

    const predictions = [];

    for (const item of result.rows || []) {
      const monthlyUsage = (parseFloat(item.total_used) || 0) / 3;
      const currentStock = parseFloat(item.current_stock) || 0;
      const minStock = parseFloat(item.min_stock) || 0;

      // Si tiene movimientos, calcular basado en uso histórico
      if (monthlyUsage > 0) {
        const monthsUntilEmpty = currentStock / monthlyUsage;
        const monthsUntilMin = (currentStock - minStock) / monthlyUsage;

        predictions.push({
          itemId: item.id,
          itemName: item.name,
          currentStock,
          minStock,
          unit: item.unit,
          monthlyUsage: Math.round(monthlyUsage * 10) / 10,
          monthsUntilMin: Math.max(0, Math.round(monthsUntilMin * 10) / 10),
          monthsUntilEmpty: Math.max(0, Math.round(monthsUntilEmpty * 10) / 10),
          suggestedOrder: Math.max(0, Math.ceil(monthlyUsage * 3 - currentStock)),
          urgency: monthsUntilMin < 1 ? 'high' : monthsUntilMin < 2 ? 'medium' : 'low',
        });
      } else if (currentStock <= minStock) {
        // Si no tiene movimientos pero está bajo mínimo, mostrar como urgente
        predictions.push({
          itemId: item.id,
          itemName: item.name,
          currentStock,
          minStock,
          unit: item.unit,
          monthlyUsage: 0,
          monthsUntilMin: 0,
          monthsUntilEmpty: 0,
          suggestedOrder: Math.max(0, Math.ceil(minStock * 2 - currentStock)),
          urgency: currentStock === 0 ? 'high' : 'medium',
        });
      }
    }

      // Ordenar por urgencia
      return predictions.sort((a: any, b: any) => {
        const urgencyOrder = { high: 0, medium: 1, low: 2 };
        return urgencyOrder[a.urgency as keyof typeof urgencyOrder] - urgencyOrder[b.urgency as keyof typeof urgencyOrder];
      });
    } catch (error) {
      console.error('[PredictionService] Error predicting inventory demand:', error);
      return [];
    }
  }

  // ============================================
  // RESUMEN DE PREDICCIONES
  // ============================================

  /**
   * Obtiene un resumen de todas las predicciones
   */
  async getPredictionsSummary(partnerId: string): Promise<any> {
    // Intentar obtener del caché
    const cacheKey = `predictions:summary:${partnerId}`;
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      console.log('[PredictionService] Returning cached predictions summary');
      return cached;
    }

    console.log('[PredictionService] Calculating fresh predictions summary...');
    const [revenue, churn, maintenance, workload, inventory] = await Promise.all([
      this.predictRevenue(partnerId, 6),
      this.predictClientChurn(partnerId),
      this.predictMaintenance(partnerId),
      this.predictWorkload(partnerId, 4),
      this.predictInventoryDemand(partnerId),
    ]);

    // Calcular para los PRÓXIMOS 30 DÍAS (no mes calendario)
    const now = new Date();
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    // Filtrar mantenimientos de próximos 30 días
    const next30DaysMaintenance = maintenance.filter(m => {
      return m.predictedDate >= now && m.predictedDate <= next30Days;
    });

    // Calcular ingresos de próximos 30 días (promedio de los primeros meses)
    const avgMonthlyRevenue = revenue.length > 0 
      ? revenue.slice(0, 2).reduce((sum, r) => sum + r.value, 0) / Math.min(2, revenue.length)
      : 0;
    const next30DaysRevenue = avgMonthlyRevenue; // Aproximación para 30 días

    // Calcular carga de trabajo TOTAL de próximos 30 días (4 semanas)
    const totalWorkload = workload.reduce((sum, w) => sum + w.estimatedTotal, 0);

    const result = {
      revenue: {
        predictions: revenue,
        trend: revenue[0]?.trend || 'stable',
        nextMonthValue: next30DaysRevenue,
      },
      clientChurn: {
        atRiskCount: churn.length,
        highRiskCount: churn.filter(c => c.riskScore >= 70).length,
        topRiskClients: churn.slice(0, 5),
      },
      maintenance: {
        upcomingCount: maintenance.length,
        nextMonth: next30DaysMaintenance.length,
        predictions: maintenance.slice(0, 10),
      },
      workload: {
        predictions: workload,
        totalNext30Days: totalWorkload,
        busiestWeek: workload.length > 0 ? workload.reduce((max, w) => w.estimatedTotal > max.estimatedTotal ? w : max, workload[0]) : null,
      },
      inventory: {
        urgentItems: inventory.filter(i => i.urgency === 'high').length,
        predictions: inventory.slice(0, 10),
      },
      generatedAt: new Date(),
    };

    // Guardar en caché por 5 minutos
    await cacheService.set(cacheKey, result, 300);
    console.log('[PredictionService] Predictions summary cached for 5 minutes');

    return result;
  }
}

export default PredictionService;
