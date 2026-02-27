/**
 * FullscreenTuner — Mode pantalla completa immersiu
 * 
 * Mostra només el medidor, la nota, el VU meter i el feedback auditiu.
 * Amaga tota la navegació per minimitzar distraccions.
 * Un toc a qualsevol lloc torna al mode normal.
 */

import React from 'react';
import { View, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedCentsGauge } from './AnimatedCentsGauge';
import { VUMeter } from './VUMeter';
import { DeviationBar } from './DeviationBar';
import { ProximityBeep } from './ProximityBeep';
import {
  getNoteName,
  getOctave,
  getFullNoteName,
} from '@/constants/piano-tuning';

interface FullscreenTunerProps {
  /** Desviació en cents */
  centsDeviation: number;
  /** Índex de la tecla activa */
  keyIndex: number;
  /** Freqüència detectada */
  frequency: number;
  /** Freqüència objectiu */
  targetFrequency: number;
  /** Confiança de la detecció */
  confidence: number;
  /** Rang del medidor */
  meterRange: number;
  /** Si l'afinador està actiu */
  isActive: boolean;
  /** Si la lectura és estable */
  isStable: boolean;
  /** Nivell RMS */
  rmsLevel: number;
  /** Si el beep de proximitat està activat */
  proximityBeepEnabled: boolean;
  /** Toggle del beep */
  onToggleProximityBeep: () => void;
  /** Callback per sortir del mode fullscreen */
  onExit: () => void;
  /** Mode fosc d'afinació */
  darkTuningMode: boolean;
  /** Si està escoltant */
  isListening: boolean;
}

export function FullscreenTuner({
  centsDeviation,
  keyIndex,
  frequency,
  targetFrequency,
  confidence,
  meterRange,
  isActive,
  isStable,
  rmsLevel,
  proximityBeepEnabled,
  onToggleProximityBeep,
  onExit,
  darkTuningMode,
  isListening,
}: FullscreenTunerProps) {
  const { width, height } = useWindowDimensions();
  const gaugeSize = Math.min(width - 40, height * 0.45);
  
  const bgColor = darkTuningMode ? '#000000' : '#0a0a0a';
  const textPrimary = '#ffffff';
  const textMuted = '#888888';
  
  const noteName = keyIndex >= 0 ? getNoteName(keyIndex) : '—';
  const octave = keyIndex >= 0 ? getOctave(keyIndex) : '';
  
  const absCents = Math.abs(centsDeviation);
  const statusColor = !isActive ? textMuted
    : absCents <= 2 ? '#22C55E'
    : absCents <= 5 ? '#4ADE80'
    : absCents <= 10 ? '#F59E0B'
    : '#EF4444';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Botó de sortida */}
      <Pressable
        onPress={onExit}
        style={({ pressed }) => [styles.exitButton, { opacity: pressed ? 0.5 : 0.8 }]}
      >
        <Ionicons name="contract-outline" size={22} color={textMuted} />
      </Pressable>
      
      {/* VU Meter compacte */}
      {isListening && (
        <View style={styles.vuContainer}>
          <VUMeter rmsLevel={rmsLevel} isListening={isListening} compact={true} />
        </View>
      )}
      
      {/* Nota gran */}
      <View style={styles.noteDisplay}>
        <ThemedText style={[styles.noteName, { color: textPrimary }]}>
          {noteName}
        </ThemedText>
        <ThemedText style={[styles.octave, { color: textMuted }]}>
          {octave}
        </ThemedText>
      </View>
      
      {/* Desviació en cents */}
      <ThemedText style={[styles.centsText, { color: statusColor }]}>
        {isActive ? `${centsDeviation > 0 ? '+' : ''}${centsDeviation.toFixed(1)}¢` : '—'}
      </ThemedText>
      
      {/* Medidor principal */}
      <View style={styles.gaugeContainer}>
        <AnimatedCentsGauge
          centsDeviation={isActive ? centsDeviation : 0}
          keyIndex={keyIndex}
          frequency={frequency}
          targetFrequency={targetFrequency}
          confidence={confidence}
          meterRange={meterRange}
          showFrequency={true}
          isStable={isStable}
          darkTuningMode={true}
        />
      </View>
      
      {/* Barra de desviació */}
      <View style={styles.deviationContainer}>
        <DeviationBar
          centsDeviation={isActive ? centsDeviation : 0}
          range={meterRange}
          isActive={isActive}
        />
      </View>
      
      {/* Freqüències */}
      <View style={styles.freqRow}>
        <View style={styles.freqItem}>
          <ThemedText style={[styles.freqLabel, { color: textMuted }]}>Objectiu</ThemedText>
          <ThemedText style={[styles.freqValue, { color: textPrimary }]}>
            {targetFrequency > 0 ? `${targetFrequency.toFixed(1)} Hz` : '—'}
          </ThemedText>
        </View>
        <View style={[styles.freqDivider, { backgroundColor: '#333' }]} />
        <View style={styles.freqItem}>
          <ThemedText style={[styles.freqLabel, { color: textMuted }]}>Detectada</ThemedText>
          <ThemedText style={[styles.freqValue, { color: textPrimary }]}>
            {frequency > 0 ? `${frequency.toFixed(1)} Hz` : '—'}
          </ThemedText>
        </View>
      </View>
      
      {/* Feedback auditiu */}
      <ProximityBeep
        centsDeviation={centsDeviation}
        isActive={isActive}
        enabled={proximityBeepEnabled}
        onToggle={onToggleProximityBeep}
      />
      
      {/* Indicador d'estabilitat */}
      {isActive && (
        <View style={styles.stabilityRow}>
          <View style={[styles.dot, { backgroundColor: isStable ? '#22C55E' : '#F59E0B' }]} />
          <ThemedText style={[styles.stabilityText, { color: textMuted }]}>
            {isStable ? 'Lectura estable' : 'Estabilitzant...'}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  exitButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  vuContainer: {
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  noteDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  noteName: {
    fontSize: 80,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 88,
  },
  octave: {
    fontSize: 32,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 38,
    marginLeft: 2,
  },
  centsText: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 34,
    marginBottom: 12,
  },
  gaugeContainer: {
    marginBottom: 12,
  },
  deviationContainer: {
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  freqRow: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingVertical: 8,
  },
  freqItem: {
    flex: 1,
    alignItems: 'center',
  },
  freqLabel: {
    fontSize: 10,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  freqValue: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 20,
  },
  freqDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 2,
  },
  stabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stabilityText: {
    fontSize: 11,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 14,
  },
});
