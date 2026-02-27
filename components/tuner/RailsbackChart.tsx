/**
 * RailsbackChart - Gráfico de curva de afinación (Railsback)
 * 
 * Muestra la desviación en cents de cada tecla respecto al temperamento
 * igual, comparando la afinación actual con la curva objetivo de stretch.
 * Permite ver el estado global de la afinación del piano de un vistazo.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  TOTAL_KEYS,
  getNoteName,
  getOctave,
  getStretchedFrequency,
  getEqualTemperamentFrequency,
  frequencyToCents,
} from '@/constants/piano-tuning';
import { KeyMeasurement } from '@/contexts/TunerContext';

interface RailsbackChartProps {
  /** Mediciones guardadas de cada tecla */
  measurements: (KeyMeasurement | null)[];
  /** Frecuencia de referencia A4 */
  concertPitch: number;
  /** Ancho del componente */
  width: number;
  /** Alto del componente */
  height?: number;
  /** Si se muestra la curva de stretch objetivo */
  showStretchCurve?: boolean;
}

const CANVAS_ID = 'tuner-railsback-canvas';

export function RailsbackChart({
  measurements,
  concertPitch,
  width,
  height = 200,
  showStretchCurve = true,
}: RailsbackChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const border = useThemeColor({}, 'border');
  const surface = useThemeColor({}, 'surface');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({}, 'cardBackground');
  
  const padding = { top: 20, right: 16, bottom: 28, left: 36 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Rango de cents visible
  const maxCents = 30;
  
  const keyToX = useCallback((keyIndex: number): number => {
    return padding.left + (keyIndex / (TOTAL_KEYS - 1)) * chartWidth;
  }, [chartWidth]);
  
  const centsToY = useCallback((cents: number): number => {
    const clamped = Math.max(-maxCents, Math.min(maxCents, cents));
    return padding.top + ((maxCents - clamped) / (2 * maxCents)) * chartHeight;
  }, [chartHeight]);
  
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement;
      canvasRef.current = canvas;
    }
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    
    // Limpiar
    ctx.clearRect(0, 0, width, height);
    
    // Fondo
    ctx.fillStyle = surface;
    ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight);
    
    // Grid horizontal (cents)
    const centsLines = [-20, -10, 0, 10, 20];
    centsLines.forEach(cents => {
      const y = centsToY(cents);
      ctx.beginPath();
      ctx.strokeStyle = cents === 0 ? textSecondary : border;
      ctx.lineWidth = cents === 0 ? 1 : 0.5;
      ctx.setLineDash(cents === 0 ? [] : [4, 4]);
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Etiqueta
      ctx.fillStyle = textSecondary;
      ctx.font = '9px Montserrat, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const label = cents > 0 ? `+${cents}` : `${cents}`;
      ctx.fillText(label, padding.left - 4, y);
    });
    
    // Grid vertical (octavas)
    for (let octave = 1; octave <= 7; octave++) {
      // C de cada octava: C1=3, C2=15, C3=27, C4=39, C5=51, C6=63, C7=75
      const keyIndex = (octave - 1) * 12 + 3;
      if (keyIndex >= 0 && keyIndex < TOTAL_KEYS) {
        const x = keyToX(keyIndex);
        ctx.beginPath();
        ctx.strokeStyle = border;
        ctx.lineWidth = 0.5;
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();
        
        // Etiqueta
        ctx.fillStyle = textSecondary;
        ctx.font = '9px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`C${octave}`, x, height - padding.bottom + 4);
      }
    }
    
    // Etiquetas extremas
    ctx.fillStyle = textSecondary;
    ctx.font = '9px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('A0', keyToX(0), height - padding.bottom + 4);
    ctx.fillText('C8', keyToX(87), height - padding.bottom + 4);
    
    // Dibujar curva de stretch objetivo
    if (showStretchCurve) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 58, 140, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      
      for (let k = 0; k < TOTAL_KEYS; k++) {
        const stretchedFreq = getStretchedFrequency(k, concertPitch);
        const equalFreq = getEqualTemperamentFrequency(k, concertPitch);
        const stretchCents = frequencyToCents(equalFreq, stretchedFreq);
        
        const x = keyToX(k);
        const y = centsToY(stretchCents);
        
        if (k === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Dibujar mediciones reales
    const measuredKeys = measurements
      .map((m, i) => ({ measurement: m, keyIndex: i }))
      .filter(({ measurement }) => measurement !== null);
    
    if (measuredKeys.length > 0) {
      // Línea conectando mediciones
      ctx.beginPath();
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2;
      
      measuredKeys.forEach(({ measurement, keyIndex }, i) => {
        if (!measurement) return;
        const x = keyToX(keyIndex);
        const y = centsToY(measurement.centsDeviation);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      
      // Puntos de medición
      measuredKeys.forEach(({ measurement, keyIndex }) => {
        if (!measurement) return;
        const x = keyToX(keyIndex);
        const y = centsToY(measurement.centsDeviation);
        const absCents = Math.abs(measurement.centsDeviation);
        
        let color = '#10B981'; // in tune
        if (absCents > 5) color = '#EF4444'; // out of tune
        else if (absCents > 2) color = '#F59E0B'; // close
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
    }
    
    // Leyenda
    const legendY = padding.top + 4;
    const legendX = padding.left + 8;
    
    if (showStretchCurve) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 58, 140, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.moveTo(legendX, legendY);
      ctx.lineTo(legendX + 20, legendY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = textSecondary;
      ctx.font = '9px Montserrat, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('Objetivo (stretch)', legendX + 24, legendY);
    }
    
    if (measuredKeys.length > 0) {
      const ly = legendY + 14;
      ctx.beginPath();
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2;
      ctx.moveTo(legendX, ly);
      ctx.lineTo(legendX + 20, ly);
      ctx.stroke();
      
      ctx.fillStyle = textSecondary;
      ctx.font = '9px Montserrat, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('Medido', legendX + 24, ly);
    }
    
  }, [measurements, concertPitch, width, height, showStretchCurve, surface, border, textSecondary, textColor, keyToX, centsToY, chartWidth, chartHeight]);
  
  if (Platform.OS !== 'web') return null;
  
  // Estadísticas
  const measured = measurements.filter(m => m !== null);
  const avgDeviation = measured.length > 0
    ? measured.reduce((sum, m) => sum + Math.abs(m!.centsDeviation), 0) / measured.length
    : 0;
  const maxDeviation = measured.length > 0
    ? Math.max(...measured.map(m => Math.abs(m!.centsDeviation)))
    : 0;
  
  return (
    <View style={[styles.container, { borderColor: border, backgroundColor: cardBg }]}>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: textSecondary }]}>
          Curva de Railsback
        </ThemedText>
        {measured.length > 0 && (
          <ThemedText style={[styles.statsText, { color: textSecondary }]}>
            {measured.length}/88 · Avg: ±{avgDeviation.toFixed(1)}¢ · Max: ±{maxDeviation.toFixed(1)}¢
          </ThemedText>
        )}
      </View>
      <View
        style={[styles.canvasContainer, { height }]}
        // @ts-ignore - web-only prop
        dangerouslySetInnerHTML={Platform.OS === 'web' ? {
          __html: `<canvas id="${CANVAS_ID}" style="width:${width - 2}px;height:${height}px;display:block;" />`
        } : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsText: {
    fontSize: 10,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 14,
  },
  canvasContainer: {
    width: '100%',
    overflow: 'hidden',
  },
});
