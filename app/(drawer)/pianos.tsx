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

import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useHeader } from '@/contexts/HeaderContext';
import { FlatList, Pressable, RefreshControl, StyleSheet, View, Text, useWindowDimensions, ActivityIndicator } from 'react-native';

import { PianoCard, EmptyState } from '@/components/cards';
import { ThemedText } from '@/components/themed-text';
import { FAB } from '@/components/fab';
import { LoadingSpinner } from '@/components/loading-spinner';
import { SearchBar } from '@/components/search-bar';
import { useClientsData, usePianosData, useServicesData } from '@/hooks/data';
import { useRecommendations } from '@/hooks/use-recommendations';
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

type FilterType = 'all' | PianoCategory | 'needs_tuning' | 'needs_regulation' | 'needs_repair';

export default function PianosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const { t } = useTranslation();
  const { setHeaderConfig } = useHeader();
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>((params.filter as FilterType) || 'all');
  const [refreshing, setRefreshing] = useState(false);
  const [localPage, setLocalPage] = useState(1); // Página local para filtros de servicio
  const [isCalculatingRecommendations, setIsCalculatingRecommendations] = useState(false);
  const LOCAL_PAGE_SIZE = 30;

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
    category: (filter !== 'all' && filter !== 'needs_tuning' && filter !== 'needs_regulation' && filter !== 'needs_repair') ? filter : undefined,
    pageSize: (filter === 'needs_tuning' || filter === 'needs_regulation' || filter === 'needs_repair') ? 5000 : 30,
  });

  const { getClient } = useClientsData();
  // Cargar todos los servicios (5000) cuando se usa filtro de servicio para calcular recomendaciones correctamente
  const { services } = useServicesData({ pageSize: (filter === 'needs_tuning' || filter === 'needs_regulation' || filter === 'needs_repair') ? 5000 : undefined });
  const { recommendations } = useRecommendations(pianos, services);

  // Resetear página local cuando cambia el filtro
  useEffect(() => {
    setLocalPage(1);
  }, [filter]);

  // Activar indicador de cálculo cuando cambia a filtro de servicio
  useEffect(() => {
    const isServiceFilter = filter === 'needs_tuning' || filter === 'needs_regulation' || filter === 'needs_repair';
    if (isServiceFilter) {
      setIsCalculatingRecommendations(true);
    }
  }, [filter]);

  // Desactivar indicador cuando las recomendaciones estén listas o cuando se cambia a filtro normal
  useEffect(() => {
    const isServiceFilter = filter === 'needs_tuning' || filter === 'needs_regulation' || filter === 'needs_repair';
    if (isServiceFilter && recommendations.length > 0 && !loading) {
      setIsCalculatingRecommendations(false);
    } else if (!isServiceFilter) {
      // Desactivar spinner si no es filtro de servicio
      setIsCalculatingRecommendations(false);
    }
  }, [recommendations, loading, filter]);

  // Filtrar pianos basado en el filtro de servicio necesario
  const allFilteredPianos = useMemo(() => {
    if (filter === 'needs_tuning') {
      const pianosNeedingTuning = recommendations
        .filter(r => r.type === 'tuning' && r.priority !== 'ok')
        .map(r => r.pianoId);
      return pianos.filter(p => pianosNeedingTuning.includes(p.id));
    }
    if (filter === 'needs_regulation') {
      const pianosNeedingRegulation = recommendations
        .filter(r => r.type === 'regulation' && r.priority !== 'ok')
        .map(r => r.pianoId);
      return pianos.filter(p => pianosNeedingRegulation.includes(p.id));
    }
    if (filter === 'needs_repair') {
      const pianosNeedingRepair = recommendations
        .filter(r => r.type === 'repair')
        .map(r => r.pianoId);
      return pianos.filter(p => pianosNeedingRepair.includes(p.id));
    }
    return pianos;
  }, [pianos, recommendations, filter]);

  // Paginar localmente los resultados filtrados cuando se usa filtro de servicio
  const filteredPianos = useMemo(() => {
    const isServiceFilter = filter === 'needs_tuning' || filter === 'needs_regulation' || filter === 'needs_repair';
    if (!isServiceFilter) {
      return allFilteredPianos;
    }
    const startIndex = (localPage - 1) * LOCAL_PAGE_SIZE;
    const endIndex = startIndex + LOCAL_PAGE_SIZE;
    return allFilteredPianos.slice(startIndex, endIndex);
  }, [allFilteredPianos, localPage, filter]);

  // Calcular total de páginas para filtros de servicio
  const totalFilteredCount = allFilteredPianos.length;
  const totalPages = Math.ceil(totalFilteredCount / LOCAL_PAGE_SIZE);

  // Determinar si es móvil, tablet o desktop
  const isMobile = width < 768;
  const isDesktop = width >= 1024;

  // Configurar header
  useFocusEffect(
    React.useCallback(() => {
    const isServiceFilter = filter === 'needs_tuning' || filter === 'needs_regulation' || filter === 'needs_repair';
    const displayCount = isServiceFilter ? totalFilteredCount : totalPianos;
    const filterLabel = filter === 'needs_tuning' ? 'que necesitan afinación' : 
                        filter === 'needs_regulation' ? 'que necesitan regulación' :
                        filter === 'needs_repair' ? 'que necesitan reparación' : '';
    
    setHeaderConfig({
      title: t('navigation.pianos'),
      subtitle: isServiceFilter 
        ? `${displayCount} ${displayCount === 1 ? 'piano' : 'pianos'} ${filterLabel}`
        : `${displayCount} ${displayCount === 1 ? 'piano' : 'pianos'}`,
      icon: 'pianokeys',
      showBackButton: false,
    });
    }, [totalPianos, totalFilteredCount, filter, t, setHeaderConfig])
  );

  // Estadísticas vienen del hook (calculadas en backend)

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
      // Verificar si el piano tiene alguna recomendación urgente
      const hasUrgentRecommendation = recommendations.some(
        r => r.pianoId === item.id && r.priority === 'urgent'
      );
      return (
        <PianoCard
          piano={item}
          clientName={client ? getClientFullName(client) : undefined}
          onPress={() => handlePianoPress(item)}
          hasUrgentRecommendation={hasUrgentRecommendation}
        />
      );
    },
    [getClient, handlePianoPress, recommendations]
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

  // Mostrar indicador de carga cuando se están calculando recomendaciones para filtros de servicio
  const isServiceFilter = filter === 'needs_tuning' || filter === 'needs_regulation' || filter === 'needs_repair';
  if (isServiceFilter && (isCalculatingRecommendations || loading || (pianos.length === 0 && loading) || (services.length === 0 && loading))) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <ThemedText style={{ marginTop: Spacing.md, color: COLORS.textSecondary }}>
            Calculando recomendaciones...
          </ThemedText>
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
            style={styles.filterChip}
            onPress={() => setFilter(f.key)}
            accessibilityRole="button"
            accessibilityLabel={`${t('common.filter')}: ${f.label}`}
            accessibilityState={{ selected: filter === f.key }}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === f.key ? COLORS.accent : COLORS.textSecondary },
              ]}
            >
              {f.label}
            </Text>
            {filter === f.key && (
              <View style={[styles.filterIndicator, { backgroundColor: COLORS.accent }]} />
            )}
          </Pressable>
        ))}
      </View>

      {/* Controles de paginación para filtros de servicio */}
      {(filter === 'needs_tuning' || filter === 'needs_regulation' || filter === 'needs_repair') && totalFilteredCount > 0 && (
        <View style={styles.paginationContainer}>
          <Text style={styles.paginationInfo}>
            Mostrando {((localPage - 1) * LOCAL_PAGE_SIZE) + 1}-{Math.min(localPage * LOCAL_PAGE_SIZE, totalFilteredCount)} de {totalFilteredCount} pianos
          </Text>
          <View style={styles.paginationControls}>
            <Pressable
              style={[styles.paginationButton, localPage === 1 && styles.paginationButtonDisabled]}
              onPress={() => setLocalPage(p => Math.max(1, p - 1))}
              disabled={localPage === 1}
            >
              <Text style={[styles.paginationButtonText, localPage === 1 && styles.paginationButtonTextDisabled]}>
                ← Anterior
              </Text>
            </Pressable>
            <Text style={styles.paginationPageInfo}>
              Página {localPage} de {totalPages}
            </Text>
            <Pressable
              style={[styles.paginationButton, localPage === totalPages && styles.paginationButtonDisabled]}
              onPress={() => setLocalPage(p => Math.min(totalPages, p + 1))}
              disabled={localPage === totalPages}
            >
              <Text style={[styles.paginationButtonText, localPage === totalPages && styles.paginationButtonTextDisabled]}>
                Siguiente →
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Lista de pianos */}
      {filteredPianos.length === 0 ? (
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
          data={filteredPianos}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  statNumber: {
    fontSize: 28,
    fontFamily: 'Montserrat',
    fontWeight: '700',
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Montserrat',
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
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  filterText: {
    fontSize: 15,
    fontFamily: 'Montserrat',
    fontWeight: '600',
  },
  filterIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '10%',
    right: '10%',
    height: 3,
    borderRadius: 4,
  },

  // Paginación
  paginationContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  paginationInfo: {
    fontSize: 13,
    fontFamily: 'Montserrat',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  paginationButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  paginationButtonDisabled: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  paginationButtonText: {
    fontSize: 13,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    fontWeight: '600',
    color: COLORS.primary,
  },
  paginationButtonTextDisabled: {
    color: COLORS.textTertiary,
  },
  paginationPageInfo: {
    fontSize: 13,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    fontWeight: '600',
    color: COLORS.textPrimary,
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
