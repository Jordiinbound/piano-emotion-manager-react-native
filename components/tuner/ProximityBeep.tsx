/**
 * ProximityBeep — Feedback auditivo de proximidad
 * 
 * Emite un beep que acelera cuando la desviación en cents se acerca a 0.
 * Permite al técnico afinar sin mirar la pantalla (manos ocupadas con la clavija).
 * Usa Web Audio API OscillatorNode para generar tonos puros de baja latencia.
 * 
 * Usa refs para valores que cambian rápido (centsDeviation) para evitar
 * re-renders constantes y flickering del layout.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';

interface ProximityBeepProps {
  centsDeviation: number;
  isActive: boolean;
  enabled: boolean;
  onToggle: () => void;
}

type ProximityCategory = 'inactive' | 'perfect' | 'very_close' | 'close' | 'approaching' | 'far' | 'out_of_range';

function getCategory(absCents: number, active: boolean): ProximityCategory {
  if (!active) return 'inactive';
  if (absCents <= 1) return 'perfect';
  if (absCents <= 3) return 'very_close';
  if (absCents <= 10) return 'close';
  if (absCents <= 25) return 'approaching';
  if (absCents <= 50) return 'far';
  return 'out_of_range';
}

const LABELS: Record<ProximityCategory, string> = {
  inactive: 'Inactivo',
  perfect: '¡Perfecto!',
  very_close: 'Muy cerca',
  close: 'Cerca',
  approaching: 'Acercándose',
  far: 'Lejos',
  out_of_range: 'Fuera de rango',
};

function getCategoryColor(cat: ProximityCategory, fallback: string): string {
  if (cat === 'perfect' || cat === 'very_close') return '#22C55E';
  if (cat === 'close') return '#F59E0B';
  return fallback;
}

export function ProximityBeep({ centsDeviation, isActive, enabled, onToggle }: ProximityBeepProps) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const beepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const centsRef = useRef(centsDeviation);
  const isActiveRef = useRef(isActive);

  // Debounced visual category — only re-render when category actually changes
  const [displayCat, setDisplayCat] = useState<ProximityCategory>(() =>
    getCategory(Math.abs(centsDeviation), isActive)
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');

  // Sync refs (no re-render) + debounce visual category
  useEffect(() => {
    centsRef.current = centsDeviation;
    isActiveRef.current = isActive;

    const newCat = getCategory(Math.abs(centsDeviation), isActive);
    if (newCat !== displayCat) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => setDisplayCat(newCat), 250);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [centsDeviation, isActive]); // intentionally omit displayCat to avoid loop

  // Audio context (lazy)
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  // Play a short beep
  const playBeep = useCallback((freq: number, dur: number) => {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.005);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + dur);
    } catch {}
  }, [getAudioCtx]);

  // Beep loop — reads from refs, runs on a fixed 150ms polling interval
  // instead of re-creating setInterval on every centsDeviation change
  useEffect(() => {
    if (!enabled) {
      if (beepIntervalRef.current) { clearInterval(beepIntervalRef.current); beepIntervalRef.current = null; }
      return;
    }

    // Single polling loop that reads current values from refs
    let lastBeepTime = 0;
    const POLL_MS = 80; // check 12 times/sec

    beepIntervalRef.current = setInterval(() => {
      if (!isActiveRef.current || !enabledRef.current) return;
      const absCents = Math.abs(centsRef.current);
      if (absCents > 50) return;

      // Determine beep interval based on proximity
      let minGap: number, freq: number, dur: number;
      if (absCents <= 1)       { minGap = 100;  freq = 1800; dur = 0.08; }
      else if (absCents <= 3)  { minGap = 150;  freq = 1500; dur = 0.06; }
      else if (absCents <= 5)  { minGap = 250;  freq = 1200; dur = 0.05; }
      else if (absCents <= 10) { minGap = 400;  freq = 1000; dur = 0.04; }
      else if (absCents <= 20) { minGap = 600;  freq = 800;  dur = 0.035; }
      else if (absCents <= 35) { minGap = 900;  freq = 600;  dur = 0.03; }
      else                     { minGap = 1200; freq = 500;  dur = 0.025; }

      const now = Date.now();
      if (now - lastBeepTime >= minGap) {
        playBeep(freq, dur);
        lastBeepTime = now;
      }
    }, POLL_MS);

    return () => {
      if (beepIntervalRef.current) { clearInterval(beepIntervalRef.current); beepIntervalRef.current = null; }
    };
  }, [enabled, playBeep]); // only re-create when enabled toggles

  // Keep enabledRef in sync
  const enabledRef = useRef(enabled);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  const labelColor = getCategoryColor(displayCat, textSecondary);

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
          {/* Always render the proximity line to keep layout stable */}
          <ThemedText style={[styles.proximity, { color: labelColor }]}>
            {LABELS[displayCat]}
          </ThemedText>
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
