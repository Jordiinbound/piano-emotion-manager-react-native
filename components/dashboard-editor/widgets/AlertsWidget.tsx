/**
 * AlertsWidget - Widget de alertas del dashboard
 * Muestra alertas importantes como citas próximas, facturas pendientes y vencidas
 */

import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useServicesData, useAppointmentsData } from '@/hooks/data';
import { useInvoices } from '@/hooks/use-invoices';

interface WidgetProps {
  config?: Record<string, any>;
  isEditing?: boolean;
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall' | 'full';
}

export const AlertsWidget = React.memo(function AlertsWidget({ config, isEditing }: WidgetProps) {
  const { colors } = useTheme();
  const { services } = useServicesData();
  const { appointments } = useAppointmentsData();
  const { invoices } = useInvoices();

  const alerts = useMemo(() => {
    const result = [];
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Citas próximas (hoy y mañana)
    const upcomingAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate >= now && aptDate <= tomorrow;
    });

    if (upcomingAppointments.length > 0) {
      result.push({
        id: 'upcoming-appointments',
        type: 'info',
        icon: 'time',
        color: '#3B82F6',
        title: `${upcomingAppointments.length} cita${upcomingAppointments.length > 1 ? 's' : ''} próxima${upcomingAppointments.length > 1 ? 's' : ''}`,
        message: 'En las próximas 24 horas',
      });
    }

    // Facturas pendientes
    const pendingInvoices = invoices.filter(inv => inv.status === 'sent');
    if (pendingInvoices.length > 0) {
      const totalPending = pendingInvoices.reduce((sum, inv) => sum + inv.total, 0);
      result.push({
        id: 'pending-invoices',
        type: 'warning',
        icon: 'document-text',
        color: '#F59E0B',
        title: `${pendingInvoices.length} factura${pendingInvoices.length > 1 ? 's' : ''} pendiente${pendingInvoices.length > 1 ? 's' : ''}`,
        message: `Total: ${totalPending.toFixed(2)}€`,
      });
    }

    // Facturas vencidas
    const overdueInvoices = invoices.filter(inv => {
      if (inv.status !== 'sent') return false;
      const dueDate = new Date(inv.dueDate);
      return dueDate < now;
    });

    if (overdueInvoices.length > 0) {
      result.push({
        id: 'overdue-invoices',
        type: 'error',
        icon: 'alert-circle',
        color: '#EF4444',
        title: `${overdueInvoices.length} factura${overdueInvoices.length > 1 ? 's' : ''} vencida${overdueInvoices.length > 1 ? 's' : ''}`,
        message: 'Requiere atención inmediata',
      });
    }

    return result;
  }, [appointments, invoices]);

  if (isEditing) {
    return (
      <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
        <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Vista previa de Alertas
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
      {alerts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={32} color={colors.success} />
          <ThemedText style={{ color: colors.textSecondary, marginTop: 8 }}>
            No hay alertas
          </ThemedText>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {alerts.map((alert) => (
            <View
              key={alert.id}
              style={[
                styles.alertItem,
                { backgroundColor: `${alert.color}15`, borderLeftColor: alert.color },
              ]}
            >
              <Ionicons name={alert.icon as any} size={20} color={alert.color} />
              <View style={styles.alertContent}>
                <ThemedText style={[styles.alertTitle, { color: colors.text }]}>
                  {alert.title}
                </ThemedText>
                <ThemedText style={[styles.alertMessage, { color: colors.textSecondary }]}>
                  {alert.message}
                </ThemedText>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  widgetContent: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
  },
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
});