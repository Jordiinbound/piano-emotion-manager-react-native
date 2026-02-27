/**
 * Tuner Audio Engine
 * 
 * Motor de audio para afinación de pianos usando Web Audio API.
 * Implementa:
 * - Captura de audio del micrófono en tiempo real
 * - Detección de pitch con algoritmo YIN (de Cheveigné & Kawahara, 2002)
 * - Estimación de inharmonicidad por superposición de parciales
 * - Cálculo de desviación en cents
 * 
 * Algoritmos basados en:
 * - YIN: "YIN, a fundamental frequency estimator for speech and music" (JASA, 2002)
 * - Inharmonicidad: Entropy Piano Tuner (GPL3) - fftanalyzer.cpp
 */

import {
  findNearestKey,
  getEqualTemperamentFrequency,
  getStretchedFrequency,
  frequencyToCents,
  getExpectedInharmonicity,
  getInharmonicPartialFrequency,
  KEY_A4_INDEX,
  TOTAL_KEYS,
  DEFAULT_CONCERT_PITCH,
} from '@/constants/piano-tuning';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface PitchDetectionResult {
  /** Frecuencia detectada en Hz (0 si no se detecta) */
  frequency: number;
  /** Confianza de la detección (0-1) */
  confidence: number;
  /** Índice de la tecla más cercana */
  keyIndex: number;
  /** Desviación en cents respecto a la frecuencia objetivo */
  centsDeviation: number;
  /** Frecuencia objetivo (con o sin stretch) */
  targetFrequency: number;
  /** Nivel RMS del audio */
  rmsLevel: number;
  /** Coeficiente de inharmonicidad estimado (si disponible) */
  inharmonicity: number | null;
}

export interface TunerEngineConfig {
  /** Frecuencia de referencia para A4 */
  concertPitch: number;
  /** Usar stretch tuning */
  useStretchTuning: boolean;
  /** Umbral de ruido (RMS mínimo para procesar) */
  noiseGateThreshold: number;
  /** Tamaño del buffer de audio (potencia de 2) */
  bufferSize: number;
  /** Frecuencia de muestreo deseada */
  sampleRate: number;
}

export type TunerEngineCallback = (result: PitchDetectionResult) => void;

// ─── Configuración por defecto ───────────────────────────────────────────────

const DEFAULT_CONFIG: TunerEngineConfig = {
  concertPitch: DEFAULT_CONCERT_PITCH,
  useStretchTuning: true,
  noiseGateThreshold: 0.01,
  bufferSize: 4096,
  sampleRate: 44100,
};

// ─── Algoritmo YIN ───────────────────────────────────────────────────────────

/**
 * Implementación del algoritmo YIN para detección de pitch.
 * 
 * El algoritmo YIN es un método robusto de detección de frecuencia fundamental
 * basado en la función de diferencia cuadrática acumulativa normalizada (CMND).
 * 
 * Pasos:
 * 1. Calcular la función de diferencia d(τ)
 * 2. Normalizar acumulativamente d'(τ)
 * 3. Buscar el primer mínimo por debajo del umbral
 * 4. Interpolar parabólicamente para mayor precisión
 */
function yinDetectPitch(buffer: Float32Array, sampleRate: number): { frequency: number; confidence: number } {
  const threshold = 0.15; // Umbral YIN (más bajo = más selectivo)
  const halfSize = Math.floor(buffer.length / 2);
  
  // Paso 1: Función de diferencia
  const difference = new Float32Array(halfSize);
  for (let tau = 0; tau < halfSize; tau++) {
    let sum = 0;
    for (let i = 0; i < halfSize; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    difference[tau] = sum;
  }
  
  // Paso 2: Función de diferencia normalizada acumulativa (CMND)
  const cmnd = new Float32Array(halfSize);
  cmnd[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfSize; tau++) {
    runningSum += difference[tau];
    cmnd[tau] = difference[tau] * tau / runningSum;
  }
  
  // Paso 3: Búsqueda del umbral absoluto
  // Empezar desde un período mínimo correspondiente a ~4200 Hz (nota más alta del piano)
  const minTau = Math.max(2, Math.floor(sampleRate / 4200));
  // Período máximo correspondiente a ~25 Hz (por debajo de A0 = 27.5 Hz)
  const maxTau = Math.min(halfSize - 1, Math.floor(sampleRate / 25));
  
  let bestTau = -1;
  for (let tau = minTau; tau < maxTau; tau++) {
    if (cmnd[tau] < threshold) {
      // Encontrar el mínimo local a partir de aquí
      while (tau + 1 < maxTau && cmnd[tau + 1] < cmnd[tau]) {
        tau++;
      }
      bestTau = tau;
      break;
    }
  }
  
  // Si no se encontró ningún valor por debajo del umbral, buscar el mínimo global
  if (bestTau === -1) {
    let minVal = Infinity;
    for (let tau = minTau; tau < maxTau; tau++) {
      if (cmnd[tau] < minVal) {
        minVal = cmnd[tau];
        bestTau = tau;
      }
    }
    // Si el mínimo global es demasiado alto, no hay pitch
    if (minVal > 0.5) {
      return { frequency: 0, confidence: 0 };
    }
  }
  
  if (bestTau < 2 || bestTau >= halfSize - 1) {
    return { frequency: 0, confidence: 0 };
  }
  
  // Paso 4: Interpolación parabólica para mayor precisión
  const y0 = cmnd[bestTau - 1];
  const y1 = cmnd[bestTau];
  const y2 = cmnd[bestTau + 1];
  const denominator = 2 * (2 * y1 - y2 - y0);
  
  let betterTau = bestTau;
  if (denominator !== 0) {
    const correction = (y0 - y2) / denominator;
    if (Math.abs(correction) < 1) {
      betterTau = bestTau + correction;
    }
  }
  
  const frequency = sampleRate / betterTau;
  const confidence = 1 - cmnd[bestTau];
  
  return { frequency, confidence: Math.max(0, Math.min(1, confidence)) };
}

// ─── Estimación de Inharmonicidad ────────────────────────────────────────────

/**
 * Estima la inharmonicidad B a partir del espectro FFT.
 * Basado en el método del Entropy Piano Tuner:
 * - Para f > 1000 Hz: usa la relación f2/f1
 * - Para f <= 1000 Hz: minimiza la entropía de Renyi de la superposición de parciales
 * 
 * @param fftData - Datos del espectro FFT (magnitudes)
 * @param fundamentalFreq - Frecuencia fundamental detectada
 * @param sampleRate - Frecuencia de muestreo
 */
function estimateInharmonicity(
  fftData: Float32Array,
  fundamentalFreq: number,
  sampleRate: number
): number {
  if (fundamentalFreq <= 20 || fundamentalFreq > 2250) return 0;
  
  const binResolution = sampleRate / (fftData.length * 2); // Resolución frecuencial por bin
  
  // Para frecuencias altas (> 1000 Hz): método directo f2/f1
  if (fundamentalFreq > 1000) {
    const f1Bin = Math.round(fundamentalFreq / binResolution);
    const f2Expected = 2 * fundamentalFreq;
    const searchStart = Math.max(0, Math.round(f2Expected * 0.98 / binResolution));
    const searchEnd = Math.min(fftData.length - 1, Math.round(f2Expected * 1.02 / binResolution));
    
    let maxVal = 0;
    let f2Bin = searchStart;
    for (let i = searchStart; i <= searchEnd; i++) {
      if (fftData[i] > maxVal) {
        maxVal = fftData[i];
        f2Bin = i;
      }
    }
    
    const f2 = f2Bin * binResolution;
    const z = (f2 * f2) / (fundamentalFreq * fundamentalFreq);
    if (z > 4.4 || z < 4) return 0;
    const B = (4 - z) / (z - 16);
    return Math.max(0, B);
  }
  
  // Para frecuencias medias/bajas: minimización de entropía de Renyi
  const expectedB = getExpectedInharmonicity(fundamentalFreq);
  const N = Math.round(4 * (8 - Math.log(fundamentalFreq)));
  const R = 80; // Ventana de observación en bins
  
  let bestB = expectedB;
  let minEntropy = Infinity;
  
  for (let scanB = expectedB / 5; scanB <= expectedB * 5; scanB *= 1.05) {
    let superposition = new Float32Array(R);
    
    for (let n = 1; n <= N; n++) {
      const fn = getInharmonicPartialFrequency(fundamentalFreq, n, scanB);
      const fnBin = fn / binResolution;
      
      if (fnBin - R / 2 > 0 && fnBin + R / 2 < fftData.length) {
        let partialSum = 0;
        const partial = new Float32Array(R);
        
        for (let r = 0; r < R; r++) {
          const idx = Math.round(fnBin + r - R / 2);
          if (idx >= 0 && idx < fftData.length) {
            partial[r] = fftData[idx] * fftData[idx];
            partialSum += partial[r];
          }
        }
        
        // Normalizar y sumar
        if (partialSum > 0) {
          for (let r = 0; r < R; r++) {
            superposition[r] += partial[r] / partialSum;
          }
        }
      }
    }
    
    // Calcular entropía de Renyi (α = 0.1)
    let totalSum = 0;
    for (let r = 0; r < R; r++) totalSum += superposition[r];
    
    if (totalSum > 0) {
      const alpha = 0.1;
      let renyiSum = 0;
      for (let r = 0; r < R; r++) {
        const p = superposition[r] / totalSum;
        if (p > 0) renyiSum += Math.pow(p, alpha);
      }
      const entropy = Math.log(renyiSum) / (1 - alpha);
      
      if (Math.abs(entropy) < minEntropy) {
        minEntropy = Math.abs(entropy);
        bestB = scanB;
      }
    }
  }
  
  return bestB;
}

// ─── Cálculo RMS ─────────────────────────────────────────────────────────────

function calculateRMS(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

// ─── Clase TunerAudioEngine ──────────────────────────────────────────────────

export class TunerAudioEngine {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private config: TunerEngineConfig;
  private callback: TunerEngineCallback | null = null;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private timeBuffer: Float32Array | null = null;
  private freqBuffer: Float32Array | null = null;
  
  // Smoothing para estabilizar la lectura
  private lastFrequencies: number[] = [];
  private readonly SMOOTHING_WINDOW = 5;

  constructor(config?: Partial<TunerEngineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Inicia la captura de audio y la detección de pitch.
   */
  async start(callback: TunerEngineCallback): Promise<void> {
    this.callback = callback;
    
    try {
      // Solicitar acceso al micrófono
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: this.config.sampleRate,
        },
      });
      
      // Crear contexto de audio
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.config.sampleRate,
      });
      
      // Crear nodo fuente desde el micrófono
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Crear nodo analizador
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = this.config.bufferSize * 2;
      this.analyserNode.smoothingTimeConstant = 0;
      
      // Conectar: micrófono → analizador
      this.sourceNode.connect(this.analyserNode);
      
      // Preparar buffers
      this.timeBuffer = new Float32Array(this.analyserNode.fftSize);
      this.freqBuffer = new Float32Array(this.analyserNode.frequencyBinCount);
      
      this.isRunning = true;
      this.lastFrequencies = [];
      this.processAudio();
      
    } catch (error) {
      console.error('Error al iniciar el motor de audio:', error);
      throw error;
    }
  }

  /**
   * Detiene la captura de audio.
   */
  stop(): void {
    this.isRunning = false;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyserNode = null;
    this.callback = null;
  }

  /**
   * Actualiza la configuración del motor.
   */
  updateConfig(config: Partial<TunerEngineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Indica si el motor está activo.
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Bucle principal de procesamiento de audio.
   */
  private processAudio = (): void => {
    if (!this.isRunning || !this.analyserNode || !this.timeBuffer || !this.freqBuffer || !this.callback) {
      return;
    }
    
    // Obtener datos del dominio temporal
    this.analyserNode.getFloatTimeDomainData(this.timeBuffer);
    
    // Calcular nivel RMS
    const rmsLevel = calculateRMS(this.timeBuffer);
    
    // Noise gate: no procesar si el nivel es muy bajo
    if (rmsLevel < this.config.noiseGateThreshold) {
      this.callback({
        frequency: 0,
        confidence: 0,
        keyIndex: -1,
        centsDeviation: 0,
        targetFrequency: 0,
        rmsLevel,
        inharmonicity: null,
      });
      this.lastFrequencies = [];
      this.animationFrameId = requestAnimationFrame(this.processAudio);
      return;
    }
    
    // Detección de pitch con YIN
    const { frequency: rawFrequency, confidence } = yinDetectPitch(
      this.timeBuffer,
      this.audioContext!.sampleRate
    );
    
    if (rawFrequency <= 0 || confidence < 0.8) {
      this.callback({
        frequency: 0,
        confidence,
        keyIndex: -1,
        centsDeviation: 0,
        targetFrequency: 0,
        rmsLevel,
        inharmonicity: null,
      });
      this.animationFrameId = requestAnimationFrame(this.processAudio);
      return;
    }
    
    // Suavizado de frecuencia (mediana móvil)
    this.lastFrequencies.push(rawFrequency);
    if (this.lastFrequencies.length > this.SMOOTHING_WINDOW) {
      this.lastFrequencies.shift();
    }
    
    const sortedFreqs = [...this.lastFrequencies].sort((a, b) => a - b);
    const frequency = sortedFreqs[Math.floor(sortedFreqs.length / 2)];
    
    // Encontrar la tecla más cercana
    const keyIndex = findNearestKey(frequency, this.config.concertPitch);
    
    if (keyIndex < 0 || keyIndex >= TOTAL_KEYS) {
      this.callback({
        frequency,
        confidence,
        keyIndex: -1,
        centsDeviation: 0,
        targetFrequency: 0,
        rmsLevel,
        inharmonicity: null,
      });
      this.animationFrameId = requestAnimationFrame(this.processAudio);
      return;
    }
    
    // Calcular frecuencia objetivo (con o sin stretch)
    const targetFrequency = this.config.useStretchTuning
      ? getStretchedFrequency(keyIndex, this.config.concertPitch)
      : getEqualTemperamentFrequency(keyIndex, this.config.concertPitch);
    
    // Calcular desviación en cents
    const centsDeviation = frequencyToCents(targetFrequency, frequency);
    
    // Estimar inharmonicidad (usando datos FFT)
    let inharmonicity: number | null = null;
    try {
      this.analyserNode.getFloatFrequencyData(this.freqBuffer);
      // Convertir de dB a magnitud lineal
      const magnitudes = new Float32Array(this.freqBuffer.length);
      for (let i = 0; i < this.freqBuffer.length; i++) {
        magnitudes[i] = Math.pow(10, this.freqBuffer[i] / 20);
      }
      inharmonicity = estimateInharmonicity(magnitudes, frequency, this.audioContext!.sampleRate);
    } catch {
      // Silenciar errores de inharmonicidad
    }
    
    this.callback({
      frequency,
      confidence,
      keyIndex,
      centsDeviation,
      targetFrequency,
      rmsLevel,
      inharmonicity,
    });
    
    this.animationFrameId = requestAnimationFrame(this.processAudio);
  };
}

// ─── Singleton para uso global ───────────────────────────────────────────────

let engineInstance: TunerAudioEngine | null = null;

export function getTunerEngine(config?: Partial<TunerEngineConfig>): TunerAudioEngine {
  if (!engineInstance) {
    engineInstance = new TunerAudioEngine(config);
  } else if (config) {
    engineInstance.updateConfig(config);
  }
  return engineInstance;
}

export function destroyTunerEngine(): void {
  if (engineInstance) {
    engineInstance.stop();
    engineInstance = null;
  }
}
