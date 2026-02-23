/**
 * Página de Accesos Rapidos
 * Piano Emotion Manager - Diseño moderno y elegante
 */

import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useHeader } from '@/contexts/HeaderContext';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Spacing, BorderRadius } from '@/constants/theme';
import { useDashboardPreferences, type AccessShortcutModule } from '@/hooks/use-dashboard-preferences';
import { useThemeColor } from '@/hooks/use-theme-color';

// Definición de módulos principales organizados por categorías
const CATEGORIES = [
  {
    id: 'core',
    title: 'Gestión Principal',
    modules: [
      { key: 'clients', icon: 'person.2.fill', label: 'Clientes', color: '#5ba3b8' },
      { key: 'pianos', icon: 'pianokeys', label: 'Pianos', color: '#9b7fc9' },
      { key: 'services', icon: 'wrench.and.screwdriver.fill', label: 'Servicios', color: '#52a67d' },
      { key: 'inventory', icon: 'shippingbox.fill', label: 'Inventario', color: '#d9a05b' },
    ],
  },
  {
    id: 'financial',
    title: 'Finanzas y Facturación',
    modules: [
      { key: 'invoices', icon: 'doc.text.fill', label: 'Facturas', color: '#5b7fc7' },
      { key: 'quotes', icon: 'doc.plaintext', label: 'Presupuestos', color: '#9b7fc9' },
      { key: 'billing_summary', icon: 'dollarsign.circle.fill', label: 'Resumen Facturación', color: '#52a67d' },
      { key: 'rates', icon: 'list.bullet', label: 'Tarifas', color: '#e07a5f' },
    ],
  },
  {
    id: 'analytics',
    title: 'Análisis y Reportes',
    modules: [
      { key: 'dashboard', icon: 'chart.pie.fill', label: 'Panel Control', color: '#5b7fc7' },
      { key: 'stats', icon: 'chart.bar.fill', label: 'Estadísticas', color: '#52a67d' },
      { key: 'analytics', icon: 'chart.xyaxis.line', label: 'Analíticas', color: '#5ba3b8' },
      { key: 'predictions', icon: 'brain.head.profile', label: 'Predicciones IA', color: '#9b7fc9' },
    ],
  },
  {
    id: 'operations',
    title: 'Operaciones',
    modules: [
      { key: 'suppliers', icon: 'building.2.fill', label: 'Proveedores', color: '#e07a5f' },
      { key: 'service_catalog', icon: 'list.clipboard.fill', label: 'Catálogo Servicios', color: '#9b7fc9' },
      { key: 'contracts', icon: 'doc.badge.clock.fill', label: 'Contratos', color: '#52a67d' },
      { key: 'reminders', icon: 'bell.badge.fill', label: 'Recordatorios', color: '#d9a05b' },
    ],
  },
  {
    id: 'tools',
    title: 'Herramientas',
    modules: [
      { key: 'clients_map', icon: 'map.fill', label: 'Mapa Clientes', color: '#d66b6b' },
      { key: 'routes', icon: 'map.fill', label: 'Rutas', color: '#e07a5f' },
      { key: 'import', icon: 'square.and.arrow.down.fill', label: 'Importar', color: '#52a67d' },
      { key: 'business', icon: 'person.fill', label: 'Datos Fiscales', color: '#666666' },
    ],
  },
  {
    id: 'settings',
    title: 'Configuración',
    modules: [
      { key: 'modules', icon: 'square.grid.2x2.fill', label: 'Módulos y Plan', color: '#9b7fc9' },
      { key: 'settings', icon: 'gearshape.fill', label: 'Configuración', color: '#666666' },
    ],
  },
];

// Mapeo de rutas
const ROUTE_MAP: Record<string, string> = {
  clients: '/clients',
  pianos: '/pianos',
  services: '/services',
  inventory: '/inventory',
  stats: '/stats',
  settings: '/settings',
  quotes: '/quotes',
  invoices: '/invoices',
  rates: '/rates',
  business: '/business-info',
  dashboard: '/',
  suppliers: '/suppliers',
  analytics: '/analytics-dashboard',
  clients_map: '/clients-map',
  billing_summary: '/billing-summary',
  service_catalog: '/service-catalog',
  reminders: '/reminders',
  contracts: '/contracts',
  predictions: '/predictions',
  import: '/import',
  routes: '/routes',
  modules: '/settings/modules',
};

export default function QuickAccessScreen() {
  const router = useRouter();
  const { setHeaderConfig } = useHeader();
  const { visibleShortcuts } = useDashboardPreferences();
  const { width } = useWindowDimensions();
  
  const background = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');

  // Configurar header
  useFocusEffect(
    React.useCallback(() => {
      setHeaderConfig({
        title: 'Accesos Rapidos',
        subtitle: 'Accede rápidamente a las funciones principales',
        icon: 'square.grid.2x2.fill',
        showBackButton: false,
      });
    }, [setHeaderConfig])
  );

  const handleAction = (action: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const route = ROUTE_MAP[action];
    if (route) {
      router.push(route as any);
    }
  };

  const isModuleVisible = (key: string) => {
    const shortcut = visibleShortcuts.find(s => s.id === key as AccessShortcutModule);
    return shortcut?.visible !== false;
  };

  // Responsive: determinar número de columnas
  const numColumns = width > 1024 ? 4 : width > 768 ? 3 : width > 600 ? 2 : 2;
  const cardWidth = width > 600 ? `${(100 / numColumns) - 2}%` : '48%';

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {CATEGORIES.map((category) => {
          const visibleModules = category.modules.filter(m => isModuleVisible(m.key));
          if (visibleModules.length === 0) return null;

          return (
            <View key={category.id} style={styles.categorySection}>
              <ThemedText style={styles.categoryTitle}>{category.title}</ThemedText>
              
              <View style={styles.modulesGrid}>
                {visibleModules.map((module) => (
                  <Pressable
                    key={module.key}
                    style={[
                      styles.moduleCard,
                      { backgroundColor: cardBg, borderColor, width: cardWidth },
                    ]}
                    onPress={() => handleAction(module.key)}
                  >
                    <View style={[styles.iconContainer, { backgroundColor: `${module.color}15` }]}>
                      <IconSymbol name={module.icon} size={28} color={module.color} />
                    </View>
                    <ThemedText style={styles.moduleLabel} numberOfLines={2}>
                      {module.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  categorySection: {
    marginBottom: Spacing.xl,
  },
  categoryTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat',
    fontWeight: '700',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  moduleCard: {
    width: 90, // Ancho fijo reducido a la mitad aproximadamente
    paddingVertical: 8, // Padding vertical mínimo
    paddingHorizontal: 4, // Padding horizontal mínimo
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6, // Gap mínimo entre icono y texto
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, // Aumentado de 0.05 a 0.15 para sombra más visible
    shadowRadius: 12, // Aumentado de 8 a 12
    elevation: 4, // Aumentado de 2 a 4 para Android
  },
  iconContainer: {
    width: 56, // Tamaño original mantenido
    height: 56, // Tamaño original mantenido
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleLabel: {
    fontSize: 13, // Reducido de 14 a 13
    fontFamily: 'Montserrat',
    fontWeight: '600',
    textAlign: 'center',
  },
});
