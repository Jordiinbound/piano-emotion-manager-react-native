/**
 * Tuner Audio Engine — Professional Grade
 * 
 * Motor de audio para afinación de pianos usando Web Audio API.
 * Implementa:
 * - AudioWorklet para procesamiento en thread dedicado (fallback a ScriptProcessor)
 * - Detección de pitch con algoritmo YIN (de Cheveigné & Kawahara, 2002)
 * - Estimación de inharmonicidad por superposición de parciales (entropía de Renyi)
 * - Detección de batidos para afinación de unísonos
 * - Generador de tonos de referencia con parciales inarmónicos
 * - Exposición de datos FFT para espectrograma en tiempo real
 * 
 * Algoritmos basados en:
 * - YIN: "YIN, a fundamental frequency estimator for speech and music" (JASA, 2002)
 * - Inharmonicidad: Entropy Piano Tuner (GPL3) - fftanalyzer.cpp
 * - Hinrichsen, H. (2012). Entropy-based tuning of musical instruments. arXiv:1203.5101
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
import { createWorkletBlobURL } from './tuner-worklet-processor';

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
  /** Datos FFT para espectrograma (magnitudes lineales) */
  fftData: Float32Array | null;
  /** Frecuencia de muestreo real del contexto de audio */
  actualSampleRate: number;
  /** Frecuencia de batido detectada (para modo unísono) */
  beatFrequency: number | null;
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
  /** Tamaño FFT para espectrograma */
  fftSize: number;
}

export type TunerEngineCallback = (result: PitchDetectionResult) => void;

// ─── Configuración por defecto ───────────────────────────────────────────────

const DEFAULT_CONFIG: TunerEngineConfig = {
  concertPitch: DEFAULT_CONCERT_PITCH,
  useStretchTuning: true,
  noiseGateThreshold: 0.008,
  bufferSize: 4096,
  sampleRate: 44100,
  fftSize: 8192,
};

// ─── Algoritmo YIN ───────────────────────────────────────────────────────────

/**
 * Implementación del algoritmo YIN para detección de pitch.
 * Pasos: diferencia → CMND → umbral absoluto → interpolación parabólica
 */
function yinDetectPitch(buffer: Float32Array, sampleRate: number): { frequency: number; confidence: number } {
  const threshold = 0.12;
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
  
  // Paso 2: CMND (Cumulative Mean Normalized Difference)
  const cmnd = new Float32Array(halfSize);
  cmnd[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfSize; tau++) {
    runningSum += difference[tau];
    cmnd[tau] = difference[tau] * tau / runningSum;
  }
  
  // Paso 3: Búsqueda del umbral absoluto
  const minTau = Math.max(2, Math.floor(sampleRate / 4200));
  const maxTau = Math.min(halfSize - 1, Math.floor(sampleRate / 25));
  
  let bestTau = -1;
  for (let tau = minTau; tau < maxTau; tau++) {
    if (cmnd[tau] < threshold) {
      while (tau + 1 < maxTau && cmnd[tau + 1] < cmnd[tau]) {
        tau++;
      }
      bestTau = tau;
      break;
    }
  }
  
  if (bestTau === -1) {
    let minVal = Infinity;
    for (let tau = minTau; tau < maxTau; tau++) {
      if (cmnd[tau] < minVal) {
        minVal = cmnd[tau];
        bestTau = tau;
      }
    }
    if (minVal > 0.5) {
      return { frequency: 0, confidence: 0 };
    }
  }
  
  if (bestTau < 2 || bestTau >= halfSize - 1) {
    return { frequency: 0, confidence: 0 };
  }
  
  // Paso 4: Interpolación parabólica
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

function estimateInharmonicity(
  fftData: Float32Array,
  fundamentalFreq: number,
  sampleRate: number
): number {
  if (fundamentalFreq <= 20 || fundamentalFreq > 2250) return 0;
  
  const binResolution = sampleRate / (fftData.length * 2);
  
  // Para frecuencias altas (> 1000 Hz): método directo f2/f1
  if (fundamentalFreq > 1000) {
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
  const R = 80;
  
  let bestB = expectedB;
  let minEntropy = Infinity;
  
  for (let scanB = expectedB / 5; scanB <= expectedB * 5; scanB *= 1.05) {
    const superposition = new Float32Array(R);
    
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
        
        if (partialSum > 0) {
          for (let r = 0; r < R; r++) {
            superposition[r] += partial[r] / partialSum;
          }
        }
      }
    }
    
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

// ─── Detección de Batidos (Unísono) ─────────────────────────────────────────

/**
 * Detecta la frecuencia de batido en la envolvente de amplitud.
 * Los batidos se producen cuando dos cuerdas del mismo unísono están
 * ligeramente desafinadas entre sí. La frecuencia de batido = |f1 - f2|.
 * 
 * Método: Análisis de la envolvente de amplitud del audio.
 * 1. Calcular envolvente via rectificación + filtro paso bajo
 * 2. Aplicar YIN a la envolvente para detectar la frecuencia de modulación
 */
function detectBeatFrequency(buffer: Float32Array, sampleRate: number): number | null {
  const blockSize = 64;
  const envelopeLength = Math.floor(buffer.length / blockSize);
  if (envelopeLength < 128) return null;
  
  // Calcular envolvente de amplitud (RMS por bloques)
  const envelope = new Float32Array(envelopeLength);
  for (let i = 0; i < envelopeLength; i++) {
    let sum = 0;
    const offset = i * blockSize;
    for (let j = 0; j < blockSize; j++) {
      const sample = buffer[offset + j];
      sum += sample * sample;
    }
    envelope[i] = Math.sqrt(sum / blockSize);
  }
  
  // Remover DC de la envolvente
  let mean = 0;
  for (let i = 0; i < envelope.length; i++) mean += envelope[i];
  mean /= envelope.length;
  for (let i = 0; i < envelope.length; i++) envelope[i] -= mean;
  
  // Suavizar la envolvente (filtro de media móvil)
  const smoothed = new Float32Array(envelope.length);
  const smoothWindow = 3;
  for (let i = smoothWindow; i < envelope.length - smoothWindow; i++) {
    let s = 0;
    for (let j = -smoothWindow; j <= smoothWindow; j++) s += envelope[i + j];
    smoothed[i] = s / (2 * smoothWindow + 1);
  }
  
  // Detectar frecuencia de la envolvente con autocorrelación
  const envelopeSampleRate = sampleRate / blockSize;
  const halfLen = Math.floor(smoothed.length / 2);
  
  // Buscar batidos entre 0.5 Hz y 15 Hz
  const minLag = Math.max(2, Math.floor(envelopeSampleRate / 15));
  const maxLag = Math.min(halfLen - 1, Math.floor(envelopeSampleRate / 0.5));
  
  if (maxLag <= minLag) return null;
  
  // Autocorrelación normalizada
  let maxCorr = 0;
  let bestLag = 0;
  let energy = 0;
  for (let i = 0; i < halfLen; i++) energy += smoothed[i] * smoothed[i];
  if (energy < 1e-10) return null;
  
  for (let lag = minLag; lag < maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < halfLen; i++) {
      corr += smoothed[i] * smoothed[i + lag];
    }
    corr /= energy;
    
    if (corr > maxCorr) {
      maxCorr = corr;
      bestLag = lag;
    }
  }
  
  // Solo reportar si la correlación es significativa
  if (maxCorr < 0.15 || bestLag === 0) return null;
  
  const beatFreq = envelopeSampleRate / bestLag;
  
  // Sanity check: batidos razonables están entre 0.5 y 12 Hz
  if (beatFreq < 0.5 || beatFreq > 12) return null;
  
  return Math.round(beatFreq * 100) / 100;
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
  private workletNode: AudioWorkletNode | null = null;
  private scriptProcessorNode: ScriptProcessorNode | null = null;
  private config: TunerEngineConfig;
  private callback: TunerEngineCallback | null = null;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private timeBuffer: Float32Array | null = null;
  private freqBuffer: Float32Array | null = null;
  private workletBlobURL: string | null = null;
  private useWorklet: boolean = false;
  private detectBeats: boolean = false;
  
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
      // Solicitar acceso al micrófono con configuración óptima
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: this.config.sampleRate,
        } as any,
      });
      
      // Crear contexto de audio
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.config.sampleRate,
      });
      
      // Crear nodo fuente desde el micrófono
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Crear nodo analizador para FFT (espectrograma)
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = this.config.fftSize;
      this.analyserNode.smoothingTimeConstant = 0.3;
      
      // Conectar: micrófono → analizador
      this.sourceNode.connect(this.analyserNode);
      
      // Intentar usar AudioWorklet (thread dedicado)
      try {
        this.workletBlobURL = createWorkletBlobURL();
        await this.audioContext.audioWorklet.addModule(this.workletBlobURL);
        
        this.workletNode = new AudioWorkletNode(this.audioContext, 'tuner-processor');
        this.workletNode.port.onmessage = (event) => {
          if (event.data.type === 'buffer') {
            this.processBuffer(new Float32Array(event.data.buffer), event.data.sampleRate);
          }
        };
        
        // Configurar tamaño de buffer
        this.workletNode.port.postMessage({
          type: 'setBufferSize',
          bufferSize: this.config.bufferSize,
        });
        
        this.sourceNode.connect(this.workletNode);
        this.workletNode.connect(this.audioContext.destination);
        this.useWorklet = true;
        
      } catch {
        // Fallback a AnalyserNode + requestAnimationFrame
        this.useWorklet = false;
        this.timeBuffer = new Float32Array(this.analyserNode.fftSize);
        this.freqBuffer = new Float32Array(this.analyserNode.frequencyBinCount);
        this.processAudioFallback();
      }
      
      this.isRunning = true;
      this.lastFrequencies = [];
      
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
    
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'stop' });
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    
    if (this.scriptProcessorNode) {
      this.scriptProcessorNode.disconnect();
      this.scriptProcessorNode = null;
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
    
    if (this.workletBlobURL) {
      URL.revokeObjectURL(this.workletBlobURL);
      this.workletBlobURL = null;
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
   * Activa/desactiva la detección de batidos (modo unísono).
   */
  setBeatDetection(enabled: boolean): void {
    this.detectBeats = enabled;
  }

  /**
   * Indica si el motor está activo.
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Indica si se está usando AudioWorklet.
   */
  get isUsingWorklet(): boolean {
    return this.useWorklet;
  }

  /**
   * Obtiene el contexto de audio (para el generador de tonos).
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Procesa un buffer de audio (llamado desde AudioWorklet o fallback).
   */
  private processBuffer(buffer: Float32Array, sampleRate: number): void {
    if (!this.isRunning || !this.callback) return;
    
    const rmsLevel = calculateRMS(buffer);
    
    // Noise gate
    if (rmsLevel < this.config.noiseGateThreshold) {
      this.callback({
        frequency: 0,
        confidence: 0,
        keyIndex: -1,
        centsDeviation: 0,
        targetFrequency: 0,
        rmsLevel,
        inharmonicity: null,
        fftData: null,
        actualSampleRate: sampleRate,
        beatFrequency: null,
      });
      this.lastFrequencies = [];
      return;
    }
    
    // Detección de pitch con YIN
    const { frequency: rawFrequency, confidence } = yinDetectPitch(buffer, sampleRate);
    
    // Obtener datos FFT del analyser
    let fftData: Float32Array | null = null;
    if (this.analyserNode) {
      const freqBuf = new Float32Array(this.analyserNode.frequencyBinCount);
      this.analyserNode.getFloatFrequencyData(freqBuf);
      fftData = freqBuf;
    }
    
    if (rawFrequency <= 0 || confidence < 0.75) {
      this.callback({
        frequency: 0,
        confidence,
        keyIndex: -1,
        centsDeviation: 0,
        targetFrequency: 0,
        rmsLevel,
        inharmonicity: null,
        fftData,
        actualSampleRate: sampleRate,
        beatFrequency: null,
      });
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
        fftData,
        actualSampleRate: sampleRate,
        beatFrequency: null,
      });
      return;
    }
    
    // Calcular frecuencia objetivo
    const targetFrequency = this.config.useStretchTuning
      ? getStretchedFrequency(keyIndex, this.config.concertPitch)
      : getEqualTemperamentFrequency(keyIndex, this.config.concertPitch);
    
    const centsDeviation = frequencyToCents(targetFrequency, frequency);
    
    // Estimar inharmonicidad
    let inharmonicity: number | null = null;
    if (fftData) {
      try {
        const magnitudes = new Float32Array(fftData.length);
        for (let i = 0; i < fftData.length; i++) {
          magnitudes[i] = Math.pow(10, fftData[i] / 20);
        }
        inharmonicity = estimateInharmonicity(magnitudes, frequency, sampleRate);
      } catch {}
    }
    
    // Detección de batidos (si está activada)
    let beatFrequency: number | null = null;
    if (this.detectBeats) {
      try {
        beatFrequency = detectBeatFrequency(buffer, sampleRate);
      } catch {}
    }
    
    this.callback({
      frequency,
      confidence,
      keyIndex,
      centsDeviation,
      targetFrequency,
      rmsLevel,
      inharmonicity,
      fftData,
      actualSampleRate: sampleRate,
      beatFrequency,
    });
  }

  /**
   * Fallback: procesamiento via AnalyserNode + requestAnimationFrame
   */
  private processAudioFallback = (): void => {
    if (!this.isRunning || !this.analyserNode || !this.timeBuffer || !this.callback) {
      return;
    }
    
    this.analyserNode.getFloatTimeDomainData(this.timeBuffer);
    this.processBuffer(this.timeBuffer, this.audioContext!.sampleRate);
    this.animationFrameId = requestAnimationFrame(this.processAudioFallback);
  };
}

// ─── Generador de Tonos de Referencia ───────────────────────────────────────

export class ToneGenerator {
  private audioContext: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private gainNode: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  
  /**
   * Genera un tono de referencia con parciales inarmónicos opcionales.
   * 
   * @param frequency - Frecuencia fundamental en Hz
   * @param inharmonicityB - Coeficiente de inharmonicidad (0 para tono puro)
   * @param numPartials - Número de parciales a generar (1 = solo fundamental)
   * @param volume - Volumen (0-1)
   */
  async play(
    frequency: number,
    inharmonicityB: number = 0,
    numPartials: number = 1,
    volume: number = 0.3
  ): Promise<void> {
    this.stop();
    
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Master gain con fade-in
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.05);
    this.masterGain.connect(this.audioContext.destination);
    
    // Generar parciales
    const maxPartials = Math.min(numPartials, 8);
    for (let n = 1; n <= maxPartials; n++) {
      const partialFreq = inharmonicityB > 0
        ? getInharmonicPartialFrequency(frequency, n, inharmonicityB)
        : frequency * n;
      
      // Verificar que no exceda Nyquist
      if (partialFreq >= this.audioContext.sampleRate / 2) break;
      
      const osc = this.audioContext.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(partialFreq, this.audioContext.currentTime);
      
      // Gain individual: decae con el número de parcial
      const partialGain = this.audioContext.createGain();
      const amplitude = 1 / (n * n); // Decaimiento cuadrático
      partialGain.gain.setValueAtTime(amplitude, this.audioContext.currentTime);
      
      osc.connect(partialGain);
      partialGain.connect(this.masterGain);
      osc.start();
      
      this.oscillators.push(osc);
    }
    
    this.isPlaying = true;
  }
  
  /**
   * Detiene el tono de referencia con fade-out.
   */
  stop(): void {
    if (this.masterGain && this.audioContext) {
      const now = this.audioContext.currentTime;
      this.masterGain.gain.linearRampToValueAtTime(0, now + 0.05);
      
      setTimeout(() => {
        this.oscillators.forEach(osc => {
          try { osc.stop(); } catch {}
        });
        this.oscillators = [];
        
        if (this.audioContext) {
          this.audioContext.close();
          this.audioContext = null;
        }
        this.masterGain = null;
      }, 100);
    } else {
      this.oscillators.forEach(osc => {
        try { osc.stop(); } catch {}
      });
      this.oscillators = [];
    }
    
    this.isPlaying = false;
  }
  
  get playing(): boolean {
    return this.isPlaying;
  }
}

// ─── Singleton para uso global ───────────────────────────────────────────────

let engineInstance: TunerAudioEngine | null = null;
let toneGeneratorInstance: ToneGenerator | null = null;

export function getTunerEngine(config?: Partial<TunerEngineConfig>): TunerAudioEngine {
  if (!engineInstance) {
    engineInstance = new TunerAudioEngine(config);
  } else if (config) {
    engineInstance.updateConfig(config);
  }
  return engineInstance;
}

export function getToneGenerator(): ToneGenerator {
  if (!toneGeneratorInstance) {
    toneGeneratorInstance = new ToneGenerator();
  }
  return toneGeneratorInstance;
}

export function destroyTunerEngine(): void {
  if (engineInstance) {
    engineInstance.stop();
    engineInstance = null;
  }
  if (toneGeneratorInstance) {
    toneGeneratorInstance.stop();
    toneGeneratorInstance = null;
  }
}
