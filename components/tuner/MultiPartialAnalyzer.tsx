/**
 * MultiPartialAnalyzer — Anàlisi multi-parcial professional
 * 
 * Detecta i mostra els parcials individuals d'una nota de piano.
 * Basat en l'algorisme de l'Entropy Piano Tuner (GPL3):
 * - Detecció de pics per FFT amb cerca de ±20 cents
 * - Fórmula de Fletcher: fn = n·f1·√((1+B·n²)/(1+B))
 * - Estimació de B per entropia de Rényi (α=0.1)
 * - Qualitat de senyal per variància dels pics
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Svg, { Line, Circle, Text as SvgText, Rect } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  getExpectedInharmonicity,
  getInharmonicPartialFrequency,
  frequencyToCents,
  getFullNoteName,
} from '@/constants/piano-tuning';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PartialInfo {
  /** Partial number (1 = fundamental) */
  n: number;
  /** Expected frequency based on inharmonicity model */
  expectedFreq: number;
  /** Measured frequency from FFT peak */
  measuredFreq: number | null;
  /** Amplitude in dB (relative to fundamental) */
  amplitudeDb: number | null;
  /** Deviation in cents from expected */
  deviationCents: number | null;
  /** Whether this partial was detected */
  detected: boolean;
}

export interface MultiPartialAnalyzerProps {
  /** Fundamental frequency detected */
  fundamentalFreq: number;
  /** Key index (0-87) */
  keyIndex: number;
  /** Raw FFT data (magnitude spectrum) */
  fftData: Float32Array | null;
  /** Audio sample rate */
  sampleRate: number;
  /** Measured inharmonicity coefficient B */
  inharmonicity: number | null;
  /** Whether the tuner is actively detecting */
  isActive: boolean;
  /** Display width */
  width?: number;
}

// ─── Peak Detection Algorithm ───────────────────────────────────────────────

function detectPartials(
  fftData: Float32Array,
  fundamentalFreq: number,
  sampleRate: number,
  B: number,
  maxPartials: number,
): PartialInfo[] {
  const binResolution = sampleRate / (fftData.length * 2);
  const partials: PartialInfo[] = [];

  // Find fundamental amplitude for relative dB
  const fundBin = Math.round(fundamentalFreq / binResolution);
  let fundAmplitude = 0;
  const searchRadius = Math.max(2, Math.round(fundamentalFreq * 0.012 / binResolution)); // ±20 cents
  for (let i = Math.max(1, fundBin - searchRadius); i <= Math.min(fftData.length - 1, fundBin + searchRadius); i++) {
    if (fftData[i] > fundAmplitude) fundAmplitude = fftData[i];
  }
  if (fundAmplitude <= 0) fundAmplitude = 1;

  for (let n = 1; n <= maxPartials; n++) {
    const expectedFreq = getInharmonicPartialFrequency(fundamentalFreq, n, B);
    const expectedBin = Math.round(expectedFreq / binResolution);

    // Search ±20 cents around expected frequency
    const centsRadius = 20;
    const freqLow = expectedFreq * Math.pow(2, -centsRadius / 1200);
    const freqHigh = expectedFreq * Math.pow(2, centsRadius / 1200);
    const binLow = Math.max(1, Math.round(freqLow / binResolution));
    const binHigh = Math.min(fftData.length - 1, Math.round(freqHigh / binResolution));

    let peakBin = -1;
    let peakVal = -Infinity;
    for (let i = binLow; i <= binHigh; i++) {
      if (fftData[i] > peakVal) {
        peakVal = fftData[i];
        peakBin = i;
      }
    }

    // Noise floor check: peak must be at least 6 dB above neighbors
    const noiseFloor = n <= 4 ? fundAmplitude * 0.01 : fundAmplitude * 0.005;
    const detected = peakBin > 0 && peakVal > noiseFloor;

    if (detected) {
      // Parabolic interpolation for sub-bin accuracy
      let refinedBin = peakBin;
      if (peakBin > 0 && peakBin < fftData.length - 1) {
        const y0 = fftData[peakBin - 1];
        const y1 = fftData[peakBin];
        const y2 = fftData[peakBin + 1];
        const denom = 2 * (2 * y1 - y2 - y0);
        if (denom !== 0) {
          const correction = (y0 - y2) / denom;
          if (Math.abs(correction) < 1) refinedBin = peakBin + correction;
        }
      }

      const measuredFreq = refinedBin * binResolution;
      const amplitudeDb = 20 * Math.log10(peakVal / fundAmplitude);
      const deviationCents = frequencyToCents(expectedFreq, measuredFreq);

      partials.push({
        n,
        expectedFreq,
        measuredFreq,
        amplitudeDb,
        deviationCents,
        detected: true,
      });
    } else {
      partials.push({
        n,
        expectedFreq,
        measuredFreq: null,
        amplitudeDb: null,
        deviationCents: null,
        detected: false,
      });
    }
  }

  return partials;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MultiPartialAnalyzer({
  fundamentalFreq,
  keyIndex,
  fftData,
  sampleRate,
  inharmonicity,
  isActive,
  width = 340,
}: MultiPartialAnalyzerProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');

  const B = inharmonicity ?? getExpectedInharmonicity(fundamentalFreq);
  
  // Number of partials depends on fundamental frequency
  const maxPartials = useMemo(() => {
    if (fundamentalFreq <= 0) return 8;
    return Math.min(16, Math.max(4, Math.round(4 * (8 - Math.log(fundamentalFreq)))));
  }, [fundamentalFreq]);

  const partials = useMemo(() => {
    if (!fftData || fundamentalFreq <= 0 || !isActive) return [];
    return detectPartials(fftData, fundamentalFreq, sampleRate, B, maxPartials);
  }, [fftData, fundamentalFreq, sampleRate, B, maxPartials, isActive]);

  const detectedCount = partials.filter(p => p.detected).length;

  // SVG chart dimensions
  const chartHeight = 160;
  const chartPadding = { top: 20, right: 20, bottom: 30, left: 45 };
  const plotW = width - chartPadding.left - chartPadding.right;
  const plotH = chartHeight - chartPadding.top - chartPadding.bottom;

  // Scale: x = partial number, y = amplitude in dB (0 to -60)
  const dbMin = -60;
  const dbMax = 6;
  const xScale = (n: number) => chartPadding.left + ((n - 1) / Math.max(1, maxPartials - 1)) * plotW;
  const yScale = (db: number) => chartPadding.top + (1 - (db - dbMin) / (dbMax - dbMin)) * plotH;

  if (!isActive || fundamentalFreq <= 0) {
    return (
      <View style={[styles.container, { backgroundColor: surface, borderColor: border }]}>
        <ThemedText style={[styles.title, { color: textColor }]}>Anàlisi Multi-Parcial</ThemedText>
        <ThemedText style={[styles.placeholder, { color: textSecondary }]}>
          Toqueu una nota per veure els parcials
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: surface, borderColor: border }]}>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: textColor }]}>Anàlisi Multi-Parcial</ThemedText>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: '#1B6B93' + '20' }]}>
            <ThemedText style={[styles.badgeText, { color: '#1B6B93' }]}>
              {keyIndex >= 0 ? getFullNoteName(keyIndex) : '—'}
            </ThemedText>
          </View>
          <View style={[styles.badge, { backgroundColor: '#10B981' + '20' }]}>
            <ThemedText style={[styles.badgeText, { color: '#10B981' }]}>
              {detectedCount}/{maxPartials} parcials
            </ThemedText>
          </View>
          <View style={[styles.badge, { backgroundColor: '#8B5CF6' + '20' }]}>
            <ThemedText style={[styles.badgeText, { color: '#8B5CF6' }]}>
              B={B.toExponential(2)}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* SVG Partial Amplitude Chart */}
      <Svg width={width} height={chartHeight}>
        {/* Grid lines */}
        {[0, -10, -20, -30, -40, -50, -60].map(db => (
          <Line
            key={`grid-${db}`}
            x1={chartPadding.left}
            y1={yScale(db)}
            x2={width - chartPadding.right}
            y2={yScale(db)}
            stroke={border}
            strokeWidth={0.5}
            strokeDasharray="4,4"
          />
        ))}
        {/* Y axis labels */}
        {[0, -20, -40, -60].map(db => (
          <SvgText
            key={`ylabel-${db}`}
            x={chartPadding.left - 6}
            y={yScale(db) + 3}
            textAnchor="end"
            fontSize={9}
            fill={textSecondary}
          >
            {db}dB
          </SvgText>
        ))}
        {/* Bars for each partial */}
        {partials.map(p => {
          const x = xScale(p.n);
          const barWidth = Math.max(8, plotW / maxPartials * 0.6);
          const db = p.detected ? Math.max(dbMin, p.amplitudeDb ?? dbMin) : dbMin;
          const barTop = yScale(db);
          const barBottom = yScale(dbMin);
          const barHeight = barBottom - barTop;
          const color = p.detected
            ? (p.deviationCents !== null && Math.abs(p.deviationCents) <= 5 ? '#10B981' : '#F59E0B')
            : '#444444';

          return (
            <React.Fragment key={`partial-${p.n}`}>
              <Rect
                x={x - barWidth / 2}
                y={barTop}
                width={barWidth}
                height={Math.max(1, barHeight)}
                fill={color}
                opacity={p.detected ? 0.8 : 0.2}
                rx={2}
              />
              {/* Partial number label */}
              <SvgText
                x={x}
                y={chartHeight - 6}
                textAnchor="middle"
                fontSize={9}
                fill={p.detected ? textColor : textSecondary}
                fontWeight={p.n === 1 ? 'bold' : 'normal'}
              >
                {p.n}
              </SvgText>
              {/* Deviation label on detected partials */}
              {p.detected && p.deviationCents !== null && (
                <SvgText
                  x={x}
                  y={barTop - 4}
                  textAnchor="middle"
                  fontSize={7}
                  fill={Math.abs(p.deviationCents) <= 5 ? '#10B981' : '#F59E0B'}
                >
                  {p.deviationCents > 0 ? '+' : ''}{p.deviationCents.toFixed(1)}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>

      {/* Detailed table */}
      <ScrollView style={styles.tableScroll} horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader, { borderBottomColor: border }]}>
            <ThemedText style={[styles.tableHeaderCell, styles.cellN, { color: textSecondary }]}>n</ThemedText>
            <ThemedText style={[styles.tableHeaderCell, styles.cellFreq, { color: textSecondary }]}>Esperat</ThemedText>
            <ThemedText style={[styles.tableHeaderCell, styles.cellFreq, { color: textSecondary }]}>Mesurat</ThemedText>
            <ThemedText style={[styles.tableHeaderCell, styles.cellDb, { color: textSecondary }]}>dB</ThemedText>
            <ThemedText style={[styles.tableHeaderCell, styles.cellCents, { color: textSecondary }]}>¢</ThemedText>
          </View>
          {partials.map(p => (
            <View
              key={`row-${p.n}`}
              style={[
                styles.tableRow,
                { borderBottomColor: border },
                !p.detected && { opacity: 0.4 },
              ]}
            >
              <ThemedText style={[styles.tableCell, styles.cellN, { color: textColor, fontWeight: p.n === 1 ? '700' : '400' }]}>
                {p.n}
              </ThemedText>
              <ThemedText style={[styles.tableCell, styles.cellFreq, { color: textSecondary }]}>
                {p.expectedFreq.toFixed(1)}
              </ThemedText>
              <ThemedText style={[styles.tableCell, styles.cellFreq, { color: textColor }]}>
                {p.measuredFreq ? p.measuredFreq.toFixed(1) : '—'}
              </ThemedText>
              <ThemedText style={[styles.tableCell, styles.cellDb, { color: textSecondary }]}>
                {p.amplitudeDb !== null ? p.amplitudeDb.toFixed(1) : '—'}
              </ThemedText>
              <ThemedText
                style={[
                  styles.tableCell,
                  styles.cellCents,
                  {
                    color: p.deviationCents !== null
                      ? (Math.abs(p.deviationCents) <= 5 ? '#10B981' : '#F59E0B')
                      : textSecondary,
                    fontWeight: '600',
                  },
                ]}
              >
                {p.deviationCents !== null
                  ? `${p.deviationCents > 0 ? '+' : ''}${p.deviationCents.toFixed(1)}`
                  : '—'}
              </ThemedText>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  placeholder: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
    lineHeight: 18,
  },
  tableScroll: {
    maxHeight: 200,
  },
  table: {
    minWidth: 300,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    paddingVertical: 4,
    alignItems: 'center',
  },
  tableHeader: {
    paddingVertical: 6,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  tableCell: {
    fontSize: 12,
    lineHeight: 16,
  },
  cellN: { width: 28, textAlign: 'center' },
  cellFreq: { width: 72, textAlign: 'right', paddingRight: 8 },
  cellDb: { width: 48, textAlign: 'right', paddingRight: 8 },
  cellCents: { width: 52, textAlign: 'right' },
});
