/**
 * CalendarWidget - Widget de calendario del dashboard
 * Muestra las citas del día actual
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAppointmentsData } from '@/hooks/data';

interface WidgetProps {
  config?: Record<string, any>;
  isEditing?: boolean;
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall' | 'full';
}

export const CalendarWidget = React.memo(function CalendarWidget({ config, isEditing }: WidgetProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { appointments } = useAppointmentsData();

  const todayAppointments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate >= today && aptDate < tomorrow;
    });
  }, [appointments]);

  const handleCalendarPress = () => {
    if (!isEditing) {
      router.push('/agenda' as any);
    }
  };

  if (isEditing) {
    return (
      <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
        <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Vista previa de Calendario
        </ThemedText>
      </View>
    );
  }

  return (
    <Pressable 
      style={[styles.widgetContent, { backgroundColor: colors.card }]}
      onPress={handleCalendarPress}
    >
      <View style={styles.calendarHeader}>
        <Ionicons name="calendar" size={24} color={colors.primary} />
        <ThemedText style={[styles.calendarTitle, { color: colors.text }]}>
          Hoy
        </ThemedText>
      </View>
      
      {todayAppointments.length === 0 ? (
        <View style={styles.calendarEmpty}>
          <ThemedText style={{ color: colors.textSecondary }}>
            No hay citas hoy
          </ThemedText>
        </View>
      ) : (
        <View style={styles.calendarAppointments}>
          <ThemedText style={[styles.calendarCount, { color: colors.primary }]}>
            {todayAppointments.length} cita{todayAppointments.length > 1 ? 's' : ''}
          </ThemedText>
          <ThemedText style={[styles.calendarSubtext, { color: colors.textSecondary }]}>
            Toca para ver detalles
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
});
const styles = StyleSheet.create({
  widgetContent: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  calendarEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarAppointments: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarCount: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  calendarSubtext: {
    fontSize: 12,
  },
});