/**
 * TunerSettings - Configuración del afinador
 * 
 * Panel de ajustes que incluye:
 * - Concert pitch (A4 reference)
 * - Modo de afinación (stretch / temperamento igual)
 * - Sensibilidad del micrófono
 * - Opciones de visualización
 * - Reset de mediciones
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
// Theme constants available if needed
import { useTuner } from '@/contexts/TunerContext';
import { MIN_CONCERT_PITCH, MAX_CONCERT_PITCH } from '@/constants/piano-tuning';
import { Ionicons } from '@expo/vector-icons';

interface TunerSettingsProps {
  onBack: () => void;
}

export function TunerSettings({ onBack }: TunerSettingsProps) {
  const {
    state,
    setConcertPitch,
    setUseStretchTuning,
    setNoiseGateThreshold,
    setMeterRange,
    setShowFrequency,
    setShowInharmonicity,
    resetMeasurements,
  } = useTuner();
  
  const background = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'surface');
  const cardBg = useThemeColor({}, 'cardBackground');
  const border = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  
  const adjustPitch = useCallback((delta: number) => {
    const newPitch = Math.max(MIN_CONCERT_PITCH, Math.min(MAX_CONCERT_PITCH, state.concertPitch + delta));
    setConcertPitch(newPitch);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
  }, [state.concertPitch, setConcertPitch]);
  
  const handleReset = useCallback(() => {
    resetMeasurements();
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
  }, [resetMeasurements]);
  
  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: border }]}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="arrow-back" size={22} color={textColor} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: textColor }]}>
          Ajustes del afinador
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Concert Pitch */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
            Tono de referencia
          </ThemedText>
          <ThemedText style={[styles.sectionDesc, { color: textSecondary }]}>
            Frecuencia de referencia para A4. El estándar es 440 Hz.
          </ThemedText>
          
          <View style={styles.pitchControl}>
            <Pressable
              onPress={() => adjustPitch(-1)}
              style={({ pressed }) => [
                styles.pitchButton,
                { backgroundColor: surface, borderColor: border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="remove" size={20} color={textColor} />
            </Pressable>
            
            <View style={styles.pitchDisplay}>
              <ThemedText style={[styles.pitchValue, { color: textColor }]}>
                {state.concertPitch}
              </ThemedText>
              <ThemedText style={[styles.pitchUnit, { color: textSecondary }]}>Hz</ThemedText>
            </View>
            
            <Pressable
              onPress={() => adjustPitch(1)}
              style={({ pressed }) => [
                styles.pitchButton,
                { backgroundColor: surface, borderColor: border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="add" size={20} color={textColor} />
            </Pressable>
          </View>
          
          {/* Presets rápidos */}
          <View style={styles.presetsRow}>
            {[415, 432, 440, 442, 444].map(pitch => (
              <Pressable
                key={pitch}
                onPress={() => {
                  setConcertPitch(pitch);
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                }}
                style={({ pressed }) => [
                  styles.presetButton,
                  {
                    backgroundColor: state.concertPitch === pitch ? '#003a8c' : surface,
                    borderColor: state.concertPitch === pitch ? '#003a8c' : border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <ThemedText style={[
                  styles.presetText,
                  { color: state.concertPitch === pitch ? '#ffffff' : textSecondary },
                ]}>
                  {pitch}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
        
        {/* Modo de afinación */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
            Modo de afinación
          </ThemedText>
          
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <ThemedText style={[styles.toggleLabel, { color: textColor }]}>
                Stretch Tuning
              </ThemedText>
              <ThemedText style={[styles.toggleDesc, { color: textSecondary }]}>
                Compensa la inharmonicidad de las cuerdas. Recomendado para pianos acústicos.
              </ThemedText>
            </View>
            <Switch
              value={state.useStretchTuning}
              onValueChange={setUseStretchTuning}
              trackColor={{ false: border, true: '#003a8c80' }}
              thumbColor={state.useStretchTuning ? '#003a8c' : '#f4f3f4'}
            />
          </View>
        </View>
        
        {/* Rango del medidor */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
            Rango del medidor
          </ThemedText>
          <ThemedText style={[styles.sectionDesc, { color: textSecondary }]}>
            Rango de cents mostrado en el medidor circular.
          </ThemedText>
          
          <View style={styles.presetsRow}>
            {[25, 50, 100].map(range => (
              <Pressable
                key={range}
                onPress={() => {
                  setMeterRange(range);
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                }}
                style={({ pressed }) => [
                  styles.rangeButton,
                  {
                    backgroundColor: state.meterRange === range ? '#003a8c' : surface,
                    borderColor: state.meterRange === range ? '#003a8c' : border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <ThemedText style={[
                  styles.rangeText,
                  { color: state.meterRange === range ? '#ffffff' : textSecondary },
                ]}>
                  ±{range}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
        
        {/* Opciones de visualización */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
            Visualización
          </ThemedText>
          
          <View style={styles.toggleRow}>
            <ThemedText style={[styles.toggleLabel, { color: textColor }]}>
              Mostrar frecuencias
            </ThemedText>
            <Switch
              value={state.showFrequency}
              onValueChange={setShowFrequency}
              trackColor={{ false: border, true: '#003a8c80' }}
              thumbColor={state.showFrequency ? '#003a8c' : '#f4f3f4'}
            />
          </View>
          
          <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: border, paddingTop: 12 }]}>
            <ThemedText style={[styles.toggleLabel, { color: textColor }]}>
              Mostrar inharmonicidad
            </ThemedText>
            <Switch
              value={state.showInharmonicity}
              onValueChange={setShowInharmonicity}
              trackColor={{ false: border, true: '#003a8c80' }}
              thumbColor={state.showInharmonicity ? '#003a8c' : '#f4f3f4'}
            />
          </View>
        </View>
        
        {/* Reset */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
            Sesión de afinación
          </ThemedText>
          <ThemedText style={[styles.sectionDesc, { color: textSecondary }]}>
            Borra todas las mediciones guardadas para empezar una nueva sesión.
          </ThemedText>
          
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [
              styles.resetButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <ThemedText style={styles.resetText}>Reiniciar mediciones</ThemedText>
          </Pressable>
        </View>
        
        {/* Información del algoritmo */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
            Sobre el algoritmo
          </ThemedText>
          <ThemedText style={[styles.sectionDesc, { color: textSecondary }]}>
            Este afinador utiliza el algoritmo YIN para detección de pitch en tiempo real, 
            con estimación de inharmonicidad basada en minimización de entropía de Renyi 
            (Hinrichsen, 2012). La curva de stretch tuning se basa en el modelo de Railsback 
            con coeficientes del Entropy Piano Tuner (GPL3).
          </ThemedText>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 20,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 18,
    marginBottom: 12,
  },
  pitchControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  pitchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pitchDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  pitchValue: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 42,
  },
  pitchUnit: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 22,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  presetButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  rangeText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 20,
  },
  toggleDesc: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 17,
    marginTop: 2,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    alignSelf: 'flex-start',
  },
  resetText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#EF4444',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
});
