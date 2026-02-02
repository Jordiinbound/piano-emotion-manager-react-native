import { useTranslation } from '@/hooks/use-translation';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
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
import { BorderRadius, Spacing } from '@/constants/theme';
import { MATERIAL_CATEGORY_LABELS, MaterialCategory } from '@/types/inventory';
import type { Material as InventoryItem } from '@/types/inventory';

type FilterType = 'all' | 'low_stock' | MaterialCategory;

export default function InventoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { materials: items, loading, lowStockItems } = useInventoryData();
  const { suppliers } = useSuppliers();
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
      const aLow = a.currentStock <= a.minStock;
      const bLow = b.currentStock <= b.minStock;
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
    if (item.currentStock === 0) return error;
    if (item.currentStock <= item.minStock) return warning;
    return success;
  };

  const renderItem = useCallback(
    ({ item }: { item: InventoryItem }) => {
      const stockColor = getStockColor(item);
      const isLowStock = item.currentStock <= item.minStock;

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
                  {item.currentStock} {item.unit}
                </ThemedText>
              </View>
              <ThemedText style={[styles.minStock, { color: textSecondary }]}>
                Mín: {item.minStock}
              </ThemedText>
            </View>

            {(item.salePrice !== undefined || item.costPrice !== undefined) && (
              <ThemedText style={[styles.itemPrice, { color: textSecondary }]}>
                €{(item.salePrice || item.costPrice || 0).toFixed(2)} / {item.unit}
              </ThemedText>
            )}
          </View>

          <IconSymbol name="chevron.right" size={20} color={textSecondary} />
        </Pressable>
      );
    },
    [cardBg, borderColor, textSecondary, error, warning, success]
  );

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'low_stock', label: `${t('inventory.lowStockAlert')} (${lowStockItems.length})` },
    { key: 'strings', label: t('inventory.categories.strings') },
    { key: 'hammers', label: t('inventory.categories.hammers') },
    { key: 'felts', label: t('inventory.categories.felts') },
    { key: 'tools', label: t('inventory.categories.tools') },
  ];

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerTop}>
          <Pressable
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <IconSymbol name="chevron.left" size={24} color={accent} />
          </Pressable>
          <View style={styles.headerContent}>
            <ThemedText type="title">{t('navigation.inventory')}</ThemedText>
            <ThemedText style={styles.subtitle}>
              {items.length} {items.length === 1 ? 'material' : 'materiales'}
              {lowStockItems.length > 0 && (
                <ThemedText style={{ color: warning }}> · {lowStockItems.length} con stock bajo</ThemedText>
              )}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Alerta de stock bajo con enlace a Piano Emotion Store o proveedor */}
      {lowStockItems.length > 0 && filter !== 'low_stock' && (
        <LowStockAlert 
          items={lowStockItems.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.currentStock,
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
            <IconSymbol name="barcode.viewfinder" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Filtros */}
      <View style={styles.filtersWrapper}>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
          renderItem={({ item: f }) => (
            <Pressable
              style={[
                styles.filterChip,
                { backgroundColor: cardBg, borderColor },
                filter === f.key && { backgroundColor: accent, borderColor: accent },
              ]}
              onPress={() => setFilter(f.key)}
            >
              <ThemedText
                style={[
                  styles.filterText,
                  { color: filter === f.key ? '#FFFFFF' : textSecondary },
                ]}
              >
                {f.label}
              </ThemedText>
            </Pressable>
          )}
        />
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
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersWrapper: {
    marginBottom: Spacing.sm,
  },
  filtersContainer: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
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
    gap: Spacing.sm,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
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
    borderRadius: 8,
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
