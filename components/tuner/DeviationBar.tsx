/**
 * DeviationBar - Barra horizontal de desviación
 * 
 * Indicador visual complementario al gauge circular.
 * Muestra la desviación en cents como una barra que se mueve
 * a izquierda (bemol) o derecha (sostenido) del centro.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getTuningColor } from '@/constants/piano-tuning';

interface DeviationBarProps {
  /** Desviación en cents */
  centsDeviation: number;
  /** Rango del medidor */
  range: number;
  /** Si hay una nota detectada */
  isActive: boolean;
}

export function DeviationBar({ centsDeviation, range, isActive }: DeviationBarProps) {
  const border = useThemeColor({}, 'border');
  const surface = useThemeColor({}, 'surface');
  const textSecondary = useThemeColor({}, 'textSecondary');
  
  const clampedCents = Math.max(-range, Math.min(range, centsDeviation));
  const position = ((clampedCents / range) + 1) / 2; // 0 to 1
  const tuningColor = isActive ? getTuningColor(centsDeviation) : border;
  
  return (
    <View style={styles.container}>
      {/* Etiquetas */}
      <View style={styles.labels}>
        <ThemedText style={[styles.label, { color: textSecondary }]}>♭</ThemedText>
        <ThemedText style={[styles.label, { color: textSecondary }]}>♯</ThemedText>
      </View>
      
      {/* Barra */}
      <View style={[styles.barContainer, { backgroundColor: surface, borderColor: border }]}>
        {/* Marcas de graduación */}
        <View style={[styles.tickCenter, { backgroundColor: border }]} />
        <View style={[styles.tickQuarter, { backgroundColor: border, left: '25%' }]} />
        <View style={[styles.tickQuarter, { backgroundColor: border, left: '75%' }]} />
        
        {/* Indicador */}
        {isActive && (
          <View
            style={[
              styles.indicator,
              {
                left: `${position * 100}%`,
                backgroundColor: tuningColor,
              },
            ]}
          />
        )}
        
        {/* Zona verde central */}
        <View style={[styles.greenZone, { 
          left: `${((1 - 2/range) / 2) * 100}%`,
          width: `${(4/range) * 100}%`,
        }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 24,
  },
  barContainer: {
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  tickCenter: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    opacity: 0.5,
  },
  tickQuarter: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: 1,
    opacity: 0.3,
  },
  indicator: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    width: 8,
    borderRadius: 4,
    marginLeft: -4,
  },
  greenZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#10B98120',
  },
});
