/**
 * Admin Help Sections Management
 * Piano Emotion Manager
 * 
 * Pantalla principal para gestionar secciones de ayuda.
 * Permite crear, editar, eliminar y reordenar secciones.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface HelpSection {
  id: string;
  name: string;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export default function AdminHelpSectionsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [sections, setSections] = useState<HelpSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState<HelpSection | null>(null);
  const [formData, setFormData] = useState({ id: '', name: '' });

  // Cargar secciones
  const loadSections = async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);
      const response = await fetch('/api/help/sections');
      if (!response.ok) throw new Error('Error al cargar secciones');
      const data = await response.json();
      setSections(data.sections || []);
    } catch (error) {
      console.error('Error loading sections:', error);
      Alert.alert('Error', 'No se pudieron cargar las secciones');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  // Refrescar
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadSections(false);
  };

  // Abrir modal de crear
  const openCreateModal = () => {
    setFormData({ id: '', name: '' });
    setShowCreateModal(true);
  };

  // Abrir modal de editar
  const openEditModal = (section: HelpSection) => {
    setSelectedSection(section);
    setFormData({ id: section.id, name: section.name });
    setShowEditModal(true);
  };

  // Crear sección
  const handleCreate = async () => {
    if (!formData.id.trim() || !formData.name.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      const response = await fetch('/api/help/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formData.id.trim(),
          name: formData.name.trim(),
          display_order: sections.length,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear sección');
      }

      Alert.alert('Éxito', 'Sección creada correctamente');
      setShowCreateModal(false);
      loadSections();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // Actualizar sección
  const handleUpdate = async () => {
    if (!selectedSection || !formData.name.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      const response = await fetch(`/api/help/sections/${selectedSection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar sección');
      }

      Alert.alert('Éxito', 'Sección actualizada correctamente');
      setShowEditModal(false);
      setSelectedSection(null);
      loadSections();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // Eliminar sección
  const handleDelete = (section: HelpSection) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de que quieres eliminar la sección "${section.name}"? Esto también eliminará todos los items asociados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`/api/help/sections/${section.id}`, {
                method: 'DELETE',
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al eliminar sección');
              }

              Alert.alert('Éxito', 'Sección eliminada correctamente');
              loadSections();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  // Navegar a items de una sección
  const navigateToItems = (section: HelpSection) => {
    router.push(`/admin/help/${section.id}`);
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <ThemedText style={styles.loadingText}>Cargando secciones...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <ThemedText style={styles.headerTitle}>Gestión de Ayuda</ThemedText>
          <ThemedText style={styles.headerSubtitle}>Secciones</ThemedText>
        </View>
        <TouchableOpacity onPress={openCreateModal} style={styles.addButton}>
          <Ionicons name="add-circle" size={28} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <ActivityIndicator
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {sections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="help-circle-outline" size={64} color={colors.text} opacity={0.3} />
            <ThemedText style={styles.emptyText}>No hay secciones de ayuda</ThemedText>
            <TouchableOpacity style={styles.emptyButton} onPress={openCreateModal}>
              <ThemedText style={styles.emptyButtonText}>Crear primera sección</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sectionsList}>
            {sections.map((section) => (
              <TouchableOpacity
                key={section.id}
                style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigateToItems(section)}
              >
                <View style={styles.sectionLeft}>
                  <View style={styles.sectionIcon}>
                    <Ionicons name="folder-open" size={24} color="#3B82F6" />
                  </View>
                  <View style={styles.sectionInfo}>
                    <ThemedText style={styles.sectionName}>{section.name}</ThemedText>
                    <ThemedText style={styles.sectionId}>ID: {section.id}</ThemedText>
                  </View>
                </View>
                <View style={styles.sectionActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      openEditModal(section);
                    }}
                  >
                    <Ionicons name="pencil" size={20} color="#F59E0B" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDelete(section);
                    }}
                  >
                    <Ionicons name="trash" size={20} color="#EF4444" />
                  </TouchableOpacity>
                  <Ionicons name="chevron-forward" size={20} color={colors.text} opacity={0.5} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal de Crear */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Nueva Sección</ThemedText>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>ID de la sección *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={formData.id}
                onChangeText={(text) => setFormData({ ...formData, id: text.toLowerCase().replace(/\s+/g, '-') })}
                placeholder="ej: dashboard-editor"
                placeholderTextColor={colors.text + '80'}
              />
              <ThemedText style={styles.hint}>
                Usa minúsculas y guiones. No se puede cambiar después.
              </ThemedText>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Nombre de la sección *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="ej: Dashboard Editor"
                placeholderTextColor={colors.text + '80'}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCreateModal(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreate}
              >
                <ThemedText style={styles.createButtonText}>Crear</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Editar */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Editar Sección</ThemedText>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>ID de la sección</ThemedText>
              <TextInput
                style={[styles.input, styles.disabledInput, { backgroundColor: colors.card + '80', color: colors.text, borderColor: colors.border }]}
                value={formData.id}
                editable={false}
              />
              <ThemedText style={styles.hint}>
                El ID no se puede modificar
              </ThemedText>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Nombre de la sección *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="ej: Dashboard Editor"
                placeholderTextColor={colors.text + '80'}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleUpdate}
              >
                <ThemedText style={styles.createButtonText}>Guardar</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
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
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
    opacity: 0.7,
  },
  emptyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionsList: {
    padding: 16,
    gap: 12,
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#3B82F620',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionInfo: {
    flex: 1,
  },
  sectionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionId: {
    fontSize: 14,
    opacity: 0.7,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 4,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    fontSize: 16,
  },
  disabledInput: {
    opacity: 0.6,
  },
  hint: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#6B7280',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#3B82F6',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
