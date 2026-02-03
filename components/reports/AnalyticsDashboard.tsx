/**
 * Dashboard de Analytics - Diseño Estructurado y Cohesivo
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
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
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
// Line Chart Component - Con 12 meses completos
// ============================================================================

interface LineChartProps {
  data: { label: string; value: number }[];
  color?: string;
}

const LineChart: React.FC<LineChartProps> = ({ data, color = COLORS.primary }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Ionicons name="trending-up-outline" size={40} color={COLORS.text.tertiary} />
        <Text style={styles.emptyChartText}>No hay datos disponibles</Text>
      </View>
    );
  }

  // Asegurar que mostramos los últimos 12 meses
  const displayData = data.slice(-12);
  const maxValue = Math.max(...displayData.map(d => d.value), 1);
  const minValue = 0; // Empezar desde 0 para mejor visualización
  const range = maxValue - minValue || 1;

  const chartWidth = SCREEN_WIDTH - 48; // Padding de 24px a cada lado
  const chartHeight = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
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

  // Líneas de grid horizontales
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const y = padding.top + plotHeight * (1 - ratio);
    const value = minValue + range * ratio;
    return { y, value };
  });

  return (
    <View style={styles.chartContainer}>
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
              fill={COLORS.text.tertiary}
              fontSize="10"
              textAnchor="end"
            >
              {Math.round(line.value)}
            </SvgText>
          </React.Fragment>
        ))}
        
        {/* Línea principal */}
        <Path
          d={createLinePath()}
          stroke={color}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Puntos en la línea */}
        {points.map((point, index) => (
          <Circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={3}
            fill={COLORS.card}
            stroke={color}
            strokeWidth={2}
          />
        ))}

        {/* Etiquetas del eje X */}
        {points.map((point, index) => {
          // Mostrar etiquetas alternadas para evitar solapamiento
          const showLabel = displayData.length <= 6 || index % 2 === 0;
          return showLabel ? (
            <SvgText
              key={`label-${index}`}
              x={point.x}
              y={chartHeight - 10}
              fill={COLORS.text.tertiary}
              fontSize="10"
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
// Donut Chart Component
// ============================================================================

interface DonutChartProps {
  data: { label: string; value: number; percentage: number }[];
}

const DonutChart: React.FC<DonutChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Ionicons name="pie-chart-outline" size={40} color={COLORS.text.tertiary} />
        <Text style={styles.emptyChartText}>No hay datos disponibles</Text>
      </View>
    );
  }

  const chartColors = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.purple];
  const size = 140;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  let currentAngle = -90;

  return (
    <View style={styles.donutContainer}>
      <View style={styles.donutChart}>
        <Svg width={size} height={size}>
          {data.slice(0, 5).map((item, index) => {
            const percentage = item.percentage;
            const angle = (percentage / 100) * 360;
            const color = chartColors[index % chartColors.length];
            
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
          
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius - strokeWidth / 2}
            fill={COLORS.card}
          />
          
          <SvgText
            x={size / 2}
            y={size / 2 - 8}
            fill={COLORS.text.primary}
            fontSize="24"
            fontWeight="700"
            textAnchor="middle"
          >
            {data.reduce((sum, item) => sum + item.value, 0)}
          </SvgText>
          <SvgText
            x={size / 2}
            y={size / 2 + 12}
            fill={COLORS.text.secondary}
            fontSize="12"
            textAnchor="middle"
          >
            Total
          </SvgText>
        </Svg>
      </View>
      
      <View style={styles.donutLegend}>
        {data.slice(0, 5).map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: chartColors[index % chartColors.length] }]} />
            <View style={styles.legendTextContainer}>
              <Text style={styles.legendLabel}>{item.label}</Text>
              <Text style={styles.legendValue}>{item.value} ({item.percentage.toFixed(1)}%)</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ============================================================================
// Quick Stats Component
// ============================================================================

interface QuickStatProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const QuickStat: React.FC<QuickStatProps> = ({ title, value, subtitle, icon, color }) => {
  return (
    <View style={styles.quickStat}>
      <View style={[styles.quickStatIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.quickStatContent}>
        <Text style={styles.quickStatValue}>{value}</Text>
        <Text style={styles.quickStatTitle}>{title}</Text>
        <Text style={styles.quickStatSubtitle}>{subtitle}</Text>
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

      {/* Services by Type */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('reports.servicesByType')}</Text>
          <Text style={styles.sectionSubtitle}>Distribución de servicios realizados</Text>
        </View>
        <View style={styles.chartCard}>
          <DonutChart data={servicesData || []} />
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('reports.quickStats')}</Text>
          <Text style={styles.sectionSubtitle}>Indicadores clave de rendimiento</Text>
        </View>
        <View style={styles.quickStatsGrid}>
          <QuickStat
            title={t('reports.completionRate')}
            value={`${metrics?.services.completionRate || 0}%`}
            subtitle="Servicios completados exitosamente"
            icon="checkmark-circle-outline"
            color={COLORS.success}
          />
          <QuickStat
            title={t('reports.retention')}
            value={`${metrics?.clients.retention || 0}%`}
            subtitle="Clientes que repiten servicios"
            icon="repeat-outline"
            color={COLORS.primary}
          />
          <QuickStat
            title={t('reports.pianos')}
            value={metrics?.pianos.total || 0}
            subtitle="Total de pianos en la base de datos"
            icon="musical-notes-outline"
            color={COLORS.warning}
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
    gap: 12,
  },
  emptyChartText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
  },
  donutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  donutChart: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutLegend: {
    flex: 1,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  legendValue: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  quickStatsGrid: {
    gap: 12,
  },
  quickStat: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    alignItems: 'center',
  },
  quickStatIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickStatContent: {
    flex: 1,
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  quickStatTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  quickStatSubtitle: {
    fontSize: 12,
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
