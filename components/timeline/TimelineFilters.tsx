/**
 * Timeline Filters Component
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';

interface TimelineFiltersProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
}

export function TimelineFilters({ filters, onFiltersChange }: TimelineFiltersProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(filters.types || []);

  const eventTypes = [
    { value: 'service_completed', label: 'Servicios', icon: '🔧' },
    { value: 'invoice_created', label: 'Facturas', icon: '💰' },
    { value: 'invoice_paid', label: 'Pagos', icon: '💳' },
    { value: 'appointment_created', label: 'Citas', icon: '📅' },
    { value: 'message_sent', label: 'Mensajes', icon: '💬' },
    { value: 'piano_added', label: 'Pianos', icon: '🎹' },
  ];

  const toggleType = (type: string) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter((t) => t !== type)
      : [...selectedTypes, type];
    setSelectedTypes(newTypes);
  };

  const applyFilters = () => {
    onFiltersChange({
      ...filters,
      types: selectedTypes.length > 0 ? selectedTypes : undefined,
    });
    setShowModal(false);
  };

  const clearFilters = () => {
    setSelectedTypes([]);
    onFiltersChange({});
    setShowModal(false);
  };

  const activeFiltersCount = selectedTypes.length;

  return (
    <>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.filterButtonText}>
          🔍 Filtros
          {activeFiltersCount > 0 && ` (${activeFiltersCount})`}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrar eventos</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.sectionTitle}>Tipo de evento</Text>
              {eventTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeOption,
                    selectedTypes.includes(type.value) && styles.typeOptionSelected,
                  ]}
                  onPress={() => toggleType(type.value)}
                >
                  <Text style={styles.typeIcon}>{type.icon}</Text>
                  <Text style={styles.typeLabel}>{type.label}</Text>
                  {selectedTypes.includes(type.value) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={clearFilters}
              >
                <Text style={styles.buttonSecondaryText}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={applyFilters}
              >
                <Text style={styles.buttonPrimaryText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  filterButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  modalBody: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  typeOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  typeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  typeLabel: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  checkmark: {
    fontSize: 20,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#2196F3',
  },
  buttonPrimaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: '#f0f0f0',
  },
  buttonSecondaryText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
  },
});
