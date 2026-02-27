/**
 * Spectrogram - Visualización de espectro en tiempo real
 * 
 * Muestra el espectro de frecuencias (FFT) del audio capturado,
 * con marcadores de parciales para la nota activa.
 * Permite ver la estructura armónica de cada cuerda del piano.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getInharmonicPartialFrequency, getExpectedInharmonicity, getEqualTemperamentFrequency } from '@/constants/piano-tuning';

interface SpectrogramProps {
  /** Datos FFT en dB (Float32Array de getFloatFrequencyData) */
  fftData: Float32Array | null;
  /** Frecuencia de muestreo real */
  sampleRate: number;
  /** Frecuencia fundamental detectada */
  fundamentalFreq: number;
  /** Índice de la tecla activa */
  activeKeyIndex: number;
  /** Coeficiente de inharmonicidad medido */
  inharmonicity: number | null;
  /** Si el afinador está activo */
  isActive: boolean;
  /** Ancho del componente */
  width: number;
  /** Alto del componente */
  height?: number;
}

const CANVAS_ID = 'tuner-spectrogram-canvas';

export function Spectrogram({
  fftData,
  sampleRate,
  fundamentalFreq,
  activeKeyIndex,
  inharmonicity,
  isActive,
  width,
  height = 160,
}: SpectrogramProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const border = useThemeColor({}, 'border');
  const surface = useThemeColor({}, 'surface');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const cardBg = useThemeColor({}, 'cardBackground');
  
  // Rango de frecuencias visible (20 Hz a 5000 Hz en escala logarítmica)
  const minFreq = 20;
  const maxFreq = 5000;
  
  const freqToX = useCallback((freq: number): number => {
    if (freq <= 0) return 0;
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    const logFreq = Math.log10(Math.max(minFreq, Math.min(maxFreq, freq)));
    return ((logFreq - logMin) / (logMax - logMin)) * width;
  }, [width]);
  
  // Dibujar en canvas (solo web)
  useEffect(() => {
    if (Platform.OS !== 'web' || !fftData || !isActive) return;
    
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
    ctx.fillRect(0, 0, width, height);
    
    // Resolución frecuencial
    const binCount = fftData.length;
    const binResolution = sampleRate / (binCount * 2);
    
    // Dibujar espectro
    ctx.beginPath();
    ctx.strokeStyle = '#003a8c';
    ctx.lineWidth = 1.5;
    
    let started = false;
    for (let i = 0; i < binCount; i++) {
      const freq = i * binResolution;
      if (freq < minFreq || freq > maxFreq) continue;
      
      const x = freqToX(freq);
      // Normalizar dB: -100 dB = bottom, -20 dB = top
      const dbValue = Math.max(-100, Math.min(-20, fftData[i]));
      const normalized = (dbValue + 100) / 80; // 0 to 1
      const y = height - normalized * (height - 20) - 10;
      
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // Rellenar debajo de la curva
    ctx.lineTo(freqToX(maxFreq), height);
    ctx.lineTo(freqToX(minFreq), height);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 58, 140, 0.08)';
    ctx.fill();
    
    // Dibujar marcadores de parciales si hay nota detectada
    if (fundamentalFreq > 0 && activeKeyIndex >= 0) {
      const B = inharmonicity ?? getExpectedInharmonicity(fundamentalFreq);
      const maxPartials = Math.min(12, Math.floor(maxFreq / fundamentalFreq));
      
      for (let n = 1; n <= maxPartials; n++) {
        const partialFreq = B > 0
          ? getInharmonicPartialFrequency(fundamentalFreq, n, B)
          : fundamentalFreq * n;
        
        if (partialFreq > maxFreq) break;
        
        const x = freqToX(partialFreq);
        
        // Línea vertical del parcial
        ctx.beginPath();
        ctx.strokeStyle = n === 1 ? '#10B981' : 'rgba(224, 122, 95, 0.6)';
        ctx.lineWidth = n === 1 ? 2 : 1;
        ctx.setLineDash(n === 1 ? [] : [4, 4]);
        ctx.moveTo(x, 5);
        ctx.lineTo(x, height - 5);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Etiqueta del parcial
        if (n <= 6) {
          ctx.fillStyle = n === 1 ? '#10B981' : '#e07a5f';
          ctx.font = '10px Montserrat, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(n === 1 ? 'f₁' : `${n}`, x, 12);
        }
      }
    }
    
    // Dibujar eje de frecuencias
    const freqLabels = [50, 100, 200, 500, 1000, 2000, 4000];
    ctx.fillStyle = textSecondary;
    ctx.font = '9px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    
    freqLabels.forEach(freq => {
      const x = freqToX(freq);
      
      // Línea de grid
      ctx.beginPath();
      ctx.strokeStyle = border;
      ctx.lineWidth = 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      
      // Etiqueta
      const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
      ctx.fillText(label, x, height - 2);
    });
    
  }, [fftData, isActive, fundamentalFreq, activeKeyIndex, inharmonicity, width, height, sampleRate, surface, border, textSecondary, freqToX]);
  
  if (Platform.OS !== 'web') return null;
  
  return (
    <View style={[styles.container, { borderColor: border, backgroundColor: cardBg }]}>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: textSecondary }]}>
          Espectro de parciales
        </ThemedText>
        {fundamentalFreq > 0 && (
          <ThemedText style={[styles.freqLabel, { color: '#003a8c' }]}>
            f₁ = {fundamentalFreq.toFixed(1)} Hz
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
  freqLabel: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 14,
  },
  canvasContainer: {
    width: '100%',
    overflow: 'hidden',
  },
});
