/**
 * Tuner Audio Engine — Professional Grade v4
 * 
 * Motor de audio para afinación de pianos usando Web Audio API.
 * Implementa:
 * - AnalyserNode + requestAnimationFrame como método PRIMARIO (más fiable)
 * - AudioWorklet como mejora opcional con timeout de detección
 * - Detección de pitch con algoritmo YIN (de Cheveigné & Kawahara, 2002)
 * - Estimación de inharmonicidad por superposición de parciales (entropía de Renyi)
 * - Detección de batidos para afinación de unísonos
 * - Generador de tonos de referencia con parciales inarmónicos
 * - Exposición de datos FFT para espectrograma en tiempo real
 * - Filtro passa-banda para eliminar ruido fuera del rango del piano
 * - Media móvil exponencial (EMA) para estabilizar lecturas
 * - Corrección de octava mejorada por análisis de parciales
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
  /** Input gain multiplier (1 = no gain, 4 = 4x amplification) */
  inputGain: number;
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
  noiseGateThreshold: 0.002, // Low gate for weak laptop mics (~-50dB signal)
  inputGain: 8, // 8x input amplification for weak laptop mics
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
  const threshold = 0.15; // Slightly more permissive threshold
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
    // More permissive fallback - accept if below 0.85
    if (minVal > 0.85) {
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
 */
function correctOctaveError(
  detectedFreq: number,
  fftData: Float32Array | null,
  sampleRate: number,
  fftSize: number
): number {
  if (!fftData || detectedFreq <= 0) return detectedFreq;
  
  const binResolution = sampleRate / fftSize;
  const searchRadius = Math.max(2, Math.round(5 / binResolution));
  
  // Encontrar pico en la frecuencia detectada
  const detectedBin = Math.round(detectedFreq / binResolution);
  let detectedPeak = -Infinity;
  for (let i = Math.max(1, detectedBin - searchRadius); i <= Math.min(fftData.length - 1, detectedBin + searchRadius); i++) {
    if (fftData[i] > detectedPeak) detectedPeak = fftData[i];
  }
  
  // Verificar sub-octava
  const subOctaveFreq = detectedFreq / 2;
  if (subOctaveFreq < PIANO_FREQ_LOW) return detectedFreq;
  
  const subBin = Math.round(subOctaveFreq / binResolution);
  if (subBin >= 1 && subBin < fftData.length) {
    let subOctavePeak = -Infinity;
    for (let i = Math.max(1, subBin - searchRadius); i <= Math.min(fftData.length - 1, subBin + searchRadius); i++) {
      if (fftData[i] > subOctavePeak) subOctavePeak = fftData[i];
    }
    
    // Verificar 3a armónica de la sub-octava
    const thirdHarmonicBin = Math.round(subOctaveFreq * 3 / binResolution);
    let thirdPeak = -Infinity;
    if (thirdHarmonicBin < fftData.length) {
      for (let i = Math.max(1, thirdHarmonicBin - searchRadius); i <= Math.min(fftData.length - 1, thirdHarmonicBin + searchRadius); i++) {
        if (fftData[i] > thirdPeak) thirdPeak = fftData[i];
      }
      
      if (thirdPeak > detectedPeak - 25) {
        return subOctaveFreq;
      }
    }
    
    if (subOctavePeak > detectedPeak - 6) {
      return subOctaveFreq;
    }
  }
  
  // Verificar super-octava
  const superOctaveFreq = detectedFreq * 2;
  if (superOctaveFreq > PIANO_FREQ_HIGH) return detectedFreq;
  
  const superBin = Math.round(superOctaveFreq / binResolution);
  if (superBin < fftData.length) {
    let superPeak = -Infinity;
    for (let i = Math.max(1, superBin - searchRadius); i <= Math.min(fftData.length - 1, superBin + searchRadius); i++) {
      if (fftData[i] > superPeak) superPeak = fftData[i];
    }
    
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
  
  // Gain node for input amplification
  private inputGainNode: GainNode | null = null;
  // Bandpass filter nodes
  private highpassFilter: BiquadFilterNode | null = null;
  private lowpassFilter: BiquadFilterNode | null = null;
  
  // EMA (Exponential Moving Average) state
  private emaFrequency: number = 0;
  private emaCents: number = 0;
  private emaInitialized: boolean = false;
  private emaStableCount: number = 0;
  private readonly EMA_STABLE_THRESHOLD = 4;
  
  // Median smoothing for raw frequency
  private lastFrequencies: number[] = [];
  private readonly SMOOTHING_WINDOW = 5;

  // Diagnostic counters
  private frameCount: number = 0;
  private lastLogTime: number = 0;

  constructor(config?: Partial<TunerEngineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Inicia la captura de audio y la detección de pitch.
   * STRATEGY: Always start with AnalyserNode + requestAnimationFrame (reliable).
   * Then optionally try AudioWorklet as an upgrade.
   */
  async start(callback: TunerEngineCallback): Promise<void> {
    this.callback = callback;
    this.frameCount = 0;
    this.lastLogTime = Date.now();
    console.log('[TunerEngine] start() called — v4 fallback-first strategy');
    
    try {
      // Step 1: Request microphone access
      console.log('[TunerEngine] Requesting microphone access...');
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } as any,
      });
      
      const tracks = this.mediaStream.getAudioTracks();
      console.log('[TunerEngine] Microphone granted. Tracks:', tracks.length, 
        'Settings:', JSON.stringify(tracks[0]?.getSettings()));
      
      // Step 2: Create AudioContext (use browser's default sample rate for compatibility)
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const actualSampleRate = this.audioContext.sampleRate;
      console.log('[TunerEngine] AudioContext created. SampleRate:', actualSampleRate, 'State:', this.audioContext.state);
      
      // Resume context if suspended (Chrome autoplay policy)
      if (this.audioContext.state === 'suspended') {
        console.log('[TunerEngine] AudioContext suspended, resuming...');
        await this.audioContext.resume();
        console.log('[TunerEngine] AudioContext resumed. State:', this.audioContext.state);
      }
      
      // Step 3: Create source node from microphone
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Step 3.5: Create input gain node to amplify microphone signal
      this.inputGainNode = this.audioContext.createGain();
      this.inputGainNode.gain.setValueAtTime(this.config.inputGain, this.audioContext.currentTime);
      this.sourceNode.connect(this.inputGainNode);
      console.log('[TunerEngine] Input gain set to', this.config.inputGain, 'x');
      console.log('[TunerEngine] Noise gate threshold:', this.config.noiseGateThreshold);
      console.log('[TunerEngine] Full config:', JSON.stringify({
        inputGain: this.config.inputGain,
        noiseGateThreshold: this.config.noiseGateThreshold,
        bufferSize: this.config.bufferSize,
        sampleRate: this.config.sampleRate,
      }));
      
      // Step 4: Optional bandpass filter
      let lastNode: AudioNode = this.inputGainNode;
      
      if (this.config.useBandpassFilter) {
        this.highpassFilter = this.audioContext.createBiquadFilter();
        this.highpassFilter.type = 'highpass';
        this.highpassFilter.frequency.setValueAtTime(PIANO_FREQ_LOW, this.audioContext.currentTime);
        this.highpassFilter.Q.setValueAtTime(0.7, this.audioContext.currentTime);
        
        this.lowpassFilter = this.audioContext.createBiquadFilter();
        this.lowpassFilter.type = 'lowpass';
        this.lowpassFilter.frequency.setValueAtTime(5000, this.audioContext.currentTime);
        this.lowpassFilter.Q.setValueAtTime(0.7, this.audioContext.currentTime);
        
        lastNode.connect(this.highpassFilter);
        this.highpassFilter.connect(this.lowpassFilter);
        lastNode = this.lowpassFilter;
      }
      
      // Step 5: Create AnalyserNode for FFT data AND time-domain data
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = this.config.fftSize;
      this.analyserNode.smoothingTimeConstant = 0.3;
      
      // Connect: [filters] → analyser
      lastNode.connect(this.analyserNode);
      
      // Step 6: Set running state
      this.isRunning = true;
      this.lastFrequencies = [];
      this.emaFrequency = 0;
      this.emaCents = 0;
      this.emaInitialized = false;
      this.emaStableCount = 0;
      
      // Step 7: ALWAYS start the fallback (AnalyserNode + rAF) — this is our PRIMARY method
      this.timeBuffer = new Float32Array(this.config.bufferSize);
      this.freqBuffer = new Float32Array(this.analyserNode.frequencyBinCount);
      console.log('[TunerEngine] Starting PRIMARY audio loop (AnalyserNode + rAF). BufferSize:', this.config.bufferSize, 'FFT bins:', this.analyserNode.frequencyBinCount);
      this.processAudioFallback();
      
      // Step 8: Optionally try AudioWorklet as upgrade (non-blocking)
      this.tryUpgradeToWorklet().catch((err) => {
        console.log('[TunerEngine] Worklet upgrade skipped:', err?.message || err);
      });
      
    } catch (error) {
      console.error('[TunerEngine] Error starting audio:', error);
      throw error;
    }
  }

  /**
   * Try to upgrade to AudioWorklet for lower latency.
   * If this fails or doesn't produce data, the fallback keeps running.
   */
  private async tryUpgradeToWorklet(): Promise<void> {
    if (!this.audioContext || !this.analyserNode) return;
    
    try {
      this.workletBlobURL = createWorkletBlobURL();
      await this.audioContext.audioWorklet.addModule(this.workletBlobURL);
      
      this.workletNode = new AudioWorkletNode(this.audioContext, 'tuner-processor');
      
      let workletReceivedData = false;
      
      this.workletNode.port.onmessage = (event) => {
        if (event.data.type === 'buffer') {
          workletReceivedData = true;
          // Only use worklet data if we've confirmed it works
          if (this.useWorklet) {
            this.processBuffer(new Float32Array(event.data.buffer), event.data.sampleRate);
          }
        }
      };
      
      this.workletNode.port.postMessage({
        type: 'setBufferSize',
        bufferSize: this.config.bufferSize,
      });
      
      this.analyserNode.connect(this.workletNode);
      this.workletNode.connect(this.audioContext.destination);
      
      console.log('[TunerEngine] AudioWorklet loaded, waiting 2s to verify data flow...');
      
      // Wait 2 seconds to verify the worklet actually sends data
      await new Promise<void>((resolve) => setTimeout(resolve, 2000));
      
      if (workletReceivedData && this.isRunning) {
        // Worklet is working! Switch to it and stop the fallback loop
        this.useWorklet = true;
        if (this.animationFrameId !== null) {
          cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
        }
        console.log('[TunerEngine] ✅ Upgraded to AudioWorklet (lower latency)');
      } else {
        // Worklet didn't send data — keep using fallback
        console.log('[TunerEngine] ⚠️ AudioWorklet loaded but no data received. Keeping fallback.');
        if (this.workletNode) {
          this.workletNode.disconnect();
          this.workletNode = null;
        }
      }
    } catch (err) {
      console.log('[TunerEngine] AudioWorklet not available:', err);
      if (this.workletBlobURL) {
        URL.revokeObjectURL(this.workletBlobURL);
        this.workletBlobURL = null;
      }
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
    
    if (this.inputGainNode) {
      this.inputGainNode.disconnect();
      this.inputGainNode = null;
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
    this.useWorklet = false;
    console.log('[TunerEngine] Stopped. Processed', this.frameCount, 'frames total.');
  }

  /**
   * Actualiza la configuración del motor.
   */
  updateConfig(config: Partial<TunerEngineConfig>): void {
    this.config = { ...this.config, ...config };
    // Update gain node in real-time if it exists
    if (config.inputGain !== undefined && this.inputGainNode && this.audioContext) {
      this.inputGainNode.gain.setValueAtTime(config.inputGain, this.audioContext.currentTime);
      console.log('[TunerEngine] Input gain updated to', config.inputGain, 'x');
    }
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
   * Aplica EMA (Exponential Moving Average) a la frecuencia y cents.
   */
  private applyEMA(frequency: number, centsDeviation: number): { frequency: number; centsDeviation: number; isStable: boolean } {
    const alpha = this.config.emaSmoothingFactor;
    
    if (!this.emaInitialized) {
      this.emaFrequency = frequency;
      this.emaCents = centsDeviation;
      this.emaInitialized = true;
      return { frequency, centsDeviation, isStable: false };
    }
    
    // Check if frequency jumped significantly (new note)
    const freqRatio = frequency / this.emaFrequency;
    if (freqRatio > 1.06 || freqRatio < 0.94) {
      // New note detected — reset EMA
      this.emaFrequency = frequency;
      this.emaCents = centsDeviation;
      this.emaStableCount = 0;
      return { frequency, centsDeviation, isStable: false };
    }
    
    // Apply EMA
    this.emaFrequency = alpha * this.emaFrequency + (1 - alpha) * frequency;
    this.emaCents = alpha * this.emaCents + (1 - alpha) * centsDeviation;
    
    // Determine stability
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
      return;
    }
    
    this.frameCount++;
    const now = Date.now();
    
    // Clipping protection: if gain causes samples > 1.0, normalize the buffer
    let maxAbs = 0;
    for (let i = 0; i < buffer.length; i++) {
      const abs = Math.abs(buffer[i]);
      if (abs > maxAbs) maxAbs = abs;
    }
    if (maxAbs > 1.0) {
      const scale = 0.95 / maxAbs;
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] *= scale;
      }
    }
    
    const rmsLevel = calculateRMS(buffer);
    
    // Diagnostic logging every 2 seconds
    if (now - this.lastLogTime > 2000) {
      // Find max absolute sample value for diagnostics
      let maxSample = 0;
      for (let i = 0; i < buffer.length; i++) {
        const abs = Math.abs(buffer[i]);
        if (abs > maxSample) maxSample = abs;
      }
      const dbLevel = rmsLevel > 0 ? 20 * Math.log10(rmsLevel) : -Infinity;
      console.log(`[TunerEngine] Status: frames=${this.frameCount}, rms=${rmsLevel.toFixed(6)} (${dbLevel.toFixed(1)}dB), maxSample=${maxSample.toFixed(6)}, gate=${this.config.noiseGateThreshold}, gain=${this.config.inputGain}x, worklet=${this.useWorklet}`);
      this.lastLogTime = now;
    }
    
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
        isStable: false,
      });
      this.lastFrequencies = [];
      this.emaInitialized = false;
      this.emaStableCount = 0;
      return;
    }
    
    // Pitch detection with YIN
    const { frequency: rawFrequency, confidence } = yinDetectPitch(buffer, sampleRate);
    
    // Get FFT data from analyser
    let fftData: Float32Array | null = null;
    if (this.analyserNode) {
      const freqBuf = new Float32Array(this.analyserNode.frequencyBinCount);
      this.analyserNode.getFloatFrequencyData(freqBuf);
      fftData = freqBuf;
    }
    
    // Log YIN results every 2 seconds (always, not just when freq > 0)
    if (now - this.lastLogTime < 200) {
      console.log(`[TunerEngine] YIN result: freq=${rawFrequency.toFixed(1)}, conf=${confidence.toFixed(3)}, rms=${rmsLevel.toFixed(6)}, bufLen=${buffer.length}, sr=${sampleRate}`);
    }
    
    // Accept detections with confidence >= 0.15 (permissive for weak laptop mics)
    if (rawFrequency <= 0 || confidence < 0.15) {
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
    
    // Octave correction using FFT partial analysis
    let correctedFrequency = rawFrequency;
    if (this.config.useOctaveCorrection && fftData) {
      correctedFrequency = correctOctaveError(
        rawFrequency,
        fftData,
        sampleRate,
        this.config.fftSize
      );
    }
    
    // Frequency smoothing (moving median)
    this.lastFrequencies.push(correctedFrequency);
    if (this.lastFrequencies.length > this.SMOOTHING_WINDOW) {
      this.lastFrequencies.shift();
    }
    
    const sortedFreqs = [...this.lastFrequencies].sort((a, b) => a - b);
    const medianFrequency = sortedFreqs[Math.floor(sortedFreqs.length / 2)];
    
    // Find nearest key
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
    
    // Calculate target frequency
    const targetFrequency = this.config.useStretchTuning
      ? getStretchedFrequency(keyIndex, this.config.concertPitch)
      : getEqualTemperamentFrequency(keyIndex, this.config.concertPitch);
    
    const rawCentsDeviation = frequencyToCents(targetFrequency, medianFrequency);
    
    // Apply EMA for stable readings
    const ema = this.applyEMA(medianFrequency, rawCentsDeviation);
    
    // Estimate inharmonicity
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
    
    // Beat detection (if enabled)
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
   * PRIMARY audio processing: AnalyserNode + requestAnimationFrame.
   * This is the most reliable method across all browsers.
   */
  private processAudioFallback = (): void => {
    if (!this.isRunning || !this.analyserNode || !this.callback) {
      return;
    }
    
    // Use a buffer size that matches our config for YIN accuracy
    if (!this.timeBuffer || this.timeBuffer.length !== this.config.bufferSize) {
      this.timeBuffer = new Float32Array(this.config.bufferSize);
    }
    
    // getFloatTimeDomainData fills the buffer with time-domain audio samples
    // The buffer size is limited by analyserNode.fftSize, so we need to ensure
    // our buffer doesn't exceed it
    const readSize = Math.min(this.config.bufferSize, this.analyserNode.fftSize);
    const readBuffer = new Float32Array(readSize);
    this.analyserNode.getFloatTimeDomainData(readBuffer);
    
    // Process the audio data
    this.processBuffer(readBuffer, this.audioContext!.sampleRate);
    
    // Schedule next frame
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
