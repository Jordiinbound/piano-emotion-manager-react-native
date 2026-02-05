/**
 * Página de Gestión de Almacenes
 * Piano Emotion Manager
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWarehouses, useWarehouseStats } from '@/hooks/inventory';
import { useTranslation } from '@/hooks/use-translation';
import { formatCurrency } from '@/utils/format';
import type { warehouseTypeEnum } from '../../../drizzle/inventory-schema.js';

// ============================================================================
// Types
// ============================================================================

interface WarehouseFormData {
  name: string;
  code: string;
  type: typeof warehouseTypeEnum;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

// ============================================================================
// Warehouse Card Component
// ============================================================================

interface WarehouseCardProps {
  warehouse: {
    id: number;
    name: string;
    code: string;
    type: typeof warehouseTypeEnum;
    address?: string | null;
    city?: string | null;
    isDefault: boolean;
    isActive: boolean;
  };
  onPress: () => void;
}

const WarehouseCard: React.FC<WarehouseCardProps> = ({ warehouse, onPress }) => {
  const { t } = useTranslation();

  const typeIcons: Record<typeof warehouseTypeEnum.enumValues[number], keyof typeof Ionicons.glyphMap> = {
    central: 'business',
    workshop: 'construct',
    vehicle: 'car',
    consignment: 'cube',
    virtual: 'cloud',
  };

  const typeColors: Record<typeof warehouseTypeEnum.enumValues[number], string> = {
    central: '#3b82f6',
    workshop: '#8b5cf6',
    vehicle: '#22c55e',
    consignment: '#f59e0b',
    virtual: '#6b7280',
  };

  return (
    <TouchableOpacity style={styles.warehouseCard} onPress={onPress}>
      <View style={[styles.warehouseIcon, { backgroundColor: typeColors[warehouse.type] + '15' }]}>
        <Ionicons name={typeIcons[warehouse.type]} size={24} color={typeColors[warehouse.type]} />
      </View>
      <View style={styles.warehouseInfo}>
        <View style={styles.warehouseHeader}>
          <Text style={styles.warehouseName}>{warehouse.name}</Text>
          {warehouse.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>{t('inventory.default')}</Text>
            </View>
          )}
        </View>
        <Text style={styles.warehouseCode}>{warehouse.code}</Text>
        {warehouse.address && (
          <Text style={styles.warehouseAddress} numberOfLines={1}>
            {warehouse.address}{warehouse.city ? `, ${warehouse.city}` : ''}
          </Text>
        )}
        <View style={styles.warehouseTypeBadge}>
          <Text style={[styles.warehouseTypeText, { color: typeColors[warehouse.type] }]}>
            {t(`inventory.warehouseTypes.${warehouse.type}`)}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );
};

// ============================================================================
// Warehouse Form Modal
// ============================================================================

interface WarehouseFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: WarehouseFormData) => Promise<void>;
  initialData?: Partial<WarehouseFormData>;
  isLoading?: boolean;
}

const WarehouseFormModal: React.FC<WarehouseFormModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialData,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<WarehouseFormData>({
    name: initialData?.name || '',
    code: initialData?.code || '',
    type: initialData?.type || 'central',
    address: initialData?.address || '',
    city: initialData?.city || '',
    postalCode: initialData?.postalCode || '',
    country: initialData?.country || '',
    isDefault: initialData?.isDefault || false,
  });

  const warehouseTypes = warehouseTypeEnum.enumValues;

  const handleSubmit = async () => {
    if (!formData.name || !formData.code) {
      Alert.alert(t('common.error'), t('inventory.requiredFields'));
      return;
    }
    await onSubmit(formData);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {initialData ? t('inventory.editWarehouse') : t('inventory.addWarehouse')}
          </Text>
          <TouchableOpacity onPress={handleSubmit} disabled={isLoading}>
            <Text style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}>
              {t('common.save')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Basic Info */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>{t('inventory.basicInfo')}</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('inventory.warehouseName')} *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder={t('inventory.warehouseNamePlaceholder')}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('inventory.warehouseCode')} *</Text>
              <TextInput
                style={styles.input}
                value={formData.code}
                onChangeText={(text) => setFormData({ ...formData, code: text.toUpperCase() })}
                placeholder="ALM-001"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('inventory.warehouseType')}</Text>
              <View style={styles.typeGrid}>
                {warehouseTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      formData.type === type && styles.typeOptionActive,
                    ]}
                    onPress={() => setFormData({ ...formData, type })}
                  >
                    <Ionicons
                      name={
                        type === 'central' ? 'business' :
                        type === 'workshop' ? 'construct' :
                        type === 'vehicle' ? 'car' :
                        type === 'consignment' ? 'cube' : 'cloud'
                      }
                      size={24}
                      color={formData.type === type ? '#3b82f6' : '#6b7280'}
                    />
                    <Text style={[
                      styles.typeOptionText,
                      formData.type === type && styles.typeOptionTextActive,
                    ]}>
                      {t(`inventory.warehouseTypes.${type}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Location */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>{t('inventory.location')}</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('common.address')}</Text>
              <TextInput
                style={styles.input}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder={t('common.addressPlaceholder')}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 2, marginRight: 8 }]}>
                <Text style={styles.label}>{t('common.city')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.city}
                  onChangeText={(text) => setFormData({ ...formData, city: text })}
                  placeholder={t('common.cityPlaceholder')}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>{t('common.postalCode')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.postalCode}
                  onChangeText={(text) => setFormData({ ...formData, postalCode: text })}
                  placeholder="28001"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('common.country')}</Text>
              <TextInput
                style={styles.input}
                value={formData.country}
                onChangeText={(text) => setFormData({ ...formData, country: text })}
                placeholder={t('common.countryPlaceholder')}
              />
            </View>
          </View>

          {/* Settings */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>{t('common.settings')}</Text>
            
            <TouchableOpacity
              style={styles.toggleOption}
              onPress={() => setFormData({ ...formData, isDefault: !formData.isDefault })}
            >
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>{t('inventory.setAsDefault')}</Text>
                <Text style={styles.toggleDescription}>
                  {t('inventory.setAsDefaultDescription')}
                </Text>
              </View>
              <Ionicons
                name={formData.isDefault ? 'checkbox' : 'square-outline'}
                size={24}
                color={formData.isDefault ? '#3b82f6' : '#9ca3af'}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// ============================================================================
// Main Screen
// ============================================================================

export default function WarehousesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const {
    warehouses,
    warehousesByType,
    isLoading,
    createWarehouse,
    isCreating,
    refetch,
  } = useWarehouses({ includeInactive: true });

  const {
    totalWarehouses,
    totalInventoryValue,
    totalProducts,
  } = useWarehouseStats();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleWarehousePress = useCallback((warehouseId: number) => {
    router.push(`/inventory/warehouse/${warehouseId}`);
  }, [router]);

  const handleAddWarehouse = useCallback(async (data: WarehouseFormData) => {
    try {
      await createWarehouse(data);
      setShowAddModal(false);
      Alert.alert(t('common.success'), t('inventory.warehouseCreated'));
    } catch (error) {
      Alert.alert(t('common.error'), (error as Error).message);
    }
  }, [createWarehouse, t]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('inventory.warehouses')}</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalWarehouses}</Text>
            <Text style={styles.statLabel}>{t('inventory.warehouses')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalProducts}</Text>
            <Text style={styles.statLabel}>{t('inventory.products')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(totalInventoryValue, 'EUR')}</Text>
            <Text style={styles.statLabel}>{t('inventory.totalValue')}</Text>
          </View>
        </View>

        {/* Warehouse List by Type */}
        {Object.entries(warehousesByType).map(([type, typeWarehouses]) => {
          if (typeWarehouses.length === 0) return null;
          
          return (
            <View key={type} style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t(`inventory.warehouseTypes.${type}`)} ({typeWarehouses.length})
              </Text>
              {typeWarehouses.map((warehouse) => (
                <WarehouseCard
                  key={warehouse.id}
                  warehouse={warehouse}
                  onPress={() => handleWarehousePress(warehouse.id)}
                />
              ))}
            </View>
          );
        })}

        {warehouses.length === 0 && !isLoading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>{t('inventory.noWarehouses')}</Text>
            <Text style={styles.emptyText}>{t('inventory.noWarehousesDescription')}</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>{t('inventory.addWarehouse')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Warehouse Modal */}
      <WarehouseFormModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddWarehouse}
        isLoading={isCreating}
      />
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  warehouseCard: {
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
  warehouseIcon: {
    width: 48,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  warehouseInfo: {
    flex: 1,
  },
  warehouseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  warehouseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 8,
  },
  defaultBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3b82f6',
  },
  warehouseCode: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  warehouseAddress: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 8,
  },
  warehouseTypeBadge: {
    alignSelf: 'flex-start',
  },
  warehouseTypeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  saveButtonDisabled: {
    color: '#9ca3af',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#fff',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeOption: {
    width: '30%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeOptionActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  typeOptionText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  typeOptionTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
});
