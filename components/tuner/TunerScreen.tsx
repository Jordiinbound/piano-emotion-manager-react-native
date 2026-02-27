/**
 * TunerScreen - Pantalla principal del afinador de pianos (Professional v3)
 * 
 * Menú responsive con categorías y grid adaptativo.
 * En móvil: grid compacto 3-4 columnas con iconos.
 * En tablet/desktop: grid más amplio con labels.
 */

import React, { useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, useWindowDimensions, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Shadows } from '@/constants/theme';
import { useTuner, TunerProvider } from '@/contexts/TunerContext';
import type { TunerViewMode } from '@/contexts/TunerContext';
import { CentsGauge } from './CentsGauge';
import { DeviationBar } from './DeviationBar';
import { MiniPianoStrip } from './MiniPianoStrip';
import { TunerSettings } from './TunerSettings';
import { Spectrogram } from './Spectrogram';
import { RailsbackChart } from './RailsbackChart';
import { UnisonMeter } from './UnisonMeter';
import { CalibrationPanel } from './CalibrationPanel';
import { ToneGeneratorPanel } from './ToneGeneratorPanel';
import { GuidedTuning } from './GuidedTuning';
import { TemperamentSelector } from './TemperamentSelector';
import { PianoProfileManager } from './PianoProfileManager';
import { StringQualityAnalyzer } from './StringQualityAnalyzer';
import { MicCalibration } from './MicCalibration';
import { TuningReportGenerator } from './TuningReportGenerator';
import { VUMeter } from './VUMeter';
import { AnimatedCentsGauge } from './AnimatedCentsGauge';
import { TunerTutorial } from './TunerTutorial';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getFullNoteName,
  getNoteName,
  getOctave,
  getEqualTemperamentFrequency,
  getStretchedFrequency,
  TOTAL_KEYS,
} from '@/constants/piano-tuning';
import { Ionicons } from '@expo/vector-icons';

// ─── Colores del afinador ────────────────────────────────────────────────────

const TUNER_COLORS = {
  primary: '#003a8c',
  accent: '#e07a5f',
  inTune: '#10B981',
  close: '#F59E0B',
  outOfTune: '#EF4444',
};

// ─── Categorías y herramientas del menú ────────────────────────────────────

interface ToolItem {
  id: TunerViewMode;
  label: string;
  icon: string;
  description: string;
}

interface ToolCategory {
  id: string;
  title: string;
  icon: string;
  tools: ToolItem[];
}

const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'tuning',
    title: 'Afinación',
    icon: 'radio',
    tools: [
      { id: 'tuner', label: 'Afinador', icon: 'radio-outline', description: 'Medidor de afinación en tiempo real' },
      { id: 'guided', label: 'Guiada', icon: 'navigate-outline', description: 'Asistente paso a paso' },
      { id: 'toneGen', label: 'Tono Ref.', icon: 'volume-high-outline', description: 'Generador de tonos' },
      { id: 'temperament', label: 'Temperamento', icon: 'musical-notes-outline', description: 'Temperamentos históricos' },
    ],
  },
  {
    id: 'analysis',
    title: 'Análisis',
    icon: 'analytics',
    tools: [
      { id: 'spectrogram', label: 'Espectro', icon: 'pulse-outline', description: 'Espectrograma FFT' },
      { id: 'railsback', label: 'Railsback', icon: 'analytics-outline', description: 'Curva de afinación' },
      { id: 'unison', label: 'Unísono', icon: 'git-compare-outline', description: 'Detección de batidos' },
      { id: 'stringQuality', label: 'Cuerdas', icon: 'search-outline', description: 'Calidad de cuerdas' },
    ],
  },
  {
    id: 'config',
    title: 'Configuración',
    icon: 'construct',
    tools: [
      { id: 'calibration', label: 'Calibrar', icon: 'construct-outline', description: 'Inharmonicidad individual' },
      { id: 'micCalibration', label: 'Micrófono', icon: 'mic-outline', description: 'Calibrar latencia' },
      { id: 'profiles', label: 'Pianos', icon: 'albums-outline', description: 'Perfiles e historial' },
      { id: 'report', label: 'Informe', icon: 'document-text-outline', description: 'Generar PDF' },
    ],
  },
];

// Flat list for quick lookup
const ALL_TOOLS = TOOL_CATEGORIES.flatMap(c => c.tools);

// ─── Componente de menú responsive ──────────────────────────────────────────

function ToolMenu({
  activeView,
  onSelect,
  onSettings,
  width,
}: {
  activeView: TunerViewMode;
  onSelect: (id: TunerViewMode) => void;
  onSettings: () => void;
  width: number;
}) {
  const surface = useThemeColor({}, 'surface');
  const cardBg = useThemeColor({}, 'cardBackground');
  const border = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const background = useThemeColor({}, 'background');

  // Responsive: determine layout
  const isCompact = width < 480;
  const isMedium = width >= 480 && width < 768;
  const isWide = width >= 768;
  const columns = isCompact ? 4 : isMedium ? 4 : 6;
  const showDescriptions = isWide;
  const iconSize = isCompact ? 20 : 22;
  const tileWidth = isCompact
    ? (width - 48) / 4
    : isMedium
      ? (width - 56) / 4
      : (width - 80) / 6;

  // Active tool info
  const activeTool = ALL_TOOLS.find(t => t.id === activeView);

  return (
    <View style={[menuStyles.container, { borderBottomColor: border }]}>
      {/* Active tool indicator */}
      <View style={[menuStyles.activeIndicator, { backgroundColor: TUNER_COLORS.primary + '0D' }]}>
        <Ionicons
          name={(activeTool?.icon ?? 'radio-outline') as any}
          size={16}
          color={TUNER_COLORS.primary}
        />
        <ThemedText style={[menuStyles.activeLabel, { color: TUNER_COLORS.primary }]}>
          {activeTool?.label ?? 'Afinador'}
        </ThemedText>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={onSettings}
          style={({ pressed }) => [
            menuStyles.settingsBtn,
            { backgroundColor: surface, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="settings-outline" size={16} color={textSecondary} />
        </Pressable>
      </View>

      {/* Categories with tools */}
      <ScrollView
        horizontal={isCompact || isMedium}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          (isCompact || isMedium)
            ? menuStyles.horizontalScroll
            : menuStyles.verticalGrid
        }
      >
        {TOOL_CATEGORIES.map(category => (
          <View
            key={category.id}
            style={[
              menuStyles.categoryBlock,
              (isCompact || isMedium) && menuStyles.categoryBlockHorizontal,
            ]}
          >
            <ThemedText style={[menuStyles.categoryTitle, { color: textSecondary }]}>
              {category.title}
            </ThemedText>
            <View style={[
              menuStyles.toolsRow,
              isWide && { flexWrap: 'wrap' },
            ]}>
              {category.tools.map(tool => {
                const isActive = activeView === tool.id;
                return (
                  <Pressable
                    key={tool.id}
                    onPress={() => onSelect(tool.id)}
                    style={({ pressed }) => [
                      menuStyles.toolTile,
                      {
                        width: isCompact ? 64 : isMedium ? 72 : 100,
                        backgroundColor: isActive ? TUNER_COLORS.primary + '15' : surface,
                        borderColor: isActive ? TUNER_COLORS.primary : 'transparent',
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name={tool.icon as any}
                      size={iconSize}
                      color={isActive ? TUNER_COLORS.primary : textSecondary}
                    />
                    <ThemedText
                      style={[
                        menuStyles.toolLabel,
                        { color: isActive ? TUNER_COLORS.primary : textColor },
                        isCompact && { fontSize: 9 },
                      ]}
                      numberOfLines={1}
                    >
                      {tool.label}
                    </ThemedText>
                    {showDescriptions && (
                      <ThemedText
                        style={[menuStyles.toolDesc, { color: textSecondary }]}
                        numberOfLines={1}
                      >
                        {tool.description}
                      </ThemedText>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const menuStyles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  activeLabel: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  settingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalScroll: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 16,
  },
  verticalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 16,
  },
  categoryBlock: {
    gap: 6,
  },
  categoryBlockHorizontal: {
    minWidth: 'auto' as any,
  },
  categoryTitle: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingLeft: 4,
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  toolTile: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 3,
  },
  toolLabel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 13,
    textAlign: 'center',
  },
  toolDesc: {
    fontSize: 8,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 10,
    textAlign: 'center',
  },
});

// ─── Componente interno (requiere TunerProvider) ─────────────────────────────

const TUTORIAL_SEEN_KEY = 'piano_tuner_tutorial_seen';
const DARK_TUNING_KEY = 'piano_tuner_dark_mode';

function TunerScreenContent() {
  const {
    state,
    startListening,
    stopListening,
    setSelectedKey,
    setAutoDetect,
    navigateKey,
    saveMeasurement,
    setActiveView,
    setUnisonMode,
    saveCalibrationPoint,
    resetCalibration,
  } = useTuner();
  
  const { width } = useWindowDimensions();
  const [showSettings, setShowSettings] = useState(false);
  const [menuExpanded, setMenuExpanded] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [darkTuningMode, setDarkTuningMode] = useState(false);
  
  // Check if tutorial has been seen
  React.useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(TUTORIAL_SEEN_KEY);
        if (!seen) setShowTutorial(true);
        const darkMode = await AsyncStorage.getItem(DARK_TUNING_KEY);
        if (darkMode === 'true') setDarkTuningMode(true);
      } catch {}
    })();
  }, []);
  
  const handleTutorialComplete = useCallback(() => {
    setShowTutorial(false);
    AsyncStorage.setItem(TUTORIAL_SEEN_KEY, 'true').catch(() => {});
  }, []);
  
  const toggleDarkTuningMode = useCallback(() => {
    setDarkTuningMode(prev => {
      const next = !prev;
      AsyncStorage.setItem(DARK_TUNING_KEY, String(next)).catch(() => {});
      return next;
    });
  }, []);
  
  const background = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'surface');
  const cardBg = useThemeColor({}, 'cardBackground');
  const border = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  
  const gaugeSize = Math.min(260, width - 80);
  
  // Determinar la tecla activa
  const activeKey = state.autoDetect
    ? (state.currentDetection?.keyIndex ?? -1)
    : state.selectedKey;
  
  const detection = state.currentDetection;
  const isActive = state.isListening && detection !== null && detection.keyIndex >= 0;
  
  // Información de la nota
  const noteName = activeKey >= 0 ? getNoteName(activeKey) : '—';
  const octave = activeKey >= 0 ? getOctave(activeKey) : '';
  const fullName = activeKey >= 0 ? getFullNoteName(activeKey) : '—';
  
  // Frecuencias
  const targetFreq = activeKey >= 0
    ? (state.useStretchTuning
        ? getStretchedFrequency(activeKey, state.concertPitch)
        : getEqualTemperamentFrequency(activeKey, state.concertPitch))
    : 0;
  const detectedFreq = detection?.frequency ?? 0;
  const centsDeviation = detection?.centsDeviation ?? 0;
  
  // Conteo de teclas afinadas
  const tunedCount = state.measurements.filter(m => m !== null && Math.abs(m.centsDeviation) <= 2).length;
  
  const handleToggleListening = useCallback(async () => {
    if (state.isListening) {
      stopListening();
    } else {
      await startListening();
    }
    if (Platform.OS !== 'web') {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    }
  }, [state.isListening, startListening, stopListening]);
  
  const handleKeyPress = useCallback((keyIndex: number) => {
    setSelectedKey(keyIndex);
    setAutoDetect(false);
    if (Platform.OS !== 'web') {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    }
  }, [setSelectedKey, setAutoDetect]);
  
  const handleAutoDetect = useCallback(() => {
    setAutoDetect(true);
    if (Platform.OS !== 'web') {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    }
  }, [setAutoDetect]);
  
  const handleSave = useCallback(() => {
    saveMeasurement();
    if (Platform.OS !== 'web') {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    }
  }, [saveMeasurement]);
  
  const handleToolSelect = useCallback((toolId: TunerViewMode) => {
    setActiveView(toolId);
    if (toolId === 'unison') {
      setUnisonMode(true);
    } else if (state.unisonMode) {
      setUnisonMode(false);
    }
    setMenuExpanded(false);
    if (Platform.OS !== 'web') {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    }
  }, [setActiveView, setUnisonMode, state.unisonMode]);
  
  // Helper: Compact note display used by multiple views
  const renderCompactNoteDisplay = () => (
    <View style={styles.noteDisplayCompact}>
      <ThemedText style={[styles.noteNameCompact, { color: textColor }]}>
        {noteName}
      </ThemedText>
      <ThemedText style={[styles.octaveCompact, { color: textSecondary }]}>
        {octave}
      </ThemedText>
      {isActive && (
        <ThemedText style={[styles.centsCompact, { color: Math.abs(centsDeviation) > 2 ? TUNER_COLORS.outOfTune : TUNER_COLORS.inTune }]}>
          {centsDeviation > 0 ? '+' : ''}{centsDeviation.toFixed(1)}¢
        </ThemedText>
      )}
    </View>
  );
  
  // Helper: Deviation bar used by multiple views
  const renderDeviationBar = () => (
    <DeviationBar
      centsDeviation={isActive ? centsDeviation : 0}
      range={state.meterRange}
      isActive={isActive}
    />
  );

  // Helper: measurements as Map
  const measurementsMap = useMemo(() => {
    const map = new Map<number, { cents: number; inharmonicity: number | null; timestamp: number }>();
    state.measurements.forEach((m, i) => {
      if (m) map.set(i, { cents: m.centsDeviation, inharmonicity: m.inharmonicity, timestamp: m.timestamp });
    });
    return map;
  }, [state.measurements]);
  
  // Show tutorial on first visit
  if (showTutorial) {
    return (
      <TunerTutorial
        onComplete={handleTutorialComplete}
        onSkip={handleTutorialComplete}
      />
    );
  }
  
  if (showSettings) {
    return <TunerSettings onBack={() => setShowSettings(false)} />;
  }
  
  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      {/* Menú de herramientas responsive */}
      <ToolMenu
        activeView={state.activeView}
        onSelect={handleToolSelect}
        onSettings={() => setShowSettings(true)}
        width={width}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header con progreso */}
        <View style={styles.headerRow}>
          <View style={styles.progressBadge}>
            <Ionicons name="musical-notes" size={14} color={TUNER_COLORS.primary} />
            <ThemedText style={[styles.progressText, { color: textSecondary }]}>
              {tunedCount}/88 afinadas
            </ThemedText>
          </View>
          
          <View style={styles.headerActions}>
            <Pressable
              onPress={handleAutoDetect}
              style={({ pressed }) => [
                styles.modeBadge,
                {
                  backgroundColor: state.autoDetect ? TUNER_COLORS.primary + '15' : surface,
                  borderColor: state.autoDetect ? TUNER_COLORS.primary : border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <ThemedText style={[styles.modeText, { color: state.autoDetect ? TUNER_COLORS.primary : textSecondary }]}>
                {state.autoDetect ? 'Auto' : fullName}
              </ThemedText>
            </Pressable>
            
            <View style={[styles.refPitchBadgeSmall, { backgroundColor: surface, borderColor: border }]}>
              <ThemedText style={[styles.refPitchTextSmall, { color: textSecondary }]}>
                A4={state.concertPitch}
              </ThemedText>
            </View>
          </View>
        </View>
        
        {/* ═══ Vista: Afinador principal ═══ */}
        {state.activeView === 'tuner' && (
          <>
            {/* VU Meter - indicador de nivel de señal */}
            {state.isListening && (
              <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                <VUMeter
                  rmsLevel={detection?.rmsLevel ?? 0}
                  isListening={state.isListening}
                  compact={false}
                />
              </View>
            )}
            
            {/* Medidor animado profesional */}
            <View style={styles.gaugeContainer}>
              <AnimatedCentsGauge
                centsDeviation={isActive ? centsDeviation : 0}
                keyIndex={activeKey}
                frequency={detectedFreq}
                targetFrequency={targetFreq}
                confidence={detection?.confidence ?? 0}
                meterRange={state.meterRange}
                showFrequency={state.showFrequency}
                isStable={detection?.isStable ?? false}
                darkTuningMode={darkTuningMode}
              />
            </View>
            
            {/* Barra de desviación */}
            {renderDeviationBar()}
            
            {/* Información de frecuencia */}
            {state.showFrequency && (
              <View style={[styles.infoRow, { borderColor: border }]}>
                <View style={styles.infoItem}>
                  <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>Objetivo</ThemedText>
                  <ThemedText style={[styles.infoValue, { color: textColor }]}>
                    {targetFreq > 0 ? `${targetFreq.toFixed(2)} Hz` : '— Hz'}
                  </ThemedText>
                </View>
                <View style={[styles.infoDivider, { backgroundColor: border }]} />
                <View style={styles.infoItem}>
                  <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>Detectada</ThemedText>
                  <ThemedText style={[styles.infoValue, { color: textColor }]}>
                    {detectedFreq > 0 ? `${detectedFreq.toFixed(2)} Hz` : '— Hz'}
                  </ThemedText>
                </View>
                {state.showInharmonicity && (
                  <>
                    <View style={[styles.infoDivider, { backgroundColor: border }]} />
                    <View style={styles.infoItem}>
                      <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>Inharm. B</ThemedText>
                      <ThemedText style={[styles.infoValue, { color: textColor }]}>
                        {detection?.inharmonicity != null
                          ? detection.inharmonicity.toExponential(2)
                          : '—'}
                      </ThemedText>
                    </View>
                  </>
                )}
              </View>
            )}
          </>
        )}
        
        {/* ═══ Vista: Afinación Guiada ═══ */}
        {state.activeView === 'guided' && (
          <>
            {renderCompactNoteDisplay()}
            {renderDeviationBar()}
            <View style={{ height: 12 }} />
            <GuidedTuning
              currentKeyIndex={activeKey}
              centsDeviation={isActive ? centsDeviation : 0}
              isListening={state.isListening}
              onSelectKey={(keyIndex) => {
                setSelectedKey(keyIndex);
                setAutoDetect(false);
              }}
              keyMeasurements={(() => {
                const map = new Map<number, { cents: number; timestamp: number }>();
                state.measurements.forEach((m, i) => {
                  if (m) map.set(i, { cents: m.centsDeviation, timestamp: m.timestamp });
                });
                return map;
              })()}
            />
          </>
        )}
        
        {/* ═══ Vista: Espectrograma ═══ */}
        {state.activeView === 'spectrogram' && (
          <>
            {renderCompactNoteDisplay()}
            {renderDeviationBar()}
            <View style={{ height: 12 }} />
            <Spectrogram
              fftData={detection?.fftData ?? null}
              sampleRate={detection?.actualSampleRate ?? 44100}
              fundamentalFreq={detectedFreq}
              activeKeyIndex={activeKey}
              inharmonicity={detection?.inharmonicity ?? null}
              isActive={isActive}
              width={width - 32}
            />
          </>
        )}
        
        {/* ═══ Vista: Railsback ═══ */}
        {state.activeView === 'railsback' && (
          <>
            {renderCompactNoteDisplay()}
            {renderDeviationBar()}
            <View style={{ height: 12 }} />
            <RailsbackChart
              measurements={state.measurements}
              concertPitch={state.concertPitch}
              width={width - 32}
              height={220}
              showStretchCurve={state.useStretchTuning}
            />
            <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor: border }]}>
              <View style={styles.infoCardHeader}>
                <Ionicons name="information-circle-outline" size={16} color={textSecondary} />
                <ThemedText style={[styles.infoCardTitle, { color: textSecondary }]}>
                  Curva de Railsback
                </ThemedText>
              </View>
              <ThemedText style={[styles.infoCardBody, { color: textSecondary }]}>
                La curva de Railsback muestra cómo la afinación de un piano se desvía del temperamento igual puro. Los graves se afinan ligeramente más bajos y los agudos más altos para compensar la inharmonicidad de las cuerdas.
              </ThemedText>
            </View>
          </>
        )}
        
        {/* ═══ Vista: Unísono ═══ */}
        {state.activeView === 'unison' && (
          <>
            {renderCompactNoteDisplay()}
            {renderDeviationBar()}
            <View style={{ height: 12 }} />
            <UnisonMeter
              beatFrequency={detection?.beatFrequency ?? null}
              isActive={isActive}
              width={width - 32}
            />
          </>
        )}
        
        {/* ═══ Vista: Calibración ═══ */}
        {state.activeView === 'calibration' && (
          <>
            {renderCompactNoteDisplay()}
            <View style={{ height: 8 }} />
            <CalibrationPanel
              calibrationData={state.calibrationData}
              currentInharmonicity={detection?.inharmonicity ?? null}
              activeKeyIndex={activeKey}
              isListening={state.isListening}
              onSaveCalibration={saveCalibrationPoint}
              onResetCalibration={resetCalibration}
              onRenameProfile={() => {}}
            />
          </>
        )}
        
        {/* ═══ Vista: Generador de tonos ═══ */}
        {state.activeView === 'toneGen' && (
          <>
            <View style={{ height: 8 }} />
            <ToneGeneratorPanel
              activeKeyIndex={activeKey >= 0 ? activeKey : 48}
              concertPitch={state.concertPitch}
              useStretchTuning={state.useStretchTuning}
            />
          </>
        )}
        
        {/* ═══ Vista: Análisis de cuerdas ═══ */}
        {state.activeView === 'stringQuality' && (
          <>
            {renderCompactNoteDisplay()}
            <View style={{ height: 8 }} />
            <StringQualityAnalyzer
              keyIndex={activeKey}
              frequency={detectedFreq}
              fftData={detection?.fftData ?? null}
              sampleRate={detection?.actualSampleRate ?? 44100}
              inharmonicity={detection?.inharmonicity ?? null}
              rmsLevel={detection?.rmsLevel ?? 0}
              isListening={state.isListening}
            />
          </>
        )}
        
        {/* ═══ Vista: Temperamentos ═══ */}
        {state.activeView === 'temperament' && (
          <>
            <View style={{ height: 8 }} />
            <TemperamentSelector
              selectedTemperamentId={'equal'}
              onSelectTemperament={() => {}}
            />
          </>
        )}
        
        {/* ═══ Vista: Perfiles de pianos ═══ */}
        {state.activeView === 'profiles' && (
          <>
            <View style={{ height: 8 }} />
            <PianoProfileManager
              onSelectProfile={() => {}}
              activeProfileId={null}
              currentMeasurements={measurementsMap}
            />
          </>
        )}
        
        {/* ═══ Vista: Calibración de micrófono ═══ */}
        {state.activeView === 'micCalibration' && (
          <>
            <View style={{ height: 8 }} />
            <MicCalibration
              currentLatency={0}
              onCalibrationComplete={() => {}}
            />
          </>
        )}
        
        {/* ═══ Vista: Informe de afinación ═══ */}
        {state.activeView === 'report' && (
          <>
            <View style={{ height: 8 }} />
            <TuningReportGenerator
              profile={null}
              currentMeasurements={measurementsMap}
              concertPitch={state.concertPitch}
              temperamentId={'equal'}
            />
          </>
        )}
        
        {/* ═══ Controles comunes (siempre visibles) ═══ */}
        
        {/* Navegación de teclas */}
        <View style={styles.keyNavRow}>
          <Pressable
            onPress={() => navigateKey('prev')}
            style={({ pressed }) => [
              styles.navButton,
              { backgroundColor: surface, borderColor: border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={textSecondary} />
          </Pressable>
          
          <Pressable
            onPress={handleSave}
            disabled={!isActive}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor: isActive ? TUNER_COLORS.primary : surface,
                opacity: pressed ? 0.8 : (isActive ? 1 : 0.5),
              },
            ]}
          >
            <Ionicons name="checkmark" size={18} color={isActive ? '#ffffff' : textSecondary} />
            <ThemedText style={[styles.saveButtonText, { color: isActive ? '#ffffff' : textSecondary }]}>
              Guardar
            </ThemedText>
          </Pressable>
          
          <Pressable
            onPress={() => navigateKey('next')}
            style={({ pressed }) => [
              styles.navButton,
              { backgroundColor: surface, borderColor: border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="chevron-forward" size={20} color={textSecondary} />
          </Pressable>
        </View>
        
        {/* Tira de piano */}
        <MiniPianoStrip
          activeKey={activeKey}
          measurements={state.measurements}
          onKeyPress={handleKeyPress}
        />
        
        {/* Botón de inicio/parada */}
        <View style={styles.mainButtonContainer}>
          <Pressable
            onPress={handleToggleListening}
            style={({ pressed }) => [
              styles.mainButton,
              {
                backgroundColor: state.isListening ? TUNER_COLORS.outOfTune : TUNER_COLORS.primary,
                opacity: pressed ? 0.85 : 1,
                ...Shadows.md,
              },
            ]}
          >
            <Ionicons
              name={state.isListening ? 'stop' : 'mic'}
              size={24}
              color="#ffffff"
            />
            <ThemedText style={styles.mainButtonText}>
              {state.isListening ? 'Detener' : 'Iniciar afinación'}
            </ThemedText>
          </Pressable>
        </View>
        
        {/* Indicador de AudioWorklet + Dark mode toggle */}
        {state.isListening && (
          <View style={styles.engineBadge}>
            <View style={[styles.engineDot, { backgroundColor: TUNER_COLORS.inTune }]} />
            <ThemedText style={[styles.engineText, { color: textSecondary }]}>
              Motor de audio activo
            </ThemedText>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={toggleDarkTuningMode}
              style={({ pressed }) => [{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: darkTuningMode ? '#333' : surface,
                opacity: pressed ? 0.7 : 1,
              }]}
            >
              <Ionicons
                name={darkTuningMode ? 'moon' : 'moon-outline'}
                size={14}
                color={darkTuningMode ? '#FFD700' : textSecondary}
              />
              <ThemedText style={[styles.engineText, { color: darkTuningMode ? '#FFD700' : textSecondary }]}>
                {darkTuningMode ? 'Modo oscuro' : 'Oscuro'}
              </ThemedText>
            </Pressable>
          </View>
        )}
        
        {/* Tutorial button */}
        <View style={{ alignItems: 'center', marginBottom: 4 }}>
          <Pressable
            onPress={() => setShowTutorial(true)}
            style={({ pressed }) => [{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: surface,
              opacity: pressed ? 0.7 : 1,
            }]}
          >
            <Ionicons name="help-circle-outline" size={16} color={textSecondary} />
            <ThemedText style={[styles.engineText, { color: textSecondary }]}>
              Tutorial
            </ThemedText>
          </Pressable>
        </View>
        
        {/* Error de audio */}
        {state.audioError && (
          <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <Ionicons name="warning" size={18} color="#EF4444" />
            <ThemedText style={styles.errorText}>{state.audioError}</ThemedText>
          </View>
        )}
        
        {/* Info de stretch tuning */}
        {state.activeView === 'tuner' && (
          <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.infoCardHeader}>
              <Ionicons name="information-circle-outline" size={16} color={textSecondary} />
              <ThemedText style={[styles.infoCardTitle, { color: textSecondary }]}>
                {state.useStretchTuning ? 'Stretch Tuning activado' : 'Temperamento igual'}
              </ThemedText>
            </View>
            <ThemedText style={[styles.infoCardBody, { color: textSecondary }]}>
              {state.useStretchTuning
                ? 'Las frecuencias objetivo incluyen compensación de inharmonicidad (curva de Railsback). Recomendado para pianos acústicos.'
                : 'Frecuencias de temperamento igual puro. Adecuado para referencia o instrumentos electrónicos.'}
            </ThemedText>
          </View>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Componente exportado con Provider ───────────────────────────────────────

export default function TunerScreen() {
  return (
    <TunerProvider>
      <TunerScreenContent />
    </TunerProvider>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 10,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 16,
  },
  refPitchBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  refPitchTextSmall: {
    fontSize: 10,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 14,
  },
  noteDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 4,
  },
  noteName: {
    fontSize: 72,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 80,
  },
  octaveNumber: {
    fontSize: 28,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 34,
    marginLeft: 2,
  },
  noteDisplayCompact: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  noteNameCompact: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 42,
  },
  octaveCompact: {
    fontSize: 18,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 22,
  },
  centsCompact: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 20,
    marginLeft: 8,
  },
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 14,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  infoDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 2,
  },
  keyNavRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginVertical: 14,
    paddingHorizontal: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  mainButtonContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 28,
    width: '100%',
    maxWidth: 320,
  },
  mainButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Montserrat',
    lineHeight: 22,
  },
  engineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  engineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  engineText: {
    fontSize: 11,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    fontFamily: 'Montserrat',
    lineHeight: 18,
    flex: 1,
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 16,
  },
  infoCardBody: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 17,
  },
});
