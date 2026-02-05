/**
 * ChartLineWidget - Widget de gráfico de líneas del dashboard
 * Muestra gráficos de ingresos por período
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useServicesData } from '@/hooks/data';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface WidgetProps {
  config?: Record<string, any>;
  isEditing?: boolean;
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall' | 'full';
}

export const ChartLineWidget = React.memo(function ChartLineWidget({ config, isEditing }: WidgetProps) {
  const { colors } = useTheme();
  const { services } = useServicesData();
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  // Calcular datos para el gráfico según el período
  const chartData = useMemo(() => {
    const now = new Date();
    let labels: string[] = [];
    let data: number[] = [];

    if (period === 'week') {
      // Últimos 7 días
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayServices = services.filter(s => {
          const serviceDate = new Date(s.date);
          return serviceDate.toDateString() === date.toDateString();
        });
        labels.push(['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][date.getDay()]);
        data.push(dayServices.reduce((sum, s) => sum + (s.cost || 0), 0));
      }
    } else if (period === 'month') {
      // Últimas 4 semanas
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i * 7 + 7));
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - (i * 7));
        
        const weekServices = services.filter(s => {
          const serviceDate = new Date(s.date);
          return serviceDate >= weekStart && serviceDate <= weekEnd;
        });
        
        labels.push(`S${4-i}`);
        data.push(weekServices.reduce((sum, s) => sum + (s.cost || 0), 0));
      }
    } else {
      // Últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now);
        monthDate.setMonth(monthDate.getMonth() - i);
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        
        const monthServices = services.filter(s => {
          const serviceDate = new Date(s.date);
          return serviceDate >= monthStart && serviceDate <= monthEnd;
        });
        
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        labels.push(monthNames[monthDate.getMonth()]);
        data.push(monthServices.reduce((sum, s) => sum + (s.cost || 0), 0));
      }
    }

    return { labels, data };
  }, [services, period]);

  const chartConfig = useMemo(() => ({
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) => colors.textSecondary,
    style: {
      borderRadius: 4,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#10B981',
    },
  }), [colors]);

  if (isEditing) {
    return (
      <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
        <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Vista previa de Gráfico de Líneas
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
      {/* Header con selector de período */}
      <View style={styles.chartHeader}>
        <ThemedText style={[styles.chartTitle, { color: colors.text }]}>
          Ingresos
        </ThemedText>
        <View style={styles.periodSelector}>
          <Pressable
            style={[styles.periodButton, period === 'week' && { backgroundColor: colors.primary }]}
            onPress={() => setPeriod('week')}
          >
            <ThemedText style={[styles.periodButtonText, { color: period === 'week' ? '#fff' : colors.textSecondary }]}>
              Semana
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.periodButton, period === 'month' && { backgroundColor: colors.primary }]}
            onPress={() => setPeriod('month')}
          >
            <ThemedText style={[styles.periodButtonText, { color: period === 'month' ? '#fff' : colors.textSecondary }]}>
              Mes
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.periodButton, period === 'year' && { backgroundColor: colors.primary }]}
            onPress={() => setPeriod('year')}
          >
            <ThemedText style={[styles.periodButtonText, { color: period === 'year' ? '#fff' : colors.textSecondary }]}>
              Año
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Gráfico */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <LineChart
          data={{
            labels: chartData.labels,
            datasets: [{ data: chartData.data }],
          }}
          width={Math.max(SCREEN_WIDTH - 80, chartData.labels.length * 60)}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </ScrollView>
    </View>
  );
});
const styles = StyleSheet.create({
  widgetContent: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  periodButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 4,
  },
});