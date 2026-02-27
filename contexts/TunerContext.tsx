/**
 * TunerContext - Estado global del afinador de pianos (Professional)
 * 
 * Gestiona el estado de la sesión de afinación, incluyendo:
 * - Configuración del afinador (concert pitch, stretch tuning, etc.)
 * - Estado de detección en tiempo real
 * - Historial de mediciones por tecla
 * - Control del motor de audio
 * - Calibración de inharmonicidad individual
 * - Modo unísono (detección de batidos)
 * - Vista activa (tuner, spectrogram, railsback, unison, calibration, toneGen)
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
import type { CalibrationData } from '@/components/tuner/CalibrationPanel';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface KeyMeasurement {
  keyIndex: number;
  centsDeviation: number;
  frequency: number;
  targetFrequency: number;
  inharmonicity: number | null;
  timestamp: number;
}

export type TunerViewMode = 'tuner' | 'guided' | 'spectrogram' | 'railsback' | 'unison' | 'calibration' | 'toneGen' | 'stringQuality' | 'temperament' | 'profiles' | 'micCalibration' | 'report' | 'settings' | 'heatmap' | 'multiString' | 'stability' | 'driftPrediction' | 'shareReport' | 'multiPartial' | 'partialWeighting' | 'auralChecks' | 'overpull' | 'spinner' | 'phaseDisplay' | 'tuningModes';

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
  /** Vista activa del afinador */
  activeView: TunerViewMode;
  /** Modo unísono activo (detección de batidos) */
  unisonMode: boolean;
  /** Datos de calibración del piano */
  calibrationData: CalibrationData | null;
  /** Mostrar espectrograma */
  showSpectrogram: boolean;
  /** Mostrar curva de Railsback */
  showRailsback: boolean;
  /** Feature toggles */
  featureToggles: {
    proximityBeep: boolean;
    stabilityHistogram: boolean;
    heatmap: boolean;
    multiString: boolean;
    driftPrediction: boolean;
    fullscreen: boolean;
  };
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
  | { type: 'SET_ACTIVE_VIEW'; payload: TunerViewMode }
  | { type: 'SET_UNISON_MODE'; payload: boolean }
  | { type: 'SET_CALIBRATION_DATA'; payload: CalibrationData | null }
  | { type: 'SAVE_CALIBRATION_POINT'; payload: { keyIndex: number; inharmonicity: number } }
  | { type: 'SET_SHOW_SPECTROGRAM'; payload: boolean }
  | { type: 'SET_SHOW_RAILSBACK'; payload: boolean }
  | { type: 'SET_FEATURE_TOGGLE'; payload: { feature: keyof TunerState['featureToggles']; enabled: boolean } }
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
  setActiveView: (view: TunerViewMode) => void;
  setUnisonMode: (enabled: boolean) => void;
  saveCalibrationPoint: (keyIndex: number, inharmonicity: number) => void;
  resetCalibration: () => void;
  setShowSpectrogram: (show: boolean) => void;
  setShowRailsback: (show: boolean) => void;
  setFeatureToggle: (feature: keyof TunerState['featureToggles'], enabled: boolean) => void;
}

// ─── Estado inicial ──────────────────────────────────────────────────────────

const initialState: TunerState = {
  isListening: false,
  currentDetection: null,
  selectedKey: -1,
  autoDetect: true,
  concertPitch: DEFAULT_CONCERT_PITCH,
  useStretchTuning: true,
  noiseGateThreshold: 0.0005, // Very low to ensure audio reaches YIN detector
  meterRange: 50,
  showFrequency: true,
  showInharmonicity: true,
  measurements: new Array(TOTAL_KEYS).fill(null),
  audioError: null,
  micPermissionGranted: false,
  activeView: 'tuner',
  unisonMode: false,
  calibrationData: null,
  showSpectrogram: false,
  showRailsback: false,
  featureToggles: {
    proximityBeep: true,
    stabilityHistogram: true,
    heatmap: true,
    multiString: true,
    driftPrediction: true,
    fullscreen: true,
  },
};

// ─── Reducer ────────────────────────────────────────────────────────────────

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
    case 'SET_ACTIVE_VIEW':
      return { ...state, activeView: action.payload };
    case 'SET_UNISON_MODE':
      return { ...state, unisonMode: action.payload };
    case 'SET_CALIBRATION_DATA':
      return { ...state, calibrationData: action.payload };
    case 'SAVE_CALIBRATION_POINT': {
      const existing = state.calibrationData ?? {
        inharmonicityByKey: new Array(TOTAL_KEYS).fill(null),
        timestamp: Date.now(),
        profileName: 'Mi Piano',
        calibratedCount: 0,
      };
      const newInharm = [...existing.inharmonicityByKey];
      newInharm[action.payload.keyIndex] = action.payload.inharmonicity;
      const calibratedCount = newInharm.filter(v => v !== null).length;
      return {
        ...state,
        calibrationData: {
          ...existing,
          inharmonicityByKey: newInharm,
          calibratedCount,
          timestamp: Date.now(),
        },
      };
    }
    case 'SET_SHOW_SPECTROGRAM':
      return { ...state, showSpectrogram: action.payload };
    case 'SET_SHOW_RAILSBACK':
      return { ...state, showRailsback: action.payload };
    case 'SET_FEATURE_TOGGLE':
      return {
        ...state,
        featureToggles: {
          ...state.featureToggles,
          [action.payload.feature]: action.payload.enabled,
        },
      };
    case 'LOAD_SETTINGS': {
      const loaded = { ...state, ...action.payload };
      // Migration: old noiseGateThreshold (0.01) was too high, force update
      if (loaded.noiseGateThreshold >= 0.005) {
        loaded.noiseGateThreshold = 0.0005;
      }
      return loaded;
    }
    default:
      return state;
  }
}

// ─── Contexto ───────────────────────────────────────────────────────────────

const TunerContext = createContext<TunerContextType | undefined>(undefined);

const STORAGE_KEY = 'piano_tuner_settings';
const MEASUREMENTS_KEY = 'piano_tuner_measurements';
const CALIBRATION_KEY = 'piano_tuner_calibration';

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
        const savedCalibration = await AsyncStorage.getItem(CALIBRATION_KEY);
        if (savedCalibration) {
          dispatch({ type: 'SET_CALIBRATION_DATA', payload: JSON.parse(savedCalibration) });
        }
        const savedToggles = await AsyncStorage.getItem('piano_tuner_feature_toggles');
        if (savedToggles) {
          const toggles = JSON.parse(savedToggles);
          Object.entries(toggles).forEach(([feature, enabled]) => {
            dispatch({ type: 'SET_FEATURE_TOGGLE', payload: { feature: feature as any, enabled: enabled as boolean } });
          });
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
      showSpectrogram: state.showSpectrogram,
      showRailsback: state.showRailsback,
      featureToggles: state.featureToggles,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(() => {});
  }, [state.concertPitch, state.useStretchTuning, state.noiseGateThreshold, state.meterRange, state.showFrequency, state.showInharmonicity, state.autoDetect, state.showSpectrogram, state.showRailsback, state.featureToggles]);

  const handleDetection = useCallback((result: PitchDetectionResult) => {
    if (result.frequency > 0 && Math.random() < 0.1) {
      console.log('[TunerContext] Detection: freq=', result.frequency.toFixed(1), 'key=', result.keyIndex, 'cents=', result.centsDeviation.toFixed(1), 'rms=', result.rmsLevel.toFixed(4));
    }
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
      
      // Activar detección de batidos si modo unísono está activo
      engineRef.current.setBeatDetection(state.unisonMode);
      
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
  }, [state.concertPitch, state.useStretchTuning, state.noiseGateThreshold, state.unisonMode, handleDetection]);

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
      (state.currentDetection?.keyIndex ?? 48);
    const newKey = direction === 'next' ? 
      Math.min(current + 1, TOTAL_KEYS - 1) : 
      Math.max(current - 1, 0);
    dispatch({ type: 'SET_SELECTED_KEY', payload: newKey });
    dispatch({ type: 'SET_AUTO_DETECT', payload: false });
  }, [state.selectedKey, state.currentDetection]);

  const setActiveView = useCallback((view: TunerViewMode) => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });
  }, []);

  const setUnisonMode = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_UNISON_MODE', payload: enabled });
    if (engineRef.current) {
      engineRef.current.setBeatDetection(enabled);
    }
  }, []);

  const saveCalibrationPoint = useCallback((keyIndex: number, inharmonicity: number) => {
    dispatch({ type: 'SAVE_CALIBRATION_POINT', payload: { keyIndex, inharmonicity } });
    
    // Persistir calibración
    const existing = state.calibrationData ?? {
      inharmonicityByKey: new Array(TOTAL_KEYS).fill(null),
      timestamp: Date.now(),
      profileName: 'Mi Piano',
      calibratedCount: 0,
    };
    const newInharm = [...existing.inharmonicityByKey];
    newInharm[keyIndex] = inharmonicity;
    const updated = { ...existing, inharmonicityByKey: newInharm, timestamp: Date.now() };
    updated.calibratedCount = newInharm.filter(v => v !== null).length;
    AsyncStorage.setItem(CALIBRATION_KEY, JSON.stringify(updated)).catch(() => {});
  }, [state.calibrationData]);

  const resetCalibration = useCallback(() => {
    dispatch({ type: 'SET_CALIBRATION_DATA', payload: null });
    AsyncStorage.removeItem(CALIBRATION_KEY).catch(() => {});
  }, []);

  const setShowSpectrogram = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_SPECTROGRAM', payload: show });
  }, []);

  const setShowRailsback = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_RAILSBACK', payload: show });
  }, []);

  const setFeatureToggle = useCallback((feature: keyof TunerState['featureToggles'], enabled: boolean) => {
    dispatch({ type: 'SET_FEATURE_TOGGLE', payload: { feature, enabled } });
  }, []);

  // Persist feature toggles
  useEffect(() => {
    AsyncStorage.setItem('piano_tuner_feature_toggles', JSON.stringify(state.featureToggles)).catch(() => {});
  }, [state.featureToggles]);

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
    setActiveView,
    setUnisonMode,
    saveCalibrationPoint,
    resetCalibration,
    setShowSpectrogram,
    setShowRailsback,
    setFeatureToggle,
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
