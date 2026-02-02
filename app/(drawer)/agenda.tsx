console.log('[agenda.tsx (drawer)] ===== ARCHIVO CARGADO =====');

import React from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { useRouter, usePathname } from 'expo-router';
import { useMemo, useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useHeader } from '@/contexts/HeaderContext';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { CalendarView } from '@/components/calendar-view';
import { EmptyState } from '@/components/cards';
import { FAB } from '@/components/fab';
import { RouteOptimizer } from '@/components/route-optimizer';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useClientsData, usePianosData, useAppointmentsData } from '@/hooks/data';
import { Appointment, APPOINTMENT_STATUS_LABELS } from '@/types/business';
import { formatDate, getClientFullName } from '@/types';

console.log('[agenda.tsx (drawer)] ===== COMPONENTE DEFINIDO =====');

export default function AgendaScreen() {
  console.log('[AgendaScreen (drawer)] ===== COMPONENTE EJECUTÁNDOSE =====');
  const router = useRouter();
  console.log('[AgendaScreen] ✅ router OK');
  const pathname = usePathname();
  console.log('[AgendaScreen] ✅ pathname OK:', pathname);
  const { t } = useTranslation();
  console.log('[AgendaScreen] ✅ translation OK');
  const { setHeaderConfig } = useHeader();
  console.log('[AgendaScreen] ✅ header OK');
  const insets = useSafeAreaInsets();
  console.log('[AgendaScreen] ✅ insets OK');
  const { appointments, loading, total, stats } = useAppointmentsData();
  console.log('[AgendaScreen] ✅ appointments OK:', appointments?.length);
  const { getClient } = useClientsData();
  console.log('[AgendaScreen] ✅ getClient OK:', typeof getClient);
  const { getPiano } = usePianosData();
  console.log('[AgendaScreen] ✅ getPiano OK:', typeof getPiano);

  const accent = useThemeColor({}, 'accent');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const error = useThemeColor({}, 'error');
  console.log('[AgendaScreen] ✅ theme colors OK');

  // Estado para el mes seleccionado en el calendario (DEBE estar antes de useMemo)
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(true);
  console.log('[AgendaScreen] ✅ state OK');

  // Agrupar citas por fecha (filtradas por mes seleccionado)
  const groupedAppointments = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const groups: { date: string; label: string; appointments: Appointment[] }[] = [];

    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = selectedDate.getMonth();
    
    console.log('🔍 [AgendaScreen] Total appointments recibidas:', appointments.length);
    console.log('🔍 [AgendaScreen] Mes seleccionado:', selectedYear, selectedMonth + 1);

    // Ordenar por fecha y hora
    const sorted = [...appointments].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });

    // Filtrar por mes seleccionado
    const monthStart = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const monthEnd = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const upcoming = sorted.filter((a) => a.date >= monthStart && a.date <= monthEnd && a.status !== 'cancelled');
    
    console.log('🔍 [AgendaScreen] Appointments futuras después de filtrar:', upcoming.length);

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
  }, [appointments, selectedDate]);

  // Calcular total de citas del mes seleccionado
  const totalCount = useMemo(() => {
    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = selectedDate.getMonth();
    
    return appointments.filter((a: Appointment) => {
      const aptDate = new Date(a.date);
      return aptDate.getFullYear() === selectedYear && aptDate.getMonth() === selectedMonth;
    }).length;
  }, [appointments, selectedDate]);
  
  const pendingCount = stats?.pending || appointments.filter((a: Appointment) => a.status !== 'cancelled' && a.status !== 'completed').length;

  // Citas de hoy para el optimizador de rutas
  const todayAppointments = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return appointments
      .filter(a => a.date === today && a.status !== 'cancelled' && a.status !== 'completed')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [appointments]);

  // Configurar header con acciones - useFocusEffect para actualización al recibir foco
  useFocusEffect(
    React.useCallback(() => {
    setHeaderConfig({
      title: 'Agenda',
      subtitle: `${totalCount} ${totalCount === 1 ? 'cita' : 'citas'}`,
      icon: 'calendar',
      showBackButton: false,
      rightAction: (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/settings/calendar-settings' as any);
            }}
            style={[{ padding: 8, borderRadius: 8, backgroundColor: `${accent}15` }]}
          >
            <IconSymbol name="gearshape.fill" size={20} color="#ffffff" />
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowCalendar(!showCalendar);
            }}
            style={[{ padding: 8, borderRadius: 8, backgroundColor: `${accent}15` }]}
          >
            <IconSymbol name={showCalendar ? 'list.bullet' : 'calendar'} size={20} color="#ffffff" />
          </Pressable>
        </View>
      ),
    });
    }, [totalCount, showCalendar, accent, router, setHeaderConfig])
  );

  // Convertir citas a eventos para el calendario (todas las fechas)
  const calendarEvents = useMemo(() => {
    console.log('🔍 [AgendaScreen] Total appointments para calendario:', appointments.length);
    console.log('🔍 [AgendaScreen] Primeras 3 fechas para calendario:', appointments.slice(0, 3).map(a => a.date));
    
    return appointments.map((apt) => {
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
    
    // Debug: Log de clientes desconocidos
    if (!client) {
      console.log('⚠️ Cliente desconocido:', {
        appointmentId: appointment.id,
        clientId: appointment.clientId,
        date: appointment.date,
        startTime: appointment.startTime
      });
    }
    
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
      colors={['#F8F9FA', '#EEF2F7', '#E8EDF5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >


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
            onMonthChange={(date) => setSelectedDate(date)}
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
    paddingTop: Spacing.md,
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
    borderRadius: 8,
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
    borderRadius: 4,
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
