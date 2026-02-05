/**
 * Admin Help Items Management
 * Piano Emotion Manager
 * 
 * Pantalla para gestionar items (preguntas y respuestas) de una sección de ayuda.
 * Permite crear, editar, eliminar y reordenar items.
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
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface HelpItem {
  id: number;
  section_id: string;
  question: string;
  answer: string;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

interface HelpSection {
  id: string;
  name: string;
}

export default function AdminHelpItemsScreen() {
  const { sectionId } = useLocalSearchParams<{ sectionId: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [section, setSection] = useState<HelpSection | null>(null);
  const [items, setItems] = useState<HelpItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HelpItem | null>(null);
  const [formData, setFormData] = useState({ question: '', answer: '' });

  // Cargar sección e items
  const loadData = async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);

      // Cargar sección
      const sectionResponse = await fetch(`/api/help/sections/${sectionId}`);
      if (!sectionResponse.ok) throw new Error('Error al cargar sección');
      const sectionData = await sectionResponse.json();
      setSection(sectionData.section);

      // Cargar items
      const itemsResponse = await fetch(`/api/help/items?section_id=${sectionId}`);
      if (!itemsResponse.ok) throw new Error('Error al cargar items');
      const itemsData = await itemsResponse.json();
      setItems(itemsData.items || []);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (sectionId) {
      loadData();
    }
  }, [sectionId]);

  // Refrescar
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(false);
  };

  // Abrir modal de crear
  const openCreateModal = () => {
    setFormData({ question: '', answer: '' });
    setShowCreateModal(true);
  };

  // Abrir modal de editar
  const openEditModal = (item: HelpItem) => {
    setSelectedItem(item);
    setFormData({ question: item.question, answer: item.answer });
    setShowEditModal(true);
  };

  // Crear item
  const handleCreate = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      const response = await fetch('/api/help/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_id: sectionId,
          question: formData.question.trim(),
          answer: formData.answer.trim(),
          display_order: items.length,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear item');
      }

      Alert.alert('Éxito', 'Pregunta creada correctamente');
      setShowCreateModal(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // Actualizar item
  const handleUpdate = async () => {
    if (!selectedItem || !formData.question.trim() || !formData.answer.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      const response = await fetch(`/api/help/items/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: formData.question.trim(),
          answer: formData.answer.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar item');
      }

      Alert.alert('Éxito', 'Pregunta actualizada correctamente');
      setShowEditModal(false);
      setSelectedItem(null);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // Eliminar item
  const handleDelete = (item: HelpItem) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de que quieres eliminar esta pregunta?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`/api/help/items/${item.id}`, {
                method: 'DELETE',
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al eliminar item');
              }

              Alert.alert('Éxito', 'Pregunta eliminada correctamente');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <ThemedText style={styles.loadingText}>Cargando items...</ThemedText>
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
          <ThemedText style={styles.headerTitle}>{section?.name || 'Sección'}</ThemedText>
          <ThemedText style={styles.headerSubtitle}>{items.length} preguntas</ThemedText>
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
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={64} color={colors.text} opacity={0.3} />
            <ThemedText style={styles.emptyText}>No hay preguntas en esta sección</ThemedText>
            <TouchableOpacity style={styles.emptyButton} onPress={openCreateModal}>
              <ThemedText style={styles.emptyButtonText}>Crear primera pregunta</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {items.map((item, index) => (
              <View
                key={item.id}
                style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.itemHeader}>
                  <View style={styles.itemNumber}>
                    <ThemedText style={styles.itemNumberText}>{index + 1}</ThemedText>
                  </View>
                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => openEditModal(item)}
                    >
                      <Ionicons name="pencil" size={20} color="#F59E0B" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(item)}
                    >
                      <Ionicons name="trash" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.itemContent}>
                  <View style={styles.questionContainer}>
                    <Ionicons name="help-circle" size={20} color="#3B82F6" />
                    <ThemedText style={styles.question}>{item.question}</ThemedText>
                  </View>
                  <View style={styles.answerContainer}>
                    <Ionicons name="chatbubble" size={18} color="#10B981" />
                    <ThemedText style={styles.answer} numberOfLines={3}>
                      {item.answer}
                    </ThemedText>
                  </View>
                </View>
              </View>
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
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Nueva Pregunta</ThemedText>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Pregunta *</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={formData.question}
                  onChangeText={(text) => setFormData({ ...formData, question: text })}
                  placeholder="¿Cómo...?"
                  placeholderTextColor={colors.text + '80'}
                  multiline
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Respuesta *</ThemedText>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={formData.answer}
                  onChangeText={(text) => setFormData({ ...formData, answer: text })}
                  placeholder="Escribe una respuesta detallada..."
                  placeholderTextColor={colors.text + '80'}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
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
          </ScrollView>
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
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Editar Pregunta</ThemedText>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Pregunta *</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={formData.question}
                  onChangeText={(text) => setFormData({ ...formData, question: text })}
                  placeholder="¿Cómo...?"
                  placeholderTextColor={colors.text + '80'}
                  multiline
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Respuesta *</ThemedText>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={formData.answer}
                  onChangeText={(text) => setFormData({ ...formData, answer: text })}
                  placeholder="Escribe una respuesta detallada..."
                  placeholderTextColor={colors.text + '80'}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
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
  itemsList: {
    padding: 16,
    gap: 16,
  },
  itemCard: {
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemNumber: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#3B82F620',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  itemContent: {
    gap: 12,
  },
  questionContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  question: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  answerContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  answer: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 600,
    borderRadius: 4,
    padding: 24,
    alignSelf: 'center',
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
    minHeight: 48,
  },
  textArea: {
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 120,
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
