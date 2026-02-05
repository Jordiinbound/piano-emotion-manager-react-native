import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useServiceCategories } from '@/hooks/use-service-categories';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { CatalogService, ServiceCategory } from '@/types/service-categories';

export default function ServiceCatalogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    categories,
    services,
    addService,
    updateService,
    deleteService,
    loading,
  } = useServiceCategories();

  const [showModal, setShowModal] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [editingService, setEditingService] = useState<CatalogService | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    categoryId: '',
    categoryName: '',
    basePrice: 0,
    estimatedDuration: 60,
    notes: '',
    isActive: true,
  });

  const cardBg = useThemeColor({ light: '#fff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'background');
  const textSecondary = useThemeColor({ light: '#666', dark: '#999' }, 'text');
  const accent = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  // Filtrar servicios por categoría seleccionada
  const filteredServices = selectedCategory
    ? services.filter(s => s.categoryId === selectedCategory)
    : services;

  const openNewModal = () => {
    setEditingService(null);
    setForm({
      name: '',
      description: '',
      categoryId: selectedCategory || (categories[0]?.id || ''),
      categoryName: selectedCategory
        ? categories.find(c => c.id === selectedCategory)?.name || ''
        : categories[0]?.name || '',
      basePrice: 0,
      estimatedDuration: 60,
      notes: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (service: CatalogService) => {
    setEditingService(service);
    setForm({
      name: service.name,
      description: service.description || '',
      categoryId: service.categoryId,
      categoryName: service.categoryName || '',
      basePrice: service.basePrice,
      estimatedDuration: service.estimatedDuration || 60,
      notes: service.notes || '',
      isActive: service.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'El nombre del servicio es obligatorio');
      return;
    }

    if (!form.categoryId) {
      Alert.alert('Error', 'Selecciona una categoría');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (editingService) {
      await updateService(editingService.id, form);
    } else {
      await addService(form);
    }

    setShowModal(false);
  };

  const handleDelete = (service: CatalogService) => {
    Alert.alert(
      'Eliminar servicio',
      `¿Estás seguro de eliminar "${service.name}" del catálogo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteService(service.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const selectCategory = (cat: ServiceCategory) => {
    setForm({ ...form, categoryId: cat.id, categoryName: cat.name });
    setShowCategoryPicker(false);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const renderService = ({ item }: { item: CatalogService }) => {
    const category = categories.find(c => c.id === item.categoryId);
    
    return (
      <Pressable
        style={[styles.serviceCard, { backgroundColor: cardBg, borderColor }]}
        onPress={() => openEditModal(item)}
      >
        <View style={styles.serviceHeader}>
          <View style={[styles.categoryDot, { backgroundColor: category?.color || '#999' }]} />
          <View style={styles.serviceInfo}>
            <ThemedText style={styles.serviceName}>{item.name}</ThemedText>
            <ThemedText style={[styles.serviceCategory, { color: textSecondary }]}>
              {item.categoryName || 'Sin categoría'}
            </ThemedText>
          </View>
          <View style={styles.servicePrice}>
            <ThemedText style={styles.priceText}>{item.basePrice.toFixed(2)} €</ThemedText>
            {item.estimatedDuration && (
              <ThemedText style={[styles.durationText, { color: textSecondary }]}>
                {formatDuration(item.estimatedDuration)}
              </ThemedText>
            )}
          </View>
        </View>
        {item.description && (
          <ThemedText style={[styles.serviceDesc, { color: textSecondary }]} numberOfLines={2}>
            {item.description}
          </ThemedText>
        )}
        <View style={styles.serviceFooter}>
          {!item.isActive && (
            <View style={[styles.inactiveBadge, { backgroundColor: `${textSecondary}20` }]}>
              <ThemedText style={[styles.inactiveText, { color: textSecondary }]}>
                Inactivo
              </ThemedText>
            </View>
          )}
          <Pressable
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
          >
            <IconSymbol name="trash.fill" size={16} color="#EF4444" />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 40 }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={accent} />
        </Pressable>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          Catálogo de Servicios
        </ThemedText>
        <Pressable onPress={openNewModal} style={styles.addButton}>
          <IconSymbol name="plus" size={24} color={accent} />
        </Pressable>
      </View>

      {/* Filtro por categoría */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <Pressable
          style={[
            styles.filterChip,
            { borderColor },
            !selectedCategory && { backgroundColor: accent },
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <ThemedText style={!selectedCategory ? { color: '#fff' } : {}}>
            Todos
          </ThemedText>
        </Pressable>
        {categories.filter(c => c.isActive).map((cat) => (
          <Pressable
            key={cat.id}
            style={[
              styles.filterChip,
              { borderColor },
              selectedCategory === cat.id && { backgroundColor: cat.color },
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <View style={[styles.filterDot, { backgroundColor: cat.color }]} />
            <ThemedText style={selectedCategory === cat.id ? { color: '#fff' } : {}}>
              {cat.name}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Enlace a gestión de categorías */}
      <Pressable
        style={[styles.manageCategoriesLink, { borderBottomColor: borderColor }]}
        onPress={() => router.push('/service-categories')}
      >
        <IconSymbol name="folder.fill" size={18} color={accent} />
        <ThemedText style={{ color: accent, marginLeft: Spacing.xs }}>
          Gestionar categorías
        </ThemedText>
      </Pressable>

      {/* Lista de servicios */}
      <FlatList
        data={filteredServices}
        keyExtractor={(item) => item.id}
        renderItem={renderService}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="doc.text.fill" size={48} color={textSecondary} />
            <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
              {selectedCategory
                ? 'No hay servicios en esta categoría'
                : 'No hay servicios en el catálogo'}
            </ThemedText>
            <Pressable
              style={[styles.emptyButton, { backgroundColor: accent }]}
              onPress={openNewModal}
            >
              <ThemedText style={{ color: '#fff' }}>Añadir servicio</ThemedText>
            </Pressable>
          </View>
        }
      />

      {/* Modal de edición de servicio */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor }]}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <Pressable onPress={() => setShowModal(false)}>
              <ThemedText style={{ color: accent }}>Cancelar</ThemedText>
            </Pressable>
            <ThemedText type="subtitle">
              {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
            </ThemedText>
            <Pressable onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Guardar cambios"
            accessibilityHint="Pulsa para guardar los datos">
              <ThemedText style={{ color: accent, fontWeight: '600' }}>Guardar</ThemedText>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Nombre */}
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondary }]}>Nombre *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                value={form.name}
                onChangeText={(text) => setForm({ ...form, name: text })}
                placeholder="Ej: Afinación estándar"
                placeholderTextColor={textSecondary}
              />
            </View>

            {/* Categoría */}
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondary }]}>Categoría *</ThemedText>
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
                          { backgroundColor: categories.find(c => c.id === form.categoryId)?.color || '#999' }
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
            </View>

            {/* Descripción */}
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondary }]}>Descripción</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: cardBg, borderColor, color: textColor }]}
                value={form.description}
                onChangeText={(text) => setForm({ ...form, description: text })}
                placeholder="Descripción del servicio..."
                placeholderTextColor={textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Precio y duración */}
            <View style={styles.rowGroup}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <ThemedText style={[styles.label, { color: textSecondary }]}>Precio base (€)</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                  value={form.basePrice.toString()}
                  onChangeText={(text) => setForm({ ...form, basePrice: parseFloat(text) || 0 })}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={textSecondary}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: Spacing.md }]}>
                <ThemedText style={[styles.label, { color: textSecondary }]}>Duración (min)</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                  value={form.estimatedDuration.toString()}
                  onChangeText={(text) => setForm({ ...form, estimatedDuration: parseInt(text) || 0 })}
                  keyboardType="number-pad"
                  placeholder="60"
                  placeholderTextColor={textSecondary}
                />
              </View>
            </View>

            {/* Notas */}
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondary }]}>Notas</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: cardBg, borderColor, color: textColor }]}
                value={form.notes}
                onChangeText={(text) => setForm({ ...form, notes: text })}
                placeholder="Notas adicionales..."
                placeholderTextColor={textSecondary}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Activo */}
            <Pressable
              style={[styles.toggleRow, { borderColor }]}
              onPress={() => setForm({ ...form, isActive: !form.isActive })}
            >
              <ThemedText>Servicio activo</ThemedText>
              <View
                style={[
                  styles.toggle,
                  { backgroundColor: form.isActive ? accent : borderColor },
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    { transform: [{ translateX: form.isActive ? 20 : 0 }] },
                  ]}
                />
              </View>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

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
          <FlatList
            data={categories.filter(c => c.isActive)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.pickerItem, { borderBottomColor: borderColor }]}
                onPress={() => selectCategory(item)}
              >
                <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    minHeight: 64,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: Spacing.xs,
  },
  filterContainer: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContent: {
    flexWrap: 'wrap',
    paddingHorizontal: 48,
    paddingVertical: 0,
    gap: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 4,
    borderWidth: 1,
    minHeight: 48, // Altura táctil estándar y cómoda
    minWidth: 100, // Asegurar un ancho mínimo mayor
    justifyContent: 'center',
  },
  filterDot: {
    width: 10,
    height: 10,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  manageCategoriesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  list: {
    padding: Spacing.md,
  },
  serviceCard: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  categoryDot: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  serviceCategory: {
    fontSize: 13,
    marginTop: 2,
  },
  servicePrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  durationText: {
    fontSize: 12,
    marginTop: 2,
  },
  serviceDesc: {
    fontSize: 14,
    marginTop: Spacing.xs,
    marginLeft: 24,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end', alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  inactiveBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  inactiveText: {
    fontSize: 12,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  emptyButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
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
  modalContent: {
    flex: 1,
    padding: Spacing.md,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  rowGroup: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.xs,
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
    borderTopWidth: 1,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 4,
    padding: 2,
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 4,
    backgroundColor: '#fff',
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
});
