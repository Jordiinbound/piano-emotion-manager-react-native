/**
 * Panel de Administración de Partners
 * 
 * Lista todos los partners del sistema con opciones de búsqueda,
 * filtrado y acceso a detalles de cada partner.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { useSnackbar } from '@/components/snackbar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { trpc } from '@/utils/trpc';
import { useLanguage } from '@/contexts/language-context';

interface Partner {
  id: number;
  name: string;
  slug: string;
  email: string;
  status: 'active' | 'inactive' | 'suspended';
  defaultLanguage: string;
  customDomain?: string;
  logo?: string;
  brandName?: string;
  createdAt: string;
  _count?: {
    users: number;
    clients: number;
  };
}

export default function PartnersListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { success: showSuccess, error: showError } = useSnackbar();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Colores del tema
  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accent = useThemeColor({}, 'accent');
  const textColor = useThemeColor({}, 'text');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const error = useThemeColor({}, 'error');

  // Obtener lista de partners
  const { data: partnersData, isLoading, refetch } = trpc.partners.list.useQuery({
    page: 1,
    limit: 100,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: searchQuery || undefined,
  });

  const partners = partnersData?.partners || [];
  const total = partnersData?.total || 0;

  // Filtrar partners localmente
  const filteredPartners = useMemo(() => {
    let filtered = partners;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p: Partner) =>
          p.name.toLowerCase().includes(query) ||
          p.email.toLowerCase().includes(query) ||
          p.slug.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [partners, searchQuery]);

  // Manejar refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Navegar a detalles del partner
  const handlePartnerPress = (partnerId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/admin/partners/${partnerId}`);
  };

  // Navegar a crear nuevo partner
  const handleCreatePartner = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/admin/partners/new');
  };

  // Obtener color según estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return success;
      case 'inactive':
        return textSecondary;
      case 'suspended':
        return error;
      default:
        return textSecondary;
    }
  };

  // Obtener texto según estado
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return t('partners.status.active');
      case 'inactive':
        return t('partners.status.inactive');
      case 'suspended':
        return t('partners.status.suspended');
      default:
        return status;
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Breadcrumbs
          items={[
            { label: t('partners.title'), onPress: () => {} },
          ]}
        />
        <ThemedText style={styles.title}>{t('partners.title')}</ThemedText>
        <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
          {t('partners.subtitle', { count: total })}
        </ThemedText>
      </View>

      {/* Barra de búsqueda y filtros */}
      <View style={[styles.searchContainer, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.searchInputContainer}>
          <IconSymbol name="magnifyingglass" size={20} color={textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder={t('partners.search')}
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

        {/* Filtros de estado */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContainer}
        >
          {['all', 'active', 'inactive', 'suspended'].map((filter) => (
            <Pressable
              key={filter}
              style={[
                styles.filterChip,
                {
                  backgroundColor: statusFilter === filter ? accent : 'transparent',
                  borderColor: statusFilter === filter ? accent : borderColor,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setStatusFilter(filter as typeof statusFilter);
              }}
            >
              <ThemedText
                style={[
                  styles.filterChipText,
                  {
                    color: statusFilter === filter ? '#fff' : textColor,
                  },
                ]}
              >
                {t(`partners.filters.${filter}`)}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Lista de partners */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={accent} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accent} />
            <ThemedText style={[styles.loadingText, { color: textSecondary }]}>
              {t('partners.loading')}
            </ThemedText>
          </View>
        ) : filteredPartners.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="building.2" size={64} color={textSecondary} />
            <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
              {searchQuery
                ? t('partners.noResults')
                : t('partners.empty')}
            </ThemedText>
          </View>
        ) : (
          filteredPartners.map((partner: Partner) => (
            <Pressable
              key={partner.id}
              style={[styles.partnerCard, { backgroundColor: cardBg, borderColor }]}
              onPress={() => handlePartnerPress(partner.id)}
            >
              {/* Logo y nombre */}
              <View style={styles.partnerHeader}>
                <View style={[styles.partnerLogo, { backgroundColor: accent + '20', borderColor: accent }]}>
                  {partner.logo ? (
                    <ThemedText style={styles.partnerLogoText}>
                      {partner.name.substring(0, 2).toUpperCase()}
                    </ThemedText>
                  ) : (
                    <IconSymbol name="building.2" size={24} color={accent} />
                  )}
                </View>
                <View style={styles.partnerInfo}>
                  <ThemedText style={styles.partnerName}>{partner.name}</ThemedText>
                  <ThemedText style={[styles.partnerSlug, { color: textSecondary }]}>
                    @{partner.slug}
                  </ThemedText>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(partner.status) + '20' }]}>
                  <ThemedText style={[styles.statusText, { color: getStatusColor(partner.status) }]}>
                    {getStatusText(partner.status)}
                  </ThemedText>
                </View>
              </View>

              {/* Información del partner */}
              <View style={styles.partnerDetails}>
                <View style={styles.detailRow}>
                  <IconSymbol name="envelope" size={16} color={textSecondary} />
                  <ThemedText style={[styles.detailText, { color: textSecondary }]}>
                    {partner.email}
                  </ThemedText>
                </View>
                {partner.customDomain && (
                  <View style={styles.detailRow}>
                    <IconSymbol name="globe" size={16} color={textSecondary} />
                    <ThemedText style={[styles.detailText, { color: textSecondary }]}>
                      {partner.customDomain}
                    </ThemedText>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <IconSymbol name="flag" size={16} color={textSecondary} />
                  <ThemedText style={[styles.detailText, { color: textSecondary }]}>
                    {partner.defaultLanguage?.toUpperCase() || 'ES'}
                  </ThemedText>
                </View>
              </View>

              {/* Estadísticas */}
              {partner._count && (
                <View style={styles.partnerStats}>
                  <View style={styles.statItem}>
                    <IconSymbol name="person.2" size={16} color={accent} />
                    <ThemedText style={[styles.statValue, { color: accent }]}>
                      {partner._count.users || 0}
                    </ThemedText>
                    <ThemedText style={[styles.statLabel, { color: textSecondary }]}>
                      {t('partners.stats.users')}
                    </ThemedText>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: borderColor }]} />
                  <View style={styles.statItem}>
                    <IconSymbol name="person.3" size={16} color={accent} />
                    <ThemedText style={[styles.statValue, { color: accent }]}>
                      {partner._count.clients || 0}
                    </ThemedText>
                    <ThemedText style={[styles.statLabel, { color: textSecondary }]}>
                      {t('partners.stats.clients')}
                    </ThemedText>
                  </View>
                </View>
              )}

              {/* Flecha de navegación */}
              <View style={styles.partnerArrow}>
                <IconSymbol name="chevron.right" size={20} color={textSecondary} />
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Botón flotante para crear partner */}
      <Pressable
        style={[styles.fab, { backgroundColor: accent, bottom: insets.bottom + Spacing.lg }]}
        onPress={handleCreatePartner}
      >
        <IconSymbol name="plus" size={24} color="#fff" />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filtersScroll: {
    marginTop: Spacing.md,
  },
  filtersContainer: {
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 4,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  partnerCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    position: 'relative',
  },
  partnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  partnerLogo: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerLogoText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 18,
    fontWeight: '600',
  },
  partnerSlug: {
    fontSize: 14,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  partnerDetails: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: 14,
  },
  partnerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 20,
    marginHorizontal: Spacing.sm,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
  },
  partnerArrow: {
    position: 'absolute',
    right: Spacing.md,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
