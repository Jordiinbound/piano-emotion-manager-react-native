/**
 * UnisonMeter - Medidor de batidos para afinación de unísonos
 * 
 * Los pianos acústicos tienen 2-3 cuerdas por nota (excepto los graves).
 * Cuando las cuerdas están ligeramente desafinadas entre sí, producen
 * "batidos" audibles. Este componente visualiza la frecuencia de batido
 * y guía al técnico para eliminarlos.
 * 
 * Frecuencia de batido = |f1 - f2| entre dos cuerdas del unísono
 * Objetivo: reducir los batidos a 0 Hz (cuerdas perfectamente al unísono)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import Svg, { Circle, Line, G, Rect, Text as SvgText } from 'react-native-svg';

interface UnisonMeterProps {
  /** Frecuencia de batido detectada (Hz), null si no se detecta */
  beatFrequency: number | null;
  /** Si el afinador está activo */
  isActive: boolean;
  /** Ancho del componente */
  width: number;
}

export function UnisonMeter({ beatFrequency, isActive, width }: UnisonMeterProps) {
  const border = useThemeColor({}, 'border');
  const surface = useThemeColor({}, 'surface');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({}, 'cardBackground');
  
  const meterWidth = width - 64;
  const meterHeight = 40;
  const maxBeatFreq = 10; // Hz
  
  // Determinar estado y color
  let statusColor = border;
  let statusText = 'Sin señal';
  let statusDesc = 'Toque una nota para detectar batidos';
  
  if (isActive && beatFrequency !== null) {
    if (beatFrequency < 0.5) {
      statusColor = '#10B981';
      statusText = 'Unísono limpio';
      statusDesc = 'Las cuerdas están al unísono';
    } else if (beatFrequency < 1.5) {
      statusColor = '#F59E0B';
      statusText = `${beatFrequency.toFixed(1)} batidos/s`;
      statusDesc = 'Casi al unísono — ajuste fino necesario';
    } else {
      statusColor = '#EF4444';
      statusText = `${beatFrequency.toFixed(1)} batidos/s`;
      statusDesc = 'Batidos detectados — cuerdas desafinadas';
    }
  } else if (isActive) {
    statusColor = '#6b7280';
    statusText = 'Analizando...';
    statusDesc = 'Mantenga la nota pulsada para detectar batidos';
  }
  
  // Posición del indicador en la barra
  const beatPos = beatFrequency !== null
    ? Math.min(1, beatFrequency / maxBeatFreq)
    : 0;
  
  // Generar "onda" visual de batidos
  const wavePoints: string[] = [];
  if (isActive && beatFrequency !== null && beatFrequency > 0.3) {
    const numCycles = Math.min(8, Math.max(2, beatFrequency * 2));
    const amplitude = Math.min(15, beatFrequency * 3);
    for (let x = 0; x <= meterWidth; x += 2) {
      const t = x / meterWidth;
      const y = meterHeight / 2 + amplitude * Math.sin(t * numCycles * Math.PI * 2);
      wavePoints.push(`${x + 32},${y}`);
    }
  }
  
  return (
    <View style={[styles.container, { borderColor: border, backgroundColor: cardBg }]}>
      <View style={styles.header}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <ThemedText style={[styles.title, { color: textSecondary }]}>
          Modo Unísono
        </ThemedText>
      </View>
      
      {/* Visualización de onda de batidos */}
      <View style={styles.meterContainer}>
        <Svg width={width - 32} height={meterHeight} viewBox={`0 0 ${width - 32} ${meterHeight}`}>
          {/* Fondo */}
          <Rect
            x={32}
            y={0}
            width={meterWidth}
            height={meterHeight}
            rx={4}
            fill={surface}
          />
          
          {/* Línea central (objetivo = 0 batidos) */}
          <Line
            x1={32}
            y1={meterHeight / 2}
            x2={32 + meterWidth}
            y2={meterHeight / 2}
            stroke={border}
            strokeWidth={1}
            strokeDasharray="4,4"
          />
          
          {/* Onda de batidos */}
          {wavePoints.length > 1 && (
            <G>
              {wavePoints.map((point, i) => {
                if (i === 0) return null;
                const [x1, y1] = wavePoints[i - 1].split(',').map(Number);
                const [x2, y2] = point.split(',').map(Number);
                return (
                  <Line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={statusColor}
                    strokeWidth={2}
                  />
                );
              })}
            </G>
          )}
          
          {/* Si no hay batidos, línea plana verde */}
          {isActive && beatFrequency !== null && beatFrequency < 0.5 && (
            <Line
              x1={32}
              y1={meterHeight / 2}
              x2={32 + meterWidth}
              y2={meterHeight / 2}
              stroke="#10B981"
              strokeWidth={2}
            />
          )}
          
          {/* Escala de frecuencia de batidos */}
          {[0, 2, 5, 10].map(freq => {
            const x = 32 + (freq / maxBeatFreq) * meterWidth;
            return (
              <G key={freq}>
                <Line
                  x1={x}
                  y1={meterHeight - 6}
                  x2={x}
                  y2={meterHeight}
                  stroke={textSecondary}
                  strokeWidth={0.5}
                />
                <SvgText
                  x={x}
                  y={meterHeight - 8}
                  fill={textSecondary}
                  fontSize={8}
                  textAnchor="middle"
                >
                  {freq}
                </SvgText>
              </G>
            );
          })}
          
          {/* Etiqueta Hz */}
          <SvgText
            x={16}
            y={meterHeight / 2}
            fill={textSecondary}
            fontSize={9}
            textAnchor="middle"
            alignmentBaseline="central"
          >
            Hz
          </SvgText>
        </Svg>
      </View>
      
      {/* Estado */}
      <View style={styles.statusRow}>
        <ThemedText style={[styles.statusText, { color: statusColor }]}>
          {statusText}
        </ThemedText>
        <ThemedText style={[styles.statusDesc, { color: textSecondary }]}>
          {statusDesc}
        </ThemedText>
      </View>
      
      {/* Instrucciones */}
      <View style={[styles.infoBox, { backgroundColor: surface }]}>
        <ThemedText style={[styles.infoText, { color: textSecondary }]}>
          Para afinar unísonos: silencie las cuerdas laterales con una cuña de goma y afine la cuerda central primero. Luego retire las cuñas una a una y ajuste cada cuerda hasta eliminar los batidos.
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
    gap: 8,
    marginBottom: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  meterContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  statusRow: {
    alignItems: 'center',
    gap: 2,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 22,
  },
  statusDesc: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 16,
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
