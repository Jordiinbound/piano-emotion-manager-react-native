/**
 * Página Principal de CRM
 * Piano Emotion Manager
 * 
 * Gestión avanzada de relaciones con clientes
 */

import { useRouter, Stack } from 'expo-router';
import { useState, useMemo, useCallback } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Modal,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FAB } from '@/components/fab';
import { useClientsData, usePianosData, useServicesData } from '@/hooks/data';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { Client, getClientFullName } from '@/types';

// Tipos de CRM
type ClientSegment = 'all' | 'vip' | 'regular' | 'inactive' | 'new';
type SortOption = 'name' | 'lastService' | 'totalSpent' | 'pianos';

interface ClientProfile extends Client {
  totalSpent: number;
  totalServices: number;
  lastServiceDate?: string;
  pianoCount: number;
  segment: ClientSegment;
  score: number;
}

interface Interaction {
  id: string;
  clientId: string;
  type: 'call' | 'email' | 'visit' | 'note' | 'reminder';
  date: string;
  notes: string;
}

export default function CRMScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { clients } = useClientsData();
  const { pianos } = usePianosData();
  const { services } = useServicesData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<ClientSegment>('all');
  const [sortBy, setSortBy] = useState<SortOption>('lastService');
  const [refreshing, setRefreshing] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);

  const accent = useThemeColor({}, 'accent');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const error = useThemeColor({}, 'error');
  const textColor = useThemeColor({}, 'text');

  // Calcular perfiles de clientes con métricas CRM
  const clientProfiles = useMemo((): ClientProfile[] => {
    return clients.map(client => {
      const clientPianos = pianos.filter(p => p.clientId === client.id);
      const clientServices = services.filter(s => s.clientId === client.id);
      
      const totalSpent = clientServices.reduce((sum, s) => sum + (s.price || 0), 0);
      const lastService = clientServices.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];

      const daysSinceLastService = lastService 
        ? Math.floor((Date.now() - new Date(lastService.date).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      let segment: ClientSegment = 'regular';
      if (totalSpent > 1000 || clientServices.length > 10) {
        segment = 'vip';
      } else if (daysSinceLastService > 365) {
        segment = 'inactive';
      } else if (clientServices.length === 0) {
        segment = 'new';
      }

      let score = 50;
      score += Math.min(totalSpent / 100, 20);
      score += Math.min(clientServices.length * 2, 15);
      score += Math.min(clientPianos.length * 5, 10);
      score -= Math.min(daysSinceLastService / 30, 20);
      score = Math.max(0, Math.min(100, score));

      return {
        ...client,
        totalSpent,
        totalServices: clientServices.length,
        lastServiceDate: lastService?.date,
        pianoCount: clientPianos.length,
        segment,
        score: Math.round(score),
      };
    });
  }, [clients, pianos, services]);

  const filteredClients = useMemo(() => {
    let result = clientProfiles;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        getClientFullName(c).toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone?.includes(query)
      );
    }

    if (selectedSegment !== 'all') {
      result = result.filter(c => c.segment === selectedSegment);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return getClientFullName(a).localeCompare(getClientFullName(b));
        case 'lastService':
          const dateA = a.lastServiceDate ? new Date(a.lastServiceDate).getTime() : 0;
          const dateB = b.lastServiceDate ? new Date(b.lastServiceDate).getTime() : 0;
          return dateB - dateA;
        case 'totalSpent':
          return b.totalSpent - a.totalSpent;
        case 'pianos':
          return b.pianoCount - a.pianoCount;
        default:
          return 0;
      }
    });

    return result;
  }, [clientProfiles, searchQuery, selectedSegment, sortBy]);

  const stats = useMemo(() => {
    const total = clientProfiles.length;
    const vip = clientProfiles.filter(c => c.segment === 'vip').length;
    const inactive = clientProfiles.filter(c => c.segment === 'inactive').length;
    const totalRevenue = clientProfiles.reduce((sum, c) => sum + c.totalSpent, 0);

    return { total, vip, inactive, totalRevenue };
  }, [clientProfiles]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 70) return success;
    if (score >= 40) return warning;
    return error;
  };

  const handleClientPress = (client: ClientProfile) => {
    setSelectedClient(client);
    setShowInteractionModal(true);
  };

  const handleAddInteraction = (type: Interaction['type']) => {
    if (!selectedClient) return;

    Alert.prompt(
      `Nueva ${type === 'call' ? 'Llamada' : type === 'email' ? 'Email' : type === 'visit' ? 'Visita' : type === 'reminder' ? 'Recordatorio' : 'Nota'}`,
      'Añade una descripción:',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Guardar',
          onPress: (notes) => {
            if (notes) {
              const newInteraction: Interaction = {
                id: Date.now().toString(),
                clientId: selectedClient.id,
                type,
                date: new Date().toISOString(),
                notes,
              };
              setInteractions(prev => [newInteraction, ...prev]);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const renderClientCard = ({ item }: { item: ClientProfile }) => {
    const scoreColor = getScoreColor(item.score);

    return (
      <Pressable
        style={[styles.clientCard, { backgroundColor: cardBg, borderColor }]}
        onPress={() => handleClientPress(item)}
      >
        <View style={styles.clientHeader}>
          <View style={styles.clientInfo}>
            <View style={styles.clientNameRow}>
              <ThemedText style={styles.clientName}>{getClientFullName(item)}</ThemedText>
              {item.segment === 'vip' && (
                <View style={[styles.vipBadge, { backgroundColor: '#F59E0B' }]}>
                  <ThemedText style={styles.vipBadgeText}>★ VIP</ThemedText>
                </View>
              )}
            </View>
            {item.email && (
              <ThemedText style={[styles.clientEmail, { color: textSecondary }]}>
                {item.email}
              </ThemedText>
            )}
          </View>
          <View style={[styles.scoreBadge, { backgroundColor: `${scoreColor}15` }]}>
            <ThemedText style={[styles.scoreText, { color: scoreColor }]}>
              {item.score}
            </ThemedText>
          </View>
        </View>

        <View style={styles.clientMetrics}>
          <View style={styles.metric}>
            <IconSymbol name="pianokeys" size={16} color={textSecondary} />
            <ThemedText style={[styles.metricValue, { color: textColor }]}>
              {item.pianoCount}
            </ThemedText>
            <ThemedText style={[styles.metricLabel, { color: textSecondary }]}>
              pianos
            </ThemedText>
          </View>

          <View style={styles.metric}>
            <IconSymbol name="wrench.fill" size={16} color={textSecondary} />
            <ThemedText style={[styles.metricValue, { color: textColor }]}>
              {item.totalServices}
            </ThemedText>
            <ThemedText style={[styles.metricLabel, { color: textSecondary }]}>
              servicios
            </ThemedText>
          </View>

          <View style={styles.metric}>
            <IconSymbol name="eurosign.circle.fill" size={16} color={textSecondary} />
            <ThemedText style={[styles.metricValue, { color: accent }]}>
              €{item.totalSpent.toFixed(0)}
            </ThemedText>
            <ThemedText style={[styles.metricLabel, { color: textSecondary }]}>
              total
            </ThemedText>
          </View>
        </View>

        {item.lastServiceDate && (
          <View style={[styles.lastService, { borderTopColor: borderColor }]}>
            <IconSymbol name="clock.fill" size={14} color={textSecondary} />
            <ThemedText style={[styles.lastServiceText, { color: textSecondary }]}>
              Último servicio: {new Date(item.lastServiceDate).toLocaleDateString('es-ES')}
            </ThemedText>
          </View>
        )}
      </Pressable>
    );
  };

  const segments: { key: ClientSegment; label: string; icon: string }[] = [
    { key: 'all', label: 'Todos', icon: 'person.2.fill' },
    { key: 'vip', label: 'VIP', icon: 'star.fill' },
    { key: 'regular', label: 'Regulares', icon: 'person.fill' },
    { key: 'inactive', label: 'Inactivos', icon: 'moon.fill' },
    { key: 'new', label: 'Nuevos', icon: 'sparkles' },
  ];

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'CRM - Gestión de Clientes' }} />

      {/* Dashboard de estadísticas */}
      <View style={[styles.statsContainer, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: accent }]}>{stats.total}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: textSecondary }]}>Clientes</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: '#F59E0B' }]}>{stats.vip}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: textSecondary }]}>VIP</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: error }]}>{stats.inactive}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: textSecondary }]}>Inactivos</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: success }]}>€{(stats.totalRevenue / 1000).toFixed(1)}k</ThemedText>
            <ThemedText style={[styles.statLabel, { color: textSecondary }]}>Facturado</ThemedText>
          </View>
        </View>
      </View>

      {/* Búsqueda */}
      <View style={[styles.searchContainer, { borderColor }]}>
        <IconSymbol name="magnifyingglass" size={20} color={textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: textColor }]}
          placeholder="Buscar cliente..."
          placeholderTextColor={textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <IconSymbol name="xmark.circle.fill" size={20} color={textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Filtros de segmento */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.segmentsContainer}
      >
        {segments.map((segment) => (
          <Pressable
            key={segment.key}
            style={[
              styles.segmentChip,
              { borderColor },
              selectedSegment === segment.key && { backgroundColor: accent, borderColor: accent },
            ]}
            onPress={() => {
              setSelectedSegment(segment.key);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <IconSymbol 
              name={segment.icon as any} 
              size={16} 
              color={selectedSegment === segment.key ? '#FFFFFF' : textSecondary} 
            />
            <ThemedText
              style={[
                styles.segmentText,
                { color: selectedSegment === segment.key ? '#FFFFFF' : textSecondary },
              ]}
            >
              {segment.label}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Ordenar */}
      <View style={styles.sortContainer}>
        <ThemedText style={[styles.sortLabel, { color: textSecondary }]}>Ordenar por:</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'lastService', label: 'Último servicio' },
            { key: 'totalSpent', label: 'Facturación' },
            { key: 'name', label: 'Nombre' },
            { key: 'pianos', label: 'Pianos' },
          ].map((option) => (
            <Pressable
              key={option.key}
              style={[
                styles.sortOption,
                sortBy === option.key && { backgroundColor: `${accent}15` },
              ]}
              onPress={() => setSortBy(option.key as SortOption)}
            >
              <ThemedText
                style={[
                  styles.sortOptionText,
                  { color: sortBy === option.key ? accent : textSecondary },
                ]}
              >
                {option.label}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Lista de clientes */}
      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item.id}
        renderItem={renderClientCard}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconSymbol name="person.2.slash" size={48} color={textSecondary} />
            <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
              No se encontraron clientes
            </ThemedText>
          </View>
        }
      />

      {/* Modal de interacciones */}
      <Modal
        visible={showInteractionModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInteractionModal(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <Pressable onPress={() => setShowInteractionModal(false)}>
              <ThemedText style={[styles.modalClose, { color: accent }]}>Cerrar</ThemedText>
            </Pressable>
            <ThemedText style={styles.modalTitle}>
              {selectedClient ? getClientFullName(selectedClient) : 'Cliente'}
            </ThemedText>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <ThemedText style={[styles.sectionTitle, { color: textSecondary }]}>
              Registrar Interacción
            </ThemedText>
            <View style={styles.actionsGrid}>
              {[
                { type: 'call', icon: 'phone.fill', label: 'Llamada', color: '#10B981' },
                { type: 'email', icon: 'envelope.fill', label: 'Email', color: '#3B82F6' },
                { type: 'visit', icon: 'car.fill', label: 'Visita', color: '#8B5CF6' },
                { type: 'note', icon: 'note.text', label: 'Nota', color: '#F59E0B' },
                { type: 'reminder', icon: 'bell.fill', label: 'Recordatorio', color: '#EF4444' },
              ].map((action) => (
                <Pressable
                  key={action.type}
                  style={[styles.actionButton, { backgroundColor: `${action.color}15`, borderColor: action.color }]}
                  onPress={() => handleAddInteraction(action.type as Interaction['type'])}
                >
                  <IconSymbol name={action.icon as any} size={24} color={action.color} />
                  <ThemedText style={[styles.actionLabel, { color: action.color }]}>
                    {action.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedText style={[styles.sectionTitle, { color: textSecondary, marginTop: Spacing.lg }]}>
              Historial de Interacciones
            </ThemedText>
            {interactions
              .filter(i => i.clientId === selectedClient?.id)
              .map((interaction) => (
                <View key={interaction.id} style={[styles.interactionItem, { borderColor }]}>
                  <View style={styles.interactionHeader}>
                    <IconSymbol 
                      name={
                        interaction.type === 'call' ? 'phone.fill' :
                        interaction.type === 'email' ? 'envelope.fill' :
                        interaction.type === 'visit' ? 'car.fill' :
                        interaction.type === 'reminder' ? 'bell.fill' : 'note.text'
                      } 
                      size={16} 
                      color={accent} 
                    />
                    <ThemedText style={styles.interactionDate}>
                      {new Date(interaction.date).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.interactionNotes}>{interaction.notes}</ThemedText>
                </View>
              ))}

            {interactions.filter(i => i.clientId === selectedClient?.id).length === 0 && (
              <ThemedText style={[styles.noInteractions, { color: textSecondary }]}>
                No hay interacciones registradas
              </ThemedText>
            )}

            <View style={styles.additionalActions}>
              <Pressable
                style={[styles.fullButton, { backgroundColor: accent }]}
                onPress={() => {
                  setShowInteractionModal(false);
                  router.push({ pathname: '/client/[id]' as any, params: { id: selectedClient?.id } });
                }}
              >
                <IconSymbol name="person.fill" size={20} color="#FFFFFF" />
                <ThemedText style={styles.fullButtonText}>Ver Ficha Completa</ThemedText>
              </Pressable>

              <Pressable
                style={[styles.fullButton, { backgroundColor: success }]}
                onPress={() => {
                  setShowInteractionModal(false);
                  router.push({ pathname: '/new-appointment' as any, params: { clientId: selectedClient?.id } });
                }}
              >
                <IconSymbol name="calendar.badge.plus" size={20} color="#FFFFFF" />
                <ThemedText style={styles.fullButtonText}>Programar Cita</ThemedText>
              </Pressable>

              <Pressable
                style={[styles.fullButton, { backgroundColor: '#3B82F6' }]}
                onPress={() => {
                  setShowInteractionModal(false);
                  router.push({ pathname: '/invoice/[id]' as any, params: { id: 'new', clientId: selectedClient?.id } });
                }}
              >
                <IconSymbol name="doc.text.fill" size={20} color="#FFFFFF" />
                <ThemedText style={styles.fullButtonText}>Crear Factura</ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </ThemedView>
      </Modal>

      <FAB
        icon="plus"
        onPress={() => router.push('/new-client' as any)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsContainer: {
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  segmentsContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  segmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginRight: Spacing.sm,
    gap: Spacing.xs,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  sortLabel: {
    fontSize: 13,
  },
  sortOption: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.xs,
  },
  sortOptionText: {
    fontSize: 13,
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  clientCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clientInfo: {
    flex: 1,
  },
  clientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  clientName: {
    fontSize: 17,
    fontWeight: '600',
  },
  vipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vipBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  clientEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  scoreBadge: {
    width: 40,
    height: 40,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '700',
  },
  clientMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.sm,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  metricLabel: {
    fontSize: 12,
  },
  lastService: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  lastServiceText: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  modalClose: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionButton: {
    width: '30%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  interactionItem: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  interactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  interactionDate: {
    fontSize: 12,
  },
  interactionNotes: {
    fontSize: 14,
    lineHeight: 20,
  },
  noInteractions: {
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  additionalActions: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  fullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  fullButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
