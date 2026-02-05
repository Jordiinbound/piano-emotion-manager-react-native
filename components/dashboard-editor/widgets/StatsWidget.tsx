/**
 * StatsWidget - Widget de estadísticas mensuales del dashboard
 * Muestra estadísticas del mes con navegación entre meses
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useClientsData, usePianosData, useServicesData } from '@/hooks/data';

interface WidgetProps {
  config?: Record<string, any>;
  isEditing?: boolean;
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall' | 'full';
}

const MONTHS_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export const StatsWidget = React.memo(function StatsWidget({ config, isEditing }: WidgetProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { services } = useServicesData();
  const { clients } = useClientsData();
  const { pianos } = usePianosData();
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Calcular título del mes
  const monthTitle = useMemo(() => {
    const now = new Date();
    const isCurrentMonth = selectedMonth.getMonth() === now.getMonth() && 
                          selectedMonth.getFullYear() === now.getFullYear();
    if (isCurrentMonth) {
      return 'Este Mes';
    }
    const monthName = MONTHS_SHORT[selectedMonth.getMonth()];
    return `${monthName} ${selectedMonth.getFullYear()}`;
  }, [selectedMonth]);

  // Calcular estadísticas del mes seleccionado
  const stats = useMemo(() => {
    const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);

    const monthlyServices = services.filter(s => {
      const serviceDate = new Date(s.date);
      return serviceDate >= monthStart && serviceDate <= monthEnd;
    });
    
    const monthlyRevenue = monthlyServices.reduce((sum, s) => sum + (s.cost || 0), 0);

    return [
      {
        id: 'services',
        icon: 'construct',
        color: '#F59E0B',
        label: 'Servicios',
        value: monthlyServices.length,
      },
      {
        id: 'revenue',
        icon: 'cash',
        color: '#10B981',
        label: 'Ingresos',
        value: `${monthlyRevenue.toFixed(0)}€`,
      },
      {
        id: 'clients',
        icon: 'people',
        color: '#3B82F6',
        label: 'Clientes',
        value: clients.length,
      },
      {
        id: 'pianos',
        icon: 'musical-notes',
        color: '#8B5CF6',
        label: 'Pianos',
        value: pianos.length,
      },
    ];
  }, [services, clients, pianos, selectedMonth]);

  // Navegación entre meses
  const handlePreviousMonth = () => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const handleGoToCurrentMonth = () => {
    setSelectedMonth(new Date());
  };

  const handleGoToCalendar = () => {
    if (!isEditing) {
      router.push('/agenda' as any);
    }
  };

  return (
    <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
      {/* Header con navegación de meses */}
      <View style={styles.statsHeader}>
        <ThemedText style={[styles.statsTitle, { color: colors.text }]}>
          {monthTitle}
        </ThemedText>
        <View style={styles.monthNavigation}>
          <Pressable 
            onPress={handlePreviousMonth} 
            style={styles.monthNavButton}
            disabled={isEditing}
          >
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
          </Pressable>
          <Pressable 
            onPress={handleGoToCurrentMonth} 
            style={[styles.todayButton, { borderColor: colors.primary }]}
            disabled={isEditing}
          >
            <ThemedText style={[styles.todayButtonText, { color: colors.primary }]}>Hoy</ThemedText>
          </Pressable>
          <Pressable 
            onPress={handleNextMonth} 
            style={styles.monthNavButton}
            disabled={isEditing}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>
          <Pressable 
            onPress={handleGoToCalendar} 
            style={[styles.calendarButton, { backgroundColor: colors.primary }]}
            disabled={isEditing}
          >
            <Ionicons name="calendar" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Grid de estadísticas */}
      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View key={stat.id} style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: `${stat.color}15` }]}>
              <Ionicons name={stat.icon as any} size={20} color={stat.color} />
            </View>
            <ThemedText style={[styles.statValue, { color: colors.text }]}>
              {stat.value}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
              {stat.label}
            </ThemedText>
          </View>
        ))}
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
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monthNavButton: {
    padding: 4,
  },
  todayButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  todayButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  calendarButton: {
    padding: 6,
    borderRadius: 4,
    marginLeft: 4,
  },
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
});