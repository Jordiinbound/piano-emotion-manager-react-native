/**
 * Componente de Gestión de Categorías de Inventario
 * Piano Emotion Manager
 * 
 * Permite crear, editar, reordenar y eliminar categorías de inventario
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useInventoryCategories } from '@/hooks/data/use-inventory-categories';

export function InventoryCategoriesSettings() {
  const {
    categories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
  } = useInventoryCategories();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('tag.fill');

  const accent = useThemeColor({}, 'accent');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textColor = useThemeColor({}, 'text');
  const error = useThemeColor({}, 'error');
  const success = useThemeColor({}, 'success');

  const handleCreateCategory = async () => {
    if (!newCategoryLabel.trim()) {
      Alert.alert('Error', 'El nombre de la categoría no puede estar vacío');
      return;
    }

    try {
      await createCategory.mutateAsync({
        key: newCategoryLabel.toLowerCase().replace(/\s+/g, '_'),
        label: newCategoryLabel,
        icon: newCategoryIcon,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewCategoryLabel('');
      setNewCategoryIcon('tag.fill');
      Alert.alert('Éxito', 'Categoría creada correctamente');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo crear la categoría');
    }
  };

  const handleUpdateCategory = async (id: number) => {
    if (!editingLabel.trim()) {
      Alert.alert('Error', 'El nombre de la categoría no puede estar vacío');
      return;
    }

    try {
      await updateCategory.mutateAsync({
        id,
        label: editingLabel,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditingId(null);
      setEditingLabel('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo actualizar la categoría');
    }
  };

  const handleDeleteCategory = (id: number, label: string, isSystem: boolean) => {
    if (isSystem) {
      Alert.alert('No permitido', 'No puedes eliminar categorías del sistema');
      return;
    }

    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de que quieres eliminar la categoría "${label}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory.mutateAsync({ id });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'No se pudo eliminar la categoría');
            }
          },
        },
      ]
    );
  };

  const startEditing = (id: number, label: string, isSystem: boolean) => {
    if (isSystem) {
      Alert.alert('No permitido', 'No puedes editar categorías del sistema');
      return;
    }

    setEditingId(id);
    setEditingLabel(label);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={accent} />
        <ThemedText style={styles.loadingText}>Cargando categorías...</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Sección: Crear nueva categoría */}
      <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
        <ThemedText style={styles.sectionTitle}>Nueva Categoría</ThemedText>
        <ThemedText style={[styles.sectionDescription, { color: textSecondary }]}>
          Crea categorías personalizadas para organizar tu inventario
        </ThemedText>

        <View style={styles.formRow}>
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: textSecondary }]}>Nombre</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
              value={newCategoryLabel}
              onChangeText={setNewCategoryLabel}
              placeholder="Ej: Accesorios, Repuestos..."
              placeholderTextColor={textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: textSecondary }]}>Icono</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
              value={newCategoryIcon}
              onChangeText={setNewCategoryIcon}
              placeholder="tag.fill"
              placeholderTextColor={textSecondary}
            />
          </View>
        </View>

        <Pressable
          style={[styles.createButton, { backgroundColor: accent }]}
          onPress={handleCreateCategory}
          disabled={createCategory.isPending}
        >
          {createCategory.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <IconSymbol name="plus.circle.fill" size={20} color="#fff" />
              <ThemedText style={styles.createButtonText}>Crear Categoría</ThemedText>
            </>
          )}
        </Pressable>
      </View>

      {/* Sección: Categorías existentes */}
      <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
        <ThemedText style={styles.sectionTitle}>
          Categorías ({categories.length})
        </ThemedText>
        <ThemedText style={[styles.sectionDescription, { color: textSecondary }]}>
          Las categorías del sistema no pueden ser editadas ni eliminadas
        </ThemedText>

        {categories.map((category) => (
          <View
            key={category.id}
            style={[styles.categoryItem, { borderColor }]}
          >
            <View style={styles.categoryInfo}>
              <IconSymbol
                name={category.icon as any}
                size={24}
                color={category.organizationId ? accent : textSecondary}
              />

              {editingId === category.id ? (
                <TextInput
                  style={[
                    styles.input,
                    styles.editInput,
                    { backgroundColor: cardBg, borderColor, color: textColor },
                  ]}
                  value={editingLabel}
                  onChangeText={setEditingLabel}
                  autoFocus
                />
              ) : (
                <View style={styles.categoryTextContainer}>
                  <ThemedText style={styles.categoryLabel}>{category.label}</ThemedText>
                  {!category.organizationId && (
                    <ThemedText style={[styles.systemBadge, { color: textSecondary }]}>
                      Sistema
                    </ThemedText>
                  )}
                </View>
              )}
            </View>

            <View style={styles.categoryActions}>
              {editingId === category.id ? (
                <>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: success }]}
                    onPress={() => handleUpdateCategory(category.id)}
                    disabled={updateCategory.isPending}
                  >
                    <IconSymbol name="checkmark" size={18} color="#fff" />
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: error }]}
                    onPress={() => {
                      setEditingId(null);
                      setEditingLabel('');
                    }}
                  >
                    <IconSymbol name="xmark" size={18} color="#fff" />
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: accent }]}
                    onPress={() =>
                      startEditing(category.id, category.label, !category.organizationId)
                    }
                  >
                    <IconSymbol name="pencil" size={18} color="#fff" />
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: error }]}
                    onPress={() =>
                      handleDeleteCategory(category.id, category.label, !category.organizationId)
                    }
                  >
                    <IconSymbol name="trash" size={18} color="#fff" />
                  </Pressable>
                </>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
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
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
  },
  section: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: Spacing.lg,
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  input: {
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  editInput: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  categoryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  categoryTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  systemBadge: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
