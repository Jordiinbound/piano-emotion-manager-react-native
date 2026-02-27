/**
 * MultiStringDetector — Detecció multi-corda per uníson avançat
 * 
 * Analitza l'espectre FFT per detectar les 2-3 freqüències individuals
 * de cada uníson i mostrar-les per separat. Permet veure exactament
 * quina corda del grup està desafinada.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import Svg, { Rect, Line, Circle, Text as SvgText } from 'react-native-svg';
import { getNoteName, getOctave, getFullNoteName, TOTAL_KEYS } from '@/constants/piano-tuning';

interface DetectedString {
  frequency: number;
  amplitude: number;
  centsFromTarget: number;
}

interface MultiStringDetectorProps {
  /** Freqüència objectiu de la nota */
  targetFrequency: number;
  /** Índex de la tecla */
  keyIndex: number;
  /** Dades FFT en brut */
  fftData: Float32Array | null;
  /** Sample rate de l'àudio */
  sampleRate: number;
  /** Si l'afinador està actiu */
  isActive: boolean;
  /** Mode fosc */
  darkTuningMode?: boolean;
}

/**
 * Detecta pics individuals a l'espectre FFT prop de la freqüència fonamental.
 * Busca 2-3 pics que representen les cordes individuals de l'uníson.
 */
function detectStrings(
  fftData: Float32Array,
  targetFreq: number,
  sampleRate: number,
): DetectedString[] {
  if (!fftData || fftData.length === 0 || targetFreq <= 0) return [];
  
  const fftSize = fftData.length * 2;
  const binResolution = sampleRate / fftSize;
  
  // Buscar en un rang de ±3% al voltant de la fonamental
  const searchRange = targetFreq * 0.03;
  const minFreq = targetFreq - searchRange;
  const maxFreq = targetFreq + searchRange;
  const minBin = Math.max(1, Math.floor(minFreq / binResolution));
  const maxBin = Math.min(fftData.length - 1, Math.ceil(maxFreq / binResolution));
  
  // Convertir a amplituds lineals
  const amplitudes: { bin: number; amplitude: number; frequency: number }[] = [];
  for (let i = minBin; i <= maxBin; i++) {
    const amplitude = Math.pow(10, fftData[i] / 20); // dB a lineal
    amplitudes.push({
      bin: i,
      amplitude,
      frequency: i * binResolution,
    });
  }
  
  // Trobar pics locals (màxims locals)
  const peaks: typeof amplitudes = [];
  for (let i = 1; i < amplitudes.length - 1; i++) {
    if (amplitudes[i].amplitude > amplitudes[i - 1].amplitude &&
        amplitudes[i].amplitude > amplitudes[i + 1].amplitude &&
        amplitudes[i].amplitude > 0.01) {
      peaks.push(amplitudes[i]);
    }
  }
  
  // Ordenar per amplitud descendent i agafar els 3 primers
  peaks.sort((a, b) => b.amplitude - a.amplitude);
  const topPeaks = peaks.slice(0, 3);
  
  // Interpolació parabòlica per millorar la resolució de freqüència
  const strings: DetectedString[] = topPeaks.map(peak => {
    const bin = peak.bin;
    let freq = peak.frequency;
    
    // Interpolació parabòlica
    if (bin > 0 && bin < fftData.length - 1) {
      const alpha = fftData[bin - 1];
      const beta = fftData[bin];
      const gamma = fftData[bin + 1];
      const p = 0.5 * (alpha - gamma) / (alpha - 2 * beta + gamma);
      freq = (bin + p) * binResolution;
    }
    
    // Calcular desviació en cents
    const centsFromTarget = 1200 * Math.log2(freq / targetFreq);
    
    return {
      frequency: freq,
      amplitude: peak.amplitude,
      centsFromTarget,
    };
  });
  
  // Ordenar per freqüència
  strings.sort((a, b) => a.frequency - b.frequency);
  
  return strings;
}

export function MultiStringDetector({
  targetFrequency,
  keyIndex,
  fftData,
  sampleRate,
  isActive,
  darkTuningMode,
}: MultiStringDetectorProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');

  const fgText = darkTuningMode ? '#ffffff' : textColor;
  const fgMuted = darkTuningMode ? '#888888' : textSecondary;
  const bgSurface = darkTuningMode ? '#1a1a1a' : surface;
  const bgBorder = darkTuningMode ? '#333333' : border;

  const strings = useMemo(() => {
    if (!fftData || !isActive) return [];
    return detectStrings(fftData, targetFrequency, sampleRate);
  }, [fftData, targetFrequency, sampleRate, isActive]);

  // Determinar quantes cordes té la nota (baixes: 1-2, mitjanes/altes: 3)
  const expectedStrings = keyIndex < 8 ? 1 : keyIndex < 28 ? 2 : 3;
  
  // Calcular batiments entre cordes
  const beatFrequencies: number[] = [];
  for (let i = 0; i < strings.length; i++) {
    for (let j = i + 1; j < strings.length; j++) {
      beatFrequencies.push(Math.abs(strings[i].frequency - strings[j].frequency));
    }
  }

  const SVG_WIDTH = 280;
  const SVG_HEIGHT = 100;
  const CENTER_Y = SVG_HEIGHT / 2;
  const SCALE = 8; // pixels per cent

  return (
    <View style={[styles.container, { backgroundColor: bgSurface, borderColor: bgBorder }]}>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: fgText }]}>
          Detecció multi-corda
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: fgMuted }]}>
          {keyIndex >= 0 ? `${getFullNoteName(keyIndex)} — ${expectedStrings} corda${expectedStrings > 1 ? 'es' : ''}` : '—'}
        </ThemedText>
      </View>

      {!isActive || strings.length === 0 ? (
        <ThemedText style={[styles.emptyText, { color: fgMuted }]}>
          {isActive ? 'Analitzant espectre...' : 'Inicia l\'afinador per detectar cordes'}
        </ThemedText>
      ) : (
        <>
          <Svg width={SVG_WIDTH} height={SVG_HEIGHT} viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}>
            {/* Línia central (freqüència objectiu) */}
            <Line
              x1={SVG_WIDTH / 2}
              y1={10}
              x2={SVG_WIDTH / 2}
              y2={SVG_HEIGHT - 10}
              stroke={bgBorder}
              strokeWidth={1}
              strokeDasharray="4,3"
            />
            <SvgText
              x={SVG_WIDTH / 2}
              y={8}
              fontSize={8}
              fill={fgMuted}
              textAnchor="middle"
            >
              {targetFrequency.toFixed(1)} Hz
            </SvgText>

            {/* Zona de tolerància (±1 cent) */}
            <Rect
              x={SVG_WIDTH / 2 - SCALE}
              y={15}
              width={SCALE * 2}
              height={SVG_HEIGHT - 30}
              fill="#22C55E"
              opacity={0.1}
              rx={2}
            />

            {/* Cordes detectades */}
            {strings.map((str, i) => {
              const x = SVG_WIDTH / 2 + str.centsFromTarget * SCALE;
              const clampedX = Math.max(15, Math.min(SVG_WIDTH - 15, x));
              const absCents = Math.abs(str.centsFromTarget);
              const color = absCents <= 1 ? '#22C55E'
                : absCents <= 3 ? '#4ADE80'
                : absCents <= 5 ? '#F59E0B'
                : '#EF4444';
              
              const y = 30 + i * 25;
              const maxAmp = Math.max(...strings.map(s => s.amplitude));
              const relAmp = str.amplitude / maxAmp;
              const radius = 4 + relAmp * 6;

              return (
                <React.Fragment key={i}>
                  {/* Línia de connexió al centre */}
                  <Line
                    x1={SVG_WIDTH / 2}
                    y1={y}
                    x2={clampedX}
                    y2={y}
                    stroke={color}
                    strokeWidth={2}
                    opacity={0.5}
                  />
                  {/* Cercle de la corda */}
                  <Circle
                    cx={clampedX}
                    cy={y}
                    r={radius}
                    fill={color}
                    opacity={0.8}
                  />
                  {/* Etiqueta */}
                  <SvgText
                    x={clampedX}
                    y={y + radius + 10}
                    fontSize={8}
                    fill={fgMuted}
                    textAnchor="middle"
                  >
                    {str.centsFromTarget > 0 ? '+' : ''}{str.centsFromTarget.toFixed(1)}¢
                  </SvgText>
                  {/* Nom de la corda */}
                  <SvgText
                    x={15}
                    y={y + 3}
                    fontSize={9}
                    fill={fgText}
                    fontWeight="bold"
                  >
                    Corda {i + 1}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>

          {/* Informació de batiments */}
          {beatFrequencies.length > 0 && (
            <View style={[styles.beatsSection, { borderTopColor: bgBorder }]}>
              <ThemedText style={[styles.beatsTitle, { color: fgText }]}>
                Batiments entre cordes
              </ThemedText>
              <View style={styles.beatsRow}>
                {beatFrequencies.map((beat, i) => {
                  const beatColor = beat < 0.5 ? '#22C55E' : beat < 1.5 ? '#F59E0B' : '#EF4444';
                  const pairLabels = strings.length === 2 ? ['1-2'] : ['1-2', '1-3', '2-3'];
                  return (
                    <View key={i} style={styles.beatItem}>
                      <ThemedText style={[styles.beatLabel, { color: fgMuted }]}>
                        {pairLabels[i] || `${i + 1}`}
                      </ThemedText>
                      <ThemedText style={[styles.beatValue, { color: beatColor }]}>
                        {beat.toFixed(2)} Hz
                      </ThemedText>
                      <ThemedText style={[styles.beatDesc, { color: fgMuted }]}>
                        {beat < 0.5 ? 'Perfecte' : beat < 1.5 ? 'Acceptable' : 'Ajustar'}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
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
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 14,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: 'Montserrat',
    lineHeight: 16,
    textAlign: 'center',
    paddingVertical: 20,
  },
  beatsSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  beatsTitle: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 14,
    marginBottom: 6,
  },
  beatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  beatItem: {
    alignItems: 'center',
  },
  beatLabel: {
    fontSize: 9,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 12,
    textTransform: 'uppercase',
  },
  beatValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 18,
    marginTop: 2,
  },
  beatDesc: {
    fontSize: 9,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 12,
    marginTop: 1,
  },
});
