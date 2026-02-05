/**
 * Widget Renderer - Renderiza el widget correcto según su tipo
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import {
  AlertsWidget,
  QuickActionsWidget,
  PredictionsWidget,
  StatsWidget,
  RecentServicesWidget,
  AccessShortcutsWidget,
  AdvancedToolsWidget,
  HelpWidget,
  RecentClientsWidget,
  RecentInvoicesWidget,
  UpcomingAppointmentsWidget,
  StatsCardWidget,
  RevenueSummaryWidget,
  PaymentStatusWidget,
  InventoryAlertsWidget,
  CalendarWidget,
  TasksWidget,
  MapWidget,
  ChartLineWidget,
  ChartBarWidget,
  ChartPieWidget,
} from './dashboard-widgets';

interface WidgetRendererProps {
  type: string;
  config?: Record<string, any>;
  isEditing?: boolean;
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall' | 'full';
}

export function WidgetRenderer({ type, config, isEditing, size }: WidgetRendererProps) {
  const { colors } = useTheme();

  // Renderizar el widget correcto según el tipo
  switch (type) {
    // Secciones principales
    case 'alerts':
      return <AlertsWidget config={config} isEditing={isEditing} size={size} />;
    
    case 'quick_actions':
      return <QuickActionsWidget config={config} isEditing={isEditing} size={size} />;
    
    case 'predictions':
      return <PredictionsWidget config={config} isEditing={isEditing} size={size} />;
    
    case 'stats':
      return <StatsWidget config={config} isEditing={isEditing} size={size} />;
    
    case 'recent_services':
      return <RecentServicesWidget config={config} isEditing={isEditing} size={size} />;
    
    case 'access_shortcuts':
      return <AccessShortcutsWidget config={config} isEditing={isEditing} size={size} />;
    
    case 'advanced_tools':
      return <AdvancedToolsWidget config={config} isEditing={isEditing} size={size} />;
    
    case 'help':
      return <HelpWidget config={config} isEditing={isEditing} size={size} />;

    // Widgets de estadísticas
    case 'stats_card':
      return <StatsCardWidget config={config} isEditing={isEditing} size={size} />;
    
    case 'revenue_summary':
      return <RevenueSummaryWidget config={config} isEditing={isEditing} size={size} />;
    
    case 'payment_status':
      return <PaymentStatusWidget config={config} isEditing={isEditing} size={size} />;

    // Widgets de listas
    case 'recent_clients':
      return <RecentClientsWidget config={config} isEditing={isEditing} size={size} />;
    
    case 'recent_invoices':
      return <RecentInvoicesWidget config={config} isEditing={isEditing} size={size} />;
    
    case 'upcoming_appointments':
      return <UpcomingAppointmentsWidget config={config} isEditing={isEditing} size={size} />;
    
    case 'inventory_alerts':
      return <InventoryAlertsWidget config={config} isEditing={isEditing} size={size} />;

    // Widgets de utilidades
    case 'calendar':
      return <CalendarWidget config={config} isEditing={isEditing} size={size} />;
    
    case 'tasks':
      return <TasksWidget config={config} isEditing={isEditing} size={size} />;
    
    case 'map':
      return <MapWidget config={config} isEditing={isEditing} size={size} />;
    
    case 'shortcuts':
      return <AccessShortcutsWidget config={config} isEditing={isEditing} size={size} />;

    // Widgets de gráficos
    case 'chart_line':
      return <ChartLineWidget config={config} isEditing={isEditing} size={size} />;
    
    case 'chart_bar':
      return <ChartBarWidget config={config} isEditing={isEditing} size={size} />;
    
    case 'chart_pie':
      return <ChartPieWidget config={config} isEditing={isEditing} size={size} />;
    
    case 'chart_area':
      return (
        <View style={[styles.placeholderContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
            Gráfico de Área
          </ThemedText>
          <ThemedText style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
            Próximamente
          </ThemedText>
        </View>
      );

    // Widget desconocido
    default:
      return (
        <View style={[styles.placeholderContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
            Widget: {type}
          </ThemedText>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    padding: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
