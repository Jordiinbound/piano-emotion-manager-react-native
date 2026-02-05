/**
 * Dashboard de Analytics - Diseño Estructurado y Cohesivo v2
 * Piano Emotion Manager
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Line, Text as SvgText, Rect } from 'react-native-svg';
import {
  useDashboardData,
  useRevenueChart,
  useReportExport,
  type PeriodPreset,
} from '@/hooks/reports';
import { useTranslation } from '@/hooks/use-translation';

// Se eliminó la constante SCREEN_WIDTH - ahora se usa state reactivo

// Paleta de colores profesional (tonos matizados y suaves)
const COLORS = {
  primary: '#5b7fc7',      // Azul matizado (antes #2563eb)
  secondary: '#6b7a8f',    // Gris azulado suave (antes #64748b)
  success: '#52a67d',      // Verde suave (antes #10b981)
  warning: '#d9a05b',      // Naranja/dorado suave (antes #f59e0b)
  danger: '#d66b6b',       // Rojo suave (antes #ef4444)
  purple: '#9b7fc9',       // Púrpura suave (antes #8b5cf6)
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
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  cardWidth?: string;
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
  subtitle,
  icon,
  color,
  cardWidth,
}) => {
  const isPositive = change !== undefined && change >= 0;

  return (
    <View style={[styles.metricCard, cardWidth ? { width: cardWidth } : {}]}>
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
              size={16}
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
      <Text style={styles.metricTitle} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
      {subtitle && (
        <Text style={styles.metricSubtitle}>{subtitle}</Text>
      )}
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
            selected === period.key && { overflow: 'hidden' },
          ]}
          onPress={() => onSelect(period.key)}
          activeOpacity={0.7}
        >
          {selected === period.key ? (
            <LinearGradient
              colors={['#d66b4f', '#e07a5f', '#ed9178']} // Coral: oscuro izquierda → claro derecha
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.periodButtonGradient as any}
            >
              <Text style={[styles.periodButtonText, styles.periodButtonTextActive]}>
                {period.label}
              </Text>
            </LinearGradient>
          ) : (
            <Text style={styles.periodButtonText}>
              {period.label}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ============================================================================
// Bar Chart Component - Gráfico de barras verticales
// ============================================================================

interface BarChartProps {
  data: { label: string; value: number }[];
  color?: string;
}

const BarChart: React.FC<BarChartProps> = ({ data, color = COLORS.primary }) => {
  // State para ancho del contenedor (medido con onLayout)
  const [containerWidth, setContainerWidth] = useState(0);  // Iniciar en 0 para forzar medición
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  
  // Listener para cambios de dimensiones (rotación, resize)
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    
    // Cleanup: remover listener al desmontar
    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, []);
  
  // Usar ancho del contenedor medido con onLayout
  const chartWidth = containerWidth;

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Ionicons name="bar-chart-outline" size={40} color={COLORS.text.tertiary} />
        <Text style={styles.emptyChartText}>No hay datos disponibles</Text>
      </View>
    );
  }

  // Mostrar los últimos 12 meses o todos los datos disponibles
  const displayData = data.length > 12 ? data.slice(-12) : data;

  const maxValue = Math.max(...displayData.map(d => d.value), 1);
  const minValue = 0;
  const range = maxValue - minValue || 1;

  const chartHeight = 280;
  const padding = { top: 40, right: 10, bottom: 60, left: 50 };  // Aumentado left de 35 a 50 para etiquetas Y
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Calcular ancho de cada barra (50% del espacio disponible para más separación)
  const barWidthRatio = 0.5; // 50% del espacio para barras, 50% para spacing
  const totalBars = displayData.length;
  const availableWidthPerBar = plotWidth / totalBars;
  const barWidth = availableWidthPerBar * barWidthRatio;
  const barSpacing = availableWidthPerBar * (1 - barWidthRatio);

  // Formatear valor como moneda
  const formatValue = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k€`;
    }
    return `${Math.round(value)}€`;
  };

  // Calcular tamaño de fuente responsive basado en ancho de pantalla
  // Móvil: 8px, Tablet: 11px, Desktop: 12px
  const labelFontSize = screenWidth < 768 ? '8' : screenWidth < 1024 ? '11' : '12';

  // Líneas de grid horizontales
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const y = padding.top + plotHeight * (1 - ratio);
    const value = minValue + range * ratio;
    return { y, value };
  });

  return (
    <View 
      style={styles.chartContainer}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
      }}
    >
      {chartWidth > 0 && (
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
                fontSize={labelFontSize}  // Responsive
                fontWeight="600"
                textAnchor="end"
                fontFamily="System"
              >
                {formatValue(line.value)}
              </SvgText>
            </React.Fragment>
          ))}
          
          {/* Barras */}
          {displayData.map((item, index) => {
            const barHeight = ((item.value - minValue) / range) * plotHeight;
            // Centrar cada barra en su espacio asignado
            const x = padding.left + index * availableWidthPerBar + (availableWidthPerBar - barWidth) / 2;
            const y = padding.top + plotHeight - barHeight;
            
            return (
              <React.Fragment key={index}>
                {/* Barra */}
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={color}
                  rx={4}
                />
                
                {/* Valor encima de la barra (tamaño responsive) */}
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 8}
                  fill={COLORS.text.primary}
                  fontSize={labelFontSize}
                  fontWeight="700"
                  textAnchor="middle"
                  fontFamily="System"
                >
                  {formatValue(item.value)}
                </SvgText>
                
                {/* Etiqueta del mes */}
                <SvgText
                  x={x + barWidth / 2}
                  y={chartHeight - 20}
                  fill={COLORS.text.secondary}
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="middle"
                  fontFamily="System"
                  transform={`rotate(-45, ${x + barWidth / 2}, ${chartHeight - 20})`}
                >
                  {item.label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      )}
    </View>
  );
};

// ============================================================================
// Horizontal Bar Chart Component - Para servicios por tipo
// ============================================================================

interface HorizontalBarChartProps {
  data: { typeName: string; count: number }[];
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
  const totalServices = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <View style={styles.horizontalBarContainer}>
      {data.map((item, index) => {
        const percentageOfTotal = (item.count / totalServices) * 100;
        const barWidth = percentageOfTotal; // Usar el porcentaje directamente para que sume 100%
        const color = chartColors[index % chartColors.length];
        
        return (
          <View key={index} style={styles.barRow}>
            <View style={styles.barLabelContainer}>
              <View style={[styles.barDot, { backgroundColor: color }]} />
              <Text style={styles.barLabel}>{item.typeName}</Text>
            </View>
            <View style={styles.barTrack}>
              <View 
                style={[
                  styles.barFill, 
                  { 
                    width: `${barWidth}%`,
                    backgroundColor: color 
                  }
                ]} 
              />
            </View>
            <View style={styles.barValueContainer}>
              <Text style={styles.barValue}>{item.count}</Text>
              <Text style={styles.barPercentage}>({percentageOfTotal.toFixed(1)}%)</Text>
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
  const { width: windowWidth } = useWindowDimensions();

  // Calcular ancho de tarjetas dinámicamente: 2 columnas en móvil, 4 en tablet/desktop
  // Usar porcentajes para que funcione correctamente con flexbox y gap
  const isTabletOrDesktop = windowWidth >= 768;
  
  // Móvil: 2 columnas (48%), Desktop: 4 columnas (23.5%)
  // Los porcentajes dejan espacio para los gaps de 12px
  const cardWidth = isTabletOrDesktop ? '23.5%' : '48%';

  // Hook optimizado para métricas y servicios (período seleccionado)
  const {
    metrics,
    servicesByType: servicesData,
    isLoading,
    refetch,
    dateRange,
    preset,
    changePeriod,
  } = useDashboardData('thisMonth', 'month');

  // Gráfico de evolución SIEMPRE últimos 12 meses (independiente del selector)
  const now = new Date();
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(now.getMonth() - 12);
  const last12MonthsRange = {
    startDate: twelveMonthsAgo,
    endDate: now,
  };
  const { data: revenueData, isLoading: revenueLoading } = useRevenueChart(last12MonthsRange, 'month');
  
  // Debug: verificar datos
  console.log('Dashboard Data (optimizado):', {
    metrics,
    revenueData,
    servicesData,
    isLoading,
    revenueLoading,
  });
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

      {/* Unified Metrics Grid - 4x4 (8 métricas) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Métricas Principales</Text>
          <Text style={styles.sectionSubtitle}>Indicadores clave de rendimiento del período seleccionado</Text>
        </View>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando métricas...</Text>
          </View>
        ) : (
          <View style={styles.metricsGrid}>
            <MetricCard
              title={t('reports.revenue')}
              value={formatCurrency(metrics?.revenue.total || 0)}
              change={metrics?.revenue.changePercent}
              subtitle="vs período anterior"
              icon="cash-outline"
              color={COLORS.primary}
              cardWidth={cardWidth}
            />
            <MetricCard
              title={t('reports.services')}
              value={metrics?.services.total || 0}
              icon="construct-outline"
              color={COLORS.success}
              cardWidth={cardWidth}
            />
            <MetricCard
              title={t('reports.clients')}
              value={metrics?.clients.new || 0}
              change={metrics?.clients.changePercent}
              subtitle="Nuevos en el período vs período anterior"
              icon="people-outline"
              color={COLORS.purple}
              cardWidth={cardWidth}
            />
            <MetricCard
              title="Ticket medio"
              value={formatCurrency(metrics?.averages.ticketValue || 0)}
              subtitle="por servicio"
              icon="receipt-outline"
              color={COLORS.warning}
              cardWidth={cardWidth}
            />
            <MetricCard
              title={t('reports.completionRate')}
              value={`${(metrics?.services.completionRate || 0).toFixed(1)}%`}
              subtitle="Servicios completados"
              icon="checkmark-circle-outline"
              color={COLORS.success}
              cardWidth={cardWidth}
            />
            <MetricCard
              title={t('reports.retention')}
              value={`${(metrics?.clients.retention || 0).toFixed(1)}%`}
              subtitle="Clientes recurrentes"
              icon="repeat-outline"
              color={COLORS.primary}
              cardWidth={cardWidth}
            />
            <MetricCard
              title={t('reports.pianos')}
              value={metrics?.pianos.new || 0}
              subtitle="Nuevos en el período"
              icon="musical-notes-outline"
              color={COLORS.warning}
              cardWidth={cardWidth}
            />
            <MetricCard
              title="Ingresos medios"
              value={formatCurrency(metrics?.averages.revenuePerService || 0)}
              subtitle="por factura"
              icon="trending-up-outline"
              color={COLORS.purple}
              cardWidth={cardWidth}
            />
        </View>
        )}
      </View>

      {/* Revenue Evolution Chart */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('reports.revenueEvolution')}</Text>
          <Text style={styles.sectionSubtitle}>Últimos 12 meses</Text>
        </View>
        {revenueLoading ? (
          <View style={styles.chartCard}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Cargando gráfico...</Text>
            </View>
          </View>
        ) : (
          <View style={styles.chartCard}>
            <BarChart
              data={revenueData?.map((d) => ({ label: d.period, value: d.revenue })) || []}
              color={COLORS.primary}
            />
          </View>
        )}
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
    borderRadius: 4,
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
    borderRadius: 4,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonGradient: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
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
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    // width se pasa dinámicamente desde el componente padre
    backgroundColor: COLORS.card,
    borderRadius: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 0,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    minWidth: 0,
    overflow: 'hidden',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 2,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '50%',
  },
  changeText: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
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
    flexWrap: 'wrap', // Permitir múltiples líneas para texto completo
  },
  metricSubtitle: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    marginTop: 2,
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
    borderRadius: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartContainer: {
    width: '100%',
    alignItems: 'stretch',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 8,
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
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
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
    minWidth: (Dimensions.get('window').width - 60) / 2,
    backgroundColor: COLORS.card,
    borderRadius: 4,
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
    borderRadius: 4,
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
    borderRadius: 4,
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
