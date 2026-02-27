/**
 * TunerScreen - Pantalla principal del afinador de pianos
 * 
 * Interfaz completa de afinación que incluye:
 * - Visualización de nota detectada
 * - Medidor circular de cents (CentsGauge)
 * - Barra de desviación horizontal (DeviationBar)
 * - Información de frecuencia e inharmonicidad
 * - Tira de piano con estado de afinación (MiniPianoStrip)
 * - Controles de navegación entre teclas
 * 
 * Diseñado para seguir los patrones de Piano Emotion Manager.
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Shadows } from '@/constants/theme';
import { useTuner, TunerProvider } from '@/contexts/TunerContext';
import { CentsGauge } from './CentsGauge';
import { DeviationBar } from './DeviationBar';
import { MiniPianoStrip } from './MiniPianoStrip';
import { TunerSettings } from './TunerSettings';
import {
  getFullNoteName,
  getNoteName,
  getOctave,
  getEqualTemperamentFrequency,
  getStretchedFrequency,
  TOTAL_KEYS,
} from '@/constants/piano-tuning';
import { Ionicons } from '@expo/vector-icons';

// ─── Colores del afinador ────────────────────────────────────────────────────

const TUNER_COLORS = {
  primary: '#003a8c',
  accent: '#e07a5f',
  inTune: '#10B981',
  close: '#F59E0B',
  outOfTune: '#EF4444',
};

// ─── Componente interno (requiere TunerProvider) ─────────────────────────────

function TunerScreenContent() {
  const { state, startListening, stopListening, setSelectedKey, setAutoDetect, navigateKey, saveMeasurement } = useTuner();
  const { width } = useWindowDimensions();
  const [showSettings, setShowSettings] = useState(false);
  
  const background = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'surface');
  const cardBg = useThemeColor({}, 'cardBackground');
  const border = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  
  const gaugeSize = Math.min(300, width - 80);
  
  // Determinar la tecla activa
  const activeKey = state.autoDetect
    ? (state.currentDetection?.keyIndex ?? -1)
    : state.selectedKey;
  
  const detection = state.currentDetection;
  const isActive = state.isListening && detection !== null && detection.keyIndex >= 0;
  
  // Información de la nota
  const noteName = activeKey >= 0 ? getNoteName(activeKey) : '—';
  const octave = activeKey >= 0 ? getOctave(activeKey) : '';
  const fullName = activeKey >= 0 ? getFullNoteName(activeKey) : '—';
  
  // Frecuencias
  const targetFreq = activeKey >= 0
    ? (state.useStretchTuning
        ? getStretchedFrequency(activeKey, state.concertPitch)
        : getEqualTemperamentFrequency(activeKey, state.concertPitch))
    : 0;
  const detectedFreq = detection?.frequency ?? 0;
  const centsDeviation = detection?.centsDeviation ?? 0;
  
  // Conteo de teclas afinadas
  const tunedCount = state.measurements.filter(m => m !== null && Math.abs(m.centsDeviation) <= 2).length;
  
  const handleToggleListening = useCallback(async () => {
    if (state.isListening) {
      stopListening();
    } else {
      await startListening();
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  }, [state.isListening, startListening, stopListening]);
  
  const handleKeyPress = useCallback((keyIndex: number) => {
    setSelectedKey(keyIndex);
    setAutoDetect(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  }, [setSelectedKey, setAutoDetect]);
  
  const handleAutoDetect = useCallback(() => {
    setAutoDetect(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  }, [setAutoDetect]);
  
  const handleSave = useCallback(() => {
    saveMeasurement();
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }, [saveMeasurement]);
  
  // Haptic feedback is triggered via the save button action
  
  if (showSettings) {
    return <TunerSettings onBack={() => setShowSettings(false)} />;
  }
  
  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header con progreso y ajustes */}
        <View style={styles.headerRow}>
          <View style={styles.progressBadge}>
            <Ionicons name="musical-notes" size={14} color={TUNER_COLORS.primary} />
            <ThemedText style={[styles.progressText, { color: textSecondary }]}>
              {tunedCount}/88 afinadas
            </ThemedText>
          </View>
          
          <View style={styles.headerActions}>
            <Pressable
              onPress={handleAutoDetect}
              style={({ pressed }) => [
                styles.modeBadge,
                {
                  backgroundColor: state.autoDetect ? TUNER_COLORS.primary + '15' : surface,
                  borderColor: state.autoDetect ? TUNER_COLORS.primary : border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <ThemedText style={[styles.modeText, { color: state.autoDetect ? TUNER_COLORS.primary : textSecondary }]}>
                {state.autoDetect ? 'Auto' : fullName}
              </ThemedText>
            </Pressable>
            
            <Pressable
              onPress={() => setShowSettings(true)}
              style={({ pressed }) => [
                styles.settingsButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="settings-outline" size={20} color={textSecondary} />
            </Pressable>
          </View>
        </View>
        
        {/* Nota detectada */}
        <View style={styles.noteDisplay}>
          <ThemedText style={[styles.noteName, { color: textColor }]}>
            {noteName}
          </ThemedText>
          <ThemedText style={[styles.octaveNumber, { color: textSecondary }]}>
            {octave}
          </ThemedText>
        </View>
        
        {/* Medidor circular */}
        <View style={styles.gaugeContainer}>
          <CentsGauge
            centsDeviation={isActive ? centsDeviation : 0}
            range={state.meterRange}
            isActive={isActive}
            size={gaugeSize}
          />
        </View>
        
        {/* Barra de desviación */}
        <DeviationBar
          centsDeviation={isActive ? centsDeviation : 0}
          range={state.meterRange}
          isActive={isActive}
        />
        
        {/* Información de frecuencia */}
        {state.showFrequency && (
          <View style={[styles.infoRow, { borderColor: border }]}>
            <View style={styles.infoItem}>
              <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>Objetivo</ThemedText>
              <ThemedText style={[styles.infoValue, { color: textColor }]}>
                {targetFreq > 0 ? `${targetFreq.toFixed(2)} Hz` : '— Hz'}
              </ThemedText>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: border }]} />
            <View style={styles.infoItem}>
              <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>Detectada</ThemedText>
              <ThemedText style={[styles.infoValue, { color: textColor }]}>
                {detectedFreq > 0 ? `${detectedFreq.toFixed(2)} Hz` : '— Hz'}
              </ThemedText>
            </View>
            {state.showInharmonicity && (
              <>
                <View style={[styles.infoDivider, { backgroundColor: border }]} />
                <View style={styles.infoItem}>
                  <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>Inharm. B</ThemedText>
                  <ThemedText style={[styles.infoValue, { color: textColor }]}>
                    {detection?.inharmonicity != null
                      ? detection.inharmonicity.toExponential(2)
                      : '—'}
                  </ThemedText>
                </View>
              </>
            )}
          </View>
        )}
        
        {/* Navegación de teclas */}
        <View style={styles.keyNavRow}>
          <Pressable
            onPress={() => navigateKey('prev')}
            style={({ pressed }) => [
              styles.navButton,
              { backgroundColor: surface, borderColor: border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={textSecondary} />
          </Pressable>
          
          <Pressable
            onPress={handleSave}
            disabled={!isActive}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor: isActive ? TUNER_COLORS.primary : surface,
                opacity: pressed ? 0.8 : (isActive ? 1 : 0.5),
              },
            ]}
          >
            <Ionicons name="checkmark" size={18} color={isActive ? '#ffffff' : textSecondary} />
            <ThemedText style={[styles.saveButtonText, { color: isActive ? '#ffffff' : textSecondary }]}>
              Guardar
            </ThemedText>
          </Pressable>
          
          <Pressable
            onPress={() => navigateKey('next')}
            style={({ pressed }) => [
              styles.navButton,
              { backgroundColor: surface, borderColor: border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="chevron-forward" size={20} color={textSecondary} />
          </Pressable>
        </View>
        
        {/* Tira de piano */}
        <MiniPianoStrip
          activeKey={activeKey}
          measurements={state.measurements}
          onKeyPress={handleKeyPress}
        />
        
        {/* Botón de inicio/parada */}
        <View style={styles.mainButtonContainer}>
          <Pressable
            onPress={handleToggleListening}
            style={({ pressed }) => [
              styles.mainButton,
              {
                backgroundColor: state.isListening ? TUNER_COLORS.outOfTune : TUNER_COLORS.primary,
                opacity: pressed ? 0.85 : 1,
                ...Shadows.md,
              },
            ]}
          >
            <Ionicons
              name={state.isListening ? 'stop' : 'mic'}
              size={24}
              color="#ffffff"
            />
            <ThemedText style={styles.mainButtonText}>
              {state.isListening ? 'Detener' : 'Iniciar afinación'}
            </ThemedText>
          </Pressable>
        </View>
        
        {/* Error de audio */}
        {state.audioError && (
          <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <Ionicons name="warning" size={18} color="#EF4444" />
            <ThemedText style={styles.errorText}>{state.audioError}</ThemedText>
          </View>
        )}
        
        {/* Info de stretch tuning */}
        <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="information-circle-outline" size={16} color={textSecondary} />
            <ThemedText style={[styles.infoCardTitle, { color: textSecondary }]}>
              {state.useStretchTuning ? 'Stretch Tuning activado' : 'Temperamento igual'}
            </ThemedText>
          </View>
          <ThemedText style={[styles.infoCardBody, { color: textSecondary }]}>
            {state.useStretchTuning
              ? 'Las frecuencias objetivo incluyen compensación de inharmonicidad (curva de Railsback). Recomendado para pianos acústicos.'
              : 'Frecuencias de temperamento igual puro. Adecuado para referencia o instrumentos electrónicos.'}
          </ThemedText>
        </View>
        
        {/* Pitch de referencia */}
        <View style={[styles.refPitchBadge, { backgroundColor: surface, borderColor: border }]}>
          <ThemedText style={[styles.refPitchText, { color: textSecondary }]}>
            A4 = {state.concertPitch} Hz
          </ThemedText>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Componente exportado con Provider ───────────────────────────────────────

export default function TunerScreen() {
  return (
    <TunerProvider>
      <TunerScreenContent />
    </TunerProvider>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 16,
  },
  settingsButton: {
    padding: 6,
  },
  noteDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 4,
  },
  noteName: {
    fontSize: 72,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 80,
  },
  octaveNumber: {
    fontSize: 28,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 34,
    marginLeft: 2,
  },
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 14,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  infoDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 2,
  },
  keyNavRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  mainButtonContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 28,
    width: '100%',
    maxWidth: 320,
  },
  mainButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Montserrat',
    lineHeight: 22,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    fontFamily: 'Montserrat',
    lineHeight: 18,
    flex: 1,
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 16,
  },
  infoCardBody: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 17,
  },
  refPitchBadge: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  refPitchText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 16,
  },
});
