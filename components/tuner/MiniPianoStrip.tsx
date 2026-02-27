/**
 * MiniPianoStrip - Tira horizontal de 88 teclas del piano
 * 
 * Muestra una representación compacta de las 88 teclas del piano
 * con indicadores de color según el estado de afinación de cada tecla.
 * Permite seleccionar teclas tocándolas.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  TOTAL_KEYS,
  isBlackKey,
  getNoteName,
  getOctave,
  getTuningColor,
} from '@/constants/piano-tuning';
import { KeyMeasurement } from '@/contexts/TunerContext';

interface MiniPianoStripProps {
  /** Tecla actualmente activa/detectada */
  activeKey: number;
  /** Mediciones guardadas */
  measurements: (KeyMeasurement | null)[];
  /** Callback al seleccionar una tecla */
  onKeyPress: (keyIndex: number) => void;
}

const WHITE_KEY_WIDTH = 22;
const WHITE_KEY_HEIGHT = 48;
const BLACK_KEY_WIDTH = 14;
const BLACK_KEY_HEIGHT = 30;

export function MiniPianoStrip({ activeKey, measurements, onKeyPress }: MiniPianoStripProps) {
  const scrollRef = useRef<ScrollView>(null);
  const border = useThemeColor({}, 'border');
  const surface = useThemeColor({}, 'surface');
  const cardBg = useThemeColor({}, 'cardBackground');
  
  // Auto-scroll a la tecla activa
  useEffect(() => {
    if (activeKey >= 0 && scrollRef.current) {
      // Calcular posición X de la tecla
      let whiteKeyCount = 0;
      for (let i = 0; i < activeKey; i++) {
        if (!isBlackKey(i)) whiteKeyCount++;
      }
      const scrollX = Math.max(0, whiteKeyCount * WHITE_KEY_WIDTH - 120);
      scrollRef.current.scrollTo({ x: scrollX, animated: true });
    }
  }, [activeKey]);
  
  // Generar teclas blancas y negras
  const whiteKeys: number[] = [];
  const blackKeys: { index: number; offsetX: number }[] = [];
  
  let whiteIndex = 0;
  for (let i = 0; i < TOTAL_KEYS; i++) {
    if (!isBlackKey(i)) {
      whiteKeys.push(i);
      whiteIndex++;
    } else {
      // Posicionar tecla negra entre las dos blancas adyacentes
      const offsetX = (whiteIndex - 1) * WHITE_KEY_WIDTH + WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2;
      blackKeys.push({ index: i, offsetX });
    }
  }
  
  const totalWidth = whiteKeys.length * WHITE_KEY_WIDTH;
  
  const getKeyColor = useCallback((keyIndex: number): string | null => {
    const measurement = measurements[keyIndex];
    if (measurement) {
      return getTuningColor(measurement.centsDeviation);
    }
    return null;
  }, [measurements]);
  
  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor: border }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ width: totalWidth, height: WHITE_KEY_HEIGHT + 4 }}
        style={styles.scrollView}
      >
        <View style={{ width: totalWidth, height: WHITE_KEY_HEIGHT, position: 'relative' }}>
          {/* Teclas blancas */}
          {whiteKeys.map((keyIndex, i) => {
            const isActive = keyIndex === activeKey;
            const measuredColor = getKeyColor(keyIndex);
            const noteName = getNoteName(keyIndex);
            const octave = getOctave(keyIndex);
            const showLabel = noteName === 'C';
            
            return (
              <Pressable
                key={keyIndex}
                onPress={() => onKeyPress(keyIndex)}
                style={[
                  styles.whiteKey,
                  {
                    left: i * WHITE_KEY_WIDTH,
                    borderColor: isActive ? '#003a8c' : '#d1d5db',
                    backgroundColor: isActive ? '#003a8c10' : '#ffffff',
                  },
                ]}
              >
                {measuredColor && (
                  <View style={[styles.measureDot, { backgroundColor: measuredColor }]} />
                )}
                {showLabel && (
                  <ThemedText style={styles.keyLabel}>C{octave}</ThemedText>
                )}
              </Pressable>
            );
          })}
          
          {/* Teclas negras */}
          {blackKeys.map(({ index: keyIndex, offsetX }) => {
            const isActive = keyIndex === activeKey;
            const measuredColor = getKeyColor(keyIndex);
            
            return (
              <Pressable
                key={keyIndex}
                onPress={() => onKeyPress(keyIndex)}
                style={[
                  styles.blackKey,
                  {
                    left: offsetX,
                    backgroundColor: isActive ? '#003a8c' : '#1a1a2e',
                  },
                ]}
              >
                {measuredColor && (
                  <View style={[styles.measureDotBlack, { backgroundColor: measuredColor }]} />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  scrollView: {
    height: WHITE_KEY_HEIGHT + 4,
  },
  whiteKey: {
    position: 'absolute',
    width: WHITE_KEY_WIDTH - 1,
    height: WHITE_KEY_HEIGHT,
    borderWidth: 0.5,
    borderRadius: 0,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  blackKey: {
    position: 'absolute',
    width: BLACK_KEY_WIDTH,
    height: BLACK_KEY_HEIGHT,
    borderRadius: 0,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  measureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    bottom: 3,
  },
  measureDotBlack: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    position: 'absolute',
    bottom: 3,
  },
  keyLabel: {
    fontSize: 7,
    fontWeight: '500',
    color: '#9ca3af',
    lineHeight: 10,
    fontFamily: 'Montserrat',
  },
});
