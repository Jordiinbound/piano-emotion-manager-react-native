/**
 * Componente de Dashboard de Inventario
 * Piano Emotion Manager
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/hooks/use-translation';
import {
  useProductStatistics,
  useStockAlerts,
  useInventoryValuation,
  useWarehouseStats,
  useReorderSuggestions,
} from '@/hooks/inventory';
import { formatCurrency } from '@/utils/format';

// ============================================================================
// Types
// ============================================================================

interface InventoryDashboardProps {
  onNavigateToProducts?: () => void;
  onNavigateToAlerts?: () => void;
  onNavigateToWarehouses?: () => void;
  onNavigateToOrders?: () => void;
  onNavigateToReorder?: () => void;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress?: () => void;
}

interface AlertItemProps {
  alert: {
    id: number;
    alertType: string;
    message: string;
    product: { name: string; sku: string };
    warehouse?: { name: string } | null;
    createdAt: Date;
  };
  onPress?: () => void;
}

// ============================================================================
// Stat Card Component
// ============================================================================

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  onPress,
}) => (
  <TouchableOpacity
    style={[styles.statCard, { borderLeftColor: color }]}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <View style={styles.statContent}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  </TouchableOpacity>
);

// ============================================================================
// Alert Item Component
// ============================================================================

const AlertItem: React.FC<AlertItemProps> = ({ alert, onPress }) => {
  const isOutOfStock = alert.alertType === 'out_of_stock';
  
  return (
    <TouchableOpacity style={styles.alertItem} onPress={onPress}>
      <View style={[
        styles.alertIcon,
        { backgroundColor: isOutOfStock ? '#fef2f2' : '#fffbeb' }
      ]}>
        <Ionicons
          name={isOutOfStock ? 'alert-circle' : 'warning'}
          size={20}
          color={isOutOfStock ? '#ef4444' : '#f59e0b'}
        />
      </View>
      <View style={styles.alertContent}>
        <Text style={styles.alertProduct} numberOfLines={1}>
          {alert.product.name}
        </Text>
        <Text style={styles.alertMessage} numberOfLines={1}>
          {alert.message}
        </Text>
        {alert.warehouse && (
          <Text style={styles.alertWarehouse}>
            {alert.warehouse.name}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
    </TouchableOpacity>
  );
};

// ============================================================================
// Category Distribution Component
// ============================================================================

interface CategoryDistributionProps {
  byCategory: Record<string, number>;
}

const CategoryDistribution: React.FC<CategoryDistributionProps> = ({ byCategory }) => {
  const { t } = useTranslation();
  
  const categories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  const total = categories.reduce((sum, [, count]) => sum + count, 0);
  
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <View style={styles.distributionContainer}>
      <Text style={styles.sectionTitle}>{t('inventory.categoryDistribution')}</Text>
      <View style={styles.distributionBar}>
        {categories.map(([category, count], index) => (
          <View
            key={category}
            style={[
              styles.distributionSegment,
              {
                flex: count / total,
                backgroundColor: colors[index],
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.distributionLegend}>
        {categories.map(([category, count], index) => (
          <View key={category} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors[index] }]} />
            <Text style={styles.legendText}>
              {t(`inventory.categories.${category}`, category)} ({count})
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ============================================================================
// Warehouse Summary Component
// ============================================================================

interface WarehouseSummaryProps {
  warehouses: Array<{
    warehouseId: number;
    warehouseName: string;
    value: number;
  }>;
  currency?: string;
}

const WarehouseSummary: React.FC<WarehouseSummaryProps> = ({ warehouses, currency = 'EUR' }) => {
  const { t } = useTranslation();
  
  return (
    <View style={styles.warehouseContainer}>
      <Text style={styles.sectionTitle}>{t('inventory.valueByWarehouse')}</Text>
      {warehouses.slice(0, 5).map((warehouse) => (
        <View key={warehouse.warehouseId} style={styles.warehouseItem}>
          <View style={styles.warehouseInfo}>
            <Ionicons name="business-outline" size={20} color="#6b7280" />
            <Text style={styles.warehouseName}>{warehouse.warehouseName}</Text>
          </View>
          <Text style={styles.warehouseValue}>
            {formatCurrency(warehouse.value, currency)}
          </Text>
        </View>
      ))}
    </View>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({
  onNavigateToProducts,
  onNavigateToAlerts,
  onNavigateToWarehouses,
  onNavigateToOrders,
  onNavigateToReorder,
}) => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = React.useState(false);

  const { statistics, isLoading: loadingStats, refetch: refetchStats } = useProductStatistics();
  const { alerts, unreadCount, criticalCount, refetch: refetchAlerts } = useStockAlerts();
  const { totalValue, byCategory, byWarehouse, refetch: refetchValuation } = useInventoryValuation();
  const { totalWarehouses, byType, refetch: refetchWarehouses } = useWarehouseStats();
  const { suggestions, count: reorderCount, refetch: refetchSuggestions } = useReorderSuggestions();

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchStats(),
      refetchAlerts(),
      refetchValuation(),
      refetchWarehouses(),
      refetchSuggestions(),
    ]);
    setRefreshing(false);
  }, [refetchStats, refetchAlerts, refetchValuation, refetchWarehouses, refetchSuggestions]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('inventory.dashboard')}</Text>
        <Text style={styles.headerSubtitle}>
          {t('inventory.dashboardSubtitle')}
        </Text>
      </View>

      {/* Main Stats */}
      <View style={styles.statsGrid}>
        <StatCard
          title={t('inventory.totalProducts')}
          value={statistics?.totalProducts || 0}
          subtitle={`${statistics?.activeProducts || 0} ${t('inventory.active')}`}
          icon="cube"
          color="#3b82f6"
          onPress={onNavigateToProducts}
        />
        <StatCard
          title={t('inventory.inventoryValue')}
          value={formatCurrency(totalValue, 'EUR')}
          icon="cash"
          color="#22c55e"
        />
        <StatCard
          title={t('inventory.warehouses')}
          value={totalWarehouses}
          subtitle={`${byType.vehicle || 0} ${t('inventory.vehicles')}`}
          icon="business"
          color="#8b5cf6"
          onPress={onNavigateToWarehouses}
        />
        <StatCard
          title={t('inventory.alerts')}
          value={unreadCount}
          subtitle={criticalCount > 0 ? `${criticalCount} ${t('inventory.critical')}` : undefined}
          icon="notifications"
          color={criticalCount > 0 ? '#ef4444' : '#f59e0b'}
          onPress={onNavigateToAlerts}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickAction} onPress={onNavigateToProducts}>
          <Ionicons name="add-circle" size={24} color="#3b82f6" />
          <Text style={styles.quickActionText}>{t('inventory.addProduct')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={onNavigateToOrders}>
          <Ionicons name="cart" size={24} color="#22c55e" />
          <Text style={styles.quickActionText}>{t('inventory.newOrder')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={onNavigateToReorder}>
          <Ionicons name="refresh" size={24} color="#f59e0b" />
          <Text style={styles.quickActionText}>{t('inventory.reorder')}</Text>
          {reorderCount > 0 && (
            <View style={styles.quickActionBadge}>
              <Text style={styles.quickActionBadgeText}>{reorderCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Stock Status */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('inventory.stockStatus')}</Text>
        </View>
        <View style={styles.stockStatusGrid}>
          <View style={[styles.stockStatusCard, { backgroundColor: '#f0fdf4' }]}>
            <Ionicons name="checkmark-circle" size={32} color="#22c55e" />
            <Text style={[styles.stockStatusValue, { color: '#22c55e' }]}>
              {(statistics?.totalProducts || 0) - (statistics?.lowStockCount || 0) - (statistics?.outOfStockCount || 0)}
            </Text>
            <Text style={styles.stockStatusLabel}>{t('inventory.inStock')}</Text>
          </View>
          <View style={[styles.stockStatusCard, { backgroundColor: '#fffbeb' }]}>
            <Ionicons name="warning" size={32} color="#f59e0b" />
            <Text style={[styles.stockStatusValue, { color: '#f59e0b' }]}>
              {statistics?.lowStockCount || 0}
            </Text>
            <Text style={styles.stockStatusLabel}>{t('inventory.lowStock')}</Text>
          </View>
          <View style={[styles.stockStatusCard, { backgroundColor: '#fef2f2' }]}>
            <Ionicons name="close-circle" size={32} color="#ef4444" />
            <Text style={[styles.stockStatusValue, { color: '#ef4444' }]}>
              {statistics?.outOfStockCount || 0}
            </Text>
            <Text style={styles.stockStatusLabel}>{t('inventory.outOfStock')}</Text>
          </View>
        </View>
      </View>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('inventory.recentAlerts')}</Text>
            <TouchableOpacity onPress={onNavigateToAlerts}>
              <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.alertsList}>
            {alerts.slice(0, 3).map((alert) => (
              <AlertItem key={alert.id} alert={alert} onPress={onNavigateToAlerts} />
            ))}
          </View>
        </View>
      )}

      {/* Category Distribution */}
      {Object.keys(byCategory).length > 0 && (
        <View style={styles.section}>
          <CategoryDistribution byCategory={byCategory} />
        </View>
      )}

      {/* Warehouse Summary */}
      {byWarehouse.length > 0 && (
        <View style={styles.section}>
          <WarehouseSummary warehouses={byWarehouse} />
        </View>
      )}

      {/* Reorder Suggestions */}
      {reorderCount > 0 && (
        <TouchableOpacity style={styles.reorderBanner} onPress={onNavigateToReorder}>
          <View style={styles.reorderContent}>
            <Ionicons name="cart-outline" size={24} color="#f59e0b" />
            <View style={styles.reorderText}>
              <Text style={styles.reorderTitle}>
                {reorderCount} {t('inventory.productsNeedReorder')}
              </Text>
              <Text style={styles.reorderSubtitle}>
                {t('inventory.tapToCreateOrder')}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#f59e0b" />
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

// ============================================================================
// Styles
// ============================================================================

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    paddingBottom: 24,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statContent: {},
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  quickActionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    borderRadius: 4,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  seeAll: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  stockStatusGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  stockStatusCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 4,
  },
  stockStatusValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  stockStatusLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  alertsList: {
    gap: 12,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertProduct: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  alertMessage: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  alertWarehouse: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  distributionContainer: {},
  distributionBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  distributionSegment: {
    height: '100%',
  },
  distributionLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
  warehouseContainer: {},
  warehouseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  warehouseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warehouseName: {
    marginLeft: 12,
    fontSize: 14,
    color: '#374151',
  },
  warehouseValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  reorderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    backgroundColor: '#fffbeb',
    borderRadius: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  reorderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reorderText: {
    marginLeft: 12,
  },
  reorderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  reorderSubtitle: {
    fontSize: 12,
    color: '#b45309',
    marginTop: 2,
  },
});

export default InventoryDashboard;
