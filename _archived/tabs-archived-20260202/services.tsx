/**
 * Services Screen - Professional Minimalist Design
 * Piano Emotion Manager
 * 
 * Diseño profesional y minimalista:
 * - Sin colorines infantiles
 * - Paleta neutra con acentos azules
 * - Estadísticas sobrias y elegantes
 * - Tipografía limpia y espaciado generoso
 */

import React from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useHeader } from '@/contexts/HeaderContext';
import { FlatList, Pressable, RefreshControl, StyleSheet, View, Text, useWindowDimensions, ActivityIndicator } from 'react-native';

import { ServiceCard, EmptyState } from '@/components/cards';
import { FAB } from '@/components/fab';
import { LoadingSpinner } from '@/components/loading-spinner';
import { SearchBar } from '@/components/search-bar';
import { useClientsData, usePianosData, useServicesData } from '@/hooks/data';
import { BorderRadius, Spacing } from '@/constants/theme';
import { Service, ServiceType, getClientFullName } from '@/types';
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

type FilterType = 'all' | ServiceType;

export default function ServicesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { setHeaderConfig } = useHeader();
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Debounce search
  const debouncedSearch = useDebounce(search, 300);

  const { services, loading, refresh } = useServicesData();
  const { getPiano } = usePianosData();
  const { getClient } = useClientsData();

  // Determinar si es móvil, tablet o desktop
  const isMobile = width < 768;
  const isDesktop = width >= 1024;

  // Configurar header
  useFocusEffect(
    React.useCallback(() => {
      setHeaderConfig({
        title: t('navigation.services'),
        subtitle: `${services.length} ${services.length === 1 ? 'servicio' : 'servicios'}`,
        icon: 'wrench.and.screwdriver.fill',
        showBackButton: false,
      });
    }, [services.length, t, setHeaderConfig])
  );

  // Estadísticas por tipo
  const stats = useMemo(() => {
    const tuning = services.filter(s => s.type === 'tuning').length;
    const maintenance = services.filter(s => s.type === 'maintenance').length;
    const repair = services.filter(s => s.type === 'repair').length;
    const regulation = services.filter(s => s.type === 'regulation').length;
    
    return { tuning, maintenance, repair, regulation };
  }, [services]);

  // Filtrar servicios
  const filteredServices = useMemo(() => {
    const now = new Date();
    let result = [...services].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Filtrar por tipo
    if (filter !== 'all') {
      result = result.filter((s) => s.type === filter);
    }

    // Filtrar por búsqueda
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase();
      result = result.filter((s) => {
        const piano = getPiano(s.pianoId);
        const client = getClient(s.clientId);
        return (
          piano?.brand.toLowerCase().includes(searchLower) ||
          piano?.model.toLowerCase().includes(searchLower) ||
          (client ? getClientFullName(client).toLowerCase().includes(searchLower) : false) ||
          s.notes?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Agregar flag isPast para determinar el color del borde
    return result.map(s => ({
      ...s,
      isPast: new Date(s.date) < now
    }));
  }, [services, filter, debouncedSearch, getPiano, getClient]);

  const handleServicePress = (service: Service) => {
    router.push({
      pathname: '/service/[id]' as any,
      params: { id: service.id },
    });
  };

  const handleAddService = () => {
    router.push({
      pathname: '/service/[id]' as any,
      params: { id: 'new' },
    });
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (refresh) {
      await refresh();
    }
    setRefreshing(false);
  }, [refresh]);

  const renderItem = useCallback(
    ({ item }: { item: Service }) => {
      const piano = getPiano(item.pianoId);
      const client = getClient(item.clientId);
      return (
        <ServiceCard
          service={item}
          pianoInfo={piano ? `${piano.brand} ${piano.model}` : undefined}
          clientName={client ? getClientFullName(client) : undefined}
          onPress={() => handleServicePress(item)}
          isPast={(item as any).isPast}
        />
      );
    },
    [getPiano, getClient]
  );

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'tuning', label: 'Afinación' },
    { key: 'maintenance', label: 'Mantenimiento' },
    { key: 'repair', label: 'Reparación' },
    { key: 'regulation', label: 'Regulación' },
  ];

  // Mostrar animación de carga inicial
  if (loading && services.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.background }]}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      {/* Grid de estadísticas por tipo - Diseño profesional */}
      <View style={[styles.statsSection, isDesktop && styles.statsSectionDesktop]}>
        <View style={[styles.statCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <Text style={[styles.statNumber, { color: COLORS.primary }]}>{stats.tuning}</Text>
          <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>Afinaciones</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <Text style={[styles.statNumber, { color: COLORS.primary }]}>{stats.maintenance}</Text>
          <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>Mantenimiento</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <Text style={[styles.statNumber, { color: COLORS.primary }]}>{stats.repair}</Text>
          <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>Reparaciones</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <Text style={[styles.statNumber, { color: COLORS.primary }]}>{stats.regulation}</Text>
          <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>Regulaciones</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar..."
          accessibilityLabel="Buscar servicios"
        />
      </View>

      {/* Filtros */}
      <View style={styles.filtersWrapper}>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={styles.filtersContainer}
          renderItem={({ item: f }) => (
            <Pressable
              style={[
                styles.filterChip,
                { 
                  backgroundColor: filter === f.key ? COLORS.primary : COLORS.background,
                  borderColor: filter === f.key ? COLORS.primary : COLORS.border
                },
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: filter === f.key ? COLORS.background : COLORS.textSecondary },
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {filteredServices.length === 0 ? (
        <EmptyState
          icon="wrench.fill"
          showBackButton={true}
          title={search || filter !== 'all' ? 'Sin resultados' : 'No hay servicios'}
          message={
            search || filter !== 'all'
              ? 'No se encontraron servicios'
              : 'Añade tu primer servicio'
          }
        />
      ) : (
        <FlatList
          data={filteredServices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              title="Cargando..."
              titleColor={COLORS.textSecondary}
            />
          }
        />
      )}

      <FAB 
        onPress={handleAddService} 
        accessibilityLabel="Nuevo servicio"
        accessibilityHint="Añadir un nuevo servicio"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Grid de estadísticas
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  statsSectionDesktop: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    gap: 4,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },

  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  filtersWrapper: {
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  filtersContainer: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    height: 34,
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
  },
});
