/**
 * StabilityHistogram — Histograma d'estabilitat per nota
 * 
 * Guarda les últimes 10 lectures de desviació per nota i mostra
 * un mini-histograma que indica si la corda és estable o fluctua.
 * Útil per verificar que l'afinació s'ha assentat.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';

interface StabilityHistogramProps {
  /** Historial de lectures (últimes 10 desviacions en cents) */
  readings: number[];
  /** Rang del medidor en cents */
  meterRange: number;
  /** Si l'afinador està actiu */
  isActive: boolean;
  /** Mode fosc d'afinació */
  darkTuningMode?: boolean;
}

export function StabilityHistogram({ readings, meterRange, isActive, darkTuningMode }: StabilityHistogramProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');

  const fgText = darkTuningMode ? '#ffffff' : textColor;
  const fgMuted = darkTuningMode ? '#888888' : textSecondary;
  const bgSurface = darkTuningMode ? '#1a1a1a' : surface;
  const bgBorder = darkTuningMode ? '#333333' : border;

  const stats = useMemo(() => {
    if (readings.length === 0) return null;
    const mean = readings.reduce((a, b) => a + b, 0) / readings.length;
    const variance = readings.reduce((a, b) => a + (b - mean) ** 2, 0) / readings.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...readings);
    const max = Math.max(...readings);
    const range = max - min;
    
    // Classificació d'estabilitat
    let stability: 'excellent' | 'good' | 'fair' | 'unstable';
    let stabilityLabel: string;
    let stabilityColor: string;
    
    if (stdDev <= 0.5 && range <= 2) {
      stability = 'excellent';
      stabilityLabel = 'Excel·lent';
      stabilityColor = '#22C55E';
    } else if (stdDev <= 1.5 && range <= 5) {
      stability = 'good';
      stabilityLabel = 'Bona';
      stabilityColor = '#4ADE80';
    } else if (stdDev <= 3 && range <= 10) {
      stability = 'fair';
      stabilityLabel = 'Acceptable';
      stabilityColor = '#F59E0B';
    } else {
      stability = 'unstable';
      stabilityLabel = 'Inestable';
      stabilityColor = '#EF4444';
    }
    
    return { mean, stdDev, min, max, range, stability, stabilityLabel, stabilityColor };
  }, [readings]);

  const SVG_WIDTH = 280;
  const SVG_HEIGHT = 80;
  const BAR_WIDTH = 22;
  const BAR_GAP = 4;
  const MARGIN_LEFT = 10;
  const MARGIN_TOP = 5;
  const CHART_HEIGHT = 60;

  const maxAbsCents = Math.max(meterRange * 0.6, 10);

  return (
    <View style={[styles.container, { backgroundColor: bgSurface, borderColor: bgBorder }]}>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: fgText }]}>
          Estabilitat
        </ThemedText>
        {stats && (
          <View style={[styles.badge, { backgroundColor: stats.stabilityColor + '20', borderColor: stats.stabilityColor }]}>
            <ThemedText style={[styles.badgeText, { color: stats.stabilityColor }]}>
              {stats.stabilityLabel}
            </ThemedText>
          </View>
        )}
      </View>

      {readings.length === 0 ? (
        <ThemedText style={[styles.emptyText, { color: fgMuted }]}>
          Esperant lectures...
        </ThemedText>
      ) : (
        <>
          <Svg width={SVG_WIDTH} height={SVG_HEIGHT} viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}>
            {/* Línia central (0 cents) */}
            <Line
              x1={MARGIN_LEFT}
              y1={MARGIN_TOP + CHART_HEIGHT / 2}
              x2={SVG_WIDTH - 10}
              y2={MARGIN_TOP + CHART_HEIGHT / 2}
              stroke={bgBorder}
              strokeWidth={1}
              strokeDasharray="4,3"
            />
            
            {/* Zona de tolerància (±2 cents) */}
            <Rect
              x={MARGIN_LEFT}
              y={MARGIN_TOP + CHART_HEIGHT / 2 - (2 / maxAbsCents) * (CHART_HEIGHT / 2)}
              width={SVG_WIDTH - 20}
              height={(4 / maxAbsCents) * (CHART_HEIGHT / 2)}
              fill="#22C55E"
              opacity={0.1}
            />
            
            {/* Barres de l'histograma */}
            {readings.map((cents, i) => {
              const clampedCents = Math.max(-maxAbsCents, Math.min(maxAbsCents, cents));
              const barHeight = Math.abs(clampedCents / maxAbsCents) * (CHART_HEIGHT / 2);
              const isPositive = clampedCents >= 0;
              const centerY = MARGIN_TOP + CHART_HEIGHT / 2;
              
              const absCents = Math.abs(cents);
              const barColor = absCents <= 2 ? '#22C55E'
                : absCents <= 5 ? '#4ADE80'
                : absCents <= 10 ? '#F59E0B'
                : '#EF4444';
              
              const x = MARGIN_LEFT + i * (BAR_WIDTH + BAR_GAP);
              const y = isPositive ? centerY - barHeight : centerY;
              
              return (
                <Rect
                  key={i}
                  x={x}
                  y={y}
                  width={BAR_WIDTH}
                  height={Math.max(barHeight, 1)}
                  fill={barColor}
                  rx={2}
                  opacity={0.8 + (i / readings.length) * 0.2}
                />
              );
            })}
            
            {/* Etiquetes */}
            <SvgText x={SVG_WIDTH - 8} y={MARGIN_TOP + 8} fontSize={8} fill={fgMuted} textAnchor="end">
              +{maxAbsCents.toFixed(0)}¢
            </SvgText>
            <SvgText x={SVG_WIDTH - 8} y={MARGIN_TOP + CHART_HEIGHT - 2} fontSize={8} fill={fgMuted} textAnchor="end">
              -{maxAbsCents.toFixed(0)}¢
            </SvgText>
          </Svg>

          {/* Estadístiques */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statLabel, { color: fgMuted }]}>Mitjana</ThemedText>
              <ThemedText style={[styles.statValue, { color: fgText }]}>
                {stats ? `${stats.mean > 0 ? '+' : ''}${stats.mean.toFixed(1)}¢` : '—'}
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statLabel, { color: fgMuted }]}>Desv. Est.</ThemedText>
              <ThemedText style={[styles.statValue, { color: fgText }]}>
                {stats ? `±${stats.stdDev.toFixed(1)}¢` : '—'}
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statLabel, { color: fgMuted }]}>Rang</ThemedText>
              <ThemedText style={[styles.statValue, { color: fgText }]}>
                {stats ? `${stats.range.toFixed(1)}¢` : '—'}
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statLabel, { color: fgMuted }]}>Lectures</ThemedText>
              <ThemedText style={[styles.statValue, { color: fgText }]}>
                {readings.length}/10
              </ThemedText>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 14,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: 'Montserrat',
    lineHeight: 16,
    textAlign: 'center',
    paddingVertical: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e020',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 16,
    marginTop: 2,
  },
});
