/**
 * MicCalibration — Calibración de latencia del micrófono
 * 
 * Mide y compensa la latencia del hardware de audio del dispositivo.
 * Genera un tono de referencia, lo captura por el micrófono, y mide
 * el desfase temporal para calibrar la precisión de la detección.
 */

import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

// ─── Props ──────────────────────────────────────────────────────────────────

interface MicCalibrationProps {
  currentLatency: number; // ms
  onCalibrationComplete: (latencyMs: number) => void;
}

// ─── Componente ─────────────────────────────────────────────────────────────

export function MicCalibration({
  currentLatency,
  onCalibrationComplete,
}: MicCalibrationProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const bgColor = useThemeColor({}, 'background');
  
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [measurements, setMeasurements] = useState<number[]>([]);
  const [result, setResult] = useState<{ latency: number; jitter: number } | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const runCalibrationTest = useCallback(async (): Promise<number> => {
    return new Promise(async (resolve) => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        
        // Obtener micrófono
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        
        // Esperar silencio
        await new Promise(r => setTimeout(r, 200));
        
        // Medir nivel de ruido base
        analyser.getFloatTimeDomainData(dataArray);
        let baseRMS = 0;
        for (let i = 0; i < dataArray.length; i++) {
          baseRMS += dataArray[i] * dataArray[i];
        }
        baseRMS = Math.sqrt(baseRMS / dataArray.length);
        const threshold = baseRMS * 5 + 0.01;
        
        // Generar un click/tono corto
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.05);
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        const startTime = performance.now();
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.05);
        
        // Monitorear el micrófono para detectar cuándo llega el sonido
        let detected = false;
        const checkInterval = setInterval(() => {
          analyser.getFloatTimeDomainData(dataArray);
          let rms = 0;
          for (let i = 0; i < dataArray.length; i++) {
            rms += dataArray[i] * dataArray[i];
          }
          rms = Math.sqrt(rms / dataArray.length);
          
          if (rms > threshold && !detected) {
            detected = true;
            const latency = performance.now() - startTime;
            clearInterval(checkInterval);
            
            // Cleanup
            stream.getTracks().forEach(t => t.stop());
            audioContext.close();
            
            resolve(latency);
          }
        }, 1);
        
        // Timeout después de 2 segundos
        setTimeout(() => {
          if (!detected) {
            clearInterval(checkInterval);
            stream.getTracks().forEach(t => t.stop());
            audioContext.close();
            resolve(-1); // Error: no se detectó
          }
        }, 2000);
        
      } catch (e) {
        resolve(-1);
      }
    });
  }, []);
  
  const handleStartCalibration = useCallback(async () => {
    setIsCalibrating(true);
    setMeasurements([]);
    setResult(null);
    
    const totalTests = 5;
    const results: number[] = [];
    
    for (let i = 0; i < totalTests; i++) {
      setCalibrationStep(i + 1);
      const latency = await runCalibrationTest();
      if (latency > 0) {
        results.push(latency);
      }
      // Pausa entre tests
      await new Promise(r => setTimeout(r, 500));
    }
    
    setMeasurements(results);
    
    if (results.length >= 3) {
      // Calcular mediana (más robusto que media)
      const sorted = [...results].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const mean = results.reduce((a, b) => a + b, 0) / results.length;
      const variance = results.reduce((a, b) => a + (b - mean) ** 2, 0) / results.length;
      const jitter = Math.sqrt(variance);
      
      setResult({ latency: median, jitter });
      onCalibrationComplete(median);
    } else {
      setResult(null);
    }
    
    setIsCalibrating(false);
  }, [runCalibrationTest, onCalibrationComplete]);
  
  const handleResetCalibration = useCallback(() => {
    onCalibrationComplete(0);
    setResult(null);
    setMeasurements([]);
  }, [onCalibrationComplete]);
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Info */}
      <View style={[styles.infoCard, { backgroundColor: surfaceColor, borderColor }]}>
        <ThemedText style={[styles.infoTitle, { color: textColor }]}>
          Calibración del Micrófono
        </ThemedText>
        <ThemedText style={[styles.infoText, { color: textSecondary }]}>
          Esta herramienta mide la latencia de audio de su dispositivo (el tiempo entre que se produce un sonido y el micrófono lo detecta). Una calibración precisa mejora la exactitud de la detección de pitch.
        </ThemedText>
      </View>
      
      {/* Estado actual */}
      <View style={[styles.statusCard, { backgroundColor: surfaceColor, borderColor }]}>
        <View style={styles.statusRow}>
          <ThemedText style={[styles.statusLabel, { color: textSecondary }]}>Latencia actual:</ThemedText>
          <ThemedText style={[styles.statusValue, { color: currentLatency > 0 ? '#10B981' : textColor }]}>
            {currentLatency > 0 ? `${currentLatency.toFixed(1)} ms` : 'Sin calibrar'}
          </ThemedText>
        </View>
        {result && (
          <View style={styles.statusRow}>
            <ThemedText style={[styles.statusLabel, { color: textSecondary }]}>Jitter:</ThemedText>
            <ThemedText style={[styles.statusValue, { color: result.jitter < 5 ? '#10B981' : '#F59E0B' }]}>
              ±{result.jitter.toFixed(1)} ms
            </ThemedText>
          </View>
        )}
      </View>
      
      {/* Instrucciones */}
      <View style={[styles.instructionsCard, { backgroundColor: '#6366F1' + '10', borderColor: '#6366F1' }]}>
        <ThemedText style={[styles.instructionsTitle, { color: '#6366F1' }]}>
          Instrucciones:
        </ThemedText>
        <ThemedText style={[styles.instructionsText, { color: textSecondary }]}>
          1. Asegúrese de estar en un entorno silencioso{'\n'}
          2. Active el altavoz del dispositivo a volumen medio{'\n'}
          3. Pulse "Iniciar calibración"{'\n'}
          4. La app emitirá 5 tonos cortos y medirá la latencia{'\n'}
          5. No mueva el dispositivo durante el proceso
        </ThemedText>
      </View>
      
      {/* Progreso de calibración */}
      {isCalibrating && (
        <View style={[styles.progressCard, { backgroundColor: surfaceColor, borderColor }]}>
          <ThemedText style={[styles.progressTitle, { color: textColor }]}>
            Calibrando... Test {calibrationStep}/5
          </ThemedText>
          <View style={[styles.progressBar, { backgroundColor: borderColor }]}>
            <View style={[styles.progressFill, { width: `${(calibrationStep / 5) * 100}%` }]} />
          </View>
          <ThemedText style={[styles.progressHint, { color: textSecondary }]}>
            No mueva el dispositivo...
          </ThemedText>
        </View>
      )}
      
      {/* Resultados */}
      {measurements.length > 0 && !isCalibrating && (
        <View style={[styles.resultsCard, { backgroundColor: surfaceColor, borderColor }]}>
          <ThemedText style={[styles.resultsTitle, { color: textColor }]}>
            Resultados de calibración
          </ThemedText>
          
          {measurements.map((m, idx) => (
            <View key={idx} style={[styles.measurementRow, { borderColor }]}>
              <ThemedText style={[styles.measurementLabel, { color: textSecondary }]}>
                Test {idx + 1}
              </ThemedText>
              <ThemedText style={[styles.measurementValue, { color: textColor }]}>
                {m.toFixed(1)} ms
              </ThemedText>
            </View>
          ))}
          
          {result && (
            <View style={[styles.resultSummary, { backgroundColor: '#10B981' + '15', borderColor: '#10B981' }]}>
              <ThemedText style={[styles.resultSummaryTitle, { color: '#10B981' }]}>
                Latencia calibrada: {result.latency.toFixed(1)} ms
              </ThemedText>
              <ThemedText style={[styles.resultSummaryText, { color: textSecondary }]}>
                {result.latency < 10 ? 'Excelente — latencia muy baja.' :
                 result.latency < 30 ? 'Buena — latencia aceptable para afinación precisa.' :
                 result.latency < 50 ? 'Aceptable — puede afectar ligeramente la precisión.' :
                 'Alta — considere usar un micrófono externo para mejor precisión.'}
              </ThemedText>
            </View>
          )}
          
          {!result && measurements.length > 0 && (
            <View style={[styles.resultSummary, { backgroundColor: '#EF4444' + '15', borderColor: '#EF4444' }]}>
              <ThemedText style={[styles.resultSummaryTitle, { color: '#EF4444' }]}>
                Calibración fallida
              </ThemedText>
              <ThemedText style={[styles.resultSummaryText, { color: textSecondary }]}>
                No se pudieron obtener suficientes mediciones válidas. Asegúrese de que el altavoz y el micrófono funcionan correctamente e intente de nuevo.
              </ThemedText>
            </View>
          )}
        </View>
      )}
      
      {/* Botones */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={handleStartCalibration}
          disabled={isCalibrating}
          style={[
            styles.calibrateButton,
            { opacity: isCalibrating ? 0.5 : 1 },
          ]}
        >
          <ThemedText style={styles.calibrateButtonText}>
            {isCalibrating ? 'Calibrando...' : measurements.length > 0 ? 'Recalibrar' : 'Iniciar calibración'}
          </ThemedText>
        </TouchableOpacity>
        
        {currentLatency > 0 && (
          <TouchableOpacity
            onPress={handleResetCalibration}
            style={[styles.resetButton, { borderColor }]}
          >
            <ThemedText style={[styles.resetButtonText, { color: textColor }]}>
              Resetear
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Estilos ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  
  infoCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  infoTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  infoText: { fontSize: 13, lineHeight: 19 },
  
  statusCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: { fontSize: 13 },
  statusValue: { fontSize: 15, fontWeight: '700' },
  
  instructionsCard: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
  },
  instructionsTitle: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  instructionsText: { fontSize: 12, lineHeight: 20 },
  
  progressCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  progressTitle: { fontSize: 15, fontWeight: '600' },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 3,
  },
  progressHint: { fontSize: 12 },
  
  resultsCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  resultsTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  measurementLabel: { fontSize: 13 },
  measurementValue: { fontSize: 13, fontWeight: '600' },
  resultSummary: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  resultSummaryTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  resultSummaryText: { fontSize: 12, lineHeight: 18 },
  
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  calibrateButton: {
    flex: 1,
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  calibrateButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  resetButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  resetButtonText: { fontSize: 14, fontWeight: '600' },
});
