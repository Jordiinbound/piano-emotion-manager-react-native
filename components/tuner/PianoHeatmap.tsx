/**
 * PianoHeatmap — Mapa de calor del piano
 * 
 * Visualització de les 88 tecles com a mapa de calor (verd → vermell)
 * que mostra d'un cop d'ull l'estat global d'afinació del piano.
 * Inclou puntuació global i resum per seccions.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import {
  TOTAL_KEYS,
  getNoteName,
  getOctave,
  getFullNoteName,
  isBlackKey,
} from '@/constants/piano-tuning';
import type { KeyMeasurement } from '@/contexts/TunerContext';

interface PianoHeatmapProps {
  /** Mesures per tecla (88 elements) */
  measurements: (KeyMeasurement | null)[];
  /** Callback quan es toca una tecla */
  onKeyPress?: (keyIndex: number) => void;
  /** Mode fosc */
  darkTuningMode?: boolean;
}

function getHeatColor(centsDeviation: number | null): string {
  if (centsDeviation === null) return '#444444'; // No mesurat
  
  const absCents = Math.abs(centsDeviation);
  if (absCents <= 1) return '#22C55E';      // Perfecte
  if (absCents <= 2) return '#4ADE80';      // Molt bé
  if (absCents <= 5) return '#86EFAC';      // Bé
  if (absCents <= 8) return '#FDE047';      // Acceptable
  if (absCents <= 12) return '#FBBF24';     // Necessita ajust
  if (absCents <= 20) return '#F59E0B';     // Desafinat
  if (absCents <= 30) return '#EF4444';     // Molt desafinat
  return '#DC2626';                          // Crític
}

function getScoreFromCents(absCents: number): number {
  if (absCents <= 1) return 100;
  if (absCents <= 2) return 95;
  if (absCents <= 5) return 85;
  if (absCents <= 8) return 70;
  if (absCents <= 12) return 55;
  if (absCents <= 20) return 35;
  if (absCents <= 30) return 15;
  return 5;
}

export function PianoHeatmap({ measurements, onKeyPress, darkTuningMode }: PianoHeatmapProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const cardBg = useThemeColor({}, 'cardBackground');

  const fgText = darkTuningMode ? '#ffffff' : textColor;
  const fgMuted = darkTuningMode ? '#888888' : textSecondary;
  const bgSurface = darkTuningMode ? '#1a1a1a' : surface;
  const bgBorder = darkTuningMode ? '#333333' : border;
  const bgCard = darkTuningMode ? '#111111' : cardBg;

  const stats = useMemo(() => {
    const measured = measurements.filter(m => m !== null) as KeyMeasurement[];
    if (measured.length === 0) return null;

    const totalScore = measured.reduce((sum, m) => sum + getScoreFromCents(Math.abs(m.centsDeviation)), 0);
    const globalScore = Math.round(totalScore / measured.length);
    
    const avgDeviation = measured.reduce((sum, m) => sum + Math.abs(m.centsDeviation), 0) / measured.length;
    
    // Seccions: greus (0-27), mitjans (28-55), aguts (56-87)
    const sections = [
      { name: 'Greus', keys: measured.filter(m => m.keyIndex < 28) },
      { name: 'Mitjans', keys: measured.filter(m => m.keyIndex >= 28 && m.keyIndex < 56) },
      { name: 'Aguts', keys: measured.filter(m => m.keyIndex >= 56) },
    ].map(s => ({
      name: s.name,
      count: s.keys.length,
      avgDeviation: s.keys.length > 0 
        ? s.keys.reduce((sum, m) => sum + Math.abs(m.centsDeviation), 0) / s.keys.length 
        : 0,
      score: s.keys.length > 0
        ? Math.round(s.keys.reduce((sum, m) => sum + getScoreFromCents(Math.abs(m.centsDeviation)), 0) / s.keys.length)
        : 0,
    }));

    // Tecles problemàtiques (>10 cents)
    const problematic = measured
      .filter(m => Math.abs(m.centsDeviation) > 10)
      .sort((a, b) => Math.abs(b.centsDeviation) - Math.abs(a.centsDeviation))
      .slice(0, 5);

    return { globalScore, avgDeviation, measuredCount: measured.length, sections, problematic };
  }, [measurements]);

  const scoreColor = !stats ? fgMuted
    : stats.globalScore >= 90 ? '#22C55E'
    : stats.globalScore >= 75 ? '#4ADE80'
    : stats.globalScore >= 60 ? '#F59E0B'
    : '#EF4444';

  // Mapa de calor SVG — 88 tecles en files de 22
  const CELL_SIZE = 12;
  const CELL_GAP = 1;
  const COLS = 22;
  const ROWS = 4;
  const SVG_WIDTH = COLS * (CELL_SIZE + CELL_GAP);
  const SVG_HEIGHT = ROWS * (CELL_SIZE + CELL_GAP) + 20;

  return (
    <View style={[styles.container, { backgroundColor: bgSurface, borderColor: bgBorder }]}>
      {/* Puntuació global */}
      <View style={styles.scoreSection}>
        <View style={styles.scoreCircle}>
          <ThemedText style={[styles.scoreValue, { color: scoreColor }]}>
            {stats ? stats.globalScore : '—'}
          </ThemedText>
          <ThemedText style={[styles.scoreLabel, { color: fgMuted }]}>
            /100
          </ThemedText>
        </View>
        <View style={styles.scoreInfo}>
          <ThemedText style={[styles.scoreTitle, { color: fgText }]}>
            Estat d'afinació
          </ThemedText>
          <ThemedText style={[styles.scoreDesc, { color: fgMuted }]}>
            {stats 
              ? `${stats.measuredCount}/${TOTAL_KEYS} tecles mesurades · Desv. mitjana: ${stats.avgDeviation.toFixed(1)}¢`
              : 'Cap tecla mesurada encara'
            }
          </ThemedText>
        </View>
      </View>

      {/* Mapa de calor */}
      <View style={styles.heatmapContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg width={SVG_WIDTH} height={SVG_HEIGHT} viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}>
            {/* Etiquetes d'octava */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map(oct => {
              const startKey = oct === 0 ? 0 : (oct * 12 - 8);
              const col = startKey % COLS;
              const x = col * (CELL_SIZE + CELL_GAP);
              return (
                <SvgText
                  key={oct}
                  x={x + CELL_SIZE / 2}
                  y={SVG_HEIGHT - 2}
                  fontSize={7}
                  fill={fgMuted}
                  textAnchor="middle"
                >
                  {oct}
                </SvgText>
              );
            })}
            
            {/* Cel·les del mapa de calor */}
            {Array.from({ length: TOTAL_KEYS }, (_, i) => {
              const row = Math.floor(i / COLS);
              const col = i % COLS;
              const x = col * (CELL_SIZE + CELL_GAP);
              const y = row * (CELL_SIZE + CELL_GAP);
              const m = measurements[i];
              const color = getHeatColor(m?.centsDeviation ?? null);
              const black = isBlackKey(i);
              
              return (
                <Rect
                  key={i}
                  x={x}
                  y={y}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  fill={color}
                  rx={2}
                  opacity={black ? 0.85 : 1}
                  stroke={bgBorder}
                  strokeWidth={0.5}
                  onPress={() => onKeyPress?.(i)}
                />
              );
            })}
          </Svg>
        </ScrollView>
      </View>

      {/* Llegenda */}
      <View style={styles.legendRow}>
        {[
          { color: '#444444', label: 'No mesurat' },
          { color: '#22C55E', label: '≤2¢' },
          { color: '#86EFAC', label: '≤5¢' },
          { color: '#FBBF24', label: '≤12¢' },
          { color: '#EF4444', label: '>12¢' },
        ].map((item, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <ThemedText style={[styles.legendText, { color: fgMuted }]}>
              {item.label}
            </ThemedText>
          </View>
        ))}
      </View>

      {/* Seccions */}
      {stats && stats.sections.length > 0 && (
        <View style={styles.sectionsRow}>
          {stats.sections.map((section, i) => (
            <View key={i} style={[styles.sectionItem, { backgroundColor: bgCard, borderColor: bgBorder }]}>
              <ThemedText style={[styles.sectionName, { color: fgText }]}>
                {section.name}
              </ThemedText>
              <ThemedText style={[styles.sectionScore, {
                color: section.score >= 90 ? '#22C55E'
                  : section.score >= 75 ? '#4ADE80'
                  : section.score >= 60 ? '#F59E0B'
                  : '#EF4444'
              }]}>
                {section.count > 0 ? section.score : '—'}
              </ThemedText>
              <ThemedText style={[styles.sectionDetail, { color: fgMuted }]}>
                {section.count > 0 ? `±${section.avgDeviation.toFixed(1)}¢` : 'Sense dades'}
              </ThemedText>
            </View>
          ))}
        </View>
      )}

      {/* Tecles problemàtiques */}
      {stats && stats.problematic.length > 0 && (
        <View style={[styles.problemSection, { borderTopColor: bgBorder }]}>
          <ThemedText style={[styles.problemTitle, { color: fgText }]}>
            Tecles que necessiten atenció
          </ThemedText>
          {stats.problematic.map((m, i) => (
            <Pressable
              key={i}
              onPress={() => onKeyPress?.(m.keyIndex)}
              style={({ pressed }) => [
                styles.problemRow,
                { backgroundColor: pressed ? bgBorder + '40' : 'transparent' }
              ]}
            >
              <ThemedText style={[styles.problemNote, { color: '#EF4444' }]}>
                {getFullNoteName(m.keyIndex)}
              </ThemedText>
              <ThemedText style={[styles.problemDeviation, { color: fgMuted }]}>
                {m.centsDeviation > 0 ? '+' : ''}{m.centsDeviation.toFixed(1)}¢
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginRight: 12,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: '800',
    fontFamily: 'Montserrat',
    lineHeight: 42,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 18,
    marginLeft: 2,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  scoreDesc: {
    fontSize: 11,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 14,
    marginTop: 2,
  },
  heatmapContainer: {
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 9,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 12,
  },
  sectionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  sectionItem: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  sectionName: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 14,
  },
  sectionScore: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'Montserrat',
    lineHeight: 28,
  },
  sectionDetail: {
    fontSize: 9,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 12,
  },
  problemSection: {
    borderTopWidth: 1,
    paddingTop: 8,
  },
  problemTitle: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 14,
    marginBottom: 6,
  },
  problemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  problemNote: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 16,
  },
  problemDeviation: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 16,
  },
});
