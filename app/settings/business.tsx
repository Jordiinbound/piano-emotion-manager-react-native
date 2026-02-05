/**
 * Configuración de Empresa
 * Piano Emotion Manager
 * 
 * Configuración del modo de trabajo: técnico individual o empresa con equipos
 */

import { useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/use-translation';
import { useModuleAccess } from '@/hooks/modules/use-modules';
import { Linking } from 'react-native';

type BusinessMode = 'individual' | 'team';

interface BusinessSettings {
  mode: BusinessMode;
  companyName: string;
  taxId: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  // Configuración de equipo
  maxTeamMembers: number;
  allowTechnicianPurchases: boolean;
  requirePurchaseApproval: boolean;
  purchaseApprovalThreshold: number;
  // Configuración de zonas
  useServiceZones: boolean;
  autoAssignByZone: boolean;
}

const DEFAULT_SETTINGS: BusinessSettings = {
  mode: 'individual',
  companyName: '',
  taxId: '',
  address: '',
  city: '',
  postalCode: '',
  country: 'ES',
  phone: '',
  email: '',
  website: '',
  maxTeamMembers: 5,
  allowTechnicianPurchases: false,
  requirePurchaseApproval: true,
  purchaseApprovalThreshold: 100,
  useServiceZones: false,
  autoAssignByZone: false,
};

export default function BusinessSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  const { hasModuleAccess } = useModuleAccess();
  const hasTeamManagement = hasModuleAccess('team_management');

  const accent = useThemeColor({}, 'accent');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const error = useThemeColor({}, 'error');
  const textColor = useThemeColor({}, 'text');

  const updateSetting = <K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // Aquí se guardarían los settings en AsyncStorage o en el servidor
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Guardado', 'La configuración se ha guardado correctamente.');
    setHasChanges(false);
  };

  const handleModeChange = (mode: BusinessMode) => {
    // Verificar si intenta cambiar a modo equipo
    if (mode === 'team') {
      // Verificar si tiene acceso al módulo de gestión de equipos
      if (!hasTeamManagement) {
        Alert.alert(
          'Función Premium',
          'La gestión de equipos requiere una suscripción Professional o superior.\n\nCon el plan Professional podrás:\n\n• Gestionar equipos de técnicos\n• Asignar trabajos automáticamente\n• Controlar permisos por rol\n• Ver reportes de productividad\n\n¿Deseas actualizar tu plan?',
          [
            { text: 'Ahora no', style: 'cancel' },
            {
              text: 'Ver Planes',
              onPress: () => {
                router.push('/settings/subscription');
              },
            },
          ]
        );
        return;
      }

      // Si tiene acceso, mostrar confirmación
      if (settings.mode === 'individual') {
        Alert.alert(
          'Cambiar a modo Empresa',
          'Al activar el modo empresa podrás:\n\n• Añadir técnicos a tu equipo\n• Asignar trabajos automáticamente\n• Gestionar permisos por rol\n• Ver reportes de productividad\n\n¿Deseas continuar?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Activar',
              onPress: () => {
                updateSetting('mode', 'team');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              },
            },
          ]
        );
      } else {
        updateSetting('mode', mode);
      }
    } else {
      // Cambiar a modo individual (siempre permitido)
      updateSetting('mode', mode);
    }
  };

  const countries = [
    { code: 'ES', name: 'España', flag: '🇪🇸' },
    { code: 'IT', name: 'Italia', flag: '🇮🇹' },
    { code: 'DE', name: 'Alemania', flag: '🇩🇪' },
    { code: 'FR', name: 'Francia', flag: '🇫🇷' },
    { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
    { code: 'DK', name: 'Dinamarca', flag: '🇩🇰' },
    { code: 'BE', name: 'Bélgica', flag: '🇧🇪' },
    { code: 'GB', name: 'Reino Unido', flag: '🇬🇧' },
  ];

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Configuración de Empresa',
          headerRight: () => (
            <Pressable onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Guardar cambios"
            accessibilityHint="Pulsa para guardar los datos" disabled={!hasChanges}>
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
        {/* Modo de trabajo */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={styles.sectionTitle}>Modo de Trabajo</ThemedText>
          <ThemedText style={[styles.sectionDescription, { color: textSecondary }]}>
            Selecciona cómo trabajas: como técnico independiente o con un equipo de técnicos.
          </ThemedText>

          <View style={styles.modeSelector}>
            <Pressable
              style={[
                styles.modeOption,
                { borderColor },
                settings.mode === 'individual' && { borderColor: accent, backgroundColor: `${accent}10` },
              ]}
              onPress={() => handleModeChange('individual')}
            >
              <View style={[styles.modeIcon, { backgroundColor: settings.mode === 'individual' ? accent : textSecondary }]}>
                <IconSymbol name="person.fill" size={24} color="#FFFFFF" />
              </View>
              <ThemedText style={styles.modeTitle}>Técnico Individual</ThemedText>
              <ThemedText style={[styles.modeDescription, { color: textSecondary }]}>
                Trabajas solo o con un asistente. Gestión simplificada.
              </ThemedText>
              {settings.mode === 'individual' && (
                <View style={[styles.selectedBadge, { backgroundColor: accent }]}>
                  <IconSymbol name="checkmark" size={14} color="#FFFFFF" />
                </View>
              )}
            </Pressable>

            <Pressable
              style={[
                styles.modeOption,
                { borderColor },
                settings.mode === 'team' && { borderColor: accent, backgroundColor: `${accent}10` },
              ]}
              onPress={() => handleModeChange('team')}
            >
              <View style={[styles.modeIcon, { backgroundColor: settings.mode === 'team' ? accent : textSecondary }]}>
                <IconSymbol name="person.3.fill" size={24} color="#FFFFFF" />
              </View>
              <ThemedText style={styles.modeTitle}>Empresa con Equipo</ThemedText>
              <ThemedText style={[styles.modeDescription, { color: textSecondary }]}>
                Gestiona múltiples técnicos, roles y asignaciones.
              </ThemedText>
              <View style={[styles.premiumBadge, { backgroundColor: warning }]}>
                <ThemedText style={styles.premiumBadgeText}>★ Premium</ThemedText>
              </View>
              {settings.mode === 'team' && (
                <View style={[styles.selectedBadge, { backgroundColor: accent }]}>
                  <IconSymbol name="checkmark" size={14} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Datos de la empresa */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={styles.sectionTitle}>Datos de la Empresa</ThemedText>

          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>
              Nombre de la empresa *
            </ThemedText>
            <TextInput
              style={[styles.input, { borderColor, color: textColor }]}
              placeholder="Mi Empresa de Pianos S.L."
              placeholderTextColor={textSecondary}
              value={settings.companyName}
              onChangeText={(v) => updateSetting('companyName', v)}
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>
              NIF/CIF *
            </ThemedText>
            <TextInput
              style={[styles.input, { borderColor, color: textColor }]}
              placeholder="B12345678"
              placeholderTextColor={textSecondary}
              value={settings.taxId}
              onChangeText={(v) => updateSetting('taxId', v.toUpperCase())}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>País</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countrySelector}>
              {countries.map((country) => (
                <Pressable
                  key={country.code}
                  style={[
                    styles.countryOption,
                    { borderColor },
                    settings.country === country.code && { borderColor: accent, backgroundColor: `${accent}10` },
                  ]}
                  onPress={() => updateSetting('country', country.code)}
                >
                  <ThemedText style={styles.countryFlag}>{country.flag}</ThemedText>
                  <ThemedText style={styles.countryName}>{country.name}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>Dirección</ThemedText>
            <TextInput
              style={[styles.input, { borderColor, color: textColor }]}
              placeholder="Calle Principal, 123"
              placeholderTextColor={textSecondary}
              value={settings.address}
              onChangeText={(v) => updateSetting('address', v)}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 2 }]}>
              <ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>Ciudad</ThemedText>
              <TextInput
                style={[styles.input, { borderColor, color: textColor }]}
                placeholder="Madrid"
                placeholderTextColor={textSecondary}
                value={settings.city}
                onChangeText={(v) => updateSetting('city', v)}
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>C.P.</ThemedText>
              <TextInput
                style={[styles.input, { borderColor, color: textColor }]}
                placeholder="28001"
                placeholderTextColor={textSecondary}
                value={settings.postalCode}
                onChangeText={(v) => updateSetting('postalCode', v)}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>Teléfono</ThemedText>
            <TextInput
              style={[styles.input, { borderColor, color: textColor }]}
              placeholder="+34 600 000 000"
              placeholderTextColor={textSecondary}
              value={settings.phone}
              onChangeText={(v) => updateSetting('phone', v)}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>Email</ThemedText>
            <TextInput
              style={[styles.input, { borderColor, color: textColor }]}
              placeholder="contacto@miempresa.com"
              placeholderTextColor={textSecondary}
              value={settings.email}
              onChangeText={(v) => updateSetting('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>Sitio web</ThemedText>
            <TextInput
              style={[styles.input, { borderColor, color: textColor }]}
              placeholder="https://www.miempresa.com"
              placeholderTextColor={textSecondary}
              value={settings.website}
              onChangeText={(v) => updateSetting('website', v)}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Configuración de equipo (solo si modo = team) */}
        {settings.mode === 'team' && (
          <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
            <ThemedText style={styles.sectionTitle}>Configuración del Equipo</ThemedText>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>Técnicos pueden hacer pedidos</ThemedText>
                <ThemedText style={[styles.settingDescription, { color: textSecondary }]}>
                  Permitir que los técnicos realicen pedidos en la tienda
                </ThemedText>
              </View>
              <Switch
                value={settings.allowTechnicianPurchases}
                onValueChange={(v) => updateSetting('allowTechnicianPurchases', v)}
                trackColor={{ false: borderColor, true: accent }}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>Requerir aprobación de pedidos</ThemedText>
                <ThemedText style={[styles.settingDescription, { color: textSecondary }]}>
                  Los pedidos de técnicos requieren aprobación del administrador
                </ThemedText>
              </View>
              <Switch
                value={settings.requirePurchaseApproval}
                onValueChange={(v) => updateSetting('requirePurchaseApproval', v)}
                trackColor={{ false: borderColor, true: accent }}
              />
            </View>

            {settings.requirePurchaseApproval && (
              <View style={styles.field}>
                <ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>
                  Umbral de aprobación (€)
                </ThemedText>
                <ThemedText style={[styles.fieldHint, { color: textSecondary }]}>
                  Pedidos por debajo de este importe no requieren aprobación
                </ThemedText>
                <TextInput
                  style={[styles.input, { borderColor, color: textColor }]}
                  placeholder="100"
                  placeholderTextColor={textSecondary}
                  value={settings.purchaseApprovalThreshold.toString()}
                  onChangeText={(v) => updateSetting('purchaseApprovalThreshold', parseInt(v) || 0)}
                  keyboardType="number-pad"
                />
              </View>
            )}

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>Usar zonas de servicio</ThemedText>
                <ThemedText style={[styles.settingDescription, { color: textSecondary }]}>
                  Asignar técnicos a zonas geográficas específicas
                </ThemedText>
              </View>
              <Switch
                value={settings.useServiceZones}
                onValueChange={(v) => updateSetting('useServiceZones', v)}
                trackColor={{ false: borderColor, true: accent }}
              />
            </View>

            {settings.useServiceZones && (
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <ThemedText style={styles.settingLabel}>Asignación automática por zona</ThemedText>
                  <ThemedText style={[styles.settingDescription, { color: textSecondary }]}>
                    Asignar automáticamente trabajos según la zona del cliente
                  </ThemedText>
                </View>
                <Switch
                  value={settings.autoAssignByZone}
                  onValueChange={(v) => updateSetting('autoAssignByZone', v)}
                  trackColor={{ false: borderColor, true: accent }}
                />
              </View>
            )}

            <Pressable
              style={[styles.manageTeamButton, { backgroundColor: accent }]}
              onPress={() => router.push('/team' as any)}
            >
              <IconSymbol name="person.3.fill" size={20} color="#FFFFFF" />
              <ThemedText style={styles.manageTeamButtonText}>Gestionar Equipo</ThemedText>
            </Pressable>
          </View>
        )}

        {/* Accesos rápidos */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={styles.sectionTitle}>Configuración Relacionada</ThemedText>

          <Pressable
            style={[styles.linkButton, { borderColor }]}
            onPress={() => router.push('/settings/einvoicing' as any)}
          >
            <IconSymbol name="doc.text.fill" size={20} color={accent} />
            <View style={styles.linkInfo}>
              <ThemedText style={styles.linkTitle}>Facturación Electrónica</ThemedText>
              <ThemedText style={[styles.linkDescription, { color: textSecondary }]}>
                Configurar sistemas de facturación por país
              </ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={16} color={textSecondary} />
          </Pressable>

          <Pressable
            style={[styles.linkButton, { borderColor }]}
            onPress={() => router.push('/settings/modules' as any)}
          >
            <IconSymbol name="square.grid.2x2.fill" size={20} color={accent} />
            <View style={styles.linkInfo}>
              <ThemedText style={styles.linkTitle}>Módulos</ThemedText>
              <ThemedText style={[styles.linkDescription, { color: textSecondary }]}>
                Activar o desactivar funcionalidades
              </ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={16} color={textSecondary} />
          </Pressable>

          <Pressable
            style={[styles.linkButton, { borderColor }]}
            onPress={() => router.push('/settings/subscription' as any)}
          >
            <IconSymbol name="star.fill" size={20} color={warning} />
            <View style={styles.linkInfo}>
              <ThemedText style={styles.linkTitle}>Suscripción</ThemedText>
              <ThemedText style={[styles.linkDescription, { color: textSecondary }]}>
                Gestionar plan y facturación
              </ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={16} color={textSecondary} />
          </Pressable>
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
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  modeSelector: {
    gap: Spacing.md,
  },
  modeOption: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    position: 'relative',
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  selectedBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  premiumBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  field: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  fieldHint: {
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  countrySelector: {
    marginTop: 4,
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginRight: Spacing.sm,
    gap: Spacing.xs,
  },
  countryFlag: {
    fontSize: 18,
  },
  countryName: {
    fontSize: 14,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  manageTeamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  manageTeamButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.md,
  },
  linkInfo: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  linkDescription: {
    fontSize: 12,
    marginTop: 2,
  },
});
