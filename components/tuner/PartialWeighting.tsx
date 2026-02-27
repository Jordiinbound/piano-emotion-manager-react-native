/**
 * PartialWeighting — Motor de ponderació de parcials
 * 
 * Permet configurar els pesos relatius dels intervals d'octava
 * per calcular la desviació ponderada. Basat en PianoMeter/CyberTuner:
 * - 2:1 (octava simple): parcial 2 de la nota inferior vs parcial 1 de la superior
 * - 4:2 (doble octava): parcial 4 de la inferior vs parcial 2 de la superior
 * - 4:1 (doble octava directa): parcial 4 de la inferior vs parcial 1 de la superior (2 octaves)
 * - 6:3 (triple): parcial 6 de la inferior vs parcial 3 de la superior
 * 
 * Pesos més alts en 4:1 i 6:3 donen més "stretch" (estirament) a les octaves.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Svg, { Line, Circle, Text as SvgText, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  getInharmonicPartialFrequency,
  getExpectedInharmonicity,
  getEqualTemperamentFrequency,
  frequencyToCents,
  getFullNoteName,
  TOTAL_KEYS,
} from '@/constants/piano-tuning';
import { useLanguage } from '@/contexts/language-context';
import { getTunerTranslation } from '@/locales/tuner-translations';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PartialWeights {
  /** Weight for 2:1 octave (partial 2 lower vs partial 1 upper) */
  octave21: number;
  /** Weight for 4:2 double octave (partial 4 lower vs partial 2 upper) */
  octave42: number;
  /** Weight for 4:1 double octave direct (partial 4 lower vs partial 1 upper, 2 octaves) */
  octave41: number;
  /** Weight for 6:3 triple (partial 6 lower vs partial 3 upper) */
  octave63: number;
}

export interface PartialWeightingProps {
  /** Current partial weights */
  weights: PartialWeights;
  /** Callback when weights change */
  onWeightsChange: (weights: PartialWeights) => void;
  /** Concert pitch for calculations */
  concertPitch: number;
  /** Selected key index for preview */
  selectedKeyIndex: number;
  /** Display width */
  width?: number;
}

// ─── Presets ────────────────────────────────────────────────────────────────

export const WEIGHT_PRESETS: { id: string; nameKey: 'concert' | 'studio' | 'practice' | 'historic'; weights: PartialWeights }[] = [
  {
    id: 'concert',
    nameKey: 'concert',
    weights: { octave21: 0.2, octave42: 0.3, octave41: 0.35, octave63: 0.15 },
  },
  {
    id: 'studio',
    nameKey: 'studio',
    weights: { octave21: 0.35, octave42: 0.35, octave41: 0.2, octave63: 0.1 },
  },
  {
    id: 'practice',
    nameKey: 'practice',
    weights: { octave21: 0.6, octave42: 0.25, octave41: 0.1, octave63: 0.05 },
  },
  {
    id: 'historic',
    nameKey: 'historic',
    weights: { octave21: 1.0, octave42: 0.0, octave41: 0.0, octave63: 0.0 },
  },
];

export const DEFAULT_WEIGHTS: PartialWeights = WEIGHT_PRESETS[1].weights; // Studio

// ─── Calculation ────────────────────────────────────────────────────────────

/**
 * Calculate the weighted stretch deviation for a given key.
 * Returns the optimal deviation in cents that minimizes weighted beat rates.
 */
export function calculateWeightedStretch(
  keyIndex: number,
  concertPitch: number,
  weights: PartialWeights,
): number {
  if (keyIndex < 0 || keyIndex >= TOTAL_KEYS) return 0;

  const f = getEqualTemperamentFrequency(keyIndex, concertPitch);
  const B = getExpectedInharmonicity(f);

  let totalWeight = 0;
  let weightedDeviation = 0;

  // 2:1 octave: compare partial 2 of key-12 with partial 1 of key
  if (keyIndex >= 12 && weights.octave21 > 0) {
    const fLower = getEqualTemperamentFrequency(keyIndex - 12, concertPitch);
    const BLower = getExpectedInharmonicity(fLower);
    const p2Lower = getInharmonicPartialFrequency(fLower, 2, BLower);
    const p1Upper = getInharmonicPartialFrequency(f, 1, B);
    const dev = frequencyToCents(p1Upper, p2Lower);
    weightedDeviation += weights.octave21 * dev;
    totalWeight += weights.octave21;
  }

  // 4:2 octave: compare partial 4 of key-12 with partial 2 of key
  if (keyIndex >= 12 && weights.octave42 > 0) {
    const fLower = getEqualTemperamentFrequency(keyIndex - 12, concertPitch);
    const BLower = getExpectedInharmonicity(fLower);
    const p4Lower = getInharmonicPartialFrequency(fLower, 4, BLower);
    const p2Upper = getInharmonicPartialFrequency(f, 2, B);
    const dev = frequencyToCents(p2Upper, p4Lower);
    weightedDeviation += weights.octave42 * dev;
    totalWeight += weights.octave42;
  }

  // 4:1 double octave: compare partial 4 of key-24 with partial 1 of key
  if (keyIndex >= 24 && weights.octave41 > 0) {
    const fLower = getEqualTemperamentFrequency(keyIndex - 24, concertPitch);
    const BLower = getExpectedInharmonicity(fLower);
    const p4Lower = getInharmonicPartialFrequency(fLower, 4, BLower);
    const p1Upper = getInharmonicPartialFrequency(f, 1, B);
    const dev = frequencyToCents(p1Upper, p4Lower);
    weightedDeviation += weights.octave41 * dev;
    totalWeight += weights.octave41;
  }

  // 6:3 triple: compare partial 6 of key-12 with partial 3 of key
  if (keyIndex >= 12 && weights.octave63 > 0) {
    const fLower = getEqualTemperamentFrequency(keyIndex - 12, concertPitch);
    const BLower = getExpectedInharmonicity(fLower);
    const p6Lower = getInharmonicPartialFrequency(fLower, 6, BLower);
    const p3Upper = getInharmonicPartialFrequency(f, 3, B);
    const dev = frequencyToCents(p3Upper, p6Lower);
    weightedDeviation += weights.octave63 * dev;
    totalWeight += weights.octave63;
  }

  return totalWeight > 0 ? weightedDeviation / totalWeight : 0;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PartialWeighting({
  weights,
  onWeightsChange,
  concertPitch,
  selectedKeyIndex,
  width = 340,
}: PartialWeightingProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const { currentLanguage } = useLanguage();
  const tt = getTunerTranslation(currentLanguage);
  const [activePreset, setActivePreset] = useState<string | null>('studio');

  const handlePreset = useCallback((preset: typeof WEIGHT_PRESETS[0]) => {
    setActivePreset(preset.id);
    onWeightsChange(preset.weights);
    if (Platform.OS !== 'web') {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    }
  }, [onWeightsChange]);

  const adjustWeight = useCallback((key: keyof PartialWeights, delta: number) => {
    const newVal = Math.max(0, Math.min(1, weights[key] + delta));
    const newWeights = { ...weights, [key]: Math.round(newVal * 100) / 100 };
    // Normalize to sum = 1
    const sum = newWeights.octave21 + newWeights.octave42 + newWeights.octave41 + newWeights.octave63;
    if (sum > 0) {
      newWeights.octave21 = Math.round((newWeights.octave21 / sum) * 100) / 100;
      newWeights.octave42 = Math.round((newWeights.octave42 / sum) * 100) / 100;
      newWeights.octave41 = Math.round((newWeights.octave41 / sum) * 100) / 100;
      newWeights.octave63 = Math.round((newWeights.octave63 / sum) * 100) / 100;
    }
    setActivePreset(null);
    onWeightsChange(newWeights);
    if (Platform.OS !== 'web') {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    }
  }, [weights, onWeightsChange]);

  // Preview: stretch curve for current weights
  const stretchPreview = useMemo(() => {
    const points: { key: number; cents: number }[] = [];
    for (let k = 0; k < TOTAL_KEYS; k += 2) {
      points.push({ key: k, cents: calculateWeightedStretch(k, concertPitch, weights) });
    }
    return points;
  }, [concertPitch, weights]);

  const currentStretch = selectedKeyIndex >= 0
    ? calculateWeightedStretch(selectedKeyIndex, concertPitch, weights)
    : 0;

  // SVG chart
  const chartH = 100;
  const pad = { top: 10, right: 10, bottom: 20, left: 35 };
  const plotW = width - pad.left - pad.right;
  const plotH = chartH - pad.top - pad.bottom;
  const maxCents = Math.max(10, ...stretchPreview.map(p => Math.abs(p.cents))) * 1.2;

  const xScale = (k: number) => pad.left + (k / 87) * plotW;
  const yScale = (c: number) => pad.top + plotH / 2 - (c / maxCents) * (plotH / 2);

  const intervals: { key: keyof PartialWeights; label: string; ratio: string; color: string }[] = [
    { key: 'octave21', label: tt.partialWeighting.octave21, ratio: '2:1', color: '#1B6B93' },
    { key: 'octave42', label: tt.partialWeighting.octave42, ratio: '4:2', color: '#8B5CF6' },
    { key: 'octave41', label: tt.partialWeighting.octave41, ratio: '4:1', color: '#F59E0B' },
    { key: 'octave63', label: tt.partialWeighting.octave63, ratio: '6:3', color: '#EF4444' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: surface, borderColor: border }]}>
      <ThemedText style={[styles.title, { color: textColor }]}>{tt.partialWeighting.title}</ThemedText>

      {/* Presets */}
      <View style={styles.presetRow}>
        {WEIGHT_PRESETS.map(preset => (
          <TouchableOpacity
            key={preset.id}
            onPress={() => handlePreset(preset)}
            style={[
              styles.presetChip,
              {
                backgroundColor: activePreset === preset.id ? '#1B6B93' + '20' : 'transparent',
                borderColor: activePreset === preset.id ? '#1B6B93' : border,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.presetText,
                { color: activePreset === preset.id ? '#1B6B93' : textSecondary },
              ]}
            >
              {tt.partialWeighting[preset.nameKey]}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Weight sliders */}
      {intervals.map(interval => (
        <View key={interval.key} style={styles.weightRow}>
          <View style={[styles.weightDot, { backgroundColor: interval.color }]} />
          <ThemedText style={[styles.weightLabel, { color: textColor }]}>{interval.ratio}</ThemedText>
          <View style={[styles.weightBar, { backgroundColor: border }]}>
            <View
              style={[
                styles.weightFill,
                {
                  width: `${weights[interval.key] * 100}%` as any,
                  backgroundColor: interval.color,
                },
              ]}
            />
          </View>
          <ThemedText style={[styles.weightValue, { color: textSecondary }]}>
            {(weights[interval.key] * 100).toFixed(0)}%
          </ThemedText>
          <TouchableOpacity
            onPress={() => adjustWeight(interval.key, -0.05)}
            style={[styles.adjustBtn, { borderColor: border }]}
          >
            <ThemedText style={[styles.adjustBtnText, { color: textSecondary }]}>−</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => adjustWeight(interval.key, 0.05)}
            style={[styles.adjustBtn, { borderColor: border }]}
          >
            <ThemedText style={[styles.adjustBtnText, { color: textSecondary }]}>+</ThemedText>
          </TouchableOpacity>
        </View>
      ))}

      {/* Stretch preview chart */}
      <View style={styles.chartSection}>
        <ThemedText style={[styles.chartLabel, { color: textSecondary }]}>
          {tt.partialWeighting.moreStretch}
        </ThemedText>
        <Svg width={width - 24} height={chartH}>
          {/* Zero line */}
          <Line
            x1={pad.left} y1={yScale(0)}
            x2={width - 24 - pad.right} y2={yScale(0)}
            stroke={border} strokeWidth={1}
          />
          {/* Curve */}
          {stretchPreview.map((p, i) => {
            if (i === 0) return null;
            const prev = stretchPreview[i - 1];
            return (
              <Line
                key={`line-${i}`}
                x1={xScale(prev.key)} y1={yScale(prev.cents)}
                x2={xScale(p.key)} y2={yScale(p.cents)}
                stroke="#1B6B93" strokeWidth={1.5}
              />
            );
          })}
          {/* Selected key marker */}
          {selectedKeyIndex >= 0 && (
            <Circle
              cx={xScale(selectedKeyIndex)}
              cy={yScale(currentStretch)}
              r={4}
              fill="#1B6B93"
            />
          )}
          {/* Labels */}
          <SvgText x={pad.left} y={chartH - 4} fontSize={9} fill={textSecondary}>A0</SvgText>
          <SvgText x={xScale(87)} y={chartH - 4} fontSize={9} fill={textSecondary} textAnchor="end">C8</SvgText>
        </Svg>
      </View>

      {/* Current key info */}
      {selectedKeyIndex >= 0 && (
        <View style={[styles.infoRow, { borderTopColor: border }]}>
          <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>
            {getFullNoteName(selectedKeyIndex)}
          </ThemedText>
          <ThemedText style={[styles.infoValue, { color: '#1B6B93' }]}>
            {currentStretch > 0 ? '+' : ''}{currentStretch.toFixed(2)} cents stretch
          </ThemedText>
        </View>
      )}
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
    gap: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  weightLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 28,
    lineHeight: 16,
  },
  weightBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  weightFill: {
    height: '100%',
    borderRadius: 3,
  },
  weightValue: {
    fontSize: 11,
    width: 32,
    textAlign: 'right',
    lineHeight: 14,
  },
  adjustBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustBtnText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  chartSection: {
    gap: 4,
  },
  chartLabel: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
});
