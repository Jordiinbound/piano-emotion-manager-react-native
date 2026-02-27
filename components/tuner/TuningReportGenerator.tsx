/**
 * TuningReportGenerator — Generador de informes de afinación en PDF
 * 
 * Genera un informe profesional con:
 * - Datos del piano y del técnico
 * - Curva de Railsback (antes/después)
 * - Notas problemáticas
 * - Inharmonicidad medida
 * - Recomendaciones
 * 
 * Usa HTML → Blob → download para generar el PDF en el navegador.
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  TOTAL_KEYS,
  getFullNoteName,
  getNoteName,
  getOctave,
  getTuningStatus,
  getAverageStretchCents,
  getExpectedInharmonicity,
  getEqualTemperamentFrequency,
} from '@/constants/piano-tuning';
import type { PianoProfile, TuningRecord } from './PianoProfileManager';

// ─── Props ──────────────────────────────────────────────────────────────────

interface TuningReportGeneratorProps {
  profile: PianoProfile | null;
  currentMeasurements: Map<number, { cents: number; inharmonicity: number | null; timestamp: number }>;
  concertPitch: number;
  temperamentId: string;
}

// ─── Generación del HTML del informe ────────────────────────────────────────

function generateReportHTML(
  profile: PianoProfile | null,
  measurements: Map<number, { cents: number; inharmonicity: number | null; timestamp: number }>,
  concertPitch: number,
  temperamentId: string,
  technicianName: string,
  technicianNotes: string,
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  
  // Calcular estadísticas
  let totalDeviation = 0;
  let maxDeviation = 0;
  let maxDeviationKey = '';
  let inTuneCount = 0;
  let closeCount = 0;
  let outOfTuneCount = 0;
  const problemKeys: { name: string; cents: number }[] = [];
  
  measurements.forEach((data, keyIndex) => {
    const absCents = Math.abs(data.cents);
    totalDeviation += absCents;
    if (absCents > Math.abs(maxDeviation)) {
      maxDeviation = data.cents;
      maxDeviationKey = getFullNoteName(keyIndex);
    }
    const status = getTuningStatus(data.cents);
    if (status === 'in_tune') inTuneCount++;
    else if (status === 'close') closeCount++;
    else {
      outOfTuneCount++;
      problemKeys.push({ name: getFullNoteName(keyIndex), cents: data.cents });
    }
  });
  
  const avgDeviation = measurements.size > 0 ? totalDeviation / measurements.size : 0;
  
  // Generar tabla de mediciones
  let measurementRows = '';
  for (let i = 0; i < TOTAL_KEYS; i++) {
    const data = measurements.get(i);
    if (data) {
      const status = getTuningStatus(data.cents);
      const statusColor = status === 'in_tune' ? '#10B981' : status === 'close' ? '#F59E0B' : '#EF4444';
      const statusLabel = status === 'in_tune' ? 'Afinado' : status === 'close' ? 'Cerca' : 'Desafinado';
      measurementRows += `
        <tr>
          <td>${getFullNoteName(i)}</td>
          <td>${getEqualTemperamentFrequency(i, concertPitch).toFixed(2)} Hz</td>
          <td style="color:${statusColor};font-weight:600">${data.cents > 0 ? '+' : ''}${data.cents.toFixed(1)} ¢</td>
          <td>${data.inharmonicity ? data.inharmonicity.toExponential(3) : '—'}</td>
          <td style="color:${statusColor}">${statusLabel}</td>
        </tr>
      `;
    }
  }
  
  // Generar datos para el gráfico SVG de Railsback
  let railsbackPoints = '';
  let railsbackExpected = '';
  for (let i = 0; i < TOTAL_KEYS; i++) {
    const x = 60 + (i / 87) * 480;
    const expectedCents = getAverageStretchCents(i);
    const yExpected = 150 - expectedCents * 2;
    railsbackExpected += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yExpected.toFixed(1)} `;
    
    const data = measurements.get(i);
    if (data) {
      const yMeasured = 150 - data.cents * 2;
      const color = getTuningStatus(data.cents) === 'in_tune' ? '#10B981' : getTuningStatus(data.cents) === 'close' ? '#F59E0B' : '#EF4444';
      railsbackPoints += `<circle cx="${x.toFixed(1)}" cy="${yMeasured.toFixed(1)}" r="3" fill="${color}" />`;
    }
  }
  
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Informe de Afinación — ${profile?.name || 'Piano'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; line-height: 1.5; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #6366F1; padding-bottom: 20px; }
    .header h1 { font-size: 24px; color: #6366F1; margin-bottom: 4px; }
    .header .subtitle { font-size: 14px; color: #6B7280; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 16px; color: #6366F1; margin-bottom: 10px; border-bottom: 1px solid #E5E7EB; padding-bottom: 6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .grid-item { padding: 6px 0; }
    .grid-item .label { font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .grid-item .value { font-size: 14px; font-weight: 600; }
    .stats-row { display: flex; gap: 12px; margin-bottom: 16px; }
    .stat-card { flex: 1; text-align: center; padding: 12px; border-radius: 8px; border: 1px solid #E5E7EB; }
    .stat-card .number { font-size: 24px; font-weight: 700; }
    .stat-card .label { font-size: 11px; color: #6B7280; }
    .stat-green .number { color: #10B981; }
    .stat-yellow .number { color: #F59E0B; }
    .stat-red .number { color: #EF4444; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #F3F4F6; padding: 8px 6px; text-align: left; font-weight: 600; border-bottom: 2px solid #E5E7EB; }
    td { padding: 6px; border-bottom: 1px solid #F3F4F6; }
    .chart-container { background: #FAFAFA; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .problems { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 12px; }
    .problems h3 { color: #EF4444; font-size: 14px; margin-bottom: 8px; }
    .problems li { font-size: 12px; margin-bottom: 4px; }
    .notes-box { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; white-space: pre-wrap; font-size: 13px; }
    .footer { text-align: center; margin-top: 30px; padding-top: 16px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #9CA3AF; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Informe de Afinación</h1>
    <div class="subtitle">${dateStr} — ${timeStr}</div>
  </div>
  
  <div class="section">
    <h2>Datos del Piano</h2>
    <div class="grid">
      <div class="grid-item"><div class="label">Nombre</div><div class="value">${profile?.name || '—'}</div></div>
      <div class="grid-item"><div class="label">Marca / Modelo</div><div class="value">${[profile?.brand, profile?.model].filter(Boolean).join(' ') || '—'}</div></div>
      <div class="grid-item"><div class="label">Nº Serie</div><div class="value">${profile?.serialNumber || '—'}</div></div>
      <div class="grid-item"><div class="label">Año</div><div class="value">${profile?.year || '—'}</div></div>
      <div class="grid-item"><div class="label">Ubicación</div><div class="value">${profile?.location || '—'}</div></div>
      <div class="grid-item"><div class="label">Técnico</div><div class="value">${technicianName || '—'}</div></div>
    </div>
  </div>
  
  <div class="section">
    <h2>Parámetros de Afinación</h2>
    <div class="grid">
      <div class="grid-item"><div class="label">Pitch de referencia</div><div class="value">A4 = ${concertPitch} Hz</div></div>
      <div class="grid-item"><div class="label">Temperamento</div><div class="value">${temperamentId === 'equal' ? 'Temperamento Igual (12-TET)' : temperamentId}</div></div>
      <div class="grid-item"><div class="label">Teclas medidas</div><div class="value">${measurements.size} de 88</div></div>
      <div class="grid-item"><div class="label">Desviación media</div><div class="value">${avgDeviation.toFixed(1)} cents</div></div>
    </div>
  </div>
  
  <div class="section">
    <h2>Resumen</h2>
    <div class="stats-row">
      <div class="stat-card stat-green"><div class="number">${inTuneCount}</div><div class="label">Afinadas (±2¢)</div></div>
      <div class="stat-card stat-yellow"><div class="number">${closeCount}</div><div class="label">Cerca (±10¢)</div></div>
      <div class="stat-card stat-red"><div class="number">${outOfTuneCount}</div><div class="label">Desafinadas</div></div>
    </div>
  </div>
  
  <div class="section">
    <h2>Curva de Afinación (Railsback)</h2>
    <div class="chart-container">
      <svg width="560" height="200" viewBox="0 0 560 200">
        <line x1="60" y1="150" x2="540" y2="150" stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4,4" />
        <text x="55" y="154" text-anchor="end" font-size="10" fill="#9CA3AF">0¢</text>
        <text x="55" y="54" text-anchor="end" font-size="10" fill="#9CA3AF">+50¢</text>
        <text x="55" y="204" text-anchor="end" font-size="10" fill="#9CA3AF">-50¢</text>
        <text x="60" y="215" font-size="9" fill="#9CA3AF">A0</text>
        <text x="300" y="215" text-anchor="middle" font-size="9" fill="#9CA3AF">A4</text>
        <text x="530" y="215" text-anchor="end" font-size="9" fill="#9CA3AF">C8</text>
        <path d="${railsbackExpected}" fill="none" stroke="#6366F1" stroke-width="1.5" stroke-dasharray="6,3" opacity="0.6" />
        ${railsbackPoints}
      </svg>
      <div style="font-size:11px;color:#6B7280;margin-top:8px;">
        <span style="color:#6366F1">- - -</span> Curva de stretch teórica &nbsp;&nbsp;
        <span style="color:#10B981">●</span> Afinado &nbsp;
        <span style="color:#F59E0B">●</span> Cerca &nbsp;
        <span style="color:#EF4444">●</span> Desafinado
      </div>
    </div>
  </div>
  
  ${problemKeys.length > 0 ? `
  <div class="section">
    <div class="problems">
      <h3>Notas problemáticas (${problemKeys.length})</h3>
      <ul>
        ${problemKeys.map(k => `<li><strong>${k.name}</strong>: ${k.cents > 0 ? '+' : ''}${k.cents.toFixed(1)} cents</li>`).join('')}
      </ul>
    </div>
  </div>
  ` : ''}
  
  ${measurements.size > 0 ? `
  <div class="section">
    <h2>Mediciones Detalladas</h2>
    <table>
      <thead>
        <tr><th>Nota</th><th>Freq. objetivo</th><th>Desviación</th><th>Inharm. B</th><th>Estado</th></tr>
      </thead>
      <tbody>
        ${measurementRows}
      </tbody>
    </table>
  </div>
  ` : ''}
  
  ${technicianNotes ? `
  <div class="section">
    <h2>Observaciones del Técnico</h2>
    <div class="notes-box">${technicianNotes}</div>
  </div>
  ` : ''}
  
  <div class="footer">
    Generado por Piano Emotion — pianoemotion.com — ${dateStr}
  </div>
</body>
</html>`;
}

// ─── Componente ─────────────────────────────────────────────────────────────

export function TuningReportGenerator({
  profile,
  currentMeasurements,
  concertPitch,
  temperamentId,
}: TuningReportGeneratorProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const bgColor = useThemeColor({}, 'background');
  
  const [technicianName, setTechnicianName] = useState('');
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleGenerateReport = useCallback(async () => {
    if (Platform.OS !== 'web') {
      return; // Solo funciona en web
    }
    
    setIsGenerating(true);
    
    try {
      const html = generateReportHTML(
        profile,
        currentMeasurements,
        concertPitch,
        temperamentId,
        technicianName,
        technicianNotes,
      );
      
      // Abrir en nueva ventana para imprimir/guardar como PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        // Dar tiempo a que se renderice y luego abrir diálogo de impresión
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } catch (e) {
      console.error('Error generating report:', e);
    }
    
    setIsGenerating(false);
  }, [profile, currentMeasurements, concertPitch, temperamentId, technicianName, technicianNotes]);
  
  const measurementCount = currentMeasurements.size;
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.headerCard, { backgroundColor: surfaceColor, borderColor }]}>
        <ThemedText style={[styles.headerTitle, { color: textColor }]}>
          Generar Informe de Afinación
        </ThemedText>
        <ThemedText style={[styles.headerSubtitle, { color: textSecondary }]}>
          Cree un informe PDF profesional con los resultados de la afinación actual.
        </ThemedText>
      </View>
      
      {/* Datos del informe */}
      <View style={[styles.formCard, { backgroundColor: surfaceColor, borderColor }]}>
        <ThemedText style={[styles.label, { color: textSecondary }]}>Piano</ThemedText>
        <View style={[styles.readonlyField, { backgroundColor: bgColor, borderColor }]}>
          <ThemedText style={[styles.readonlyText, { color: textColor }]}>
            {profile ? `${profile.name} ${profile.brand ? `(${profile.brand})` : ''}` : 'Sin perfil seleccionado'}
          </ThemedText>
        </View>
        
        <ThemedText style={[styles.label, { color: textSecondary }]}>Mediciones</ThemedText>
        <View style={[styles.readonlyField, { backgroundColor: bgColor, borderColor }]}>
          <ThemedText style={[
            styles.readonlyText,
            { color: measurementCount > 0 ? '#10B981' : '#EF4444' },
          ]}>
            {measurementCount > 0 ? `${measurementCount} teclas medidas` : 'Sin mediciones — afine teclas primero'}
          </ThemedText>
        </View>
        
        <ThemedText style={[styles.label, { color: textSecondary }]}>Nombre del técnico</ThemedText>
        <TextInput
          style={[styles.input, { color: textColor, borderColor, backgroundColor: bgColor }]}
          value={technicianName}
          onChangeText={setTechnicianName}
          placeholder="Su nombre"
          placeholderTextColor={textSecondary}
        />
        
        <ThemedText style={[styles.label, { color: textSecondary }]}>Observaciones</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea, { color: textColor, borderColor, backgroundColor: bgColor }]}
          value={technicianNotes}
          onChangeText={setTechnicianNotes}
          placeholder="Notas sobre el estado del piano, trabajos realizados, recomendaciones..."
          placeholderTextColor={textSecondary}
          multiline
          numberOfLines={4}
        />
      </View>
      
      {/* Vista previa del contenido */}
      <View style={[styles.previewCard, { backgroundColor: surfaceColor, borderColor }]}>
        <ThemedText style={[styles.previewTitle, { color: textColor }]}>
          El informe incluirá:
        </ThemedText>
        <View style={styles.previewList}>
          {[
            'Datos del piano y del técnico',
            'Parámetros de afinación (pitch, temperamento)',
            'Resumen estadístico (afinadas/cerca/desafinadas)',
            'Gráfico de curva de Railsback',
            'Lista de notas problemáticas',
            'Tabla detallada de mediciones',
            'Observaciones del técnico',
          ].map((item, idx) => (
            <View key={idx} style={styles.previewItem}>
              <ThemedText style={[styles.previewCheck, { color: '#10B981' }]}>✓</ThemedText>
              <ThemedText style={[styles.previewText, { color: textSecondary }]}>{item}</ThemedText>
            </View>
          ))}
        </View>
      </View>
      
      {/* Botón generar */}
      <TouchableOpacity
        onPress={handleGenerateReport}
        disabled={isGenerating || measurementCount === 0}
        style={[
          styles.generateButton,
          { opacity: (isGenerating || measurementCount === 0) ? 0.5 : 1 },
        ]}
      >
        <ThemedText style={styles.generateButtonText}>
          {isGenerating ? 'Generando...' : 'Generar informe PDF'}
        </ThemedText>
      </TouchableOpacity>
      
      {Platform.OS !== 'web' && (
        <View style={[styles.webOnlyNote, { borderColor: '#F59E0B' }]}>
          <ThemedText style={[styles.webOnlyText, { color: '#F59E0B' }]}>
            La generación de PDF solo está disponible en la versión web.
          </ThemedText>
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
  
  formCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  label: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  readonlyField: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  readonlyText: { fontSize: 14 },
  
  previewCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  previewTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  previewList: { gap: 4 },
  previewItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewCheck: { fontSize: 14 },
  previewText: { fontSize: 13 },
  
  generateButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  generateButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  
  webOnlyNote: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  webOnlyText: { fontSize: 12 },
});
