import { useTranslation } from '@/hooks/use-translation';
console.log('[agenda.tsx] ===== ARCHIVO CARGADO =====');
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { CalendarView } from '@/components/calendar-view';
import { EmptyState } from '@/components/cards';
import { FAB } from '@/components/fab';
import { RouteOptimizer } from '@/components/route-optimizer';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useClientsData, usePianosData, useAppointmentsData } from '@/hooks/data';
import { Appointment, APPOINTMENT_STATUS_LABELS } from '@/types/business';
import { formatDate, getClientFullName } from '@/types';

console.log('[agenda.tsx] ===== COMPONENTE DEFINIDO =====');

export default function AgendaScreen() {
  console.log('[AgendaScreen] ===== COMPONENTE EJECUTÁNDOSE =====');
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { appointments, loading } = useAppointmentsData();
  const clientsData = useClientsData();
  const pianosData = usePianosData();

  // Logging detallado para diagnosticar el problema
  console.log('[AgendaScreen] clientsData:', clientsData);
  console.log('[AgendaScreen] clientsData type:', typeof clientsData);
  console.log('[AgendaScreen] clientsData keys:', clientsData ? Object.keys(clientsData) : 'null');
  console.log('[AgendaScreen] getClient:', clientsData?.getClient);
  console.log('[AgendaScreen] getClient type:', typeof clientsData?.getClient);
  console.log('[AgendaScreen] pianosData:', pianosData);
  console.log('[AgendaScreen] pianosData type:', typeof pianosData);
  console.log('[AgendaScreen] pianosData keys:', pianosData ? Object.keys(pianosData) : 'null');
  console.log('[AgendaScreen] getPiano:', pianosData?.getPiano);
  console.log('[AgendaScreen] getPiano type:', typeof pianosData?.getPiano);

  // Verificación defensiva: si los hooks no devuelven funciones válidas, mostrar loading
  if (!clientsData?.getClient || !pianosData?.getPiano) {
    console.log('[AgendaScreen] Mostrando pantalla de carga porque las funciones no están disponibles');
    return (
      <LinearGradient
        colors={['#003a8c', '#001d4a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.container}
      >
        <ScreenHeader title="Agenda" subtitle="Cargando..." icon="calendar" showBackButton={true} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ThemedText>Cargando datos...</ThemedText>
        </View>
      </LinearGradient>
    );
  }

  console.log('[AgendaScreen] Funciones disponibles, continuando con el render');
  const { getClient } = clientsData;
  const { getPiano } = pianosData;

  const accent = useThemeColor({}, 'accent');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const error = useThemeColor({}, 'error');

  // Agrupar citas por fecha
  const groupedAppointments = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const groups: { date: string; label: string; appointments: Appointment[] }[] = [];

    // Ordenar por fecha y hora
    const sorted = [...appointments].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });

    // Filtrar solo citas futuras o de hoy
    const upcoming = sorted.filter((a) => a.date >= today && a.status !== 'cancelled');

    // Agrupar por fecha
    upcoming.forEach((apt) => {
      let group = groups.find((g) => g.date === apt.date);
      if (!group) {
        let label: string;
        if (apt.date === today) {
          label = t('appointments.today');
        } else {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          if (apt.date === tomorrow.toISOString().split('T')[0]) {
            label = t('appointments.tomorrow');
          } else {
            label = formatDate(apt.date);
          }
        }
        group = { date: apt.date, label, appointments: [] };
        groups.push(group);
      }
      group.appointments.push(apt);
    });

    return groups;
  }, [appointments]);

  const pendingCount = appointments.filter((a: Appointment) => a.status !== 'cancelled' && a.status !== 'completed').length;

  // Citas de hoy para el optimizador de rutas
  const todayAppointments = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return appointments
      .filter(a => a.date === today && a.status !== 'cancelled' && a.status !== 'completed')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [appointments]);

  const [showCalendar, setShowCalendar] = useState(true);

  // Convertir citas a eventos para el calendario
  const calendarEvents = useMemo(() => {
    // Verificación defensiva: si appointments está vacío, devolver array vacío
    if (!appointments || appointments.length === 0) {
      return [];
    }
    
    return appointments.map((apt) => {
      try {
        const client = getClient(apt.clientId);
        return {
          id: apt.id,
          date: apt.date,
          startTime: apt.startTime,
          endTime: apt.endTime,
          title: client ? getClientFullName(client) : 'Cliente',
          subtitle: apt.notes,
          status: apt.status,
        };
      } catch (error) {
        // Si hay error al obtener el cliente, devolver evento con título genérico
        console.warn('[calendarEvents] Error processing appointment:', apt.id, error);
        return {
          id: apt.id,
          date: apt.date,
          startTime: apt.startTime,
          endTime: apt.endTime,
          title: 'Cliente',
          subtitle: apt.notes,
          status: apt.status,
        };
      }
    });
  }, [appointments, getClient]);

  const handleCalendarEventPress = (event: { id: string }) => {
    router.push({
      pathname: '/appointment/[id]' as any,
      params: { id: event.id },
    });
  };

  const handleCalendarDatePress = (date: string) => {
    // Navegar a crear cita con fecha preseleccionada
    router.push({
      pathname: '/appointment/[id]' as any,
      params: { id: 'new', date },
    });
  };

  const handleAppointmentPress = (appointment: Appointment) => {
    router.push({
      pathname: '/appointment/[id]' as any,
      params: { id: appointment.id },
    });
  };

  const handleAddAppointment = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/appointment/[id]' as any,
      params: { id: 'new' },
    });
  };

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed':
        return success;
      case 'scheduled':
        return accent;
      case 'in_progress':
        return warning;
      case 'completed':
        return success;
      case 'cancelled':
      case 'no_show':
        return error;
      default:
        return textSecondary;
    }
  };

  const renderAppointment = (appointment: Appointment) => {
    const client = getClient(appointment.clientId);
    const piano = appointment.pianoId ? getPiano(appointment.pianoId) : null;
    const statusColor = getStatusColor(appointment.status);

    return (
      <Pressable
        key={appointment.id}
        style={[styles.appointmentCard, { backgroundColor: cardBg, borderColor }]}
        onPress={() => handleAppointmentPress(appointment)}
      >
        <View style={styles.timeColumn}>
          <ThemedText style={styles.timeText}>{appointment.startTime}</ThemedText>
          {appointment.endTime && (
            <ThemedText style={[styles.endTimeText, { color: textSecondary }]}>
              {appointment.endTime}
            </ThemedText>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: statusColor }]} />

        <View style={styles.contentColumn}>
          <ThemedText style={styles.clientName} numberOfLines={1}>
            {client ? getClientFullName(client) : 'Cliente desconocido'}
          </ThemedText>
          {piano && (
            <ThemedText style={[styles.pianoInfo, { color: textSecondary }]} numberOfLines={1}>
              {piano.brand} {piano.model}
            </ThemedText>
          )}
          <View style={styles.appointmentMeta}>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <ThemedText style={[styles.statusText, { color: statusColor }]}>
                {APPOINTMENT_STATUS_LABELS[appointment.status]}
              </ThemedText>
            </View>
            <ThemedText style={[styles.durationText, { color: textSecondary }]}>
              {appointment.estimatedDuration} min
            </ThemedText>
          </View>
        </View>

        <IconSymbol name="chevron.right" size={20} color={textSecondary} />
      </Pressable>
    );
  };

  return (
    <LinearGradient
      colors={['#003a8c', '#001d4a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <ScreenHeader 
        title="Agenda" 
        subtitle={`${pendingCount} ${pendingCount === 1 ? 'cita pendiente' : 'citas pendientes'}`}
        icon="calendar"
        showBackButton={true}
        rightAction={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/settings/calendar-settings' as any);
              }}
              style={[styles.toggleButton, { backgroundColor: `${accent}15` }]}
            >
              <IconSymbol
                name="gearshape.fill"
                size={20}
                color={accent}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowCalendar(!showCalendar);
              }}
              style={[styles.toggleButton, { backgroundColor: `${accent}15` }]}
            >
              <IconSymbol
                name={showCalendar ? 'list.bullet' : 'calendar'}
                size={20}
                color={accent}
              />
            </Pressable>
          </View>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Vista de Calendario */}
        {showCalendar && (
          <CalendarView
            events={calendarEvents}
            onEventPress={handleCalendarEventPress}
            onDatePress={handleCalendarDatePress}
          />
        )}

        {/* Optimizador de Rutas - Solo muestra citas de hoy */}
        {todayAppointments.length > 0 && (
          <RouteOptimizer
            appointments={todayAppointments}
            getClient={getClient}
            onAppointmentPress={handleAppointmentPress}
          />
        )}

        {/* Lista de citas */}
        {groupedAppointments.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="Sin citas programadas"
            message="Programa tu primera cita tocando el botón + abajo."
          />
        ) : (
          <>
            {groupedAppointments.map((group) => (
              <View key={group.date} style={styles.dateGroup}>
                <View style={styles.dateHeader}>
                  <ThemedText type="subtitle">{group.label}</ThemedText>
                  <ThemedText style={[styles.dateCount, { color: textSecondary }]}>
                    {group.appointments.length} {group.appointments.length === 1 ? 'cita' : 'citas'}
                  </ThemedText>
                </View>
                {group.appointments.map(renderAppointment)}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <FAB 
        onPress={handleAddAppointment} 
        accessibilityLabel="Añadir nueva cita"
        accessibilityHint="Pulsa para programar una nueva cita"
      />
    </LinearGradient>
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
    paddingHorizontal: Spacing.md,
    gap: Spacing.lg,
  },
  dateGroup: {
    gap: Spacing.sm,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  dateCount: {
    fontSize: 13,
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  timeColumn: {
    width: 50,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  endTimeText: {
    fontSize: 12,
  },
  divider: {
    width: 3,
    height: '100%',
    minHeight: 50,
    borderRadius: 2,
  },
  contentColumn: {
    flex: 1,
    gap: 2,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
  },
  pianoInfo: {
    fontSize: 13,
  },
  appointmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  durationText: {
    fontSize: 12,
  },
  toggleButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
});
