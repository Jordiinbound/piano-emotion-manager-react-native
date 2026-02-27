/**
 * Piano Tuning Constants
 * 
 * Constantes para afinación de pianos acústicos.
 * Incluye las 88 teclas estándar, frecuencias de temperamento igual,
 * coeficientes de inharmonicidad esperados, y curva de stretch (Railsback).
 * 
 * Basado en algoritmos del Entropy Piano Tuner (GPL3) y literatura científica:
 * - Hinrichsen, H. (2012). Entropy-based tuning of musical instruments. arXiv:1203.5101
 * - Young, R.W. (1952). Inharmonicity of Plain Wire Piano Strings. JASA 24(3)
 */

// ─── Nota y frecuencia ───────────────────────────────────────────────────────

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export const TOTAL_KEYS = 88;
export const KEY_A4_INDEX = 48; // A4 es la tecla 49 (índice 48)
export const DEFAULT_CONCERT_PITCH = 440;
export const MIN_CONCERT_PITCH = 415;
export const MAX_CONCERT_PITCH = 466;

/**
 * Calcula la frecuencia de temperamento igual para una tecla dada.
 * @param keyIndex - Índice de la tecla (0 = A0, 48 = A4, 87 = C8)
 * @param concertPitch - Frecuencia de referencia para A4 (default 440 Hz)
 */
export function getEqualTemperamentFrequency(keyIndex: number, concertPitch: number = DEFAULT_CONCERT_PITCH): number {
  return concertPitch * Math.pow(2, (keyIndex - KEY_A4_INDEX) / 12);
}

/**
 * Obtiene el nombre de la nota para un índice de tecla.
 * El piano empieza en A0 (índice 0) y termina en C8 (índice 87).
 */
export function getNoteName(keyIndex: number): string {
  // A0 = índice 0, así que el offset MIDI es keyIndex + 21
  const midiNote = keyIndex + 21;
  const noteIndex = midiNote % 12;
  // Mapeo: C=0, C#=1, D=2, ... B=11
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return noteNames[noteIndex];
}

/**
 * Obtiene la octava para un índice de tecla.
 */
export function getOctave(keyIndex: number): number {
  const midiNote = keyIndex + 21;
  return Math.floor(midiNote / 12) - 1;
}

/**
 * Obtiene el nombre completo de la nota (ej: "A4", "C#3").
 */
export function getFullNoteName(keyIndex: number): string {
  return `${getNoteName(keyIndex)}${getOctave(keyIndex)}`;
}

/**
 * Determina si una tecla es negra (sostenido/bemol).
 */
export function isBlackKey(keyIndex: number): boolean {
  const name = getNoteName(keyIndex);
  return name.includes('#');
}

// ─── Inharmonicidad ──────────────────────────────────────────────────────────

/**
 * Estimación heurística del coeficiente de inharmonicidad B esperado.
 * Basado en la fórmula del Entropy Piano Tuner (fftanalyzer.cpp):
 *   B = exp(-15.45 + 1.354 * ln(f))  para f > 100 Hz
 *   B = 0.000099575                    para f <= 100 Hz
 * 
 * @param frequency - Frecuencia fundamental en Hz
 * @returns Coeficiente de inharmonicidad B (adimensional)
 */
export function getExpectedInharmonicity(frequency: number): number {
  if (frequency > 100) {
    return Math.exp(-15.45 + 1.354 * Math.log(frequency));
  }
  return 0.000099575;
}

/**
 * Calcula la frecuencia del parcial n-ésimo con inharmonicidad.
 * Fórmula: fn = n * f1 * sqrt((1 + B*n²) / (1 + B))
 * 
 * @param f1 - Frecuencia fundamental
 * @param n - Número del parcial (1 = fundamental)
 * @param B - Coeficiente de inharmonicidad
 */
export function getInharmonicPartialFrequency(f1: number, n: number, B: number): number {
  return n * f1 * Math.sqrt((1 + B * n * n) / (1 + B));
}

/**
 * Calcula la desviación en cents debida a la inharmonicidad para el parcial n.
 * cents(key, n) = 600/ln2 * ln((1 + n²*B) / (1 + B))
 * 
 * @param B - Coeficiente de inharmonicidad
 * @param n - Número del parcial
 */
export function getInharmonicityStretchCents(B: number, n: number): number {
  return (600 / Math.LN2) * Math.log((1 + n * n * B) / (1 + B));
}

// ─── Curva de Stretch (Railsback) ────────────────────────────────────────────

/**
 * Polinomio de stretch promedio del EPT.
 * Proporciona la desviación esperada en cents respecto al temperamento igual.
 * 
 * c = 0.000019394 + 0.079694594*d - 0.003718646*d² + 0.000450934*d³ + 0.000003724*d⁴
 * donde d = distancia en teclas desde A4
 * 
 * @param keyIndex - Índice de la tecla
 */
export function getAverageStretchCents(keyIndex: number): number {
  const d = keyIndex - KEY_A4_INDEX;
  return 0.000019394 + 0.079694594 * d - 0.003718646 * d * d + 
         0.000450934 * d * d * d + 0.000003724 * d * d * d * d;
}

/**
 * Calcula la frecuencia objetivo con stretch tuning aplicado.
 * Usa la curva de stretch promedio para pianos genéricos.
 * 
 * @param keyIndex - Índice de la tecla
 * @param concertPitch - Frecuencia de referencia para A4
 */
export function getStretchedFrequency(keyIndex: number, concertPitch: number = DEFAULT_CONCERT_PITCH): number {
  const d = keyIndex - KEY_A4_INDEX;
  const stretchCents = getAverageStretchCents(keyIndex);
  return Math.pow(2, d / 12 + stretchCents / 1200) * concertPitch;
}

// ─── Conversiones de frecuencia/cents ────────────────────────────────────────

/**
 * Convierte la diferencia entre dos frecuencias a cents.
 * cents = 1200 * log2(f2/f1)
 */
export function frequencyToCents(f1: number, f2: number): number {
  if (f1 <= 0 || f2 <= 0) return 0;
  return 1200 * Math.log2(f2 / f1);
}

/**
 * Aplica una desviación en cents a una frecuencia.
 */
export function centsToFrequency(baseFrequency: number, cents: number): number {
  return baseFrequency * Math.pow(2, cents / 1200);
}

/**
 * Encuentra la tecla más cercana a una frecuencia dada.
 * Usa el polinomio de stretch promedio para mejor precisión.
 * Basado en FFTAnalyzer::findNearestKey del EPT.
 * 
 * @param frequency - Frecuencia en Hz
 * @param concertPitch - Frecuencia de referencia para A4
 * @returns Índice de la tecla más cercana, o -1 si fuera de rango
 */
export function findNearestKey(frequency: number, concertPitch: number = DEFAULT_CONCERT_PITCH): number {
  if (frequency <= 0) return -1;
  
  // Distancia aproximada en teclas desde A4
  const d = 17.3123 * Math.log(frequency / concertPitch);
  // Polinomio de stretch promedio (desviación esperada en cents)
  const c = 0.000019394 + 0.079694594 * d - 0.003718646 * d * d + 
            0.000450934 * d * d * d + 0.000003724 * d * d * d * d;
  const k = Math.round(KEY_A4_INDEX + d - c / 100);
  
  return (k >= 0 && k < TOTAL_KEYS) ? k : -1;
}

// ─── Generación de tabla de teclas ───────────────────────────────────────────

export interface PianoKeyInfo {
  index: number;
  noteName: string;
  fullName: string;
  octave: number;
  isBlack: boolean;
  equalTemperamentFrequency: number;
  stretchedFrequency: number;
  expectedInharmonicity: number;
}

/**
 * Genera la tabla completa de las 88 teclas del piano.
 */
export function generateKeyTable(concertPitch: number = DEFAULT_CONCERT_PITCH): PianoKeyInfo[] {
  const keys: PianoKeyInfo[] = [];
  for (let i = 0; i < TOTAL_KEYS; i++) {
    const etFreq = getEqualTemperamentFrequency(i, concertPitch);
    keys.push({
      index: i,
      noteName: getNoteName(i),
      fullName: getFullNoteName(i),
      octave: getOctave(i),
      isBlack: isBlackKey(i),
      equalTemperamentFrequency: etFreq,
      stretchedFrequency: getStretchedFrequency(i, concertPitch),
      expectedInharmonicity: getExpectedInharmonicity(etFreq),
    });
  }
  return keys;
}

// ─── Umbrales de afinación ───────────────────────────────────────────────────

export const TUNING_THRESHOLDS = {
  /** Dentro de ±2 cents = afinado (verde) */
  IN_TUNE: 2,
  /** Dentro de ±10 cents = cerca (amarillo) */
  CLOSE: 10,
  /** Más de ±10 cents = desafinado (rojo) */
  OUT_OF_TUNE: 10,
} as const;

/**
 * Determina el estado de afinación basado en la desviación en cents.
 */
export function getTuningStatus(centsDeviation: number): 'in_tune' | 'close' | 'out_of_tune' {
  const abs = Math.abs(centsDeviation);
  if (abs <= TUNING_THRESHOLDS.IN_TUNE) return 'in_tune';
  if (abs <= TUNING_THRESHOLDS.CLOSE) return 'close';
  return 'out_of_tune';
}

/**
 * Devuelve el color correspondiente al estado de afinación.
 */
export function getTuningColor(centsDeviation: number): string {
  const status = getTuningStatus(centsDeviation);
  switch (status) {
    case 'in_tune': return '#10B981';    // Verde
    case 'close': return '#F59E0B';       // Ámbar
    case 'out_of_tune': return '#EF4444'; // Rojo
  }
}
