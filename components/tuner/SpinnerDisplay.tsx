/**
 * SpinnerDisplay — Visualització estroboscòpica de parcials
 * 
 * Basat en PianoMeter: barres giratòries per cada harmònic.
 * La velocitat de rotació és proporcional a la desviació en cents.
 * Quan la nota està afinada, les barres s'aturen (velocitat 0).
 * 
 * Cada fila representa un parcial (1-8):
 * - Barres que es mouen horitzontalment
 * - Velocitat = desviació_cents × factor
 * - Direcció: dreta = agut, esquerra = greu
 * - Color: verd quan aturat, groc/vermell quan es mou
 * 
 * Principi físic: simula l'efecte estroboscòpic d'un disc de Vernier
 * on el patró de barres s'atura quan la freqüència coincideix exactament.
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  getInharmonicPartialFrequency,
  getExpectedInharmonicity,
  frequencyToCents,
  getFullNoteName,
} from '@/constants/piano-tuning';
import { useLanguage } from '@/contexts/language-context';
import { getTunerTranslation } from '@/locales/tuner-translations';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SpinnerDisplayProps {
  /** Fundamental frequency */
  fundamentalFreq: number;
  /** Key index */
  keyIndex: number;
  /** Cents deviation from target */
  centsDeviation: number;
  /** FFT data for partial detection */
  fftData: Float32Array | null;
  /** Sample rate */
  sampleRate: number;
  /** Inharmonicity coefficient */
  inharmonicity: number | null;
  /** Whether tuner is active */
  isActive: boolean;
  /** Number of partials to show (default 8) */
  numPartials?: number;
  /** Display width */
  width?: number;
}

// ─── Spinner Row Component ──────────────────────────────────────────────────

interface SpinnerRowProps {
  partialNumber: number;
  deviationCents: number;
  amplitude: number; // 0-1
  isActive: boolean;
  width: number;
  textColor: string;
  textSecondary: string;
  border: string;
}

function SpinnerRow({
  partialNumber,
  deviationCents,
  amplitude,
  isActive,
  width,
  textColor,
  textSecondary,
  border,
}: SpinnerRowProps) {
  const offset = useSharedValue(0);
  const barWidth = width - 60;
  const numBars = 12;
  const barSpacing = barWidth / numBars;

  useEffect(() => {
    if (!isActive || amplitude < 0.05) {
      cancelAnimation(offset);
      offset.value = 0;
      return;
    }

    // Speed proportional to deviation: 0 cents = stopped, ±50 cents = full speed
    const speed = Math.abs(deviationCents) * 2; // pixels per second
    const direction = deviationCents > 0 ? 1 : -1;

    if (Math.abs(deviationCents) < 0.5) {
      // Nearly in tune - stop
      cancelAnimation(offset);
      offset.value = withTiming(0, { duration: 300 });
      return;
    }

    // Continuous scrolling animation
    const cycleDuration = barSpacing / Math.max(0.5, speed) * 1000;
    offset.value = 0;
    offset.value = withRepeat(
      withTiming(direction * barSpacing, {
        duration: Math.max(50, Math.min(3000, cycleDuration)),
        easing: Easing.linear,
      }),
      -1, // infinite
      false,
    );

    return () => {
      cancelAnimation(offset);
    };
  }, [deviationCents, isActive, amplitude, barSpacing]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  // Color based on deviation
  const getBarColor = () => {
    if (!isActive || amplitude < 0.05) return border;
    const absCents = Math.abs(deviationCents);
    if (absCents < 1) return '#10B981';
    if (absCents < 3) return '#22C55E';
    if (absCents < 5) return '#4ADE80';
    if (absCents < 10) return '#FBBF24';
    if (absCents < 20) return '#F59E0B';
    return '#EF4444';
  };

  const barColor = getBarColor();
  const opacity = isActive ? Math.max(0.3, amplitude) : 0.15;

  return (
    <View style={styles.spinnerRow}>
      {/* Partial number */}
      <ThemedText style={[styles.partialLabel, { color: isActive ? textColor : textSecondary }]}>
        {partialNumber}
      </ThemedText>

      {/* Spinner area */}
      <View style={[styles.spinnerArea, { width: barWidth }]}>
        <Animated.View style={[styles.barsContainer, animatedStyle]}>
          {Array.from({ length: numBars * 3 }, (_, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  left: (i - numBars) * barSpacing,
                  width: barSpacing * 0.4,
                  backgroundColor: barColor,
                  opacity,
                },
              ]}
            />
          ))}
        </Animated.View>
        {/* Center line */}
        <View style={[styles.centerLine, { backgroundColor: textSecondary }]} />
      </View>

      {/* Deviation value */}
      <ThemedText
        style={[
          styles.deviationLabel,
          {
            color: isActive && amplitude > 0.05 ? barColor : textSecondary,
            fontWeight: isActive ? '600' : '400',
          },
        ]}
      >
        {isActive && amplitude > 0.05
          ? `${deviationCents > 0 ? '+' : ''}${deviationCents.toFixed(1)}`
          : '—'}
      </ThemedText>
    </View>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function SpinnerDisplay({
  fundamentalFreq,
  keyIndex,
  centsDeviation,
  fftData,
  sampleRate,
  inharmonicity,
  isActive,
  numPartials = 8,
  width = 340,
}: SpinnerDisplayProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surface = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const { currentLanguage } = useLanguage();
  const tt = getTunerTranslation(currentLanguage);

  const B = inharmonicity ?? getExpectedInharmonicity(fundamentalFreq);

  // Calculate per-partial deviations and amplitudes
  const partialData = useMemo(() => {
    if (!isActive || fundamentalFreq <= 0) {
      return Array.from({ length: numPartials }, (_, i) => ({
        n: i + 1,
        deviation: 0,
        amplitude: 0,
      }));
    }

    const binResolution = fftData ? sampleRate / (fftData.length * 2) : 1;
    const result: { n: number; deviation: number; amplitude: number }[] = [];

    for (let n = 1; n <= numPartials; n++) {
      const expectedFreq = getInharmonicPartialFrequency(fundamentalFreq, n, B);

      if (fftData && expectedFreq < sampleRate / 2) {
        // Find peak near expected frequency
        const expectedBin = Math.round(expectedFreq / binResolution);
        const searchRadius = Math.max(2, Math.round(expectedFreq * 0.015 / binResolution));
        const binLow = Math.max(1, expectedBin - searchRadius);
        const binHigh = Math.min(fftData.length - 1, expectedBin + searchRadius);

        let peakBin = expectedBin;
        let peakVal = 0;
        for (let i = binLow; i <= binHigh; i++) {
          if (fftData[i] > peakVal) {
            peakVal = fftData[i];
            peakBin = i;
          }
        }

        // Parabolic interpolation
        let refinedBin = peakBin;
        if (peakBin > 0 && peakBin < fftData.length - 1) {
          const y0 = fftData[peakBin - 1];
          const y1 = fftData[peakBin];
          const y2 = fftData[peakBin + 1];
          const denom = 2 * (2 * y1 - y2 - y0);
          if (denom !== 0) {
            const correction = (y0 - y2) / denom;
            if (Math.abs(correction) < 1) refinedBin = peakBin + correction;
          }
        }

        const measuredFreq = refinedBin * binResolution;
        const deviation = frequencyToCents(expectedFreq, measuredFreq);

        // Normalize amplitude relative to fundamental
        const fundBin = Math.round(fundamentalFreq / binResolution);
        let fundPeak = 1;
        for (let i = Math.max(1, fundBin - 3); i <= Math.min(fftData.length - 1, fundBin + 3); i++) {
          if (fftData[i] > fundPeak) fundPeak = fftData[i];
        }
        const amplitude = Math.min(1, peakVal / fundPeak);

        result.push({ n, deviation, amplitude });
      } else {
        // No FFT data or above Nyquist - use overall cents deviation scaled
        result.push({
          n,
          deviation: centsDeviation * n, // Approximate: higher partials deviate more
          amplitude: n === 1 ? 1 : Math.max(0, 1 - (n - 1) * 0.15),
        });
      }
    }

    return result;
  }, [fundamentalFreq, fftData, sampleRate, B, numPartials, isActive, centsDeviation]);

  const noteName = keyIndex >= 0 ? getFullNoteName(keyIndex) : '—';

  return (
    <View style={[styles.container, { backgroundColor: surface, borderColor }]}>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: textColor }]}>Spinner Estroboscòpic</ThemedText>
        <View style={[styles.badge, { backgroundColor: '#1B6B93' + '20' }]}>
          <ThemedText style={[styles.badgeText, { color: '#1B6B93' }]}>{noteName}</ThemedText>
        </View>
      </View>

      {/* Column headers */}
      <View style={styles.columnHeaders}>
        <ThemedText style={[styles.colHeader, { color: textSecondary, width: 24 }]}>n</ThemedText>
        <ThemedText style={[styles.colHeader, { color: textSecondary, flex: 1, textAlign: 'center' }]}>
          {isActive ? tt.spinner.stoppedMeansInTune : tt.spinner.inactive}
        </ThemedText>
        <ThemedText style={[styles.colHeader, { color: textSecondary, width: 44, textAlign: 'right' }]}>¢</ThemedText>
      </View>

      {/* Spinner rows */}
      {partialData.map(p => (
        <SpinnerRow
          key={p.n}
          partialNumber={p.n}
          deviationCents={p.deviation}
          amplitude={p.amplitude}
          isActive={isActive}
          width={width - 24}
          textColor={textColor}
          textSecondary={textSecondary}
          border={borderColor}
        />
      ))}

      {/* Legend */}
      <View style={[styles.legend, { borderTopColor: borderColor }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <ThemedText style={[styles.legendText, { color: textSecondary }]}>{tt.spinner.inTune}</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FBBF24' }]} />
          <ThemedText style={[styles.legendText, { color: textSecondary }]}>{tt.spinner.close}</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <ThemedText style={[styles.legendText, { color: textSecondary }]}>{tt.spinner.outOfTune}</ThemedText>
        </View>
        <ThemedText style={[styles.legendText, { color: textSecondary }]}>→ agut · ← greu</ThemedText>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
  },
  colHeader: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  spinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    gap: 4,
  },
  partialLabel: {
    fontSize: 11,
    fontWeight: '600',
    width: 20,
    textAlign: 'center',
    lineHeight: 14,
  },
  spinnerArea: {
    height: 18,
    overflow: 'hidden',
    borderRadius: 3,
    position: 'relative',
  },
  barsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bar: {
    position: 'absolute',
    top: 0,
    height: '100%',
    borderRadius: 1,
  },
  centerLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    width: 1,
    height: '100%',
    opacity: 0.3,
  },
  deviationLabel: {
    fontSize: 10,
    width: 40,
    textAlign: 'right',
    lineHeight: 14,
  },
  legend: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 9,
    lineHeight: 12,
  },
});
