/**
 * Dashboard de Analytics - Diseño Estructurado y Cohesivo v2
 * Piano Emotion Manager
 */

import React, { useState, useCallback } from 'react';
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
import Svg, { Path, Circle, Line, Text as SvgText, Rect } from 'react-native-svg';
import {
  useDashboardMetrics,
  useRevenueChart,
  useServicesByType,
  useReportExport,
  type PeriodPreset,
} from '@/hooks/reports';
import { useTranslation } from '@/hooks/use-translation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Paleta de colores profesional
const COLORS = {
  primary: '#2563eb',
  secondary: '#64748b',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  background: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: {
    primary: '#0f172a',
    secondary: '#64748b',
    tertiary: '#94a3b8',
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
// Metric Card Component
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
        <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        {change !== undefined && (
          <View style={[styles.changeBadge, { 
            backgroundColor: isPositive ? '#ecfdf5' : '#fef2f2' 
          }]}>
            <Ionicons
              name={isPositive ? 'trending-up' : 'trending-down'}
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
// Line Chart Component - Mejorado con fuentes legibles
// ============================================================================

interface LineChartProps {
  data: { label: string; value: number }[];
  color?: string;
}

const LineChart: React.FC<LineChartProps> = ({ data, color = COLORS.primary }) => {
  const [chartWidth, setChartWidth] = React.useState(SCREEN_WIDTH - 48);

  const handleLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    setChartWidth(width);
  };

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Ionicons name="trending-up-outline" size={40} color={COLORS.text.tertiary} />
        <Text style={styles.emptyChartText}>No hay datos disponibles</Text>
      </View>
    );
  }

  // Mostrar los últimos 12 meses o todos los datos disponibles
  const displayData = data.length > 12 ? data.slice(-12) : data;
  
  // Si hay muy pocos datos, mostrar mensaje
  if (displayData.length < 2) {
    return (
      <View style={styles.emptyChart}>
        <Ionicons name="information-circle-outline" size={40} color={COLORS.text.tertiary} />
        <Text style={styles.emptyChartText}>Datos insuficientes para mostrar gráfico</Text>
        <Text style={styles.emptyChartSubtext}>Se necesitan al menos 2 períodos</Text>
      </View>
    );
  }

  const maxValue = Math.max(...displayData.map(d => d.value), 1);
  const minValue = 0;
  const range = maxValue - minValue || 1;

  const chartHeight = 220;
  const padding = { top: 30, right: 20, bottom: 50, left: 60 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Calcular puntos del gráfico
  const points = displayData.map((item, index) => {
    const x = padding.left + (index / Math.max(displayData.length - 1, 1)) * plotWidth;
    const y = padding.top + plotHeight - ((item.value - minValue) / range) * plotHeight;
    return { x, y, value: item.value, label: item.label };
  });

  // Crear path de línea
  const createLinePath = () => {
    if (points.length === 0) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  // Formatear valor como moneda
  const formatValue = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k €`;
    }
    return `${Math.round(value)} €`;
  };

  // Líneas de grid horizontales
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const y = padding.top + plotHeight * (1 - ratio);
    const value = minValue + range * ratio;
    return { y, value };
  });

  return (
    <View style={styles.chartContainer} onLayout={handleLayout}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Grid lines */}
        {gridLines.map((line, index) => (
          <React.Fragment key={index}>
            <Line
              x1={padding.left}
              y1={line.y}
              x2={chartWidth - padding.right}
              y2={line.y}
              stroke={COLORS.border}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            <SvgText
              x={padding.left - 8}
              y={line.y + 4}
              fill={COLORS.text.secondary}
              fontSize="12"
              fontWeight="500"
              textAnchor="end"
            >
              {formatValue(line.value)}
            </SvgText>
          </React.Fragment>
        ))}
        
        {/* Línea principal */}
        <Path
          d={createLinePath()}
          stroke={color}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Puntos en la línea con valores */}
        {points.map((point, index) => (
          <React.Fragment key={index}>
            <Circle
              cx={point.x}
              cy={point.y}
              r={4}
              fill={COLORS.card}
              stroke={color}
              strokeWidth={2}
            />
            {/* Mostrar valor encima del punto */}
            <SvgText
              x={point.x}
              y={point.y - 12}
              fill={COLORS.text.primary}
              fontSize="11"
              fontWeight="600"
              textAnchor="middle"
            >
              {formatValue(point.value)}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Etiquetas del eje X */}
        {points.map((point, index) => {
          // Mostrar todas las etiquetas si hay 6 o menos, sino alternadas
          const showLabel = displayData.length <= 6 || index % 2 === 0;
          return showLabel ? (
            <SvgText
              key={`label-${index}`}
              x={point.x}
              y={chartHeight - 15}
              fill={COLORS.text.secondary}
              fontSize="11"
              fontWeight="500"
              textAnchor="middle"
            >
              {point.label}
            </SvgText>
          ) : null;
        })}
      </Svg>
    </View>
  );
};

// ============================================================================
// Horizontal Bar Chart Component - Para servicios por tipo
// ============================================================================

interface HorizontalBarChartProps {
  data: { label: string; value: number; percentage: number }[];
}

const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Ionicons name="bar-chart-outline" size={40} color={COLORS.text.tertiary} />
        <Text style={styles.emptyChartText}>No hay datos disponibles</Text>
      </View>
    );
  }

  const chartColors = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.purple];
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <View style={styles.horizontalBarContainer}>
      {data.slice(0, 5).map((item, index) => {
        const percentage = (item.value / maxValue) * 100;
        const color = chartColors[index % chartColors.length];
        
        return (
          <View key={index} style={styles.barRow}>
            <View style={styles.barLabelContainer}>
              <View style={[styles.barDot, { backgroundColor: color }]} />
              <Text style={styles.barLabel}>{item.label}</Text>
            </View>
            <View style={styles.barTrack}>
              <View 
                style={[
                  styles.barFill, 
                  { 
                    width: `${percentage}%`,
                    backgroundColor: color 
                  }
                ]} 
              />
            </View>
            <View style={styles.barValueContainer}>
              <Text style={styles.barValue}>{item.value}</Text>
              <Text style={styles.barPercentage}>({item.percentage.toFixed(1)}%)</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// ============================================================================
// Quick Stat Card Component
// ============================================================================

interface QuickStatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const QuickStatCard: React.FC<QuickStatCardProps> = ({ title, value, subtitle, icon, color }) => {
  return (
    <View style={styles.quickStatCard}>
      <View style={styles.quickStatHeader}>
        <View style={[styles.quickStatIcon, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
      </View>
      <Text style={styles.quickStatValue}>{value}</Text>
      <Text style={styles.quickStatTitle}>{title}</Text>
      <Text style={styles.quickStatSubtitle}>{subtitle}</Text>
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

      {/* Main Metrics Grid - 2x2 */}
      <View style={styles.metricsGrid}>
        <MetricCard
          title={t('reports.revenue')}
          value={formatCurrency(metrics?.revenue.total || 0)}
          change={metrics?.revenue.changePercent}
          icon="cash-outline"
          color={COLORS.primary}
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
          <Text style={styles.sectionTitle}>{t('reports.revenueEvolution')}</Text>
          <Text style={styles.sectionSubtitle}>Últimos 12 meses</Text>
        </View>
        <View style={styles.chartCard}>
          <LineChart
            data={revenueData?.map((d) => ({ label: d.period, value: d.revenue })) || []}
            color={COLORS.primary}
          />
        </View>
      </View>

      {/* Services by Type - Barras horizontales */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('reports.servicesByType')}</Text>
          <Text style={styles.sectionSubtitle}>Distribución de servicios realizados</Text>
        </View>
        <View style={styles.chartCard}>
          <HorizontalBarChart data={servicesData || []} />
        </View>
      </View>

      {/* Quick Stats - Grid 2x2 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('reports.quickStats')}</Text>
          <Text style={styles.sectionSubtitle}>Indicadores clave de rendimiento</Text>
        </View>
        <View style={styles.quickStatsGrid}>
          <QuickStatCard
            title={t('reports.completionRate')}
            value={`${(metrics?.services.completionRate || 0).toFixed(1)}%`}
            subtitle="Servicios completados"
            icon="checkmark-circle-outline"
            color={COLORS.success}
          />
          <QuickStatCard
            title={t('reports.retention')}
            value={`${(metrics?.clients.retention || 0).toFixed(1)}%`}
            subtitle="Clientes recurrentes"
            icon="repeat-outline"
            color={COLORS.primary}
          />
          <QuickStatCard
            title={t('reports.pianos')}
            value={metrics?.pianos.total || 0}
            subtitle="Pianos registrados"
            icon="musical-notes-outline"
            color={COLORS.warning}
          />
          <QuickStatCard
            title="Ingresos medios"
            value={formatCurrency(metrics?.revenue.total ? metrics.revenue.total / Math.max(metrics.services.total, 1) : 0)}
            subtitle="Por servicio"
            icon="trending-up-outline"
            color={COLORS.purple}
          />
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
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  periodButtonTextActive: {
    color: COLORS.card,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 60) / 2,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 2,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartContainer: {
    width: '100%',
    alignItems: 'center',
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyChartText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  emptyChartSubtext: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  horizontalBarContainer: {
    gap: 16,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
    gap: 8,
  },
  barDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
  },
  barTrack: {
    flex: 1,
    height: 28,
    backgroundColor: COLORS.background,
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  barValueContainer: {
    width: 80,
    alignItems: 'flex-end',
  },
  barValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  barPercentage: {
    fontSize: 11,
    color: COLORS.text.secondary,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickStatCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 60) / 2,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickStatHeader: {
    marginBottom: 12,
  },
  quickStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  quickStatTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  quickStatSubtitle: {
    fontSize: 11,
    color: COLORS.text.secondary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    gap: 8,
  },
  viewAllButtonText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  bottomPadding: {
    height: 40,
  },
});

export default AnalyticsDashboard;
