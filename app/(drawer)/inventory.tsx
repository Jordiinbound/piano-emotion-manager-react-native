import React from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useHeader } from '@/contexts/HeaderContext';
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { EmptyState } from '@/components/cards';
import { LowStockAlert } from '@/components/low-stock-alert';
import { BarcodeScanner } from '@/components/barcode-scanner';
import { BarcodeResult } from '@/services/barcode-scanner-service';
import { FAB } from '@/components/fab';
import { LoadingSpinner } from '@/components/loading-spinner';
import { SearchBar } from '@/components/search-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useInventoryData } from '@/hooks/data';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useInventoryCategories } from '@/hooks/data/use-inventory-categories';
import { BorderRadius, Spacing } from '@/constants/theme';
import { MATERIAL_CATEGORY_LABELS, MaterialCategory } from '@/types/inventory';
import type { Material as InventoryItem } from '@/types/inventory';

type FilterType = 'all' | 'low_stock' | MaterialCategory;

export default function InventoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { setHeaderConfig } = useHeader();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { materials: items, loading, lowStockItems } = useInventoryData();
  const { suppliers } = useSuppliers();
  const { categories: dbCategories, isLoading: categoriesLoading } = useInventoryCategories();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showScanner, setShowScanner] = useState(false);

  const accent = useThemeColor({}, 'accent');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const warning = useThemeColor({}, 'warning');
  const error = useThemeColor({}, 'error');
  const success = useThemeColor({}, 'success');

  // Configurar header
  useFocusEffect(
    React.useCallback(() => {
    setHeaderConfig({
      title: t('navigation.inventory'),
      subtitle: `${items.length} ${items.length === 1 ? 'articulo' : 'articulos'}`,
      icon: 'shippingbox.fill',
      showBackButton: false,
    });
    }, [items.length, t, setHeaderConfig])
  );

  // Filtrar items
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Filtrar por stock bajo
    if (filter === 'low_stock') {
      result = lowStockItems;
    } else if (filter !== 'all') {
      result = result.filter((i) => i.category === filter);
    }

    // Filtrar por búsqueda
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(searchLower) ||
          i.description?.toLowerCase().includes(searchLower) ||
          i.supplierName?.toLowerCase().includes(searchLower)
      );
    }

    // Ordenar: primero los de stock bajo, luego alfabéticamente
    return result.sort((a, b) => {
      const aLow = a.quantity <= a.minStock;
      const bLow = b.quantity <= b.minStock;
      if (aLow && !bLow) return -1;
      if (!aLow && bLow) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [items, filter, search, lowStockItems]);

  const handleItemPress = (item: InventoryItem) => {
    router.push({
      pathname: '/inventory/[id]' as any,
      params: { id: item.id },
    });
  };

  const handleAddItem = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/inventory/[id]' as any,
      params: { id: 'new' },
    });
  };

  const handleScanBarcode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowScanner(true);
  };

  const handleBarcodeScanned = (result: BarcodeResult) => {
    setShowScanner(false);
    
    // Buscar material por código de barras o SKU
    const foundItem = items.find(
      (item) => item.barcode === result.code || item.sku === result.code
    );

    if (foundItem) {
      // Si se encuentra, abrir el material
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleItemPress(foundItem);
    } else {
      // Si no se encuentra, crear nuevo con el código de barras
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.push({
        pathname: '/inventory/[id]' as any,
        params: { id: 'new', barcode: result.code },
      });
    }
  };

  const getStockColor = (item: InventoryItem) => {
    if (item.quantity === 0) return error;
    if (item.quantity <= item.minStock) return warning;
    return success;
  };

  const renderItem = useCallback(
    ({ item }: { item: InventoryItem }) => {
      const stockColor = getStockColor(item);
      const isLowStock = item.quantity <= item.minStock;

      return (
        <Pressable
          style={[styles.itemCard, { backgroundColor: cardBg, borderColor }]}
          onPress={() => handleItemPress(item)}
        >
          <View style={styles.itemContent}>
            <View style={styles.itemHeader}>
              <ThemedText style={styles.itemName} numberOfLines={1}>
                {item.name}
              </ThemedText>
              {isLowStock && (
                <View style={[styles.alertBadge, { backgroundColor: `${stockColor}20` }]}>
                  <IconSymbol
                    name="exclamationmark.triangle.fill"
                    size={12}
                    color={stockColor}
                  />
                </View>
              )}
            </View>

            <ThemedText style={[styles.itemCategory, { color: textSecondary }]}>
              {item.categoryName || (item.category ? MATERIAL_CATEGORY_LABELS[item.category as keyof typeof MATERIAL_CATEGORY_LABELS] : 'Sin categoría')}
            </ThemedText>

            <View style={styles.stockRow}>
              <View style={styles.stockInfo}>
                <ThemedText style={[styles.stockLabel, { color: textSecondary }]}>
                  Stock:
                </ThemedText>
                <ThemedText style={[styles.stockValue, { color: stockColor }]}>
                  {item.quantity} {item.unit}
                </ThemedText>
              </View>
              <ThemedText style={[styles.minStock, { color: textSecondary }]}>
                Mín: {item.minStock}
              </ThemedText>
            </View>

            {item.price !== undefined && (
              <ThemedText style={[styles.itemPrice, { color: textSecondary }]}>
                €{item.price.toFixed(2)} / {item.unit}
              </ThemedText>
            )}
          </View>

          <IconSymbol name="chevron.right" size={20} color={textSecondary} />
        </Pressable>
      );
    },
    [cardBg, borderColor, textSecondary, error, warning, success]
  );

  // Construir filtros dinámicamente desde categorías de BD
  const filters: { key: FilterType; label: string }[] = useMemo(() => {
    const baseFilters = [
      { key: 'all' as FilterType, label: t('common.all') },
      { key: 'low_stock' as FilterType, label: `${t('inventory.lowStockAlert')} (${lowStockItems.length})` },
    ];

    // Si hay categorías de BD, usarlas; si no, usar fallback hardcodeado
    if (dbCategories && dbCategories.length > 0) {
      const categoryFilters = dbCategories.map(cat => ({
        key: cat.key as FilterType,
        label: cat.label,
      }));
      return [...baseFilters, ...categoryFilters];
    }

    // Fallback: categorías hardcodeadas si BD no está disponible
    return [
      ...baseFilters,
      { key: 'strings' as FilterType, label: t('inventory.categories.strings') },
      { key: 'hammers' as FilterType, label: t('inventory.categories.hammers') },
      { key: 'felts' as FilterType, label: t('inventory.categories.felts') },
      { key: 'pins' as FilterType, label: MATERIAL_CATEGORY_LABELS.pins },
      { key: 'keys' as FilterType, label: MATERIAL_CATEGORY_LABELS.keys },
      { key: 'pedals' as FilterType, label: MATERIAL_CATEGORY_LABELS.pedals },
      { key: 'hardware' as FilterType, label: MATERIAL_CATEGORY_LABELS.hardware },
      { key: 'chemicals' as FilterType, label: MATERIAL_CATEGORY_LABELS.chemicals },
      { key: 'tools' as FilterType, label: t('inventory.categories.tools') },
      { key: 'other' as FilterType, label: MATERIAL_CATEGORY_LABELS.other },
    ];
  }, [dbCategories, lowStockItems.length, t]);

  return (
    <ThemedView style={styles.container}>
      {/* Alerta de stock bajo con enlace a Piano Emotion Store o proveedor */}
      {lowStockItems.length > 0 && filter !== 'low_stock' && (
        <LowStockAlert 
          items={lowStockItems.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            minStock: item.minStock,
            unit: item.unit,
            category: item.category,
            supplierId: item.supplierId,
          }))}
          suppliers={suppliers}
          onItemPress={(item) => handleItemPress(item as InventoryItem)}
        />
      )}

      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchBarWrapper}>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder={t('common.search') + '...'}
          accessibilityLabel={t('common.search') + ' ' + t('navigation.inventory').toLowerCase()}
            />
          </View>
          <Pressable
            style={[styles.scanButton, { backgroundColor: accent }]}
            onPress={handleScanBarcode}
          >
            <IconSymbol name="camera.fill" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Filtros */}
      <View style={[styles.filtersWrapper, { borderBottomColor: borderColor }]}>
        <View style={styles.filtersContainer}>
          {filters.map((f) => (
            <Pressable
              key={f.key}
              style={styles.filterChip}
              onPress={() => setFilter(f.key)}
            >
              <ThemedText
                style={[
                  styles.filterText,
                  { 
                    color: textSecondary,
                    fontSize: width < 1400 ? 10 : 13, // 10px para tablet/móvil, 13px para desktop grande
                  },
                  filter === f.key && { color: accent, fontWeight: '600' },
                ]}
              >
                {f.label}
              </ThemedText>
              {filter === f.key && (
                <View style={[styles.filterIndicator, { backgroundColor: accent }]} />
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <LoadingSpinner messageType="inventory" size="medium" />
        </View>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon="shippingbox.fill"
          title={search || filter !== 'all' ? t('common.noResults') : t('inventory.noItems')}
          message={
            search || filter !== 'all'
              ? 'No se encontraron materiales con ese criterio.'
              : 'Agrega tu primer material tocando el botón + abajo.'
          }
        />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB onPress={handleAddItem} />

      {/* Escáner de código de barras */}
      <BarcodeScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScanned}
        title="Escanear Material"
        subtitle="Escanea el código de barras o QR del producto"
      />
    </ThemedView>
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
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
    marginTop: -4,
  },
  headerContent: {
    flex: 1,
  },
  subtitle: {
    color: '#6B7280',
    marginTop: 2,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchBarWrapper: {
    flex: 1,
  },
  scanButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e07a5f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  filtersWrapper: {
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: 1,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  filterChip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    position: 'relative',
    minWidth: '15%',
    maxWidth: '16%',
    alignItems: 'center',
  },
  filterText: {
    fontSize: 15, // Se ajustará dinámicamente en el componente
    color: '#6B7280',
  },
  filterIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '10%',
    right: '10%',
    height: 3,
    borderRadius: 4,
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
    gap: Spacing.sm,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  alertBadge: {
    padding: 4,
    borderRadius: 4,
  },
  itemCategory: {
    fontSize: 12,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockLabel: {
    fontSize: 13,
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  minStock: {
    fontSize: 12,
  },
  itemPrice: {
    fontSize: 12,
    marginTop: 2,
  },
});
