/**
 * StatsCardWidget - Widget de tarjeta de estadística individual
 * Muestra una métrica específica en formato de tarjeta
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useClientsData, usePianosData, useServicesData } from '@/hooks/data';
import { useInvoices } from '@/hooks/use-invoices';

interface WidgetProps {
  config?: Record<string, any>;
  isEditing?: boolean;
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall' | 'full';
}

export const StatsCardWidget = React.memo(function StatsCardWidget({ config, isEditing }: WidgetProps) {
  const { colors } = useTheme();
  const { services } = useServicesData();
  const { clients } = useClientsData();
  const { pianos } = usePianosData();
  const { invoices } = useInvoices();

  // Determinar qué métrica mostrar según la configuración
  const metric = config?.metric || 'monthly_revenue';

  const statData = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyServices = services.filter(s => new Date(s.date) >= thisMonth);
    const monthlyRevenue = monthlyServices.reduce((sum, s) => sum + (s.cost || 0), 0);

    switch (metric) {
      case 'monthly_revenue':
        return {
          icon: 'cash',
          color: '#10B981',
          label: 'Ingresos del mes',
          value: `${monthlyRevenue.toFixed(0)}€`,
        };
      case 'services_count':
        return {
          icon: 'construct',
          color: '#F59E0B',
          label: 'Servicios',
          value: monthlyServices.length,
        };
      case 'active_clients':
        return {
          icon: 'people',
          color: '#3B82F6',
          label: 'Clientes activos',
          value: clients.length,
        };
      case 'total_pianos':
        return {
          icon: 'musical-notes',
          color: '#8B5CF6',
          label: 'Pianos',
          value: pianos.length,
        };
      case 'pending_invoices':
        const pending = invoices.filter(i => i.status === 'sent');
        return {
          icon: 'document-text',
          color: '#EF4444',
          label: 'Facturas pendientes',
          value: pending.length,
        };
      default:
        return {
          icon: 'stats-chart',
          color: '#64748B',
          label: 'Estadística',
          value: '0',
        };
    }
  }, [metric, services, clients, pianos, invoices]);

  return (
    <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
      <View style={styles.statsCardContainer}>
        <View style={[styles.statsCardIcon, { backgroundColor: `${statData.color}15` }]}>
          <Ionicons name={statData.icon as any} size={28} color={statData.color} />
        </View>
        <ThemedText style={[styles.statsCardValue, { color: colors.text }]}>
          {statData.value}
        </ThemedText>
        <ThemedText style={[styles.statsCardLabel, { color: colors.textSecondary }]}>
          {statData.label}
        </ThemedText>
      </View>
    </View>
  );
});
const styles = StyleSheet.create({
  widgetContent: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
  },
  statsCardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statsCardValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  statsCardLabel: {
    fontSize: 13,
    textAlign: 'center',
  },
});