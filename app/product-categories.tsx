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
import { FAB } from '@/components/fab';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useProductCategories } from '@/hooks/use-product-categories';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { ProductCategory } from '@/types/inventory';

const COLORS = [
  '#E74C3C', '#9B59B6', '#3498DB', '#1ABC9C', '#F39C12',
  '#E67E22', '#95A5A6', '#2ECC71', '#34495E', '#8E44AD',
  '#16A085', '#7F8C8D', '#C0392B', '#2980B9', '#27AE60',
];

export default function ProductCategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { categories, loading, addCategory, updateCategory, deleteCategory } = useProductCategories();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: COLORS[0],
  });

  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');
  const textSecondary = useThemeColor({ light: '#666', dark: '#999' }, 'text');
  const cardBg = useThemeColor({ light: '#fff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'background');

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', color: COLORS[0] });
    setModalVisible(true);
  };

  const openEditModal = (category: ProductCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || COLORS[0],
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await addCategory(formData);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la categoría');
    }
  };

  const handleDelete = (category: ProductCategory) => {
    Alert.alert(
      'Eliminar categoría',
      `¿Estás seguro de eliminar "${category.name}"?`,
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

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <LoadingSpinner message="Cargando categorías..." />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={tintColor} />
        </Pressable>
        <ThemedText type="title" style={styles.headerTitle}>
          Categorías de Productos
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      {/* Lista de categorías */}
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.categoryCard, { backgroundColor: cardBg, borderColor }]}
            onPress={() => openEditModal(item)}
          >
            <View style={[styles.colorDot, { backgroundColor: item.color || COLORS[0] }]} />
            <View style={styles.categoryInfo}>
              <ThemedText style={styles.categoryName}>{item.name}</ThemedText>
              {item.description && (
                <ThemedText style={[styles.categoryDescription, { color: textSecondary }]}>
                  {item.description}
                </ThemedText>
              )}
            </View>
            <Pressable
              onPress={() => handleDelete(item)}
              style={styles.deleteButton}
              hitSlop={10}
            >
              <IconSymbol name="trash.fill" size={18} color="#E74C3C" />
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ThemedText style={{ color: textSecondary }}>
              No hay categorías. Añade una nueva.
            </ThemedText>
          </View>
        }
      />

      {/* FAB para añadir */}
      <FAB icon="plus" onPress={openAddModal} />

      {/* Modal de edición */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setModalVisible(false)}>
              <ThemedText style={{ color: tintColor }}>Cancelar</ThemedText>
            </Pressable>
            <ThemedText type="subtitle">
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </ThemedText>
            <Pressable onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Guardar cambios"
            accessibilityHint="Pulsa para guardar los datos">
              <ThemedText style={{ color: tintColor, fontWeight: '600' }}>
                Guardar
              </ThemedText>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Nombre *</ThemedText>
              <TextInput
                style={[styles.input, { color: textColor, borderColor, backgroundColor: cardBg }]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Ej: Cuerdas, Martillos, etc."
                placeholderTextColor={textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Descripción</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea, { color: textColor, borderColor, backgroundColor: cardBg }]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Descripción opcional"
                placeholderTextColor={textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Color</ThemedText>
              <View style={styles.colorGrid}>
                {COLORS.map((color) => (
                  <Pressable
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      formData.color === color && styles.colorSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, color })}
                  >
                    {formData.color === color && (
                      <IconSymbol name="checkmark" size={16} color="#fff" />
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginRight: Spacing.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
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
    borderBottomColor: '#e0e0e0',
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
});
