/**
 * Temperamentos Históricos para Piano
 * 
 * Define los temperamentos musicales más importantes de la historia,
 * cada uno expresado como desviaciones en cents respecto al temperamento igual
 * para las 12 notas de la escala cromática (C, C#, D, D#, E, F, F#, G, G#, A, A#, B).
 * 
 * Referencia: A = 0 cents (todas las desviaciones son relativas a A del temperamento igual)
 * 
 * Fuentes:
 * - Jorgensen, O. (1991). Tuning. Michigan State University Press.
 * - Barbour, J.M. (2004). Tuning and Temperament: A Historical Survey. Dover.
 * - Kellner, H.A. (1979). Eine Rekonstruktion der wohltemperierten Stimmung von J.S. Bach.
 */

export interface Temperament {
  /** Identificador único */
  id: string;
  /** Nombre del temperamento */
  name: string;
  /** Nombre corto para UI */
  shortName: string;
  /** Descripción */
  description: string;
  /** Período histórico */
  period: string;
  /** Año aproximado */
  year: number;
  /** Desviaciones en cents para cada nota cromática relativas a temperamento igual.
   *  Orden: C, C#, D, D#, E, F, F#, G, G#, A, A#, B
   *  A (índice 9) siempre es 0.
   */
  centsFromEqual: number[];
  /** Notas sobre el uso recomendado */
  usage: string;
}

/**
 * Temperamento Igual (12-TET)
 * Todas las desviaciones son 0.
 */
const EQUAL: Temperament = {
  id: 'equal',
  name: 'Temperamento Igual (12-TET)',
  shortName: 'Igual',
  description: 'Divide la octava en 12 semitonos iguales de 100 cents cada uno. Es el estándar moderno universal.',
  period: 'Moderno',
  year: 1917,
  centsFromEqual: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  usage: 'Estándar moderno. Adecuado para todo repertorio contemporáneo y la mayoría de música clásica.',
};

/**
 * Werckmeister III (1691)
 * El más popular de los temperamentos de Werckmeister.
 * Cuatro quintas reducidas (C-G, G-D, D-A, B-F#) en 1/4 de comma pitagórica.
 */
const WERCKMEISTER_III: Temperament = {
  id: 'werckmeister3',
  name: 'Werckmeister III',
  shortName: 'Werck. III',
  description: 'Temperamento "bien temperado" de Andreas Werckmeister (1691). Cuatro quintas estrechas distribuidas asimétricamente. Las tonalidades cercanas a Do mayor suenan más puras.',
  period: 'Barroco tardío',
  year: 1691,
  // Desviaciones en cents desde temperamento igual
  // C, C#, D, D#, E, F, F#, G, G#, A, A#, B
  centsFromEqual: [
    +10.26,  // C
    -0.06,   // C#
    +3.91,   // D
    +1.95,   // D#
    -1.96,   // E
    +11.73,  // F
    +1.95,   // F#
    +7.82,   // G
    -2.00,   // G#
    0,       // A
    +3.91,   // A#
    -3.91,   // B
  ],
  usage: 'Bach, Buxtehude, música barroca alemana. Especialmente adecuado para El Clave Bien Temperado.',
};

/**
 * Kirnberger III (1779)
 * Cuatro quintas reducidas, una de ellas por 1/4 de comma sintónica.
 */
const KIRNBERGER_III: Temperament = {
  id: 'kirnberger3',
  name: 'Kirnberger III',
  shortName: 'Kirnb. III',
  description: 'Temperamento de Johann Philipp Kirnberger (1779), alumno de Bach. Combina quintas puras con quintas temperadas. Do mayor tiene tercera mayor pura.',
  period: 'Clásico temprano',
  year: 1779,
  centsFromEqual: [
    +10.25,  // C
    -0.68,   // C#
    +3.42,   // D
    +2.39,   // D#
    -3.42,   // E
    +10.93,  // F
    +0.34,   // F#
    +7.17,   // G
    -1.02,   // G#
    0,        // A
    +3.91,   // A#
    -2.39,   // B
  ],
  usage: 'Mozart, Haydn, música clásica temprana. Excelente para tonalidades con pocos sostenidos/bemoles.',
};

/**
 * Vallotti (c. 1754)
 * Seis quintas reducidas en 1/6 de comma pitagórica, distribuidas simétricamente.
 */
const VALLOTTI: Temperament = {
  id: 'vallotti',
  name: 'Vallotti',
  shortName: 'Vallotti',
  description: 'Temperamento de Francesco Antonio Vallotti (c. 1754). Seis quintas estrechas distribuidas simétricamente. Compromiso elegante entre pureza y versatilidad.',
  period: 'Barroco tardío / Clásico',
  year: 1754,
  centsFromEqual: [
    +5.87,   // C
    -3.91,   // C#
    +1.96,   // D
    +0.00,   // D#
    -1.96,   // E
    +7.82,   // F
    -1.96,   // F#
    +3.91,   // G
    -1.96,   // G#
    0,        // A
    +1.96,   // A#
    -3.91,   // B
  ],
  usage: 'Vivaldi, Scarlatti, música barroca italiana. Popular entre afinadores de clavecín.',
};

/**
 * Young II (1800)
 * Thomas Young. Similar a Vallotti pero con distribución ligeramente diferente.
 */
const YOUNG_II: Temperament = {
  id: 'young2',
  name: 'Young II',
  shortName: 'Young II',
  description: 'Temperamento de Thomas Young (1800). Similar a Vallotti con ajustes sutiles. Considerado uno de los temperamentos circulares más equilibrados.',
  period: 'Clásico / Romántico temprano',
  year: 1800,
  centsFromEqual: [
    +6.04,   // C
    -2.09,   // C#
    +2.09,   // D
    -0.06,   // D#
    -2.09,   // E
    +8.00,   // F
    -0.06,   // F#
    +4.00,   // G
    -0.06,   // G#
    0,        // A
    +2.09,   // A#
    -4.00,   // B
  ],
  usage: 'Beethoven temprano, Schubert. Buen compromiso para repertorio clásico-romántico.',
};

/**
 * Meantone 1/4 comma (c. 1523)
 * El temperamento mesotónico más común. Terceras mayores puras.
 * NOTA: No es circular — tiene una "quinta del lobo" (G#-D#).
 */
const MEANTONE_QUARTER: Temperament = {
  id: 'meantone_quarter',
  name: 'Mesotónico 1/4 comma',
  shortName: 'Mesotón.',
  description: 'Temperamento mesotónico de 1/4 de comma (c. 1523). Produce terceras mayores puras pero tiene una "quinta del lobo" inutilizable (G#-Eb). Solo funciona en tonalidades con pocos accidentales.',
  period: 'Renacimiento / Barroco temprano',
  year: 1523,
  centsFromEqual: [
    +10.26,  // C
    -13.69,  // C#
    +3.42,   // D
    +17.11,  // D#
    -3.42,   // E
    +13.69,  // F
    -10.26,  // F#
    +6.85,   // G
    -17.11,  // G#
    0,        // A
    +10.26,  // A#
    -6.85,   // B
  ],
  usage: 'Música renacentista, Frescobaldi, Sweelinck. Solo para tonalidades con 0-2 sostenidos/bemoles. Evitar Ab mayor, E mayor, B mayor.',
};

/**
 * Pythagorean (antiguo)
 * Basado en quintas puras (3:2). Terceras mayores muy amplias.
 */
const PYTHAGOREAN: Temperament = {
  id: 'pythagorean',
  name: 'Pitagórico',
  shortName: 'Pitag.',
  description: 'Afinación basada en quintas puras (ratio 3:2). Las terceras mayores son muy amplias (408 cents vs 386 puros). Tiene una "quinta del lobo" en G#-Eb.',
  period: 'Medieval / Antiguo',
  year: -500,
  centsFromEqual: [
    -5.87,   // C
    +7.82,   // C#
    -1.96,   // D
    +5.87,   // D#
    +3.91,   // E
    -7.82,   // F
    +5.87,   // F#
    -3.91,   // G
    +9.78,   // G#
    0,        // A
    -3.91,   // A#
    +1.96,   // B
  ],
  usage: 'Música medieval, canto gregoriano. Interés histórico y educativo.',
};

/**
 * Kellner (1975)
 * Reconstrucción de Herbert Anton Kellner del temperamento de Bach.
 * Cinco quintas reducidas en 1/5 de comma pitagórica.
 */
const KELLNER: Temperament = {
  id: 'kellner',
  name: 'Kellner (Bach)',
  shortName: 'Kellner',
  description: 'Reconstrucción de H.A. Kellner (1975) del temperamento que Bach habría usado. Cinco quintas estrechas en 1/5 de comma pitagórica.',
  period: 'Barroco (reconstrucción)',
  year: 1975,
  centsFromEqual: [
    +8.21,   // C
    -1.17,   // C#
    +3.13,   // D
    +1.56,   // D#
    -1.56,   // E
    +9.78,   // F
    +0.39,   // F#
    +5.87,   // G
    -0.39,   // G#
    0,        // A
    +3.13,   // A#
    -3.13,   // B
  ],
  usage: 'Bach (El Clave Bien Temperado, Partitas, Suites). Alternativa popular a Werckmeister III.',
};

// ─── Exportaciones ──────────────────────────────────────────────────────────

export const TEMPERAMENTS: Temperament[] = [
  EQUAL,
  WERCKMEISTER_III,
  KIRNBERGER_III,
  VALLOTTI,
  YOUNG_II,
  MEANTONE_QUARTER,
  PYTHAGOREAN,
  KELLNER,
];

export const TEMPERAMENT_MAP: Record<string, Temperament> = Object.fromEntries(
  TEMPERAMENTS.map(t => [t.id, t])
);

/**
 * Calcula la frecuencia objetivo para una tecla en un temperamento dado.
 * 
 * @param keyIndex - Índice de la tecla (0-87)
 * @param temperamentId - ID del temperamento
 * @param concertPitch - Frecuencia de referencia A4
 * @returns Frecuencia en Hz
 */
export function getTemperamentFrequency(
  keyIndex: number,
  temperamentId: string,
  concertPitch: number = 440
): number {
  const temperament = TEMPERAMENT_MAP[temperamentId];
  if (!temperament || temperamentId === 'equal') {
    // Temperamento igual estándar
    return concertPitch * Math.pow(2, (keyIndex - 48) / 12);
  }
  
  // Obtener la nota cromática (0-11, donde 0=C)
  const midiNote = keyIndex + 21;
  const noteIndex = midiNote % 12;
  
  // Desviación en cents para esta nota
  const centsOffset = temperament.centsFromEqual[noteIndex];
  
  // Frecuencia de temperamento igual + desviación del temperamento
  const equalFreq = concertPitch * Math.pow(2, (keyIndex - 48) / 12);
  return equalFreq * Math.pow(2, centsOffset / 1200);
}

/**
 * Calcula la desviación en cents de un temperamento para una nota cromática.
 * 
 * @param noteIndex - Índice de la nota cromática (0=C, 9=A)
 * @param temperamentId - ID del temperamento
 */
export function getTemperamentCentsOffset(noteIndex: number, temperamentId: string): number {
  const temperament = TEMPERAMENT_MAP[temperamentId];
  if (!temperament) return 0;
  return temperament.centsFromEqual[noteIndex % 12];
}
