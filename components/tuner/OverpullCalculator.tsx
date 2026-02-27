/**
 * OverpullCalculator — Calculadora d'overpull professional
 * 
 * Basat en TuneLab (capítol 5): sistema de dues fases per compensar
 * la relaxació de les cordes i la redistribució de tensió del bastidor.
 * 
 * Fase 1: Pre-mesurament
 *   - Afinar la nota al pitch objectiu
 *   - Esperar 2-3 segons
 *   - Mesurar la caiguda (drift)
 * 
 * Fase 2: Overpull
 *   - Calcular l'overpull necessari: overpull = drift × factor
 *   - Factor típic: 1.5-2.0 (configurable)
 *   - Límit de seguretat: mai més de 25 cents d'overpull
 *   - Afinar al pitch objectiu + overpull
 * 
 * La idea: si la corda cau 3 cents després d'afinar, afinem 4.5-6 cents
 * per sobre perquè quan es relaxi, quedi al pitch correcte.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getFullNoteName } from '@/constants/piano-tuning';
import { useLanguage } from '@/contexts/language-context';
import { getTunerTranslation } from '@/locales/tuner-translations';

// ─── Types ──────────────────────────────────────────────────────────────────

type OverpullPhase = 'idle' | 'measuring' | 'waiting' | 'calculated' | 'applying';

export interface OverpullResult {
  /** Measured drift in cents (how much the note dropped) */
  measuredDrift: number;
  /** Calculated overpull in cents */
  overpullCents: number;
  /** Target deviation including overpull */
  targetWithOverpull: number;
  /** Confidence in the measurement */
  confidence: number;
}

export interface OverpullCalculatorProps {
  /** Current key index */
  keyIndex: number;
  /** Current cents deviation */
  currentCents: number;
  /** Whether the tuner is actively detecting */
  isActive: boolean;
  /** Whether the note is stable */
  isStable: boolean;
  /** Overpull factor (1.0-3.0, default 1.8) */
  overpullFactor?: number;
  /** Maximum overpull in cents (safety limit) */
  maxOverpull?: number;
  /** Wait time in seconds for drift measurement */
  waitTime?: number;
  /** Callback when overpull is calculated */
  onOverpullCalculated?: (result: OverpullResult) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function OverpullCalculator({
  keyIndex,
  currentCents,
  isActive,
  isStable,
  overpullFactor = 1.8,
  maxOverpull = 25,
  waitTime = 3,
  onOverpullCalculated,
}: OverpullCalculatorProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surface = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const { currentLanguage } = useLanguage();
  const tt = getTunerTranslation(currentLanguage);

  const [phase, setPhase] = useState<OverpullPhase>('idle');
  const [initialCents, setInitialCents] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(0);
  const [result, setResult] = useState<OverpullResult | null>(null);
  const [driftHistory, setDriftHistory] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const samplesRef = useRef<number[]>([]);

  // Reset when key changes
  useEffect(() => {
    setPhase('idle');
    setResult(null);
    setDriftHistory([]);
    samplesRef.current = [];
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [keyIndex]);

  // Collect samples during waiting phase
  useEffect(() => {
    if (phase === 'waiting' && isActive) {
      samplesRef.current.push(currentCents);
    }
  }, [phase, currentCents, isActive]);

  const startMeasurement = useCallback(() => {
    if (!isActive || !isStable) return;

    if (Platform.OS !== 'web') {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    }

    // Record initial position
    setInitialCents(currentCents);
    setPhase('measuring');
    samplesRef.current = [];

    // Brief pause to confirm initial position
    setTimeout(() => {
      setPhase('waiting');
      setCountdown(waitTime);

      // Start countdown
      let remaining = waitTime;
      timerRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);

        if (remaining <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }

          // Calculate drift from collected samples
          const samples = samplesRef.current;
          if (samples.length >= 3) {
            // Use last third of samples for final position
            const lastThird = samples.slice(Math.floor(samples.length * 0.67));
            const avgFinal = lastThird.reduce((s, v) => s + v, 0) / lastThird.length;
            const drift = avgFinal - currentCents; // Negative = note dropped

            // Calculate overpull
            const rawOverpull = Math.abs(drift) * overpullFactor;
            const clampedOverpull = Math.min(rawOverpull, maxOverpull);
            const direction = drift < 0 ? 1 : -1; // Overpull in opposite direction of drift

            const overpullResult: OverpullResult = {
              measuredDrift: drift,
              overpullCents: clampedOverpull * direction,
              targetWithOverpull: clampedOverpull * direction,
              confidence: samples.length >= 10 ? 0.9 : samples.length >= 5 ? 0.7 : 0.5,
            };

            setResult(overpullResult);
            setDriftHistory(prev => [...prev, drift]);
            setPhase('calculated');
            onOverpullCalculated?.(overpullResult);

            if (Platform.OS !== 'web') {
              try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
            }
          } else {
            // Not enough samples
            setPhase('idle');
            if (Platform.OS !== 'web') {
              try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
            }
          }
        }
      }, 1000);
    }, 500);
  }, [isActive, isStable, currentCents, waitTime, overpullFactor, maxOverpull, onOverpullCalculated]);

  const resetMeasurement = useCallback(() => {
    setPhase('idle');
    setResult(null);
    samplesRef.current = [];
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const noteName = keyIndex >= 0 ? getFullNoteName(keyIndex) : '—';

  // Phase-specific colors
  const phaseColor = {
    idle: textSecondary,
    measuring: '#F59E0B',
    waiting: '#3B82F6',
    calculated: '#10B981',
    applying: '#8B5CF6',
  }[phase];

  const phaseLabel = {
    idle: tt.overpull.ready,
    measuring: tt.overpull.measuring,
    waiting: `${tt.overpull.waiting}... ${countdown}s`,
    calculated: 'Overpull calculat',
    applying: 'Aplicant overpull...',
  }[phase];

  return (
    <View style={[styles.container, { backgroundColor: surface, borderColor }]}>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: textColor }]}>{tt.overpull.title}</ThemedText>
        <View style={[styles.phaseBadge, { backgroundColor: phaseColor + '20' }]}>
          <ThemedText style={[styles.phaseBadgeText, { color: phaseColor }]}>{noteName}</ThemedText>
        </View>
      </View>

      {/* Status */}
      <View style={[styles.statusRow, { borderColor: phaseColor + '30' }]}>
        <View style={[styles.statusDot, { backgroundColor: phaseColor }]} />
        <ThemedText style={[styles.statusText, { color: phaseColor }]}>{phaseLabel}</ThemedText>
      </View>

      {/* Action buttons */}
      {phase === 'idle' && (
        <View style={styles.actionSection}>
          <ThemedText style={[styles.instructions, { color: textSecondary }]}>
            1. Afineu la nota al pitch objectiu{'\n'}
            2. Premeu "Mesurar" quan sigui estable{'\n'}
            3. Espereu {waitTime}s sense tocar la corda{'\n'}
            4. L'overpull es calcularà automàticament
          </ThemedText>
          <TouchableOpacity
            onPress={startMeasurement}
            disabled={!isActive || !isStable}
            style={[
              styles.actionButton,
              {
                backgroundColor: isActive && isStable ? '#1B6B93' : '#1B6B93' + '40',
              },
            ]}
          >
            <ThemedText style={styles.actionButtonText}>
              {isActive && isStable ? tt.overpull.measureDrift : tt.overpull.waitingStable}
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Waiting animation */}
      {(phase === 'measuring' || phase === 'waiting') && (
        <View style={styles.waitingSection}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${phase === 'measuring' ? 10 : ((waitTime - countdown) / waitTime) * 100}%` as any,
                  backgroundColor: phaseColor,
                },
              ]}
            />
          </View>
          <ThemedText style={[styles.waitingHint, { color: textSecondary }]}>
            No toqueu la corda durant la mesura
          </ThemedText>
          <TouchableOpacity onPress={resetMeasurement} style={[styles.cancelButton, { borderColor }]}>
            <ThemedText style={[styles.cancelButtonText, { color: textSecondary }]}>{tt.overpull.cancel}</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Results */}
      {phase === 'calculated' && result && (
        <View style={styles.resultSection}>
          <View style={styles.resultGrid}>
            <View style={[styles.resultCard, { backgroundColor: borderColor + '30' }]}>
              <ThemedText style={[styles.resultLabel, { color: textSecondary }]}>Drift mesurat</ThemedText>
              <ThemedText style={[styles.resultValue, { color: result.measuredDrift < 0 ? '#EF4444' : '#F59E0B' }]}>
                {result.measuredDrift > 0 ? '+' : ''}{result.measuredDrift.toFixed(1)}¢
              </ThemedText>
            </View>
            <View style={[styles.resultCard, { backgroundColor: '#1B6B93' + '15' }]}>
              <ThemedText style={[styles.resultLabel, { color: textSecondary }]}>{tt.overpull.overpullAmount}</ThemedText>
              <ThemedText style={[styles.resultValue, { color: '#1B6B93' }]}>
                {result.overpullCents > 0 ? '+' : ''}{result.overpullCents.toFixed(1)}¢
              </ThemedText>
            </View>
          </View>

          <View style={[styles.targetRow, { backgroundColor: '#10B981' + '15', borderColor: '#10B981' + '30' }]}>
            <ThemedText style={[styles.targetLabel, { color: '#10B981' }]}>{tt.overpull.targetWithOverpull}</ThemedText>
            <ThemedText style={[styles.targetValue, { color: '#10B981' }]}>
              {result.targetWithOverpull > 0 ? '+' : ''}{result.targetWithOverpull.toFixed(1)} cents
            </ThemedText>
          </View>

          <View style={styles.resultActions}>
            <TouchableOpacity
              onPress={startMeasurement}
              disabled={!isActive || !isStable}
              style={[styles.retryButton, { borderColor }]}
            >
              <ThemedText style={[styles.retryButtonText, { color: textSecondary }]}>Repetir</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPhase('applying')}
              style={[styles.applyButton, { backgroundColor: '#1B6B93' }]}
            >
              <ThemedText style={styles.applyButtonText}>{tt.overpull.apply}</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Confidence */}
          <ThemedText style={[styles.confidenceText, { color: textSecondary }]}>
            {tt.overpull.confidence}: {(result.confidence * 100).toFixed(0)}% · {tt.overpull.factor}: ×{overpullFactor}
          </ThemedText>
        </View>
      )}

      {/* Applying mode */}
      {phase === 'applying' && result && (
        <View style={styles.applyingSection}>
          <ThemedText style={[styles.applyingTarget, { color: '#8B5CF6' }]}>
            Afineu a {result.targetWithOverpull > 0 ? '+' : ''}{result.targetWithOverpull.toFixed(1)} cents
          </ThemedText>
          <View style={styles.applyingGauge}>
            <View style={[styles.applyingBar, { backgroundColor: borderColor }]}>
              <View
                style={[
                  styles.applyingMarker,
                  {
                    left: `${50 + (currentCents / maxOverpull) * 40}%` as any,
                    backgroundColor: Math.abs(currentCents - result.targetWithOverpull) < 2 ? '#10B981' : '#F59E0B',
                  },
                ]}
              />
              <View
                style={[
                  styles.applyingTarget2,
                  {
                    left: `${50 + (result.targetWithOverpull / maxOverpull) * 40}%` as any,
                    backgroundColor: '#8B5CF6',
                  },
                ]}
              />
            </View>
          </View>
          <TouchableOpacity onPress={resetMeasurement} style={[styles.doneButton, { backgroundColor: '#10B981' }]}>
            <ThemedText style={styles.doneButtonText}>{tt.overpull.done}</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Drift history */}
      {driftHistory.length > 1 && (
        <View style={[styles.historySection, { borderTopColor: borderColor }]}>
          <ThemedText style={[styles.historyTitle, { color: textSecondary }]}>
            Historial de drift ({driftHistory.length} mesures)
          </ThemedText>
          <ThemedText style={[styles.historyAvg, { color: textColor }]}>
            Mitjana: {(driftHistory.reduce((s, v) => s + v, 0) / driftHistory.length).toFixed(1)}¢
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
  phaseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  phaseBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
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
  actionSection: {
    gap: 10,
  },
  instructions: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  waitingSection: {
    gap: 8,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  waitingHint: {
    fontSize: 11,
    lineHeight: 14,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  resultSection: {
    gap: 10,
  },
  resultGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  resultCard: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    gap: 4,
  },
  resultLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  resultValue: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  targetLabel: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  targetValue: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 8,
  },
  retryButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  confidenceText: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
  applyingSection: {
    gap: 10,
    alignItems: 'center',
  },
  applyingTarget: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  applyingGauge: {
    width: '100%',
    paddingVertical: 8,
  },
  applyingBar: {
    height: 8,
    borderRadius: 4,
    position: 'relative',
  },
  applyingMarker: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
  },
  applyingTarget2: {
    position: 'absolute',
    top: -2,
    width: 4,
    height: 12,
    borderRadius: 2,
    marginLeft: -2,
  },
  doneButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  historySection: {
    borderTopWidth: 1,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 11,
    lineHeight: 14,
  },
  historyAvg: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
});
