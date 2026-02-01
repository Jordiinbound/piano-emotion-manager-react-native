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
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // null = "Todos los meses"
  const [selectedYear, setSelectedYear] = useState<number | null>(null); // null = "Todos los años"
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (params.filter === 'pending' || params.filter === 'overdue') {
      setFilter('sent');
    }
  }, [params.filter]);

  const debouncedSearch = useDebounce(search, 300);
  
  // Calcular dateFrom y dateTo basado en los filtros seleccionados
  const { dateFrom, dateTo } = useMemo(() => {
    if (selectedMonth === null && selectedYear === null) {
      // Sin filtro de fecha
      return { dateFrom: undefined, dateTo: undefined };
    }
    
    let year = selectedYear || new Date().getFullYear();
    let month = selectedMonth;
    
    if (selectedMonth !== null && selectedYear !== null) {
      // Mes y año específicos
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      return {
        dateFrom: start.toISOString(),
        dateTo: end.toISOString()
      };
    } else if (selectedMonth !== null) {
      // Solo mes seleccionado (todos los años)
      // Buscar desde 2022 hasta 2026
      const start = new Date(2022, month, 1);
      const end = new Date(2026, month + 1, 0, 23, 59, 59);
      return {
        dateFrom: start.toISOString(),
        dateTo: end.toISOString()
      };
    } else if (selectedYear !== null) {
      // Solo año seleccionado (todos los meses)
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59);
      return {
        dateFrom: start.toISOString(),
        dateTo: end.toISOString()
      };
    }
    
    return { dateFrom: undefined, dateTo: undefined };
  }, [selectedMonth, selectedYear]);
  
  const { invoices, loading, totalInvoices } = useInvoicesData({
    search: debouncedSearch,
    status: filter !== 'all' ? filter : undefined,
    dateFrom,
    dateTo,
  });

  const isDesktop = width >= 1024;

  // Calcular estadísticas
  const stats = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const pending = invoices.filter(inv => inv.status === 'sent').reduce((sum, inv) => sum + inv.total, 0);
    const paid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0);
    const draft = invoices.filter(inv => inv.status === 'draft').length;
    
    return { total, pending, paid, count: invoices.length, draft };
  }, [invoices]);

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
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
      let subtitle = `${filteredInvoices.length} ${filteredInvoices.length === 1 ? 'factura' : 'facturas'}`;
      
      // Mostrar filtros activos en el subtítulo
      const filters = [];
      if (selectedMonth !== null) filters.push(MONTH_NAMES[selectedMonth]);
      if (selectedYear !== null) filters.push(String(selectedYear));
      if (filters.length > 0) {
        subtitle += ` - ${filters.join(' ')}`;
      }
      setHeaderConfig({
        title: 'Facturaci\u00f3n',
        subtitle,
        icon: 'doc.plaintext',
        showBackButton: false,
      });
    }, [filteredInvoices.length, selectedMonth, selectedYear, setHeaderConfig])
  );



  const handlePrevMonth = () => {
    if (selectedMonth === null) {
      setSelectedMonth(11); // Empezar desde diciembre
    } else if (selectedMonth === 0) {
      setSelectedMonth(11);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === null) {
      setSelectedMonth(0); // Empezar desde enero
    } else if (selectedMonth === 11) {
      setSelectedMonth(0);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handlePrevYear = () => {
    if (selectedYear === null) {
      setSelectedYear(2025); // Año por defecto
    } else {
      setSelectedYear(selectedYear - 1);
    }
  };

  const handleNextYear = () => {
    if (selectedYear === null) {
      setSelectedYear(2026); // Año por defecto
    } else {
      setSelectedYear(selectedYear + 1);
    }
  };

  const handleResetMonth = () => {
    setSelectedMonth(null);
  };

  const handleResetYear = () => {
    setSelectedYear(null);
  };

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

      {/* Filtros compactos */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterGroup}>
          {statusFilters.map((f) => (
            <Pressable
              key={f.key}
              style={[
                styles.filterChip,
                filter === f.key && styles.filterChipActive,
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[
                styles.filterChipText,
                filter === f.key && styles.filterChipTextActive,
              ]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
        
        <View style={styles.periodSelectorContainer}>
          {/* Selector de mes independiente */}
          <View style={styles.periodSelector}>
            <Pressable onPress={handlePrevMonth} style={styles.navButton}>
              <Text style={styles.navButtonText}>←</Text>
            </Pressable>
            <Pressable onPress={handleResetMonth} style={styles.periodTextContainer}>
              <Text style={styles.periodText}>
                {selectedMonth !== null ? MONTH_NAMES[selectedMonth] : 'Todos los meses'}
              </Text>
            </Pressable>
            <Pressable onPress={handleNextMonth} style={styles.navButton}>
              <Text style={styles.navButtonText}>→</Text>
            </Pressable>
          </View>

          {/* Selector de año independiente */}
          <View style={styles.periodSelector}>
            <Pressable onPress={handlePrevYear} style={styles.navButton}>
              <Text style={styles.navButtonText}>←</Text>
            </Pressable>
            <Pressable onPress={handleResetYear} style={styles.periodTextContainer}>
              <Text style={styles.periodText}>
                {selectedYear !== null ? selectedYear : 'Todos los años'}
              </Text>
            </Pressable>
            <Pressable onPress={handleNextYear} style={styles.navButton}>
              <Text style={styles.navButtonText}>→</Text>
            </Pressable>
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
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
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
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
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
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: Spacing.sm,
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
