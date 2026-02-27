/**
 * AnimatedCentsGauge — Medidor de cents con animación suave
 * 
 * Versión mejorada del CentsGauge original con:
 * - Aguja animada con react-native-reanimated (movimiento fluido tipo analógico)
 * - Indicador de estabilidad (punto verde cuando la lectura es estable)
 * - Zona de tolerancia visual (franja verde central)
 * - Modo oscuro optimizado para afinación
 */

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, G, Text as SvgText } from 'react-native-svg';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getTuningColor, getTuningStatus, NOTE_NAMES, TOTAL_KEYS } from '@/constants/piano-tuning';

interface AnimatedCentsGaugeProps {
  /** Desviación en cents (-50 a +50 típico) */
  centsDeviation: number;
  /** Índice de la tecla detectada */
  keyIndex: number;
  /** Frecuencia detectada */
  frequency: number;
  /** Frecuencia objetivo */
  targetFrequency: number;
  /** Confianza de la detección (0-1) */
  confidence: number;
  /** Rango del medidor en cents */
  meterRange: number;
  /** Mostrar frecuencia */
  showFrequency: boolean;
  /** Si la lectura está estabilizada (EMA convergida) */
  isStable: boolean;
  /** Modo oscuro para afinación */
  darkTuningMode: boolean;
}

const GAUGE_SIZE = 260;
const GAUGE_RADIUS = 110;
const NEEDLE_LENGTH = 90;
const CENTER_X = GAUGE_SIZE / 2;
const CENTER_Y = GAUGE_SIZE / 2 + 20;
const ARC_START_ANGLE = -135;
const ARC_END_ANGLE = -45;
const ARC_RANGE = ARC_END_ANGLE - ARC_START_ANGLE; // 90 degrees

export function AnimatedCentsGauge({
  centsDeviation,
  keyIndex,
  frequency,
  targetFrequency,
  confidence,
  meterRange,
  showFrequency,
  isStable,
  darkTuningMode,
}: AnimatedCentsGaugeProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');

  // Override colors for dark tuning mode
  const fgColor = darkTuningMode ? '#FFFFFF' : textColor;
  const fgSecondary = darkTuningMode ? '#999999' : textSecondary;
  const bgColor = darkTuningMode ? '#000000' : surfaceColor;
  const bdColor = darkTuningMode ? '#333333' : borderColor;

  // Animated needle angle
  const needleAngle = useSharedValue(0);

  useEffect(() => {
    if (keyIndex < 0 || confidence < 0.3) {
      // No detection — return to center
      needleAngle.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    // Clamp cents to meter range
    const clampedCents = Math.max(-meterRange, Math.min(meterRange, centsDeviation));
    // Map cents to angle: -meterRange → ARC_START, 0 → center, +meterRange → ARC_END
    const normalizedPosition = clampedCents / meterRange; // -1 to 1
    const targetAngle = normalizedPosition * (ARC_RANGE / 2); // -45 to 45 degrees

    needleAngle.value = withTiming(targetAngle, {
      duration: 150,
      easing: Easing.out(Easing.quad),
    });
  }, [centsDeviation, keyIndex, confidence, meterRange]);

  const animatedNeedleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${needleAngle.value}deg` }],
    };
  });

  // Tuning color and status
  const tuningColor = useMemo(() => getTuningColor(centsDeviation), [centsDeviation]);
  const tuningStatus = useMemo(() => getTuningStatus(centsDeviation), [centsDeviation]);

  // Note name
  const noteName = keyIndex >= 0 && keyIndex < TOTAL_KEYS
    ? NOTE_NAMES[keyIndex]
    : '—';

  // Scale tick marks
  const ticks = useMemo(() => {
    const result: { angle: number; label: string; isMajor: boolean }[] = [];
    const step = meterRange <= 25 ? 5 : 10;
    
    for (let cents = -meterRange; cents <= meterRange; cents += step) {
      const normalized = cents / meterRange;
      const angle = ARC_START_ANGLE + (ARC_RANGE / 2) + normalized * (ARC_RANGE / 2);
      result.push({
        angle,
        label: cents === 0 ? '0' : `${cents > 0 ? '+' : ''}${cents}`,
        isMajor: cents % (step * 2) === 0 || cents === 0,
      });
    }
    return result;
  }, [meterRange]);

  // Arc path for the tolerance zone (±2 cents = "in tune")
  const toleranceArc = useMemo(() => {
    const toleranceCents = 2;
    const startNorm = -toleranceCents / meterRange;
    const endNorm = toleranceCents / meterRange;
    const startAngle = (ARC_START_ANGLE + ARC_RANGE / 2 + startNorm * ARC_RANGE / 2) * Math.PI / 180;
    const endAngle = (ARC_START_ANGLE + ARC_RANGE / 2 + endNorm * ARC_RANGE / 2) * Math.PI / 180;
    
    const r = GAUGE_RADIUS + 5;
    const x1 = CENTER_X + r * Math.cos(startAngle);
    const y1 = CENTER_Y + r * Math.sin(startAngle);
    const x2 = CENTER_X + r * Math.cos(endAngle);
    const y2 = CENTER_Y + r * Math.sin(endAngle);
    
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  }, [meterRange]);

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor: bdColor }]}>
      {/* SVG Gauge */}
      <View style={styles.gaugeContainer}>
        <Svg width={GAUGE_SIZE} height={GAUGE_SIZE - 30} viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE - 30}`}>
          {/* Background arc */}
          <Circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={GAUGE_RADIUS}
            stroke={bdColor}
            strokeWidth={2}
            fill="none"
            strokeDasharray="4,4"
            opacity={0.3}
          />

          {/* Tolerance zone arc (green) */}
          <Path
            d={toleranceArc}
            stroke="#22C55E"
            strokeWidth={6}
            fill="none"
            opacity={0.5}
            strokeLinecap="round"
          />

          {/* Tick marks */}
          <G>
            {ticks.map((tick, i) => {
              const angleRad = tick.angle * Math.PI / 180;
              const innerR = tick.isMajor ? GAUGE_RADIUS - 15 : GAUGE_RADIUS - 10;
              const outerR = GAUGE_RADIUS;
              const x1 = CENTER_X + innerR * Math.cos(angleRad);
              const y1 = CENTER_Y + innerR * Math.sin(angleRad);
              const x2 = CENTER_X + outerR * Math.cos(angleRad);
              const y2 = CENTER_Y + outerR * Math.sin(angleRad);
              const labelR = GAUGE_RADIUS + 16;
              const lx = CENTER_X + labelR * Math.cos(angleRad);
              const ly = CENTER_Y + labelR * Math.sin(angleRad);

              return (
                <G key={i}>
                  <Line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={fgSecondary}
                    strokeWidth={tick.isMajor ? 2 : 1}
                    opacity={tick.isMajor ? 0.7 : 0.4}
                  />
                  {tick.isMajor && (
                    <SvgText
                      x={lx} y={ly}
                      fill={fgSecondary}
                      fontSize={9}
                      textAnchor="middle"
                      alignmentBaseline="central"
                    >
                      {tick.label}
                    </SvgText>
                  )}
                </G>
              );
            })}
          </G>

          {/* Center dot */}
          <Circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={6}
            fill={tuningColor}
          />
        </Svg>

        {/* Animated needle overlay */}
        <Animated.View
          style={[
            styles.needleContainer,
            { top: CENTER_Y - NEEDLE_LENGTH, left: CENTER_X - 2 },
            animatedNeedleStyle,
          ]}
        >
          <View style={[styles.needle, { backgroundColor: tuningColor, height: NEEDLE_LENGTH }]} />
        </Animated.View>
      </View>

      {/* Note display */}
      <View style={styles.noteDisplay}>
        <Text style={[styles.noteName, { color: tuningColor }]}>
          {noteName}
        </Text>
        
        {/* Stability indicator */}
        {keyIndex >= 0 && (
          <View style={styles.stabilityRow}>
            <View style={[styles.stabilityDot, { backgroundColor: isStable ? '#22C55E' : '#F59E0B' }]} />
            <Text style={[styles.stabilityText, { color: fgSecondary }]}>
              {isStable ? 'Estable' : 'Estabilizando...'}
            </Text>
          </View>
        )}
      </View>

      {/* Cents and frequency display */}
      <View style={styles.dataRow}>
        <View style={styles.dataItem}>
          <Text style={[styles.dataValue, { color: tuningColor }]}>
            {keyIndex >= 0 ? `${centsDeviation >= 0 ? '+' : ''}${centsDeviation.toFixed(1)}` : '—'}
          </Text>
          <Text style={[styles.dataLabel, { color: fgSecondary }]}>cents</Text>
        </View>

        {showFrequency && (
          <>
            <View style={[styles.dataDivider, { backgroundColor: bdColor }]} />
            <View style={styles.dataItem}>
              <Text style={[styles.dataValue, { color: fgColor }]}>
                {frequency > 0 ? frequency.toFixed(1) : '—'}
              </Text>
              <Text style={[styles.dataLabel, { color: fgSecondary }]}>Hz</Text>
            </View>
            <View style={[styles.dataDivider, { backgroundColor: bdColor }]} />
            <View style={styles.dataItem}>
              <Text style={[styles.dataValue, { color: fgSecondary }]}>
                {targetFrequency > 0 ? targetFrequency.toFixed(1) : '—'}
              </Text>
              <Text style={[styles.dataLabel, { color: fgSecondary }]}>objetivo</Text>
            </View>
          </>
        )}
      </View>

      {/* Tuning status */}
      <View style={[styles.statusBadge, { backgroundColor: tuningColor + '20', borderColor: tuningColor + '40' }]}>
        <Text style={[styles.statusText, { color: tuningColor }]}>
          {keyIndex >= 0 ? tuningStatus : 'Esperando señal...'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  gaugeContainer: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE - 30,
    position: 'relative',
  },
  needleContainer: {
    position: 'absolute',
    width: 4,
    transformOrigin: 'bottom center',
  },
  needle: {
    width: 3,
    borderRadius: 2,
  },
  noteDisplay: {
    alignItems: 'center',
    marginTop: -20,
    marginBottom: 8,
  },
  noteName: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 1,
  },
  stabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  stabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stabilityText: {
    fontSize: 11,
    fontWeight: '500',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 4,
  },
  dataItem: {
    alignItems: 'center',
  },
  dataValue: {
    fontSize: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  dataLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dataDivider: {
    width: 1,
    height: 28,
    opacity: 0.3,
  },
  statusBadge: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
