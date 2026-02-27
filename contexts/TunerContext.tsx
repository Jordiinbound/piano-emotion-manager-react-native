/**
 * TunerContext - Estado global del afinador de pianos
 * 
 * Gestiona el estado de la sesión de afinación, incluyendo:
 * - Configuración del afinador (concert pitch, stretch tuning, etc.)
 * - Estado de detección en tiempo real
 * - Historial de mediciones por tecla
 * - Control del motor de audio
 */

import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  TunerAudioEngine,
  type PitchDetectionResult,
} from '@/services/tuner-audio-engine';
import {
  TOTAL_KEYS,
  DEFAULT_CONCERT_PITCH,
} from '@/constants/piano-tuning';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface KeyMeasurement {
  keyIndex: number;
  centsDeviation: number;
  frequency: number;
  targetFrequency: number;
  inharmonicity: number | null;
  timestamp: number;
}

export interface TunerState {
  /** Motor activo */
  isListening: boolean;
  /** Resultado actual de detección */
  currentDetection: PitchDetectionResult | null;
  /** Tecla seleccionada manualmente (-1 = auto) */
  selectedKey: number;
  /** Modo auto-detect activado */
  autoDetect: boolean;
  /** Frecuencia de referencia A4 */
  concertPitch: number;
  /** Usar stretch tuning */
  useStretchTuning: boolean;
  /** Umbral de ruido */
  noiseGateThreshold: number;
  /** Rango del medidor en cents */
  meterRange: number;
  /** Mostrar frecuencia */
  showFrequency: boolean;
  /** Mostrar inharmonicidad */
  showInharmonicity: boolean;
  /** Mediciones guardadas por tecla */
  measurements: (KeyMeasurement | null)[];
  /** Error del motor de audio */
  audioError: string | null;
  /** Permiso de micrófono concedido */
  micPermissionGranted: boolean;
}

type TunerAction =
  | { type: 'SET_LISTENING'; payload: boolean }
  | { type: 'SET_DETECTION'; payload: PitchDetectionResult | null }
  | { type: 'SET_SELECTED_KEY'; payload: number }
  | { type: 'SET_AUTO_DETECT'; payload: boolean }
  | { type: 'SET_CONCERT_PITCH'; payload: number }
  | { type: 'SET_USE_STRETCH'; payload: boolean }
  | { type: 'SET_NOISE_GATE'; payload: number }
  | { type: 'SET_METER_RANGE'; payload: number }
  | { type: 'SET_SHOW_FREQUENCY'; payload: boolean }
  | { type: 'SET_SHOW_INHARMONICITY'; payload: boolean }
  | { type: 'SAVE_MEASUREMENT'; payload: KeyMeasurement }
  | { type: 'RESET_MEASUREMENTS' }
  | { type: 'SET_AUDIO_ERROR'; payload: string | null }
  | { type: 'SET_MIC_PERMISSION'; payload: boolean }
  | { type: 'LOAD_SETTINGS'; payload: Partial<TunerState> };

interface TunerContextType {
  state: TunerState;
  startListening: () => Promise<void>;
  stopListening: () => void;
  setSelectedKey: (key: number) => void;
  setAutoDetect: (auto: boolean) => void;
  setConcertPitch: (pitch: number) => void;
  setUseStretchTuning: (use: boolean) => void;
  setNoiseGateThreshold: (threshold: number) => void;
  setMeterRange: (range: number) => void;
  setShowFrequency: (show: boolean) => void;
  setShowInharmonicity: (show: boolean) => void;
  saveMeasurement: () => void;
  resetMeasurements: () => void;
  navigateKey: (direction: 'prev' | 'next') => void;
}

// ─── Estado inicial ──────────────────────────────────────────────────────────

const initialState: TunerState = {
  isListening: false,
  currentDetection: null,
  selectedKey: -1,
  autoDetect: true,
  concertPitch: DEFAULT_CONCERT_PITCH,
  useStretchTuning: true,
  noiseGateThreshold: 0.01,
  meterRange: 50,
  showFrequency: true,
  showInharmonicity: true,
  measurements: new Array(TOTAL_KEYS).fill(null),
  audioError: null,
  micPermissionGranted: false,
};

// ─── Reducer ─────────────────────────────────────────────────────────────────

function tunerReducer(state: TunerState, action: TunerAction): TunerState {
  switch (action.type) {
    case 'SET_LISTENING':
      return { ...state, isListening: action.payload };
    case 'SET_DETECTION':
      return { ...state, currentDetection: action.payload };
    case 'SET_SELECTED_KEY':
      return { ...state, selectedKey: action.payload };
    case 'SET_AUTO_DETECT':
      return { ...state, autoDetect: action.payload };
    case 'SET_CONCERT_PITCH':
      return { ...state, concertPitch: action.payload };
    case 'SET_USE_STRETCH':
      return { ...state, useStretchTuning: action.payload };
    case 'SET_NOISE_GATE':
      return { ...state, noiseGateThreshold: action.payload };
    case 'SET_METER_RANGE':
      return { ...state, meterRange: action.payload };
    case 'SET_SHOW_FREQUENCY':
      return { ...state, showFrequency: action.payload };
    case 'SET_SHOW_INHARMONICITY':
      return { ...state, showInharmonicity: action.payload };
    case 'SAVE_MEASUREMENT': {
      const newMeasurements = [...state.measurements];
      newMeasurements[action.payload.keyIndex] = action.payload;
      return { ...state, measurements: newMeasurements };
    }
    case 'RESET_MEASUREMENTS':
      return { ...state, measurements: new Array(TOTAL_KEYS).fill(null) };
    case 'SET_AUDIO_ERROR':
      return { ...state, audioError: action.payload };
    case 'SET_MIC_PERMISSION':
      return { ...state, micPermissionGranted: action.payload };
    case 'LOAD_SETTINGS':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// ─── Contexto ────────────────────────────────────────────────────────────────

const TunerContext = createContext<TunerContextType | undefined>(undefined);

const STORAGE_KEY = 'piano_tuner_settings';
const MEASUREMENTS_KEY = 'piano_tuner_measurements';

export function TunerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tunerReducer, initialState);
  const engineRef = useRef<TunerAudioEngine | null>(null);

  // Cargar configuración guardada
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const settings = JSON.parse(saved);
          dispatch({ type: 'LOAD_SETTINGS', payload: settings });
        }
        const savedMeasurements = await AsyncStorage.getItem(MEASUREMENTS_KEY);
        if (savedMeasurements) {
          dispatch({ type: 'LOAD_SETTINGS', payload: { measurements: JSON.parse(savedMeasurements) } });
        }
      } catch {}
    })();
  }, []);

  // Guardar configuración cuando cambie
  useEffect(() => {
    const settings = {
      concertPitch: state.concertPitch,
      useStretchTuning: state.useStretchTuning,
      noiseGateThreshold: state.noiseGateThreshold,
      meterRange: state.meterRange,
      showFrequency: state.showFrequency,
      showInharmonicity: state.showInharmonicity,
      autoDetect: state.autoDetect,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(() => {});
  }, [state.concertPitch, state.useStretchTuning, state.noiseGateThreshold, state.meterRange, state.showFrequency, state.showInharmonicity, state.autoDetect]);

  const handleDetection = useCallback((result: PitchDetectionResult) => {
    dispatch({ type: 'SET_DETECTION', payload: result });
  }, []);

  const startListening = useCallback(async () => {
    if (Platform.OS !== 'web') {
      dispatch({ type: 'SET_AUDIO_ERROR', payload: 'El afinador requiere un navegador web con acceso al micrófono.' });
      return;
    }
    
    try {
      dispatch({ type: 'SET_AUDIO_ERROR', payload: null });
      
      if (!engineRef.current) {
        engineRef.current = new TunerAudioEngine({
          concertPitch: state.concertPitch,
          useStretchTuning: state.useStretchTuning,
          noiseGateThreshold: state.noiseGateThreshold,
        });
      } else {
        engineRef.current.updateConfig({
          concertPitch: state.concertPitch,
          useStretchTuning: state.useStretchTuning,
          noiseGateThreshold: state.noiseGateThreshold,
        });
      }
      
      await engineRef.current.start(handleDetection);
      dispatch({ type: 'SET_LISTENING', payload: true });
      dispatch({ type: 'SET_MIC_PERMISSION', payload: true });
    } catch (error: any) {
      let errorMsg = 'Error al acceder al micrófono.';
      if (error?.name === 'NotAllowedError') {
        errorMsg = 'Permiso de micrófono denegado. Activa el micrófono en la configuración del navegador.';
      } else if (error?.name === 'NotFoundError') {
        errorMsg = 'No se encontró un micrófono. Conecta un micrófono e inténtalo de nuevo.';
      }
      dispatch({ type: 'SET_AUDIO_ERROR', payload: errorMsg });
      dispatch({ type: 'SET_LISTENING', payload: false });
    }
  }, [state.concertPitch, state.useStretchTuning, state.noiseGateThreshold, handleDetection]);

  const stopListening = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
    }
    dispatch({ type: 'SET_LISTENING', payload: false });
    dispatch({ type: 'SET_DETECTION', payload: null });
  }, []);

  const setSelectedKey = useCallback((key: number) => {
    dispatch({ type: 'SET_SELECTED_KEY', payload: key });
  }, []);

  const setAutoDetect = useCallback((auto: boolean) => {
    dispatch({ type: 'SET_AUTO_DETECT', payload: auto });
    if (auto) dispatch({ type: 'SET_SELECTED_KEY', payload: -1 });
  }, []);

  const setConcertPitch = useCallback((pitch: number) => {
    dispatch({ type: 'SET_CONCERT_PITCH', payload: pitch });
    if (engineRef.current) {
      engineRef.current.updateConfig({ concertPitch: pitch });
    }
  }, []);

  const setUseStretchTuning = useCallback((use: boolean) => {
    dispatch({ type: 'SET_USE_STRETCH', payload: use });
    if (engineRef.current) {
      engineRef.current.updateConfig({ useStretchTuning: use });
    }
  }, []);

  const setNoiseGateThreshold = useCallback((threshold: number) => {
    dispatch({ type: 'SET_NOISE_GATE', payload: threshold });
    if (engineRef.current) {
      engineRef.current.updateConfig({ noiseGateThreshold: threshold });
    }
  }, []);

  const setMeterRange = useCallback((range: number) => {
    dispatch({ type: 'SET_METER_RANGE', payload: range });
  }, []);

  const setShowFrequency = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_FREQUENCY', payload: show });
  }, []);

  const setShowInharmonicity = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_INHARMONICITY', payload: show });
  }, []);

  const saveMeasurement = useCallback(() => {
    const det = state.currentDetection;
    if (!det || det.keyIndex < 0) return;
    
    const measurement: KeyMeasurement = {
      keyIndex: det.keyIndex,
      centsDeviation: det.centsDeviation,
      frequency: det.frequency,
      targetFrequency: det.targetFrequency,
      inharmonicity: det.inharmonicity,
      timestamp: Date.now(),
    };
    
    dispatch({ type: 'SAVE_MEASUREMENT', payload: measurement });
    
    // Persistir mediciones
    const newMeasurements = [...state.measurements];
    newMeasurements[det.keyIndex] = measurement;
    AsyncStorage.setItem(MEASUREMENTS_KEY, JSON.stringify(newMeasurements)).catch(() => {});
  }, [state.currentDetection, state.measurements]);

  const resetMeasurements = useCallback(() => {
    dispatch({ type: 'RESET_MEASUREMENTS' });
    AsyncStorage.removeItem(MEASUREMENTS_KEY).catch(() => {});
  }, []);

  const navigateKey = useCallback((direction: 'prev' | 'next') => {
    const current = state.selectedKey >= 0 ? state.selectedKey : 
      (state.currentDetection?.keyIndex ?? 48); // Default to A4
    const newKey = direction === 'next' ? 
      Math.min(current + 1, TOTAL_KEYS - 1) : 
      Math.max(current - 1, 0);
    dispatch({ type: 'SET_SELECTED_KEY', payload: newKey });
    dispatch({ type: 'SET_AUTO_DETECT', payload: false });
  }, [state.selectedKey, state.currentDetection]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
    };
  }, []);

  const value: TunerContextType = {
    state,
    startListening,
    stopListening,
    setSelectedKey,
    setAutoDetect,
    setConcertPitch,
    setUseStretchTuning,
    setNoiseGateThreshold,
    setMeterRange,
    setShowFrequency,
    setShowInharmonicity,
    saveMeasurement,
    resetMeasurements,
    navigateKey,
  };

  return (
    <TunerContext.Provider value={value}>
      {children}
    </TunerContext.Provider>
  );
}

export function useTuner() {
  const context = useContext(TunerContext);
  if (!context) {
    throw new Error('useTuner must be used within a TunerProvider');
  }
  return context;
}
