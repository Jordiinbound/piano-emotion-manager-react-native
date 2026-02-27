/**
 * StringQualityAnalyzer — Análisis de calidad de cuerdas
 * 
 * Analiza el espectro FFT para detectar problemas en las cuerdas:
 * - Cuerdas oxidadas (parciales apagados, decaimiento rápido)
 * - Cuerdas falsas (doble fundamental, espectro dividido)
 * - Resonancias simpáticas problemáticas
 * - Parciales anómalos
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  getFullNoteName,
  getExpectedInharmonicity,
  getInharmonicPartialFrequency,
  getEqualTemperamentFrequency,
} from '@/constants/piano-tuning';

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface StringIssue {
  type: 'rusty' | 'false_string' | 'dead_partial' | 'sympathetic' | 'good';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  recommendation: string;
}

interface StringQualityAnalyzerProps {
  keyIndex: number;
  frequency: number;
  fftData: Float32Array | null;
  sampleRate: number;
  inharmonicity: number | null;
  rmsLevel: number;
  isListening: boolean;
}

// ─── Funciones de análisis ──────────────────────────────────────────────────

function analyzeStringQuality(
  fftData: Float32Array,
  frequency: number,
  sampleRate: number,
  inharmonicity: number | null,
  keyIndex: number,
): StringIssue[] {
  const issues: StringIssue[] = [];
  const binSize = sampleRate / (fftData.length * 2);
  const B = inharmonicity ?? getExpectedInharmonicity(frequency);
  
  // Analizar los primeros 8 parciales
  const partialAmplitudes: number[] = [];
  const expectedPartialBins: number[] = [];
  
  for (let n = 1; n <= 8; n++) {
    const partialFreq = getInharmonicPartialFrequency(frequency, n, B);
    if (partialFreq >= sampleRate / 2) break;
    
    const bin = Math.round(partialFreq / binSize);
    expectedPartialBins.push(bin);
    
    // Buscar el pico real cerca del bin esperado (±3 bins)
    let maxAmp = -Infinity;
    const searchRange = 3;
    for (let b = Math.max(0, bin - searchRange); b <= Math.min(fftData.length - 1, bin + searchRange); b++) {
      if (fftData[b] > maxAmp) {
        maxAmp = fftData[b];
      }
    }
    partialAmplitudes.push(maxAmp);
  }
  
  if (partialAmplitudes.length < 3) {
    return [{ type: 'good', severity: 'info', title: 'Datos insuficientes', description: 'Se necesitan más parciales para un análisis completo.', recommendation: 'Toque la nota con más fuerza o acerque el micrófono.' }];
  }
  
  const fundamentalAmp = partialAmplitudes[0];
  
  // 1. Detectar cuerdas oxidadas: parciales altos muy débiles respecto a la fundamental
  const highPartialRatio = partialAmplitudes.length >= 5
    ? (partialAmplitudes[3] + partialAmplitudes[4]) / 2 - fundamentalAmp
    : 0;
  
  if (highPartialRatio < -50 && partialAmplitudes.length >= 5) {
    issues.push({
      type: 'rusty',
      severity: 'warning',
      title: 'Posible oxidación de cuerda',
      description: `Los parciales superiores (4º y 5º) están ${Math.abs(highPartialRatio).toFixed(0)} dB por debajo de la fundamental. Esto puede indicar oxidación o suciedad en la cuerda.`,
      recommendation: 'Inspeccione visualmente la cuerda. Si hay oxidación visible, considere limpiar con un paño suave o reemplazar la cuerda.',
    });
  }
  
  // 2. Detectar cuerdas falsas: buscar picos dobles cerca de la fundamental
  const fundamentalBin = Math.round(frequency / binSize);
  let doublePeakDetected = false;
  const searchWidth = Math.max(5, Math.round(2 / binSize)); // ±2 Hz
  
  let peakCount = 0;
  let lastWasRising = false;
  for (let b = Math.max(1, fundamentalBin - searchWidth); b < Math.min(fftData.length - 1, fundamentalBin + searchWidth); b++) {
    const isRising = fftData[b] > fftData[b - 1];
    if (!isRising && lastWasRising && fftData[b - 1] > fundamentalAmp - 10) {
      peakCount++;
    }
    lastWasRising = isRising;
  }
  
  if (peakCount >= 2) {
    doublePeakDetected = true;
    issues.push({
      type: 'false_string',
      severity: 'critical',
      title: 'Cuerda falsa detectada',
      description: 'Se detectan múltiples picos cerca de la frecuencia fundamental. Esto indica que las cuerdas del unísono están significativamente desafinadas entre sí, o que una cuerda individual vibra en dos modos.',
      recommendation: 'Afine cuidadosamente cada cuerda del unísono por separado usando cuñas de goma. Si el problema persiste en una sola cuerda, puede necesitar reemplazo.',
    });
  }
  
  // 3. Detectar parciales muertos
  for (let n = 1; n < partialAmplitudes.length - 1; n++) {
    const prevAmp = partialAmplitudes[n - 1];
    const currAmp = partialAmplitudes[n];
    const nextAmp = partialAmplitudes[n + 1];
    
    // Un parcial "muerto" es uno que cae mucho más de lo esperado
    const expectedDecay = -6 * Math.log2(n + 1); // Decaimiento natural ~6dB por octava
    const actualDecay = currAmp - fundamentalAmp;
    
    if (actualDecay < expectedDecay - 20 && currAmp < prevAmp - 15 && currAmp < nextAmp - 10) {
      issues.push({
        type: 'dead_partial',
        severity: 'info',
        title: `Parcial ${n + 1}º anómalo`,
        description: `El parcial ${n + 1}º está significativamente más débil de lo esperado (${actualDecay.toFixed(0)} dB vs ${expectedDecay.toFixed(0)} dB esperados). Puede indicar un nodo de vibración en un punto de contacto.`,
        recommendation: 'Verifique que no haya objetos tocando la cuerda. Compruebe el estado del apagador y los fieltros.',
      });
    }
  }
  
  // 4. Verificar inharmonicidad anómala
  if (inharmonicity !== null) {
    const expectedB = getExpectedInharmonicity(frequency);
    const ratio = inharmonicity / expectedB;
    
    if (ratio > 3) {
      issues.push({
        type: 'sympathetic',
        severity: 'warning',
        title: 'Inharmonicidad excesiva',
        description: `La inharmonicidad medida (B=${inharmonicity.toExponential(2)}) es ${ratio.toFixed(1)}x mayor que la esperada para esta nota. Puede indicar una cuerda con rigidez anormal.`,
        recommendation: 'Verifique la longitud vibrante de la cuerda (posición del puente). En pianos antiguos, esto puede indicar desgaste del puente.',
      });
    } else if (ratio < 0.3 && frequency > 100) {
      issues.push({
        type: 'sympathetic',
        severity: 'info',
        title: 'Inharmonicidad muy baja',
        description: `La inharmonicidad medida es inusualmente baja para esta nota. Puede indicar resonancias simpáticas de otras cuerdas.`,
        recommendation: 'Asegúrese de que los apagadores de las notas adyacentes estén funcionando correctamente.',
      });
    }
  }
  
  // Si no hay problemas, indicar que la cuerda está bien
  if (issues.length === 0) {
    issues.push({
      type: 'good',
      severity: 'info',
      title: 'Cuerda en buen estado',
      description: 'El espectro de parciales es normal. No se detectan anomalías significativas.',
      recommendation: 'Ninguna acción necesaria.',
    });
  }
  
  return issues;
}

// ─── Componente ─────────────────────────────────────────────────────────────

export function StringQualityAnalyzer({
  keyIndex,
  frequency,
  fftData,
  sampleRate,
  inharmonicity,
  rmsLevel,
  isListening,
}: StringQualityAnalyzerProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const bgColor = useThemeColor({}, 'background');
  
  const issues = useMemo(() => {
    if (!fftData || frequency <= 0 || !isListening) return [];
    return analyzeStringQuality(fftData, frequency, sampleRate, inharmonicity, keyIndex);
  }, [fftData, frequency, sampleRate, inharmonicity, keyIndex, isListening]);
  
  const severityColors: Record<string, string> = {
    info: '#3B82F6',
    warning: '#F59E0B',
    critical: '#EF4444',
  };
  
  const severityLabels: Record<string, string> = {
    info: 'Info',
    warning: 'Atención',
    critical: 'Crítico',
  };
  
  const typeIcons: Record<string, string> = {
    rusty: '🔧',
    false_string: '⚠️',
    dead_partial: '📉',
    sympathetic: '🔊',
    good: '✅',
  };
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={[styles.headerCard, { backgroundColor: surfaceColor, borderColor }]}>
        <ThemedText style={[styles.headerTitle, { color: textColor }]}>
          Análisis de Calidad de Cuerda
        </ThemedText>
        {keyIndex >= 0 && frequency > 0 ? (
          <ThemedText style={[styles.headerSubtitle, { color: textSecondary }]}>
            {getFullNoteName(keyIndex)} — {frequency.toFixed(1)} Hz
          </ThemedText>
        ) : (
          <ThemedText style={[styles.headerSubtitle, { color: textSecondary }]}>
            Toque una nota para analizar
          </ThemedText>
        )}
      </View>
      
      {/* Estado de escucha */}
      {!isListening && (
        <View style={[styles.infoCard, { backgroundColor: '#3B82F6' + '15', borderColor: '#3B82F6' }]}>
          <ThemedText style={[styles.infoText, { color: '#3B82F6' }]}>
            Active el micrófono y toque una nota para analizar la calidad de la cuerda.
          </ThemedText>
        </View>
      )}
      
      {isListening && frequency <= 0 && (
        <View style={[styles.infoCard, { backgroundColor: '#F59E0B' + '15', borderColor: '#F59E0B' }]}>
          <ThemedText style={[styles.infoText, { color: '#F59E0B' }]}>
            Esperando señal... Toque una nota con firmeza y acerque el micrófono al piano.
          </ThemedText>
        </View>
      )}
      
      {/* Resultados del análisis */}
      {issues.map((issue, idx) => (
        <View
          key={idx}
          style={[
            styles.issueCard,
            {
              backgroundColor: surfaceColor,
              borderColor: severityColors[issue.severity],
              borderLeftWidth: 4,
            },
          ]}
        >
          <View style={styles.issueHeader}>
            <ThemedText style={styles.issueIcon}>{typeIcons[issue.type]}</ThemedText>
            <View style={styles.issueHeaderText}>
              <ThemedText style={[styles.issueTitle, { color: textColor }]}>
                {issue.title}
              </ThemedText>
              <View style={[styles.severityBadge, { backgroundColor: severityColors[issue.severity] + '20' }]}>
                <ThemedText style={[styles.severityText, { color: severityColors[issue.severity] }]}>
                  {severityLabels[issue.severity]}
                </ThemedText>
              </View>
            </View>
          </View>
          
          <ThemedText style={[styles.issueDescription, { color: textSecondary }]}>
            {issue.description}
          </ThemedText>
          
          <View style={[styles.recommendationBox, { backgroundColor: bgColor, borderColor }]}>
            <ThemedText style={[styles.recommendationLabel, { color: textColor }]}>
              Recomendación:
            </ThemedText>
            <ThemedText style={[styles.recommendationText, { color: textSecondary }]}>
              {issue.recommendation}
            </ThemedText>
          </View>
        </View>
      ))}
      
      {/* Datos técnicos */}
      {isListening && frequency > 0 && (
        <View style={[styles.techCard, { backgroundColor: surfaceColor, borderColor }]}>
          <ThemedText style={[styles.techTitle, { color: textColor }]}>Datos técnicos</ThemedText>
          <View style={styles.techGrid}>
            <View style={styles.techItem}>
              <ThemedText style={[styles.techLabel, { color: textSecondary }]}>Frecuencia</ThemedText>
              <ThemedText style={[styles.techValue, { color: textColor }]}>{frequency.toFixed(2)} Hz</ThemedText>
            </View>
            <View style={styles.techItem}>
              <ThemedText style={[styles.techLabel, { color: textSecondary }]}>Nivel RMS</ThemedText>
              <ThemedText style={[styles.techValue, { color: textColor }]}>{(rmsLevel * 100).toFixed(1)}%</ThemedText>
            </View>
            <View style={styles.techItem}>
              <ThemedText style={[styles.techLabel, { color: textSecondary }]}>Inharmonicidad B</ThemedText>
              <ThemedText style={[styles.techValue, { color: textColor }]}>
                {inharmonicity ? inharmonicity.toExponential(3) : 'N/A'}
              </ThemedText>
            </View>
            <View style={styles.techItem}>
              <ThemedText style={[styles.techLabel, { color: textSecondary }]}>B esperada</ThemedText>
              <ThemedText style={[styles.techValue, { color: textColor }]}>
                {getExpectedInharmonicity(frequency).toExponential(3)}
              </ThemedText>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Estilos ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  
  headerCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 4 },
  
  infoCard: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
  },
  infoText: { fontSize: 13, lineHeight: 19 },
  
  issueCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  issueIcon: { fontSize: 22, marginTop: 2 },
  issueHeaderText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  issueTitle: { fontSize: 15, fontWeight: '600' },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  severityText: { fontSize: 10, fontWeight: '700' },
  issueDescription: { fontSize: 13, lineHeight: 19 },
  
  recommendationBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  recommendationLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  recommendationText: { fontSize: 12, lineHeight: 18 },
  
  techCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  techTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  techGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  techItem: { width: '48%' },
  techLabel: { fontSize: 11 },
  techValue: { fontSize: 13, fontWeight: '600', marginTop: 2 },
});
