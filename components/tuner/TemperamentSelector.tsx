/**
 * TemperamentSelector — Selector de temperamentos históricos
 * 
 * Permite al usuario elegir entre 8 temperamentos musicales históricos.
 * Muestra información detallada de cada temperamento y una visualización
 * de las desviaciones en cents para las 12 notas cromáticas.
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Line, Circle, Text as SvgText, Rect } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { TEMPERAMENTS, type Temperament } from '@/constants/temperaments';
import { NOTE_NAMES } from '@/constants/piano-tuning';

// ─── Props ──────────────────────────────────────────────────────────────────

interface TemperamentSelectorProps {
  selectedTemperamentId: string;
  onSelectTemperament: (id: string) => void;
}

// ─── Visualización del temperamento ─────────────────────────────────────────

function TemperamentChart({ temperament }: { temperament: Temperament }) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'border');
  
  const width = 320;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  
  const maxCents = Math.max(20, ...temperament.centsFromEqual.map(Math.abs));
  
  // Mapeo de notas cromáticas: C=0, C#=1, ... B=11
  // Pero queremos mostrar desde C hasta B
  const noteLabels = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  return (
    <Svg width={width} height={height}>
      {/* Línea base (0 cents) */}
      <Line
        x1={padding.left}
        y1={padding.top + chartH / 2}
        x2={padding.left + chartW}
        y2={padding.top + chartH / 2}
        stroke={borderColor}
        strokeWidth={1}
        strokeDasharray="4,4"
      />
      
      {/* Etiquetas de eje Y */}
      <SvgText
        x={padding.left - 5}
        y={padding.top + 4}
        textAnchor="end"
        fontSize={9}
        fill={textSecondary}
      >
        +{maxCents.toFixed(0)}¢
      </SvgText>
      <SvgText
        x={padding.left - 5}
        y={padding.top + chartH + 4}
        textAnchor="end"
        fontSize={9}
        fill={textSecondary}
      >
        -{maxCents.toFixed(0)}¢
      </SvgText>
      <SvgText
        x={padding.left - 5}
        y={padding.top + chartH / 2 + 4}
        textAnchor="end"
        fontSize={9}
        fill={textSecondary}
      >
        0
      </SvgText>
      
      {/* Barras y etiquetas para cada nota */}
      {temperament.centsFromEqual.map((cents, i) => {
        const x = padding.left + (i / 11) * chartW;
        const barHeight = (Math.abs(cents) / maxCents) * (chartH / 2);
        const barY = cents >= 0
          ? padding.top + chartH / 2 - barHeight
          : padding.top + chartH / 2;
        
        const barColor = Math.abs(cents) < 2 ? '#10B981' :
                         Math.abs(cents) < 8 ? '#F59E0B' : '#6366F1';
        
        return (
          <React.Fragment key={i}>
            {/* Barra */}
            <Rect
              x={x - 8}
              y={barY}
              width={16}
              height={Math.max(barHeight, 1)}
              rx={3}
              fill={barColor}
              opacity={0.8}
            />
            {/* Valor */}
            <SvgText
              x={x}
              y={cents >= 0 ? barY - 4 : barY + barHeight + 11}
              textAnchor="middle"
              fontSize={8}
              fill={textSecondary}
            >
              {cents > 0 ? '+' : ''}{cents.toFixed(1)}
            </SvgText>
            {/* Etiqueta de nota */}
            <SvgText
              x={x}
              y={height - 5}
              textAnchor="middle"
              fontSize={9}
              fontWeight={i === 9 ? '700' : '400'}
              fill={i === 9 ? '#6366F1' : textColor}
            >
              {noteLabels[i]}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// ─── Componente principal ───────────────────────────────────────────────────

export function TemperamentSelector({
  selectedTemperamentId,
  onSelectTemperament,
}: TemperamentSelectorProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const bgColor = useThemeColor({}, 'background');
  
  const [expandedId, setExpandedId] = useState<string | null>(selectedTemperamentId);
  
  const handleSelect = useCallback((id: string) => {
    onSelectTemperament(id);
    setExpandedId(id);
  }, [onSelectTemperament]);
  
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);
  
  const selectedTemperament = TEMPERAMENTS.find(t => t.id === selectedTemperamentId);
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Temperamento actual */}
      {selectedTemperament && (
        <View style={[styles.currentCard, { backgroundColor: '#6366F1' + '15', borderColor: '#6366F1' }]}>
          <ThemedText style={[styles.currentLabel, { color: '#6366F1' }]}>
            Temperamento activo
          </ThemedText>
          <ThemedText style={[styles.currentName, { color: textColor }]}>
            {selectedTemperament.name}
          </ThemedText>
          <ThemedText style={[styles.currentPeriod, { color: textSecondary }]}>
            {selectedTemperament.period} ({selectedTemperament.year > 0 ? selectedTemperament.year : `${Math.abs(selectedTemperament.year)} a.C.`})
          </ThemedText>
        </View>
      )}
      
      {/* Lista de temperamentos */}
      {TEMPERAMENTS.map(temperament => {
        const isSelected = temperament.id === selectedTemperamentId;
        const isExpanded = temperament.id === expandedId;
        
        return (
          <View
            key={temperament.id}
            style={[
              styles.temperamentCard,
              {
                backgroundColor: surfaceColor,
                borderColor: isSelected ? '#6366F1' : borderColor,
                borderWidth: isSelected ? 2 : 1,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => handleToggleExpand(temperament.id)}
              style={styles.temperamentHeader}
            >
              <View style={styles.temperamentHeaderLeft}>
                <View style={[
                  styles.radioOuter,
                  { borderColor: isSelected ? '#6366F1' : borderColor },
                ]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
                <View style={styles.temperamentInfo}>
                  <ThemedText style={[styles.temperamentName, { color: textColor }]}>
                    {temperament.shortName}
                  </ThemedText>
                  <ThemedText style={[styles.temperamentPeriod, { color: textSecondary }]}>
                    {temperament.period}
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={[styles.expandIcon, { color: textSecondary }]}>
                {isExpanded ? '▲' : '▼'}
              </ThemedText>
            </TouchableOpacity>
            
            {isExpanded && (
              <View style={styles.expandedContent}>
                <ThemedText style={[styles.description, { color: textSecondary }]}>
                  {temperament.description}
                </ThemedText>
                
                {/* Gráfico de desviaciones */}
                <View style={[styles.chartContainer, { backgroundColor: bgColor }]}>
                  <TemperamentChart temperament={temperament} />
                </View>
                
                <View style={[styles.usageBox, { backgroundColor: bgColor, borderColor }]}>
                  <ThemedText style={[styles.usageLabel, { color: textColor }]}>
                    Uso recomendado:
                  </ThemedText>
                  <ThemedText style={[styles.usageText, { color: textSecondary }]}>
                    {temperament.usage}
                  </ThemedText>
                </View>
                
                {!isSelected && (
                  <TouchableOpacity
                    onPress={() => handleSelect(temperament.id)}
                    style={styles.selectButton}
                  >
                    <ThemedText style={styles.selectButtonText}>
                      Usar este temperamento
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Estilos ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  
  currentCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  currentLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  currentName: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  currentPeriod: { fontSize: 13, marginTop: 2 },
  
  temperamentCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  temperamentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  temperamentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6366F1',
  },
  temperamentInfo: {},
  temperamentName: { fontSize: 15, fontWeight: '600' },
  temperamentPeriod: { fontSize: 12, marginTop: 1 },
  expandIcon: { fontSize: 12 },
  
  expandedContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  description: { fontSize: 13, lineHeight: 19 },
  chartContainer: {
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  usageBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  usageLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  usageText: { fontSize: 12, lineHeight: 18 },
  selectButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
