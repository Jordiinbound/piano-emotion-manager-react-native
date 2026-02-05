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
import { ServiceCategory } from '@/types/service-categories';

const COLORS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899',
  '#6366F1', '#14B8A6', '#EF4444', '#84CC16', '#F97316',
  '#06B6D4', '#A855F7', '#6B7280',
];

export default function ServiceCategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { categories, addCategory, updateCategory, deleteCategory, loading } = useServiceCategories();

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    color: COLORS[0],
    order: 1,
    isActive: true,
  });

  const cardBg = useThemeColor({ light: '#fff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'background');
  const textSecondary = useThemeColor({ light: '#666', dark: '#999' }, 'text');
  const accent = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  const openNewModal = () => {
    setEditingCategory(null);
    setForm({
      name: '',
      description: '',
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      order: categories.length + 1,
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (category: ServiceCategory) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      description: category.description || '',
      color: category.color,
      order: category.order,
      isActive: category.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'El nombre de la categoría es obligatorio');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (editingCategory) {
      await updateCategory(editingCategory.id, form);
    } else {
      await addCategory(form);
    }

    setShowModal(false);
  };

  const handleDelete = (category: ServiceCategory) => {
    if (category.name === 'Otros') {
      Alert.alert('Error', 'No se puede eliminar la categoría "Otros"');
      return;
    }

    Alert.alert(
      'Eliminar categoría',
      `¿Estás seguro de eliminar "${category.name}"? Los servicios de esta categoría se moverán a "Otros".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteCategory(category.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const renderCategory = ({ item }: { item: ServiceCategory }) => (
    <Pressable
      style={[styles.categoryCard, { backgroundColor: cardBg, borderColor }]}
      onPress={() => openEditModal(item)}
    >
      <View style={styles.categoryHeader}>
        <View style={[styles.colorDot, { backgroundColor: item.color }]} />
        <View style={styles.categoryInfo}>
          <ThemedText style={styles.categoryName}>{item.name}</ThemedText>
          {item.description && (
            <ThemedText style={[styles.categoryDesc, { color: textSecondary }]}>
              {item.description}
            </ThemedText>
          )}
        </View>
        <View style={styles.categoryActions}>
          {!item.isActive && (
            <View style={[styles.inactiveBadge, { backgroundColor: `${textSecondary}20` }]}>
              <ThemedText style={[styles.inactiveText, { color: textSecondary }]}>
                Inactiva
              </ThemedText>
            </View>
          )}
          <Pressable
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
          >
            <IconSymbol name="trash.fill" size={18} color="#EF4444" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={accent} />
        </Pressable>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          Categorías de Servicios
        </ThemedText>
        <Pressable onPress={openNewModal} style={styles.addButton}>
          <IconSymbol name="plus" size={24} color={accent} />
        </Pressable>
      </View>

      {/* Lista de categorías */}
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="folder.fill" size={48} color={textSecondary} />
            <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
              No hay categorías de servicios
            </ThemedText>
            <Pressable
              style={[styles.emptyButton, { backgroundColor: accent }]}
              onPress={openNewModal}
            >
              <ThemedText style={{ color: '#fff' }}>Crear categoría</ThemedText>
            </Pressable>
          </View>
        }
      />

      {/* Modal de edición */}
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
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
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
                placeholder="Ej: Afinación, Reparación..."
                placeholderTextColor={textSecondary}
              />
            </View>

            {/* Descripción */}
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondary }]}>Descripción</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: cardBg, borderColor, color: textColor }]}
                value={form.description}
                onChangeText={(text) => setForm({ ...form, description: text })}
                placeholder="Descripción de la categoría..."
                placeholderTextColor={textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Color */}
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondary }]}>Color</ThemedText>
              <View style={styles.colorGrid}>
                {COLORS.map((color) => (
                  <Pressable
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      form.color === color && styles.colorSelected,
                    ]}
                    onPress={() => setForm({ ...form, color })}
                  >
                    {form.color === color && (
                      <IconSymbol name="checkmark" size={16} color="#fff" />
                    )}
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Orden */}
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondary }]}>Orden</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor, width: 80 }]}
                value={form.order.toString()}
                onChangeText={(text) => setForm({ ...form, order: parseInt(text) || 1 })}
                keyboardType="number-pad"
              />
            </View>

            {/* Activa */}
            <Pressable
              style={[styles.toggleRow, { borderColor }]}
              onPress={() => setForm({ ...form, isActive: !form.isActive })}
            >
              <ThemedText>Categoría activa</ThemedText>
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
  addButton: {
    padding: Spacing.xs,
  },
  list: {
    padding: Spacing.md,
  },
  categoryCard: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryDesc: {
    fontSize: 14,
    marginTop: 2,
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
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
});
