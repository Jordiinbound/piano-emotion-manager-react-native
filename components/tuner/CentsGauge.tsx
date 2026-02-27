/**
 * CentsGauge - Medidor circular de desviación en cents
 * 
 * Componente principal del afinador que muestra la desviación
 * de la nota detectada respecto a la frecuencia objetivo.
 * Usa SVG para renderizar el arco y la aguja.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getTuningColor, getTuningStatus } from '@/constants/piano-tuning';
import Svg, { Path, Circle, Line, G, Text as SvgText } from 'react-native-svg';
// Animation support available via react-native-reanimated if needed

interface CentsGaugeProps {
  /** Desviación en cents (-range a +range) */
  centsDeviation: number;
  /** Rango del medidor */
  range: number;
  /** Si hay una nota detectada */
  isActive: boolean;
  /** Tamaño del componente */
  size?: number;
}

export function CentsGauge({ centsDeviation, range, isActive, size = 280 }: CentsGaugeProps) {
  const background = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  
  const center = size / 2;
  const radius = size / 2 - 30;
  const needleLength = radius - 15;
  
  // Ángulo: -135° (flat) a +135° (sharp), 0° = arriba (in tune)
  const startAngle = -135;
  const endAngle = 135;
  const totalAngle = endAngle - startAngle;
  
  // Clamp cents to range
  const clampedCents = Math.max(-range, Math.min(range, centsDeviation));
  const normalizedPosition = clampedCents / range; // -1 to 1
  const targetAngle = normalizedPosition * (totalAngle / 2);
  
  // Color basado en desviación
  const tuningColor = isActive ? getTuningColor(centsDeviation) : border;
  const status = isActive ? getTuningStatus(centsDeviation) : null;
  
  // Generar marcas del arco
  const ticks: { angle: number; label: string; isMajor: boolean }[] = [];
  const tickValues = [-range, -range / 2, 0, range / 2, range];
  tickValues.forEach(val => {
    const norm = val / range;
    const angle = norm * (totalAngle / 2) - 90; // SVG: 0° = right, so offset by -90
    ticks.push({
      angle,
      label: val > 0 ? `+${val}` : `${val}`,
      isMajor: true,
    });
  });
  
  // Generar arco de fondo
  const arcPath = describeArc(center, center, radius, startAngle - 90, endAngle - 90);
  
  // Posición de la aguja
  const needleAngle = targetAngle - 90; // Offset SVG
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleX2 = center + needleLength * Math.cos(needleRad);
  const needleY2 = center + needleLength * Math.sin(needleRad);
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Arco de fondo */}
        <Path
          d={arcPath}
          fill="none"
          stroke={border}
          strokeWidth={8}
          strokeLinecap="round"
        />
        
        {/* Zona verde central (±2 cents) */}
        {(() => {
          const greenRange = 2 / range;
          const greenStart = -greenRange * (totalAngle / 2) - 90;
          const greenEnd = greenRange * (totalAngle / 2) - 90;
          return (
            <Path
              d={describeArc(center, center, radius, greenStart, greenEnd)}
              fill="none"
              stroke="#10B981"
              strokeWidth={8}
              strokeLinecap="round"
              opacity={0.4}
            />
          );
        })()}
        
        {/* Marcas de graduación */}
        {ticks.map((tick, i) => {
          const rad = (tick.angle * Math.PI) / 180;
          const innerR = radius - (tick.isMajor ? 18 : 12);
          const outerR = radius + 4;
          const x1 = center + innerR * Math.cos(rad);
          const y1 = center + innerR * Math.sin(rad);
          const x2 = center + outerR * Math.cos(rad);
          const y2 = center + outerR * Math.sin(rad);
          const labelR = radius + 20;
          const lx = center + labelR * Math.cos(rad);
          const ly = center + labelR * Math.sin(rad);
          
          return (
            <G key={i}>
              <Line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={textSecondary}
                strokeWidth={tick.isMajor ? 2 : 1}
              />
              {tick.isMajor && (
                <SvgText
                  x={lx} y={ly}
                  fill={textSecondary}
                  fontSize={10}
                  textAnchor="middle"
                  alignmentBaseline="central"
                >
                  {tick.label}
                </SvgText>
              )}
            </G>
          );
        })}
        
        {/* Indicador central (punto de referencia) */}
        <Circle
          cx={center}
          cy={center - radius + 12}
          r={4}
          fill="#10B981"
        />
        
        {/* Aguja */}
        <Line
          x1={center}
          y1={center}
          x2={isActive ? needleX2 : center}
          y2={isActive ? needleY2 : center - needleLength}
          stroke={tuningColor}
          strokeWidth={3}
          strokeLinecap="round"
        />
        
        {/* Centro de la aguja */}
        <Circle
          cx={center}
          cy={center}
          r={8}
          fill={tuningColor}
        />
        <Circle
          cx={center}
          cy={center}
          r={4}
          fill={background}
        />
      </Svg>
      
      {/* Texto central: desviación en cents */}
      <View style={[styles.centerText, { top: center + 30 }]}>
        <ThemedText style={[styles.centsValue, { color: tuningColor }]}>
          {isActive ? (centsDeviation > 0 ? '+' : '') + centsDeviation.toFixed(1) : '—'}
        </ThemedText>
        <ThemedText style={[styles.centsLabel, { color: textSecondary }]}>
          cents
        </ThemedText>
      </View>
      
      {/* Indicador de estado */}
      {isActive && status && (
        <View style={[styles.statusBadge, { backgroundColor: tuningColor + '20', top: center + 75 }]}>
          <ThemedText style={[styles.statusText, { color: tuningColor }]}>
            {status === 'in_tune' ? '✓ Afinado' : 
             status === 'close' ? 'Cerca' : 
             centsDeviation > 0 ? '↑ Alto' : '↓ Bajo'}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

// ─── Utilidad SVG ────────────────────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centerText: {
    position: 'absolute',
    alignItems: 'center',
    left: 0,
    right: 0,
  },
  centsValue: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 38,
  },
  centsLabel: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 18,
    marginTop: 2,
  },
  statusBadge: {
    position: 'absolute',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    left: '50%',
    transform: [{ translateX: -40 }],
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 18,
    textAlign: 'center',
  },
});
