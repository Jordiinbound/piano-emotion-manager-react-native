/**
 * ProximityBeep — Feedback auditiu de proximitat
 * 
 * Emet un beep que accelera quan la desviació en cents s'acosta a 0.
 * Permet al tècnic afinar sense mirar la pantalla (mans ocupades amb la clavilla).
 * Usa Web Audio API OscillatorNode per generar tons purs de baixa latència.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';

interface ProximityBeepProps {
  /** Desviació en cents actual */
  centsDeviation: number;
  /** Si l'afinador està actiu */
  isActive: boolean;
  /** Si el beep està activat */
  enabled: boolean;
  /** Callback per activar/desactivar */
  onToggle: () => void;
}

export function ProximityBeep({ centsDeviation, isActive, enabled, onToggle }: ProximityBeepProps) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');

  // Inicialitzar AudioContext
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  // Emetre un beep curt
  const playBeep = useCallback((frequency: number, duration: number) => {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.value = 0.15;
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      // Envelope suau
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.005);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }, [getAudioCtx]);

  useEffect(() => {
    if (!enabled || !isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const absCents = Math.abs(centsDeviation);
    
    // Si està molt lluny (>50 cents), no fer beep
    if (absCents > 50) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Calcular interval i freqüència del beep segons proximitat
    // Més a prop = beeps més ràpids i to més agut
    let beepInterval: number;
    let beepFreq: number;
    let beepDuration: number;

    if (absCents <= 1) {
      // Perfecte: to continu agut
      beepInterval = 100;
      beepFreq = 1800;
      beepDuration = 0.08;
    } else if (absCents <= 3) {
      // Molt a prop: beeps ràpids
      beepInterval = 150;
      beepFreq = 1500;
      beepDuration = 0.06;
    } else if (absCents <= 5) {
      beepInterval = 250;
      beepFreq = 1200;
      beepDuration = 0.05;
    } else if (absCents <= 10) {
      beepInterval = 400;
      beepFreq = 1000;
      beepDuration = 0.04;
    } else if (absCents <= 20) {
      beepInterval = 600;
      beepFreq = 800;
      beepDuration = 0.035;
    } else if (absCents <= 35) {
      beepInterval = 900;
      beepFreq = 600;
      beepDuration = 0.03;
    } else {
      beepInterval = 1200;
      beepFreq = 500;
      beepDuration = 0.025;
    }

    // Netejar interval anterior
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Crear nou interval
    intervalRef.current = setInterval(() => {
      playBeep(beepFreq, beepDuration);
    }, beepInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, isActive, centsDeviation, playBeep]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  const absCents = Math.abs(centsDeviation);
  const proximityLabel = !isActive ? 'Inactivo'
    : absCents <= 1 ? '¡Perfecto!'
    : absCents <= 3 ? 'Muy cerca'
    : absCents <= 10 ? 'Cerca'
    : absCents <= 25 ? 'Acercándose'
    : absCents <= 50 ? 'Lejos'
    : 'Fuera de rango';

  return (
    <View style={[styles.container, { backgroundColor: surface, borderColor: border }]}>
      <View style={styles.row}>
        <Ionicons
          name={enabled ? 'volume-high' : 'volume-mute'}
          size={18}
          color={enabled ? '#003a8c' : textSecondary}
        />
        <View style={styles.info}>
          <ThemedText style={[styles.label, { color: textColor }]}>
            Feedback auditivo
          </ThemedText>
          {enabled && isActive && (
            <ThemedText style={[styles.proximity, {
              color: absCents <= 3 ? '#22C55E' : absCents <= 10 ? '#F59E0B' : textSecondary
            }]}>
              {proximityLabel}
            </ThemedText>
          )}
        </View>
        <Pressable
          onPress={onToggle}
          style={({ pressed }) => [
            styles.toggleButton,
            {
              backgroundColor: enabled ? '#003a8c' : 'transparent',
              borderColor: enabled ? '#003a8c' : border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <ThemedText style={[styles.toggleText, { color: enabled ? '#ffffff' : textSecondary }]}>
            {enabled ? 'ON' : 'OFF'}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  proximity: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 14,
    marginTop: 1,
  },
  toggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 15,
  },
});
