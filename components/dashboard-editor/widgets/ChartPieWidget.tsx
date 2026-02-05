/**
 * ChartPieWidget - Widget de gráfico circular del dashboard
 * Muestra distribución de servicios por tipo
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useServicesData } from '@/hooks/data';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface WidgetProps {
  config?: Record<string, any>;
  isEditing?: boolean;
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall' | 'full';
}

export const ChartPieWidget = React.memo(function ChartPieWidget({ config, isEditing }: WidgetProps) {
  const { colors } = useTheme();
  const { services } = useServicesData();

  // Distribución de servicios por tipo
  const chartData = useMemo(() => {
    const serviceTypes = new Map<string, number>();

    services.forEach(service => {
      const type = service.type || 'Otros';
      serviceTypes.set(type, (serviceTypes.get(type) || 0) + 1);
    });

    const pieColors = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#6366F1'];
    
    return Array.from(serviceTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count], index) => ({
        name,
        count,
        color: pieColors[index],
        legendFontColor: colors.textSecondary,
        legendFontSize: 12,
      }));
  }, [services, colors]);

  const chartConfig = {
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  };

  if (isEditing) {
    return (
      <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
        <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Vista previa de Gráfico Circular
        </ThemedText>
      </View>
    );
  }

  if (chartData.length === 0) {
    return (
      <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
        <View style={styles.emptyState}>
          <Ionicons name="pie-chart-outline" size={32} color={colors.textSecondary} />
          <ThemedText style={{ color: colors.textSecondary, marginTop: 8 }}>
            No hay datos suficientes
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.chartHeader}>
        <ThemedText style={[styles.chartTitle, { color: colors.text }]}>
          Tipos de Servicio
        </ThemedText>
      </View>

      {/* Gráfico */}
      <PieChart
        data={chartData}
        width={SCREEN_WIDTH - 80}
        height={200}
        chartConfig={chartConfig}
        accessor="count"
        backgroundColor="transparent"
        paddingLeft="0"
        center={[10, 0]}
        absolute
      />
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
});