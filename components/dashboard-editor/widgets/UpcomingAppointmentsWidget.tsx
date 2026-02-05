/**
 * UpcomingAppointmentsWidget - Widget de próximas citas del dashboard
 * Muestra las próximas citas agendadas
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useClientsData, useAppointmentsData } from '@/hooks/data';
import { getClientFullName } from '@/types';

interface WidgetProps {
  config?: Record<string, any>;
  isEditing?: boolean;
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall' | 'full';
}

export const UpcomingAppointmentsWidget = React.memo(function UpcomingAppointmentsWidget({ config, isEditing }: WidgetProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { appointments } = useAppointmentsData();
  const { clients } = useClientsData();

  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    // Crear un mapa de clientes para búsqueda O(1)
    const clientsMap = new Map(clients.map(c => [c.id, c]));
    
    return appointments
      .filter(apt => new Date(apt.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, config?.limit || 5)
      .map(apt => {
        const client = clientsMap.get(apt.clientId);
        return {
          ...apt,
          clientName: client ? getClientFullName(client) : 'Cliente desconocido',
        };
      });
  }, [appointments, clients, config]);

  const handleAppointmentPress = (appointmentId: string) => {
    if (!isEditing) {
      router.push(`/agenda/${appointmentId}` as any);
    }
  };

  const formatDateTime = (date: string, time: string) => {
    const d = new Date(date);
    return `${d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} • ${time}`;
  };

  if (isEditing) {
    return (
      <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
        <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Vista previa de Próximas Citas
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
      {upcomingAppointments.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={32} color={colors.textSecondary} />
          <ThemedText style={{ color: colors.textSecondary, marginTop: 8 }}>
            No hay citas próximas
          </ThemedText>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {upcomingAppointments.map((appointment) => (
            <Pressable
              key={appointment.id}
              style={[styles.listItem, { borderBottomColor: colors.border }]}
              onPress={() => handleAppointmentPress(appointment.id)}
            >
              <View style={[styles.listItemIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="calendar" size={20} color={colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <ThemedText style={[styles.listItemTitle, { color: colors.text }]}>
                  {appointment.clientName}
                </ThemedText>
                <ThemedText style={[styles.listItemSubtitle, { color: colors.textSecondary }]}>
                  {formatDateTime(appointment.date, appointment.time)}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>
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