import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { OrderFromStoreButton } from '@/components/low-stock-alert';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useInventoryData } from '@/hooks/data';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useProductCategories } from '@/hooks/use-product-categories';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { Material } from '@/types/inventory';

export default function InventoryDetailScreen() {
  const { id, barcode: initialBarcode } = useLocalSearchParams<{ id: string; barcode?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isNew = id === 'new';

  const { materials, addMaterial, updateMaterial, deleteMaterial, getMaterial } = useInventoryData();
  const { suppliers } = useSuppliers();
  const { categories: productCategories } = useProductCategories();

  const [isEditing, setIsEditing] = useState(isNew);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);
  const [form, setForm] = useState<Partial<Material>>({
    name: '',
    categoryId: '',
    categoryName: '',
    unit: 'unidades',
    currentStock: 0,
    minStock: 5,
    costPrice: undefined,
    salePrice: undefined,
    supplierId: '',
    supplierName: '',
    supplierCode: '',
    sku: '',
    barcode: '',
    location: '',
    description: '',
    notes: '',
  });

  const cardBg = useThemeColor({ light: '#fff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'background');
  const textSecondary = useThemeColor({ light: '#666', dark: '#999' }, 'text');
  const accent = useThemeColor({}, 'tint');
  const error = '#EF4444';
  const textColor = useThemeColor({}, 'text');
  const success = '#10B981';
  const warning = '#F59E0B';
  const backgroundColor = useThemeColor({}, 'background');

  useEffect(() => {
    if (!isNew && id) {
      const material = getMaterial(id);
      if (material) {
        setForm(material);
      }
    }
  }, [id, isNew, materials]);

  // Si viene de escanear un código de barras, establecerlo
  useEffect(() => {
    if (isNew && initialBarcode) {
      setForm(prev => ({ ...prev, barcode: initialBarcode }));
    }
  }, [isNew, initialBarcode]);

  const isLowStock = (form.currentStock || 0) <= (form.minStock || 0);

  const handleSave = async () => {
    if (!form.name?.trim()) {
      Alert.alert('Error', 'El nombre del material es obligatorio');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (isNew) {
      await addMaterial({
        name: form.name.trim(),
        categoryId: form.categoryId,
        categoryName: form.categoryName,
        unit: form.unit || 'unidades',
        currentStock: form.currentStock || 0,
        minStock: form.minStock || 5,
        costPrice: form.costPrice,
        salePrice: form.salePrice,
        supplierId: form.supplierId?.trim(),
        supplierName: form.supplierName?.trim(),
        supplierCode: form.supplierCode?.trim(),
        sku: form.sku?.trim(),
        barcode: form.barcode?.trim(),
        location: form.location?.trim(),
        description: form.description?.trim(),
        notes: form.notes?.trim(),
      });
      router.back();
    } else if (id) {
      await updateMaterial(id, form);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar material',
      '¿Estás seguro de que quieres eliminar este material del inventario?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (id) {
              await deleteMaterial(id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            }
          },
        },
      ]
    );
  };

  const handleAdjustStock = (delta: number) => {
    const newStock = Math.max(0, (form.currentStock || 0) + delta);
    setForm({ ...form, currentStock: newStock });
  };

  const selectCategory = (cat: { id: string; name: string; color?: string }) => {
    setForm({ ...form, categoryId: cat.id, categoryName: cat.name });
    setShowCategoryPicker(false);
  };

  const selectSupplier = (supplier: { id: string; name: string }) => {
    setForm({ ...form, supplierId: supplier.id, supplierName: supplier.name });
    setShowSupplierPicker(false);
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={accent} />
        </Pressable>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          {isNew ? 'Nuevo Material' : isEditing ? 'Editar Material' : form.name}
        </ThemedText>
        {!isNew && !isEditing ? (
          <Pressable onPress={() => setIsEditing(true)} style={styles.editButton}>
            <ThemedText style={{ color: accent }}>Editar</ThemedText>
          </Pressable>
        ) : (
          <Pressable onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Guardar cambios"
            accessibilityHint="Pulsa para guardar los datos" style={styles.editButton}>
            <ThemedText style={{ color: accent, fontWeight: '600' }}>Guardar</ThemedText>
          </Pressable>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Nombre */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={[styles.label, { color: textSecondary }]}>Nombre del material *</ThemedText>
          {isEditing ? (
            <TextInput
              style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
              value={form.name}
              onChangeText={(text) => setForm({ ...form, name: text })}
              placeholder="Ej: Cuerda de acero, Fieltro de macillo..."
              placeholderTextColor={textSecondary}
            />
          ) : (
            <ThemedText style={styles.value}>{form.name || '-'}</ThemedText>
          )}
        </View>

        {/* Categoría */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.label, { color: textSecondary }]}>Categoría</ThemedText>
            <Pressable onPress={() => router.push('/product-categories')}>
              <ThemedText style={{ color: accent, fontSize: 14 }}>Gestionar</ThemedText>
            </Pressable>
          </View>
          {isEditing ? (
            <Pressable
              style={[styles.pickerButton, { backgroundColor: cardBg, borderColor }]}
              onPress={() => setShowCategoryPicker(true)}
            >
              <View style={styles.pickerContent}>
                {form.categoryName ? (
                  <>
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: productCategories.find(c => c.id === form.categoryId)?.color || '#999' }
                      ]}
                    />
                    <ThemedText>{form.categoryName}</ThemedText>
                  </>
                ) : (
                  <ThemedText style={{ color: textSecondary }}>Seleccionar categoría</ThemedText>
                )}
              </View>
              <IconSymbol name="chevron.right" size={16} color={textSecondary} />
            </Pressable>
          ) : (
            <View style={styles.categoryDisplay}>
              {form.categoryName && (
                <View
                  style={[
                    styles.categoryDot,
                    { backgroundColor: productCategories.find(c => c.id === form.categoryId)?.color || '#999' }
                  ]}
                />
              )}
              <ThemedText style={styles.value}>{form.categoryName || 'Sin categoría'}</ThemedText>
            </View>
          )}
        </View>

        {/* Descripción */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={[styles.label, { color: textSecondary }]}>Descripción</ThemedText>
          {isEditing ? (
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: cardBg, borderColor, color: textColor }]}
              value={form.description}
              onChangeText={(text) => setForm({ ...form, description: text })}
              placeholder="Descripción del material..."
              placeholderTextColor={textSecondary}
              multiline
              numberOfLines={3}
            />
          ) : (
            <ThemedText style={styles.value}>{form.description || '-'}</ThemedText>
          )}
        </View>

        {/* Stock */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={[styles.label, { color: textSecondary }]}>Control de Stock</ThemedText>
          
          <View style={styles.stockRow}>
            <View style={styles.stockField}>
              <ThemedText style={[styles.stockLabel, { color: textSecondary }]}>Stock actual</ThemedText>
              {isEditing ? (
                <View style={styles.stockControls}>
                  <Pressable
                    style={[styles.stockButton, { borderColor }]}
                    onPress={() => handleAdjustStock(-1)}
                  >
                    <ThemedText style={styles.stockButtonText}>-</ThemedText>
                  </Pressable>
                  <TextInput
                    style={[styles.stockInput, { backgroundColor: cardBg, borderColor, color: textColor }]}
                    value={form.currentStock?.toString()}
                    onChangeText={(text) => setForm({ ...form, currentStock: parseInt(text) || 0 })}
                    keyboardType="number-pad"
                  />
                  <Pressable
                    style={[styles.stockButton, { borderColor }]}
                    onPress={() => handleAdjustStock(1)}
                  >
                    <ThemedText style={styles.stockButtonText}>+</ThemedText>
                  </Pressable>
                </View>
              ) : (
                <ThemedText
                  style={[
                    styles.stockValue,
                    { color: isLowStock ? (form.currentStock === 0 ? error : warning) : success },
                  ]}
                >
                  {form.currentStock} {form.unit}
                </ThemedText>
              )}
            </View>

            <View style={styles.stockField}>
              <ThemedText style={[styles.stockLabel, { color: textSecondary }]}>Stock mínimo</ThemedText>
              {isEditing ? (
                <TextInput
                  style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                  value={form.minStock?.toString()}
                  onChangeText={(text) => setForm({ ...form, minStock: parseInt(text) || 0 })}
                  keyboardType="number-pad"
                />
              ) : (
                <ThemedText style={styles.value}>{form.minStock}</ThemedText>
              )}
            </View>
          </View>

          {isLowStock && !isEditing && (
            <View style={styles.lowStockContainer}>
              <View style={[styles.alertBox, { backgroundColor: `${warning}15`, borderColor: warning }]}>
                <IconSymbol name="exclamationmark.triangle.fill" size={16} color={warning} />
                <ThemedText style={[styles.alertText, { color: warning }]}>
                  Stock bajo - Considerar reposición
                </ThemedText>
              </View>
              <OrderFromStoreButton 
                item={{ name: form.name || '', category: form.categoryId }} 
                size="medium" 
              />
            </View>
          )}

          {/* Unidad de medida */}
          <View style={styles.unitRow}>
            <ThemedText style={[styles.stockLabel, { color: textSecondary }]}>Unidad</ThemedText>
            {isEditing ? (
              <TextInput
                style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor, flex: 1 }]}
                value={form.unit}
                onChangeText={(text) => setForm({ ...form, unit: text })}
                placeholder="unidades, metros, kg..."
                placeholderTextColor={textSecondary}
              />
            ) : (
              <ThemedText style={styles.value}>{form.unit}</ThemedText>
            )}
          </View>
        </View>

        {/* Precios */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={[styles.label, { color: textSecondary }]}>Precios</ThemedText>
          
          <View style={styles.priceRow}>
            <View style={styles.priceField}>
              <ThemedText style={[styles.stockLabel, { color: textSecondary }]}>Precio coste</ThemedText>
              {isEditing ? (
                <TextInput
                  style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                  value={form.costPrice?.toString() || ''}
                  onChangeText={(text) => setForm({ ...form, costPrice: parseFloat(text) || undefined })}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={textSecondary}
                />
              ) : (
                <ThemedText style={styles.value}>
                  {form.costPrice ? `${form.costPrice.toFixed(2)} €` : '-'}
                </ThemedText>
              )}
            </View>

            <View style={styles.priceField}>
              <ThemedText style={[styles.stockLabel, { color: textSecondary }]}>Precio venta</ThemedText>
              {isEditing ? (
                <TextInput
                  style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                  value={form.salePrice?.toString() || ''}
                  onChangeText={(text) => setForm({ ...form, salePrice: parseFloat(text) || undefined })}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={textSecondary}
                />
              ) : (
                <ThemedText style={styles.value}>
                  {form.salePrice ? `${form.salePrice.toFixed(2)} €` : '-'}
                </ThemedText>
              )}
            </View>
          </View>
        </View>

        {/* Proveedor */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={[styles.label, { color: textSecondary }]}>Proveedor</ThemedText>
          {isEditing ? (
            <>
              <Pressable
                style={[styles.pickerButton, { backgroundColor: cardBg, borderColor }]}
                onPress={() => setShowSupplierPicker(true)}
              >
                <ThemedText style={form.supplierName ? {} : { color: textSecondary }}>
                  {form.supplierName || 'Seleccionar proveedor'}
                </ThemedText>
                <IconSymbol name="chevron.right" size={16} color={textSecondary} />
              </Pressable>
              
              <View style={styles.supplierCodeRow}>
                <ThemedText style={[styles.stockLabel, { color: textSecondary }]}>
                  Código/Referencia
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor, flex: 1 }]}
                  value={form.supplierCode}
                  onChangeText={(text) => setForm({ ...form, supplierCode: text })}
                  placeholder="REF-001"
                  placeholderTextColor={textSecondary}
                />
              </View>
            </>
          ) : (
            <>
              <ThemedText style={styles.value}>{form.supplierName || 'Sin proveedor'}</ThemedText>
              {form.supplierCode && (
                <ThemedText style={[styles.supplierCode, { color: textSecondary }]}>
                  Ref: {form.supplierCode}
                </ThemedText>
              )}
              {/* Botones de contacto rápido */}
              {form.supplierId && (() => {
                const supplier = suppliers.find((s: { id: string }) => s.id === form.supplierId);
                if (!supplier) return null;
                const hasPhone = supplier.phone && supplier.phone.trim();
                const hasEmail = supplier.email && supplier.email.trim();
                if (!hasPhone && !hasEmail) return null;
                return (
                  <View style={styles.contactButtons}>
                    {hasPhone && (
                      <Pressable
                        style={[styles.contactButton, { backgroundColor: `${success}15` }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          Linking.openURL(`tel:${supplier.phone}`);
                        }}
                      >
                        <IconSymbol name="phone.fill" size={18} color={success} />
                        <ThemedText style={[styles.contactButtonText, { color: success }]}>Llamar</ThemedText>
                      </Pressable>
                    )}
                    {hasEmail && (
                      <Pressable
                        style={[styles.contactButton, { backgroundColor: `${accent}15` }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          Linking.openURL(`mailto:${supplier.email}?subject=Pedido de ${form.name || 'material'}`);
                        }}
                      >
                        <IconSymbol name="envelope.fill" size={18} color={accent} />
                        <ThemedText style={[styles.contactButtonText, { color: accent }]}>Email</ThemedText>
                      </Pressable>
                    )}
                  </View>
                );
              })()}
            </>
          )}
        </View>

        {/* Ubicación y Código */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={[styles.label, { color: textSecondary }]}>Almacenamiento</ThemedText>
          
          <View style={styles.storageRow}>
            <View style={styles.storageField}>
              <ThemedText style={[styles.stockLabel, { color: textSecondary }]}>Ubicación</ThemedText>
              {isEditing ? (
                <TextInput
                  style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                  value={form.location}
                  onChangeText={(text) => setForm({ ...form, location: text })}
                  placeholder="Estante A..."
                  placeholderTextColor={textSecondary}
                />
              ) : (
                <ThemedText style={styles.value}>{form.location || '-'}</ThemedText>
              )}
            </View>

            <View style={styles.storageField}>
              <ThemedText style={[styles.stockLabel, { color: textSecondary }]}>SKU (interno)</ThemedText>
              {isEditing ? (
                <TextInput
                  style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                  value={form.sku}
                  onChangeText={(text) => setForm({ ...form, sku: text })}
                  placeholder="MI-CUE-001"
                  placeholderTextColor={textSecondary}
                />
              ) : (
                <ThemedText style={styles.value}>{form.sku || '-'}</ThemedText>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.stockLabel, { color: textSecondary }]}>Código de barras (EAN/UPC)</ThemedText>
            {isEditing ? (
              <TextInput
                style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                value={form.barcode}
                onChangeText={(text) => setForm({ ...form, barcode: text })}
                placeholder="8412345678901"
                placeholderTextColor={textSecondary}
                keyboardType="numeric"
              />
            ) : (
              <ThemedText style={styles.value}>{form.barcode || '-'}</ThemedText>
            )}
          </View>
        </View>

        {/* Notas */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={[styles.label, { color: textSecondary }]}>Notas</ThemedText>
          {isEditing ? (
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: cardBg, borderColor, color: textColor }]}
              value={form.notes}
              onChangeText={(text) => setForm({ ...form, notes: text })}
              placeholder="Notas adicionales..."
              placeholderTextColor={textSecondary}
              multiline
              numberOfLines={3}
            />
          ) : (
            <ThemedText style={styles.value}>{form.notes || '-'}</ThemedText>
          )}
        </View>

        {/* Botón eliminar */}
        {!isNew && (
          <Pressable style={[styles.deleteButton, { borderColor: error }]} onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel="Eliminar"
            accessibilityHint="Pulsa para eliminar este elemento">
            <IconSymbol name="trash.fill" size={18} color={error} />
            <ThemedText style={{ color: error, marginLeft: 8 }}>Eliminar material</ThemedText>
          </Pressable>
        )}

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>

      {/* Modal selector de categoría */}
      <Modal
        visible={showCategoryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor }]}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <Pressable onPress={() => setShowCategoryPicker(false)}>
              <ThemedText style={{ color: accent }}>Cancelar</ThemedText>
            </Pressable>
            <ThemedText type="subtitle">Seleccionar Categoría</ThemedText>
            <View style={{ width: 60 }} />
          </View>
          {/* Botón de crear categoría rápida */}
          <Pressable
            style={[styles.quickAddButton, { backgroundColor: accent + '15', borderColor: accent }]}
            onPress={() => {
              setShowCategoryPicker(false);
              router.push('/product-categories');
            }}
          >
            <IconSymbol name="plus" size={18} color={accent} />
            <ThemedText style={{ color: accent, marginLeft: 8, fontWeight: '600' }}>Crear nueva categoría</ThemedText>
          </Pressable>
          <FlatList
            data={productCategories}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.pickerItem, { borderBottomColor: borderColor }]}
                onPress={() => selectCategory(item)}
              >
                <View style={[styles.categoryDot, { backgroundColor: item.color || '#999' }]} />
                <View style={styles.pickerItemContent}>
                  <ThemedText style={styles.pickerItemName}>{item.name}</ThemedText>
                  {item.description && (
                    <ThemedText style={[styles.pickerItemDesc, { color: textSecondary }]}>
                      {item.description}
                    </ThemedText>
                  )}
                </View>
                {form.categoryId === item.id && (
                  <IconSymbol name="checkmark" size={20} color={accent} />
                )}
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptyPicker}>
                <ThemedText style={{ color: textSecondary }}>No hay categorías</ThemedText>
                <Pressable
                  style={[styles.addButton, { backgroundColor: accent }]}
                  onPress={() => {
                    setShowCategoryPicker(false);
                    router.push('/product-categories');
                  }}
                >
                  <ThemedText style={{ color: '#fff' }}>Crear categoría</ThemedText>
                </Pressable>
              </View>
            }
          />
        </View>
      </Modal>

      {/* Modal selector de proveedor */}
      <Modal
        visible={showSupplierPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSupplierPicker(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor }]}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <Pressable onPress={() => setShowSupplierPicker(false)}>
              <ThemedText style={{ color: accent }}>Cancelar</ThemedText>
            </Pressable>
            <ThemedText type="subtitle">Seleccionar Proveedor</ThemedText>
            <View style={{ width: 60 }} />
          </View>
          <FlatList
            data={suppliers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.pickerItem, { borderBottomColor: borderColor }]}
                onPress={() => selectSupplier(item)}
              >
                <View style={styles.pickerItemContent}>
                  <ThemedText style={styles.pickerItemName}>{item.name}</ThemedText>
                  {item.phone && (
                    <ThemedText style={[styles.pickerItemDesc, { color: textSecondary }]}>
                      {item.phone}
                    </ThemedText>
                  )}
                </View>
                {form.supplierId === item.id && (
                  <IconSymbol name="checkmark" size={20} color={accent} />
                )}
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptyPicker}>
                <ThemedText style={{ color: textSecondary }}>No hay proveedores</ThemedText>
                <Pressable
                  style={[styles.addButton, { backgroundColor: accent }]}
                  onPress={() => {
                    setShowSupplierPicker(false);
                    router.push('/suppliers');
                  }}
                >
                  <ThemedText style={{ color: '#fff' }}>Añadir proveedor</ThemedText>
                </Pressable>
              </View>
            }
          />
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  editButton: {
    padding: Spacing.xs,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  section: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  value: {
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  categoryDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  stockField: {
    flex: 1,
  },
  stockLabel: {
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  stockControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  stockInput: {
    width: 60,
    textAlign: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    marginHorizontal: Spacing.xs,
    fontSize: 16,
  },
  stockValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  alertText: {
    marginLeft: Spacing.xs,
    fontSize: 14,
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  priceField: {
    flex: 1,
  },
  supplierCodeRow: {
    marginTop: Spacing.sm,
  },
  supplierCode: {
    fontSize: 14,
    marginTop: 4,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  storageRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  storageField: {
    flex: 1,
  },
  lowStockContainer: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  pickerItemContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  pickerItemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  pickerItemDesc: {
    fontSize: 14,
    marginTop: 2,
  },
  emptyPicker: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  addButton: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
});
