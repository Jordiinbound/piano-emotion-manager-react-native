/**
 * Dashboard Editor (Dashboard+)
 * Piano Emotion Manager
 * 
 * Configurador visual para personalizar el dashboard:
 * - Mostrar/ocultar secciones del dashboard
 * - Configurar qué módulos aparecen en Accesos Rapidos
 * 
 * Funcionalidad premium disponible solo para usuarios Pro y Premium.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUserTier } from '@/hooks/use-user-tier';
import { 
  useDashboardPreferences, 
  type DashboardSectionId,
  type AccessShortcutModule 
} from '@/hooks/use-dashboard-preferences';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Iconos para cada sección del dashboard
const SECTION_ICONS: Record<DashboardSectionId, keyof typeof Ionicons.glyphMap> = {
  alerts: 'notifications',
  quick_actions: 'flash',
  predictions: 'trending-up',
  stats: 'stats-chart',
  recent_services: 'construct',
  access_shortcuts: 'apps',
  advanced_tools: 'settings',
  help: 'help-circle',
  store: 'storefront',
};

// Colores para cada sección
const SECTION_COLORS: Record<DashboardSectionId, string> = {
  alerts: '#EF4444',
  quick_actions: '#10B981',
  predictions: '#8B5CF6',
  stats: '#3B82F6',
  recent_services: '#F59E0B',
  access_shortcuts: '#06B6D4',
  advanced_tools: '#6366F1',
  help: '#EC4899',
  store: '#14B8A6',
};

// Información de módulos de accesos rápidos
const SHORTCUT_INFO: Record<AccessShortcutModule, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  clients: { label: 'Clientes', icon: 'people', color: '#3B82F6' },
  pianos: { label: 'Pianos', icon: 'musical-notes', color: '#8B5CF6' },
  services: { label: 'Servicios', icon: 'construct', color: '#10B981' },
  suppliers: { label: 'Proveedores', icon: 'business', color: '#F97316' },
  dashboard: { label: 'Panel Control', icon: 'pie-chart', color: '#2D5A27' },
  inventory: { label: 'Inventario', icon: 'cube', color: '#F59E0B' },
  stats: { label: 'Estadísticas', icon: 'bar-chart', color: '#10B981' },
  analytics: { label: 'Analíticas', icon: 'analytics', color: '#0EA5E9' },
  quotes: { label: 'Presupuestos', icon: 'document-text', color: '#9333EA' },
  invoices: { label: 'Facturas', icon: 'receipt', color: '#3B82F6' },
  billing_summary: { label: 'Resumen Fact.', icon: 'cash', color: '#059669' },
  rates: { label: 'Tarifas', icon: 'pricetag', color: '#EC4899' },
  service_catalog: { label: 'Catálogo Serv.', icon: 'list', color: '#7C3AED' },
  clients_map: { label: 'Mapa Clientes', icon: 'map', color: '#DC2626' },
  business: { label: 'Datos Fiscales', icon: 'briefcase', color: '#6B7280' },
  reminders: { label: 'Recordatorios', icon: 'alarm', color: '#F59E0B' },
  contracts: { label: 'Contratos', icon: 'document', color: '#059669' },
  predictions: { label: 'Predicciones IA', icon: 'bulb', color: '#8B5CF6' },
  import: { label: 'Importar', icon: 'download', color: '#22C55E' },
  routes: { label: 'Rutas', icon: 'navigate', color: '#F97316' },
  modules: { label: 'Módulos y Plan', icon: 'grid', color: '#8B5CF6' },
  settings: { label: 'Configuración', icon: 'settings', color: '#64748B' },
};

const TUTORIAL_SEEN_KEY = '@dashboard_editor_tutorial_seen';

export default function DashboardEditorScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { tier, isLoading: tierLoading } = useUserTier();
  const {
    allSections,
    allShortcuts,
    toggleSectionVisibility,
    toggleShortcutVisibility,
    resetToDefaults,
    isLoading: prefsLoading,
  } = useDashboardPreferences();

  const [activeTab, setActiveTab] = useState<'sections' | 'shortcuts'>('sections');
  const [showTutorial, setShowTutorial] = useState(false);

  // Verificar si el usuario es Pro o Premium
  const isProOrPremium = tier === 'pro' || tier === 'premium';

  // Cargar estado del tutorial
  useEffect(() => {
    const checkTutorial = async () => {
      try {
        const seen = await AsyncStorage.getItem(TUTORIAL_SEEN_KEY);
        if (!seen && isProOrPremium) {
          setShowTutorial(true);
        }
      } catch (error) {
        console.error('Error checking tutorial status:', error);
      }
    };
    checkTutorial();
  }, [isProOrPremium]);

  // Cerrar tutorial
  const closeTutorial = async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
      setShowTutorial(false);
    } catch (error) {
      console.error('Error saving tutorial status:', error);
    }
  };

  // Manejar cambio de visibilidad de sección
  const handleToggleSectionVisibility = (sectionId: DashboardSectionId) => {
    // No permitir ocultar la tienda
    if (sectionId === 'store') {
      Alert.alert(
        'Sección fija',
        'La sección de Tienda siempre permanece visible y no puede ser ocultada.',
        [{ text: 'Entendido' }]
      );
      return;
    }

    toggleSectionVisibility(sectionId);
  };

  // Restaurar configuración por defecto
  const handleReset = () => {
    Alert.alert(
      'Restaurar configuración',
      '¿Estás seguro de que quieres restaurar la configuración por defecto? Se mostrarán todas las secciones y módulos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Restaurar', 
          style: 'destructive',
          onPress: resetToDefaults 
        },
      ]
    );
  };

  // Pantalla de carga
  if (tierLoading || prefsLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Cargando...</Text>
        </View>
      </ThemedView>
    );
  }

  // Pantalla de upgrade para usuarios gratuitos
  if (!isProOrPremium) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Dashboard Editor</ThemedText>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.upgradeContainer}>
          <View style={styles.upgradeIconContainer}>
            <Ionicons name="diamond" size={64} color="#3B82F6" />
          </View>
          <ThemedText style={styles.upgradeTitle}>Funcionalidad Premium</ThemedText>
          <ThemedText style={styles.upgradeDescription}>
            El Dashboard Editor es una funcionalidad exclusiva para usuarios Pro y Premium.
          </ThemedText>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <ThemedText style={styles.featureText}>
                Personaliza qué secciones mostrar
              </ThemedText>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <ThemedText style={styles.featureText}>
                Configura tus accesos rápidos
              </ThemedText>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <ThemedText style={styles.featureText}>
                Crea tu dashboard ideal
              </ThemedText>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <ThemedText style={styles.featureText}>
                Sincronización en la nube
              </ThemedText>
            </View>
          </View>

          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push('/subscription')}
          >
            <ThemedText style={styles.upgradeButtonText}>Actualizar a Pro</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={styles.upgradeLinkText}>Ver planes y precios</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </ThemedView>
    );
  }

  // Pantalla principal del editor
  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <ThemedText style={styles.headerTitle}>Configurar Dashboard</ThemedText>
          <ThemedText style={styles.headerSubtitle}>Personaliza tu experiencia</ThemedText>
        </View>
        <TouchableOpacity onPress={() => setShowTutorial(true)} style={styles.helpButton}>
          <Ionicons name="help-circle-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tutorial Modal */}
      {showTutorial && (
        <View style={styles.tutorialOverlay}>
          <View style={[styles.tutorialModal, { backgroundColor: colors.background }]}>
            <View style={styles.tutorialHeader}>
              <Ionicons name="information-circle" size={32} color="#3B82F6" />
              <ThemedText style={styles.tutorialTitle}>Cómo usar el Dashboard Editor</ThemedText>
            </View>
            <ScrollView style={styles.tutorialContent}>
              <ThemedText style={styles.tutorialText}>
                <Text style={styles.tutorialBold}>Secciones del Dashboard:</Text>{'\n'}
                Activa o desactiva las secciones que quieres ver en tu dashboard principal.
              </ThemedText>
              <ThemedText style={styles.tutorialText}>
                <Text style={styles.tutorialBold}>Accesos Rapidos:</Text>{'\n'}
                Elige qué módulos aparecen en la sección de Accesos Rapidos.
              </ThemedText>
              <ThemedText style={styles.tutorialText}>
                • Los cambios se <Text style={styles.tutorialBold}>guardan automáticamente</Text>.
              </ThemedText>
              <ThemedText style={styles.tutorialText}>
                • La <Text style={styles.tutorialBold}>Tienda siempre está visible</Text>.
              </ThemedText>
              <ThemedText style={styles.tutorialText}>
                • Puedes <Text style={styles.tutorialBold}>restaurar los valores por defecto</Text> en cualquier momento.
              </ThemedText>
            </ScrollView>
            <TouchableOpacity style={styles.tutorialButton} onPress={closeTutorial}>
              <ThemedText style={styles.tutorialButtonText}>Entendido</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'sections' && { borderBottomColor: '#3B82F6', borderBottomWidth: 2 }
          ]}
          onPress={() => setActiveTab('sections')}
        >
          <Ionicons 
            name="grid-outline" 
            size={20} 
            color={activeTab === 'sections' ? '#3B82F6' : colors.text} 
          />
          <ThemedText style={[
            styles.tabText,
            activeTab === 'sections' && { color: '#3B82F6', fontWeight: '600' }
          ]}>
            Secciones
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'shortcuts' && { borderBottomColor: '#3B82F6', borderBottomWidth: 2 }
          ]}
          onPress={() => setActiveTab('shortcuts')}
        >
          <Ionicons 
            name="apps-outline" 
            size={20} 
            color={activeTab === 'shortcuts' ? '#3B82F6' : colors.text} 
          />
          <ThemedText style={[
            styles.tabText,
            activeTab === 'shortcuts' && { color: '#3B82F6', fontWeight: '600' }
          ]}>
            Accesos Rapidos
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'sections' ? (
          // Tab de Secciones
          <>
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color="#3B82F6" />
              <ThemedText style={styles.infoText}>
                Activa o desactiva las secciones que quieres ver en tu dashboard. Los cambios se aplican inmediatamente.
              </ThemedText>
            </View>

            <View style={styles.itemsList}>
              {allSections.map((section) => {
                const isStore = section.id === 'store';
                return (
                  <View
                    key={section.id}
                    style={[
                      styles.itemCard,
                      { 
                        backgroundColor: colors.cardBackground,
                        borderColor: section.visible ? SECTION_COLORS[section.id] : colors.border,
                        opacity: isStore ? 0.7 : 1,
                      }
                    ]}
                  >
                    <View style={styles.itemLeft}>
                      <View style={[styles.itemIcon, { backgroundColor: SECTION_COLORS[section.id] + '20' }]}>
                        <Ionicons name={SECTION_ICONS[section.id]} size={24} color={SECTION_COLORS[section.id]} />
                      </View>
                      <View style={styles.itemInfo}>
                        <ThemedText style={styles.itemTitle}>{section.title}</ThemedText>
                        <ThemedText style={styles.itemStatus}>
                          {isStore ? 'Siempre visible' : section.visible ? 'Visible' : 'Oculta'}
                        </ThemedText>
                      </View>
                    </View>
                    <Switch
                      value={section.visible}
                      onValueChange={() => handleToggleSectionVisibility(section.id)}
                      disabled={isStore}
                      trackColor={{ false: colors.border, true: SECTION_COLORS[section.id] }}
                      thumbColor={section.visible ? '#fff' : '#f4f3f4'}
                    />
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          // Tab de Accesos Rapidos
          <>
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color="#3B82F6" />
              <ThemedText style={styles.infoText}>
                Elige qué módulos aparecen en la sección de Accesos Rapidos de tu dashboard.
              </ThemedText>
            </View>

            <View style={styles.itemsList}>
              {allShortcuts.map((shortcut) => {
                const info = SHORTCUT_INFO[shortcut.id];
                return (
                  <View
                    key={shortcut.id}
                    style={[
                      styles.itemCard,
                      { 
                        backgroundColor: colors.cardBackground,
                        borderColor: shortcut.visible ? info.color : colors.border,
                      }
                    ]}
                  >
                    <View style={styles.itemLeft}>
                      <View style={[styles.itemIcon, { backgroundColor: info.color + '20' }]}>
                        <Ionicons name={info.icon} size={24} color={info.color} />
                      </View>
                      <View style={styles.itemInfo}>
                        <ThemedText style={styles.itemTitle}>{info.label}</ThemedText>
                        <ThemedText style={styles.itemStatus}>
                          {shortcut.visible ? 'Visible' : 'Oculto'}
                        </ThemedText>
                      </View>
                    </View>
                    <Switch
                      value={shortcut.visible}
                      onValueChange={() => toggleShortcutVisibility(shortcut.id)}
                      trackColor={{ false: colors.border, true: info.color }}
                      thumbColor={shortcut.visible ? '#fff' : '#f4f3f4'}
                    />
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Botón de restaurar */}
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Ionicons name="refresh" size={20} color="#EF4444" />
          <Text style={styles.resetButtonText}>Restaurar configuración por defecto</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  helpButton: {
    padding: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  tabText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: '#3B82F620',
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  itemsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemStatus: {
    fontSize: 14,
    opacity: 0.7,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EF4444',
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  bottomSpacer: {
    height: 32,
  },
  // Upgrade screen styles
  upgradeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  upgradeIconContainer: {
    marginBottom: 24,
  },
  upgradeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  upgradeDescription: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 32,
    lineHeight: 24,
  },
  featuresList: {
    width: '100%',
    marginBottom: 32,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    flex: 1,
  },
  upgradeButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  upgradeLinkText: {
    fontSize: 16,
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  // Tutorial modal styles
  tutorialOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 24,
  },
  tutorialModal: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  tutorialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  tutorialTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  tutorialContent: {
    marginBottom: 20,
  },
  tutorialText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  tutorialBold: {
    fontWeight: '600',
  },
  tutorialButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  tutorialButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
