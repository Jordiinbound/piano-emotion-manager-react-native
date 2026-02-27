/**
 * DriftPrediction — Predicció de deriva d'afinació
 * 
 * Basant-se en l'historial d'afinacions d'un piano, prediu quines notes
 * tendiran a desafinar-se primer i recomana un calendari de manteniment.
 * Utilitza regressió lineal simple sobre les mesures històriques.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Line, Circle, Text as SvgText, Path } from 'react-native-svg';
import {
  TOTAL_KEYS,
  getFullNoteName,
  getNoteName,
  getOctave,
} from '@/constants/piano-tuning';
import type { KeyMeasurement } from '@/contexts/TunerContext';

interface TuningSession {
  date: number; // timestamp
  measurements: (KeyMeasurement | null)[];
}

interface DriftPredictionProps {
  /** Historial de sessions d'afinació */
  sessions: TuningSession[];
  /** Mesures actuals */
  currentMeasurements: (KeyMeasurement | null)[];
  /** Mode fosc */
  darkTuningMode?: boolean;
}

interface DriftAnalysis {
  keyIndex: number;
  noteName: string;
  driftRate: number; // cents per mes
  currentDeviation: number;
  predictedMonthsToOutOfTune: number; // mesos fins a >10 cents
  trend: 'sharp' | 'flat' | 'stable';
  confidence: number; // 0-1
}

function analyzeDrift(
  sessions: TuningSession[],
  currentMeasurements: (KeyMeasurement | null)[],
): DriftAnalysis[] {
  const analyses: DriftAnalysis[] = [];
  
  for (let key = 0; key < TOTAL_KEYS; key++) {
    const dataPoints: { time: number; cents: number }[] = [];
    
    // Recollir dades de sessions anteriors
    sessions.forEach(session => {
      const m = session.measurements[key];
      if (m) {
        dataPoints.push({
          time: session.date,
          cents: m.centsDeviation,
        });
      }
    });
    
    // Afegir mesura actual
    const current = currentMeasurements[key];
    if (current) {
      dataPoints.push({
        time: Date.now(),
        cents: current.centsDeviation,
      });
    }
    
    // Necessitem almenys 2 punts per calcular tendència
    if (dataPoints.length < 2) continue;
    
    // Regressió lineal simple
    const n = dataPoints.length;
    const xMean = dataPoints.reduce((s, p) => s + p.time, 0) / n;
    const yMean = dataPoints.reduce((s, p) => s + p.cents, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    for (const p of dataPoints) {
      numerator += (p.time - xMean) * (p.cents - yMean);
      denominator += (p.time - xMean) ** 2;
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0;
    
    // Convertir slope de cents/ms a cents/mes
    const msPerMonth = 30.44 * 24 * 60 * 60 * 1000;
    const driftRate = slope * msPerMonth;
    
    // Calcular R² per confiança
    const yPredicted = dataPoints.map(p => yMean + slope * (p.time - xMean));
    const ssRes = dataPoints.reduce((s, p, i) => s + (p.cents - yPredicted[i]) ** 2, 0);
    const ssTot = dataPoints.reduce((s, p) => s + (p.cents - yMean) ** 2, 0);
    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    
    const currentDeviation = current?.centsDeviation ?? dataPoints[dataPoints.length - 1].cents;
    const absCurrent = Math.abs(currentDeviation);
    
    // Predir mesos fins a >10 cents de desviació
    let monthsToOutOfTune = Infinity;
    if (Math.abs(driftRate) > 0.1) {
      const centsToGo = 10 - absCurrent;
      if (centsToGo > 0) {
        monthsToOutOfTune = centsToGo / Math.abs(driftRate);
      } else {
        monthsToOutOfTune = 0; // Ja està fora d'afinació
      }
    }
    
    const trend: 'sharp' | 'flat' | 'stable' = 
      driftRate > 0.5 ? 'sharp' : driftRate < -0.5 ? 'flat' : 'stable';
    
    analyses.push({
      keyIndex: key,
      noteName: getFullNoteName(key),
      driftRate,
      currentDeviation,
      predictedMonthsToOutOfTune: monthsToOutOfTune,
      trend,
      confidence: Math.max(0, Math.min(1, rSquared)),
    });
  }
  
  return analyses;
}

export function DriftPrediction({
  sessions,
  currentMeasurements,
  darkTuningMode,
}: DriftPredictionProps) {
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

  const analyses = useMemo(() => {
    return analyzeDrift(sessions, currentMeasurements);
  }, [sessions, currentMeasurements]);

  // Ordenar per urgència (menys mesos fins a desafinació)
  const sortedByUrgency = useMemo(() => {
    return [...analyses]
      .filter(a => a.predictedMonthsToOutOfTune < 24)
      .sort((a, b) => a.predictedMonthsToOutOfTune - b.predictedMonthsToOutOfTune)
      .slice(0, 10);
  }, [analyses]);

  // Recomanació de manteniment
  const maintenanceRecommendation = useMemo(() => {
    if (sortedByUrgency.length === 0) return null;
    const earliest = sortedByUrgency[0];
    if (earliest.predictedMonthsToOutOfTune <= 0) {
      return { text: 'Algunes notes ja necessiten afinació', urgency: 'urgent' as const, months: 0 };
    } else if (earliest.predictedMonthsToOutOfTune <= 3) {
      return { text: `Recomanem afinar en ${Math.ceil(earliest.predictedMonthsToOutOfTune)} mesos`, urgency: 'soon' as const, months: earliest.predictedMonthsToOutOfTune };
    } else if (earliest.predictedMonthsToOutOfTune <= 6) {
      return { text: `Pròxima afinació recomanada en ${Math.ceil(earliest.predictedMonthsToOutOfTune)} mesos`, urgency: 'normal' as const, months: earliest.predictedMonthsToOutOfTune };
    } else {
      return { text: `El piano es manté bé. Revisió en ${Math.ceil(earliest.predictedMonthsToOutOfTune)} mesos`, urgency: 'good' as const, months: earliest.predictedMonthsToOutOfTune };
    }
  }, [sortedByUrgency]);

  const hasData = sessions.length > 0 || currentMeasurements.some(m => m !== null);

  return (
    <View style={[styles.container, { backgroundColor: bgSurface, borderColor: bgBorder }]}>
      <ThemedText style={[styles.title, { color: fgText }]}>
        Predicció de deriva
      </ThemedText>

      {!hasData ? (
        <View style={styles.emptyState}>
          <Ionicons name="analytics-outline" size={40} color={fgMuted} />
          <ThemedText style={[styles.emptyText, { color: fgMuted }]}>
            Necessites almenys 2 sessions d'afinació per veure prediccions de deriva.
            Guarda les mesures actuals i torna a afinar en unes setmanes.
          </ThemedText>
        </View>
      ) : analyses.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={40} color="#22C55E" />
          <ThemedText style={[styles.emptyText, { color: fgMuted }]}>
            No hi ha prou dades històriques per fer prediccions.
            Guarda les mesures actuals com a sessió.
          </ThemedText>
        </View>
      ) : (
        <>
          {/* Recomanació de manteniment */}
          {maintenanceRecommendation && (
            <View style={[styles.recommendation, {
              backgroundColor: maintenanceRecommendation.urgency === 'urgent' ? '#EF444420'
                : maintenanceRecommendation.urgency === 'soon' ? '#F59E0B20'
                : maintenanceRecommendation.urgency === 'normal' ? '#003a8c20'
                : '#22C55E20',
              borderColor: maintenanceRecommendation.urgency === 'urgent' ? '#EF4444'
                : maintenanceRecommendation.urgency === 'soon' ? '#F59E0B'
                : maintenanceRecommendation.urgency === 'normal' ? '#003a8c'
                : '#22C55E',
            }]}>
              <Ionicons
                name={maintenanceRecommendation.urgency === 'urgent' ? 'warning' : 'calendar-outline'}
                size={18}
                color={maintenanceRecommendation.urgency === 'urgent' ? '#EF4444'
                  : maintenanceRecommendation.urgency === 'soon' ? '#F59E0B'
                  : '#003a8c'}
              />
              <ThemedText style={[styles.recommendationText, { color: fgText }]}>
                {maintenanceRecommendation.text}
              </ThemedText>
            </View>
          )}

          {/* Llista de notes amb més deriva */}
          <ThemedText style={[styles.sectionTitle, { color: fgText }]}>
            Notes amb més tendència a desafinar-se
          </ThemedText>
          
          <ScrollView style={styles.listContainer} nestedScrollEnabled>
            {sortedByUrgency.map((analysis, i) => {
              const urgencyColor = analysis.predictedMonthsToOutOfTune <= 0 ? '#EF4444'
                : analysis.predictedMonthsToOutOfTune <= 3 ? '#F59E0B'
                : analysis.predictedMonthsToOutOfTune <= 6 ? '#FBBF24'
                : '#22C55E';
              
              return (
                <View key={i} style={[styles.driftRow, { borderBottomColor: bgBorder }]}>
                  <View style={styles.driftNote}>
                    <ThemedText style={[styles.driftNoteName, { color: fgText }]}>
                      {analysis.noteName}
                    </ThemedText>
                  </View>
                  <View style={styles.driftInfo}>
                    <View style={styles.driftDetail}>
                      <ThemedText style={[styles.driftLabel, { color: fgMuted }]}>Deriva</ThemedText>
                      <ThemedText style={[styles.driftValue, { color: fgText }]}>
                        {analysis.driftRate > 0 ? '+' : ''}{analysis.driftRate.toFixed(1)}¢/mes
                      </ThemedText>
                    </View>
                    <View style={styles.driftDetail}>
                      <ThemedText style={[styles.driftLabel, { color: fgMuted }]}>Tendència</ThemedText>
                      <ThemedText style={[styles.driftValue, {
                        color: analysis.trend === 'stable' ? '#22C55E' : '#F59E0B'
                      }]}>
                        {analysis.trend === 'sharp' ? '↑ Puja' : analysis.trend === 'flat' ? '↓ Baixa' : '→ Estable'}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor + '20', borderColor: urgencyColor }]}>
                    <ThemedText style={[styles.urgencyText, { color: urgencyColor }]}>
                      {analysis.predictedMonthsToOutOfTune <= 0
                        ? 'Ara'
                        : `${Math.ceil(analysis.predictedMonthsToOutOfTune)}m`
                      }
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Informació */}
          <View style={styles.infoSection}>
            <Ionicons name="information-circle-outline" size={14} color={fgMuted} />
            <ThemedText style={[styles.infoText, { color: fgMuted }]}>
              Les prediccions es basen en {sessions.length} session{sessions.length !== 1 ? 's' : ''} anteriors.
              Més sessions = prediccions més precises.
            </ThemedText>
          </View>
        </>
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
  title: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 18,
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: 'Montserrat',
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  recommendation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  recommendationText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 16,
    marginBottom: 6,
  },
  listContainer: {
    maxHeight: 250,
  },
  driftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  driftNote: {
    width: 45,
  },
  driftNoteName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  driftInfo: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  driftDetail: {},
  driftLabel: {
    fontSize: 9,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 12,
    textTransform: 'uppercase',
  },
  driftValue: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 14,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 14,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 14,
  },
});
