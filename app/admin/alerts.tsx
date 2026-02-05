/**
 * Panel de Administración Global de Alertas
 * Solo accesible para usuarios con rol de admin
 */
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useUserRole } from '@/hooks/use-user-role';
import { BorderRadius, Spacing } from '@/constants/theme';
import { trpc } from '@/lib/trpc';

export default function AlertsAdminScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAdmin, loading: roleLoading } = useUserRole();

  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accent = useThemeColor({}, 'accent');
  const error = useThemeColor({}, 'error');
  const textColor = useThemeColor({}, 'text');
  const success = '#10B981';

  // Obtener configuración global
  const { data: globalSettings, isLoading, refetch } = trpc.alerts.getGlobalSettings.useQuery();
  const updateGlobalSettings = trpc.alerts.updateGlobalSettings.useMutation();
  const { data: statistics } = trpc.alerts.getStatistics.useQuery();

  // Estado del formulario
  const [form, setForm] = useState({
    tuningPendingDays: globalSettings?.tuningPendingDays ?? 180,
    tuningUrgentDays: globalSettings?.tuningUrgentDays ?? 270,
    regulationPendingDays: globalSettings?.regulationPendingDays ?? 730,
    regulationUrgentDays: globalSettings?.regulationUrgentDays ?? 1095,
    emailNotificationsEnabled: globalSettings?.emailNotificationsEnabled ?? true,
    pushNotificationsEnabled: globalSettings?.pushNotificationsEnabled ?? false,
    weeklyDigestEnabled: globalSettings?.weeklyDigestEnabled ?? true,
    weeklyDigestDay: globalSettings?.weeklyDigestDay ?? 1,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Actualizar form cuando se carga la configuración
  React.useEffect(() => {
    if (globalSettings) {
      setForm({
        tuningPendingDays: globalSettings.tuningPendingDays,
        tuningUrgentDays: globalSettings.tuningUrgentDays,
        regulationPendingDays: globalSettings.regulationPendingDays,
        regulationUrgentDays: globalSettings.regulationUrgentDays,
        emailNotificationsEnabled: globalSettings.emailNotificationsEnabled,
        pushNotificationsEnabled: globalSettings.pushNotificationsEnabled,
        weeklyDigestEnabled: globalSettings.weeklyDigestEnabled,
        weeklyDigestDay: globalSettings.weeklyDigestDay,
      });
    }
  }, [globalSettings]);

  // Verificar si hay cambios
  React.useEffect(() => {
    if (globalSettings) {
      const changed =
        form.tuningPendingDays !== globalSettings.tuningPendingDays ||
        form.tuningUrgentDays !== globalSettings.tuningUrgentDays ||
        form.regulationPendingDays !== globalSettings.regulationPendingDays ||
        form.regulationUrgentDays !== globalSettings.regulationUrgentDays ||
        form.emailNotificationsEnabled !== globalSettings.emailNotificationsEnabled ||
        form.pushNotificationsEnabled !== globalSettings.pushNotificationsEnabled ||
        form.weeklyDigestEnabled !== globalSettings.weeklyDigestEnabled ||
        form.weeklyDigestDay !== globalSettings.weeklyDigestDay;
      setHasChanges(changed);
    }
  }, [form, globalSettings]);

  // Redirigir si no es admin
  React.useEffect(() => {
    if (!roleLoading && !isAdmin) {
      Alert.alert('Acceso denegado', 'No tienes permisos para acceder a esta página');
      router.replace('/');
    }
  }, [isAdmin, roleLoading, router]);

  const handleSave = async () => {
    // Validaciones
    if (form.tuningPendingDays < 1 || form.tuningPendingDays > 365) {
      Alert.alert('Error', 'El intervalo de afinación pendiente debe estar entre 1 y 365 días');
      return;
    }
    if (form.tuningUrgentDays < 1 || form.tuningUrgentDays > 730) {
      Alert.alert('Error', 'El intervalo de afinación urgente debe estar entre 1 y 730 días');
      return;
    }
    if (form.tuningUrgentDays <= form.tuningPendingDays) {
      Alert.alert('Error', 'El umbral urgente de afinación debe ser mayor que el umbral pendiente');
      return;
    }
    if (form.regulationPendingDays < 1 || form.regulationPendingDays > 1825) {
      Alert.alert('Error', 'El intervalo de regulación pendiente debe estar entre 1 y 1825 días');
      return;
    }
    if (form.regulationUrgentDays < 1 || form.regulationUrgentDays > 3650) {
      Alert.alert('Error', 'El intervalo de regulación urgente debe estar entre 1 y 3650 días');
      return;
    }
    if (form.regulationUrgentDays <= form.regulationPendingDays) {
      Alert.alert('Error', 'El umbral urgente de regulación debe ser mayor que el umbral pendiente');
      return;
    }

    setIsSaving(true);
    try {
      await updateGlobalSettings.mutateAsync(form);
      await refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Éxito', 'Configuración global de alertas actualizada correctamente');
      setHasChanges(false);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'No se pudo actualizar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Restablecer valores',
      '¿Deseas restablecer todos los valores a los recomendados por defecto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: () => {
            setForm({
              tuningPendingDays: 180,
              tuningUrgentDays: 270,
              regulationPendingDays: 730,
              regulationUrgentDays: 1095,
              emailNotificationsEnabled: true,
              pushNotificationsEnabled: false,
              weeklyDigestEnabled: true,
              weeklyDigestDay: 1,
            });
            setHasChanges(true);
          },
        },
      ]
    );
  };

  if (roleLoading || isLoading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Configuración Global de Alertas',
            headerLeft: () => (
              <Pressable onPress={() => router.back()} style={{ marginRight: 16 }}>
                <IconSymbol name="chevron.left" size={24} color={accent} />
              </Pressable>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accent} />
          <ThemedText style={{ color: textSecondary, marginTop: Spacing.md }}>
            Cargando configuración...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const daysToMonths = (days: number) => {
    const months = Math.round(days / 30);
    return months === 1 ? '1 mes' : `${months} meses`;
  };

  const daysToYears = (days: number) => {
    const years = Math.round(days / 365);
    return years === 1 ? '1 año' : `${years} años`;
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Configuración Global de Alertas',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ marginRight: 16 }}>
              <IconSymbol name="chevron.left" size={24} color={accent} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={handleReset}>
              <ThemedText style={{ color: accent }}>Restablecer</ThemedText>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Descripción */}
        <View style={[styles.infoBox, { backgroundColor: `${accent}10`, borderColor: accent }]}>
          <IconSymbol name="info.circle.fill" size={20} color={accent} />
          <ThemedText style={[styles.infoText, { color: textColor }]}>
            Esta configuración se aplica a todos los pianos que no tengan umbrales personalizados.
            Los usuarios pueden configurar intervalos específicos para cada piano en la pantalla de edición.
          </ThemedText>
        </View>

        {/* Estadísticas */}
        {statistics && (
          <View style={[styles.statsSection, { backgroundColor: cardBg, borderColor }]}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
              Estadísticas del Sistema
            </ThemedText>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
                  <IconSymbol name="exclamationmark.triangle.fill" size={24} color="#EF4444" />
                </View>
                <ThemedText style={[styles.statValue, { color: textColor }]}>
                  {statistics.activeUrgent}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: textSecondary }]}>
                  Alertas Urgentes
                </ThemedText>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                  <IconSymbol name="clock.fill" size={24} color="#F59E0B" />
                </View>
                <ThemedText style={[styles.statValue, { color: textColor }]}>
                  {statistics.activePending}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: textSecondary }]}>
                  Alertas Pendientes
                </ThemedText>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
                  <IconSymbol name="checkmark.circle.fill" size={24} color={success} />
                </View>
                <ThemedText style={[styles.statValue, { color: textColor }]}>
                  {statistics.resolvedLast30Days}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: textSecondary }]}>
                  Resueltas (30d)
                </ThemedText>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${accent}15` }]}>
                  <IconSymbol name="calendar" size={24} color={accent} />
                </View>
                <ThemedText style={[styles.statValue, { color: textColor }]}>
                  {statistics.avgResolutionDays}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: textSecondary }]}>
                  Días promedio
                </ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* Umbrales de Afinación */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="tuningfork" size={24} color={accent} />
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
              Umbrales de Afinación
            </ThemedText>
          </View>

          <View style={styles.thresholdGroup}>
            <View style={styles.thresholdHeader}>
              <View style={[styles.priorityBadge, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                <ThemedText style={[styles.priorityBadgeText, { color: '#F59E0B' }]}>
                  PENDIENTE
                </ThemedText>
              </View>
              <ThemedText style={[styles.thresholdDescription, { color: textSecondary }]}>
                Alerta cuando el piano lleva sin afinar:
              </ThemedText>
            </View>

            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                value={form.tuningPendingDays.toString()}
                onChangeText={(text) => {
                  const value = parseInt(text, 10);
                  setForm({ ...form, tuningPendingDays: isNaN(value) ? 180 : value });
                }}
                placeholder="180"
                placeholderTextColor={textSecondary}
                keyboardType="numeric"
              />
              <ThemedText style={[styles.inputUnit, { color: textSecondary }]}>
                días ({daysToMonths(form.tuningPendingDays)})
              </ThemedText>
            </View>

            <View style={styles.quickButtons}>
              {[90, 120, 150, 180, 210, 240].map((days) => (
                <Pressable
                  key={days}
                  style={[
                    styles.quickButton,
                    { borderColor },
                    form.tuningPendingDays === days && { backgroundColor: accent, borderColor: accent },
                  ]}
                  onPress={() => setForm({ ...form, tuningPendingDays: days })}
                >
                  <ThemedText
                    style={[
                      styles.quickButtonText,
                      { color: form.tuningPendingDays === days ? '#FFFFFF' : textSecondary },
                    ]}
                  >
                    {daysToMonths(days)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: borderColor }]} />

          <View style={styles.thresholdGroup}>
            <View style={styles.thresholdHeader}>
              <View style={[styles.priorityBadge, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
                <ThemedText style={[styles.priorityBadgeText, { color: '#EF4444' }]}>
                  URGENTE
                </ThemedText>
              </View>
              <ThemedText style={[styles.thresholdDescription, { color: textSecondary }]}>
                Alerta urgente cuando el piano lleva sin afinar:
              </ThemedText>
            </View>

            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                value={form.tuningUrgentDays.toString()}
                onChangeText={(text) => {
                  const value = parseInt(text, 10);
                  setForm({ ...form, tuningUrgentDays: isNaN(value) ? 270 : value });
                }}
                placeholder="270"
                placeholderTextColor={textSecondary}
                keyboardType="numeric"
              />
              <ThemedText style={[styles.inputUnit, { color: textSecondary }]}>
                días ({daysToMonths(form.tuningUrgentDays)})
              </ThemedText>
            </View>

            <View style={styles.quickButtons}>
              {[180, 210, 240, 270, 300, 365].map((days) => (
                <Pressable
                  key={days}
                  style={[
                    styles.quickButton,
                    { borderColor },
                    form.tuningUrgentDays === days && { backgroundColor: accent, borderColor: accent },
                  ]}
                  onPress={() => setForm({ ...form, tuningUrgentDays: days })}
                >
                  <ThemedText
                    style={[
                      styles.quickButtonText,
                      { color: form.tuningUrgentDays === days ? '#FFFFFF' : textSecondary },
                    ]}
                  >
                    {daysToMonths(days)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Umbrales de Regulación */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="wrench.fill" size={24} color={accent} />
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
              Umbrales de Regulación
            </ThemedText>
          </View>

          <View style={styles.thresholdGroup}>
            <View style={styles.thresholdHeader}>
              <View style={[styles.priorityBadge, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                <ThemedText style={[styles.priorityBadgeText, { color: '#F59E0B' }]}>
                  PENDIENTE
                </ThemedText>
              </View>
              <ThemedText style={[styles.thresholdDescription, { color: textSecondary }]}>
                Alerta cuando el piano lleva sin regular:
              </ThemedText>
            </View>

            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                value={form.regulationPendingDays.toString()}
                onChangeText={(text) => {
                  const value = parseInt(text, 10);
                  setForm({ ...form, regulationPendingDays: isNaN(value) ? 730 : value });
                }}
                placeholder="730"
                placeholderTextColor={textSecondary}
                keyboardType="numeric"
              />
              <ThemedText style={[styles.inputUnit, { color: textSecondary }]}>
                días ({daysToYears(form.regulationPendingDays)})
              </ThemedText>
            </View>

            <View style={styles.quickButtons}>
              {[365, 547, 730, 912, 1095].map((days) => (
                <Pressable
                  key={days}
                  style={[
                    styles.quickButton,
                    { borderColor },
                    form.regulationPendingDays === days && { backgroundColor: accent, borderColor: accent },
                  ]}
                  onPress={() => setForm({ ...form, regulationPendingDays: days })}
                >
                  <ThemedText
                    style={[
                      styles.quickButtonText,
                      { color: form.regulationPendingDays === days ? '#FFFFFF' : textSecondary },
                    ]}
                  >
                    {daysToYears(days)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: borderColor }]} />

          <View style={styles.thresholdGroup}>
            <View style={styles.thresholdHeader}>
              <View style={[styles.priorityBadge, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
                <ThemedText style={[styles.priorityBadgeText, { color: '#EF4444' }]}>
                  URGENTE
                </ThemedText>
              </View>
              <ThemedText style={[styles.thresholdDescription, { color: textSecondary }]}>
                Alerta urgente cuando el piano lleva sin regular:
              </ThemedText>
            </View>

            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                value={form.regulationUrgentDays.toString()}
                onChangeText={(text) => {
                  const value = parseInt(text, 10);
                  setForm({ ...form, regulationUrgentDays: isNaN(value) ? 1095 : value });
                }}
                placeholder="1095"
                placeholderTextColor={textSecondary}
                keyboardType="numeric"
              />
              <ThemedText style={[styles.inputUnit, { color: textSecondary }]}>
                días ({daysToYears(form.regulationUrgentDays)})
              </ThemedText>
            </View>

            <View style={styles.quickButtons}>
              {[730, 912, 1095, 1277, 1460, 1825].map((days) => (
                <Pressable
                  key={days}
                  style={[
                    styles.quickButton,
                    { borderColor },
                    form.regulationUrgentDays === days && { backgroundColor: accent, borderColor: accent },
                  ]}
                  onPress={() => setForm({ ...form, regulationUrgentDays: days })}
                >
                  <ThemedText
                    style={[
                      styles.quickButtonText,
                      { color: form.regulationUrgentDays === days ? '#FFFFFF' : textSecondary },
                    ]}
                  >
                    {daysToYears(days)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Configuración de Notificaciones */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="bell.fill" size={24} color={accent} />
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
              Notificaciones
            </ThemedText>
          </View>

          <View style={styles.notificationRow}>
            <View style={styles.notificationInfo}>
              <ThemedText style={[styles.notificationLabel, { color: textColor }]}>
                Notificaciones por email
              </ThemedText>
              <ThemedText style={[styles.notificationDescription, { color: textSecondary }]}>
                Enviar alertas por correo electrónico
              </ThemedText>
            </View>
            <Pressable
              style={[
                styles.switch,
                { backgroundColor: form.emailNotificationsEnabled ? accent : borderColor },
              ]}
              onPress={() =>
                setForm({ ...form, emailNotificationsEnabled: !form.emailNotificationsEnabled })
              }
            >
              <View
                style={[
                  styles.switchThumb,
                  { backgroundColor: '#FFFFFF' },
                  form.emailNotificationsEnabled && styles.switchThumbActive,
                ]}
              />
            </Pressable>
          </View>

          <View style={[styles.divider, { backgroundColor: borderColor }]} />

          <View style={styles.notificationRow}>
            <View style={styles.notificationInfo}>
              <ThemedText style={[styles.notificationLabel, { color: textColor }]}>
                Notificaciones push
              </ThemedText>
              <ThemedText style={[styles.notificationDescription, { color: textSecondary }]}>
                Enviar notificaciones push en la aplicación
              </ThemedText>
            </View>
            <Pressable
              style={[
                styles.switch,
                { backgroundColor: form.pushNotificationsEnabled ? accent : borderColor },
              ]}
              onPress={() =>
                setForm({ ...form, pushNotificationsEnabled: !form.pushNotificationsEnabled })
              }
            >
              <View
                style={[
                  styles.switchThumb,
                  { backgroundColor: '#FFFFFF' },
                  form.pushNotificationsEnabled && styles.switchThumbActive,
                ]}
              />
            </Pressable>
          </View>

          <View style={[styles.divider, { backgroundColor: borderColor }]} />

          <View style={styles.notificationRow}>
            <View style={styles.notificationInfo}>
              <ThemedText style={[styles.notificationLabel, { color: textColor }]}>
                Resumen semanal
              </ThemedText>
              <ThemedText style={[styles.notificationDescription, { color: textSecondary }]}>
                Enviar resumen semanal de alertas pendientes
              </ThemedText>
            </View>
            <Pressable
              style={[
                styles.switch,
                { backgroundColor: form.weeklyDigestEnabled ? accent : borderColor },
              ]}
              onPress={() => setForm({ ...form, weeklyDigestEnabled: !form.weeklyDigestEnabled })}
            >
              <View
                style={[
                  styles.switchThumb,
                  { backgroundColor: '#FFFFFF' },
                  form.weeklyDigestEnabled && styles.switchThumbActive,
                ]}
              />
            </Pressable>
          </View>

          {form.weeklyDigestEnabled && (
            <>
              <View style={[styles.divider, { backgroundColor: borderColor }]} />
              <View style={styles.weeklyDigestDaySelector}>
                <ThemedText style={[styles.notificationLabel, { color: textColor }]}>
                  Día del resumen semanal
                </ThemedText>
                <View style={styles.dayButtons}>
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => (
                    <Pressable
                      key={index}
                      style={[
                        styles.dayButton,
                        { borderColor },
                        form.weeklyDigestDay === index + 1 && {
                          backgroundColor: accent,
                          borderColor: accent,
                        },
                      ]}
                      onPress={() => setForm({ ...form, weeklyDigestDay: index + 1 })}
                    >
                      <ThemedText
                        style={[
                          styles.dayButtonText,
                          {
                            color:
                              form.weeklyDigestDay === index + 1 ? '#FFFFFF' : textSecondary,
                          },
                        ]}
                      >
                        {day}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>

        {/* Botón de guardar */}
        {hasChanges && (
          <Pressable
            style={[styles.saveButton, { backgroundColor: accent }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.saveButtonText}>Guardar Configuración</ThemedText>
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  infoBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  statsSection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  thresholdGroup: {
    gap: Spacing.sm,
  },
  thresholdHeader: {
    gap: Spacing.xs,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  thresholdDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  inputUnit: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  quickButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  quickButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  notificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  notificationInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  notificationLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 4,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  switchThumbActive: {
    marginLeft: 22,
  },
  weeklyDigestDaySelector: {
    gap: Spacing.sm,
  },
  dayButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  dayButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    height: 52,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
