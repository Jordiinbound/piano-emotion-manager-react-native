import React from 'react';
/**
 * Pianos Screen - Professional Minimalist Design
 * Piano Emotion Manager
 * 
 * Diseño profesional y minimalista:
 * - Sin colorines infantiles
 * - Paleta neutra con acentos azules
 * - Estadísticas sobrias y elegantes
 * - Tipografía limpia y espaciado generoso
 */

import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useHeader } from '@/contexts/HeaderContext';
import { FlatList, Pressable, RefreshControl, StyleSheet, View, Text, useWindowDimensions, ActivityIndicator } from 'react-native';

import { PianoCard, EmptyState } from '@/components/cards';
import { FAB } from '@/components/fab';
import { LoadingSpinner } from '@/components/loading-spinner';
import { SearchBar } from '@/components/search-bar';
import { useClientsData, usePianosData } from '@/hooks/data';
import { useTranslation } from '@/hooks/use-translation';
import { BorderRadius, Spacing } from '@/constants/theme';
import { Piano, PianoCategory, getClientFullName } from '@/types';
import { useDebounce } from '@/hooks/use-debounce';

// Paleta profesional minimalista
const COLORS = {
  primary: '#003a8c',       // Azul corporativo
  background: '#ffffff',    // Blanco puro
  surface: '#f8f9fa',       // Gris muy claro
  border: '#e5e7eb',        // Gris claro para bordes
  textPrimary: '#1a1a1a',   // Negro casi puro
  textSecondary: '#6b7280', // Gris medio
  textTertiary: '#9ca3af',  // Gris claro
  accent: '#e07a5f',        // Terracota (solo para acciones)
};

type FilterType = 'all' | PianoCategory;

export default function PianosScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { setHeaderConfig } = useHeader();
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Debounce search para evitar demasiadas peticiones
  const debouncedSearch = useDebounce(search, 300);

  // Hook con filtrado en backend
  const { 
    pianos, 
    totalPianos,
    loading, 
    refresh,
    loadMore,
    hasMore,
    isLoadingMore,
    stats,
  } = usePianosData({
    search: debouncedSearch,
    category: filter !== 'all' ? filter : undefined,
    pageSize: 30,
  });

  const { getClient } = useClientsData();

  // Determinar si es móvil, tablet o desktop
  const isMobile = width < 768;
  const isDesktop = width >= 1024;

  // Configurar header
  useFocusEffect(
    React.useCallback(() => {
    setHeaderConfig({
      title: t('navigation.pianos'),
      subtitle: `${totalPianos} ${totalPianos === 1 ? 'piano' : 'pianos'}`,
      icon: 'pianokeys',
      showBackButton: false,
    });
    }, [totalPianos, t, setHeaderConfig])
  );

  // Estadísticas desde el backend

  const handlePianoPress = useCallback((piano: Piano) => {
    router.push({
      pathname: '/piano/[id]',
      params: { id: piano.id },
    });
  }, [router]);

  const handleAddPiano = useCallback(() => {
    router.push({
      pathname: '/piano/[id]',
      params: { id: 'new' },
    });
  }, [router]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (refresh) {
      await refresh();
    }
    setRefreshing(false);
  }, [refresh]);

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [hasMore, isLoadingMore, loadMore]);

  const renderItem = useCallback(
    ({ item }: { item: Piano }) => {
      const client = getClient(item.clientId);
      return (
        <PianoCard
          piano={item}
          clientName={client ? getClientFullName(client) : undefined}
          onPress={() => handlePianoPress(item)}
        />
      );
    },
    [getClient, handlePianoPress]
  );

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.accent} />
      </View>
    );
  }, [isLoadingMore]);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'vertical', label: t('pianos.categories.upright') },
    { key: 'grand', label: t('pianos.categories.grand') },
  ];

  // Mostrar animación de carga inicial
  if (loading && pianos.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingState}>
          <LoadingSpinner size="large" messageType="pianos" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Estadísticas minimalistas */}
      <View style={[styles.statsSection, isDesktop && styles.statsSectionDesktop]}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.vertical}</Text>
          <Text style={styles.statLabel}>Verticales</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.grand}</Text>
          <Text style={styles.statLabel}>De Cola</Text>
        </View>
      </View>

      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('common.search') + '...'}
          accessibilityLabel={t('common.search') + ' ' + t('navigation.pianos').toLowerCase()}
        />
      </View>

      {/* Filtros minimalistas */}
      <View style={styles.filtersContainer}>
        {filters.map((f) => (
          <Pressable
            key={f.key}
            style={[
              styles.filterChip,
              filter === f.key && styles.filterChipActive,
            ]}
            onPress={() => setFilter(f.key)}
            accessibilityRole="button"
            accessibilityLabel={`${t('common.filter')}: ${f.label}`}
            accessibilityState={{ selected: filter === f.key }}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Lista de pianos */}
      {pianos.length === 0 ? (
        <EmptyState
          icon="pianokeys"
          showBackButton={false}
          title={search || filter !== 'all' ? t('common.noResults') : t('pianos.noPianos')}
          message={
            search || filter !== 'all'
              ? t('common.noResults')
              : t('pianos.addFirstPiano')
          }
        />
      ) : (
        <FlatList
          data={pianos}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.textSecondary}
              title={t('common.loading')}
              titleColor={COLORS.textSecondary}
            />
          }
        />
      )}

      <FAB 
        onPress={handleAddPiano} 
        accessibilityLabel={t('pianos.newPiano')}
        accessibilityHint={t('pianos.addFirstPiano')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Estadísticas minimalistas
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  statsSectionDesktop: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },

  // Búsqueda
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },

  // Filtros minimalistas
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },

  // Lista
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
    gap: Spacing.md,
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});
