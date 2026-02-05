/**
 * Componente de Lista de Productos
 * Piano Emotion Manager
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProducts, type ProductFilters } from '@/hooks/inventory';
import { useTranslation } from '@/hooks/use-translation';
import { formatCurrency } from '@/utils/format';
import type { ProductType, ProductCategory } from '../../drizzle/inventory-schema.js';

// ============================================================================
// Types
// ============================================================================

interface ProductListProps {
  onProductPress?: (productId: number) => void;
  onAddPress?: () => void;
  selectable?: boolean;
  onSelect?: (productId: number) => void;
  selectedIds?: number[];
  filterByCategory?: ProductCategory;
  filterByType?: ProductType;
  showLowStockOnly?: boolean;
}

interface ProductItemProps {
  product: {
    product: {
      id: number;
      sku: string;
      name: string;
      brand?: string | null;
      category: ProductCategory;
      salePrice: string;
      currency: string;
      thumbnailUrl?: string | null;
    };
    totalStock: number;
    availableStock: number;
  };
  onPress?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

// ============================================================================
// Product Item Component
// ============================================================================

const ProductItem: React.FC<ProductItemProps> = ({
  product,
  onPress,
  selectable,
  selected,
  onSelect,
}) => {
  const { t } = useTranslation();
  
  const stockStatus = product.totalStock === 0 
    ? 'out_of_stock' 
    : product.totalStock <= 5 
      ? 'low' 
      : 'ok';

  const statusColors = {
    ok: '#22c55e',
    low: '#f59e0b',
    out_of_stock: '#ef4444',
  };

  return (
    <TouchableOpacity
      style={[styles.productItem, selected && styles.productItemSelected]}
      onPress={selectable ? onSelect : onPress}
      activeOpacity={0.7}
    >
      {selectable && (
        <View style={styles.checkbox}>
          {selected ? (
            <Ionicons name="checkbox" size={24} color="#3b82f6" />
          ) : (
            <Ionicons name="square-outline" size={24} color="#9ca3af" />
          )}
        </View>
      )}
      
      <View style={styles.productImage}>
        {product.product.thumbnailUrl ? (
          <Image 
            source={{ uri: product.product.thumbnailUrl }} 
            style={styles.thumbnail}
          />
        ) : (
          <Ionicons name="cube-outline" size={32} color="#9ca3af" />
        )}
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>
          {product.product.name}
        </Text>
        <Text style={styles.productSku}>
          SKU: {product.product.sku}
          {product.product.brand && ` • ${product.product.brand}`}
        </Text>
        <View style={styles.productMeta}>
          <Text style={styles.productPrice}>
            {formatCurrency(parseFloat(product.product.salePrice), product.product.currency)}
          </Text>
          <View style={[styles.stockBadge, { backgroundColor: statusColors[stockStatus] + '20' }]}>
            <View style={[styles.stockDot, { backgroundColor: statusColors[stockStatus] }]} />
            <Text style={[styles.stockText, { color: statusColors[stockStatus] }]}>
              {product.totalStock} {t('inventory.units')}
            </Text>
          </View>
        </View>
      </View>

      {!selectable && (
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      )}
    </TouchableOpacity>
  );
};

// ============================================================================
// Filter Bar Component
// ============================================================================

interface FilterBarProps {
  filters: ProductFilters;
  onFilterChange: (filters: Partial<ProductFilters>) => void;
  onClear: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, onFilterChange, onClear }) => {
  const { t } = useTranslation();
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = filters.type || filters.category || filters.brand || filters.hasLowStock;

  return (
    <View style={styles.filterBar}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder={t('inventory.searchProducts')}
          value={filters.search || ''}
          onChangeText={(text) => onFilterChange({ search: text })}
          placeholderTextColor="#9ca3af"
        />
        {filters.search && (
          <TouchableOpacity onPress={() => onFilterChange({ search: '' })}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Ionicons 
          name="filter" 
          size={20} 
          color={hasActiveFilters ? '#3b82f6' : '#6b7280'} 
        />
        {hasActiveFilters && <View style={styles.filterBadge} />}
      </TouchableOpacity>

      {showFilters && (
        <View style={styles.filterPanel}>
          {/* Category filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>{t('inventory.category')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['strings', 'hammers', 'keys', 'tuning_tools', 'consumables'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterChip,
                    filters.category === cat && styles.filterChipActive,
                  ]}
                  onPress={() => onFilterChange({ 
                    category: filters.category === cat ? undefined : cat as ProductCategory 
                  })}
                >
                  <Text style={[
                    styles.filterChipText,
                    filters.category === cat && styles.filterChipTextActive,
                  ]}>
                    {t(`inventory.categories.${cat}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Low stock filter */}
          <TouchableOpacity
            style={styles.filterToggle}
            onPress={() => onFilterChange({ hasLowStock: !filters.hasLowStock })}
          >
            <Ionicons 
              name={filters.hasLowStock ? 'checkbox' : 'square-outline'} 
              size={24} 
              color={filters.hasLowStock ? '#3b82f6' : '#9ca3af'} 
            />
            <Text style={styles.filterToggleText}>
              {t('inventory.showLowStockOnly')}
            </Text>
          </TouchableOpacity>

          {hasActiveFilters && (
            <TouchableOpacity style={styles.clearFilters} onPress={onClear}>
              <Text style={styles.clearFiltersText}>{t('common.clearFilters')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ProductList: React.FC<ProductListProps> = ({
  onProductPress,
  onAddPress,
  selectable = false,
  onSelect,
  selectedIds = [],
  filterByCategory,
  filterByType,
  showLowStockOnly = false,
}) => {
  const { t } = useTranslation();
  
  const {
    products,
    pagination,
    filters,
    isLoading,
    error,
    updateFilters,
    clearFilters,
    nextPage,
    prevPage,
    refetch,
  } = useProducts({
    initialFilters: {
      category: filterByCategory,
      type: filterByType,
      hasLowStock: showLowStockOnly,
    },
  });

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleProductPress = useCallback((productId: number) => {
    if (selectable && onSelect) {
      onSelect(productId);
    } else if (onProductPress) {
      onProductPress(productId);
    }
  }, [selectable, onSelect, onProductPress]);

  const renderItem = useCallback(({ item }: { item: typeof products[0] }) => (
    <ProductItem
      product={item}
      onPress={() => handleProductPress(item.product.id)}
      selectable={selectable}
      selected={selectedIds.includes(item.product.id)}
      onSelect={() => onSelect?.(item.product.id)}
    />
  ), [handleProductPress, selectable, selectedIds, onSelect]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube-outline" size={64} color="#d1d5db" />
      <Text style={styles.emptyTitle}>{t('inventory.noProducts')}</Text>
      <Text style={styles.emptyText}>{t('inventory.noProductsDescription')}</Text>
      {onAddPress && (
        <TouchableOpacity style={styles.addButton} onPress={onAddPress}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>{t('inventory.addProduct')}</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [t, onAddPress]);

  const renderFooter = useCallback(() => {
    if (!pagination.hasNextPage) return null;
    return (
      <TouchableOpacity style={styles.loadMore} onPress={nextPage}>
        <Text style={styles.loadMoreText}>{t('common.loadMore')}</Text>
      </TouchableOpacity>
    );
  }, [pagination.hasNextPage, nextPage, t]);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{t('common.error')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FilterBar
        filters={filters}
        onFilterChange={updateFilters}
        onClear={clearFilters}
      />

      <View style={styles.header}>
        <Text style={styles.resultCount}>
          {pagination.total} {t('inventory.products')}
        </Text>
        {onAddPress && (
          <TouchableOpacity style={styles.headerAddButton} onPress={onAddPress}>
            <Ionicons name="add" size={24} color="#3b82f6" />
          </TouchableOpacity>
        )}
      </View>

      {isLoading && products.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={(item) => item.product.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  filterBar: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1f2937',
  },
  filterButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#dbeafe',
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  filterPanel: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterToggleText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
  },
  clearFilters: {
    alignSelf: 'flex-start',
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  headerAddButton: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  productItemSelected: {
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  checkbox: {
    marginRight: 12,
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 4,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  productSku: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 4,
    marginRight: 6,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadMore: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProductList;
