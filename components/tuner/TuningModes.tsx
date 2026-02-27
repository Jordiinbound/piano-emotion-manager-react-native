/**
 * TuningModes — Modes d'afinació professionals
 * 
 * Quatre modes predefinits que configuren automàticament:
 * - Ponderació de parcials (PartialWeighting)
 * - Rang del medidor
 * - Llindar de soroll
 * - Factor d'overpull
 * - Tolerància d'estabilitat
 * 
 * Modes:
 * 1. Concert: Stretch ampli, alta precisió, per sales grans
 * 2. Estudi: Equilibrat, per gravació
 * 3. Pràctica: Stretch mínim, tolerant, per ús domèstic
 * 4. Històric: Sense stretch, per instruments d'època
 */
import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { type PartialWeights, WEIGHT_PRESETS } from './PartialWeighting';
import { useLanguage } from '@/contexts/language-context';
import { getTunerTranslation } from '@/locales/tuner-translations';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TuningModeConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** Partial weights preset */
  partialWeights: PartialWeights;
  /** Meter range in cents */
  meterRange: number;
  /** Noise gate threshold */
  noiseGateThreshold: number;
  /** Overpull factor */
  overpullFactor: number;
  /** Stability threshold in cents */
  stabilityThreshold: number;
  /** EMA smoothing factor */
  emaSmoothingFactor: number;
  /** Use stretch tuning */
  useStretchTuning: boolean;
  /** Recommended concert pitch */
  recommendedPitch: number;
}

export interface TuningModesProps {
  /** Currently selected mode */
  selectedModeId: string;
  /** Callback when mode changes */
  onModeChange: (mode: TuningModeConfig) => void;
}

// ─── Mode Definitions ───────────────────────────────────────────────────────

export const TUNING_MODES: TuningModeConfig[] = [
  {
    id: 'concert',
    name: 'concert',
    icon: '🎵',
    description: 'concertDesc',
    partialWeights: WEIGHT_PRESETS[0].weights,
    meterRange: 25,
    noiseGateThreshold: 0.012,
    overpullFactor: 2.0,
    stabilityThreshold: 0.5,
    emaSmoothingFactor: 0.25,
    useStretchTuning: true,
    recommendedPitch: 440,
  },
  {
    id: 'studio',
    name: 'studio',
    icon: '🎙️',
    description: 'studioDesc',
    partialWeights: WEIGHT_PRESETS[1].weights,
    meterRange: 30,
    noiseGateThreshold: 0.008,
    overpullFactor: 1.8,
    stabilityThreshold: 0.8,
    emaSmoothingFactor: 0.35,
    useStretchTuning: true,
    recommendedPitch: 440,
  },
  {
    id: 'practice',
    name: 'practice',
    icon: '🏠',
    description: 'practiceDesc',
    partialWeights: WEIGHT_PRESETS[2].weights,
    meterRange: 50,
    noiseGateThreshold: 0.006,
    overpullFactor: 1.5,
    stabilityThreshold: 1.5,
    emaSmoothingFactor: 0.45,
    useStretchTuning: true,
    recommendedPitch: 440,
  },
  {
    id: 'historic',
    name: 'historic',
    icon: '🏛️',
    description: 'historicDesc',
    partialWeights: WEIGHT_PRESETS[3].weights,
    meterRange: 30,
    noiseGateThreshold: 0.008,
    overpullFactor: 1.3,
    stabilityThreshold: 1.0,
    emaSmoothingFactor: 0.35,
    useStretchTuning: false,
    recommendedPitch: 415,
  },
];

export const DEFAULT_TUNING_MODE = TUNING_MODES[1]; // Studio

// ─── Component ──────────────────────────────────────────────────────────────

export function TuningModes({
  selectedModeId,
  onModeChange,
}: TuningModesProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surface = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const { currentLanguage } = useLanguage();
  const tt = getTunerTranslation(currentLanguage);

  const handleSelect = useCallback((mode: TuningModeConfig) => {
    onModeChange(mode);
    if (Platform.OS !== 'web') {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    }
  }, [onModeChange]);

  const selectedMode = TUNING_MODES.find(m => m.id === selectedModeId) ?? DEFAULT_TUNING_MODE;

  const modeColors: Record<string, string> = {
    concert: '#6366F1',
    studio: '#1B6B93',
    practice: '#10B981',
    historic: '#8B5CF6',
  };

  return (
    <View style={[styles.container, { backgroundColor: surface, borderColor }]}>
      <ThemedText style={[styles.title, { color: textColor }]}>{tt.tuningModes.title}</ThemedText>

      {/* Mode cards */}
      <View style={styles.modesGrid}>
        {TUNING_MODES.map(mode => {
          const isSelected = mode.id === selectedModeId;
          const color = modeColors[mode.id] ?? '#1B6B93';
          return (
            <TouchableOpacity
              key={mode.id}
              onPress={() => handleSelect(mode)}
              activeOpacity={0.7}
              style={[
                styles.modeCard,
                {
                  backgroundColor: isSelected ? color + '15' : 'transparent',
                  borderColor: isSelected ? color : borderColor,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
            >
              <ThemedText style={styles.modeIcon}>{mode.icon}</ThemedText>
              <ThemedText
                style={[
                  styles.modeName,
                  { color: isSelected ? color : textColor, fontWeight: isSelected ? '700' : '500' },
                ]}
              >
                {tt.tuningModes[mode.name as keyof typeof tt.tuningModes] ?? mode.name}
              </ThemedText>
              {isSelected && (
                <View style={[styles.selectedDot, { backgroundColor: color }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected mode details */}
      <View style={[styles.detailsCard, { backgroundColor: (modeColors[selectedModeId] ?? '#1B6B93') + '08', borderColor }]}>
        <ThemedText style={[styles.detailsDescription, { color: textSecondary }]}>
          {tt.tuningModes[selectedMode.description as keyof typeof tt.tuningModes] ?? selectedMode.description}
        </ThemedText>

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>{tt.tuningModes.range}</ThemedText>
            <ThemedText style={[styles.detailValue, { color: textColor }]}>±{selectedMode.meterRange}¢</ThemedText>
          </View>
          <View style={styles.detailItem}>
            <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>{tt.tuningModes.overpull}</ThemedText>
            <ThemedText style={[styles.detailValue, { color: textColor }]}>×{selectedMode.overpullFactor}</ThemedText>
          </View>
          <View style={styles.detailItem}>
            <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>{tt.tuningModes.stability}</ThemedText>
            <ThemedText style={[styles.detailValue, { color: textColor }]}>{selectedMode.stabilityThreshold}¢</ThemedText>
          </View>
          <View style={styles.detailItem}>
            <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>{tt.tuningModes.pitch}</ThemedText>
            <ThemedText style={[styles.detailValue, { color: textColor }]}>A={selectedMode.recommendedPitch}</ThemedText>
          </View>
          <View style={styles.detailItem}>
            <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>{tt.tuningModes.stretch}</ThemedText>
            <ThemedText style={[styles.detailValue, { color: selectedMode.useStretchTuning ? '#10B981' : '#EF4444' }]}>
              {selectedMode.useStretchTuning ? tt.tuningModes.yes : tt.tuningModes.no}
            </ThemedText>
          </View>
          <View style={styles.detailItem}>
            <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>{tt.tuningModes.smoothing}</ThemedText>
            <ThemedText style={[styles.detailValue, { color: textColor }]}>{(selectedMode.emaSmoothingFactor * 100).toFixed(0)}%</ThemedText>
          </View>
        </View>
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
    gap: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  modesGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  modeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    gap: 4,
    position: 'relative',
  },
  modeIcon: {
    fontSize: 20,
    lineHeight: 26,
  },
  modeName: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  selectedDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  detailsCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  detailsDescription: {
    fontSize: 12,
    lineHeight: 18,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  detailItem: {
    width: '30%',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 12,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
});
