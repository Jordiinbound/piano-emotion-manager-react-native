/**
 * PredictionsWidget - Widget de predicciones IA del dashboard
 * Muestra proyecciones de ingresos y servicios basadas en análisis avanzado
 */

import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { trpc } from '@/lib/trpc';

interface WidgetProps {
  config?: Record<string, any>;
  isEditing?: boolean;
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall' | 'full';
}

export const PredictionsWidget = React.memo(function PredictionsWidget({ config, isEditing }: WidgetProps) {
  const { colors } = useTheme();
  
  // Usar la API de predicciones avanzadas
  const revenueQuery = trpc.advanced.predictions.getRevenue.useQuery(
    { months: 1 },
    { 
      enabled: !isEditing,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false 
    }
  );

  const churnQuery = trpc.advanced.predictions.getChurnRisk.useQuery(
    undefined,
    { 
      enabled: !isEditing,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false 
    }
  );

  const maintenanceQuery = trpc.advanced.predictions.getMaintenance.useQuery(
    undefined,
    { 
      enabled: !isEditing,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false 
    }
  );

  if (isEditing) {
    return (
      <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
        <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Vista previa de Predicciones IA
        </ThemedText>
      </View>
    );
  }

  // Mostrar loading mientras se cargan los datos
  if (revenueQuery.isLoading || churnQuery.isLoading || maintenanceQuery.isLoading) {
    return (
      <View style={[styles.widgetContent, { backgroundColor: colors.card }, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Preparar las predicciones desde la API
  const predictions = [];

  // Predicción de ingresos
  if (revenueQuery.data && revenueQuery.data.length > 0) {
    const nextMonth = revenueQuery.data[0];
    const trendColor = nextMonth.trend === 'up' ? '#10B981' : nextMonth.trend === 'down' ? '#EF4444' : '#F59E0B';
    const trendIcon = nextMonth.trend === 'up' ? 'trending-up' : nextMonth.trend === 'down' ? 'trending-down' : 'remove';
    
    predictions.push({
      id: 'revenue-prediction',
      icon: trendIcon,
      color: trendColor,
      title: 'Proyección de ingresos',
      value: `${nextMonth.value.toFixed(0)}€`,
      subtitle: `${nextMonth.confidence}% confianza • ${nextMonth.period}`,
    });
  }

  // Clientes en riesgo
  if (churnQuery.data && churnQuery.data.length > 0) {
    const highRiskClients = churnQuery.data.filter(c => c.riskScore >= 70).length;
    predictions.push({
      id: 'churn-risk',
      icon: 'warning',
      color: highRiskClients > 0 ? '#F59E0B' : '#10B981',
      title: 'Clientes en riesgo',
      value: highRiskClients,
      subtitle: highRiskClients > 0 ? 'Requieren atención' : 'Todo bajo control',
    });
  }

  // Mantenimientos próximos
  if (maintenanceQuery.data && maintenanceQuery.data.length > 0) {
    predictions.push({
      id: 'maintenance-upcoming',
      icon: 'construct',
      color: '#3B82F6',
      title: 'Mant. próximo',
      value: maintenanceQuery.data.length,
      subtitle: 'Servicios previstos',
    });
  }

  // Si no hay datos, mostrar mensaje
  if (predictions.length === 0) {
    return (
      <View style={[styles.widgetContent, { backgroundColor: colors.card }, styles.centerContent]}>
        <Ionicons name="analytics-outline" size={32} color={colors.textSecondary} />
        <ThemedText style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
          Datos insuficientes para predicciones
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
      {predictions.map((prediction) => (
        <View key={prediction.id} style={styles.predictionItem}>
          <View style={[styles.predictionIcon, { backgroundColor: `${prediction.color}15` }]}>
            <Ionicons name={prediction.icon as any} size={24} color={prediction.color} />
          </View>
          <View style={styles.predictionContent}>
            <ThemedText style={[styles.predictionTitle, { color: colors.textSecondary }]}>
              {prediction.title}
            </ThemedText>
            <ThemedText style={[styles.predictionValue, { color: colors.text }]}>
              {prediction.value}
            </ThemedText>
            <ThemedText style={[styles.predictionSubtitle, { color: colors.textSecondary }]}>
              {prediction.subtitle}
            </ThemedText>
          </View>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  widgetContent: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  predictionItem: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 12,
    borderRadius: 4,
  },
  predictionIcon: {
    width: 48,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  predictionContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  predictionTitle: {
    fontSize: 12,
    marginBottom: 4,
  },
  predictionValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  predictionSubtitle: {
    fontSize: 11,
  },
});
