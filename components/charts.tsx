/**
 * Componentes de gráficos para Analíticas
 * Implementación simple usando React Native sin dependencias externas
 */

import React, { memo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// GRÁFICO DE BARRAS
// ============================================

interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartData[];
  height?: number;
  showValues?: boolean;
  formatValue?: (value: number) => string;
  title?: string;
}

export const BarChart = memo(function BarChart({
  data,
  height = 200,
  showValues = true,
  formatValue = (v) => v.toString(),
  title,
}: BarChartProps) {
  const accent = useThemeColor({}, 'accent');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'border');

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.min(40, (SCREEN_WIDTH - 80) / data.length - 8);

  return (
    <View style={styles.chartContainer}>
      {title && (
        <ThemedText type="defaultSemiBold" style={styles.chartTitle}>
          {title}
        </ThemedText>
      )}
      <View style={[styles.barChartWrapper, { height }]}>
        <View style={[styles.barChartArea, { borderBottomColor: borderColor }]}>
          {data.map((item, index) => {
            const barHeight = (item.value / maxValue) * (height - 40);
            return (
              <View key={index} style={styles.barColumn}>
                {showValues && item.value > 0 && (
                  <ThemedText style={[styles.barValue, { color: textSecondary }]}>
                    {formatValue(item.value)}
                  </ThemedText>
                )}
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(barHeight, 4),
                      width: barWidth,
                      backgroundColor: item.color || accent,
                    },
                  ]}
                />
                <ThemedText
                  style={[styles.barLabel, { color: textSecondary }]}
                  numberOfLines={1}
                >
                  {item.label}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
});

// ============================================
// GRÁFICO DE LÍNEAS
// ============================================

interface LineChartData {
  label: string;
  value: number;
}

interface LineChartProps {
  data: LineChartData[];
  height?: number;
  color?: string;
  showDots?: boolean;
  showArea?: boolean;
  formatValue?: (value: number) => string;
  title?: string;
}

export const LineChart = memo(function LineChart({
  data,
  height = 200,
  color,
  showDots = true,
  showArea = true,
  formatValue = (v) => v.toString(),
  title,
}: LineChartProps) {
  const accent = useThemeColor({}, 'accent');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'border');
  const lineColor = color || accent;

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const chartWidth = SCREEN_WIDTH - 64;
  const chartHeight = height - 50;
  const stepX = chartWidth / Math.max(data.length - 1, 1);

  // Calcular puntos
  const points = data.map((item, index) => ({
    x: index * stepX,
    y: chartHeight - (item.value / maxValue) * chartHeight,
    value: item.value,
    label: item.label,
  }));

  // Crear path para el área
  const areaPath = points.length > 0
    ? `M 0 ${chartHeight} ` +
      points.map(p => `L ${p.x} ${p.y}`).join(' ') +
      ` L ${points[points.length - 1]?.x || 0} ${chartHeight} Z`
    : '';

  // Crear path para la línea
  const linePath = points.length > 0
    ? `M ${points[0].x} ${points[0].y} ` +
      points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  return (
    <View style={styles.chartContainer}>
      {title && (
        <ThemedText type="defaultSemiBold" style={styles.chartTitle}>
          {title}
        </ThemedText>
      )}
      <View style={[styles.lineChartWrapper, { height }]}>
        <View style={[styles.lineChartArea, { height: chartHeight }]}>
          {/* Líneas de guía horizontales */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <View
              key={i}
              style={[
                styles.gridLine,
                {
                  top: ratio * chartHeight,
                  borderBottomColor: borderColor,
                },
              ]}
            />
          ))}

          {/* Área bajo la curva */}
          {showArea && points.length > 1 && (
            <View
              style={[
                styles.areaFill,
                { backgroundColor: `${lineColor}15`, height: chartHeight },
              ]}
            />
          )}

          {/* Barras simplificadas para representar la línea */}
          {points.map((point, index) => (
            <View
              key={index}
              style={[
                styles.linePoint,
                {
                  left: point.x - 3,
                  top: point.y - 3,
                },
              ]}
            >
              {showDots && (
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: lineColor },
                  ]}
                />
              )}
            </View>
          ))}

          {/* Conectores entre puntos */}
          {points.slice(0, -1).map((point, index) => {
            const nextPoint = points[index + 1];
            const dx = nextPoint.x - point.x;
            const dy = nextPoint.y - point.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            return (
              <View
                key={`line-${index}`}
                style={[
                  styles.lineSegment,
                  {
                    left: point.x,
                    top: point.y,
                    width: length,
                    backgroundColor: lineColor,
                    transform: [{ rotate: `${angle}deg` }],
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Etiquetas del eje X */}
        <View style={styles.xAxisLabels}>
          {data.map((item, index) => (
            <ThemedText
              key={index}
              style={[
                styles.xLabel,
                { color: textSecondary, width: stepX },
              ]}
              numberOfLines={1}
            >
              {item.label}
            </ThemedText>
          ))}
        </View>
      </View>
    </View>
  );
});

// ============================================
// GRÁFICO CIRCULAR (DONUT)
// ============================================

interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  size?: number;
  strokeWidth?: number;
  showLegend?: boolean;
  title?: string;
}

export const PieChart = memo(function PieChart({
  data,
  size = 160,
  strokeWidth = 24,
  showLegend = true,
  title,
}: PieChartProps) {
  const textSecondary = useThemeColor({}, 'textSecondary');
  const cardBg = useThemeColor({}, 'cardBackground');

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentAngle = -90; // Empezar desde arriba

  return (
    <View style={styles.chartContainer}>
      {title && (
        <ThemedText type="defaultSemiBold" style={styles.chartTitle}>
          {title}
        </ThemedText>
      )}
      <View style={styles.pieChartWrapper}>
        <View style={[styles.pieChart, { width: size, height: size }]}>
          {/* Fondo del círculo */}
          <View
            style={[
              styles.pieBackground,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: strokeWidth,
                borderColor: cardBg,
              },
            ]}
          />

          {/* Segmentos */}
          {data.map((item, index) => {
            const percentage = total > 0 ? item.value / total : 0;
            const angle = percentage * 360;
            const startAngle = currentAngle;
            currentAngle += angle;

            // Simplificación: usar View con bordes para simular segmentos
            return (
              <View
                key={index}
                style={[
                  styles.pieSegment,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth: strokeWidth,
                    borderColor: 'transparent',
                    borderTopColor: item.color,
                    borderRightColor: percentage > 0.25 ? item.color : 'transparent',
                    borderBottomColor: percentage > 0.5 ? item.color : 'transparent',
                    borderLeftColor: percentage > 0.75 ? item.color : 'transparent',
                    transform: [{ rotate: `${startAngle}deg` }],
                  },
                ]}
              />
            );
          })}

          {/* Centro del donut */}
          <View
            style={[
              styles.pieCenter,
              {
                width: size - strokeWidth * 2,
                height: size - strokeWidth * 2,
                borderRadius: (size - strokeWidth * 2) / 2,
                backgroundColor: cardBg,
              },
            ]}
          >
            <ThemedText type="title" style={styles.pieCenterText}>
              {total}
            </ThemedText>
            <ThemedText style={[styles.pieCenterLabel, { color: textSecondary }]}>
              Total
            </ThemedText>
          </View>
        </View>

        {/* Leyenda */}
        {showLegend && (
          <View style={styles.legend}>
            {data.map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <ThemedText style={[styles.legendLabel, { color: textSecondary }]}>
                  {item.label}
                </ThemedText>
                <ThemedText style={styles.legendValue}>
                  {item.value} ({total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%)
                </ThemedText>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
});

// ============================================
// TARJETA DE KPI
// ============================================

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: number; // Porcentaje de cambio
  trendLabel?: string;
  color?: string;
}

export const KPICard = memo(function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  color,
}: KPICardProps) {
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accent = useThemeColor({}, 'accent');
  const success = useThemeColor({}, 'success');
  const error = useThemeColor({}, 'error');

  const trendColor = trend !== undefined
    ? trend >= 0 ? success : error
    : textSecondary;

  return (
    <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.kpiHeader}>
        <ThemedText style={[styles.kpiTitle, { color: textSecondary }]}>
          {title}
        </ThemedText>
        {icon}
      </View>
      <ThemedText
        type="title"
        style={[styles.kpiValue, { color: color || accent }]}
      >
        {value}
      </ThemedText>
      {(subtitle || trend !== undefined) && (
        <View style={styles.kpiFooter}>
          {trend !== undefined && (
            <ThemedText style={[styles.kpiTrend, { color: trendColor }]}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
            </ThemedText>
          )}
          {subtitle && (
            <ThemedText style={[styles.kpiSubtitle, { color: textSecondary }]}>
              {trendLabel || subtitle}
            </ThemedText>
          )}
        </View>
      )}
    </View>
  );
});

// ============================================
// BARRA DE PROGRESO
// ============================================

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  color?: string;
  height?: number;
}

export const ProgressBar = memo(function ProgressBar({
  value,
  label,
  color,
  height = 8,
}: ProgressBarProps) {
  const accent = useThemeColor({}, 'accent');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');

  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <View style={styles.progressContainer}>
      {label && (
        <View style={styles.progressHeader}>
          <ThemedText style={[styles.progressLabel, { color: textSecondary }]}>
            {label}
          </ThemedText>
          <ThemedText style={[styles.progressValue, { color: textSecondary }]}>
            {clampedValue.toFixed(0)}%
          </ThemedText>
        </View>
      )}
      <View style={[styles.progressTrack, { height, backgroundColor: borderColor }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${clampedValue}%`,
              height,
              backgroundColor: color || accent,
            },
          ]}
        />
      </View>
    </View>
  );
});

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
  chartContainer: {
    marginBottom: Spacing.md,
  },
  chartTitle: {
    marginBottom: Spacing.sm,
  },

  // Bar Chart
  barChartWrapper: {
    width: '100%',
  },
  barChartArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    paddingBottom: Spacing.xs,
  },
  barColumn: {
    alignItems: 'center',
  },
  bar: {
    borderRadius: BorderRadius.sm,
  },
  barValue: {
    fontSize: 10,
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 4,
    maxWidth: 50,
    textAlign: 'center',
  },

  // Line Chart
  lineChartWrapper: {
    width: '100%',
  },
  lineChartArea: {
    position: 'relative',
    width: '100%',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },
  areaFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  linePoint: {
    position: 'absolute',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 4,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left center',
  },
  xAxisLabels: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
  xLabel: {
    fontSize: 10,
    textAlign: 'center',
  },

  // Pie Chart
  pieChartWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  pieChart: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieBackground: {
    position: 'absolute',
  },
  pieSegment: {
    position: 'absolute',
  },
  pieCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenterText: {
    fontSize: 24,
  },
  pieCenterLabel: {
    fontSize: 12,
  },
  legend: {
    gap: Spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    flex: 1,
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '600',
  },

  // KPI Card
  kpiCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minWidth: 140,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  kpiTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  kpiFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  kpiTrend: {
    fontSize: 12,
    fontWeight: '600',
  },
  kpiSubtitle: {
    fontSize: 12,
  },

  // Progress Bar
  progressContainer: {
    marginBottom: Spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    fontSize: 12,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: BorderRadius.full,
  },
});
