/**
 * VUMeter — Indicador de nivel de señal del micrófono
 * 
 * Muestra visualmente si el nivel de audio captado es:
 * - Demasiado bajo (rojo/naranja) → acercar el micrófono
 * - Correcto (verde) → nivel óptimo para detección
 * - Saturado (rojo) → alejar el micrófono
 * 
 * Incluye indicador numérico de dB y barra de nivel animada.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

interface VUMeterProps {
  /** Nivel RMS del audio (0-1) */
  rmsLevel: number;
  /** Si el motor está activo */
  isListening: boolean;
  /** Modo compacto (solo barra, sin texto) */
  compact?: boolean;
}

const SEGMENTS = 20;
const OPTIMAL_MIN = 0.015;
const OPTIMAL_MAX = 0.5;

export function VUMeter({ rmsLevel, isListening, compact = false }: VUMeterProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');

  const { level, dbValue, statusColor, statusText } = useMemo(() => {
    if (!isListening || rmsLevel <= 0) {
      return { level: 0, dbValue: -Infinity, statusColor: '#666', statusText: 'Sin señal' };
    }

    // Convert RMS to dB (reference: full scale = 0 dB)
    const db = 20 * Math.log10(Math.max(rmsLevel, 1e-10));
    
    // Normalize to 0-1 range for display (-60 dB to 0 dB)
    const normalized = Math.max(0, Math.min(1, (db + 60) / 60));

    let color = '#22C55E'; // green - optimal
    let text = 'Óptimo';

    if (rmsLevel < OPTIMAL_MIN * 0.3) {
      color = '#EF4444'; // red - too low
      text = 'Muy bajo';
    } else if (rmsLevel < OPTIMAL_MIN) {
      color = '#F59E0B'; // amber - low
      text = 'Bajo';
    } else if (rmsLevel > OPTIMAL_MAX) {
      color = '#EF4444'; // red - saturated
      text = 'Saturado';
    } else if (rmsLevel > OPTIMAL_MAX * 0.7) {
      color = '#F59E0B'; // amber - high
      text = 'Alto';
    }

    return { level: normalized, dbValue: db, statusColor: color, statusText: text };
  }, [rmsLevel, isListening]);

  const segmentColors = useMemo(() => {
    const colors: string[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const segmentLevel = (i + 1) / SEGMENTS;
      const isActive = level >= segmentLevel;
      
      if (!isActive) {
        colors.push(borderColor + '40');
        continue;
      }

      // Color gradient: green → yellow → red
      if (segmentLevel <= 0.6) {
        colors.push('#22C55E');
      } else if (segmentLevel <= 0.8) {
        colors.push('#F59E0B');
      } else {
        colors.push('#EF4444');
      }
    }
    return colors;
  }, [level, borderColor]);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactBarContainer}>
          {segmentColors.map((color, i) => (
            <View
              key={i}
              style={[styles.compactSegment, { backgroundColor: color }]}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: surfaceColor, borderColor }]}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: textSecondary }]}>Nivel</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.barContainer}>
        {segmentColors.map((color, i) => (
          <View
            key={i}
            style={[styles.segment, { backgroundColor: color }]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.dbText, { color: textSecondary }]}>
          {dbValue > -Infinity ? `${dbValue.toFixed(1)} dB` : '— dB'}
        </Text>
        <View style={styles.scaleRow}>
          <Text style={[styles.scaleText, { color: textSecondary }]}>-60</Text>
          <Text style={[styles.scaleText, { color: textSecondary }]}>-30</Text>
          <Text style={[styles.scaleText, { color: textSecondary }]}>0</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginVertical: 4,
  },
  compactContainer: {
    paddingVertical: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  barContainer: {
    flexDirection: 'row',
    gap: 2,
    height: 24,
    alignItems: 'stretch',
  },
  compactBarContainer: {
    flexDirection: 'row',
    gap: 1,
    height: 8,
    alignItems: 'stretch',
  },
  segment: {
    flex: 1,
    borderRadius: 3,
  },
  compactSegment: {
    flex: 1,
    borderRadius: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  dbText: {
    fontSize: 11,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  scaleRow: {
    flexDirection: 'row',
    gap: 0,
    flex: 1,
    justifyContent: 'space-between',
    marginLeft: 16,
  },
  scaleText: {
    fontSize: 9,
  },
});
