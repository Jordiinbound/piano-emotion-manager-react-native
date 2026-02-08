import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { trpc } from '../../utils/trpc';
import { Ionicons } from '@expo/vector-icons';

/**
 * Dashboard de Uso de Maps API
 * Muestra estadísticas de consumo y permite actualizar el plan
 */
export default function MapsApiUsageScreen() {
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro' | null>(null);

  // Queries
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.mapsApi.getUsageStats.useQuery();
  const { data: plansData, isLoading: plansLoading } = trpc.mapsApi.getPlans.useQuery();

  // Mutations
  const updatePlanMutation = trpc.mapsApi.updatePlan.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Plan actualizado correctamente');
      refetchStats();
      setSelectedPlan(null);
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleUpdatePlan = (plan: 'basic' | 'pro') => {
    Alert.alert(
      'Confirmar cambio de plan',
      `¿Estás seguro de que quieres cambiar al plan ${plan === 'basic' ? 'Básico' : 'Pro'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            updatePlanMutation.mutate({ plan });
          },
        },
      ]
    );
  };

  if (statsLoading || plansLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e07a5f" />
        <Text style={styles.loadingText}>Cargando estadísticas...</Text>
      </View>
    );
  }

  const plans = plansData?.plans || [];
  const currentPlan = stats?.plan || 'basic';
  const usagePercentage = stats?.percentage || 0;
  const isNearLimit = usagePercentage >= 80;
  const isOverLimit = usagePercentage >= 100;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Uso de Maps API</Text>
        <Text style={styles.subtitle}>
          Gestiona tu consumo de Google Maps
        </Text>
      </View>

      {/* Estadísticas Principales */}
      <View style={styles.statsCard}>
        <View style={styles.statsHeader}>
          <Ionicons name="map" size={24} color="#e07a5f" />
          <Text style={styles.statsTitle}>Resumen del Mes</Text>
        </View>

        {/* Barra de Progreso */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, usagePercentage)}%`,
                  backgroundColor: isOverLimit
                    ? '#dc3545'
                    : isNearLimit
                    ? '#ffc107'
                    : '#28a745',
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {stats?.used || 0} / {stats?.limit || 0} requests ({usagePercentage}%)
          </Text>
        </View>

        {/* Detalles */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Plan Actual</Text>
            <Text style={styles.statValue}>
              {currentPlan === 'basic' ? 'Básico' : 'Pro'}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Requests Restantes</Text>
            <Text style={[styles.statValue, isNearLimit && styles.statWarning]}>
              {stats?.remaining || 0}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Límite Mensual</Text>
            <Text style={styles.statValue}>{stats?.limit || 0}</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Último Reset</Text>
            <Text style={styles.statValueSmall}>
              {stats?.lastResetDate
                ? new Date(stats.lastResetDate).toLocaleDateString('es-ES')
                : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Alertas */}
        {isOverLimit && (
          <View style={[styles.alert, styles.alertDanger]}>
            <Ionicons name="warning" size={20} color="#dc3545" />
            <Text style={styles.alertText}>
              Has alcanzado tu límite mensual. Actualiza tu plan para continuar.
            </Text>
          </View>
        )}

        {isNearLimit && !isOverLimit && (
          <View style={[styles.alert, styles.alertWarning]}>
            <Ionicons name="alert-circle" size={20} color="#ffc107" />
            <Text style={styles.alertText}>
              Estás cerca de alcanzar tu límite mensual ({usagePercentage}%).
            </Text>
          </View>
        )}
      </View>

      {/* Uso por Tipo de Request */}
      {stats?.usageByType && stats.usageByType.length > 0 && (
        <View style={styles.usageCard}>
          <Text style={styles.cardTitle}>Uso por Tipo de Request</Text>
          {stats.usageByType.map((usage, index) => (
            <View key={index} style={styles.usageRow}>
              <Text style={styles.usageType}>{usage.type}</Text>
              <View style={styles.usageStats}>
                <Text style={styles.usageCount}>{usage.count} requests</Text>
                <Text style={styles.usageCost}>Costo: {usage.cost}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Planes Disponibles */}
      <View style={styles.plansCard}>
        <Text style={styles.cardTitle}>Planes Disponibles</Text>
        {plans.map((plan) => {
          const isCurrentPlan = plan.id === currentPlan;
          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                isCurrentPlan && styles.planCardActive,
              ]}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                {isCurrentPlan && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Actual</Text>
                  </View>
                )}
              </View>

              <Text style={styles.planLimit}>
                {plan.limit.toLocaleString()} requests/mes
              </Text>

              {plan.price > 0 && (
                <Text style={styles.planPrice}>
                  +€{plan.price}/mes
                </Text>
              )}

              <View style={styles.planFeatures}>
                {plan.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {!isCurrentPlan && (
                <TouchableOpacity
                  style={styles.planButton}
                  onPress={() => handleUpdatePlan(plan.id as 'basic' | 'pro')}
                  disabled={updatePlanMutation.isPending}
                >
                  {updatePlanMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.planButtonText}>
                      {plan.id === 'pro' ? 'Actualizar a Pro' : 'Cambiar a Básico'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>

      {/* Costos de Operaciones */}
      <View style={styles.costsCard}>
        <Text style={styles.cardTitle}>Costo de Operaciones</Text>
        <Text style={styles.costsSubtitle}>
          Cada tipo de operación consume un número diferente de requests:
        </Text>
        {plansData?.costs && (
          <View style={styles.costsGrid}>
            {Object.entries(plansData.costs).map(([key, value]) => (
              <View key={key} style={styles.costRow}>
                <Text style={styles.costName}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </Text>
                <Text style={styles.costValue}>{value} request(s)</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statsCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  statItem: {
    width: '50%',
    padding: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statValueSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statWarning: {
    color: '#ffc107',
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    marginTop: 16,
  },
  alertDanger: {
    backgroundColor: '#f8d7da',
  },
  alertWarning: {
    backgroundColor: '#fff3cd',
  },
  alertText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  usageCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  usageType: {
    fontSize: 14,
    color: '#333',
    textTransform: 'capitalize',
  },
  usageStats: {
    alignItems: 'flex-end',
  },
  usageCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  usageCost: {
    fontSize: 12,
    color: '#666',
  },
  plansCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  planCard: {
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 12,
  },
  planCardActive: {
    borderColor: '#e07a5f',
    backgroundColor: '#fff5f3',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  currentBadge: {
    backgroundColor: '#e07a5f',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  planLimit: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e07a5f',
    marginBottom: 12,
  },
  planFeatures: {
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  planButton: {
    backgroundColor: '#e07a5f',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  planButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  costsCard: {
    margin: 16,
    marginTop: 0,
    marginBottom: 32,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  costsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  costsGrid: {
    marginTop: 8,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  costName: {
    fontSize: 14,
    color: '#333',
  },
  costValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e07a5f',
  },
});
