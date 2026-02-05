/**
 * ChartBarWidget - Widget de gráfico de barras del dashboard
 * Muestra top clientes por ingresos
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useClientsData, useServicesData } from '@/hooks/data';
import { getClientFullName } from '@/types';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface WidgetProps {
  config?: Record<string, any>;
  isEditing?: boolean;
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall' | 'full';
}

export const ChartBarWidget = React.memo(function ChartBarWidget({ config, isEditing }: WidgetProps) {
  const { colors } = useTheme();
  const { services } = useServicesData();
  const { clients } = useClientsData();

  // Top 5 clientes por ingresos
  const chartData = useMemo(() => {
    const clientRevenue = new Map<string, { name: string; revenue: number }>();

    // Crear un mapa de clientes para búsqueda O(1)
    const clientsMap = new Map(clients.map(c => [c.id, c]));
    
    services.forEach(service => {
      const client = clientsMap.get(service.clientId);
      if (client) {
        const clientName = getClientFullName(client);
        const current = clientRevenue.get(service.clientId) || { name: clientName, revenue: 0 };
        current.revenue += service.cost || 0;
        clientRevenue.set(service.clientId, current);
      }
    });

    const topClients = Array.from(clientRevenue.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      labels: topClients.map(c => c.name.split(' ')[0]), // Solo primer nombre
      data: topClients.map(c => c.revenue),
    };
  }, [services, clients]);

  const chartConfig = useMemo(() => ({
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => colors.textSecondary,
    style: {
      borderRadius: 4,
    },
  }), [colors]);

  if (isEditing) {
    return (
      <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
        <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Vista previa de Gráfico de Barras
        </ThemedText>
      </View>
    );
  }

  if (chartData.data.length === 0) {
    return (
      <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
        <View style={styles.emptyState}>
          <Ionicons name="bar-chart-outline" size={32} color={colors.textSecondary} />
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
          Top Clientes
        </ThemedText>
      </View>

      {/* Gráfico */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <BarChart
          data={{
            labels: chartData.labels,
            datasets: [{ data: chartData.data }],
          }}
          width={Math.max(SCREEN_WIDTH - 80, chartData.labels.length * 80)}
          height={200}
          chartConfig={chartConfig}
          style={styles.chart}
          showValuesOnTopOfBars
          fromZero
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
  chart: {
    marginVertical: 8,
    borderRadius: 4,
  },
});