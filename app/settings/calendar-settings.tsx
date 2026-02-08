/**
 * Configuración de Calendarios
 * Piano Emotion Manager
 * 
 * Integración con Google Calendar y Outlook Calendar
 */

import { useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Switch,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { trpc } from '@/utils/trpc';
import { useCalendarConnection } from '@/hooks/use-calendar-connection';

interface CalendarConnection {
  id: number;
  provider: 'google' | 'outlook';
  calendarId: string;
  calendarName: string;
  connectedAt: string;
  lastSyncAt: string | null;
  isActive: boolean;
}

interface SyncSettings {
  autoSyncEnabled: boolean;
  syncInterval: number; // minutos
  syncOnCreate: boolean;
  syncOnUpdate: boolean;
  syncOnDelete: boolean;
  defaultReminders: boolean;
}

const SYNC_INTERVALS = [
  { value: 5, label: '5 minutos' },
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
  { value: 180, label: '3 horas' },
  { value: 360, label: '6 horas' },
];

export default function CalendarSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    autoSyncEnabled: true,
    syncInterval: 15,
    syncOnCreate: true,
    syncOnUpdate: true,
    syncOnDelete: true,
    defaultReminders: true,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const accent = useThemeColor({}, 'accent');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const error = useThemeColor({}, 'error');
  const textColor = useThemeColor({}, 'text');

  // Calendar connection hook
  const {
    connectionStatus,
    isConnecting,
    isSyncing,
    connectGoogle,
    connectOutlook,
    disconnect,
    syncNow,
  } = useCalendarConnection();

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setIsLoading(true);
      // TODO: Implementar query para obtener conexiones
      // const data = await trpc.calendar.getConnections.useQuery();
      // setConnections(data);
      
      // Mock data para desarrollo
      setConnections([]);
    } catch (error) {
      console.error('Error loading connections:', error);
      Alert.alert('Error', 'No se pudieron cargar las conexiones de calendario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    await connectGoogle();
    await loadConnections();
  };

  const handleConnectOutlook = async () => {
    await connectOutlook();
    await loadConnections();
  };

  const handleDisconnect = async (connection: CalendarConnection) => {
    await disconnect(connection.provider);
    await loadConnections();
  };

  const handleSyncNow = async () => {
    await syncNow();
    await loadConnections();
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Guardado', 'La configuración de calendarios se ha guardado correctamente.');
    setHasChanges(false);
  };

  const updateSyncSetting = (key: keyof SyncSettings, value: any) => {
    setSyncSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const hasGoogleConnected = connectionStatus.hasGoogle;
  const hasOutlookConnected = connectionStatus.hasOutlook;
  const hasAnyConnection = connectionStatus.hasAny;

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Calendarios' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accent} />
          <ThemedText style={[styles.loadingText, { color: textSecondary }]}>
            Cargando configuración...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Calendarios',
          headerRight: () => (
            <Pressable
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel="Guardar cambios"
              accessibilityHint="Pulsa para guardar los datos"
              disabled={!hasChanges}
            >
              <ThemedText style={[styles.saveButton, { color: hasChanges ? accent : textSecondary }]}>
                Guardar
              </ThemedText>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Resumen de Estado */}
        <View style={[
          styles.summaryCard,
          {
            backgroundColor: cardBg,
            borderColor: borderColor,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 5,
          }
        ]}>
          <View style={styles.summaryIcon}>
            <IconSymbol
              name={hasAnyConnection ? 'checkmark.circle.fill' : 'exclamationmark.triangle.fill'}
              size={32}
              color={hasAnyConnection ? success : warning}
            />
          </View>
          <View style={styles.summaryInfo}>
            <ThemedText style={styles.summaryTitle}>
              {hasAnyConnection ? 'Calendario Conectado' : 'Sin Conexión'}
            </ThemedText>
            <ThemedText style={[styles.summaryText, { color: textSecondary }]}>
              {hasAnyConnection
                ? `${connections.filter(c => c.isActive).length} calendario(s) activo(s)`
                : 'Conecta un calendario para sincronizar eventos'
              }
            </ThemedText>
          </View>
          {hasAnyConnection && (
            <Pressable
              onPress={handleSyncNow}
              disabled={isSyncing}
              style={[styles.syncButton, { backgroundColor: accent }]}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <IconSymbol name="arrow.clockwise" size={16} color="#fff" />
              )}
            </Pressable>
          )}
        </View>

        {/* Conexiones de Calendario */}
        <View style={[
          styles.section,
          {
            backgroundColor: cardBg,
            borderColor,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 5,
          }
        ]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="calendar" size={20} color={accent} />
            <ThemedText style={styles.sectionTitle}>Conexiones</ThemedText>
          </View>

          {/* Google Calendar */}
          <View style={[styles.connectionRow, { borderTopColor: borderColor }]}>
            <View style={[styles.providerIcon, { backgroundColor: `${accent}15` }]}>
              <IconSymbol name="calendar.badge.clock" size={24} color={accent} />
            </View>
            <View style={styles.connectionInfo}>
              <ThemedText style={styles.connectionName}>Google Calendar</ThemedText>
              <ThemedText style={[styles.connectionStatus, { color: textSecondary }]}>
                {hasGoogleConnected
                  ? connections.find(c => c.provider === 'google')?.calendarName || 'Conectado'
                  : 'No conectado'
                }
              </ThemedText>
            </View>
            {hasGoogleConnected ? (
              <Pressable
                onPress={() => handleDisconnect(connections.find(c => c.provider === 'google')!)}
                style={[styles.disconnectButton, { borderColor: error }]}
              >
                <ThemedText style={[styles.disconnectButtonText, { color: error }]}>
                  Desconectar
                </ThemedText>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleConnectGoogle}
                style={[styles.connectButton, { backgroundColor: accent }]}
              >
                <ThemedText style={styles.connectButtonText}>Conectar</ThemedText>
              </Pressable>
            )}
          </View>

          {/* Outlook Calendar */}
          <View style={[styles.connectionRow, { borderTopColor: borderColor }]}>
            <View style={[styles.providerIcon, { backgroundColor: `${accent}15` }]}>
              <IconSymbol name="calendar" size={24} color={accent} />
            </View>
            <View style={styles.connectionInfo}>
              <ThemedText style={styles.connectionName}>Outlook Calendar</ThemedText>
              <ThemedText style={[styles.connectionStatus, { color: textSecondary }]}>
                {hasOutlookConnected
                  ? connections.find(c => c.provider === 'outlook')?.calendarName || 'Conectado'
                  : 'No conectado'
                }
              </ThemedText>
            </View>
            {hasOutlookConnected ? (
              <Pressable
                onPress={() => handleDisconnect(connections.find(c => c.provider === 'outlook')!)}
                style={[styles.disconnectButton, { borderColor: error }]}
              >
                <ThemedText style={[styles.disconnectButtonText, { color: error }]}>
                  Desconectar
                </ThemedText>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleConnectOutlook}
                style={[styles.connectButton, { backgroundColor: accent }]}
              >
                <ThemedText style={styles.connectButtonText}>Conectar</ThemedText>
              </Pressable>
            )}
          </View>
        </View>

        {/* Configuración de Sincronización */}
        {hasAnyConnection && (
          <View style={[
          styles.section,
          {
            backgroundColor: cardBg,
            borderColor,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 5,
          }
        ]}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="arrow.triangle.2.circlepath" size={20} color={accent} />
              <ThemedText style={styles.sectionTitle}>Sincronización</ThemedText>
            </View>

            {/* Auto-sincronización */}
            <View style={[styles.settingRow, { borderTopColor: borderColor }]}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingName}>Sincronización Automática</ThemedText>
                <ThemedText style={[styles.settingDescription, { color: textSecondary }]}>
                  Sincroniza automáticamente las citas con el calendario
                </ThemedText>
              </View>
              <Switch
                value={syncSettings.autoSyncEnabled}
                onValueChange={(value) => updateSyncSetting('autoSyncEnabled', value)}
                trackColor={{ false: borderColor, true: accent }}
                thumbColor="#fff"
              />
            </View>

            {/* Intervalo de sincronización */}
            {syncSettings.autoSyncEnabled && (
              <View style={[styles.settingRow, { borderTopColor: borderColor }]}>
                <View style={styles.settingInfo}>
                  <ThemedText style={styles.settingName}>Intervalo de Sincronización</ThemedText>
                  <ThemedText style={[styles.settingDescription, { color: textSecondary }]}>
                    Frecuencia de sincronización automática
                  </ThemedText>
                </View>
                <View style={styles.intervalButtons}>
                  {SYNC_INTERVALS.map((interval) => (
                    <Pressable
                      key={interval.value}
                      onPress={() => updateSyncSetting('syncInterval', interval.value)}
                      style={[
                        styles.intervalButton,
                        {
                          backgroundColor: syncSettings.syncInterval === interval.value
                            ? accent
                            : 'transparent',
                          borderColor: syncSettings.syncInterval === interval.value
                            ? accent
                            : borderColor,
                        }
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.intervalButtonText,
                          {
                            color: syncSettings.syncInterval === interval.value
                              ? '#fff'
                              : textColor,
                          }
                        ]}
                      >
                        {interval.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Sincronizar al crear */}
            <View style={[styles.settingRow, { borderTopColor: borderColor }]}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingName}>Sincronizar al Crear</ThemedText>
                <ThemedText style={[styles.settingDescription, { color: textSecondary }]}>
                  Añade automáticamente nuevas citas al calendario
                </ThemedText>
              </View>
              <Switch
                value={syncSettings.syncOnCreate}
                onValueChange={(value) => updateSyncSetting('syncOnCreate', value)}
                trackColor={{ false: borderColor, true: accent }}
                thumbColor="#fff"
              />
            </View>

            {/* Sincronizar al actualizar */}
            <View style={[styles.settingRow, { borderTopColor: borderColor }]}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingName}>Sincronizar al Actualizar</ThemedText>
                <ThemedText style={[styles.settingDescription, { color: textSecondary }]}>
                  Actualiza eventos del calendario cuando cambies citas
                </ThemedText>
              </View>
              <Switch
                value={syncSettings.syncOnUpdate}
                onValueChange={(value) => updateSyncSetting('syncOnUpdate', value)}
                trackColor={{ false: borderColor, true: accent }}
                thumbColor="#fff"
              />
            </View>

            {/* Sincronizar al eliminar */}
            <View style={[styles.settingRow, { borderTopColor: borderColor }]}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingName}>Sincronizar al Eliminar</ThemedText>
                <ThemedText style={[styles.settingDescription, { color: textSecondary }]}>
                  Elimina eventos del calendario cuando borres citas
                </ThemedText>
              </View>
              <Switch
                value={syncSettings.syncOnDelete}
                onValueChange={(value) => updateSyncSetting('syncOnDelete', value)}
                trackColor={{ false: borderColor, true: accent }}
                thumbColor="#fff"
              />
            </View>

            {/* Recordatorios predeterminados */}
            <View style={[styles.settingRow, { borderTopColor: borderColor }]}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingName}>Recordatorios Predeterminados</ThemedText>
                <ThemedText style={[styles.settingDescription, { color: textSecondary }]}>
                  Añade recordatorios automáticos (1 día y 1 hora antes)
                </ThemedText>
              </View>
              <Switch
                value={syncSettings.defaultReminders}
                onValueChange={(value) => updateSyncSetting('defaultReminders', value)}
                trackColor={{ false: borderColor, true: accent }}
                thumbColor="#fff"
              />
            </View>
          </View>
        )}

        {/* Información */}
        <View style={[styles.infoCard, { backgroundColor: `${accent}10`, borderColor: accent }]}>
          <IconSymbol name="info.circle.fill" size={20} color={accent} />
          <View style={styles.infoContent}>
            <ThemedText style={styles.infoTitle}>Sobre la Sincronización</ThemedText>
            <ThemedText style={[styles.infoText, { color: textSecondary }]}>
              • Las citas se sincronizan automáticamente con tu calendario{'\n'}
              • Los cambios en el calendario externo se reflejan aquí{'\n'}
              • Puedes conectar Google Calendar y Outlook Calendar al mismo tiempo{'\n'}
              • Compatible con cuentas personales y corporativas (Gmail, Google Workspace, Outlook.com, Microsoft 365){'\n'}
              • Los datos se cifran y se almacenan de forma segura
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 16,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: Spacing.md,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryInfo: {
    flex: 1,
    gap: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  summaryText: {
    fontSize: 14,
  },
  syncButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionInfo: {
    flex: 1,
    gap: 4,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: '600',
  },
  connectionStatus: {
    fontSize: 14,
  },
  connectButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  disconnectButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  disconnectButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingRow: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  settingInfo: {
    flex: 1,
    gap: 4,
  },
  settingName: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 14,
  },
  intervalButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  intervalButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  intervalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  infoContent: {
    flex: 1,
    gap: Spacing.sm,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
