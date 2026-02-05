/**
 * Dashboard Widgets - Componentes funcionales para el Dashboard Editor
 * 
 * Este archivo contiene todos los widgets funcionales que pueden ser utilizados
 * en el Dashboard Editor. Cada widget muestra datos reales y es completamente
 * interactivo.
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, FlatList, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useClientsData, usePianosData, useServicesData, useAppointmentsData } from '@/hooks/data';
import { useInvoices } from '@/hooks/use-invoices';
import { getClientFullName } from '@/types';

// Widgets extraídos - Grupo 1
export { AlertsWidget } from './widgets/AlertsWidget';
export { QuickActionsWidget } from './widgets/QuickActionsWidget';
export { HelpWidget } from './widgets/HelpWidget';
export { AccessShortcutsWidget } from './widgets/AccessShortcutsWidget';
export { AdvancedToolsWidget } from './widgets/AdvancedToolsWidget';

// Widgets extraídos - Grupo 2
export { PredictionsWidget } from './widgets/PredictionsWidget';
export { StatsWidget } from './widgets/StatsWidget';
export { RecentClientsWidget } from './widgets/RecentClientsWidget';
export { RecentInvoicesWidget } from './widgets/RecentInvoicesWidget';
export { UpcomingAppointmentsWidget } from './widgets/UpcomingAppointmentsWidget';

// Widgets extraídos - Grupo 3
export { RecentServicesWidget } from './widgets/RecentServicesWidget';
export { StatsCardWidget } from './widgets/StatsCardWidget';
export { RevenueSummaryWidget } from './widgets/RevenueSummaryWidget';
export { PaymentStatusWidget } from './widgets/PaymentStatusWidget';
export { InventoryAlertsWidget } from './widgets/InventoryAlertsWidget';

// Widgets extraídos - Grupo 4 (Final)
export { CalendarWidget } from './widgets/CalendarWidget';
export { TasksWidget } from './widgets/TasksWidget';
export { MapWidget } from './widgets/MapWidget';
export { ChartLineWidget } from './widgets/ChartLineWidget';
export { ChartBarWidget } from './widgets/ChartBarWidget';
export { ChartPieWidget } from './widgets/ChartPieWidget';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ============================================================================
// TIPOS
// ============================================================================

interface WidgetProps {
  config?: Record<string, any>;
  isEditing?: boolean;
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall' | 'full';
}





// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  widgetContent: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
  },
  
  // Alertas
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  alertItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 4,
    borderLeftWidth: 3,
    marginBottom: 8,
    alignItems: 'center',
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  alertMessage: {
    fontSize: 12,
  },

  // Acciones rápidas
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },

  // Predicciones
  predictionItem: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 12,
    borderRadius: 4,
  },
  predictionIcon: {
    width: 48,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  predictionContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  predictionTitle: {
    fontSize: 12,
    marginBottom: 4,
  },
  predictionValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  predictionSubtitle: {
    fontSize: 11,
  },

  // Estadísticas
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },

  // Listas
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  listItemSubtitle: {
    fontSize: 12,
  },
});







// ============================================================================
// ESTILOS ADICIONALES
// ============================================================================

const additionalStyles = StyleSheet.create({
  // Accesos rápidos
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shortcutButton: {
    flex: 1,
    minWidth: '30%',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  shortcutIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  shortcutLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Herramientas avanzadas
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toolButton: {
    flex: 1,
    minWidth: '30%',
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },

  // Ayuda
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  helpItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpItemLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
  },

  // Stats Widget
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthNavButton: {
    padding: 4,
  },
  todayButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  todayButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  calendarButton: {
    padding: 6,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Combinar estilos
Object.assign(styles, additionalStyles);

