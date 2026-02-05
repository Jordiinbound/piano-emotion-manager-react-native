/**
 * Modal de Asignación de Trabajos
 * Piano Emotion Manager
 * 
 * Permite asignar o reasignar trabajos a técnicos del equipo.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

// ==========================================
// TIPOS
// ==========================================

export interface TechnicianAvailability {
  memberId: number;
  userId: number;
  displayName: string;
  color: string;
  isAvailable: boolean;
  currentLoad: number;
  maxLoad: number;
  nextAvailableSlot?: string;
  absenceReason?: string;
}

export interface Client {
  id: number;
  name: string;
  address?: string;
  phone?: string;
}

export interface Appointment {
  id: number;
  title: string;
  clientId: number;
  clientName: string;
  serviceType: string;
  date: Date;
  duration: number;
  address?: string;
}

interface WorkAssignmentModalProps {
  visible: boolean;
  onClose: () => void;
  appointment?: Appointment;
  technicians: TechnicianAvailability[];
  selectedDate: Date;
  selectedTime?: string;
  onAssign: (data: {
    appointmentId?: number;
    technicianId: number;
    scheduledDate: Date;
    scheduledStartTime: string;
    estimatedDuration: number;
    priority: string;
    notes?: string;
  }) => Promise<void>;
  onReassign?: (data: {
    assignmentId: number;
    newTechnicianId: number;
    reason: string;
  }) => Promise<void>;
  existingAssignmentId?: number;
  currentTechnicianId?: number;
}

// ==========================================
// CONSTANTES
// ==========================================

const PRIORITIES = [
  { value: 'low', label: 'Baja', color: '#6b7280', icon: 'remove-circle-outline' },
  { value: 'normal', label: 'Normal', color: '#3b82f6', icon: 'ellipse-outline' },
  { value: 'high', label: 'Alta', color: '#f59e0b', icon: 'alert-circle-outline' },
  { value: 'urgent', label: 'Urgente', color: '#ef4444', icon: 'warning-outline' },
];

const DURATIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1.5 horas' },
  { value: 120, label: '2 horas' },
  { value: 180, label: '3 horas' },
  { value: 240, label: '4 horas' },
];

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export function WorkAssignmentModal({
  visible,
  onClose,
  appointment,
  technicians,
  selectedDate,
  selectedTime = '09:00',
  onAssign,
  onReassign,
  existingAssignmentId,
  currentTechnicianId,
}: WorkAssignmentModalProps) {
  const { colors } = useTheme();
  
  const [selectedTechnician, setSelectedTechnician] = useState<number | null>(null);
  const [startTime, setStartTime] = useState(selectedTime);
  const [duration, setDuration] = useState(appointment?.duration || 60);
  const [priority, setPriority] = useState('normal');
  const [notes, setNotes] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isReassignment = !!existingAssignmentId && !!currentTechnicianId;
  
  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedTechnician(null);
      setStartTime(selectedTime);
      setDuration(appointment?.duration || 60);
      setPriority('normal');
      setNotes('');
      setReassignReason('');
    }
  }, [visible, selectedTime, appointment]);
  
  // ==========================================
  // HANDLERS
  // ==========================================
  
  const handleSubmit = async () => {
    if (!selectedTechnician) {
      Alert.alert('Error', 'Por favor, selecciona un técnico');
      return;
    }
    
    if (isReassignment && !reassignReason.trim()) {
      Alert.alert('Error', 'Por favor, indica el motivo de la reasignación');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (isReassignment && onReassign) {
        await onReassign({
          assignmentId: existingAssignmentId!,
          newTechnicianId: selectedTechnician,
          reason: reassignReason,
        });
      } else {
        await onAssign({
          appointmentId: appointment?.id,
          technicianId: selectedTechnician,
          scheduledDate: selectedDate,
          scheduledStartTime: startTime,
          estimatedDuration: duration,
          priority,
          notes: notes.trim() || undefined,
        });
      }
      
      onClose();
      Alert.alert('Éxito', isReassignment ? 'Trabajo reasignado' : 'Trabajo asignado');
    } catch (error: unknown) {
      Alert.alert('Error', error.message || 'No se pudo completar la operación');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // ==========================================
  // RENDER
  // ==========================================
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {isReassignment ? 'Reasignar Trabajo' : 'Asignar Trabajo'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Información del trabajo */}
            {appointment && (
              <View style={[styles.section, { backgroundColor: colors.background }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Información del Trabajo
                </Text>
                <Text style={[styles.appointmentTitle, { color: colors.text }]}>
                  {appointment.title}
                </Text>
                <View style={styles.appointmentMeta}>
                  <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {appointment.clientName}
                  </Text>
                </View>
                {appointment.address && (
                  <View style={styles.appointmentMeta}>
                    <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      {appointment.address}
                    </Text>
                  </View>
                )}
                <View style={styles.appointmentMeta}>
                  <Ionicons name="construct-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {appointment.serviceType}
                  </Text>
                </View>
              </View>
            )}
            
            {/* Fecha y hora */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Fecha y Hora
              </Text>
              <Text style={[styles.dateText, { color: colors.primary }]}>
                {formatDate(selectedDate)}
              </Text>
              
              <View style={styles.timeRow}>
                <Text style={[styles.label, { color: colors.text }]}>Hora inicio:</Text>
                <TextInput
                  style={[styles.timeInput, { backgroundColor: colors.background, color: colors.text }]}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              
              <Text style={[styles.label, { color: colors.text }]}>Duración:</Text>
              <View style={styles.durationGrid}>
                {DURATIONS.map((d) => (
                  <TouchableOpacity
                    key={d.value}
                    style={[
                      styles.durationOption,
                      { backgroundColor: colors.background },
                      duration === d.value && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setDuration(d.value)}
                  >
                    <Text
                      style={[
                        styles.durationText,
                        { color: duration === d.value ? '#fff' : colors.text },
                      ]}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Prioridad */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Prioridad
              </Text>
              <View style={styles.priorityGrid}>
                {PRIORITIES.map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    style={[
                      styles.priorityOption,
                      { borderColor: p.color },
                      priority === p.value && { backgroundColor: p.color },
                    ]}
                    onPress={() => setPriority(p.value)}
                  >
                    <Ionicons
                      name={p.icon as any}
                      size={20}
                      color={priority === p.value ? '#fff' : p.color}
                    />
                    <Text
                      style={[
                        styles.priorityText,
                        { color: priority === p.value ? '#fff' : p.color },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Selección de técnico */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {isReassignment ? 'Nuevo Técnico' : 'Asignar a'}
              </Text>
              
              {technicians.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No hay técnicos disponibles
                </Text>
              ) : (
                <View style={styles.technicianList}>
                  {technicians.map((tech) => (
                    <TouchableOpacity
                      key={tech.memberId}
                      style={[
                        styles.technicianCard,
                        { backgroundColor: colors.background },
                        selectedTechnician === tech.userId && {
                          borderColor: colors.primary,
                          borderWidth: 2,
                        },
                        !tech.isAvailable && styles.technicianUnavailable,
                      ]}
                      onPress={() => tech.isAvailable && setSelectedTechnician(tech.userId)}
                      disabled={!tech.isAvailable || tech.userId === currentTechnicianId}
                    >
                      <View style={[styles.technicianAvatar, { backgroundColor: tech.color }]}>
                        <Text style={styles.technicianInitial}>
                          {tech.displayName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      
                      <View style={styles.technicianInfo}>
                        <Text style={[styles.technicianName, { color: colors.text }]}>
                          {tech.displayName}
                          {tech.userId === currentTechnicianId && ' (actual)'}
                        </Text>
                        
                        {tech.isAvailable ? (
                          <View style={styles.loadBar}>
                            <View
                              style={[
                                styles.loadFill,
                                {
                                  width: `${(tech.currentLoad / tech.maxLoad) * 100}%`,
                                  backgroundColor:
                                    tech.currentLoad / tech.maxLoad > 0.8
                                      ? '#ef4444'
                                      : tech.currentLoad / tech.maxLoad > 0.5
                                      ? '#f59e0b'
                                      : '#22c55e',
                                },
                              ]}
                            />
                            <Text style={[styles.loadText, { color: colors.textSecondary }]}>
                              {tech.currentLoad}/{tech.maxLoad} trabajos
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.unavailableText}>
                            {tech.absenceReason || 'No disponible'}
                          </Text>
                        )}
                      </View>
                      
                      {selectedTechnician === tech.userId && (
                        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            
            {/* Motivo de reasignación */}
            {isReassignment && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Motivo de Reasignación *
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    { backgroundColor: colors.background, color: colors.text },
                  ]}
                  value={reassignReason}
                  onChangeText={setReassignReason}
                  placeholder="Indica el motivo de la reasignación..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}
            
            {/* Notas */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Notas para el Técnico
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: colors.background, color: colors.text },
                ]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Instrucciones especiales, acceso, etc..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
          
          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.background }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
                (!selectedTechnician || isSubmitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!selectedTechnician || isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting
                  ? 'Procesando...'
                  : isReassignment
                  ? 'Reasignar'
                  : 'Asignar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ==========================================
// ESTILOS
// ==========================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
    padding: 12,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  appointmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  metaText: {
    fontSize: 14,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  timeInput: {
    flex: 1,
    padding: 10,
    borderRadius: 4,
    fontSize: 16,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 13,
    fontWeight: '500',
  },
  priorityGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 10,
    borderRadius: 4,
    borderWidth: 2,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  technicianList: {
    gap: 8,
  },
  technicianCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
    gap: 12,
  },
  technicianUnavailable: {
    opacity: 0.5,
  },
  technicianAvatar: {
    width: 44,
    height: 44,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  technicianInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  technicianInfo: {
    flex: 1,
  },
  technicianName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  loadBar: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  loadFill: {
    height: '100%',
    borderRadius: 4,
  },
  loadText: {
    fontSize: 11,
    marginTop: 4,
  },
  unavailableText: {
    fontSize: 12,
    color: '#ef4444',
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
  },
  textArea: {
    padding: 12,
    borderRadius: 4,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 4,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    padding: 14,
    borderRadius: 4,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WorkAssignmentModal;
