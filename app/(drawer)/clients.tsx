/**
 * Clients Screen - Professional Minimalist Design
 * Piano Emotion Manager
 * 
 * Diseño profesional y minimalista:
 * - Sin colorines infantiles
 * - Paleta neutra con acentos azules
 * - Estadísticas sobrias y elegantes
 * - Tipografía limpia y espaciado generoso
 */

import { useRouter, usePathname } from 'expo-router';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useHeader } from '@/contexts/HeaderContext';
import { FlatList, Pressable, RefreshControl, StyleSheet, View, Text, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { ClientCard, EmptyState } from '@/components/cards';
import { FAB } from '@/components/fab';
import { LoadingSpinner } from '@/components/loading-spinner';
import { SearchBar } from '@/components/search-bar';
import { useClientsData, usePianosData } from '@/hooks/data';
import { useTranslation } from '@/hooks/use-translation';
import { BorderRadius, Spacing } from '@/constants/theme';
import { Client, getClientFullName } from '@/types';

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

export default function ClientsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const { setHeaderConfig } = useHeader();
  const { width } = useWindowDimensions();
  const { clients, loading, refresh, stats, loadMore, hasMore, isLoadingMore } = useClientsData({ pageSize: 50 });
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para filtros
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedRouteGroup, setSelectedRouteGroup] = useState<string>('');
  
  // Estado de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // Determinar si es móvil, tablet o desktop
  const isMobile = width < 768;
  const isDesktop = width >= 1024;

  // Calcular listas únicas para los filtros
  const uniqueProvinces = useMemo(() => {
    const provinces = clients
      .map(c => c.address?.province)
      .filter((r): r is string => !!r);
    return ['Todas', ...Array.from(new Set(provinces)).sort()];
  }, [clients]);

  const uniqueCities = useMemo(() => {
    const cities = clients
      .map(c => c.address?.city)
      .filter((c): c is string => !!c);
    return ['Todas', ...Array.from(new Set(cities)).sort()];
  }, [clients]);

  const uniqueRouteGroups = useMemo(() => {
    const groups = clients
      .map(c => (c as any).routeGroup)
      .filter((g): g is string => !!g);
    return ['Todos', ...Array.from(new Set(groups)).sort()];
  }, [clients]);

  // Configurar header - useFocusEffect para actualización al recibir foco
  useFocusEffect(
    useCallback(() => {
    setHeaderConfig({
      title: t('navigation.clients'),
      subtitle: `${stats?.total || 0} ${(stats?.total || 0) === 1 ? 'cliente' : 'clientes'}`,
      icon: 'person.2.fill',
      showBackButton: false,
      rightAction: (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable 
            style={styles.headerButton as any}
            onPress={() => {}}
            accessibilityRole="button"
            accessibilityLabel="Importar clientes"
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
            <Text style={styles.headerButtonText as any}>Importar</Text>
          </Pressable>
          <Pressable 
            style={styles.headerButton as any}
            onPress={() => {}}
            accessibilityRole="button"
            accessibilityLabel="Exportar clientes"
          >
            <Ionicons name="cloud-download-outline" size={20} color="#FFFFFF" />
            <Text style={styles.headerButtonText as any}>Exportar</Text>
          </Pressable>
        </View>
      ),
    });
    }, [stats?.total, t, setHeaderConfig])
  );

  // Estadísticas desde el backend (getStats endpoint)

  // Debugging
  console.log('[Clients Debug] Total clients from backend:', clients.length);
  console.log('[Clients Debug] Loading:', loading);
  console.log('[Clients Debug] Has more:', hasMore);
  
  // Filtrar clientes
  const filteredClients = useMemo(() => {
    return clients.filter((c: any) => {
      // Filtro de búsqueda
      if (search.trim()) {
        const searchLower = search.toLowerCase();
        const fullName = getClientFullName(c).toLowerCase();
        const email = c.email?.toLowerCase() || '';
        const phone = c.phone?.toLowerCase() || '';
        const address = c.address?.toLowerCase() || '';
        
        const matchesSearch = (
          fullName.includes(searchLower) ||
          email.includes(searchLower) ||
          phone.includes(searchLower) ||
          address.includes(searchLower)
        );
        
        if (!matchesSearch) return false;
      }
      
      // Filtro de provincia
      if (selectedProvince && selectedProvince !== 'Todas') {
        if (c.region !== selectedProvince) return false;
      }
      
      // Filtro de ciudad
      if (selectedCity && selectedCity !== 'Todas') {
        if (c.city !== selectedCity) return false;
      }
      
      // Filtro de grupo de ruta
      if (selectedRouteGroup && selectedRouteGroup !== 'Todos') {
        if (c.routeGroup !== selectedRouteGroup) return false;
      }
      
      return true;
    });
  }, [clients, search, selectedProvince, selectedCity, selectedRouteGroup]);
  
  // Debugging filtros
  console.log('[Clients Debug] Filtered clients:', filteredClients.length);
  console.log('[Clients Debug] Search:', search);
  console.log('[Clients Debug] Selected province:', selectedProvince);
  console.log('[Clients Debug] Selected city:', selectedCity);
  console.log('[Clients Debug] Selected route group:', selectedRouteGroup);
  
  // Calcular paginación basada en filteredClients
  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const result = filteredClients.slice(startIndex, endIndex);
    console.log('[Clients Debug] Current page:', currentPage);
    console.log('[Clients Debug] Total pages:', totalPages);
    console.log('[Clients Debug] Start index:', startIndex, 'End index:', endIndex);
    console.log('[Clients Debug] Paginated clients:', result.length);
    return result;
  }, [filteredClients, currentPage, totalPages]);
  
  // Resetear a la primera página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedProvince, selectedCity, selectedRouteGroup]);
  
  // Cargar todos los clientes del backend automáticamente
  useEffect(() => {
    // Si hay más clientes disponibles y no estamos cargando, cargar más
    if (hasMore && !isLoadingMore && !loading) {
      console.log('[Clients Debug] Loading more clients automatically...');
      loadMore();
    }
  }, [hasMore, isLoadingMore, loading, loadMore]);

  const handleClientPress = (client: Client) => {
    router.push({
      pathname: '/client/[id]' as any,
      params: { id: client.id },
    });
  };

  const handleAddClient = () => {
    router.push({
      pathname: '/client/[id]' as any,
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
    ({ item }: { item: Client }) => {
      return (
        <ClientCard
          client={item}
          pianoCount={(item as any).pianoCount || 0}
          onPress={() => handleClientPress(item)}
        />
      );
    },
    []
  );

  // Mostrar animación de carga inicial
  if (loading && clients.length === 0) {
    return (
      <View style={styles.container as any}>
        <View style={styles.loadingState as any}>
          <LoadingSpinner size="large" messageType="clients" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container as any}>
      {/* Estadísticas minimalistas */}
      <View style={[styles.statsSection, isDesktop && styles.statsSectionDesktop]}>
        <View style={styles.statCard as any}>
          <Text style={styles.statNumber as any}>{stats.total}</Text>
          <Text style={styles.statLabel as any}>Total</Text>
        </View>
        <View style={styles.statCard as any}>
          <Text style={styles.statNumber as any}>{stats.active}</Text>
          <Text style={styles.statLabel as any}>Activos</Text>
        </View>
        <View style={styles.statCard as any}>
          <Text style={styles.statNumber as any}>{stats.vip}</Text>
          <Text style={styles.statLabel as any}>VIP</Text>
        </View>
        <View style={styles.statCard as any}>
          <Text style={styles.statNumber as any}>{stats.withPianos}</Text>
          <Text style={styles.statLabel as any}>Con Pianos</Text>
        </View>
      </View>

      {/* Barra de búsqueda */}
      <View style={[styles.searchSection, isDesktop && styles.searchSectionDesktop]}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('clients.search')}
        />
      </View>

      {/* Filtros */}
      <View style={[styles.filtersSection, isDesktop && styles.filtersSectionDesktop]}>
        <View style={styles.filterItem as any}>
          <Text style={styles.filterLabel as any}>COMUNIDAD</Text>
          <select 
            value={selectedProvince || ''}
            onChange={(e: any) => setSelectedProvince(e.target.value)}
            style={styles.filterSelect as any}
          >
            <option value="">Todas</option>
            {uniqueProvinces.filter(p => p !== 'Todas').map(province => (
              <option key={province} value={province}>{province}</option>
            ))}
          </select>
        </View>
        
        <View style={styles.filterItem as any}>
          <Text style={styles.filterLabel as any}>CIUDAD</Text>
          <select 
            value={selectedCity || ''}
            onChange={(e: any) => setSelectedCity(e.target.value)}
            style={styles.filterSelect as any}
          >
            <option value="">Todas</option>
            {uniqueCities.filter(c => c !== 'Todas').map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </View>
        
        <View style={styles.filterItem as any}>
          <Text style={styles.filterLabel as any}>GRUPO DE RUTA</Text>
          <select 
            value={selectedRouteGroup || ''}
            onChange={(e: any) => setSelectedRouteGroup(e.target.value)}
            style={styles.filterSelect as any}
          >
            <option value="">Todos</option>
            {uniqueRouteGroups.filter(g => g !== 'Todos').map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </View>
      </View>

      {/* Lista de clientes */}
      <FlatList<Client>
        data={paginatedClients}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          isDesktop && styles.listContentDesktop,
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="person-add"
            title={search ? t('clients.noResults') : t('clients.empty')}
            message={
              search
                ? t('clients.noResultsMessage')
                : t('clients.emptyMessage')
            }
            actionLabel={search ? undefined : t('clients.addFirst')}
            onAction={search ? undefined : handleAddClient}
          />
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.paginationContainer as any}>
              <Pressable
                style={[
                  styles.paginationButton,
                  currentPage === 1 && styles.paginationButtonDisabled,
                ]}
                onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <Ionicons 
                  name="chevron-back" 
                  size={20} 
                  color={currentPage === 1 ? COLORS.textTertiary : COLORS.primary} 
                />
                <Text style={[
                  styles.paginationButtonText,
                  currentPage === 1 && styles.paginationButtonTextDisabled,
                ]}>Anterior</Text>
              </Pressable>
              
              <Text style={styles.paginationInfo as any}>
                Página {currentPage} de {totalPages}
              </Text>
              
              <Pressable
                style={[
                  styles.paginationButton,
                  currentPage === totalPages && styles.paginationButtonDisabled,
                ]}
                onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <Text style={[
                  styles.paginationButtonText,
                  currentPage === totalPages && styles.paginationButtonTextDisabled,
                ]}>Siguiente</Text>
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={currentPage === totalPages ? COLORS.textTertiary : COLORS.primary} 
                />
              </Pressable>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />

      {/* FAB */}
      <FAB icon="plus" onPress={handleAddClient} label={t('clients.add')} />
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
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statNumber: {
    fontSize: 28,
    fontFamily: 'Montserrat',
    fontWeight: '700',
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Montserrat',
    fontWeight: '500',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Búsqueda
  searchSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchSectionDesktop: {
    paddingHorizontal: Spacing.xl,
  },
  
  // Filtros
  filtersSection: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  filtersSectionDesktop: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 11,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  filterSelect: {
    flex: 1,
    minHeight: 40,
    height: 40,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: COLORS.textPrimary,
    fontWeight: '500',
    outlineStyle: 'none', // Eliminar outline en web
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minHeight: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  filterButtonText: {
    fontSize: 13,
    fontFamily: 'Montserrat',
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  
  // Lista
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
  },
  listContentDesktop: {
    paddingHorizontal: Spacing.xl,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: COLORS.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  paginationButtonDisabled: {
    borderColor: COLORS.border,
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    fontWeight: '600',
    color: COLORS.primary,
  },
  paginationButtonTextDisabled: {
    color: COLORS.textTertiary,
  },
  paginationInfo: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  loadingMore: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  
  // Botones del header
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    fontWeight: '600',
  },
});
