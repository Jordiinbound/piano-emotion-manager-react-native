/**
 * Tuner Audio Engine — Professional Grade v3
 * 
 * Motor de audio para afinación de pianos usando Web Audio API.
 * Implementa:
 * - AudioWorklet para procesamiento en thread dedicado (fallback a ScriptProcessor)
 * - Detección de pitch con algoritmo YIN (de Cheveigné & Kawahara, 2002)
 * - Estimación de inharmonicidad por superposición de parciales (entropía de Renyi)
 * - Detección de batidos para afinación de unísonos
 * - Generador de tonos de referencia con parciales inarmónicos
 * - Exposición de datos FFT para espectrograma en tiempo real
 * - [NEW] Filtro passa-banda para eliminar ruido fora del rang del piano
 * - [NEW] Mitjana mòbil exponencial (EMA) per estabilitzar lectures
 * - [NEW] Correcció d'octava millorada per anàlisi de parcials
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
  /** Indica si la lectura está estabilizada (EMA convergida) */
  isStable: boolean;
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
  /** Factor de suavizado EMA (0-1, más alto = más suave, más lento) */
  emaSmoothingFactor: number;
  /** Activar filtro passa-banda */
  useBandpassFilter: boolean;
  /** Activar corrección de octava */
  useOctaveCorrection: boolean;
}

export type TunerEngineCallback = (result: PitchDetectionResult) => void;

// ─── Configuración por defecto ───────────────────────────────────────────────

const DEFAULT_CONFIG: TunerEngineConfig = {
  concertPitch: DEFAULT_CONCERT_PITCH,
  useStretchTuning: true,
  noiseGateThreshold: 0.003,
  bufferSize: 4096,
  sampleRate: 44100,
  fftSize: 8192,
  emaSmoothingFactor: 0.35,
  useBandpassFilter: true,
  useOctaveCorrection: true,
};

// ─── Piano frequency range ──────────────────────────────────────────────────

const PIANO_FREQ_LOW = 26;    // Just below A0 (27.5 Hz)
const PIANO_FREQ_HIGH = 4300; // Just above C8 (4186 Hz)

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

// ─── Corrección de octava ───────────────────────────────────────────────────

/**
 * Corrige errores de octava analizando los parciales en el espectro FFT.
 * YIN a veces detecta la 2a armónica en vez de la fundamental, especialmente
 * en notas graves. Este corrector verifica si la frecuencia detectada tiene
 * energía significativa a la mitad (sub-octava) y corrige si es necesario.
 */
function correctOctaveError(
  detectedFreq: number,
  fftData: Float32Array | null,
  sampleRate: number,
  fftSize: number
): number {
  if (!fftData || detectedFreq <= 0) return detectedFreq;
  
  const binResolution = sampleRate / fftSize;
  
  // Verificar sub-octava (frecuencia / 2)
  const subOctaveFreq = detectedFreq / 2;
  if (subOctaveFreq < PIANO_FREQ_LOW) return detectedFreq;
  
  const subOctaveBin = Math.round(subOctaveFreq / binResolution);
  const detectedBin = Math.round(detectedFreq / binResolution);
  
  if (subOctaveBin < 1 || subOctaveBin >= fftData.length || detectedBin >= fftData.length) {
    return detectedFreq;
  }
  
  // Buscar el pico alrededor de la sub-octava (±3 bins)
  const searchRadius = 3;
  let subOctavePeak = -Infinity;
  for (let i = Math.max(1, subOctaveBin - searchRadius); i <= Math.min(fftData.length - 1, subOctaveBin + searchRadius); i++) {
    if (fftData[i] > subOctavePeak) subOctavePeak = fftData[i];
  }
  
  // Buscar el pico alrededor de la frecuencia detectada
  let detectedPeak = -Infinity;
  for (let i = Math.max(1, detectedBin - searchRadius); i <= Math.min(fftData.length - 1, detectedBin + searchRadius); i++) {
    if (fftData[i] > detectedPeak) detectedPeak = fftData[i];
  }
  
  // Si la sub-octava tiene energía significativa (dentro de 15 dB del pico detectado),
  // probablemente es la fundamental real
  if (subOctavePeak > detectedPeak - 15) {
    // Verificar también que hay energía en la 3a armónica de la sub-octava (3 * subOctaveFreq)
    const thirdHarmonicFreq = subOctaveFreq * 3;
    const thirdBin = Math.round(thirdHarmonicFreq / binResolution);
    
    if (thirdBin < fftData.length) {
      let thirdPeak = -Infinity;
      for (let i = Math.max(1, thirdBin - searchRadius); i <= Math.min(fftData.length - 1, thirdBin + searchRadius); i++) {
        if (fftData[i] > thirdPeak) thirdPeak = fftData[i];
      }
      
      // Si la 3a armónica de la sub-octava también tiene energía, confirmar corrección
      if (thirdPeak > detectedPeak - 25) {
        return subOctaveFreq;
      }
    }
    
    // Incluso sin la 3a armónica, si la sub-octava es muy fuerte, corregir
    if (subOctavePeak > detectedPeak - 6) {
      return subOctaveFreq;
    }
  }
  
  // Verificar super-octava: ¿YIN detectó la sub-armónica por error?
  const superOctaveFreq = detectedFreq * 2;
  if (superOctaveFreq > PIANO_FREQ_HIGH) return detectedFreq;
  
  const superBin = Math.round(superOctaveFreq / binResolution);
  if (superBin < fftData.length) {
    let superPeak = -Infinity;
    for (let i = Math.max(1, superBin - searchRadius); i <= Math.min(fftData.length - 1, superBin + searchRadius); i++) {
      if (fftData[i] > superPeak) superPeak = fftData[i];
    }
    
    // Si la super-octava es mucho más fuerte (>12 dB), probablemente es la fundamental real
    if (superPeak > detectedPeak + 12) {
      return superOctaveFreq;
    }
  }
  
  return detectedFreq;
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
 */
function detectBeatFrequency(buffer: Float32Array, sampleRate: number): number | null {
  const blockSize = 64;
  const envelopeLength = Math.floor(buffer.length / blockSize);
  if (envelopeLength < 128) return null;
  
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
  
  let mean = 0;
  for (let i = 0; i < envelope.length; i++) mean += envelope[i];
  mean /= envelope.length;
  for (let i = 0; i < envelope.length; i++) envelope[i] -= mean;
  
  const smoothed = new Float32Array(envelope.length);
  const smoothWindow = 3;
  for (let i = smoothWindow; i < envelope.length - smoothWindow; i++) {
    let s = 0;
    for (let j = -smoothWindow; j <= smoothWindow; j++) s += envelope[i + j];
    smoothed[i] = s / (2 * smoothWindow + 1);
  }
  
  const envelopeSampleRate = sampleRate / blockSize;
  const halfLen = Math.floor(smoothed.length / 2);
  
  const minLag = Math.max(2, Math.floor(envelopeSampleRate / 15));
  const maxLag = Math.min(halfLen - 1, Math.floor(envelopeSampleRate / 0.5));
  
  if (maxLag <= minLag) return null;
  
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
  
  if (maxCorr < 0.15 || bestLag === 0) return null;
  
  const beatFreq = envelopeSampleRate / bestLag;
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
  
  // [NEW] Bandpass filter nodes
  private highpassFilter: BiquadFilterNode | null = null;
  private lowpassFilter: BiquadFilterNode | null = null;
  
  // [NEW] EMA (Exponential Moving Average) state
  private emaFrequency: number = 0;
  private emaCents: number = 0;
  private emaInitialized: boolean = false;
  private emaStableCount: number = 0;
  private readonly EMA_STABLE_THRESHOLD = 4; // Frames needed to consider stable
  
  // Median smoothing for raw frequency
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
    console.log('[TunerEngine] start() called');
    
    try {
      // Solicitar acceso al micrófono con configuración óptima
      console.log('[TunerEngine] Requesting microphone access...');
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: this.config.sampleRate,
        } as any,
      });
      
      console.log('[TunerEngine] Microphone access granted, tracks:', this.mediaStream.getAudioTracks().length);
      
      // Crear contexto de audio
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.config.sampleRate,
      });
      
      // Crear nodo fuente desde el micrófono
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // [NEW] Crear filtros passa-banda para eliminar ruido fuera del rango del piano
      let lastNode: AudioNode = this.sourceNode;
      
      if (this.config.useBandpassFilter) {
        // Highpass filter: elimina frecuencias por debajo de 26 Hz (rumble, vibración)
        this.highpassFilter = this.audioContext.createBiquadFilter();
        this.highpassFilter.type = 'highpass';
        this.highpassFilter.frequency.setValueAtTime(PIANO_FREQ_LOW, this.audioContext.currentTime);
        this.highpassFilter.Q.setValueAtTime(0.7, this.audioContext.currentTime);
        
        // Lowpass filter: elimina frecuencias por encima de 4300 Hz (ruido eléctrico, sibilancia)
        this.lowpassFilter = this.audioContext.createBiquadFilter();
        this.lowpassFilter.type = 'lowpass';
        // Use 5000 Hz to preserve harmonics needed for YIN detection
        this.lowpassFilter.frequency.setValueAtTime(5000, this.audioContext.currentTime);
        this.lowpassFilter.Q.setValueAtTime(0.7, this.audioContext.currentTime);
        
        // Cadena: micrófono → highpass → lowpass
        lastNode.connect(this.highpassFilter);
        this.highpassFilter.connect(this.lowpassFilter);
        lastNode = this.lowpassFilter;
      }
      
      // Crear nodo analizador para FFT (espectrograma)
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = this.config.fftSize;
      this.analyserNode.smoothingTimeConstant = 0.3;
      
      // Conectar: [filtros] → analizador
      lastNode.connect(this.analyserNode);
      
      // Set isRunning BEFORE starting audio processing (worklet or fallback)
      this.isRunning = true;
      this.lastFrequencies = [];
      this.emaFrequency = 0;
      this.emaCents = 0;
      this.emaInitialized = false;
      this.emaStableCount = 0;
      
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
        
        // Connect worklet to analyserNode output (after filters)
        this.analyserNode.connect(this.workletNode);
        this.workletNode.connect(this.audioContext.destination);
        this.useWorklet = true;
        console.log('[TunerEngine] AudioWorklet connected to analyserNode successfully');
        
      } catch (workletError) {
        // Fallback a AnalyserNode + requestAnimationFrame
        console.log('[TunerEngine] AudioWorklet failed, using fallback:', workletError);
        this.useWorklet = false;
        this.timeBuffer = new Float32Array(this.analyserNode.fftSize);
        this.freqBuffer = new Float32Array(this.analyserNode.frequencyBinCount);
        this.processAudioFallback();
      }
      
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
    
    if (this.highpassFilter) {
      this.highpassFilter.disconnect();
      this.highpassFilter = null;
    }
    
    if (this.lowpassFilter) {
      this.lowpassFilter.disconnect();
      this.lowpassFilter = null;
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
   * [NEW] Aplica EMA (Exponential Moving Average) a la frecuencia y cents.
   * Esto estabiliza las lecturas sin añadir latencia perceptible.
   */
  private applyEMA(frequency: number, centsDeviation: number): { frequency: number; centsDeviation: number; isStable: boolean } {
    const alpha = this.config.emaSmoothingFactor;
    
    if (!this.emaInitialized) {
      this.emaFrequency = frequency;
      this.emaCents = centsDeviation;
      this.emaInitialized = true;
      this.emaStableCount = 0;
      return { frequency, centsDeviation, isStable: false };
    }
    
    // Si la nota cambia drásticamente (más de 50 cents), resetear EMA
    const centsDiff = Math.abs(frequencyToCents(this.emaFrequency, frequency));
    if (centsDiff > 50) {
      this.emaFrequency = frequency;
      this.emaCents = centsDeviation;
      this.emaStableCount = 0;
      return { frequency, centsDeviation, isStable: false };
    }
    
    // Aplicar EMA
    this.emaFrequency = alpha * this.emaFrequency + (1 - alpha) * frequency;
    this.emaCents = alpha * this.emaCents + (1 - alpha) * centsDeviation;
    
    // Determinar estabilidad
    if (Math.abs(centsDeviation - this.emaCents) < 1.5) {
      this.emaStableCount = Math.min(this.emaStableCount + 1, this.EMA_STABLE_THRESHOLD + 5);
    } else {
      this.emaStableCount = Math.max(0, this.emaStableCount - 1);
    }
    
    const isStable = this.emaStableCount >= this.EMA_STABLE_THRESHOLD;
    
    return {
      frequency: this.emaFrequency,
      centsDeviation: this.emaCents,
      isStable,
    };
  }

  /**
   * Procesa un buffer de audio (llamado desde AudioWorklet o fallback).
   */
  private processBuffer(buffer: Float32Array, sampleRate: number): void {
    if (!this.isRunning || !this.callback) {
      console.log('[TunerEngine] processBuffer skipped: isRunning=', this.isRunning, 'callback=', !!this.callback);
      return;
    }
    
    const rmsLevel = calculateRMS(buffer);
    
    // Noise gate
    if (rmsLevel < this.config.noiseGateThreshold) {
      // Log every 60 frames to avoid spam
      if (Math.random() < 0.02) console.log('[TunerEngine] Below noise gate: rms=', rmsLevel.toFixed(6), 'threshold=', this.config.noiseGateThreshold);
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
        isStable: false,
      });
      this.lastFrequencies = [];
      this.emaInitialized = false;
      this.emaStableCount = 0;
      return;
    }
    
    // Detección de pitch con YIN
    const { frequency: rawFrequency, confidence } = yinDetectPitch(buffer, sampleRate);
    if (Math.random() < 0.05) console.log('[TunerEngine] YIN result: freq=', rawFrequency.toFixed(1), 'confidence=', confidence.toFixed(3), 'rms=', rmsLevel.toFixed(6));
    
    // Obtener datos FFT del analyser
    let fftData: Float32Array | null = null;
    if (this.analyserNode) {
      const freqBuf = new Float32Array(this.analyserNode.frequencyBinCount);
      this.analyserNode.getFloatFrequencyData(freqBuf);
      fftData = freqBuf;
    }
    
    if (rawFrequency <= 0 || confidence < 0.5) {
      if (Math.random() < 0.05) console.log('[TunerEngine] Rejected: freq=', rawFrequency.toFixed(1), 'confidence=', confidence.toFixed(3));
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
        isStable: false,
      });
      return;
    }
    
    // [NEW] Corrección de octava usando análisis de parciales FFT
    let correctedFrequency = rawFrequency;
    if (this.config.useOctaveCorrection && fftData) {
      correctedFrequency = correctOctaveError(
        rawFrequency,
        fftData,
        sampleRate,
        this.config.fftSize
      );
    }
    
    // Suavizado de frecuencia (mediana móvil)
    this.lastFrequencies.push(correctedFrequency);
    if (this.lastFrequencies.length > this.SMOOTHING_WINDOW) {
      this.lastFrequencies.shift();
    }
    
    const sortedFreqs = [...this.lastFrequencies].sort((a, b) => a - b);
    const medianFrequency = sortedFreqs[Math.floor(sortedFreqs.length / 2)];
    
    // Encontrar la tecla más cercana
    const keyIndex = findNearestKey(medianFrequency, this.config.concertPitch);
    
    if (keyIndex < 0 || keyIndex >= TOTAL_KEYS) {
      this.callback({
        frequency: medianFrequency,
        confidence,
        keyIndex: -1,
        centsDeviation: 0,
        targetFrequency: 0,
        rmsLevel,
        inharmonicity: null,
        fftData,
        actualSampleRate: sampleRate,
        beatFrequency: null,
        isStable: false,
      });
      return;
    }
    
    // Calcular frecuencia objetivo
    const targetFrequency = this.config.useStretchTuning
      ? getStretchedFrequency(keyIndex, this.config.concertPitch)
      : getEqualTemperamentFrequency(keyIndex, this.config.concertPitch);
    
    const rawCentsDeviation = frequencyToCents(targetFrequency, medianFrequency);
    
    // [NEW] Aplicar EMA para estabilizar la lectura
    const ema = this.applyEMA(medianFrequency, rawCentsDeviation);
    
    // Estimar inharmonicidad
    let inharmonicity: number | null = null;
    if (fftData) {
      try {
        const magnitudes = new Float32Array(fftData.length);
        for (let i = 0; i < fftData.length; i++) {
          magnitudes[i] = Math.pow(10, fftData[i] / 20);
        }
        inharmonicity = estimateInharmonicity(magnitudes, ema.frequency, sampleRate);
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
      frequency: ema.frequency,
      confidence,
      keyIndex,
      centsDeviation: ema.centsDeviation,
      targetFrequency,
      rmsLevel,
      inharmonicity,
      fftData,
      actualSampleRate: sampleRate,
      beatFrequency,
      isStable: ema.isStable,
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
      
      if (partialFreq >= this.audioContext.sampleRate / 2) break;
      
      const osc = this.audioContext.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(partialFreq, this.audioContext.currentTime);
      
      const partialGain = this.audioContext.createGain();
      const amplitude = 1 / (n * n);
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
