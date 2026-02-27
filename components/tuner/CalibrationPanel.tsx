/**
 * CalibrationPanel - Calibración de inharmonicidad individual
 * 
 * Permite calibrar la inharmonicidad de un piano específico midiendo
 * cada nota y generando una curva de stretch personalizada.
 * 
 * Proceso:
 * 1. El usuario toca cada nota del piano
 * 2. La app mide la inharmonicidad real de cada cuerda
 * 3. Se calcula una curva de stretch optimizada para ese piano
 * 4. El perfil se guarda para futuras afinaciones
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import {
  TOTAL_KEYS,
  getFullNoteName,
  getNoteName,
  isBlackKey,
} from '@/constants/piano-tuning';

export interface CalibrationData {
  /** Coeficiente B de inharmonicidad medido por tecla */
  inharmonicityByKey: (number | null)[];
  /** Timestamp de la calibración */
  timestamp: number;
  /** Nombre del perfil */
  profileName: string;
  /** Número de teclas calibradas */
  calibratedCount: number;
}

interface CalibrationPanelProps {
  /** Datos de calibración actuales */
  calibrationData: CalibrationData | null;
  /** Última inharmonicidad medida (de la detección en tiempo real) */
  currentInharmonicity: number | null;
  /** Índice de la tecla activa */
  activeKeyIndex: number;
  /** Si el afinador está escuchando */
  isListening: boolean;
  /** Callback para guardar medición de calibración */
  onSaveCalibration: (keyIndex: number, inharmonicity: number) => void;
  /** Callback para resetear calibración */
  onResetCalibration: () => void;
  /** Callback para renombrar perfil */
  onRenameProfile: (name: string) => void;
}

export function CalibrationPanel({
  calibrationData,
  currentInharmonicity,
  activeKeyIndex,
  isListening,
  onSaveCalibration,
  onResetCalibration,
  onRenameProfile,
}: CalibrationPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  const border = useThemeColor({}, 'border');
  const surface = useThemeColor({}, 'surface');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({}, 'cardBackground');
  
  const calibrated = calibrationData?.inharmonicityByKey ?? Array(TOTAL_KEYS).fill(null);
  const calibratedCount = calibrated.filter(v => v !== null).length;
  const progress = calibratedCount / TOTAL_KEYS;
  
  const handleSave = useCallback(() => {
    if (activeKeyIndex >= 0 && currentInharmonicity !== null && currentInharmonicity > 0) {
      onSaveCalibration(activeKeyIndex, currentInharmonicity);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
  }, [activeKeyIndex, currentInharmonicity, onSaveCalibration]);
  
  const handleReset = useCallback(() => {
    onResetCalibration();
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
  }, [onResetCalibration]);
  
  const canSave = isListening && activeKeyIndex >= 0 && currentInharmonicity !== null && currentInharmonicity > 0;
  
  // Secciones del piano para mostrar progreso
  const sections = [
    { name: 'Graves', start: 0, end: 27, label: 'A0-D#2' },
    { name: 'Medios-bajos', start: 28, end: 39, label: 'E2-E3' },
    { name: 'Medios', start: 40, end: 51, label: 'F3-E4' },
    { name: 'Medios-altos', start: 52, end: 63, label: 'F4-E5' },
    { name: 'Agudos', start: 64, end: 87, label: 'F5-C8' },
  ];
  
  return (
    <View style={[styles.container, { borderColor: border, backgroundColor: cardBg }]}>
      <View style={styles.header}>
        <Ionicons name="analytics-outline" size={14} color={textSecondary} />
        <ThemedText style={[styles.title, { color: textSecondary }]}>
          Calibración de inharmonicidad
        </ThemedText>
      </View>
      
      {/* Barra de progreso global */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <ThemedText style={[styles.progressLabel, { color: textColor }]}>
            Progreso: {calibratedCount}/{TOTAL_KEYS} teclas
          </ThemedText>
          <ThemedText style={[styles.progressPercent, { color: '#003a8c' }]}>
            {Math.round(progress * 100)}%
          </ThemedText>
        </View>
        <View style={[styles.progressBar, { backgroundColor: surface }]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>
      
      {/* Progreso por sección */}
      <View style={styles.sectionsGrid}>
        {sections.map(section => {
          const sectionCalibrated = calibrated
            .slice(section.start, section.end + 1)
            .filter(v => v !== null).length;
          const sectionTotal = section.end - section.start + 1;
          const sectionProgress = sectionCalibrated / sectionTotal;
          
          return (
            <View key={section.name} style={[styles.sectionItem, { backgroundColor: surface }]}>
              <ThemedText style={[styles.sectionName, { color: textColor }]}>
                {section.name}
              </ThemedText>
              <ThemedText style={[styles.sectionRange, { color: textSecondary }]}>
                {section.label}
              </ThemedText>
              <View style={[styles.sectionBar, { backgroundColor: border }]}>
                <View
                  style={[
                    styles.sectionBarFill,
                    {
                      width: `${sectionProgress * 100}%`,
                      backgroundColor: sectionProgress === 1 ? '#10B981' : '#003a8c',
                    },
                  ]}
                />
              </View>
              <ThemedText style={[styles.sectionCount, { color: textSecondary }]}>
                {sectionCalibrated}/{sectionTotal}
              </ThemedText>
            </View>
          );
        })}
      </View>
      
      {/* Medición actual */}
      <View style={[styles.currentMeasurement, { backgroundColor: surface }]}>
        <View style={styles.measureRow}>
          <ThemedText style={[styles.measureLabel, { color: textSecondary }]}>
            Nota actual:
          </ThemedText>
          <ThemedText style={[styles.measureValue, { color: textColor }]}>
            {activeKeyIndex >= 0 ? getFullNoteName(activeKeyIndex) : '—'}
          </ThemedText>
        </View>
        <View style={styles.measureRow}>
          <ThemedText style={[styles.measureLabel, { color: textSecondary }]}>
            Inharmonicidad B:
          </ThemedText>
          <ThemedText style={[styles.measureValue, { color: textColor }]}>
            {currentInharmonicity !== null && currentInharmonicity > 0
              ? currentInharmonicity.toExponential(3)
              : '—'}
          </ThemedText>
        </View>
        {activeKeyIndex >= 0 && calibrated[activeKeyIndex] !== null && (
          <View style={styles.measureRow}>
            <ThemedText style={[styles.measureLabel, { color: textSecondary }]}>
              Calibrado previo:
            </ThemedText>
            <ThemedText style={[styles.measureValue, { color: '#10B981' }]}>
              {(calibrated[activeKeyIndex] as number).toExponential(3)}
            </ThemedText>
          </View>
        )}
      </View>
      
      {/* Botones de acción */}
      <View style={styles.actionRow}>
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: canSave ? '#003a8c' : surface,
              opacity: pressed ? 0.85 : (canSave ? 1 : 0.5),
            },
          ]}
        >
          <Ionicons name="checkmark" size={16} color={canSave ? '#ffffff' : textSecondary} />
          <ThemedText style={[styles.saveButtonText, { color: canSave ? '#ffffff' : textSecondary }]}>
            Guardar medición
          </ThemedText>
        </Pressable>
        
        <Pressable
          onPress={handleReset}
          style={({ pressed }) => [
            styles.resetButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="trash-outline" size={14} color="#EF4444" />
        </Pressable>
      </View>
      
      {/* Instrucciones */}
      <View style={[styles.infoBox, { backgroundColor: surface }]}>
        <ThemedText style={[styles.infoText, { color: textSecondary }]}>
          Toque cada nota del piano de forma individual y clara. Mantenga la nota pulsada 2-3 segundos para obtener una medición estable. La calibración mejora la precisión del stretch tuning para su piano específico.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#003a8c',
  },
  sectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  sectionItem: {
    flex: 1,
    minWidth: '18%',
    padding: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  sectionName: {
    fontSize: 9,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 12,
  },
  sectionRange: {
    fontSize: 8,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 10,
    marginBottom: 4,
  },
  sectionBar: {
    width: '100%',
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginBottom: 2,
  },
  sectionBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  sectionCount: {
    fontSize: 8,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 10,
  },
  currentMeasurement: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    gap: 4,
  },
  measureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  measureLabel: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 16,
  },
  measureValue: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  resetButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBox: {
    padding: 10,
    borderRadius: 6,
  },
  infoText: {
    fontSize: 11,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 16,
  },
});
