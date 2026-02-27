/**
 * GuidedTuning — Asistente de afinación paso a paso
 * 
 * Guía al usuario a través del proceso de afinación completo del piano,
 * siguiendo el orden profesional estándar:
 * 1. Temperamento central (F3-F4) — establecer las 12 notas base
 * 2. Expandir hacia agudos por octavas
 * 3. Expandir hacia graves por octavas
 * 4. Verificación final de intervalos
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  TOTAL_KEYS,
  getFullNoteName,
  getNoteName,
  getOctave,
  getTuningStatus,
  getTuningColor,
  isBlackKey,
} from '@/constants/piano-tuning';

// ─── Orden profesional de afinación ──────────────────────────────────────────

interface TuningStep {
  keyIndex: number;
  instruction: string;
  phase: 'temperament' | 'treble' | 'bass' | 'verification';
  phaseLabel: string;
  verifyIntervals?: { keyIndex: number; intervalName: string }[];
}

/**
 * Genera la secuencia completa de afinación profesional.
 * Fase 1: Temperamento central F3-F4 (teclas 32-44)
 * Fase 2: Octavas ascendentes F4 → C8
 * Fase 3: Octavas descendentes F3 → A0
 * Fase 4: Verificación de octavas y quintas
 */
function generateTuningSequence(): TuningStep[] {
  const steps: TuningStep[] = [];
  
  // Fase 1: Temperamento central — A4 primero, luego cromáticamente F3-F4
  // A4 = índice 48
  steps.push({
    keyIndex: 48,
    instruction: 'Afine A4 (La central) como referencia. Esta es la nota de referencia para todo el piano.',
    phase: 'temperament',
    phaseLabel: 'Temperamento Central',
  });
  
  // Desde A4, bajar cromáticamente hasta F3 (índice 32)
  for (let i = 47; i >= 32; i--) {
    const name = getFullNoteName(i);
    steps.push({
      keyIndex: i,
      instruction: `Afine ${name}. Verifique el intervalo con la nota anterior.`,
      phase: 'temperament',
      phaseLabel: 'Temperamento Central',
    });
  }
  
  // Desde A#4 subir hasta F4 (índice 44) — completar la octava
  for (let i = 49; i <= 44 + 12; i++) {
    if (i > 48 && i <= 56) {
      const name = getFullNoteName(i);
      steps.push({
        keyIndex: i,
        instruction: `Afine ${name}. Verifique el intervalo con la nota anterior.`,
        phase: 'temperament',
        phaseLabel: 'Temperamento Central',
      });
    }
  }
  
  // Fase 2: Octavas ascendentes desde F4 (índice 44) hasta C8 (índice 87)
  // Afinamos por octavas: cada nota se afina respecto a su octava inferior
  for (let octaveStart = 44 + 12; octaveStart < TOTAL_KEYS; octaveStart++) {
    const refKey = octaveStart - 12;
    if (refKey >= 32 && refKey < TOTAL_KEYS) {
      const name = getFullNoteName(octaveStart);
      const refName = getFullNoteName(refKey);
      if (octaveStart < TOTAL_KEYS) {
        steps.push({
          keyIndex: octaveStart,
          instruction: `Afine ${name} como octava de ${refName}. Escuche que no haya batidos.`,
          phase: 'treble',
          phaseLabel: 'Octavas Agudas',
          verifyIntervals: [{ keyIndex: refKey, intervalName: 'octava' }],
        });
      }
    }
  }
  
  // Fase 3: Octavas descendentes desde F3 (índice 32) hasta A0 (índice 0)
  for (let i = 31; i >= 0; i--) {
    const name = getFullNoteName(i);
    const refKey = i + 12;
    const refName = getFullNoteName(refKey);
    steps.push({
      keyIndex: i,
      instruction: `Afine ${name} como octava de ${refName}. En graves, permita un ligero estiramiento.`,
      phase: 'bass',
      phaseLabel: 'Octavas Graves',
      verifyIntervals: [{ keyIndex: refKey, intervalName: 'octava' }],
    });
  }
  
  // Fase 4: Verificación — comprobar octavas y quintas a lo largo del piano
  const verificationKeys = [0, 12, 24, 36, 48, 60, 72, 84]; // A en cada octava
  for (const ki of verificationKeys) {
    if (ki + 12 < TOTAL_KEYS) {
      steps.push({
        keyIndex: ki,
        instruction: `Verificación: toque ${getFullNoteName(ki)} y ${getFullNoteName(ki + 12)} juntas. La octava debe sonar limpia.`,
        phase: 'verification',
        phaseLabel: 'Verificación Final',
        verifyIntervals: [{ keyIndex: ki + 12, intervalName: 'octava' }],
      });
    }
  }
  
  // Eliminar duplicados y pasos fuera de rango
  return steps.filter((s, idx, arr) => 
    s.keyIndex >= 0 && s.keyIndex < TOTAL_KEYS &&
    arr.findIndex(x => x.keyIndex === s.keyIndex && x.phase === s.phase) === idx
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface GuidedTuningProps {
  currentKeyIndex: number;
  centsDeviation: number;
  isListening: boolean;
  onSelectKey: (keyIndex: number) => void;
  keyMeasurements: Map<number, { cents: number; timestamp: number }>;
}

// ─── Componente ─────────────────────────────────────────────────────────────

export function GuidedTuning({
  currentKeyIndex,
  centsDeviation,
  isListening,
  onSelectKey,
  keyMeasurements,
}: GuidedTuningProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const bgColor = useThemeColor({}, 'background');
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
  const tuningSequence = useMemo(() => generateTuningSequence(), []);
  const currentStep = tuningSequence[currentStepIndex];
  
  // Contar pasos por fase
  const phaseStats = useMemo(() => {
    const stats = { temperament: 0, treble: 0, bass: 0, verification: 0 };
    const completed = { temperament: 0, treble: 0, bass: 0, verification: 0 };
    tuningSequence.forEach((step, idx) => {
      stats[step.phase]++;
      if (completedSteps.has(idx)) completed[step.phase]++;
    });
    return { total: stats, completed };
  }, [tuningSequence, completedSteps]);
  
  // Seleccionar la tecla del paso actual
  useEffect(() => {
    if (currentStep) {
      onSelectKey(currentStep.keyIndex);
    }
  }, [currentStepIndex, currentStep, onSelectKey]);
  
  // Marcar paso como completado cuando la afinación está dentro del umbral
  const handleMarkComplete = useCallback(() => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.add(currentStepIndex);
      return next;
    });
    // Avanzar al siguiente paso
    if (currentStepIndex < tuningSequence.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  }, [currentStepIndex, tuningSequence.length]);
  
  const handlePrevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  }, [currentStepIndex]);
  
  const handleNextStep = useCallback(() => {
    if (currentStepIndex < tuningSequence.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  }, [currentStepIndex, tuningSequence.length]);
  
  const handleJumpToPhase = useCallback((phase: string) => {
    const idx = tuningSequence.findIndex(s => s.phase === phase);
    if (idx >= 0) setCurrentStepIndex(idx);
  }, [tuningSequence]);
  
  if (!currentStep) return null;
  
  const tuningStatus = getTuningStatus(centsDeviation);
  const isInTune = tuningStatus === 'in_tune' && isListening;
  const statusColor = isListening ? getTuningColor(centsDeviation) : textSecondary;
  const progress = ((completedSteps.size / tuningSequence.length) * 100).toFixed(0);
  
  const phaseColors: Record<string, string> = {
    temperament: '#6366F1',
    treble: '#F59E0B',
    bass: '#8B5CF6',
    verification: '#10B981',
  };
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Progreso general */}
      <View style={[styles.progressCard, { backgroundColor: surfaceColor, borderColor }]}>
        <View style={styles.progressHeader}>
          <ThemedText style={styles.progressTitle}>Progreso de Afinación</ThemedText>
          <ThemedText style={[styles.progressPercent, { color: '#10B981' }]}>{progress}%</ThemedText>
        </View>
        <View style={[styles.progressBar, { backgroundColor: borderColor }]}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: '#10B981' }]} />
        </View>
        <View style={styles.phaseRow}>
          {(['temperament', 'treble', 'bass', 'verification'] as const).map(phase => {
            const labels: Record<string, string> = {
              temperament: 'Temp.',
              treble: 'Agudos',
              bass: 'Graves',
              verification: 'Verif.',
            };
            const total = phaseStats.total[phase];
            const done = phaseStats.completed[phase];
            return (
              <TouchableOpacity
                key={phase}
                onPress={() => handleJumpToPhase(phase)}
                style={[
                  styles.phaseChip,
                  { 
                    backgroundColor: currentStep.phase === phase ? phaseColors[phase] + '20' : 'transparent',
                    borderColor: phaseColors[phase],
                  },
                ]}
              >
                <ThemedText style={[styles.phaseChipText, { color: phaseColors[phase] }]}>
                  {labels[phase]}
                </ThemedText>
                <ThemedText style={[styles.phaseChipCount, { color: textSecondary }]}>
                  {done}/{total}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      
      {/* Paso actual */}
      <View style={[styles.stepCard, { backgroundColor: surfaceColor, borderColor }]}>
        <View style={[styles.stepPhaseTag, { backgroundColor: phaseColors[currentStep.phase] }]}>
          <ThemedText style={styles.stepPhaseText}>{currentStep.phaseLabel}</ThemedText>
        </View>
        
        <View style={styles.stepHeader}>
          <ThemedText style={[styles.stepNumber, { color: textSecondary }]}>
            Paso {currentStepIndex + 1} de {tuningSequence.length}
          </ThemedText>
        </View>
        
        <View style={styles.noteDisplay}>
          <ThemedText style={[styles.noteName, { color: textColor }]}>
            {getFullNoteName(currentStep.keyIndex)}
          </ThemedText>
          {isListening && (
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <ThemedText style={[styles.statusText, { color: statusColor }]}>
                {tuningStatus === 'in_tune' ? 'Afinado' : 
                 tuningStatus === 'close' ? 'Cerca' : 'Desafinado'}
              </ThemedText>
            </View>
          )}
        </View>
        
        <ThemedText style={[styles.instruction, { color: textSecondary }]}>
          {currentStep.instruction}
        </ThemedText>
        
        {/* Intervalos de verificación */}
        {currentStep.verifyIntervals && currentStep.verifyIntervals.length > 0 && (
          <View style={[styles.verifyBox, { backgroundColor: bgColor, borderColor }]}>
            <ThemedText style={[styles.verifyTitle, { color: textColor }]}>
              Verificar con:
            </ThemedText>
            {currentStep.verifyIntervals.map((iv, idx) => (
              <ThemedText key={idx} style={[styles.verifyText, { color: textSecondary }]}>
                {getFullNoteName(iv.keyIndex)} ({iv.intervalName})
              </ThemedText>
            ))}
          </View>
        )}
      </View>
      
      {/* Controles de navegación */}
      <View style={styles.navRow}>
        <TouchableOpacity
          onPress={handlePrevStep}
          disabled={currentStepIndex === 0}
          style={[
            styles.navButton,
            { backgroundColor: surfaceColor, borderColor, opacity: currentStepIndex === 0 ? 0.4 : 1 },
          ]}
        >
          <ThemedText style={[styles.navButtonText, { color: textColor }]}>← Anterior</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={handleMarkComplete}
          style={[
            styles.completeButton,
            { backgroundColor: isInTune ? '#10B981' : '#6366F1' },
          ]}
        >
          <ThemedText style={styles.completeButtonText}>
            {isInTune ? '✓ Afinado' : 'Marcar ✓'}
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={handleNextStep}
          disabled={currentStepIndex >= tuningSequence.length - 1}
          style={[
            styles.navButton,
            { backgroundColor: surfaceColor, borderColor, opacity: currentStepIndex >= tuningSequence.length - 1 ? 0.4 : 1 },
          ]}
        >
          <ThemedText style={[styles.navButtonText, { color: textColor }]}>Siguiente →</ThemedText>
        </TouchableOpacity>
      </View>
      
      {/* Lista de pasos cercanos */}
      <View style={[styles.stepsListCard, { backgroundColor: surfaceColor, borderColor }]}>
        <ThemedText style={[styles.stepsListTitle, { color: textColor }]}>Próximos pasos</ThemedText>
        {tuningSequence.slice(currentStepIndex, currentStepIndex + 5).map((step, idx) => {
          const globalIdx = currentStepIndex + idx;
          const isCompleted = completedSteps.has(globalIdx);
          const isCurrent = globalIdx === currentStepIndex;
          return (
            <TouchableOpacity
              key={globalIdx}
              onPress={() => setCurrentStepIndex(globalIdx)}
              style={[
                styles.stepListItem,
                { 
                  backgroundColor: isCurrent ? phaseColors[step.phase] + '10' : 'transparent',
                  borderLeftColor: phaseColors[step.phase],
                },
              ]}
            >
              <View style={styles.stepListLeft}>
                <ThemedText style={[
                  styles.stepListCheck,
                  { color: isCompleted ? '#10B981' : borderColor },
                ]}>
                  {isCompleted ? '✓' : '○'}
                </ThemedText>
                <ThemedText style={[
                  styles.stepListNote,
                  { color: isCurrent ? textColor : textSecondary },
                ]}>
                  {getFullNoteName(step.keyIndex)}
                </ThemedText>
              </View>
              <ThemedText style={[styles.stepListPhase, { color: phaseColors[step.phase] }]}>
                {step.phaseLabel}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Estilos ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  
  progressCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: { fontSize: 15, fontWeight: '600' },
  progressPercent: { fontSize: 18, fontWeight: '700' },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  phaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  phaseChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  phaseChipText: { fontSize: 11, fontWeight: '600' },
  phaseChipCount: { fontSize: 10, marginTop: 2 },
  
  stepCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stepPhaseTag: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 4,
    alignItems: 'center',
  },
  stepPhaseText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  stepHeader: {
    marginTop: 24,
    marginBottom: 8,
  },
  stepNumber: { fontSize: 12 },
  noteDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  noteName: { fontSize: 36, fontWeight: '800' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '600' },
  instruction: { fontSize: 14, lineHeight: 20 },
  
  verifyBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  verifyTitle: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  verifyText: { fontSize: 13 },
  
  navRow: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  navButtonText: { fontSize: 14, fontWeight: '600' },
  completeButton: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  completeButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  
  stepsListCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  stepsListTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  stepListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderLeftWidth: 3,
    marginBottom: 4,
    borderRadius: 4,
  },
  stepListLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepListCheck: { fontSize: 16, fontWeight: '600' },
  stepListNote: { fontSize: 14, fontWeight: '600' },
  stepListPhase: { fontSize: 11 },
});
