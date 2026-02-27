/**
 * ToneGeneratorPanel - Generador de tonos de referencia
 * 
 * Permite reproducir la frecuencia objetivo de cualquier nota del piano
 * por el altavoz del dispositivo. Útil para:
 * - Afinación por oído (comparar cuerda con tono de referencia)
 * - Verificación auditiva de la afinación
 * - Entrenamiento del oído musical
 * 
 * Soporta tonos puros (seno) y tonos con parciales inarmónicos
 * que simulan el timbre real de un piano.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import { ToneGenerator } from '@/services/tuner-audio-engine';
import {
  getFullNoteName,
  getEqualTemperamentFrequency,
  getStretchedFrequency,
  getExpectedInharmonicity,
} from '@/constants/piano-tuning';

interface ToneGeneratorPanelProps {
  /** Índice de la tecla seleccionada */
  activeKeyIndex: number;
  /** Frecuencia de referencia A4 */
  concertPitch: number;
  /** Si se usa stretch tuning */
  useStretchTuning: boolean;
}

type ToneMode = 'pure' | 'piano';

export function ToneGeneratorPanel({
  activeKeyIndex,
  concertPitch,
  useStretchTuning,
}: ToneGeneratorPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [toneMode, setToneMode] = useState<ToneMode>('piano');
  const [volume, setVolume] = useState(0.3);
  const toneGenRef = useRef<ToneGenerator | null>(null);
  
  const border = useThemeColor({}, 'border');
  const surface = useThemeColor({}, 'surface');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({}, 'cardBackground');
  
  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (toneGenRef.current) {
        toneGenRef.current.stop();
      }
    };
  }, []);
  
  // Detener si cambia la tecla
  useEffect(() => {
    if (isPlaying && toneGenRef.current) {
      toneGenRef.current.stop();
      setIsPlaying(false);
    }
  }, [activeKeyIndex]);
  
  const targetFreq = activeKeyIndex >= 0
    ? (useStretchTuning
        ? getStretchedFrequency(activeKeyIndex, concertPitch)
        : getEqualTemperamentFrequency(activeKeyIndex, concertPitch))
    : 0;
  
  const noteName = activeKeyIndex >= 0 ? getFullNoteName(activeKeyIndex) : '—';
  
  const handleTogglePlay = useCallback(async () => {
    if (activeKeyIndex < 0) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    
    if (isPlaying) {
      if (toneGenRef.current) {
        toneGenRef.current.stop();
      }
      setIsPlaying(false);
    } else {
      if (!toneGenRef.current) {
        toneGenRef.current = new ToneGenerator();
      }
      
      const B = toneMode === 'piano'
        ? getExpectedInharmonicity(targetFreq)
        : 0;
      const numPartials = toneMode === 'piano' ? 6 : 1;
      
      await toneGenRef.current.play(targetFreq, B, numPartials, volume);
      setIsPlaying(true);
    }
  }, [activeKeyIndex, isPlaying, toneMode, targetFreq, volume]);
  
  const handleModeChange = useCallback((mode: ToneMode) => {
    setToneMode(mode);
    if (isPlaying && toneGenRef.current) {
      toneGenRef.current.stop();
      setIsPlaying(false);
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  }, [isPlaying]);
  
  const adjustVolume = useCallback((delta: number) => {
    const newVol = Math.max(0.05, Math.min(1, volume + delta));
    setVolume(newVol);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  }, [volume]);
  
  return (
    <View style={[styles.container, { borderColor: border, backgroundColor: cardBg }]}>
      <View style={styles.header}>
        <Ionicons name="volume-high-outline" size={14} color={textSecondary} />
        <ThemedText style={[styles.title, { color: textSecondary }]}>
          Tono de referencia
        </ThemedText>
      </View>
      
      {/* Info de nota */}
      <View style={styles.noteInfo}>
        <ThemedText style={[styles.noteName, { color: textColor }]}>
          {noteName}
        </ThemedText>
        <ThemedText style={[styles.noteFreq, { color: textSecondary }]}>
          {targetFreq > 0 ? `${targetFreq.toFixed(2)} Hz` : '—'}
        </ThemedText>
      </View>
      
      {/* Selector de modo */}
      <View style={styles.modeRow}>
        <Pressable
          onPress={() => handleModeChange('pure')}
          style={({ pressed }) => [
            styles.modeButton,
            {
              backgroundColor: toneMode === 'pure' ? '#003a8c' : surface,
              borderColor: toneMode === 'pure' ? '#003a8c' : border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <ThemedText style={[
            styles.modeText,
            { color: toneMode === 'pure' ? '#ffffff' : textSecondary },
          ]}>
            Tono puro
          </ThemedText>
        </Pressable>
        
        <Pressable
          onPress={() => handleModeChange('piano')}
          style={({ pressed }) => [
            styles.modeButton,
            {
              backgroundColor: toneMode === 'piano' ? '#003a8c' : surface,
              borderColor: toneMode === 'piano' ? '#003a8c' : border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <ThemedText style={[
            styles.modeText,
            { color: toneMode === 'piano' ? '#ffffff' : textSecondary },
          ]}>
            Timbre piano
          </ThemedText>
        </Pressable>
      </View>
      
      {/* Control de volumen */}
      <View style={styles.volumeRow}>
        <Pressable
          onPress={() => adjustVolume(-0.1)}
          style={({ pressed }) => [
            styles.volButton,
            { backgroundColor: surface, borderColor: border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="volume-low" size={16} color={textSecondary} />
        </Pressable>
        
        <View style={[styles.volumeBar, { backgroundColor: surface }]}>
          <View style={[styles.volumeFill, { width: `${volume * 100}%`, backgroundColor: '#003a8c' }]} />
        </View>
        
        <Pressable
          onPress={() => adjustVolume(0.1)}
          style={({ pressed }) => [
            styles.volButton,
            { backgroundColor: surface, borderColor: border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="volume-high" size={16} color={textSecondary} />
        </Pressable>
        
        <ThemedText style={[styles.volumeText, { color: textSecondary }]}>
          {Math.round(volume * 100)}%
        </ThemedText>
      </View>
      
      {/* Botón de reproducción */}
      <Pressable
        onPress={handleTogglePlay}
        disabled={activeKeyIndex < 0}
        style={({ pressed }) => [
          styles.playButton,
          {
            backgroundColor: isPlaying ? '#EF4444' : '#003a8c',
            opacity: pressed ? 0.85 : (activeKeyIndex < 0 ? 0.4 : 1),
          },
        ]}
      >
        <Ionicons
          name={isPlaying ? 'stop' : 'play'}
          size={20}
          color="#ffffff"
        />
        <ThemedText style={styles.playButtonText}>
          {isPlaying ? 'Detener' : 'Reproducir'}
        </ThemedText>
      </Pressable>
      
      {/* Info del modo */}
      <ThemedText style={[styles.modeInfo, { color: textSecondary }]}>
        {toneMode === 'pure'
          ? 'Onda sinusoidal pura. Útil para comparación precisa de frecuencia.'
          : 'Incluye parciales inarmónicos simulando el timbre de un piano real.'}
      </ThemedText>
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
    marginBottom: 10,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noteInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  noteName: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 30,
  },
  noteFreq: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  modeText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  volButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  volumeFill: {
    height: '100%',
    borderRadius: 3,
  },
  volumeText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 16,
    width: 36,
    textAlign: 'right',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  playButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Montserrat',
    lineHeight: 20,
  },
  modeInfo: {
    fontSize: 11,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 16,
    textAlign: 'center',
  },
});
