/**
 * Página de Gestión de Productos
 * Piano Emotion Manager
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ProductList, BarcodeScanner } from '@/components/inventory';
import { useProducts } from '@/hooks/inventory';
import { useTranslation } from '@/hooks/use-translation';
import type { productCategoryEnum, productTypeEnum } from '../../../drizzle/inventory-schema.js';

// ============================================================================
// Product Form Modal
// ============================================================================

interface ProductFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => Promise<void>;
  initialData?: Partial<ProductFormData>;
  isLoading?: boolean;
}

interface ProductFormData {
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  type: typeof productTypeEnum;
  category: typeof productCategoryEnum;
  brand?: string;
  costPrice: number;
  salePrice: number;
  taxRate: number;
  minStock: number;
  reorderPoint: number;
  reorderQuantity: number;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialData,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<ProductFormData>({
    sku: initialData?.sku || '',
    barcode: initialData?.barcode || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
    type: initialData?.type || 'spare_part',
    category: initialData?.category || 'other',
    brand: initialData?.brand || '',
    costPrice: initialData?.costPrice || 0,
    salePrice: initialData?.salePrice || 0,
    taxRate: initialData?.taxRate || 21,
    minStock: initialData?.minStock || 0,
    reorderPoint: initialData?.reorderPoint || 5,
    reorderQuantity: initialData?.reorderQuantity || 10,
  });

  const handleSubmit = async () => {
    if (!formData.sku || !formData.name) {
      Alert.alert(t('common.error'), t('inventory.requiredFields'));
      return;
    }
    await onSubmit(formData);
  };

  const categories = productCategoryEnum.enumValues;

  const types = productTypeEnum.enumValues;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {initialData ? t('inventory.editProduct') : t('inventory.addProduct')}
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
              <Text style={styles.label}>{t('inventory.sku')} *</Text>
              <TextInput
                style={styles.input}
                value={formData.sku}
                onChangeText={(text) => setFormData({ ...formData, sku: text })}
                placeholder="SKU-001"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('inventory.barcode')}</Text>
              <TextInput
                style={styles.input}
                value={formData.barcode}
                onChangeText={(text) => setFormData({ ...formData, barcode: text })}
                placeholder="1234567890123"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('inventory.productName')} *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder={t('inventory.productNamePlaceholder')}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('inventory.description')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder={t('inventory.descriptionPlaceholder')}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('inventory.brand')}</Text>
              <TextInput
                style={styles.input}
                value={formData.brand}
                onChangeText={(text) => setFormData({ ...formData, brand: text })}
                placeholder="Steinway, Yamaha, etc."
              />
            </View>
          </View>

          {/* Classification */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>{t('inventory.classification')}</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('inventory.type')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipContainer}>
                  {types.map((type) => (
                    <TouchableOpacity
                      key={type as string}
                      style={[
                        styles.chip,
                        formData.type === type && styles.chipActive,
                      ]}
                      onPress={() => setFormData({ ...formData, type })}
                    >
                      <Text style={[
                        styles.chipText,
                        formData.type === type && styles.chipTextActive,
                      ]}>
                        {t(`inventory.types.${type}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('inventory.category')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipContainer}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category as string}
                      style={[
                        styles.chip,
                        formData.category === category && styles.chipActive,
                      ]}
                      onPress={() => setFormData({ ...formData, category })}
                    >
                      <Text style={[
                        styles.chipText,
                        formData.category === category && styles.chipTextActive,
                      ]}>
                        {t(`inventory.categories.${category}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>

          {/* Pricing */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>{t('inventory.pricing')}</Text>
            
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>{t('inventory.costPrice')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.costPrice.toString()}
                  onChangeText={(text) => setFormData({ ...formData, costPrice: parseFloat(text) || 0 })}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>{t('inventory.salePrice')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.salePrice.toString()}
                  onChangeText={(text) => setFormData({ ...formData, salePrice: parseFloat(text) || 0 })}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('inventory.taxRate')} (%)</Text>
              <TextInput
                style={styles.input}
                value={formData.taxRate.toString()}
                onChangeText={(text) => setFormData({ ...formData, taxRate: parseFloat(text) || 0 })}
                keyboardType="decimal-pad"
                placeholder="21"
              />
            </View>
          </View>

          {/* Stock Settings */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>{t('inventory.stockSettings')}</Text>
            
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>{t('inventory.minStock')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.minStock.toString()}
                  onChangeText={(text) => setFormData({ ...formData, minStock: parseInt(text) || 0 })}
                  keyboardType="number-pad"
                  placeholder="0"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>{t('inventory.reorderPoint')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.reorderPoint.toString()}
                  onChangeText={(text) => setFormData({ ...formData, reorderPoint: parseInt(text) || 0 })}
                  keyboardType="number-pad"
                  placeholder="5"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('inventory.reorderQuantity')}</Text>
              <TextInput
                style={styles.input}
                value={formData.reorderQuantity.toString()}
                onChangeText={(text) => setFormData({ ...formData, reorderQuantity: parseInt(text) || 0 })}
                keyboardType="number-pad"
                placeholder="10"
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// ============================================================================
// Main Screen
// ============================================================================

export default function ProductsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const { createProduct, isCreating } = useProducts();

  const handleProductPress = useCallback((productId: number) => {
    router.push(`/inventory/product/${productId}`);
  }, [router]);

  const handleAddProduct = useCallback(async (data: ProductFormData) => {
    try {
      await createProduct(data);
      setShowAddModal(false);
      Alert.alert(t('common.success'), t('inventory.productCreated'));
    } catch (error) {
      Alert.alert(t('common.error'), (error as Error).message);
    }
  }, [createProduct, t]);

  const handleBarcodeFound = useCallback((productId: number) => {
    setShowScanner(false);
    router.push(`/inventory/product/${productId}`);
  }, [router]);

  const handleBarcodeNotFound = useCallback((barcode: string) => {
    setShowScanner(false);
    Alert.alert(
      t('inventory.productNotFound'),
      t('inventory.createProductWithBarcode'),
      [
        { text: t('common.cancel') },
        {
          text: t('inventory.createProduct'),
          onPress: () => setShowAddModal(true),
        },
      ]
    );
  }, [t]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('inventory.products')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowScanner(true)}
          >
            <Ionicons name="barcode-outline" size={24} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Product List */}
      <ProductList
        onProductPress={handleProductPress}
        onAddPress={() => setShowAddModal(true)}
      />

      {/* Add Product Modal */}
      <ProductFormModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddProduct}
        isLoading={isCreating}
      />

      {/* Barcode Scanner */}
      <BarcodeScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onProductFound={handleBarcodeFound}
        onBarcodeNotFound={handleBarcodeNotFound}
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
  },
  chipActive: {
    backgroundColor: '#3b82f6',
  },
  chipText: {
    fontSize: 14,
    color: '#6b7280',
  },
  chipTextActive: {
    color: '#fff',
  },
});
