/**
 * Dashboard de Analytics - Diseño Elegante y Sofisticado
 * Piano Emotion Manager
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import {
  useDashboardMetrics,
  useRevenueChart,
  useServicesByType,
  useReportExport,
  type PeriodPreset,
  type DateRange,
} from '@/hooks/reports';
import { useTranslation } from '@/hooks/use-translation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH > 768 ? (SCREEN_WIDTH - 64) / 4 : (SCREEN_WIDTH - 48) / 2;

// Paleta de colores elegante
const COLORS = {
  primary: '#1e3a8a',      // Azul profundo
  secondary: '#3b82f6',    // Azul brillante
  accent: '#60a5fa',       // Azul claro
  success: '#10b981',      // Verde esmeralda
  warning: '#f59e0b',      // Ámbar
  danger: '#ef4444',       // Rojo
  purple: '#8b5cf6',       // Púrpura
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
};

// ============================================================================
// Types
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface PeriodSelectorProps {
  selected: PeriodPreset;
  onSelect: (preset: PeriodPreset) => void;
}

// ============================================================================
// Metric Card Component - Elegante
// ============================================================================

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  color,
}) => {
  const isPositive = change !== undefined && change >= 0;

  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIconContainer, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        {change !== undefined && (
          <View style={[styles.changeBadge, { 
            backgroundColor: isPositive ? '#ecfdf5' : '#fef2f2' 
          }]}>
            <Ionicons
              name={isPositive ? 'arrow-up' : 'arrow-down'}
              size={10}
              color={isPositive ? COLORS.success : COLORS.danger}
            />
            <Text style={[styles.changeText, { 
              color: isPositive ? COLORS.success : COLORS.danger 
            }]}>
              {Math.abs(change).toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
  );
};

// ============================================================================
// Period Selector Component
// ============================================================================

const PeriodSelector: React.FC<PeriodSelectorProps> = ({ selected, onSelect }) => {
  const { t } = useTranslation();

  const periods: { key: PeriodPreset; label: string }[] = [
    { key: 'thisWeek', label: t('reports.thisWeek') },
    { key: 'thisMonth', label: t('reports.thisMonth') },
    { key: 'thisQuarter', label: t('reports.thisQuarter') },
    { key: 'thisYear', label: t('reports.thisYear') },
  ];

  return (
    <View style={styles.periodSelector}>
      {periods.map((period) => (
        <TouchableOpacity
          key={period.key}
          style={[
            styles.periodButton,
            selected === period.key && styles.periodButtonActive,
          ]}
          onPress={() => onSelect(period.key)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.periodButtonText,
              selected === period.key && styles.periodButtonTextActive,
            ]}
          >
            {period.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ============================================================================
// Line Chart Component - Elegante
// ============================================================================

interface LineChartProps {
  data: { label: string; value: number }[];
  color?: string;
}

const LineChart: React.FC<LineChartProps> = ({ data, color = COLORS.secondary }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Ionicons name="trending-up-outline" size={48} color={COLORS.gray[300]} />
        <Text style={styles.emptyChartText}>No hay datos disponibles</Text>
      </View>
    );
  }

  const displayData = data.slice(-12); // Últimos 12 períodos
  const maxValue = Math.max(...displayData.map(d => d.value), 1);
  const minValue = Math.min(...displayData.map(d => d.value), 0);
  const range = maxValue - minValue || 1;

  const chartWidth = SCREEN_WIDTH - 80;
  const chartHeight = 180;
  const padding = 20;
  const plotWidth = chartWidth - padding * 2;
  const plotHeight = chartHeight - padding * 2;

  // Calcular puntos del gráfico
  const points = displayData.map((item, index) => {
    const x = padding + (index / (displayData.length - 1)) * plotWidth;
    const y = padding + plotHeight - ((item.value - minValue) / range) * plotHeight;
    return { x, y, value: item.value };
  });

  // Crear path suave (curva de Bézier)
  const createSmoothPath = () => {
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const controlX = (current.x + next.x) / 2;
      
      path += ` Q ${controlX} ${current.y}, ${controlX} ${(current.y + next.y) / 2}`;
      path += ` Q ${controlX} ${next.y}, ${next.x} ${next.y}`;
    }
    
    return path;
  };

  // Crear área bajo la curva
  const createAreaPath = () => {
    const linePath = createSmoothPath();
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    return `${linePath} L ${lastPoint.x} ${chartHeight - padding} L ${firstPoint.x} ${chartHeight - padding} Z`;
  };

  return (
    <View style={styles.chartContainer}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Área bajo la curva con gradiente */}
        <LinearGradient
          id="areaGradient"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </LinearGradient>
        
        <Path
          d={createAreaPath()}
          fill="url(#areaGradient)"
        />
        
        {/* Línea principal */}
        <Path
          d={createSmoothPath()}
          stroke={color}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Puntos en la línea */}
        {points.map((point, index) => (
          <G key={index}>
            <Circle
              cx={point.x}
              cy={point.y}
              r={4}
              fill="#fff"
              stroke={color}
              strokeWidth={2}
            />
          </G>
        ))}
      </Svg>
      
      {/* Etiquetas del eje X */}
      <View style={styles.chartLabels}>
        {displayData.map((item, index) => {
          // Mostrar solo algunas etiquetas para evitar solapamiento
          const showLabel = displayData.length <= 6 || index % Math.ceil(displayData.length / 6) === 0;
          return showLabel ? (
            <Text key={index} style={styles.chartLabel} numberOfLines={1}>
              {item.label}
            </Text>
          ) : <View key={index} style={styles.chartLabel} />;
        })}
      </View>
    </View>
  );
};

// ============================================================================
// Donut Chart Component - Elegante
// ============================================================================

interface DonutChartProps {
  data: { label: string; value: number; percentage: number }[];
}

const DonutChart: React.FC<DonutChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Ionicons name="pie-chart-outline" size={48} color={COLORS.gray[300]} />
        <Text style={styles.emptyChartText}>No hay datos disponibles</Text>
      </View>
    );
  }

  const chartColors = [COLORS.secondary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.purple];
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  let currentAngle = -90; // Empezar desde arriba

  return (
    <View style={styles.donutContainer}>
      <View style={styles.donutChart}>
        <Svg width={size} height={size}>
          {data.slice(0, 5).map((item, index) => {
            const percentage = item.percentage;
            const angle = (percentage / 100) * 360;
            const color = chartColors[index % chartColors.length];
            
            // Calcular el arco
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;
            
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            
            const x1 = size / 2 + radius * Math.cos(startRad);
            const y1 = size / 2 + radius * Math.sin(startRad);
            const x2 = size / 2 + radius * Math.cos(endRad);
            const y2 = size / 2 + radius * Math.sin(endRad);
            
            const largeArc = angle > 180 ? 1 : 0;
            
            const pathData = [
              `M ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
            ].join(' ');
            
            return (
              <Path
                key={index}
                d={pathData}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
              />
            );
          })}
          
          {/* Centro blanco */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius - strokeWidth / 2}
            fill="#fff"
          />
        </Svg>
        
        {/* Total en el centro */}
        <View style={styles.donutCenter}>
          <Text style={styles.donutCenterValue}>{data.reduce((sum, d) => sum + d.value, 0)}</Text>
          <Text style={styles.donutCenterLabel}>Total</Text>
        </View>
      </View>
      
      {/* Leyenda */}
      <View style={styles.donutLegend}>
        {data.slice(0, 5).map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendDot, { 
              backgroundColor: chartColors[index % chartColors.length] 
            }]} />
            <View style={styles.legendText}>
              <Text style={styles.legendLabel}>{item.label}</Text>
              <Text style={styles.legendValue}>
                {item.value} ({item.percentage.toFixed(1)}%)
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ============================================================================
// Main Dashboard Component
// ============================================================================

interface AnalyticsDashboardProps {
  onNavigateToReports?: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  onNavigateToReports,
}) => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

  const {
    metrics,
    isLoading,
    refetch,
    dateRange,
    preset,
    changePeriod,
  } = useDashboardMetrics('thisMonth');

  const { data: revenueData } = useRevenueChart(dateRange, 'month');
  const { data: servicesData } = useServicesByType(dateRange);
  const { downloadPDF, isExporting } = useReportExport();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Panel de Control</Text>
          <Text style={styles.headerSubtitle}>Resumen de rendimiento del negocio</Text>
        </View>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => downloadPDF('executive', dateRange)}
          disabled={isExporting}
          activeOpacity={0.8}
        >
          <Ionicons name="download-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <PeriodSelector selected={preset} onSelect={changePeriod} />

      {/* Main Metrics Grid */}
      <View style={styles.metricsGrid}>
        <MetricCard
          title={t('reports.revenue')}
          value={formatCurrency(metrics?.revenue.total || 0)}
          change={metrics?.revenue.changePercent}
          icon="cash-outline"
          color={COLORS.secondary}
        />
        <MetricCard
          title={t('reports.services')}
          value={metrics?.services.total || 0}
          icon="construct-outline"
          color={COLORS.success}
        />
        <MetricCard
          title={t('reports.clients')}
          value={metrics?.clients.total || 0}
          change={metrics?.clients.new ? (metrics.clients.new / metrics.clients.total) * 100 : 0}
          icon="people-outline"
          color={COLORS.purple}
        />
        <MetricCard
          title={t('reports.avgTicket')}
          value={formatCurrency(metrics?.averages.ticketValue || 0)}
          icon="receipt-outline"
          color={COLORS.warning}
        />
      </View>

      {/* Revenue Evolution Chart */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{t('reports.revenueEvolution')}</Text>
            <Text style={styles.sectionSubtitle}>Últimos 12 meses</Text>
          </View>
        </View>
        <View style={styles.chartCard}>
          <LineChart
            data={revenueData?.map((d) => ({ label: d.period, value: d.revenue })) || []}
            color={COLORS.secondary}
          />
        </View>
      </View>

      {/* Services by Type */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{t('reports.servicesByType')}</Text>
            <Text style={styles.sectionSubtitle}>Distribución de servicios realizados</Text>
          </View>
        </View>
        <View style={styles.chartCard}>
          {servicesData && servicesData.length > 0 ? (
            <DonutChart
              data={servicesData.map(s => ({
                label: s.typeName,
                value: s.count,
                percentage: s.percentage,
              }))}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons name="pie-chart-outline" size={48} color={COLORS.gray[300]} />
              <Text style={styles.emptyChartText}>No hay datos de servicios</Text>
            </View>
          )}
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{t('reports.quickStats')}</Text>
            <Text style={styles.sectionSubtitle}>Indicadores clave de rendimiento</Text>
          </View>
        </View>
        <View style={styles.quickStatsGrid}>
          <View style={styles.quickStatCard}>
            <View style={[styles.quickStatIcon, { backgroundColor: COLORS.secondary + '15' }]}>
              <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.secondary} />
            </View>
            <Text style={styles.quickStatValue}>
              {metrics?.services.completionRate.toFixed(0)}%
            </Text>
            <Text style={styles.quickStatLabel}>Tasa de finalización</Text>
            <Text style={styles.quickStatDescription}>
              Servicios completados exitosamente
            </Text>
          </View>
          <View style={styles.quickStatCard}>
            <View style={[styles.quickStatIcon, { backgroundColor: COLORS.success + '15' }]}>
              <Ionicons name="repeat-outline" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.quickStatValue}>
              {metrics?.clients.retention.toFixed(0)}%
            </Text>
            <Text style={styles.quickStatLabel}>Retención de clientes</Text>
            <Text style={styles.quickStatDescription}>
              Clientes que repiten servicios
            </Text>
          </View>
          <View style={styles.quickStatCard}>
            <View style={[styles.quickStatIcon, { backgroundColor: COLORS.warning + '15' }]}>
              <Ionicons name="musical-notes-outline" size={24} color={COLORS.warning} />
            </View>
            <Text style={styles.quickStatValue}>
              {metrics?.pianos.total || 0}
            </Text>
            <Text style={styles.quickStatLabel}>Pianos registrados</Text>
            <Text style={styles.quickStatDescription}>
              Total de pianos en la base de datos
            </Text>
          </View>
        </View>
      </View>

      {/* View All Reports Button */}
      {onNavigateToReports && (
        <TouchableOpacity 
          style={styles.viewAllButton} 
          onPress={onNavigateToReports}
          activeOpacity={0.8}
        >
          <Text style={styles.viewAllButtonText}>{t('reports.viewAllReports')}</Text>
          <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

// ============================================================================
// Styles - Diseño Elegante y Sofisticado
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.gray[900],
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodButtonText: {
    color: COLORS.gray[600],
    fontWeight: '600',
    fontSize: 13,
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 8,
  },
  metricCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  metricIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  changeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.gray[900],
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  metricTitle: {
    fontSize: 13,
    color: COLORS.gray[500],
    fontWeight: '500',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.gray[900],
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
  },
  chartContainer: {
    alignItems: 'center',
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 20,
  },
  chartLabel: {
    fontSize: 10,
    color: COLORS.gray[400],
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  emptyChart: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartText: {
    color: COLORS.gray[400],
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
  donutContainer: {
    flexDirection: SCREEN_WIDTH > 600 ? 'row' : 'column',
    alignItems: 'center',
    gap: 24,
  },
  donutChart: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.gray[900],
  },
  donutCenterLabel: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  donutLegend: {
    flex: 1,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[700],
  },
  legendValue: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  quickStatsGrid: {
    flexDirection: SCREEN_WIDTH > 768 ? 'row' : 'column',
    gap: 12,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
  },
  quickStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickStatValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.gray[900],
    letterSpacing: -0.5,
  },
  quickStatLabel: {
    fontSize: 14,
    color: COLORS.gray[700],
    marginTop: 4,
    fontWeight: '600',
  },
  quickStatDescription: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: 4,
    lineHeight: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  viewAllButtonText: {
    color: COLORS.primary,
    fontWeight: '700',
    marginRight: 8,
    fontSize: 15,
  },
  bottomPadding: {
    height: 40,
  },
});

export default AnalyticsDashboard;
