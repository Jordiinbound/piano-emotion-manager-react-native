/**
 * Dashboard Alerts Detailed Component
 * Lista detallada de alertas con filtros y acciones
 */
import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing, BorderRadius } from '@/constants/theme';
import { Recommendation, Piano, Client, getClientFullName } from '@/types';
import { trpc } from '@/lib/trpc';

interface DashboardAlertsDetailedProps {
  recommendations: Recommendation[];
  pianos: Piano[];
  clients: Client[];
  onRefresh?: () => void;
}

type FilterType = 'all' | 'urgent' | 'pending' | 'tuning' | 'regulation' | 'repair';

export function DashboardAlertsDetailed({
  recommendations,
  pianos,
  clients,
  onRefresh,
}: DashboardAlertsDetailedProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accent = useThemeColor({}, 'accent');
  const error = useThemeColor({}, 'error');
  const warning = useThemeColor({}, 'warning');
  const textColor = useThemeColor({}, 'text');
  const success = '#10B981';

  // Mutations para gestionar alertas
  const acknowledgeAlert = trpc.alerts.acknowledgeAlert.useMutation();
  const dismissAlert = trpc.alerts.dismissAlert.useMutation();

  // Filtrar recomendaciones
  const filteredRecommendations = recommendations.filter((rec) => {
    if (filter === 'all') return true;
    if (filter === 'urgent') return rec.priority === 'urgent';
    if (filter === 'pending') return rec.priority === 'pending';
    if (filter === 'tuning') return rec.type === 'tuning';
    if (filter === 'regulation') return rec.type === 'regulation';
    if (filter === 'repair') return rec.type === 'repair';
    return true;
  });

  // Obtener datos del piano y cliente
  const getPianoData = (pianoId: string) => {
    return pianos.find((p) => p.id === pianoId);
  };

  const getClientData = (clientId: string) => {
    return clients.find((c) => c.id === clientId);
  };

  // Handlers
  const handleAlertPress = (rec: Recommendation) => {
    const piano = getPianoData(rec.pianoId);
    if (piano) {
      router.push({
        pathname: '/piano/[id]',
        params: { id: piano.id },
      });
    }
  };

  const handleScheduleService = (rec: Recommendation) => {
    const piano = getPianoData(rec.pianoId);
    if (piano) {
      router.push({
        pathname: '/service/[id]' as any,
        params: { 
          id: 'new', 
          pianoId: piano.id, 
          clientId: piano.clientId,
          serviceType: rec.type,
        },
      });
    }
  };

  const handleAcknowledge = async (rec: Recommendation) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // TODO: Implementar cuando tengamos alertHistory
      Alert.alert('Información', 'Funcionalidad de reconocimiento de alertas en desarrollo');
    } catch (error) {
      Alert.alert('Error', 'No se pudo reconocer la alerta');
    }
  };

  const handleDismiss = async (rec: Recommendation) => {
    Alert.alert(
      'Descartar alerta',
      '¿Estás seguro de que quieres descartar esta alerta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              // TODO: Implementar cuando tengamos alertHistory
              Alert.alert('Información', 'Funcionalidad de descarte de alertas en desarrollo');
            } catch (error) {
              Alert.alert('Error', 'No se pudo descartar la alerta');
            }
          },
        },
      ]
    );
  };

  // Obtener color según prioridad
  const getPriorityColor = (priority: 'urgent' | 'pending' | 'ok') => {
    switch (priority) {
      case 'urgent':
        return error;
      case 'pending':
        return warning;
      case 'ok':
        return success;
    }
  };

  // Obtener icono según tipo
  const getTypeIcon = (type: 'tuning' | 'regulation' | 'repair') => {
    switch (type) {
      case 'tuning':
        return 'tuningfork';
      case 'regulation':
        return 'wrench.fill';
      case 'repair':
        return 'exclamationmark.triangle.fill';
    }
  };

  // Obtener label según tipo
  const getTypeLabel = (type: 'tuning' | 'regulation' | 'repair') => {
    switch (type) {
      case 'tuning':
        return 'Afinación';
      case 'regulation':
        return 'Regulación';
      case 'repair':
        return 'Reparación';
    }
  };

  // Obtener label según prioridad
  const getPriorityLabel = (priority: 'urgent' | 'pending' | 'ok') => {
    switch (priority) {
      case 'urgent':
        return 'URGENTE';
      case 'pending':
        return 'PENDIENTE';
      case 'ok':
        return 'OK';
    }
  };

  // Contadores para filtros
  const urgentCount = recommendations.filter((r) => r.priority === 'urgent').length;
  const pendingCount = recommendations.filter((r) => r.priority === 'pending').length;
  const tuningCount = recommendations.filter((r) => r.type === 'tuning').length;
  const regulationCount = recommendations.filter((r) => r.type === 'regulation').length;
  const repairCount = recommendations.filter((r) => r.type === 'repair').length;

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <IconSymbol name="bell.fill" size={20} color={accent} />
          <ThemedText style={[styles.title, { color: textColor }]}>
            Alertas de Mantenimiento
          </ThemedText>
        </View>
        {onRefresh && (
          <Pressable onPress={onRefresh}>
            <IconSymbol name="arrow.clockwise" size={20} color={accent} />
          </Pressable>
        )}
      </View>

      {/* Filtros */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        <Pressable
          style={[
            styles.filterButton,
            { borderColor },
            filter === 'all' && { backgroundColor: accent, borderColor: accent },
          ]}
          onPress={() => setFilter('all')}
        >
          <ThemedText
            style={[
              styles.filterButtonText,
              { color: filter === 'all' ? '#FFFFFF' : textSecondary },
            ]}
          >
            Todas ({recommendations.length})
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.filterButton,
            { borderColor },
            filter === 'urgent' && { backgroundColor: error, borderColor: error },
          ]}
          onPress={() => setFilter('urgent')}
        >
          <ThemedText
            style={[
              styles.filterButtonText,
              { color: filter === 'urgent' ? '#FFFFFF' : textSecondary },
            ]}
          >
            Urgentes ({urgentCount})
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.filterButton,
            { borderColor },
            filter === 'pending' && { backgroundColor: warning, borderColor: warning },
          ]}
          onPress={() => setFilter('pending')}
        >
          <ThemedText
            style={[
              styles.filterButtonText,
              { color: filter === 'pending' ? '#FFFFFF' : textSecondary },
            ]}
          >
            Pendientes ({pendingCount})
          </ThemedText>
        </Pressable>

        <View style={[styles.filterDivider, { backgroundColor: borderColor }]} />

        <Pressable
          style={[
            styles.filterButton,
            { borderColor },
            filter === 'tuning' && { backgroundColor: accent, borderColor: accent },
          ]}
          onPress={() => setFilter('tuning')}
        >
          <IconSymbol 
            name="tuningfork" 
            size={14} 
            color={filter === 'tuning' ? '#FFFFFF' : textSecondary} 
          />
          <ThemedText
            style={[
              styles.filterButtonText,
              { color: filter === 'tuning' ? '#FFFFFF' : textSecondary },
            ]}
          >
            Afinación ({tuningCount})
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.filterButton,
            { borderColor },
            filter === 'regulation' && { backgroundColor: accent, borderColor: accent },
          ]}
          onPress={() => setFilter('regulation')}
        >
          <IconSymbol 
            name="wrench.fill" 
            size={14} 
            color={filter === 'regulation' ? '#FFFFFF' : textSecondary} 
          />
          <ThemedText
            style={[
              styles.filterButtonText,
              { color: filter === 'regulation' ? '#FFFFFF' : textSecondary },
            ]}
          >
            Regulación ({regulationCount})
          </ThemedText>
        </Pressable>

        {repairCount > 0 && (
          <Pressable
            style={[
              styles.filterButton,
              { borderColor },
              filter === 'repair' && { backgroundColor: error, borderColor: error },
            ]}
            onPress={() => setFilter('repair')}
          >
            <IconSymbol 
              name="exclamationmark.triangle.fill" 
              size={14} 
              color={filter === 'repair' ? '#FFFFFF' : textSecondary} 
            />
            <ThemedText
              style={[
                styles.filterButtonText,
                { color: filter === 'repair' ? '#FFFFFF' : textSecondary },
              ]}
            >
              Reparación ({repairCount})
            </ThemedText>
          </Pressable>
        )}
      </ScrollView>

      {/* Lista de alertas */}
      {filteredRecommendations.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="checkmark.circle.fill" size={48} color={success} />
          <ThemedText style={[styles.emptyStateText, { color: textSecondary }]}>
            {filter === 'all' 
              ? 'No hay alertas de mantenimiento' 
              : `No hay alertas de tipo "${filter}"`}
          </ThemedText>
        </View>
      ) : (
        <ScrollView 
          style={styles.alertsList}
          showsVerticalScrollIndicator={false}
        >
          {filteredRecommendations.map((rec, index) => {
            const piano = getPianoData(rec.pianoId);
            const client = getClientData(rec.clientId);
            const priorityColor = getPriorityColor(rec.priority);
            const isExpanded = expandedId === `${rec.pianoId}-${rec.type}`;

            return (
              <View
                key={`${rec.pianoId}-${rec.type}-${index}`}
                style={[
                  styles.alertCard,
                  { backgroundColor: `${priorityColor}08`, borderColor: priorityColor },
                ]}
              >
                {/* Contenido principal */}
                <Pressable
                  style={styles.alertCardMain}
                  onPress={() => handleAlertPress(rec)}
                >
                  {/* Icono y prioridad */}
                  <View style={[styles.alertIcon, { backgroundColor: `${priorityColor}20` }]}>
                    <IconSymbol name={getTypeIcon(rec.type)} size={20} color={priorityColor} />
                  </View>

                  {/* Información */}
                  <View style={styles.alertInfo}>
                    {/* Piano y cliente */}
                    <View style={styles.alertHeader}>
                      <ThemedText style={[styles.alertPiano, { color: textColor }]} numberOfLines={1}>
                        {piano ? `${piano.brand} ${piano.model}` : 'Piano desconocido'}
                      </ThemedText>
                      <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
                        <ThemedText style={styles.priorityBadgeText}>
                          {getPriorityLabel(rec.priority)}
                        </ThemedText>
                      </View>
                    </View>

                    {/* Cliente */}
                    {client && (
                      <ThemedText style={[styles.alertClient, { color: textSecondary }]} numberOfLines={1}>
                        {getClientFullName(client)}
                      </ThemedText>
                    )}

                    {/* Tipo de servicio */}
                    <View style={styles.alertType}>
                      <View style={[styles.typeBadge, { borderColor: priorityColor }]}>
                        <ThemedText style={[styles.typeBadgeText, { color: priorityColor }]}>
                          {getTypeLabel(rec.type)}
                        </ThemedText>
                      </View>
                      <ThemedText style={[styles.alertDays, { color: textSecondary }]}>
                        {rec.daysSinceLastService} días desde último servicio
                      </ThemedText>
                    </View>

                    {/* Mensaje */}
                    <ThemedText style={[styles.alertMessage, { color: textColor }]}>
                      {rec.message}
                    </ThemedText>
                  </View>

                  {/* Botón expandir */}
                  <Pressable
                    style={styles.expandButton}
                    onPress={() => setExpandedId(isExpanded ? null : `${rec.pianoId}-${rec.type}`)}
                  >
                    <IconSymbol 
                      name={isExpanded ? 'chevron.up' : 'chevron.down'} 
                      size={20} 
                      color={textSecondary} 
                    />
                  </Pressable>
                </Pressable>

                {/* Acciones (expandible) */}
                {isExpanded && (
                  <View style={[styles.alertActions, { borderTopColor: borderColor }]}>
                    <Pressable
                      style={[styles.actionButton, { backgroundColor: accent }]}
                      onPress={() => handleScheduleService(rec)}
                    >
                      <IconSymbol name="calendar.badge.plus" size={16} color="#FFFFFF" />
                      <ThemedText style={styles.actionButtonText}>
                        Programar servicio
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      style={[styles.actionButton, { backgroundColor: cardBg, borderColor, borderWidth: 1 }]}
                      onPress={() => handleAcknowledge(rec)}
                    >
                      <IconSymbol name="checkmark" size={16} color={textColor} />
                      <ThemedText style={[styles.actionButtonTextSecondary, { color: textColor }]}>
                        Reconocer
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      style={[styles.actionButton, { backgroundColor: cardBg, borderColor, borderWidth: 1 }]}
                      onPress={() => handleDismiss(rec)}
                    >
                      <IconSymbol name="xmark" size={16} color={error} />
                      <ThemedText style={[styles.actionButtonTextSecondary, { color: error }]}>
                        Descartar
                      </ThemedText>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  filtersContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  filtersContent: {
    gap: Spacing.xs,
    paddingRight: Spacing.md,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterDivider: {
    width: 1,
    height: 24,
    marginHorizontal: Spacing.xs,
  },
  alertsList: {
    maxHeight: 500,
    padding: Spacing.md,
    paddingTop: 0,
  },
  alertCard: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  alertCardMain: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertInfo: {
    flex: 1,
    gap: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  alertPiano: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  priorityBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  alertClient: {
    fontSize: 13,
  },
  alertType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  alertDays: {
    fontSize: 11,
  },
  alertMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  expandButton: {
    padding: Spacing.xs,
  },
  alertActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
    padding: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  actionButtonTextSecondary: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
