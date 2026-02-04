import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Breadcrumbs } from '@/components/breadcrumbs';
import { useSnackbar } from '@/components/snackbar';
import { useClientsData, usePianosData, useAppointmentsData } from '@/hooks/data';
import { trpc } from '@/utils/trpc';

import { useWhatsApp } from '@/hooks/use-whatsapp';
import { useCalendarSync } from '@/hooks/use-calendar-sync';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { Appointment, AppointmentStatus, APPOINTMENT_STATUS_LABELS, ESTIMATED_DURATIONS } from '@/types/business';
import { SERVICE_TYPE_LABELS, ServiceType, getClientFullName, getClientFormattedAddress } from '@/types';

export default function AppointmentDetailScreen() {
  const { id, clientId: initialClientId, pianoId: initialPianoId } = useLocalSearchParams<{
    id: string;
    clientId?: string;
    pianoId?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isNew = id === 'new';

  // Cargar solo el detalle de esta cita específica
  const { data: appointmentDetail, isLoading: loadingDetail } = trpc.appointments.getById.useQuery(
    { id: parseInt(id, 10) },
    { enabled: !isNew && !!id }
  );

  // Solo cargar listas completas si es cita nueva
  const { clients, loading: clientsLoading } = useClientsData({ enabled: isNew });
  const { pianos, getPianosByClient, loading: pianosLoading } = usePianosData({ enabled: isNew });
  const { addAppointment, updateAppointment, deleteAppointment } = useAppointmentsData();
  const { error: showError } = useSnackbar();
  const { sendAppointmentReminder } = useWhatsApp();
  const { showExportOptions, exportToGoogleCalendar, exportToOutlookCalendar, exportToICS } = useCalendarSync();
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);

  const [isEditing, setIsEditing] = useState(isNew);
  const [form, setForm] = useState<Partial<Appointment>>({
    clientId: initialClientId || '',
    pianoId: initialPianoId || '',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    estimatedDuration: 90,
    serviceType: 'tuning',
    status: 'scheduled',
    reminderSent: false,
    notes: '',
  });

  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accent = useThemeColor({}, 'accent');
  const error = useThemeColor({}, 'error');
  const textColor = useThemeColor({}, 'text');

  useEffect(() => {
    if (!isNew && appointmentDetail) {
      // Convertir appointmentDetail al formato del formulario
      setForm({
        id: String(appointmentDetail.id),
        clientId: String(appointmentDetail.clientId),
        pianoId: appointmentDetail.pianoId ? String(appointmentDetail.pianoId) : '',
        date: appointmentDetail.date,
        startTime: appointmentDetail.startTime,
        estimatedDuration: appointmentDetail.duration,
        serviceType: appointmentDetail.serviceType as ServiceType,
        status: appointmentDetail.status as AppointmentStatus,
        reminderSent: appointmentDetail.reminderSent || false,
        notes: appointmentDetail.notes || '',
        title: appointmentDetail.title || '',
      });
    }
  }, [appointmentDetail, isNew]);

  // Para citas existentes, usar datos de appointmentDetail
  const selectedClient = !isNew && appointmentDetail ? {
    id: String(appointmentDetail.clientId),
    firstName: appointmentDetail.clientName?.split(' ')[0] || '',
    lastName1: appointmentDetail.clientName?.split(' ')[1],
    phone: appointmentDetail.clientPhone || '',
    email: appointmentDetail.clientEmail || undefined,
    addressText: appointmentDetail.clientAddress || undefined,
  } : null;

  const selectedPiano = !isNew && appointmentDetail && appointmentDetail.pianoId ? {
    id: String(appointmentDetail.pianoId),
    brand: appointmentDetail.pianoBrand || '',
    model: appointmentDetail.pianoModel || '',
    serialNumber: appointmentDetail.pianoSerialNumber || '',
  } : null;

  const clientPianos = isNew && form.clientId ? getPianosByClient(form.clientId) : [];

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.clientId) {
      Alert.alert('Error', 'Debes seleccionar un cliente');
      return;
    }
    if (!form.date || !form.startTime) {
      Alert.alert('Error', 'La fecha y hora son obligatorias');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      if (isNew) {
        await addAppointment({
          clientId: form.clientId,
          pianoId: form.pianoId,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          estimatedDuration: form.estimatedDuration || 90,
          serviceType: form.serviceType || 'tuning',
          maintenanceLevel: form.maintenanceLevel,
          address: form.address || (selectedClient ? getClientFormattedAddress(selectedClient) : ''),
          status: 'scheduled',
          notes: form.notes?.trim(),
          reminderSent: false,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Éxito', 'Cita creada correctamente');
        router.back();
      } else if (id) {
        await updateAppointment(id, form);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Éxito', 'Cita actualizada correctamente');
        setIsEditing(false);
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar la cita';
      setSaveError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar cita',
      '¿Estás seguro de que quieres eliminar esta cita?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deleteAppointment(id!);
            router.back();
          },
        },
      ]
    );
  };

  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    if (!isNew && id) {
      await updateAppointment(id, { status: newStatus });
      setForm({ ...form, status: newStatus });
    }
  };

  const serviceTypes: ServiceType[] = ['tuning', 'repair', 'regulation', 'maintenance', 'inspection'];
  const statuses: AppointmentStatus[] = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'];

  // Mostrar loading mientras cargan los datos
  const isLoading = loadingDetail || (isNew && (clientsLoading || pianosLoading));

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: isNew ? 'Nueva Cita' : 'Detalle de Cita',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ marginRight: 16 }}>
              <IconSymbol name="chevron.left" size={24} color={accent} />
            </Pressable>
          ),
          headerRight: () =>
            !isNew && (
              <Pressable onPress={() => setIsEditing(!isEditing)}>
                <ThemedText style={{ color: accent }}>
                  {isEditing ? 'Cancelar' : 'Editar'}
                </ThemedText>
              </Pressable>
            ),
        }}
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={accent} />
          <ThemedText style={{ marginTop: 16, color: textSecondary }}>Cargando datos...</ThemedText>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Selección de cliente */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={[styles.label, { color: textSecondary }]}>Cliente *</ThemedText>
          {isEditing ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.horizontalList}>
                {clients.map((c) => (
                  <Pressable
                    key={c.id}
                    style={[
                      styles.selectOption,
                      { backgroundColor: cardBg, borderColor },
                      form.clientId === c.id && { backgroundColor: accent, borderColor: accent },
                    ]}
                    onPress={() => setForm({ ...form, clientId: c.id, pianoId: '' })}
                  >
                    <ThemedText
                      style={{ color: form.clientId === c.id ? '#FFFFFF' : textSecondary }}
                      numberOfLines={1}
                    >
                      {getClientFullName(c)}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          ) : (
            <ThemedText style={styles.value}>{selectedClient ? getClientFullName(selectedClient) : '-'}</ThemedText>
          )}
        </View>

        {/* Selección de piano (opcional) */}
        {form.clientId && clientPianos.length > 0 && (
          <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
            <ThemedText style={[styles.label, { color: textSecondary }]}>Piano (opcional)</ThemedText>
            {isEditing ? (
              <View style={styles.pianoList}>
                <Pressable
                  style={[
                    styles.pianoOption,
                    { backgroundColor: cardBg, borderColor },
                    !form.pianoId && { backgroundColor: accent, borderColor: accent },
                  ]}
                  onPress={() => setForm({ ...form, pianoId: '' })}
                >
                  <ThemedText style={{ color: !form.pianoId ? '#FFFFFF' : textColor }}>
                    Sin especificar
                  </ThemedText>
                </Pressable>
                {clientPianos.map((p) => (
                  <Pressable
                    key={p.id}
                    style={[
                      styles.pianoOption,
                      { backgroundColor: cardBg, borderColor },
                      form.pianoId === p.id && { backgroundColor: accent, borderColor: accent },
                    ]}
                    onPress={() => setForm({ ...form, pianoId: p.id })}
                  >
                    <ThemedText style={{ color: form.pianoId === p.id ? '#FFFFFF' : textColor }}>
                      {p.brand} {p.model}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            ) : (
              <ThemedText style={styles.value}>
                {selectedPiano ? `${selectedPiano.brand} ${selectedPiano.model}` : 'Sin especificar'}
              </ThemedText>
            )}
          </View>
        )}

        {/* Fecha y hora */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={[styles.label, { color: textSecondary }]}>Fecha *</ThemedText>
              {isEditing ? (
                <TextInput
                  style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                  value={form.date}
                  onChangeText={(text) => setForm({ ...form, date: text })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={textSecondary}
                />
              ) : (
                <ThemedText style={styles.value}>{form.date || '-'}</ThemedText>
              )}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={[styles.label, { color: textSecondary }]}>Hora *</ThemedText>
              {isEditing ? (
                <TextInput
                  style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                  value={form.startTime}
                  onChangeText={(text) => setForm({ ...form, startTime: text })}
                  placeholder="HH:MM"
                  placeholderTextColor={textSecondary}
                />
              ) : (
                <ThemedText style={styles.value}>{form.startTime || '-'}</ThemedText>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: textSecondary }]}>Duración estimada (min)</ThemedText>
            {isEditing ? (
              <TextInput
                style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                value={form.estimatedDuration?.toString()}
                onChangeText={(text) => setForm({ ...form, estimatedDuration: parseInt(text) || 90 })}
                keyboardType="number-pad"
                placeholder="90"
                placeholderTextColor={textSecondary}
              />
            ) : (
              <ThemedText style={styles.value}>{form.estimatedDuration} minutos</ThemedText>
            )}
          </View>
        </View>

        {/* Tipo de servicio */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={[styles.label, { color: textSecondary }]}>Tipo de servicio</ThemedText>
          {isEditing ? (
            <View style={styles.typeGrid}>
              {serviceTypes.map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.typeOption,
                    { backgroundColor: cardBg, borderColor },
                    form.serviceType === type && { backgroundColor: accent, borderColor: accent },
                  ]}
                  onPress={() => {
                    const duration = ESTIMATED_DURATIONS[type] || 90;
                    setForm({ ...form, serviceType: type, estimatedDuration: duration });
                  }}
                >
                  <ThemedText
                    style={[
                      styles.typeText,
                      { color: form.serviceType === type ? '#FFFFFF' : textSecondary },
                    ]}
                  >
                    {SERVICE_TYPE_LABELS[type]}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          ) : (
            <ThemedText style={styles.value}>
              {SERVICE_TYPE_LABELS[form.serviceType as ServiceType] || '-'}
            </ThemedText>
          )}
        </View>

        {/* Estado (solo para citas existentes) */}
        {!isNew && (
          <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
            <ThemedText style={[styles.label, { color: textSecondary }]}>Estado</ThemedText>
            <View style={styles.statusGrid}>
              {statuses.map((status) => (
                <Pressable
                  key={status}
                  style={[
                    styles.statusOption,
                    { backgroundColor: cardBg, borderColor },
                    form.status === status && { backgroundColor: accent, borderColor: accent },
                  ]}
                  onPress={() => handleStatusChange(status)}
                >
                  <ThemedText
                    style={[
                      styles.statusText,
                      { color: form.status === status ? '#FFFFFF' : textSecondary },
                    ]}
                  >
                    {APPOINTMENT_STATUS_LABELS[status]}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Dirección */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={[styles.label, { color: textSecondary }]}>Dirección</ThemedText>
          {isEditing ? (
            <TextInput
              style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
              value={form.address || (selectedClient ? getClientFormattedAddress(selectedClient) : '')}
              onChangeText={(text) => setForm({ ...form, address: text })}
              placeholder="Dirección del servicio"
              placeholderTextColor={textSecondary}
            />
          ) : (
            <ThemedText style={styles.value}>{form.address || (selectedClient ? getClientFormattedAddress(selectedClient) : '-')}</ThemedText>
          )}
        </View>

        {/* Notas */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={[styles.label, { color: textSecondary }]}>Notas</ThemedText>
          {isEditing ? (
            <TextInput
              style={[
                styles.input,
                styles.inputMultiline,
                { backgroundColor: cardBg, borderColor, color: textColor },
              ]}
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

        {/* Botones de acción */}
        {isEditing && (
          <Pressable style={[styles.saveButton, { backgroundColor: accent }]} onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Guardar cambios"
            accessibilityHint="Pulsa para guardar los datos">
            <ThemedText style={styles.saveButtonText}>
              {isNew ? 'Crear Cita' : 'Guardar Cambios'}
            </ThemedText>
          </Pressable>
        )}

        {/* Acciones rápidas (solo en modo vista) */}
        {!isNew && !isEditing && (
          <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
            <ThemedText style={styles.sectionTitle}>Acciones</ThemedText>
            <View style={styles.actionsGrid}>
              {/* Enviar recordatorio por WhatsApp */}
              <Pressable
                style={[styles.actionButton, { backgroundColor: '#25D366' }]}
                onPress={() => {
                  if (selectedClient) {
                    sendAppointmentReminder(selectedClient, form as Appointment);
                  } else {
                    showError('No hay cliente seleccionado');
                  }
                }}
              >
                <IconSymbol name="message.fill" size={20} color="#FFFFFF" />
                <ThemedText style={styles.actionButtonText}>Recordatorio WhatsApp</ThemedText>
              </Pressable>

              {/* Exportar a Google Calendar */}
              <Pressable
                style={[styles.actionButton, { backgroundColor: '#4285F4' }]}
                onPress={() => exportToGoogleCalendar(form as Appointment, selectedClient || undefined)}
              >
                <IconSymbol name="calendar" size={20} color="#FFFFFF" />
                <ThemedText style={styles.actionButtonText}>Google Calendar</ThemedText>
              </Pressable>

              {/* Exportar a Outlook */}
              <Pressable
                style={[styles.actionButton, { backgroundColor: '#0078D4' }]}
                onPress={() => exportToOutlookCalendar(form as Appointment, selectedClient || undefined)}
              >
                <IconSymbol name="calendar" size={20} color="#FFFFFF" />
                <ThemedText style={styles.actionButtonText}>Outlook</ThemedText>
              </Pressable>

              {/* Descargar ICS */}
              <Pressable
                style={[styles.actionButton, { backgroundColor: accent }]}
                onPress={() => exportToICS(form as Appointment, selectedClient || undefined)}
              >
                <IconSymbol name="arrow.down.doc.fill" size={20} color="#FFFFFF" />
                <ThemedText style={styles.actionButtonText}>Descargar ICS</ThemedText>
              </Pressable>
            </View>
          </View>
        )}

        {!isNew && !isEditing && (
          <Pressable style={[styles.deleteButton, { borderColor: error }]} onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel="Eliminar"
            accessibilityHint="Pulsa para eliminar este elemento">
            <IconSymbol name="trash.fill" size={20} color={error} />
            <ThemedText style={[styles.deleteButtonText, { color: error }]}>
              Eliminar Cita
            </ThemedText>
          </Pressable>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  section: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  inputGroup: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  value: {
    fontSize: 16,
    paddingVertical: 4,
  },
  horizontalList: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  selectOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  pianoList: {
    gap: Spacing.sm,
  },
  pianoOption: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  typeGrid: {
    flexDirection: 'column',
    gap: Spacing.sm,
  },
  typeOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statusOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  saveButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    minWidth: '45%',
    flex: 1,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});
