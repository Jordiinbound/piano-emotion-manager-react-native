/**
 * PhaseDisplay — Visualització de fase estil TuneLab
 * 
 * Basat en TuneLab (capítol 1): quadrats mòbils que comparen la fase
 * del senyal del micròfon amb una referència interna.
 * 
 * Principi: 
 * - Genera un senyal de referència intern a la freqüència objectiu
 * - Compara la fase del senyal del micròfon amb la referència
 * - La diferència de fase es mostra com a moviment horitzontal
 * - Quan la nota està afinada, els quadrats s'aturen
 * - La velocitat de moviment = diferència de freqüència (batiments)
 * 
 * Avantatge sobre el medidor de cents: mostra la relació de fase
 * en temps real, permetent veure batiments molt lents (<0.5 Hz)
 * que un medidor de cents no pot mostrar.
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
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
  getEqualTemperamentFrequency,
  getStretchedFrequency,
  getFullNoteName,
} from '@/constants/piano-tuning';
import { useLanguage } from '@/contexts/language-context';
import { getTunerTranslation } from '@/locales/tuner-translations';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PhaseDisplayProps {
  /** Detected frequency */
  detectedFreq: number;
  /** Target frequency */
  targetFreq: number;
  /** Key index */
  keyIndex: number;
  /** Cents deviation */
  centsDeviation: number;
  /** Whether tuner is active */
  isActive: boolean;
  /** Number of phase rows (default 4, for partials 1-4) */
  numRows?: number;
  /** Inharmonicity coefficient */
  inharmonicity?: number;
  /** Display width */
  width?: number;
}

// ─── Phase Row Component ────────────────────────────────────────────────────

interface PhaseRowProps {
  label: string;
  beatFrequency: number; // Hz (frequency difference)
  isActive: boolean;
  width: number;
  textColor: string;
  textSecondary: string;
  border: string;
}

function PhaseRow({
  label,
  beatFrequency,
  isActive,
  width,
  textColor,
  textSecondary,
  border,
}: PhaseRowProps) {
  const position = useSharedValue(0);
  const rowWidth = width - 50;
  const numSquares = 8;
  const squareSize = rowWidth / numSquares;

  useEffect(() => {
    if (!isActive) {
      cancelAnimation(position);
      position.value = 0;
      return;
    }

    const absBeat = Math.abs(beatFrequency);

    if (absBeat < 0.05) {
      // Essentially in tune - stop
      cancelAnimation(position);
      position.value = withTiming(0, { duration: 500 });
      return;
    }

    // Movement speed = beat frequency
    // One full cycle = one square width movement
    const cycleDuration = 1000 / Math.max(0.05, absBeat); // ms per beat
    const direction = beatFrequency > 0 ? 1 : -1;

    position.value = 0;
    position.value = withRepeat(
      withTiming(direction * squareSize, {
        duration: Math.max(100, Math.min(10000, cycleDuration)),
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(position);
    };
  }, [beatFrequency, isActive, squareSize]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value }],
  }));

  // Color based on beat rate
  const getSquareColor = () => {
    if (!isActive) return border;
    const absBeat = Math.abs(beatFrequency);
    if (absBeat < 0.1) return '#10B981';
    if (absBeat < 0.5) return '#22C55E';
    if (absBeat < 1.0) return '#4ADE80';
    if (absBeat < 2.0) return '#FBBF24';
    if (absBeat < 5.0) return '#F59E0B';
    return '#EF4444';
  };

  const squareColor = getSquareColor();

  return (
    <View style={styles.phaseRow}>
      <ThemedText style={[styles.rowLabel, { color: isActive ? textColor : textSecondary }]}>
        {label}
      </ThemedText>
      <View style={[styles.phaseTrack, { width: rowWidth }]}>
        <Animated.View style={[styles.squaresContainer, animatedStyle]}>
          {Array.from({ length: numSquares * 3 }, (_, i) => {
            const isEven = i % 2 === 0;
            return (
              <View
                key={i}
                style={[
                  styles.phaseSquare,
                  {
                    left: (i - numSquares) * squareSize,
                    width: squareSize - 2,
                    height: squareSize * 0.6,
                    backgroundColor: isEven ? squareColor : 'transparent',
                    borderColor: isEven ? squareColor : 'transparent',
                    opacity: isActive ? 0.8 : 0.2,
                  },
                ]}
              />
            );
          })}
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function PhaseDisplay({
  detectedFreq,
  targetFreq,
  keyIndex,
  centsDeviation,
  isActive,
  numRows = 4,
  inharmonicity = 0,
  width = 340,
}: PhaseDisplayProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surface = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const { currentLanguage } = useLanguage();
  const tt = getTunerTranslation(currentLanguage);

  // Calculate beat frequencies for each partial
  const beatFrequencies = useMemo(() => {
    if (!isActive || detectedFreq <= 0 || targetFreq <= 0) {
      return Array.from({ length: numRows }, () => 0);
    }

    const beats: number[] = [];
    for (let n = 1; n <= numRows; n++) {
      // Detected partial frequency (with inharmonicity)
      const detectedPartial = detectedFreq * n * Math.sqrt((1 + inharmonicity * n * n) / (1 + inharmonicity));
      // Target partial frequency
      const targetPartial = targetFreq * n * Math.sqrt((1 + inharmonicity * n * n) / (1 + inharmonicity));
      // Beat frequency = difference
      beats.push(detectedPartial - targetPartial);
    }
    return beats;
  }, [detectedFreq, targetFreq, numRows, inharmonicity, isActive]);

  const noteName = keyIndex >= 0 ? getFullNoteName(keyIndex) : '—';
  const fundamentalBeat = beatFrequencies[0] ?? 0;

  // Overall status
  const getStatusText = () => {
    if (!isActive) return tt.phaseDisplay.inactive;
    const absBeat = Math.abs(fundamentalBeat);
    if (absBeat < 0.1) return `${tt.phaseDisplay.inTune} — ${tt.phaseDisplay.phaseStable}`;
    if (absBeat < 0.5) return `${tt.phaseDisplay.slowBeats}: ${absBeat.toFixed(2)} Hz`;
    if (absBeat < 2.0) return `${tt.phaseDisplay.beats}: ${absBeat.toFixed(1)} Hz`;
    return `${tt.phaseDisplay.outOfTune}: ${absBeat.toFixed(1)} Hz`;
  };

  const getStatusColor = () => {
    if (!isActive) return textSecondary;
    const absBeat = Math.abs(fundamentalBeat);
    if (absBeat < 0.1) return '#10B981';
    if (absBeat < 0.5) return '#22C55E';
    if (absBeat < 2.0) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <View style={[styles.container, { backgroundColor: surface, borderColor }]}>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: textColor }]}>{tt.phaseDisplay.title}</ThemedText>
        <View style={[styles.badge, { backgroundColor: '#1B6B93' + '20' }]}>
          <ThemedText style={[styles.badgeText, { color: '#1B6B93' }]}>{noteName}</ThemedText>
        </View>
      </View>

      {/* Status */}
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
        <ThemedText style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </ThemedText>
      </View>

      {/* Phase rows */}
      <View style={styles.phaseRows}>
        {beatFrequencies.map((beat, i) => (
          <PhaseRow
            key={i}
            label={`P${i + 1}`}
            beatFrequency={beat}
            isActive={isActive}
            width={width - 24}
            textColor={textColor}
            textSecondary={textSecondary}
            border={borderColor}
          />
        ))}
      </View>

      {/* Info */}
      <View style={[styles.infoRow, { borderTopColor: borderColor }]}>
        <View style={styles.infoItem}>
          <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>{tt.phaseDisplay.detectedFreq}</ThemedText>
          <ThemedText style={[styles.infoValue, { color: textColor }]}>
            {isActive && detectedFreq > 0 ? `${detectedFreq.toFixed(2)} Hz` : '—'}
          </ThemedText>
        </View>
        <View style={styles.infoItem}>
          <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>{tt.phaseDisplay.targetFreq}</ThemedText>
          <ThemedText style={[styles.infoValue, { color: textColor }]}>
            {targetFreq > 0 ? `${targetFreq.toFixed(2)} Hz` : '—'}
          </ThemedText>
        </View>
        <View style={styles.infoItem}>
          <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>{tt.phaseDisplay.deviation}</ThemedText>
          <ThemedText style={[styles.infoValue, { color: getStatusColor() }]}>
            {isActive ? `${centsDeviation > 0 ? '+' : ''}${centsDeviation.toFixed(1)}¢` : '—'}
          </ThemedText>
        </View>
      </View>

      {/* Legend */}
      <ThemedText style={[styles.legendText, { color: textSecondary }]}>
        {tt.phaseDisplay.stoppedMeansInTune} · P1-P{numRows} = {tt.phaseDisplay.partials}
      </ThemedText>
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
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  phaseRows: {
    gap: 4,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowLabel: {
    fontSize: 11,
    fontWeight: '600',
    width: 24,
    textAlign: 'center',
    lineHeight: 14,
  },
  phaseTrack: {
    height: 20,
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: 'rgba(128,128,128,0.05)',
  },
  squaresContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  phaseSquare: {
    position: 'absolute',
    top: 2,
    borderRadius: 2,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  infoItem: {
    alignItems: 'center',
    gap: 2,
  },
  infoLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 12,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  legendText: {
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 12,
  },
});
