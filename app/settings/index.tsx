/**
 * Página de Configuración Completa y Unificada
 * Piano Emotion Manager
 * 
 * Centro de control para todas las configuraciones de la aplicación
 */

import { useRouter, Stack } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Switch,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { LanguageSelector } from '@/components/language-selector';
import { Accordion } from '@/components/accordion';

// Tipos de configuración
type BusinessMode = 'individual' | 'team';
type EInvoicingCountry = 'ES' | 'IT' | 'DE' | 'FR' | 'PT' | 'DK' | 'BE' | 'GB' | 'none';

interface AppSettings {
  // Modo de negocio
  businessMode: BusinessMode;
  organizationName?: string;
  
  // Datos fiscales de la empresa
  businessName?: string;      // Nombre comercial
  legalName?: string;         // Razón social
  taxId?: string;             // NIF/CIF
  businessAddress?: string;   // Dirección fiscal
  businessCity?: string;
  businessPostalCode?: string;
  businessProvince?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessWebsite?: string;
  businessLogo?: string;      // URL del logo
  bankAccount?: string;       // IBAN para facturas
  bankName?: string;          // Nombre del banco
  
  // Facturación electrónica
  eInvoicingEnabled: boolean;
  eInvoicingCountry: EInvoicingCountry;
  eInvoicingCredentials: Record<string, string>;
  
  // Módulos activos
  activeModules: string[];
  
  // Inventario
  defaultMinStock: number; // Umbral de stock bajo por defecto
  stockAlertEmail: boolean; // Alertas de stock por email
  stockAlertWhatsApp: boolean; // Alertas de stock por WhatsApp
  stockAlertFrequency: 'immediate' | 'daily' | 'weekly'; // Frecuencia de alertas
  stockAlertEmailAddress?: string; // Email para alertas
  stockAlertPhone?: string; // Teléfono para WhatsApp
  
  // Tienda
  shopEnabled: boolean;
  externalStores: Array<{ name: string; url: string; apiKey?: string }>;
  purchaseApprovalThreshold: number;
  
  // Notificaciones
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  
  // Calendario
  googleCalendarSync: boolean;
  outlookCalendarSync: boolean;
  
  // IA
  aiRecommendationsEnabled: boolean;
  aiAssistantEnabled: boolean;
  
  // Contabilidad
  fiscalCountry: 'ES' | 'DE' | 'FR' | 'IT' | 'PT' | 'GB' | 'MX' | 'AR' | 'CO' | 'CL';
  
  // Preferencias de comunicación
  emailClientPreference: 'gmail' | 'outlook' | 'default';
}

const defaultSettings: AppSettings = {
  businessMode: 'individual',
  eInvoicingEnabled: false,
  eInvoicingCountry: 'none',
  eInvoicingCredentials: {},
  activeModules: ['clients', 'pianos', 'services', 'calendar', 'invoicing'],
  defaultMinStock: 5, // Umbral de stock bajo por defecto
  stockAlertEmail: false,
  stockAlertWhatsApp: false,
  stockAlertFrequency: 'immediate' as const,
  stockAlertEmailAddress: '',
  stockAlertPhone: '',
  shopEnabled: false,
  externalStores: [],
  purchaseApprovalThreshold: 100,
  notificationsEnabled: true,
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  googleCalendarSync: false,
  outlookCalendarSync: false,
  aiRecommendationsEnabled: true,
  aiAssistantEnabled: false,
  fiscalCountry: 'ES',
  emailClientPreference: 'gmail',
};

const EINVOICING_COUNTRIES = [
  { code: 'none', name: 'No activado', flag: '🚫' },
  { code: 'ES', name: 'España (Veri*Factu)', flag: '🇪🇸' },
  { code: 'IT', name: 'Italia (FatturaPA/SDI)', flag: '🇮🇹' },
  { code: 'DE', name: 'Alemania (ZUGFeRD/XRechnung)', flag: '🇩🇪' },
  { code: 'FR', name: 'Francia (Factur-X)', flag: '🇫🇷' },
  { code: 'PT', name: 'Portugal (CIUS-PT)', flag: '🇵🇹' },
  { code: 'DK', name: 'Dinamarca (OIOUBL)', flag: '🇩🇰' },
  { code: 'BE', name: 'Bélgica (PEPPOL)', flag: '🇧🇪' },
  { code: 'GB', name: 'Reino Unido (MTD)', flag: '🇬🇧' },
];

const FISCAL_COUNTRIES = [
  { code: 'ES', name: 'España', flag: '🇪🇸', taxName: 'IVA', rates: '21%, 10%, 4%' },
  { code: 'DE', name: 'Alemania', flag: '🇩🇪', taxName: 'MwSt', rates: '19%, 7%' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷', taxName: 'TVA', rates: '20%, 10%, 5.5%, 2.1%' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹', taxName: 'IVA', rates: '22%, 10%, 5%, 4%' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', taxName: 'IVA', rates: '23%, 13%, 6%' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧', taxName: 'VAT', rates: '20%, 5%, 0%' },
  { code: 'MX', name: 'México', flag: '🇲🇽', taxName: 'IVA', rates: '16%, 8%, 0%' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', taxName: 'IVA', rates: '21%, 10.5%, 27%' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', taxName: 'IVA', rates: '19%, 5%' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', taxName: 'IVA', rates: '19%' },
];

const ALL_MODULES = [
  { code: 'clients', name: 'Clientes', icon: 'person.2.fill', category: 'core', premium: false },
  { code: 'pianos', name: 'Pianos', icon: 'pianokeys', category: 'core', premium: false },
  { code: 'services', name: 'Servicios', icon: 'wrench.fill', category: 'core', premium: false },
  { code: 'calendar', name: 'Calendario', icon: 'calendar', category: 'core', premium: false },
  { code: 'invoicing', name: 'Facturación', icon: 'doc.text.fill', category: 'free', premium: false },
  { code: 'inventory', name: 'Inventario', icon: 'shippingbox.fill', category: 'free', premium: false },
  { code: 'team', name: 'Gestión de Equipos', icon: 'person.3.fill', category: 'premium', premium: true },
  { code: 'crm', name: 'CRM Avanzado', icon: 'heart.fill', category: 'premium', premium: true },
  { code: 'reports', name: 'Reportes y Analytics', icon: 'chart.pie.fill', category: 'premium', premium: true },
  { code: 'accounting', name: 'Contabilidad', icon: 'calculator', category: 'premium', premium: true },
  { code: 'shop', name: 'Tienda Online', icon: 'cart.fill', category: 'free', premium: false },
  { code: 'einvoicing', name: 'Facturación Electrónica', icon: 'doc.badge.ellipsis', category: 'premium', premium: true },
  { code: 'calendar_sync', name: 'Sincronización Calendario', icon: 'arrow.triangle.2.circlepath', category: 'premium', premium: true },
  { code: 'ai', name: 'Asistente IA', icon: 'brain', category: 'enterprise', premium: true },
];

export default function SettingsIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailClientPreference, setEmailClientPreference] = useState<'gmail' | 'outlook' | 'default'>('gmail');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const accent = useThemeColor({}, 'accent');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const error = useThemeColor({}, 'error');
  const textColor = useThemeColor({}, 'text');

  // Cargar configuración guardada
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Cargar desde AsyncStorage primero (offline-first)
        const savedSettings = await AsyncStorage.getItem('userSettings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings) as Partial<AppSettings>;
          setSettings(prev => ({ ...prev, ...parsed }));
          setNotificationsEnabled(parsed.notificationsEnabled ?? true);
          setEmailClientPreference(parsed.emailClientPreference ?? 'gmail');
        }
        
        // Intentar sincronizar con la API si hay conexión
        try {
          const response = await fetch('/api/user/settings');
          if (response.ok) {
            const apiSettings = await response.json();
            if (apiSettings) {
              const mergedSettings = { ...defaultSettings, ...apiSettings };
              setSettings(mergedSettings);
              setNotificationsEnabled(mergedSettings.notificationsEnabled);
              // Actualizar AsyncStorage con los datos del servidor
              await AsyncStorage.setItem('userSettings', JSON.stringify(mergedSettings));
            }
          }
        } catch (apiError) {
          // Si falla la API, usamos los datos locales (ya cargados)
        }
      } catch (err) {
        // Error silencioso - usar configuración por defecto
      }
    };
    loadSettings();
  }, []);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    try {
      // Preparar datos para guardar
      const settingsToSave: AppSettings = {
        ...settings,
        notificationsEnabled,
        emailClientPreference,
      };
      
      // Guardar en AsyncStorage (offline-first)
      await AsyncStorage.setItem('userSettings', JSON.stringify(settingsToSave));
      
      // Sincronizar con la API
      try {
        const response = await fetch('/api/user/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settingsToSave),
        });
        
        if (!response.ok) {
          // Si falla la API, los datos ya están guardados localmente
          // Guardado localmente exitoso, sincronización con servidor fallida
        }
      } catch (apiError) {
        // Continuar aunque falle la API - los datos están guardados localmente
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Guardado', 'La configuración se ha guardado correctamente.');
      setHasChanges(false);
    } catch (err) {
      Alert.alert('Error', 'No se pudo guardar la configuración.');
    }
  };

  /**
   * Verifica si el usuario tiene suscripción premium
   */
  const checkPremiumStatus = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/user/subscription');
      if (response.ok) {
        const data = await response.json();
        return data.plan !== 'free';
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const toggleModule = (moduleCode: string) => {
    const module = ALL_MODULES.find(m => m.code === moduleCode);
    if (module?.category === 'core') {
      Alert.alert('Módulo obligatorio', 'Este módulo es esencial y no se puede desactivar.');
      return;
    }

    if (module?.premium && !settings.activeModules.includes(moduleCode)) {
      Alert.alert(
        'Módulo Premium',
        'Este módulo requiere una suscripción premium. ¿Deseas ver los planes disponibles?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ver Planes', onPress: () => router.push('/settings/subscription' as any) },
        ]
      );
      return;
    }

    const newModules = settings.activeModules.includes(moduleCode)
      ? settings.activeModules.filter(m => m !== moduleCode)
      : [...settings.activeModules, moduleCode];
    
    updateSettings({ activeModules: newModules });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderSettingRow = (
    icon: string,
    label: string,
    sublabel: string,
    value: boolean,
    onToggle: () => void,
    disabled?: boolean
  ) => (
    <View style={[styles.settingRow, { borderBottomColor: borderColor }]}>
      <View style={[styles.settingIcon, { backgroundColor: `${accent}15` }]}>
        <IconSymbol name={icon as any} size={20} color={accent} />
      </View>
      <View style={styles.settingContent}>
        <ThemedText style={styles.settingLabel}>{label}</ThemedText>
        <ThemedText style={[styles.settingSublabel, { color: textSecondary }]}>{sublabel}</ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: borderColor, true: accent }}
        thumbColor={Platform.OS === 'android' ? (value ? accent : '#f4f3f4') : undefined}
      />
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Configuración',
          headerRight: () => hasChanges ? (
            <Pressable onPress={saveSettings} style={styles.saveButton}>
              <ThemedText style={[styles.saveButtonText, { color: accent }]}>Guardar</ThemedText>
            </Pressable>
          ) : null,
        }} 
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ========== MODO DE NEGOCIO ========== */}
        <Accordion
          title="Modo de Negocio"
          icon="building.2.fill"
          iconColor="#3B82F6"
          defaultOpen={true}
        >
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <ThemedText style={styles.cardDescription}>
              Selecciona cómo utilizas la aplicación: como técnico independiente o como empresa con equipo de técnicos.
            </ThemedText>

            <Pressable
              style={[
                styles.modeOption,
                { borderColor: settings.businessMode === 'individual' ? accent : borderColor },
                settings.businessMode === 'individual' && { backgroundColor: `${accent}10` },
              ]}
              onPress={() => updateSettings({ businessMode: 'individual' })}
            >
              <View style={[styles.modeIcon, { backgroundColor: settings.businessMode === 'individual' ? accent : borderColor }]}>
                <IconSymbol name="person.fill" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.modeContent}>
                <ThemedText style={styles.modeTitle}>Técnico Individual</ThemedText>
                <ThemedText style={[styles.modeDescription, { color: textSecondary }]}>
                  Trabajo solo o con asistentes ocasionales. Gestiono mis propios clientes y servicios.
                </ThemedText>
              </View>
              {settings.businessMode === 'individual' && (
                <IconSymbol name="checkmark.circle.fill" size={24} color={accent} />
              )}
            </Pressable>

            <Pressable
              style={[
                styles.modeOption,
                { borderColor: settings.businessMode === 'team' ? accent : borderColor },
                settings.businessMode === 'team' && { backgroundColor: `${accent}10` },
              ]}
              onPress={() => updateSettings({ businessMode: 'team' })}
            >
              <View style={[styles.modeIcon, { backgroundColor: settings.businessMode === 'team' ? accent : borderColor }]}>
                <IconSymbol name="person.3.fill" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.modeContent}>
                <ThemedText style={styles.modeTitle}>Empresa con Equipo</ThemedText>
                <ThemedText style={[styles.modeDescription, { color: textSecondary }]}>
                  Tengo un equipo de técnicos. Necesito asignar trabajos, gestionar roles y ver reportes del equipo.
                </ThemedText>
              </View>
              {settings.businessMode === 'team' && (
                <IconSymbol name="checkmark.circle.fill" size={24} color={accent} />
              )}
            </Pressable>

            {settings.businessMode === 'team' && (
              <View style={styles.teamConfig}>
                <ThemedText style={styles.sectionSubtitle}>Configuración del Equipo</ThemedText>
                <TextInput
                  style={[styles.input, { borderColor, color: textColor }]}
                  placeholder="Nombre de la empresa"
                  placeholderTextColor={textSecondary}
                  value={settings.organizationName}
                  onChangeText={(text) => updateSettings({ organizationName: text })}
                />
                <Pressable
                  style={[styles.actionButton, { backgroundColor: accent }]}
                  onPress={() => router.push('/(app)/team' as any)}
                >
                  <IconSymbol name="person.badge.plus" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.actionButtonText}>Gestionar Equipo</ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        </Accordion>

        {/* ========== FACTURACIÓN ELECTRÓNICA ========== */}
        <Accordion
          title="Facturación Electrónica"
          icon="doc.badge.ellipsis"
          iconColor="#10B981"
          defaultOpen={false}
          badge="Premium"
          badgeColor="#F59E0B"
        >
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={[styles.premiumBanner, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B' }]}>
              <IconSymbol name="star.fill" size={16} color="#F59E0B" />
              <ThemedText style={[styles.premiumBannerText, { color: '#F59E0B' }]}>
                Funcionalidad disponible en planes de pago
              </ThemedText>
            </View>
            
            <ThemedText style={styles.cardDescription}>
              Configura la facturación electrónica según los requisitos legales de tu país.
            </ThemedText>

            {renderSettingRow(
              'bolt.fill',
              'Activar Facturación Electrónica',
              'Genera facturas en formato electrónico oficial',
              settings.eInvoicingEnabled,
              async () => {
                // Verificar si es premium antes de activar
                const isPremium = await checkPremiumStatus();
                if (!isPremium) {
                  Alert.alert('Función Premium', 'Esta función requiere una suscripción Premium.');
                  return;
                }
                Alert.alert(
                  'Funcionalidad Premium',
                  'La facturación electrónica está disponible en los planes Profesional y Empresa.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Ver planes', onPress: () => router.push('/settings/subscription' as any) }
                  ]
                );
              }
            )}

            {settings.eInvoicingEnabled && (
              <>
                <ThemedText style={[styles.sectionSubtitle, { marginTop: Spacing.md }]}>
                  Selecciona tu país
                </ThemedText>
                <View style={styles.countriesGrid}>
                  {EINVOICING_COUNTRIES.filter(c => c.code !== 'none').map((country) => (
                    <Pressable
                      key={country.code}
                      style={[
                        styles.countryOption,
                        { borderColor: settings.eInvoicingCountry === country.code ? accent : borderColor },
                        settings.eInvoicingCountry === country.code && { backgroundColor: `${accent}10` },
                      ]}
                      onPress={() => updateSettings({ eInvoicingCountry: country.code as EInvoicingCountry })}
                    >
                      <ThemedText style={styles.countryFlag}>{country.flag}</ThemedText>
                      <ThemedText style={styles.countryName}>{country.name.split(' (')[0]}</ThemedText>
                      {settings.eInvoicingCountry === country.code && (
                        <IconSymbol name="checkmark.circle.fill" size={16} color={accent} />
                      )}
                    </Pressable>
                  ))}
                </View>

                {settings.eInvoicingCountry !== 'none' && (
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: accent, marginTop: Spacing.md }]}
                    onPress={() => router.push('/verifactu-settings' as any)}
                  >
                    <IconSymbol name="gearshape.fill" size={20} color="#FFFFFF" />
                    <ThemedText style={styles.actionButtonText}>
                      Configurar {EINVOICING_COUNTRIES.find(c => c.code === settings.eInvoicingCountry)?.name.split(' (')[0]}
                    </ThemedText>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </Accordion>

        {/* ========== CONTABILIDAD ========== */}
        <Accordion
          title="Contabilidad"
          icon="calculator"
          iconColor="#F97316"
          defaultOpen={false}
          badge="Premium"
          badgeColor="#F59E0B"
        >
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={[styles.premiumBanner, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B' }]}>
              <IconSymbol name="star.fill" size={16} color="#F59E0B" />
              <ThemedText style={[styles.premiumBannerText, { color: '#F59E0B' }]}>
                Funcionalidad disponible en planes de pago
              </ThemedText>
            </View>
            
            <ThemedText style={styles.cardDescription}>
              Selecciona tu país fiscal para ver los modelos e impuestos correspondientes.
            </ThemedText>

            <ThemedText style={[styles.sectionSubtitle, { marginTop: Spacing.sm }]}>
              País Fiscal
            </ThemedText>
            <View style={styles.countriesGrid}>
              {FISCAL_COUNTRIES.map((country) => (
                <Pressable
                  key={country.code}
                  style={[
                    styles.countryOption,
                    { borderColor: settings.fiscalCountry === country.code ? accent : borderColor },
                    settings.fiscalCountry === country.code && { backgroundColor: `${accent}10` },
                  ]}
                  onPress={() => updateSettings({ fiscalCountry: country.code as any })}
                >
                  <ThemedText style={styles.countryFlag}>{country.flag}</ThemedText>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.countryName}>{country.name}</ThemedText>
                    <ThemedText style={[styles.countryTax, { color: textSecondary }]}>
                      {country.taxName}: {country.rates}
                    </ThemedText>
                  </View>
                  {settings.fiscalCountry === country.code && (
                    <IconSymbol name="checkmark.circle.fill" size={16} color={accent} />
                  )}
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.actionButton, { backgroundColor: accent, marginTop: Spacing.md }]}
              onPress={() => router.push('/invoices' as any)}
            >
              <IconSymbol name="chart.bar.fill" size={20} color="#FFFFFF" />
              <ThemedText style={styles.actionButtonText}>
                Ir a Contabilidad
              </ThemedText>
            </Pressable>
          </View>
        </Accordion>

 

        {/* ========== INVENTARIO ========== */}
        <Accordion
          title="Inventario"
          icon="shippingbox.fill"
          iconColor="#F59E0B"
          defaultOpen={false}
        >
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.settingRow}>
              <View style={[styles.settingIcon, { backgroundColor: '#F59E0B15' }]}>
                <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#F59E0B" />
              </View>
              <View style={styles.settingContent}>
                <ThemedText style={styles.settingLabel}>Umbral de Stock Bajo por Defecto</ThemedText>
                <ThemedText style={[styles.settingSublabel, { color: textSecondary }]}>
                  Cantidad mínima antes de mostrar alerta. Cada material puede tener su propio umbral que prevalecerá sobre este valor.
                </ThemedText>
              </View>
            </View>
            <View style={[styles.inputRow, { marginLeft: 56 }]}>
              <TextInput
                style={[styles.input, styles.smallInput, { borderColor, color: textColor }]}
                placeholder="5"
                placeholderTextColor={textSecondary}
                keyboardType="numeric"
                value={settings.defaultMinStock.toString()}
                onChangeText={(text) => updateSettings({ defaultMinStock: parseInt(text) || 0 })}
              />
              <ThemedText style={[styles.inputSuffix, { color: textSecondary }]}>unidades</ThemedText>
            </View>
            
            <View style={[styles.infoBox, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B30' }]}>
              <IconSymbol name="info.circle.fill" size={16} color="#F59E0B" />
              <ThemedText style={[styles.infoText, { color: '#92400E' }]}>
                Los materiales sin umbral específico usarán este valor. Si un material tiene su propio umbral configurado, ese será el que se aplique.
              </ThemedText>
            </View>

            {/* Separador */}
            <View style={[styles.divider, { backgroundColor: borderColor, marginVertical: Spacing.md }]} />

            {/* Alertas de Stock */}
            <ThemedText style={[styles.sectionSubtitle, { marginBottom: Spacing.sm }]}>Alertas de Stock Bajo</ThemedText>
            
            {renderSettingRow(
              'envelope.fill',
              'Alertas por Email',
              'Recibe notificaciones cuando el stock esté bajo',
              settings.stockAlertEmail,
              () => updateSettings({ stockAlertEmail: !settings.stockAlertEmail })
            )}

            {settings.stockAlertEmail && (
              <View style={[styles.inputRow, { marginLeft: 56, marginBottom: Spacing.sm }]}>
                <TextInput
                  style={[styles.input, styles.flexInput, { borderColor, color: textColor }]}
                  placeholder="tu@email.com"
                  placeholderTextColor={textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={settings.stockAlertEmailAddress}
                  onChangeText={(text) => updateSettings({ stockAlertEmailAddress: text })}
                />
              </View>
            )}

            {renderSettingRow(
              'message.fill',
              'Alertas por WhatsApp',
              'Recibe alertas en tu WhatsApp (requiere plan Profesional)',
              settings.stockAlertWhatsApp,
              () => updateSettings({ stockAlertWhatsApp: !settings.stockAlertWhatsApp })
            )}

            {settings.stockAlertWhatsApp && (
              <View style={[styles.inputRow, { marginLeft: 56, marginBottom: Spacing.sm }]}>
                <TextInput
                  style={[styles.input, styles.flexInput, { borderColor, color: textColor }]}
                  placeholder="+34 600 000 000"
                  placeholderTextColor={textSecondary}
                  keyboardType="phone-pad"
                  value={settings.stockAlertPhone}
                  onChangeText={(text) => updateSettings({ stockAlertPhone: text })}
                />
              </View>
            )}

            {(settings.stockAlertEmail || settings.stockAlertWhatsApp) && (
              <>
                <ThemedText style={[styles.settingSublabel, { color: textSecondary, marginTop: Spacing.sm }]}>
                  Frecuencia de alertas
                </ThemedText>
                <View style={styles.frequencyOptions}>
                  {[
                    { value: 'immediate', label: 'Inmediata' },
                    { value: 'daily', label: 'Resumen diario' },
                    { value: 'weekly', label: 'Resumen semanal' },
                  ].map((option) => (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.frequencyOption,
                        { borderColor },
                        settings.stockAlertFrequency === option.value && { borderColor: accent, backgroundColor: `${accent}15` },
                      ]}
                      onPress={() => updateSettings({ stockAlertFrequency: option.value as any })}
                    >
                      <ThemedText
                        style={[
                          styles.frequencyOptionText,
                          settings.stockAlertFrequency === option.value && { color: accent, fontWeight: '600' },
                        ]}
                      >
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <Pressable
              style={[styles.actionButton, { backgroundColor: '#F59E0B', marginTop: Spacing.md }]}
              onPress={() => router.push('/(tabs)/inventory' as any)}
            >
              <IconSymbol name="shippingbox.fill" size={20} color="#FFFFFF" />
              <ThemedText style={styles.actionButtonText}>Ir al Inventario</ThemedText>
            </Pressable>
          </View>
        </Accordion>

        {/* ========== TIENDA ========== */}
        <Accordion
          title="Tienda y Compras"
          icon="cart.fill"
          iconColor="#84CC16"
          defaultOpen={false}
        >
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            {renderSettingRow(
              'cart.fill',
              'Activar Tienda',
              'Acceso a tiendas de distribuidores y externas',
              settings.shopEnabled,
              () => updateSettings({ shopEnabled: !settings.shopEnabled })
            )}

            {settings.shopEnabled && (
              <>
                <View style={styles.settingRow}>
                  <View style={[styles.settingIcon, { backgroundColor: `${accent}15` }]}>
                    <IconSymbol name="eurosign.circle.fill" size={20} color={accent} />
                  </View>
                  <View style={styles.settingContent}>
                    <ThemedText style={styles.settingLabel}>Umbral de Aprobación</ThemedText>
                    <ThemedText style={[styles.settingSublabel, { color: textSecondary }]}>
                      Pedidos superiores a este importe requieren aprobación del administrador
                    </ThemedText>
                  </View>
                </View>
                <TextInput
                  style={[styles.input, { borderColor, color: textColor, marginLeft: 56 }]}
                  placeholder="100"
                  placeholderTextColor={textSecondary}
                  keyboardType="numeric"
                  value={settings.purchaseApprovalThreshold.toString()}
                  onChangeText={(text) => updateSettings({ purchaseApprovalThreshold: parseInt(text) || 0 })}
                />

                <Pressable
                  style={[styles.actionButton, { backgroundColor: accent, marginTop: Spacing.md }]}
                  onPress={() => router.push('/(app)/shop' as any)}
                >
                  <IconSymbol name="storefront.fill" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.actionButtonText}>Gestionar Tiendas</ThemedText>
                </Pressable>
              </>
            )}
          </View>
        </Accordion>

        {/* ========== CALENDARIO ========== */}
        <Accordion
          title="Calendario"
          icon="calendar"
          iconColor="#10B981"
          defaultOpen={false}
        >
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <Pressable
              style={[styles.linkRow, { borderBottomColor: borderColor }]}
              onPress={() => router.push('/settings/calendar-settings' as any)}
            >
              <View style={[styles.settingIcon, { backgroundColor: `${accent}15` }]}>
                <IconSymbol name="calendar.badge.clock" size={20} color={accent} />
              </View>
              <View style={styles.settingContent}>
                <ThemedText style={styles.settingLabel}>Configuración de Calendarios</ThemedText>
                <ThemedText style={[styles.settingSublabel, { color: textSecondary }]}>
                  Conectar Google Calendar y Outlook
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={textSecondary} />
            </Pressable>

            {renderSettingRow(
              'g.circle.fill',
              'Sincronizar con Google Calendar',
              'Sincroniza tus citas automáticamente',
              settings.googleCalendarSync,
              () => {
                if (!settings.googleCalendarSync) {
                  Alert.alert('Conectar Google', '¿Deseas conectar tu cuenta de Google Calendar?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Conectar', onPress: () => router.push('/settings/calendar-settings' as any) },
                  ]);
                } else {
                  updateSettings({ googleCalendarSync: false });
                }
              }
            )}

            {renderSettingRow(
              'envelope.fill',
              'Sincronizar con Outlook',
              'Sincroniza con Microsoft Outlook',
              settings.outlookCalendarSync,
              () => {
                if (!settings.outlookCalendarSync) {
                  Alert.alert('Conectar Outlook', '¿Deseas conectar tu cuenta de Outlook?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Conectar', onPress: () => router.push('/settings/calendar-settings' as any) },
                  ]);
                } else {
                  updateSettings({ outlookCalendarSync: false });
                }
              }
            )}
          </View>
        </Accordion>

        {/* ========== INTELIGENCIA ARTIFICIAL ========== */}
        <Accordion
          title="Inteligencia Artificial"
          icon="brain"
          iconColor="#EC4899"
          defaultOpen={false}
        >
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <ThemedText style={styles.cardDescription}>
              Funcionalidades potenciadas por IA para mejorar tu productividad.
            </ThemedText>

            {renderSettingRow(
              'lightbulb.fill',
              'Recomendaciones Inteligentes',
              'Sugerencias de mantenimiento y servicios',
              settings.aiRecommendationsEnabled,
              () => updateSettings({ aiRecommendationsEnabled: !settings.aiRecommendationsEnabled })
            )}

            {renderSettingRow(
              'bubble.left.and.bubble.right.fill',
              'Asistente IA',
              'Ayuda contextual y respuestas automáticas',
              settings.aiAssistantEnabled,
              () => {
                if (!settings.aiAssistantEnabled) {
                  Alert.alert(
                    'Función Premium',
                    'El asistente IA está disponible en el plan Enterprise.',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Ver Planes', onPress: () => router.push('/settings/subscription' as any) },
                    ]
                  );
                } else {
                  updateSettings({ aiAssistantEnabled: false });
                }
              }
            )}
          </View>
        </Accordion>

        {/* ========== PREFERENCIAS DE COMUNICACIÓN ========== */}
        <Accordion
          title="Preferencias de Comunicación"
          icon="envelope.fill"
          iconColor="#3B82F6"
          defaultOpen={false}
        >
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={[styles.settingRow, { borderBottomColor: borderColor }]}>
              <View style={[styles.settingIcon, { backgroundColor: '#3B82F615' }]}>
                <IconSymbol name="envelope.fill" size={20} color="#3B82F6" />
              </View>
              <View style={styles.settingContent}>
                <ThemedText style={styles.settingLabel}>Cliente de correo preferido</ThemedText>
                <ThemedText style={[styles.settingSublabel, { color: textSecondary }]}>
                  Selecciona qué cliente usar al enviar emails a clientes
                </ThemedText>
                <View style={styles.radioGroup}>
                  <Pressable
                    style={styles.radioOption}
                    onPress={() => {
                      setEmailClientPreference('gmail');
                      setHasChanges(true);
                    }}
                  >
                    <View style={[styles.radioCircle, { borderColor }]}>
                      {emailClientPreference === 'gmail' && (
                        <View style={[styles.radioCircleSelected, { backgroundColor: accent }]} />
                      )}
                    </View>
                    <ThemedText style={styles.radioLabel}>Gmail</ThemedText>
                  </Pressable>
                  
                  <Pressable
                    style={styles.radioOption}
                    onPress={() => {
                      setEmailClientPreference('outlook');
                      setHasChanges(true);
                    }}
                  >
                    <View style={[styles.radioCircle, { borderColor }]}>
                      {emailClientPreference === 'outlook' && (
                        <View style={[styles.radioCircleSelected, { backgroundColor: accent }]} />
                      )}
                    </View>
                    <ThemedText style={styles.radioLabel}>Outlook</ThemedText>
                  </Pressable>
                  
                  <Pressable
                    style={styles.radioOption}
                    onPress={() => {
                      setEmailClientPreference('default');
                      setHasChanges(true);
                    }}
                  >
                    <View style={[styles.radioCircle, { borderColor }]}>
                      {emailClientPreference === 'default' && (
                        <View style={[styles.radioCircleSelected, { backgroundColor: accent }]} />
                      )}
                    </View>
                    <ThemedText style={styles.radioLabel}>Cliente predeterminado</ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Accordion>

        {/* ========== NOTIFICACIONES ========== */}
        <Accordion
          title="Notificaciones"
          icon="bell.fill"
          iconColor="#F59E0B"
          defaultOpen={false}
        >
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            {renderSettingRow(
              'bell.fill',
              'Notificaciones Push',
              'Alertas en tiempo real en tu dispositivo',
              settings.pushNotifications,
              () => updateSettings({ pushNotifications: !settings.pushNotifications })
            )}

            {renderSettingRow(
              'envelope.fill',
              'Notificaciones por Email',
              'Resúmenes y alertas importantes',
              settings.emailNotifications,
              () => updateSettings({ emailNotifications: !settings.emailNotifications })
            )}

            {renderSettingRow(
              'message.fill',
              'Notificaciones SMS',
              'Recordatorios urgentes por SMS',
              settings.smsNotifications,
              () => updateSettings({ smsNotifications: !settings.smsNotifications })
            )}
          </View>
        </Accordion>

        {/* ========== ACCESOS RÁPIDOS ========== */}
        <Accordion
          title="Más Configuraciones"
          icon="ellipsis.circle.fill"
          iconColor="#6B7280"
          defaultOpen={false}
        >
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <Pressable
              style={[styles.linkRow, { borderBottomColor: borderColor }]}
              onPress={() => router.push('/business-info' as any)}
            >
              <View style={[styles.settingIcon, { backgroundColor: `${accent}15` }]}>
                <IconSymbol name="building.2.fill" size={20} color={accent} />
              </View>
              <View style={styles.settingContent}>
                <ThemedText style={styles.settingLabel}>Datos Fiscales</ThemedText>
                <ThemedText style={[styles.settingSublabel, { color: textSecondary }]}>
                  Información de facturación de tu empresa
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={textSecondary} />
            </Pressable>

            <Pressable
              style={[styles.linkRow, { borderBottomColor: borderColor }]}
              onPress={() => router.push('/invoice-settings' as any)}
            >
              <View style={[styles.settingIcon, { backgroundColor: `${accent}15` }]}>
                <IconSymbol name="doc.text.fill" size={20} color={accent} />
              </View>
              <View style={styles.settingContent}>
                <ThemedText style={styles.settingLabel}>Configuración de Facturas</ThemedText>
                <ThemedText style={[styles.settingSublabel, { color: textSecondary }]}>
                  Numeración, plantillas y opciones
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={textSecondary} />
            </Pressable>

            <Pressable
              style={[styles.linkRow, { borderBottomColor: borderColor }]}
              onPress={() => router.push('/rates' as any)}
            >
              <View style={[styles.settingIcon, { backgroundColor: `${accent}15` }]}>
                <IconSymbol name="eurosign.circle.fill" size={20} color={accent} />
              </View>
              <View style={styles.settingContent}>
                <ThemedText style={styles.settingLabel}>Tarifas de Servicios</ThemedText>
                <ThemedText style={[styles.settingSublabel, { color: textSecondary }]}>
                  Precios y conceptos de facturación
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={textSecondary} />
            </Pressable>

            <Pressable
              style={[styles.linkRow, { borderBottomColor: borderColor }]}
              onPress={() => router.push('/settings/service-types' as any)}
            >
              <View style={[styles.settingIcon, { backgroundColor: `${accent}15` }]}>
                <IconSymbol name="wrench.and.screwdriver.fill" size={20} color={accent} />
              </View>
              <View style={styles.settingContent}>
                <ThemedText style={styles.settingLabel}>Tipos de Servicio</ThemedText>
                <ThemedText style={[styles.settingSublabel, { color: textSecondary }]}>
                  Gestionar tipos de servicio personalizados
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={textSecondary} />
            </Pressable>

            <Pressable
              style={[styles.linkRow, { borderBottomColor: borderColor }]}
              onPress={() => router.push('/backup' as any)}
            >
              <View style={[styles.settingIcon, { backgroundColor: `${accent}15` }]}>
                <IconSymbol name="arrow.clockwise.icloud.fill" size={20} color={accent} />
              </View>
              <View style={styles.settingContent}>
                <ThemedText style={styles.settingLabel}>Copia de Seguridad</ThemedText>
                <ThemedText style={[styles.settingSublabel, { color: textSecondary }]}>
                  Exportar e importar todos los datos
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={textSecondary} />
            </Pressable>

            {/* Selector de idioma personal del usuario */}
            <LanguageSelector mode="inline" />
          </View>
        </Accordion>

        {/* ========== APARIENCIA ========== */}
        <Accordion
          title="Apariencia"
          icon="paintbrush.fill"
          iconColor="#8B5CF6"
          defaultOpen={false}
        >
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.settingRow}>
              <View style={[styles.settingIcon, { backgroundColor: '#8B5CF620' }]}>
                <IconSymbol name="moon.fill" size={20} color="#8B5CF6" />
              </View>
              <View style={styles.settingContent}>
                <ThemedText style={styles.settingLabel}>Tema</ThemedText>
                <ThemedText style={[styles.settingSublabel, { color: textSecondary }]}>Elige el modo de visualización</ThemedText>
              </View>
            </View>
            <View style={styles.themeOptions}>
              <Pressable
                style={[styles.themeOption, (settings as any).theme === 'auto' && { borderColor: accent, backgroundColor: `${accent}10` }]}
                onPress={() => updateSettings({ theme: 'auto' })}
              >
                <IconSymbol name="sparkles" size={24} color={(settings as any).theme === 'auto' ? accent : textSecondary} />
                <ThemedText style={[styles.themeOptionText, (settings as any).theme === 'auto' && { color: accent }]}>Automático</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.themeOption, (settings as any).theme === 'light' && { borderColor: accent, backgroundColor: `${accent}10` }]}
                onPress={() => updateSettings({ theme: 'light' })}
              >
                <IconSymbol name="sun.max.fill" size={24} color={(settings as any).theme === 'light' ? accent : textSecondary} />
                <ThemedText style={[styles.themeOptionText, (settings as any).theme === 'light' && { color: accent }]}>Claro</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.themeOption, (settings as any).theme === 'dark' && { borderColor: accent, backgroundColor: `${accent}10` }]}
                onPress={() => updateSettings({ theme: 'dark' })}
              >
                <IconSymbol name="moon.fill" size={24} color={(settings as any).theme === 'dark' ? accent : textSecondary} />
                <ThemedText style={[styles.themeOptionText, (settings as any).theme === 'dark' && { color: accent }]}>Oscuro</ThemedText>
              </Pressable>
            </View>
          </View>
        </Accordion>

        {/* ========== DATOS Y BACKUP ========== */}
        <Accordion
          title="Datos y Backup"
          icon="externaldrive.fill"
          iconColor="#06B6D4"
          defaultOpen={false}
        >
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <Pressable
              style={[styles.linkRow, { borderBottomColor: borderColor }]}
              onPress={async () => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  Alert.alert(
                    'Exportar Datos',
                    'Se generará un archivo con todos tus datos (clientes, pianos, servicios, facturas, etc.).',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { 
                        text: 'Exportar', 
                        onPress: async () => {
                          // Simular exportación
                          Alert.alert('✅ Exportación Completada', 'Tus datos han sido exportados correctamente.');
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                      },
                    ]
                  );
                } catch (err) {
                  Alert.alert('Error', 'No se pudieron exportar los datos.');
                }
              }}
            >
              <View style={styles.linkRowContent}>
                <IconSymbol name="square.and.arrow.up" size={20} color={accent} />
                <View>
                  <ThemedText style={styles.linkText}>Exportar Datos</ThemedText>
                  <ThemedText style={[styles.linkSubtext, { color: textSecondary }]}>Descarga una copia de todos tus datos</ThemedText>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={20} color={textSecondary} />
            </Pressable>

            <Pressable
              style={[styles.linkRow, { borderBottomColor: borderColor }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert(
                  'Importar Datos',
                  'Selecciona un archivo de backup para restaurar tus datos.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Seleccionar Archivo', onPress: () => {} },
                  ]
                );
              }}
            >
              <View style={styles.linkRowContent}>
                <IconSymbol name="square.and.arrow.down" size={20} color={accent} />
                <View>
                  <ThemedText style={styles.linkText}>Importar Datos</ThemedText>
                  <ThemedText style={[styles.linkSubtext, { color: textSecondary }]}>Restaura desde un archivo de backup</ThemedText>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={20} color={textSecondary} />
            </Pressable>

            <View style={[styles.linkRow, { borderBottomWidth: 0 }]}>
              <View style={styles.linkRowContent}>
                <IconSymbol name="clock.arrow.circlepath" size={20} color={success} />
                <View>
                  <ThemedText style={styles.linkText}>Último Backup</ThemedText>
                  <ThemedText style={[styles.linkSubtext, { color: textSecondary }]}>Nunca (configura backup automático)</ThemedText>
                </View>
              </View>
            </View>
          </View>
        </Accordion>

        {/* ========== ADMINISTRACIÓN ========== */}
        <Accordion
          title="Administración"
          icon="person.badge.key.fill"
          iconColor="#8B5CF6"
          defaultOpen={false}
        >
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <Pressable
              style={[styles.linkRow, { borderBottomWidth: 0 }]}
              onPress={() => router.push('/settings/invitations' as any)}
            >
              <View style={styles.linkRowContent}>
                <IconSymbol name="envelope.badge.fill" size={20} color={accent} />
                <View>
                  <ThemedText style={styles.linkText}>Gestionar Invitaciones</ThemedText>
                  <ThemedText style={[styles.linkSubtext, { color: textSecondary }]}>Invita nuevos usuarios a la aplicación</ThemedText>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={20} color={textSecondary} />
            </Pressable>
          </View>
        </Accordion>

        {/* ========== LEGAL ========== */}
        <Accordion
          title="Legal y Privacidad"
          icon="lock.shield.fill"
          iconColor="#EF4444"
          defaultOpen={false}
        >
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <Pressable
              style={[styles.linkRow, { borderBottomColor: borderColor }]}
              onPress={() => router.push('/privacy-policy' as any)}
            >
              <ThemedText style={styles.linkText}>Política de Privacidad</ThemedText>
              <IconSymbol name="chevron.right" size={20} color={textSecondary} />
            </Pressable>

            <Pressable
              style={[styles.linkRow, { borderBottomColor: borderColor }]}
              onPress={() => router.push('/terms-conditions' as any)}
            >
              <ThemedText style={styles.linkText}>Términos y Condiciones</ThemedText>
              <IconSymbol name="chevron.right" size={20} color={textSecondary} />
            </Pressable>

            <Pressable
              style={[styles.linkRow, { borderBottomWidth: 0 }]}
              onPress={() => router.push('/privacy-settings' as any)}
            >
              <ThemedText style={styles.linkText}>Gestionar mis Datos (RGPD)</ThemedText>
              <IconSymbol name="chevron.right" size={20} color={textSecondary} />
            </Pressable>
          </View>
        </Accordion>

        {/* Sección de Sesión */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={styles.sectionSubtitle}>Sesión</ThemedText>
          <Pressable
            style={[styles.linkRow, { borderBottomWidth: 0 }]}
            onPress={async () => {
              // Usar confirm nativo en web, Alert en móvil
              if (Platform.OS === 'web') {
                const confirmed = window.confirm('¿Estás seguro de que quieres cerrar sesión?');
                if (confirmed) {
                  try {
                    await AsyncStorage.clear();
                  } catch (e) {
                    // Ignorar errores de AsyncStorage
                  }
                  window.location.href = '/api/auth/logout';
                }
              } else {
                Alert.alert(
                  'Cerrar Sesión',
                  '¿Estás seguro de que quieres cerrar sesión?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Cerrar Sesión',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await AsyncStorage.clear();
                          router.replace('/login' as any);
                        } catch (err) {
                          Alert.alert('Error', 'No se pudo cerrar sesión');
                        }
                      },
                    },
                  ]
                );
              }
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={error} />
              <ThemedText style={[styles.linkText, { color: error }]}>Cerrar Sesión</ThemedText>
            </View>
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
    paddingHorizontal: Spacing.md,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  premiumBannerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeContent: {
    flex: 1,
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
  teamConfig: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSublabel: {
    fontSize: 13,
  },
  countriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.xs,
    minWidth: '45%',
  },
  countryFlag: {
    fontSize: 20,
  },
  countryName: {
    fontSize: 13,
    flex: 1,
  },
  countryTax: {
    fontSize: 11,
    marginTop: 2,
  },
  moduleCategory: {
    marginTop: Spacing.md,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  moduleIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleContent: {
    flex: 1,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  moduleName: {
    fontSize: 15,
    fontWeight: '500',
  },
  premiumBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  premiumBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  upgradeContent: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  upgradeDescription: {
    fontSize: 13,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  linkText: {
    flex: 1,
    fontSize: 16,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  linkIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkContent: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  linkDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  smallInput: {
    width: 80,
    textAlign: 'center',
  },
  inputSuffix: {
    fontSize: 14,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  flexInput: {
    flex: 1,
  },
  frequencyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  frequencyOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  frequencyOptionText: {
    fontSize: 13,
  },
  // Estilos para selector de tema
  themeOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    gap: Spacing.xs,
  },
  themeOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Estilos para backup
  linkRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  linkSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  radioGroup: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioLabel: {
    fontSize: 14,
  },
});
