/**
 * Invoices Screen - Modern & Elegant Design
 * Piano Emotion Manager
 * 
 * Diseño moderno y elegante:
 * - Estadísticas discretas y compactas
 * - Sin bloques enormes ni negro
 * - Mucho aire y espacio
 * - Paleta suave y profesional
 */

import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { useHeader } from '@/contexts/HeaderContext';
import { FlatList, Pressable, RefreshControl, StyleSheet, View, Text, useWindowDimensions } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { FAB } from '@/components/fab';
import { LoadingSpinner } from '@/components/loading-spinner';
import { SearchBar } from '@/components/search-bar';
import { useInvoicesData } from '@/hooks/data';
import { BorderRadius, Spacing } from '@/constants/theme';
import { Invoice } from '@/types/invoice';
import { useDebounce } from '@/hooks/use-debounce';
import React from 'react';

// Paleta moderna y elegante
const COLORS = {
  primary: '#003a8c',           // Azul corporativo
  accent: '#e07a5f',            // Terracota (rojo teja)
  success: '#4A7C59',           // Verde sobrio que armoniza con la paleta
  warning: '#e07a5f',           // Rojo teja (pendiente)
  background: '#FAFAFA',        // Fondo
  surface: '#FFFFFF',           // Blanco
  surfaceAlt: '#F8F9FA',        // Gris muy claro
  border: '#E5E7EB',            // Gris claro
  borderLight: '#F3F4F6',       // Gris muy claro
  text: '#1A1A2E',              // Texto principal
  textSecondary: '#6B7280',     // Texto secundario
  textTertiary: '#9CA3AF',      // Texto terciario
};

type FilterType = 'all' | Invoice['status'];

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function InvoicesScreen() {
  const router = useRouter();
  const { setHeaderConfig } = useHeader();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // Mes actual
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear()); // Año actual
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (params.filter === 'pending' || params.filter === 'overdue') {
      setFilter('sent');
    }
  }, [params.filter]);

  const debouncedSearch = useDebounce(search, 300);
  
  // Calcular dateFrom y dateTo basado en los filtros seleccionados
  const { dateFrom, dateTo } = useMemo(() => {
    // Siempre filtrar por mes y año específicos
    const start = new Date(selectedYear, selectedMonth, 1);
    const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    return {
      dateFrom: start.toISOString(),
      dateTo: end.toISOString()
    };
  }, [selectedMonth, selectedYear]);
  
  const { invoices, loading, totalInvoices, stats: backendStats } = useInvoicesData({
    search: debouncedSearch,
    status: filter !== 'all' ? filter : undefined,
    dateFrom,
    dateTo,
  });

  const isDesktop = width >= 1024;

  // Usar estadísticas del backend (filtradas por mes/año)
  const stats = useMemo(() => {
    if (backendStats) {
      return {
        total: backendStats.totalAmount || 0,
        pending: backendStats.pendingAmount || 0,
        paid: backendStats.paidAmount || 0,
        draft: backendStats.total - backendStats.paid - backendStats.pending || 0,
        count: invoices.length
      };
    }
    // Fallback: calcular del frontend si no hay stats del backend
    const total = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const pending = invoices.filter(inv => inv.status === 'sent').reduce((sum, inv) => sum + inv.total, 0);
    const paid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0);
    const draft = invoices.filter(inv => inv.status === 'draft').length;
    
    return { total, pending, paid, count: invoices.length, draft };
  }, [invoices, backendStats]);

  // Filtrar facturas (el backend ya filtra por fecha, aquí solo filtramos overdue)
  const filteredInvoices = useMemo(() => {
    const now = new Date();

    return invoices
      .filter(inv => {
        // Filtro overdue (solo si viene del parámetro de URL)
        let matchesOverdue = true;
        if (params.filter === 'overdue' && inv.dueDate) {
          const dueDate = new Date(inv.dueDate);
          matchesOverdue = dueDate < now;
        }
        
        return matchesOverdue;
      })
      .sort((a, b) => {
        // Ordenar por fecha ascendente (más cercana en el tiempo primero)
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
  }, [invoices, params.filter]);

  const statusFilters = useMemo(() => [
    { key: 'all' as FilterType, label: 'Todas' },
    { key: 'draft' as FilterType, label: 'Borrador' },
    { key: 'sent' as FilterType, label: 'Enviada' },
    { key: 'paid' as FilterType, label: 'Pagada' },
    { key: 'cancelled' as FilterType, label: 'Anulada' },
  ], []);

  // Configurar header - DEBE estar después de filteredInvoices
  useFocusEffect(
    React.useCallback(() => {
      let subtitle = `${totalInvoices} ${totalInvoices === 1 ? 'factura' : 'facturas'}`;
      
      // Mostrar filtros activos en el subtítulo
      // Siempre mostrar mes y año en el subtítulo
      subtitle += ` - ${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
      if (false) { // Mantener estructura pero deshabilitar
      }
      setHeaderConfig({
        title: 'Facturaci\u00f3n',
        subtitle,
        icon: 'doc.plaintext',
        showBackButton: false,
      });
    }, [totalInvoices, selectedMonth, selectedYear, setHeaderConfig])
  );



  // Funciones de navegación eliminadas - ahora se usan dropdowns

  const handleInvoicePress = useCallback((invoice: Invoice) => {
    router.push({
      pathname: '/invoice/[id]' as any,
      params: { id: invoice.id },
    });
  }, [router]);

  const handleAddInvoice = useCallback(() => {
    router.push({
      pathname: '/invoice/[id]' as any,
      params: { id: 'new' },
    });
  }, [router]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const renderItem = useCallback(({ item }: { item: Invoice }) => (
    <InvoiceCard 
      invoice={item}
      onPress={() => handleInvoicePress(item)}
    />
  ), [handleInvoicePress]);

  if (loading && invoices.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingState}>
          <LoadingSpinner size="large" messageType="invoices" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Contenedor superior sin sombras */}
      <View style={styles.topSection}>
        {/* Estadísticas discretas en línea */}
        <View style={[styles.statsRow, isDesktop && styles.statsRowDesktop]}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>
            €{stats.total.toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Pendiente</Text>
          <Text style={[styles.statValue, { color: COLORS.warning }]}>
            €{stats.pending.toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Cobrado</Text>
          <Text style={[styles.statValue, { color: COLORS.success }]}>
            €{stats.paid.toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Borradores</Text>
          <Text style={[styles.statValue, { color: COLORS.textSecondary }]}>
            {stats.draft}
          </Text>
        </View>
        </View>

        {/* Barra de búsqueda */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar factura..."
            accessibilityLabel="Buscar facturas"
          />
        </View>
      </View>

      {/* Filtros compactos */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterGroup}>
          {statusFilters.map((f) => (
            <Pressable
              key={f.key}
              style={styles.filterChip}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[
                styles.filterChipText,
                { fontSize: width < 768 ? 11 : 14 },
                filter === f.key && { color: COLORS.accent, fontWeight: '600' },
              ]}>
                {f.label}
              </Text>
              {filter === f.key && (
                <View style={[styles.filterIndicator, { backgroundColor: COLORS.accent }]} />
              )}
            </Pressable>
          ))}
        </View>
        
        <View style={styles.periodSelectorContainer}>
          {/* Selector de mes desplegable */}
          <View style={styles.periodSelector}>
            <Picker
              selectedValue={selectedMonth}
              onValueChange={(value) => setSelectedMonth(value as number)}
              style={styles.picker}
            >
              {MONTH_NAMES.map((month, index) => (
                <Picker.Item key={index} label={month} value={index} />
              ))}
            </Picker>
          </View>

          {/* Selector de año desplegable */}
          <View style={styles.periodSelector}>
            <Picker
              selectedValue={selectedYear}
              onValueChange={(value) => setSelectedYear(value as number)}
              style={styles.picker}
            >
              {Array.from({ length: new Date().getFullYear() - 2020 + 1 }, (_, i) => 2020 + i).map((year) => (
                <Picker.Item key={year} label={year.toString()} value={year} />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      {/* Lista de facturas */}
      {filteredInvoices.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            {search || filter !== 'all' ? 'No hay resultados' : 'No hay facturas'}
          </Text>
          <Text style={styles.emptyMessage}>
            {search || filter !== 'all'
              ? 'Intenta con otros filtros'
              : 'Crea tu primera factura'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredInvoices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.textSecondary}
            />
          }
        />
      )}

      <FAB 
        onPress={handleAddInvoice} 
        accessibilityLabel="Nueva factura"
      />
    </View>
  );
}

// Card de factura elegante
function InvoiceCard({ invoice, onPress }: { invoice: Invoice; onPress: () => void }) {
  const statusConfig = {
    draft: { color: COLORS.textTertiary, bg: COLORS.surfaceAlt, label: 'Borrador' },
    sent: { color: COLORS.warning, bg: COLORS.warning + '10', label: 'Enviada' },
    paid: { color: COLORS.success, bg: COLORS.success + '10', label: 'Pagada' },
    cancelled: { color: COLORS.textSecondary, bg: COLORS.borderLight, label: 'Anulada' },
  };

  const config = statusConfig[invoice.status];

  return (
    <Pressable style={styles.invoiceCard} onPress={onPress}>
      <View style={styles.invoiceHeader}>
        <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
          <Text style={[styles.statusText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
      </View>
      
      <Text style={styles.invoiceClient}>{invoice.clientName}</Text>
      
      <View style={styles.invoiceFooter}>
        <Text style={styles.invoiceDate}>{formatDate(invoice.date)}</Text>
        <Text style={styles.invoiceTotal}>€{invoice.total.toFixed(2)}</Text>
      </View>
    </Pressable>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topSection: {
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Estadísticas discretas en línea
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  statsRowDesktop: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Búsqueda
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },

  // Filtros compactos
  filtersContainer: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: Spacing.sm,
  },
  filterGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  filterChip: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    position: 'relative',
    minWidth: '15%',
    maxWidth: '16%',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  filterChipText: {
    fontSize: 15, // Se ajustará dinámicamente en el componente
    color: COLORS.textSecondary,
  },
  filterIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '10%',
    right: '10%',
    height: 3,
    borderRadius: 4,
  },
  periodSelectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',  // Centrar contenido
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 0,
    paddingHorizontal: Spacing.md,  // Más padding para mejor espaciado
    paddingVertical: 8,  // Aumentado para mejor alineación vertical
    gap: 8,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  picker: {
    flex: 1,
    height: 40,
    color: COLORS.text,
    borderWidth: 0,
    textAlign: 'center',  // Centrar texto horizontalmente
    paddingHorizontal: Spacing.sm,  // Margen interno para no estar pegado
  },
  navButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  periodTextContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    minWidth: 120,
    textAlign: 'center',
  },

  // Lista
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
    gap: Spacing.sm,
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: Spacing.sm,
  },
  emptyMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Card de factura elegante
  invoiceCard: {
    backgroundColor: COLORS.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  invoiceClient: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  invoiceDate: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  invoiceTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.accent,
  },
});
