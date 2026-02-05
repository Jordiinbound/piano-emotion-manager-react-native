/**
 * Página de Uso de IA y Límites
 * Piano Emotion Manager
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc';

type AIFeature = 'chat' | 'email' | 'report' | 'prediction';

const FEATURE_INFO: Record<AIFeature, { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }> = {
  chat: { icon: 'chatbubbles', label: 'Chat con IA', color: '#3b82f6' },
  email: { icon: 'mail', label: 'Emails generados', color: '#10b981' },
  report: { icon: 'document-text', label: 'Informes generados', color: '#f59e0b' },
  prediction: { icon: 'analytics', label: 'Predicciones', color: '#8b5cf6' },
};

export default function UsageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Obtener uso de IA
  const { data: usage, isLoading, refetch } = trpc.usage.getAIUsage.useQuery();

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Uso de IA' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Cargando estadísticas...</Text>
        </View>
      </>
    );
  }

  const isPremium = usage?.plan === 'PREMIUM_IA';

  return (
    <>
      <Stack.Screen options={{ title: 'Uso de IA' }} />
      
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Header con plan actual */}
        <View style={styles.header}>
          <View style={styles.planBadge}>
            <Ionicons 
              name={isPremium ? 'diamond' : 'briefcase'} 
              size={20} 
              color={isPremium ? '#8b5cf6' : '#3b82f6'} 
            />
            <Text style={[styles.planText, isPremium && styles.planTextPremium]}>
              {usage?.plan === 'PREMIUM_IA' ? 'Premium' : usage?.plan === 'PROFESSIONAL' ? 'Pro' : 'Gratis'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => refetch()}
          >
            <Ionicons name="refresh" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {!isPremium && (
          <View style={styles.upgradeCard}>
            <View style={styles.upgradeIcon}>
              <Ionicons name="lock-closed" size={24} color="#8b5cf6" />
            </View>
            <View style={styles.upgradeContent}>
              <Text style={styles.upgradeTitle}>Desbloquea las funcionalidades de IA</Text>
              <Text style={styles.upgradeDescription}>
                Actualiza a Premium para acceder al chat inteligente, generación automática de emails, informes y predicciones.
              </Text>
              <TouchableOpacity 
                style={styles.upgradeButton}
                onPress={() => router.push('/settings/subscription')}
              >
                <Text style={styles.upgradeButtonText}>Ver Planes</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isPremium && (
          <>
            {/* Resumen de uso */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Resumen del mes actual</Text>
              <Text style={styles.summarySubtitle}>
                {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </Text>
            </View>

            {/* Barras de progreso por feature */}
            {(Object.keys(FEATURE_INFO) as AIFeature[]).map((feature) => {
              const info = FEATURE_INFO[feature];
              const currentUsage = usage?.usage[feature] || 0;
              const limit = usage?.limits[`${feature}MessagesPerMonth` as keyof typeof usage.limits] || 
                           usage?.limits[`${feature}GenerationsPerMonth` as keyof typeof usage.limits] ||
                           usage?.limits[`${feature}sPerMonth` as keyof typeof usage.limits] || 0;
              const percentage = usage?.percentages[feature] || 0;
              const remaining = limit - currentUsage;
              
              // Determinar color según el porcentaje
              let progressColor = info.color;
              let statusColor = '#10b981';
              let statusText = 'Disponible';
              
              if (percentage >= 100) {
                progressColor = '#ef4444';
                statusColor = '#ef4444';
                statusText = 'Límite alcanzado';
              } else if (percentage >= 80) {
                progressColor = '#f59e0b';
                statusColor = '#f59e0b';
                statusText = 'Cerca del límite';
              }

              return (
                <View key={feature} style={styles.usageCard}>
                  <View style={styles.usageHeader}>
                    <View style={styles.usageIconContainer}>
                      <Ionicons name={info.icon} size={24} color={info.color} />
                    </View>
                    <View style={styles.usageInfo}>
                      <Text style={styles.usageLabel}>{info.label}</Text>
                      <View style={styles.usageStats}>
                        <Text style={styles.usageNumbers}>
                          {currentUsage} / {limit}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                          <Text style={[styles.statusText, { color: statusColor }]}>
                            {statusText}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Barra de progreso */}
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                      <View 
                        style={[
                          styles.progressBarFill, 
                          { 
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: progressColor,
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressPercentage}>
                      {percentage.toFixed(0)}%
                    </Text>
                  </View>

                  {/* Información adicional */}
                  <View style={styles.usageDetails}>
                    <View style={styles.usageDetailItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                      <Text style={styles.usageDetailText}>
                        {remaining} restantes
                      </Text>
                    </View>
                    {percentage >= 80 && percentage < 100 && (
                      <View style={styles.usageDetailItem}>
                        <Ionicons name="warning" size={16} color="#f59e0b" />
                        <Text style={[styles.usageDetailText, { color: '#f59e0b' }]}>
                          ¡Cerca del límite!
                        </Text>
                      </View>
                    )}
                    {percentage >= 100 && (
                      <View style={styles.usageDetailItem}>
                        <Ionicons name="alert-circle" size={16} color="#ef4444" />
                        <Text style={[styles.usageDetailText, { color: '#ef4444' }]}>
                          Límite alcanzado
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {/* Información sobre límites */}
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons name="information-circle" size={20} color="#3b82f6" />
                <Text style={styles.infoTitle}>Sobre los límites</Text>
              </View>
              <Text style={styles.infoText}>
                Los límites se reinician automáticamente el primer día de cada mes. 
                Si necesitas más capacidad, contacta con soporte.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  planText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
  },
  planTextPremium: {
    color: '#8b5cf6',
  },
  refreshButton: {
    backgroundColor: '#fff',
    width: 40,
    height: 40,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  upgradeCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#8b5cf6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  upgradeIcon: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  upgradeContent: {
    gap: 12,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  upgradeDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 4,
    gap: 8,
    marginTop: 8,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  usageCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  usageIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#f0f4f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  usageInfo: {
    flex: 1,
  },
  usageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  usageStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  usageNumbers: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
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
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    minWidth: 40,
    textAlign: 'right',
  },
  usageDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  usageDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  usageDetailText: {
    fontSize: 12,
    color: '#64748b',
  },
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  infoText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
});
