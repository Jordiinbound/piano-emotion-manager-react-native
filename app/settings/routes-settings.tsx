/**
 * Configuración de Rutas
 * Piano Emotion Manager
 * 
 * Gestión completa de rutas para organización de clientes
 */

import { useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  ActivityIndicator,
  Alert,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { trpc } from '@/utils/trpc';

// Paleta profesional minimalista
const COLORS = {
  primary: '#003a8c',       // Azul corporativo
  background: '#ffffff',    // Blanco puro
  surface: '#f8f9fa',       // Gris muy claro
  border: '#e5e7eb',        // Gris claro para bordes
  textPrimary: '#1a1a1a',   // Negro casi puro
  textSecondary: '#6b7280', // Gris medio
  textTertiary: '#9ca3af',  // Gris claro
  accent: '#e07a5f',        // Terracota (solo para acciones)
  success: '#10b981',       // Verde éxito
  error: '#ef4444',         // Rojo error
};

const PRESET_COLORS = [
  '#e07a5f', '#f4a261', '#e9c46a', '#2a9d8f', '#264653',
  '#e63946', '#f1faee', '#a8dadc', '#457b9d', '#1d3557',
  '#f72585', '#7209b7', '#3a0ca3', '#4361ee', '#4cc9f0',
];

const DAY_OPTIONS = [
  { value: 'flexible', label: 'Flexible' },
  { value: 'monday', label: 'Lunes' },
  { value: 'tuesday', label: 'Martes' },
  { value: 'wednesday', label: 'Miércoles' },
  { value: 'thursday', label: 'Jueves' },
  { value: 'friday', label: 'Viernes' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
];

const TIME_OPTIONS = [
  { value: 'flexible', label: 'Flexible' },
  { value: 'morning', label: 'Mañana (9-14h)' },
  { value: 'afternoon', label: 'Tarde (15-20h)' },
  { value: 'evening', label: 'Noche (20-23h)' },
];

interface RouteForm {
  id?: number;
  name: string;
  color: string;
  description: string;
  preferredDay: string;
  preferredTime: string;
}

export default function RoutesSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteForm | null>(null);
  const [formData, setFormData] = useState<RouteForm>({
    name: '',
    color: COLORS.accent,
    description: '',
    preferredDay: 'flexible',
    preferredTime: 'flexible',
  });

  // Queries
  const { data: routes = [], isLoading, refetch } = trpc.routes.getStats.useQuery();

  // Mutations
  const createMutation = trpc.routes.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowModal(false);
      resetForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const updateMutation = trpc.routes.update.useMutation({
    onSuccess: () => {
      refetch();
      setShowModal(false);
      resetForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deleteMutation = trpc.routes.delete.useMutation({
    onSuccess: () => {
      refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      color: COLORS.accent,
      description: '',
      preferredDay: 'flexible',
      preferredTime: 'flexible',
    });
    setEditingRoute(null);
  };

  const handleOpenModal = (route?: any) => {
    if (route) {
      setEditingRoute(route);
      setFormData({
        id: route.id,
        name: route.name,
        color: route.color,
        description: route.description || '',
        preferredDay: route.preferredDay || 'flexible',
        preferredTime: route.preferredTime || 'flexible',
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'El nombre de la ruta es obligatorio');
      return;
    }

    if (editingRoute) {
      updateMutation.mutate({
        id: formData.id!,
        name: formData.name,
        color: formData.color,
        description: formData.description,
        preferredDay: formData.preferredDay as any,
        preferredTime: formData.preferredTime as any,
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        color: formData.color,
        description: formData.description,
        preferredDay: formData.preferredDay as any,
        preferredTime: formData.preferredTime as any,
        displayOrder: routes.length,
      });
    }
  };

  const handleDelete = (route: any) => {
    Alert.alert(
      'Eliminar ruta',
      `¿Estás seguro de que quieres eliminar "${route.name}"?\n\nLos ${route.clientCount} clientes asignados no se eliminarán, pero perderán su asignación de ruta.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteMutation.mutate({ id: route.id }),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Gestión de Rutas',
            headerBackTitle: 'Atrás',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Gestión de Rutas',
          headerBackTitle: 'Atrás',
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.title}>Rutas de Trabajo</ThemedText>
          <ThemedText style={styles.subtitle}>
            Organiza tus clientes por zonas geográficas o circuitos de trabajo
          </ThemedText>
        </View>

        {/* Lista de rutas */}
        {routes.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="map.fill" size={64} color={COLORS.textTertiary} />
            <ThemedText style={styles.emptyTitle}>No hay rutas configuradas</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              Crea tu primera ruta para empezar a organizar tus clientes
            </ThemedText>
          </View>
        ) : (
          <View style={styles.routesList}>
            {routes.map((route: any) => (
              <View key={route.id} style={styles.routeCard}>
                <View style={styles.routeHeader}>
                  <View style={styles.routeInfo}>
                    <View style={[styles.colorDot, { backgroundColor: route.color }]} />
                    <View style={styles.routeTexts}>
                      <ThemedText style={styles.routeName}>{route.name}</ThemedText>
                      {route.description && (
                        <ThemedText style={styles.routeDescription}>
                          {route.description}
                        </ThemedText>
                      )}
                    </View>
                  </View>
                  <View style={styles.routeActions}>
                    <Pressable
                      style={styles.iconButton}
                      onPress={() => router.push(`/routes/${route.id}/map`)}
                    >
                      <IconSymbol name="map.fill" size={20} color={COLORS.accent} />
                    </Pressable>
                    <Pressable
                      style={styles.iconButton}
                      onPress={() => handleOpenModal(route)}
                    >
                      <IconSymbol name="pencil" size={20} color={COLORS.primary} />
                    </Pressable>
                    <Pressable
                      style={styles.iconButton}
                      onPress={() => handleDelete(route)}
                    >
                      <IconSymbol name="trash" size={20} color={COLORS.error} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.routeStats}>
                  <View style={styles.statItem}>
                    <IconSymbol name="person.2.fill" size={16} color={COLORS.textSecondary} />
                    <ThemedText style={styles.statText}>
                      {route.clientCount} clientes
                    </ThemedText>
                  </View>
                  {route.pianoCount > 0 && (
                    <View style={styles.statItem}>
                      <IconSymbol name="pianokeys" size={16} color={COLORS.textSecondary} />
                      <ThemedText style={styles.statText}>
                        {route.pianoCount} pianos
                      </ThemedText>
                    </View>
                  )}
                  {route.upcomingAppointments > 0 && (
                    <View style={styles.statItem}>
                      <IconSymbol name="calendar.badge.clock" size={16} color={COLORS.accent} />
                      <ThemedText style={styles.statText}>
                        {route.upcomingAppointments} próximas
                      </ThemedText>
                    </View>
                  )}
                  {route.preferredDay !== 'flexible' && (
                    <View style={styles.statItem}>
                      <IconSymbol name="calendar" size={16} color={COLORS.textSecondary} />
                      <ThemedText style={styles.statText}>
                        {DAY_OPTIONS.find(d => d.value === route.preferredDay)?.label}
                      </ThemedText>
                    </View>
                  )}
                  {route.preferredTime !== 'flexible' && (
                    <View style={styles.statItem}>
                      <IconSymbol name="clock.fill" size={16} color={COLORS.textSecondary} />
                      <ThemedText style={styles.statText}>
                        {TIME_OPTIONS.find(t => t.value === route.preferredTime)?.label}
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Botón flotante */}
      <Pressable
        style={styles.fab}
        onPress={() => handleOpenModal()}
      >
        <IconSymbol name="plus" size={24} color="#FFFFFF" />
      </Pressable>

      {/* Modal de crear/editar */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isMobile && styles.modalContentMobile]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {editingRoute ? 'Editar Ruta' : 'Nueva Ruta'}
              </ThemedText>
              <Pressable onPress={() => setShowModal(false)}>
                <IconSymbol name="xmark" size={24} color={COLORS.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Nombre */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Nombre *</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Ej: Ruta Norte, Lunes Mañana..."
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>

              {/* Color */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Color identificativo</ThemedText>
                <View style={styles.colorPicker}>
                  {PRESET_COLORS.map((color) => (
                    <Pressable
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        formData.color === color && styles.colorOptionSelected,
                      ]}
                      onPress={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </View>
              </View>

              {/* Descripción */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Descripción</ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Notas internas sobre esta ruta..."
                  placeholderTextColor={COLORS.textTertiary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Día preferente */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Día preferente</ThemedText>
                <View style={styles.selectContainer}>
                  {DAY_OPTIONS.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.selectOption,
                        formData.preferredDay === option.value && styles.selectOptionActive,
                      ]}
                      onPress={() => setFormData({ ...formData, preferredDay: option.value })}
                    >
                      <ThemedText
                        style={[
                          styles.selectOptionText,
                          formData.preferredDay === option.value && styles.selectOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Hora preferente */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Hora preferente</ThemedText>
                <View style={styles.selectContainer}>
                  {TIME_OPTIONS.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.selectOption,
                        formData.preferredTime === option.value && styles.selectOptionActive,
                      ]}
                      onPress={() => setFormData({ ...formData, preferredTime: option.value })}
                    >
                      <ThemedText
                        style={[
                          styles.selectOptionText,
                          formData.preferredTime === option.value && styles.selectOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Botones */}
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setShowModal(false)}
              >
                <ThemedText style={styles.buttonSecondaryText}>Cancelar</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.buttonPrimaryText}>
                    {editingRoute ? 'Guardar' : 'Crear'}
                  </ThemedText>
                )}
              </Pressable>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Montserrat',
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Montserrat',
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  routesList: {
    gap: Spacing.md,
  },
  routeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: Spacing.sm,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 2,
  },
  routeTexts: {
    flex: 1,
  },
  routeName: {
    fontSize: 16,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  routeDescription: {
    fontSize: 13,
    fontFamily: 'Montserrat',
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  routeActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  iconButton: {
    padding: Spacing.xs,
  },
  routeStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontFamily: 'Montserrat',
    color: COLORS.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: BorderRadius.md,
    width: '90%',
    maxWidth: 600,
    maxHeight: '90%',
  },
  modalContentMobile: {
    width: '95%',
    maxHeight: '95%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalScroll: {
    padding: Spacing.lg,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    fontSize: 15,
    fontFamily: 'Montserrat',
    color: COLORS.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: COLORS.primary,
  },
  selectContainer: {
    gap: Spacing.xs,
  },
  selectOption: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  selectOptionActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  selectOptionText: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  selectOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  button: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonPrimary: {
    backgroundColor: COLORS.accent,
  },
  buttonPrimaryText: {
    fontSize: 15,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonSecondaryText: {
    fontSize: 15,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
