/**
 * TunerScreen - Pantalla principal del afinador de pianos (Professional v4)
 * 
 * Menú responsive con categorías y grid adaptativo.
 * Incluye feature toggles para activar/desactivar funcionalidades.
 * 7 nuevas herramientas: ProximityBeep, FullscreenTuner, StabilityHistogram,
 * MultiStringDetector, PianoHeatmap, ShareReport, DriftPrediction.
 */

import React, { useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, useWindowDimensions, Platform, Switch } from 'react-native';
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
import { StabilityHistogram } from './StabilityHistogram';
import { MultiStringDetector } from './MultiStringDetector';
import { PianoHeatmap } from './PianoHeatmap';
import { ShareReport } from './ShareReport';
import { DriftPrediction } from './DriftPrediction';
import { ProximityBeep } from './ProximityBeep';
import { FullscreenTuner } from './FullscreenTuner';
import { MultiPartialAnalyzer } from './MultiPartialAnalyzer';
import { PartialWeighting } from './PartialWeighting';
import { AuralChecks } from './AuralChecks';
import { OverpullCalculator } from './OverpullCalculator';
import { SpinnerDisplay } from './SpinnerDisplay';
import { PhaseDisplay } from './PhaseDisplay';
import { TuningModes } from './TuningModes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '@/contexts/language-context';
import { getTunerTranslation } from '@/locales/tuner-translations';
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

function getToolCategories(ts: ReturnType<typeof getTunerTranslation>['tunerScreen']): ToolCategory[] {
  return [
    {
      id: 'tuning',
      title: ts.catTuning,
      icon: 'radio',
      tools: [
        { id: 'tuner', label: ts.toolTuner, icon: 'radio-outline', description: ts.descTuner },
        { id: 'guided', label: ts.toolGuided, icon: 'navigate-outline', description: ts.descGuided },
        { id: 'toneGen', label: ts.toolToneRef, icon: 'volume-high-outline', description: ts.descToneRef },
        { id: 'temperament', label: ts.toolTemperament, icon: 'musical-notes-outline', description: ts.descTemperament },
        { id: 'tuningModes', label: ts.toolTuningModes, icon: 'options-outline', description: ts.descTuningModes },
        { id: 'overpull', label: ts.toolOverpull, icon: 'push-outline', description: ts.descOverpull },
        { id: 'auralChecks', label: ts.toolAuralChecks, icon: 'ear-outline', description: ts.descAuralChecks },
      ],
    },
    {
      id: 'analysis',
      title: ts.catAnalysis,
      icon: 'analytics',
      tools: [
        { id: 'spectrogram', label: ts.toolSpectrogram, icon: 'pulse-outline', description: ts.descSpectrogram },
        { id: 'railsback', label: ts.toolRailsback, icon: 'analytics-outline', description: ts.descRailsback },
        { id: 'heatmap', label: ts.toolHeatmap, icon: 'grid-outline', description: ts.descHeatmap },
        { id: 'unison', label: ts.toolUnison, icon: 'git-compare-outline', description: ts.descUnison },
        { id: 'multiString', label: ts.toolMultiString, icon: 'layers-outline', description: ts.descMultiString },
        { id: 'stringQuality', label: ts.toolStringQuality, icon: 'search-outline', description: ts.descStringQuality },
        { id: 'stability', label: ts.toolStability, icon: 'bar-chart-outline', description: ts.descStability },
        { id: 'driftPrediction', label: ts.toolDriftPrediction, icon: 'trending-up-outline', description: ts.descDriftPrediction },
        { id: 'multiPartial', label: ts.toolMultiPartial, icon: 'cellular-outline', description: ts.descMultiPartial },
        { id: 'partialWeighting', label: ts.toolPartialWeighting, icon: 'options-outline', description: ts.descPartialWeighting },
        { id: 'spinner', label: ts.toolSpinner, icon: 'sync-outline', description: ts.descSpinner },
        { id: 'phaseDisplay', label: ts.toolPhaseDisplay, icon: 'swap-horizontal-outline', description: ts.descPhaseDisplay },
      ],
    },
    {
      id: 'config',
      title: ts.catConfig,
      icon: 'construct',
      tools: [
        { id: 'calibration', label: ts.toolCalibration, icon: 'construct-outline', description: ts.descCalibration },
        { id: 'micCalibration', label: ts.toolMicCalibration, icon: 'mic-outline', description: ts.descMicCalibration },
        { id: 'profiles', label: ts.toolProfiles, icon: 'albums-outline', description: ts.descProfiles },
        { id: 'report', label: ts.toolReport, icon: 'document-text-outline', description: ts.descReport },
        { id: 'shareReport', label: ts.toolShareReport, icon: 'share-outline', description: ts.descShareReport },
      ],
    },
  ];
}

// ALL_TOOLS is now computed inside TunerScreenContent using getToolCategories()

// ─── Componente de menú responsive ──────────────────────────────────────────

function ToolMenu({
  activeView,
  onSelect,
  onSettings,
  width,
  categories,
  allTools,
  fallbackLabel,
}: {
  activeView: TunerViewMode;
  onSelect: (id: TunerViewMode) => void;
  onSettings: () => void;
  width: number;
  categories: ToolCategory[];
  allTools: ToolItem[];
  fallbackLabel: string;
}) {
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const isCompact = width < 768;
  const isWide = width >= 768;
  const iconSize = isCompact ? 18 : 20;

  const activeTool = allTools.find(t => t.id === activeView);
  
  // Find which category the active tool belongs to
  const activeCategoryId = categories.find(c => c.tools.some(t => t.id === activeView))?.id ?? 'tuning';

  // On mobile: collapsed mode with category pills + expandable grid
  if (isCompact) {
    return (
      <View style={[menuStyles.container, { borderBottomColor: border }]}>
        {/* Active tool indicator */}
        <View style={[menuStyles.activeIndicator, { backgroundColor: TUNER_COLORS.primary + '0D' }]}>
          <Ionicons
            name={(activeTool?.icon ?? 'radio-outline') as any}
            size={16}
            color={TUNER_COLORS.primary}
          />
          <ThemedText style={[menuStyles.activeLabel, { color: TUNER_COLORS.primary }]} numberOfLines={1}>
            {activeTool?.label ?? fallbackLabel}
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

        {/* Category pills - horizontal scrollable */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={menuStyles.categoryPillRow}>
          {categories.map(category => {
            const isExpanded = expandedCategory === category.id;
            const isActiveCategory = activeCategoryId === category.id;
            return (
              <Pressable
                key={category.id}
                onPress={() => setExpandedCategory(isExpanded ? null : category.id)}
                style={({ pressed }) => [{
                  flexDirection: 'row' as const,
                  alignItems: 'center' as const,
                  gap: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 14,
                  borderWidth: 1,
                  backgroundColor: isExpanded ? TUNER_COLORS.primary + '15' : (isActiveCategory ? surface : 'transparent'),
                  borderColor: isExpanded ? TUNER_COLORS.primary : (isActiveCategory ? border : 'transparent'),
                  opacity: pressed ? 0.7 : 1,
                }]}
              >
                <Ionicons
                  name={category.icon as any}
                  size={14}
                  color={isExpanded ? TUNER_COLORS.primary : textSecondary}
                />
                <ThemedText style={{
                  fontSize: 11,
                  fontWeight: '600',
                  fontFamily: 'Montserrat',
                  color: isExpanded ? TUNER_COLORS.primary : textSecondary,
                }}>
                  {category.title}
                </ThemedText>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={12}
                  color={isExpanded ? TUNER_COLORS.primary : textSecondary}
                />
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Expanded category grid */}
        {expandedCategory && (
          <View style={[menuStyles.expandedGrid, { borderTopColor: border }]}>
            {categories.find(c => c.id === expandedCategory)?.tools.map(tool => {
              const isActive = activeView === tool.id;
              return (
                <Pressable
                  key={tool.id}
                  onPress={() => {
                    onSelect(tool.id);
                    setExpandedCategory(null);
                  }}
                  style={({ pressed }) => [{
                    flex: 1,
                    minWidth: (width - 48) / 4 - 6,
                    maxWidth: (width - 48) / 3 - 4,
                    alignItems: 'center' as const,
                    justifyContent: 'center' as const,
                    paddingVertical: 10,
                    paddingHorizontal: 4,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    gap: 3,
                    backgroundColor: isActive ? TUNER_COLORS.primary + '15' : surface,
                    borderColor: isActive ? TUNER_COLORS.primary : 'transparent',
                    opacity: pressed ? 0.7 : 1,
                  }]}
                >
                  <Ionicons
                    name={tool.icon as any}
                    size={iconSize}
                    color={isActive ? TUNER_COLORS.primary : textSecondary}
                  />
                  <ThemedText
                    style={{
                      fontSize: 9,
                      fontWeight: '600',
                      fontFamily: 'Montserrat',
                      lineHeight: 12,
                      textAlign: 'center',
                      color: isActive ? TUNER_COLORS.primary : textColor,
                    }}
                    numberOfLines={2}
                  >
                    {tool.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  // Wide: full grid with categories and descriptions
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
          {activeTool?.label ?? fallbackLabel}
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

      {/* Categories with tools - responsive flex-wrap grid */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 10, gap: 10 }}>
        {categories.map(category => {
          // Calculate tile width: fit as many as possible with min 88px, max 110px
          const availableWidth = width - 24; // paddingHorizontal 12*2
          const gap = 6;
          const minTileWidth = 88;
          const cols = Math.floor((availableWidth + gap) / (minTileWidth + gap));
          const tileWidth = Math.floor((availableWidth - (cols - 1) * gap) / cols);
          return (
            <View key={category.id} style={{ gap: 4 }}>
              <ThemedText style={[menuStyles.categoryTitle, { color: textSecondary }]}>
                {category.title}
              </ThemedText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {category.tools.map(tool => {
                  const isActive = activeView === tool.id;
                  return (
                    <Pressable
                      key={tool.id}
                      onPress={() => onSelect(tool.id)}
                      style={({ pressed }) => [
                        menuStyles.toolTile,
                        {
                          width: tileWidth,
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
                        ]}
                        numberOfLines={1}
                      >
                        {tool.label}
                      </ThemedText>
                      <ThemedText
                        style={[menuStyles.toolDesc, { color: textSecondary }]}
                        numberOfLines={1}
                      >
                        {tool.description}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
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
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activeLabel: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 18,
    flexShrink: 1,
  },
  settingsBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPillRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
    flexWrap: 'wrap',
  },
  expandedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderTopWidth: 1,
  },
  horizontalScroll: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 14,
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
  const { currentLanguage } = useLanguage();
  const tt = getTunerTranslation(currentLanguage);
  const ts = tt.tunerScreen;
  const TOOL_CATEGORIES = useMemo(() => getToolCategories(ts), [currentLanguage]);
  const ALL_TOOLS = useMemo(() => TOOL_CATEGORIES.flatMap(c => c.tools), [TOOL_CATEGORIES]);
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
    setFeatureToggle,
    setConcertPitch,
    setMeterRange,
    setNoiseGateThreshold,
    setUseStretchTuning,
  } = useTuner();

  // Tuning mode state
  const [selectedTuningModeId, setSelectedTuningModeId] = React.useState('studio');
  
  const { width } = useWindowDimensions();
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [darkTuningMode, setDarkTuningMode] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showFeatureToggles, setShowFeatureToggles] = useState(false);
  
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
    if (toolId === 'unison' || toolId === 'multiString') {
      setUnisonMode(true);
    } else if (state.unisonMode) {
      setUnisonMode(false);
    }
    if (Platform.OS !== 'web') {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    }
  }, [setActiveView, setUnisonMode, state.unisonMode]);
  
  // Helper: Compact note display
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
  
  // Helper: Deviation bar
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

  // Helper: tuning history for drift prediction
  const tuningHistory = useMemo(() => {
    return state.measurements
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .map(m => ({
        keyIndex: m.keyIndex,
        centsDeviation: m.centsDeviation,
        frequency: m.frequency,
        targetFrequency: m.targetFrequency,
        inharmonicity: m.inharmonicity,
        timestamp: m.timestamp,
      }));
  }, [state.measurements]);
  
  // ─── Fullscreen mode ───
  if (showFullscreen && state.featureToggles.fullscreen) {
    return (
      <FullscreenTuner
        noteName={noteName}
        octave={String(octave)}
        centsDeviation={isActive ? centsDeviation : 0}
        frequency={detectedFreq}
        targetFrequency={targetFreq}
        isActive={isActive}
        isListening={state.isListening}
        isStable={detection?.isStable ?? false}
        rmsLevel={detection?.rmsLevel ?? 0}
        onToggleListening={handleToggleListening}
        onExit={() => setShowFullscreen(false)}
        onSave={handleSave}
        onNavigateKey={navigateKey}
      />
    );
  }
  
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

  // ─── Feature toggles panel ───
  if (showFeatureToggles) {
    const toggleItems: { key: keyof typeof state.featureToggles; label: string; description: string }[] = [
      { key: 'proximityBeep', label: ts.toggleProximityBeep, description: ts.toggleProximityBeepDesc },
      { key: 'stabilityHistogram', label: ts.toggleStabilityHistogram, description: ts.toggleStabilityHistogramDesc },
      { key: 'heatmap', label: ts.toggleHeatmap, description: ts.toggleHeatmapDesc },
      { key: 'multiString', label: ts.toggleMultiString, description: ts.toggleMultiStringDesc },
      { key: 'driftPrediction', label: ts.toggleDriftPrediction, description: ts.toggleDriftPredictionDesc },
      { key: 'fullscreen', label: ts.toggleFullscreen, description: ts.toggleFullscreenDesc },
    ];

    return (
      <View style={[styles.container, { backgroundColor: background }]}>
        <View style={[styles.featureToggleHeader, { borderBottomColor: border }]}>
          <Pressable
            onPress={() => setShowFeatureToggles(false)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, padding: 8 }]}
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </Pressable>
          <ThemedText style={[styles.featureToggleTitle, { color: textColor }]}>
            {ts.features}
          </ThemedText>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <ThemedText style={[styles.featureToggleSubtitle, { color: textSecondary }]}>
            {ts.featuresSubtitle}
          </ThemedText>
          {toggleItems.map(item => (
            <View key={item.key} style={[styles.featureToggleRow, { backgroundColor: surface, borderColor: border }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText style={[styles.featureToggleLabel, { color: textColor }]}>
                  {item.label}
                </ThemedText>
                <ThemedText style={[styles.featureToggleDesc, { color: textSecondary }]}>
                  {item.description}
                </ThemedText>
              </View>
              <Switch
                value={state.featureToggles[item.key]}
                onValueChange={(val) => setFeatureToggle(item.key, val)}
                trackColor={{ false: border, true: TUNER_COLORS.primary + '60' }}
                thumbColor={state.featureToggles[item.key] ? TUNER_COLORS.primary : '#f4f3f4'}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      {/* Menú de herramientas responsive */}
      <ToolMenu
        activeView={state.activeView}
        onSelect={handleToolSelect}
        onSettings={() => setShowSettings(true)}
        width={width}
        categories={TOOL_CATEGORIES}
        allTools={ALL_TOOLS}
        fallbackLabel={ts.toolTuner}
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
              {tunedCount}/88 {ts.tuned}
            </ThemedText>
          </View>
          
          <View style={styles.headerActions}>
            {/* Fullscreen button */}
            {state.featureToggles.fullscreen && state.isListening && (
              <Pressable
                onPress={() => setShowFullscreen(true)}
                style={({ pressed }) => [
                  styles.modeBadge,
                  { backgroundColor: surface, borderColor: border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="expand-outline" size={14} color={textSecondary} />
              </Pressable>
            )}
            
            {/* Feature toggles button */}
            <Pressable
              onPress={() => setShowFeatureToggles(true)}
              style={({ pressed }) => [
                styles.modeBadge,
                { backgroundColor: surface, borderColor: border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="options-outline" size={14} color={textSecondary} />
            </Pressable>
            
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
        
        {/* ═══ Proximity Beep (invisible, audio only) ═══ */}
        {state.featureToggles.proximityBeep && state.isListening && isActive && (
          <ProximityBeep
            centsDeviation={centsDeviation}
            isActive={isActive}
            enabled={state.featureToggles.proximityBeep}
          />
        )}
        
        {/* ═══ Vista: Afinador principal ═══ */}
        {state.activeView === 'tuner' && (
          <>
            {/* VU Meter */}
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
            
            {/* Stability histogram (below main gauge) */}
            {state.featureToggles.stabilityHistogram && isActive && (
              <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
                <StabilityHistogram
                  keyIndex={activeKey}
                  currentCents={centsDeviation}
                  isActive={isActive}
                />
              </View>
            )}
            
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
          </>
        )}

        {/* ═══ Vista: Mapa de calor ═══ */}
        {state.activeView === 'heatmap' && (
          <>
            <View style={{ height: 8 }} />
            <PianoHeatmap
              measurements={measurementsMap}
              activeKeyIndex={activeKey}
              onKeyPress={handleKeyPress}
              width={width - 32}
            />
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

        {/* ═══ Vista: Multi-corda ═══ */}
        {state.activeView === 'multiString' && (
          <>
            {renderCompactNoteDisplay()}
            {renderDeviationBar()}
            <View style={{ height: 12 }} />
            <MultiStringDetector
              fftData={detection?.fftData ?? null}
              sampleRate={detection?.actualSampleRate ?? 44100}
              fundamentalFreq={detectedFreq}
              keyIndex={activeKey}
              isActive={isActive}
              width={width - 32}
            />
          </>
        )}

        {/* ═══ Vista: Estabilitat ═══ */}
        {state.activeView === 'stability' && (
          <>
            {renderCompactNoteDisplay()}
            {renderDeviationBar()}
            <View style={{ height: 12 }} />
            <StabilityHistogram
              keyIndex={activeKey}
              currentCents={isActive ? centsDeviation : 0}
              isActive={isActive}
            />
          </>
        )}

        {/* ═══ Vista: Predicció de deriva ═══ */}
        {state.activeView === 'driftPrediction' && (
          <>
            <View style={{ height: 8 }} />
            <DriftPrediction
              tuningHistory={[tuningHistory]}
              currentMeasurements={measurementsMap}
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

        {/* ═══ Vista: Compartir informe ═══ */}
        {state.activeView === 'shareReport' && (
          <>
            <View style={{ height: 8 }} />
            <ShareReport
              measurements={measurementsMap}
              concertPitch={state.concertPitch}
              temperamentId={'equal'}
              pianoName={state.calibrationData?.profileName ?? undefined}
            />
          </>
        )}
        
        {/* ═══ Vista: Multi-Partial Analyzer ═══ */}
        {state.activeView === 'multiPartial' && (
          <>
            {renderCompactNoteDisplay()}
            {renderDeviationBar()}
            <View style={{ height: 12 }} />
            <MultiPartialAnalyzer
              fftData={detection?.fftData ?? null}
              sampleRate={detection?.actualSampleRate ?? 44100}
              fundamentalFreq={detectedFreq}
              keyIndex={activeKey}
              isActive={isActive}
            />
          </>
        )}

        {/* ═══ Vista: Partial Weighting ═══ */}
        {state.activeView === 'partialWeighting' && (
          <>
            {renderCompactNoteDisplay()}
            <View style={{ height: 8 }} />
            <PartialWeighting
              keyIndex={activeKey}
              centsDeviation={isActive ? centsDeviation : 0}
              frequency={detectedFreq}
              targetFrequency={targetFreq}
              inharmonicity={detection?.inharmonicity ?? null}
              isActive={isActive}
              concertPitch={state.concertPitch}
            />
          </>
        )}

        {/* ═══ Vista: Aural Checks ═══ */}
        {state.activeView === 'auralChecks' && (
          <>
            {renderCompactNoteDisplay()}
            <View style={{ height: 8 }} />
            <AuralChecks
              keyIndex={activeKey}
              concertPitch={state.concertPitch}
              measurements={measurementsMap}
              useStretchTuning={state.useStretchTuning}
            />
          </>
        )}

        {/* ═══ Vista: Overpull Calculator ═══ */}
        {state.activeView === 'overpull' && (
          <>
            {renderCompactNoteDisplay()}
            <View style={{ height: 8 }} />
            <OverpullCalculator
              keyIndex={activeKey}
              currentCents={isActive ? centsDeviation : 0}
              targetCents={0}
              isListening={state.isListening}
              measurements={measurementsMap}
            />
          </>
        )}

        {/* ═══ Vista: Spinner Display ═══ */}
        {state.activeView === 'spinner' && (
          <>
            {renderCompactNoteDisplay()}
            <View style={{ height: 8 }} />
            <SpinnerDisplay
              fftData={detection?.fftData ?? null}
              sampleRate={detection?.actualSampleRate ?? 44100}
              fundamentalFreq={detectedFreq}
              centsDeviation={isActive ? centsDeviation : 0}
              isActive={isActive}
            />
          </>
        )}

        {/* ═══ Vista: Phase Display ═══ */}
        {state.activeView === 'phaseDisplay' && (
          <>
            {renderCompactNoteDisplay()}
            <View style={{ height: 8 }} />
            <PhaseDisplay
              frequency={detectedFreq}
              targetFrequency={targetFreq}
              centsDeviation={isActive ? centsDeviation : 0}
              isActive={isActive}
              isListening={state.isListening}
            />
          </>
        )}

        {/* ═══ Vista: Tuning Modes ═══ */}
        {state.activeView === 'tuningModes' && (
          <>
            <View style={{ height: 8 }} />
            <TuningModes
              selectedModeId={selectedTuningModeId}
              onModeChange={(mode) => {
                setSelectedTuningModeId(mode.id);
                setConcertPitch(mode.recommendedPitch);
                setMeterRange(mode.meterRange);
                setNoiseGateThreshold(mode.noiseGateThreshold);
                setUseStretchTuning(mode.useStretchTuning);
              }}
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
              {ts.save}
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
              {state.isListening ? ts.stop : ts.startTuning}
            </ThemedText>
          </Pressable>
        </View>
        
        {/* Indicador de motor + Dark mode + Tutorial */}
        {state.isListening && (
          <View style={styles.engineBadge}>
            <View style={[styles.engineDot, { backgroundColor: TUNER_COLORS.inTune }]} />
            <ThemedText style={[styles.engineText, { color: textSecondary }]}>
              {ts.audioActive}
            </ThemedText>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={toggleDarkTuningMode}
              style={({ pressed }) => [{
                flexDirection: 'row' as const,
                alignItems: 'center' as const,
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
                {darkTuningMode ? ts.darkMode : ts.dark}
              </ThemedText>
            </Pressable>
          </View>
        )}
        
        {/* Tutorial button */}
        <View style={{ alignItems: 'center', marginBottom: 4 }}>
          <Pressable
            onPress={() => setShowTutorial(true)}
            style={({ pressed }) => [{
              flexDirection: 'row' as const,
              alignItems: 'center' as const,
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
                {state.useStretchTuning ? ts.stretchTuningActive : ts.equalTemperament}
              </ThemedText>
            </View>
            <ThemedText style={[styles.infoCardBody, { color: textSecondary }]}>
              {state.useStretchTuning
                ? ts.stretchTuningDesc
                : ts.equalTemperamentDesc}
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
    paddingHorizontal: 12,
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 4,
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
    gap: 6,
    flexWrap: 'wrap',
    flexShrink: 1,
    justifyContent: 'flex-end',
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
  // Feature toggles panel styles
  featureToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  featureToggleTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 24,
  },
  featureToggleSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 18,
    marginBottom: 8,
  },
  featureToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  featureToggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  featureToggleDesc: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 16,
  },
});
