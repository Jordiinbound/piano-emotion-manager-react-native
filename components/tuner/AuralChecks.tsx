/**
 * AuralChecks — Verificació auditiva d'intervals
 * 
 * Calcula i mostra els beat rates esperats per als intervals estàndard
 * d'afinació professional de pianos. Basat en TuneLab (capítol 3):
 * 
 * Intervals verificats:
 * - Octaves (2:1): batiments entre parcial 2 inferior i parcial 1 superior
 * - Quintes (3:2): batiments entre parcial 3 inferior i parcial 2 superior
 * - Quartes (4:3): batiments entre parcial 4 inferior i parcial 3 superior
 * - Terceres majors (5:4): batiments entre parcial 5 inferior i parcial 4 superior
 * - Sextes majors (5:3): batiments entre parcial 5 inferior i parcial 3 superior
 * 
 * Beat rate = |f_upper_partial - f_lower_partial|
 * Per a un piano ben afinat, els beat rates segueixen patrons progressius.
 */
import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  getEqualTemperamentFrequency,
  getExpectedInharmonicity,
  getInharmonicPartialFrequency,
  getFullNoteName,
  getNoteName,
  getOctave,
  TOTAL_KEYS,
} from '@/constants/piano-tuning';
import { useLanguage } from '@/contexts/language-context';
import { getTunerTranslation } from '@/locales/tuner-translations';

// ─── Types ──────────────────────────────────────────────────────────────────

interface IntervalCheck {
  /** Interval name */
  name: string;
  /** Short name for compact display */
  shortName: string;
  /** Lower note key index */
  lowerKey: number;
  /** Upper note key index */
  upperKey: number;
  /** Partial number of lower note */
  lowerPartial: number;
  /** Partial number of upper note */
  upperPartial: number;
  /** Expected beat rate (beats per second) */
  expectedBeatRate: number;
  /** Measured beat rate (if available) */
  measuredBeatRate: number | null;
  /** Quality assessment */
  quality: 'excellent' | 'good' | 'acceptable' | 'poor';
  /** Color for quality */
  color: string;
}

export interface AuralChecksProps {
  /** Currently selected key index */
  selectedKeyIndex: number;
  /** Concert pitch */
  concertPitch: number;
  /** Current measurements map */
  measurements: Map<number, { cents: number; inharmonicity: number | null; timestamp: number }>;
  /** Callback to play a reference tone */
  onPlayInterval?: (lowerKey: number, upperKey: number) => void;
  /** Whether the tuner is active */
  isActive: boolean;
}

// ─── Beat Rate Calculation ──────────────────────────────────────────────────

function calculateBeatRate(
  lowerKey: number,
  upperKey: number,
  lowerPartial: number,
  upperPartial: number,
  concertPitch: number,
  measurements?: Map<number, { cents: number; inharmonicity: number | null }>,
): { expected: number; measured: number | null } {
  const fLower = getEqualTemperamentFrequency(lowerKey, concertPitch);
  const fUpper = getEqualTemperamentFrequency(upperKey, concertPitch);
  const BLower = getExpectedInharmonicity(fLower);
  const BUpper = getExpectedInharmonicity(fUpper);

  // Expected beat rate (with inharmonicity)
  const pLower = getInharmonicPartialFrequency(fLower, lowerPartial, BLower);
  const pUpper = getInharmonicPartialFrequency(fUpper, upperPartial, BUpper);
  const expected = Math.abs(pLower - pUpper);

  // Measured beat rate (if we have measurements for both keys)
  let measured: number | null = null;
  if (measurements) {
    const mLower = measurements.get(lowerKey);
    const mUpper = measurements.get(upperKey);
    if (mLower && mUpper) {
      const actualFLower = fLower * Math.pow(2, mLower.cents / 1200);
      const actualFUpper = fUpper * Math.pow(2, mUpper.cents / 1200);
      const actualBLower = mLower.inharmonicity ?? BLower;
      const actualBUpper = mUpper.inharmonicity ?? BUpper;
      const actualPLower = getInharmonicPartialFrequency(actualFLower, lowerPartial, actualBLower);
      const actualPUpper = getInharmonicPartialFrequency(actualFUpper, upperPartial, actualBUpper);
      measured = Math.abs(actualPLower - actualPUpper);
    }
  }

  return { expected, measured };
}

function assessQuality(expected: number, measured: number | null): { quality: IntervalCheck['quality']; color: string } {
  if (measured === null) return { quality: 'good', color: '#9BA1A6' };
  const diff = Math.abs(measured - expected);
  const tolerance = Math.max(0.3, expected * 0.15);
  if (diff <= tolerance * 0.5) return { quality: 'excellent', color: '#10B981' };
  if (diff <= tolerance) return { quality: 'good', color: '#22C55E' };
  if (diff <= tolerance * 2) return { quality: 'acceptable', color: '#F59E0B' };
  return { quality: 'poor', color: '#EF4444' };
}

// ─── Generate Checks for a Key ─────────────────────────────────────────────

function generateChecksForKey(
  keyIndex: number,
  concertPitch: number,
  measurements: Map<number, { cents: number; inharmonicity: number | null }>,
): IntervalCheck[] {
  const checks: IntervalCheck[] = [];

  // Intervals to check (semitone offsets and partial ratios)
  const intervals: {
    name: string;
    shortName: string;
    semitones: number;
    lowerPartial: number;
    upperPartial: number;
  }[] = [
    { name: tt.auralChecks.octave, shortName: '8va', semitones: 12, lowerPartial: 2, upperPartial: 1 },
    { name: tt.auralChecks.fifth, shortName: '5ta', semitones: 7, lowerPartial: 3, upperPartial: 2 },
    { name: tt.auralChecks.fourth, shortName: '4ta', semitones: 5, lowerPartial: 4, upperPartial: 3 },
    { name: 'Tercera Major', shortName: '3ra M', semitones: 4, lowerPartial: 5, upperPartial: 4 },
    { name: 'Sexta Major', shortName: '6ta M', semitones: 9, lowerPartial: 5, upperPartial: 3 },
  ];

  for (const interval of intervals) {
    // Check both directions: key as lower note and key as upper note
    const upperKey = keyIndex + interval.semitones;
    const lowerKey = keyIndex - interval.semitones;

    if (upperKey < TOTAL_KEYS) {
      const { expected, measured } = calculateBeatRate(
        keyIndex, upperKey,
        interval.lowerPartial, interval.upperPartial,
        concertPitch, measurements,
      );
      const { quality, color } = assessQuality(expected, measured);
      checks.push({
        name: `${interval.name} ↑`,
        shortName: `${interval.shortName}↑`,
        lowerKey: keyIndex,
        upperKey,
        lowerPartial: interval.lowerPartial,
        upperPartial: interval.upperPartial,
        expectedBeatRate: expected,
        measuredBeatRate: measured,
        quality,
        color,
      });
    }

    if (lowerKey >= 0) {
      const { expected, measured } = calculateBeatRate(
        lowerKey, keyIndex,
        interval.lowerPartial, interval.upperPartial,
        concertPitch, measurements,
      );
      const { quality, color } = assessQuality(expected, measured);
      checks.push({
        name: `${interval.name} ↓`,
        shortName: `${interval.shortName}↓`,
        lowerKey,
        upperKey: keyIndex,
        lowerPartial: interval.lowerPartial,
        upperPartial: interval.upperPartial,
        expectedBeatRate: expected,
        measuredBeatRate: measured,
        quality,
        color,
      });
    }
  }

  return checks;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AuralChecks({
  selectedKeyIndex,
  concertPitch,
  measurements,
  onPlayInterval,
  isActive,
}: AuralChecksProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surface = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const { currentLanguage } = useLanguage();
  const tt = getTunerTranslation(currentLanguage);

  const checks = useMemo(() => {
    if (selectedKeyIndex < 0 || selectedKeyIndex >= TOTAL_KEYS) return [];
    return generateChecksForKey(selectedKeyIndex, concertPitch, measurements);
  }, [selectedKeyIndex, concertPitch, measurements]);

  const handlePlayInterval = useCallback((lowerKey: number, upperKey: number) => {
    if (Platform.OS !== 'web') {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    }
    onPlayInterval?.(lowerKey, upperKey);
  }, [onPlayInterval]);

  if (selectedKeyIndex < 0 || selectedKeyIndex >= TOTAL_KEYS) {
    return (
      <View style={[styles.container, { backgroundColor: surface, borderColor }]}>
        <ThemedText style={[styles.title, { color: textColor }]}>{tt.auralChecks.title}</ThemedText>
        <ThemedText style={[styles.placeholder, { color: textSecondary }]}>
          {tt.auralChecks.subtitle}
        </ThemedText>
      </View>
    );
  }

  const noteName = getFullNoteName(selectedKeyIndex);

  return (
    <View style={[styles.container, { backgroundColor: surface, borderColor }]}>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: textColor }]}>{tt.auralChecks.title}</ThemedText>
        <View style={[styles.noteBadge, { backgroundColor: '#1B6B93' + '20' }]}>
          <ThemedText style={[styles.noteBadgeText, { color: '#1B6B93' }]}>{noteName}</ThemedText>
        </View>
      </View>

      <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
        Beat rates esperats per als intervals des de {noteName}
      </ThemedText>

      <ScrollView style={styles.checksList} showsVerticalScrollIndicator={false}>
        {checks.map((check, i) => (
          <TouchableOpacity
            key={`${check.name}-${i}`}
            onPress={() => handlePlayInterval(check.lowerKey, check.upperKey)}
            activeOpacity={0.7}
            style={[styles.checkRow, { borderBottomColor: borderColor }]}
          >
            {/* Quality indicator */}
            <View style={[styles.qualityDot, { backgroundColor: check.color }]} />

            {/* Interval info */}
            <View style={styles.intervalInfo}>
              <ThemedText style={[styles.intervalName, { color: textColor }]}>
                {check.shortName}
              </ThemedText>
              <ThemedText style={[styles.intervalNotes, { color: textSecondary }]}>
                {getFullNoteName(check.lowerKey)} — {getFullNoteName(check.upperKey)}
              </ThemedText>
            </View>

            {/* Partial ratio */}
            <ThemedText style={[styles.partialRatio, { color: textSecondary }]}>
              {check.lowerPartial}:{check.upperPartial}
            </ThemedText>

            {/* Beat rates */}
            <View style={styles.beatRates}>
              <ThemedText style={[styles.expectedRate, { color: textSecondary }]}>
                {check.expectedBeatRate.toFixed(1)}
              </ThemedText>
              {check.measuredBeatRate !== null && (
                <ThemedText style={[styles.measuredRate, { color: check.color, fontWeight: '700' }]}>
                  {check.measuredBeatRate.toFixed(1)}
                </ThemedText>
              )}
            </View>

            {/* Play button */}
            <ThemedText style={[styles.playIcon, { color: textSecondary }]}>♪</ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Legend */}
      <View style={[styles.legend, { borderTopColor: borderColor }]}>
        <ThemedText style={[styles.legendText, { color: textSecondary }]}>
          {tt.auralChecks.expectedBeatRate} → {tt.auralChecks.measuredBeatRate} ({tt.auralChecks.beatsPerSecond}) · {tt.auralChecks.tapToPlay}
        </ThemedText>
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
  subtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  noteBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  noteBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  placeholder: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
    lineHeight: 18,
  },
  checksList: {
    maxHeight: 280,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    gap: 8,
  },
  qualityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  intervalInfo: {
    flex: 1,
    gap: 1,
  },
  intervalName: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  intervalNotes: {
    fontSize: 10,
    lineHeight: 13,
  },
  partialRatio: {
    fontSize: 11,
    fontWeight: '500',
    width: 28,
    textAlign: 'center',
    lineHeight: 14,
  },
  beatRates: {
    alignItems: 'flex-end',
    width: 55,
    gap: 1,
  },
  expectedRate: {
    fontSize: 11,
    lineHeight: 14,
  },
  measuredRate: {
    fontSize: 12,
    lineHeight: 16,
  },
  playIcon: {
    fontSize: 16,
    width: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  legend: {
    borderTopWidth: 1,
    paddingTop: 6,
  },
  legendText: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
});
