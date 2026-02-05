/**
 * Pantalla de Configuración Unificada con Diseño Moderno
 * Piano Emotion Manager
 * 
 * Centro de control único para todas las configuraciones de la aplicación
 * Accesible desde el drawer y el icono de cabecera
 */

import { useRouter, Stack } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { LanguageSelector } from '@/components/language-selector';

// ==================== TIPOS ====================
type TabId = 'general' | 'business' | 'billing' | 'modules' | 'notifications' | 'integrations' | 'advanced';
type BusinessMode = 'individual' | 'team';
type EInvoicingCountry = 'ES' | 'IT' | 'DE' | 'FR' | 'PT' | 'DK' | 'BE' | 'GB' | 'none';

interface AppSettings {
  businessMode: BusinessMode;
  organizationName?: string;
  businessName?: string;
  legalName?: string;
  taxId?: string;
  businessAddress?: string;
  businessCity?: string;
  businessPostalCode?: string;
  businessProvince?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessWebsite?: string;
  businessLogo?: string;
  bankAccount?: string;
  bankName?: string;
  eInvoicingEnabled: boolean;
  eInvoicingCountry: EInvoicingCountry;
  eInvoicingCredentials: Record<string, string>;
  activeModules: string[];
  defaultMinStock: number;
  stockAlertEmail: boolean;
  stockAlertWhatsApp: boolean;
  stockAlertFrequency: 'immediate' | 'daily' | 'weekly';
  stockAlertEmailAddress?: string;
  stockAlertPhone?: string;
  shopEnabled: boolean;
  externalStores: Array<{ name: string; url: string; apiKey?: string; platform?: string }>;
  purchaseApprovalThreshold: number;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  googleCalendarSync: boolean;
  outlookCalendarSync: boolean;
  aiRecommendationsEnabled: boolean;
  aiAssistantEnabled: boolean;
  fiscalCountry: 'ES' | 'DE' | 'FR' | 'IT' | 'PT' | 'GB' | 'MX' | 'AR' | 'CO' | 'CL';
  emailClientPreference: 'gmail' | 'outlook' | 'default';
}

// ==================== CONSTANTES ====================
const defaultSettings: AppSettings = {
  businessMode: 'individual',
  eInvoicingEnabled: false,
  eInvoicingCountry: 'none',
  eInvoicingCredentials: {},
  activeModules: ['clients', 'pianos', 'services', 'calendar', 'invoicing'],
  defaultMinStock: 5,
  stockAlertEmail: false,
  stockAlertWhatsApp: false,
  stockAlertFrequency: 'immediate',
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

const TABS = [
  { id: 'general' as TabId, label: 'General', icon: 'gearshape.fill' },
  { id: 'business' as TabId, label: 'Negocio', icon: 'building.2.fill' },
  { id: 'billing' as TabId, label: 'Facturación', icon: 'doc.text.fill' },
  { id: 'modules' as TabId, label: 'Módulos', icon: 'square.grid.2x2.fill' },
  { id: 'notifications' as TabId, label: 'Notificaciones', icon: 'bell.fill' },
  { id: 'integrations' as TabId, label: 'Integraciones', icon: 'link' },
  { id: 'advanced' as TabId, label: 'Avanzado', icon: 'slider.horizontal.3' },
];

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

const ECOMMERCE_PLATFORMS = [
  { id: 'shopify', name: 'Shopify', icon: 'bag.fill', color: '#96BF48' },
  { id: 'woocommerce', name: 'WooCommerce', icon: 'cart.fill', color: '#96588A' },
  { id: 'prestashop', name: 'PrestaShop', icon: 'storefront', color: '#DF0067' },
  { id: 'magento', name: 'Magento', icon: 'cube.fill', color: '#EE672F' },
  { id: 'custom', name: 'Personalizada', icon: 'link', color: '#6B7280' },
];

// ==================== COMPONENTE PRINCIPAL ====================
export default function SettingsUnifiedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const accent = useThemeColor({}, 'accent');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textColor = useThemeColor({}, 'text');
  const background = useThemeColor({}, 'background');

  // Estilos dinámicos basados en ancho de pantalla
  const dynamicStyles = useMemo(() => ({
    header: {
      paddingHorizontal: width > 600 ? Spacing.lg : Spacing.md,
    },
    headerTitle: {
      fontSize: width > 600 ? 28 : 24,
    },
    tabsContent: {
      paddingHorizontal: width > 600 ? Spacing.lg : Spacing.sm,
    },
    contentContainer: {
      paddingTop: 0,
      paddingBottom: 0,
    },
    optionsRow: {
      flexDirection: width > 600 ? 'row' as const : 'column' as const,
    },
    formRow: {
      flexDirection: width > 600 ? 'row' as const : 'column' as const,
    },
    moduleCard: {
      width: width > 768 ? '31%' : '48%',
    },
    tabText: {
      fontSize: width > 600 ? 15 : 12,
    },
    tab: {
      paddingHorizontal: width > 600 ? Spacing.md : Spacing.xs,
    },
  }), [width]);

  // Cargar configuración guardada
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem('userSettings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings) as Partial<AppSettings>;
          setSettings(prev => ({ ...prev, ...parsed }));
        }
        
        try {
          const response = await fetch('/api/user/settings');
          if (response.ok) {
            const apiSettings = await response.json();
            if (apiSettings) {
              const mergedSettings = { ...defaultSettings, ...apiSettings };
              setSettings(mergedSettings);
              await AsyncStorage.setItem('userSettings', JSON.stringify(mergedSettings));
            }
          }
        } catch (apiError) {
          // Usar datos locales
        }
      } catch (err) {
        // Usar configuración por defecto
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
      await AsyncStorage.setItem('userSettings', JSON.stringify(settings));
      
      try {
        await fetch('/api/user/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        });
      } catch (apiError) {
        // Continuar aunque falle la API
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Guardado', 'La configuración se ha guardado correctamente.');
      setHasChanges(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la configuración.');
    }
  };

  const renderSettingRow = (
    icon: string,
    label: string,
    sublabel: string,
    value: boolean,
    onToggle: () => void,
    iconColor: string = accent
  ) => (
    <View style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: `${iconColor}15` }]}>
        <IconSymbol name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <ThemedText style={styles.settingLabel}>{label}</ThemedText>
        <ThemedText style={[styles.settingSublabel, { color: textSecondary }]}>
          {sublabel}
        </ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: borderColor, true: `${accent}80` }}
        thumbColor={value ? accent : '#f4f3f4'}
      />
    </View>
  );


  // ==================== RENDER PRINCIPAL ====================
  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header con búsqueda */}
      <View style={[styles.header, dynamicStyles.header, { paddingTop: insets.top + Spacing.md, backgroundColor: background }]}>
        <View style={styles.headerRow}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={24} color={accent} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, dynamicStyles.headerTitle]}>Configuración</ThemedText>
        </View>
        
        <View style={[styles.searchBar, { backgroundColor: cardBg, borderColor }]}>
          <IconSymbol name="magnifyingglass" size={18} color={textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Buscar configuración..."
            placeholderTextColor={textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Tabs horizontales */}
      {width <= 1000 ? (
        // Dos filas para móvil y tablet pequeña
        <View style={[styles.tabsContainer, { borderBottomColor: borderColor }]}>
          <View style={styles.tabsGrid}>
            {TABS.map((tab) => (
              <Pressable
                key={tab.id}
                style={[
                  styles.tab,
                  dynamicStyles.tab,
                  styles.tabGridItem,
                  activeTab === tab.id && styles.tabActive,
                ]}
                onPress={() => {
                  setActiveTab(tab.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <ThemedText
                  style={[
                    styles.tabText,
                    dynamicStyles.tabText,
                    activeTab === tab.id && { color: accent, fontFamily: 'Montserrat-SemiBold' },
                  ]}
                >
                  {tab.label}
                </ThemedText>
                {activeTab === tab.id && (
                  <View style={[styles.tabIndicator, { backgroundColor: accent }]} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        // Scroll horizontal para desktop
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.tabsContainer, { borderBottomColor: borderColor }]}
          contentContainerStyle={[styles.tabsContent, dynamicStyles.tabsContent]}
        >
          {TABS.map((tab) => (
            <Pressable
              key={tab.id}
              style={[
                styles.tab,
                dynamicStyles.tab,
                activeTab === tab.id && styles.tabActive,
              ]}
              onPress={() => {
                setActiveTab(tab.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  dynamicStyles.tabText,
                  activeTab === tab.id && { color: accent, fontFamily: 'Montserrat-SemiBold' },
                ]}
              >
                {tab.label}
              </ThemedText>
              {activeTab === tab.id && (
                <View style={[styles.tabIndicator, { backgroundColor: accent }]} />
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Contenido del tab activo */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, dynamicStyles.contentContainer, { paddingBottom: insets.bottom + 80 }]}
      >
        {activeTab === 'general' && renderGeneralTab()}
        {activeTab === 'business' && renderBusinessTab()}
        {activeTab === 'billing' && renderBillingTab()}
        {activeTab === 'modules' && renderModulesTab()}
        {activeTab === 'notifications' && renderNotificationsTab()}
        {activeTab === 'integrations' && renderIntegrationsTab()}
        {activeTab === 'advanced' && renderAdvancedTab()}
      </ScrollView>

      {/* Botón guardar flotante */}
      {hasChanges && (
        <View style={[styles.saveButtonContainer, { paddingBottom: insets.bottom }]}>
          <Pressable
            style={[styles.saveButton, { backgroundColor: accent }]}
            onPress={saveSettings}
          >
            <IconSymbol name="checkmark.circle.fill" size={20} color="#FFFFFF" />
            <ThemedText style={styles.saveButtonText}>Guardar cambios</ThemedText>
          </Pressable>
        </View>
      )}
    </ThemedView>
  );

  // ==================== TAB: GENERAL ====================
  function renderGeneralTab() {
    return (
      <View style={{ paddingTop: Spacing.md, paddingHorizontal: Spacing.md }}>
        <ThemedText style={styles.sectionTitle}>Preferencias Generales</ThemedText>
        
        {/* Idioma */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: `${accent}15` }]}>
              <IconSymbol name="globe" size={24} color={accent} />
            </View>
            <View style={styles.cardHeaderText}>
              <ThemedText style={styles.cardTitle}>Idioma</ThemedText>
              <ThemedText style={[styles.cardSubtitle, { color: textSecondary }]}>
                Selecciona tu idioma preferido
              </ThemedText>
            </View>
          </View>
          <LanguageSelector />
        </View>

        {/* Notificaciones generales */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          {renderSettingRow(
            'bell.fill',
            'Notificaciones',
            'Activar o desactivar todas las notificaciones',
            settings.notificationsEnabled,
            () => updateSettings({ notificationsEnabled: !settings.notificationsEnabled })
          )}
        </View>

        {/* Preferencias de comunicación */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: `${accent}15` }]}>
              <IconSymbol name="envelope.fill" size={24} color={accent} />
            </View>
            <View style={styles.cardHeaderText}>
              <ThemedText style={styles.cardTitle}>Cliente de Email Preferido</ThemedText>
              <ThemedText style={[styles.cardSubtitle, { color: textSecondary }]}>
                Selecciona tu cliente de email por defecto
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.optionsRow}>
            {[
              { value: 'gmail', label: 'Gmail', icon: 'envelope.fill' },
              { value: 'outlook', label: 'Outlook', icon: 'envelope.fill' },
              { value: 'default', label: 'Sistema', icon: 'gearshape.fill' },
            ].map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.optionButton,
                  { borderColor },
                  settings.emailClientPreference === option.value && {
                    borderColor: accent,
                    backgroundColor: `${accent}15`,
                  },
                ]}
                onPress={() => updateSettings({ emailClientPreference: option.value as any })}
              >
                <IconSymbol
                  name={option.icon as any}
                  size={20}
                  color={settings.emailClientPreference === option.value ? accent : textSecondary}
                />
                <ThemedText
                  style={[
                    styles.optionButtonText,
                    settings.emailClientPreference === option.value && { color: accent, fontWeight: '600' },
                  ]}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    );
  }

  // ==================== TAB: NEGOCIO ====================
  function renderBusinessTab() {
    return (
      <View style={{ paddingTop: Spacing.md, paddingHorizontal: Spacing.md }}>
        <ThemedText style={styles.sectionTitle}>Información del Negocio</ThemedText>
        
        {/* Modo de negocio */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: `${accent}15` }]}>
              <IconSymbol name="building.2.fill" size={24} color={accent} />
            </View>
            <View style={styles.cardHeaderText}>
              <ThemedText style={styles.cardTitle}>Modo de Negocio</ThemedText>
              <ThemedText style={[styles.cardSubtitle, { color: textSecondary }]}>
                ¿Trabajas solo o en equipo?
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.optionsRow}>
            <Pressable
              style={[
                styles.optionButton,
                { borderColor },
                settings.businessMode === 'individual' && {
                  borderColor: accent,
                  backgroundColor: `${accent}15`,
                },
              ]}
              onPress={() => updateSettings({ businessMode: 'individual' })}
            >
              <IconSymbol
                name="person.fill"
                size={20}
                color={settings.businessMode === 'individual' ? accent : textSecondary}
              />
              <ThemedText
                style={[
                  styles.optionButtonText,
                  settings.businessMode === 'individual' && { color: accent, fontWeight: '600' },
                ]}
              >
                Individual
              </ThemedText>
            </Pressable>
            
            <Pressable
              style={[
                styles.optionButton,
                { borderColor },
                settings.businessMode === 'team' && {
                  borderColor: accent,
                  backgroundColor: `${accent}15`,
                },
              ]}
              onPress={() => updateSettings({ businessMode: 'team' })}
            >
              <IconSymbol
                name="person.3.fill"
                size={20}
                color={settings.businessMode === 'team' ? accent : textSecondary}
              />
              <ThemedText
                style={[
                  styles.optionButtonText,
                  settings.businessMode === 'team' && { color: accent, fontWeight: '600' },
                ]}
              >
                Equipo
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Datos fiscales */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: `${accent}15` }]}>
              <IconSymbol name="doc.text.fill" size={24} color={accent} />
            </View>
            <View style={styles.cardHeaderText}>
              <ThemedText style={styles.cardTitle}>Datos Fiscales</ThemedText>
              <ThemedText style={[styles.cardSubtitle, { color: textSecondary }]}>
                Información de tu empresa
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <ThemedText style={[styles.inputLabel, { color: textSecondary }]}>Nombre Comercial</ThemedText>
            <TextInput
              style={[styles.input, { borderColor, color: textColor, backgroundColor: background }]}
              placeholder="Mi Empresa S.L."
              placeholderTextColor={textSecondary}
              value={settings.businessName}
              onChangeText={(text) => updateSettings({ businessName: text })}
            />
          </View>
          
          <View style={styles.formGroup}>
            <ThemedText style={[styles.inputLabel, { color: textSecondary }]}>Razón Social</ThemedText>
            <TextInput
              style={[styles.input, { borderColor, color: textColor, backgroundColor: background }]}
              placeholder="Mi Empresa Sociedad Limitada"
              placeholderTextColor={textSecondary}
              value={settings.legalName}
              onChangeText={(text) => updateSettings({ legalName: text })}
            />
          </View>
          
          <View style={styles.formGroup}>
            <ThemedText style={[styles.inputLabel, { color: textSecondary }]}>NIF/CIF</ThemedText>
            <TextInput
              style={[styles.input, { borderColor, color: textColor, backgroundColor: background }]}
              placeholder="B12345678"
              placeholderTextColor={textSecondary}
              value={settings.taxId}
              onChangeText={(text) => updateSettings({ taxId: text })}
              autoCapitalize="characters"
            />
          </View>
          
          <View style={styles.formGroup}>
            <ThemedText style={[styles.inputLabel, { color: textSecondary }]}>Dirección Fiscal</ThemedText>
            <TextInput
              style={[styles.input, { borderColor, color: textColor, backgroundColor: background }]}
              placeholder="Calle Principal 123"
              placeholderTextColor={textSecondary}
              value={settings.businessAddress}
              onChangeText={(text) => updateSettings({ businessAddress: text })}
            />
          </View>
          
          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 2 }]}>
              <ThemedText style={[styles.inputLabel, { color: textSecondary }]}>Ciudad</ThemedText>
              <TextInput
                style={[styles.input, { borderColor, color: textColor, backgroundColor: background }]}
                placeholder="Madrid"
                placeholderTextColor={textSecondary}
                value={settings.businessCity}
                onChangeText={(text) => updateSettings({ businessCity: text })}
              />
            </View>
            
            <View style={[styles.formGroup, { flex: 1 }]}>
              <ThemedText style={[styles.inputLabel, { color: textSecondary }]}>C.P.</ThemedText>
              <TextInput
                style={[styles.input, { borderColor, color: textColor, backgroundColor: background }]}
                placeholder="28001"
                placeholderTextColor={textSecondary}
                value={settings.businessPostalCode}
                onChangeText={(text) => updateSettings({ businessPostalCode: text })}
                keyboardType="numeric"
              />
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <ThemedText style={[styles.inputLabel, { color: textSecondary }]}>Email de Contacto</ThemedText>
            <TextInput
              style={[styles.input, { borderColor, color: textColor, backgroundColor: background }]}
              placeholder="contacto@miempresa.com"
              placeholderTextColor={textSecondary}
              value={settings.businessEmail}
              onChangeText={(text) => updateSettings({ businessEmail: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.formGroup}>
            <ThemedText style={[styles.inputLabel, { color: textSecondary }]}>Teléfono</ThemedText>
            <TextInput
              style={[styles.input, { borderColor, color: textColor, backgroundColor: background }]}
              placeholder="+34 900 000 000"
              placeholderTextColor={textSecondary}
              value={settings.businessPhone}
              onChangeText={(text) => updateSettings({ businessPhone: text })}
              keyboardType="phone-pad"
            />
          </View>
        </View>
      </View>
    );
  }

  // ==================== TAB: FACTURACIÓN ====================
  function renderBillingTab() {
    return (
      <View style={{ paddingTop: Spacing.md, paddingHorizontal: Spacing.md }}>
        <ThemedText style={styles.sectionTitle}>Facturación y Contabilidad</ThemedText>
        
        {/* País fiscal */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: `${accent}15` }]}>
              <IconSymbol name="globe.europe.africa.fill" size={24} color={accent} />
            </View>
            <View style={styles.cardHeaderText}>
              <ThemedText style={styles.cardTitle}>País Fiscal</ThemedText>
              <ThemedText style={[styles.cardSubtitle, { color: textSecondary }]}>
                Selecciona tu país para impuestos
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.countriesGrid}>
            {FISCAL_COUNTRIES.map((country) => (
              <Pressable
                key={country.code}
                style={[
                  styles.countryOption,
                  { borderColor },
                  settings.fiscalCountry === country.code && {
                    borderColor: accent,
                    backgroundColor: `${accent}10`,
                  },
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
        </View>

        {/* Facturación electrónica */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: `${accent}15` }]}>
              <IconSymbol name="doc.badge.ellipsis" size={24} color={accent} />
            </View>
            <View style={styles.cardHeaderText}>
              <ThemedText style={styles.cardTitle}>Facturación Electrónica</ThemedText>
              <ThemedText style={[styles.cardSubtitle, { color: textSecondary }]}>
                Cumplimiento normativo por país
              </ThemedText>
            </View>
          </View>
          
          {renderSettingRow(
            'doc.badge.ellipsis',
            'Activar Facturación Electrónica',
            'Genera facturas según normativa local',
            settings.eInvoicingEnabled,
            () => updateSettings({ eInvoicingEnabled: !settings.eInvoicingEnabled })
          )}
          
          {settings.eInvoicingEnabled && (
            <View style={{ marginTop: Spacing.md }}>
              <ThemedText style={[styles.inputLabel, { color: textSecondary }]}>
                Selecciona tu país
              </ThemedText>
              {EINVOICING_COUNTRIES.map((country) => (
                <Pressable
                  key={country.code}
                  style={[
                    styles.countryOption,
                    { borderColor, marginBottom: Spacing.xs },
                    settings.eInvoicingCountry === country.code && {
                      borderColor: accent,
                      backgroundColor: `${accent}10`,
                    },
                  ]}
                  onPress={() => updateSettings({ eInvoicingCountry: country.code as any })}
                >
                  <ThemedText style={styles.countryFlag}>{country.flag}</ThemedText>
                  <ThemedText style={{ flex: 1 }}>{country.name}</ThemedText>
                  {settings.eInvoicingCountry === country.code && (
                    <IconSymbol name="checkmark.circle.fill" size={16} color={accent} />
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Inventario */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: `${accent}15` }]}>
              <IconSymbol name="shippingbox.fill" size={24} color={accent} />
            </View>
            <View style={styles.cardHeaderText}>
              <ThemedText style={styles.cardTitle}>Inventario</ThemedText>
              <ThemedText style={[styles.cardSubtitle, { color: textSecondary }]}>
                Gestión de stock y alertas
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <ThemedText style={[styles.inputLabel, { color: textSecondary }]}>
              Umbral de Stock Bajo
            </ThemedText>
            <View style={styles.inputWithSuffix}>
              <TextInput
                style={[styles.input, styles.inputSmall, { borderColor, color: textColor, backgroundColor: background }]}
                placeholder="5"
                placeholderTextColor={textSecondary}
                keyboardType="numeric"
                value={settings.defaultMinStock.toString()}
                onChangeText={(text) => updateSettings({ defaultMinStock: parseInt(text) || 0 })}
              />
              <ThemedText style={[styles.inputSuffix, { color: textSecondary }]}>unidades</ThemedText>
            </View>
          </View>
          
          {renderSettingRow(
            'envelope.fill',
            'Alertas por Email',
            'Recibe notificaciones cuando el stock esté bajo',
            settings.stockAlertEmail,
            () => updateSettings({ stockAlertEmail: !settings.stockAlertEmail })
          )}
          
          {settings.stockAlertEmail && (
            <View style={[styles.formGroup, { marginLeft: 56 }]}>
              <TextInput
                style={[styles.input, { borderColor, color: textColor, backgroundColor: background }]}
                placeholder="tu@email.com"
                placeholderTextColor={textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={settings.stockAlertEmailAddress}
                onChangeText={(text) => updateSettings({ stockAlertEmailAddress: text })}
              />
            </View>
          )}
        </View>
      </View>
    );
  }


  // ==================== TAB: MÓDULOS ====================
  function renderModulesTab() {
    return (
      <View style={{ paddingTop: Spacing.md, paddingHorizontal: Spacing.md }}>
        <ThemedText style={styles.sectionTitle}>Módulos Activos</ThemedText>
        <ThemedText style={[styles.sectionSubtitle, { color: textSecondary }]}>
          Activa o desactiva funcionalidades según tus necesidades
        </ThemedText>
        
        <View style={styles.modulesGrid}>
          {ALL_MODULES.map((module) => {
            const isActive = settings.activeModules.includes(module.code);
            return (
              <View
                key={module.code}
                style={[
                  styles.moduleCard,
                  { backgroundColor: cardBg, borderColor },
                  isActive && { borderColor: accent, backgroundColor: `${accent}05` },
                ]}
              >
                <View style={styles.moduleHeader}>
                  <View style={[styles.moduleIcon, { backgroundColor: `${accent}15` }]}>
                    <IconSymbol name={module.icon as any} size={24} color={accent} />
                  </View>
                  <Switch
                    value={isActive}
                    onValueChange={() => {
                      const newModules = isActive
                        ? settings.activeModules.filter(m => m !== module.code)
                        : [...settings.activeModules, module.code];
                      updateSettings({ activeModules: newModules });
                    }}
                    trackColor={{ false: borderColor, true: `${accent}80` }}
                    thumbColor={isActive ? accent : '#f4f3f4'}
                    disabled={module.premium}
                  />
                </View>
                
                <ThemedText style={styles.moduleName}>{module.name}</ThemedText>
                
                {module.premium && (
                  <View style={[styles.premiumBadge, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B' }]}>
                    <IconSymbol name="star.fill" size={12} color="#F59E0B" />
                    <ThemedText style={[styles.premiumBadgeText, { color: '#F59E0B' }]}>
                      PREMIUM
                    </ThemedText>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // ==================== TAB: NOTIFICACIONES ====================
  function renderNotificationsTab() {
    return (
      <View style={{ paddingTop: Spacing.md, paddingHorizontal: Spacing.md }}>
        <ThemedText style={styles.sectionTitle}>Preferencias de Notificaciones</ThemedText>
        
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          {renderSettingRow(
            'envelope.fill',
            'Notificaciones por Email',
            'Recibe actualizaciones importantes por correo',
            settings.emailNotifications,
            () => updateSettings({ emailNotifications: !settings.emailNotifications })
          )}
          
          {renderSettingRow(
            'message.fill',
            'Notificaciones por SMS',
            'Recibe alertas urgentes por mensaje de texto',
            settings.smsNotifications,
            () => updateSettings({ smsNotifications: !settings.smsNotifications })
          )}
          
          {renderSettingRow(
            'bell.badge.fill',
            'Notificaciones Push',
            'Recibe notificaciones en tiempo real',
            settings.pushNotifications,
            () => updateSettings({ pushNotifications: !settings.pushNotifications })
          )}
        </View>
      </View>
    );
  }

  // ==================== TAB: INTEGRACIONES ====================
  function renderIntegrationsTab() {
    return (
      <View style={{ paddingTop: Spacing.md, paddingHorizontal: Spacing.md }}>
        <ThemedText style={styles.sectionTitle}>Integraciones</ThemedText>
        
        {/* Calendario */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: `${accent}15` }]}>
              <IconSymbol name="calendar" size={24} color={accent} />
            </View>
            <View style={styles.cardHeaderText}>
              <ThemedText style={styles.cardTitle}>Calendario</ThemedText>
              <ThemedText style={[styles.cardSubtitle, { color: textSecondary }]}>
                Sincroniza con tu calendario
              </ThemedText>
            </View>
          </View>
          
          {renderSettingRow(
            'envelope.fill',
            'Google Calendar',
            'Sincroniza eventos con Google Calendar',
            settings.googleCalendarSync,
            () => updateSettings({ googleCalendarSync: !settings.googleCalendarSync })
          )}
          
          {renderSettingRow(
            'envelope.badge.fill',
            'Outlook Calendar',
            'Sincroniza eventos con Outlook',
            settings.outlookCalendarSync,
            () => updateSettings({ outlookCalendarSync: !settings.outlookCalendarSync })
          )}
        </View>

        {/* E-commerce */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: `${accent}15` }]}>
              <IconSymbol name="cart.fill" size={24} color={accent} />
            </View>
            <View style={styles.cardHeaderText}>
              <ThemedText style={styles.cardTitle}>Tiendas E-commerce</ThemedText>
              <ThemedText style={[styles.cardSubtitle, { color: textSecondary }]}>
                Conecta tus tiendas online
              </ThemedText>
            </View>
          </View>
          
          {renderSettingRow(
            'cart.fill',
            'Activar Tienda',
            'Acceso a tiendas de distribuidores',
            settings.shopEnabled,
            () => updateSettings({ shopEnabled: !settings.shopEnabled })
          )}
          
          {settings.shopEnabled && (
            <>
              <View style={[styles.divider, { backgroundColor: borderColor, marginVertical: Spacing.md }]} />
              
              <ThemedText style={[styles.inputLabel, { color: textSecondary, marginBottom: Spacing.sm }]}>
                Plataformas Disponibles
              </ThemedText>
              
              {ECOMMERCE_PLATFORMS.map((platform) => {
                const isConnected = settings.externalStores.some(s => s.platform === platform.id);
                return (
                  <View
                    key={platform.id}
                    style={[
                      styles.platformRow,
                      { borderColor },
                      isConnected && { borderColor: accent, backgroundColor: `${accent}05` },
                    ]}
                  >
                    <View style={[styles.platformIcon, { backgroundColor: `${platform.color}15` }]}>
                      <IconSymbol name={platform.icon as any} size={20} color={platform.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.platformName}>{platform.name}</ThemedText>
                      {isConnected && (
                        <ThemedText style={[styles.platformStatus, { color: accent }]}>
                          Conectado
                        </ThemedText>
                      )}
                    </View>
                    <Pressable
                      style={[
                        styles.platformButton,
                        { borderColor: accent },
                        isConnected && { backgroundColor: accent },
                      ]}
                      onPress={() => {
                        if (isConnected) {
                          // Desconectar
                          const newStores = settings.externalStores.filter(s => s.platform !== platform.id);
                          updateSettings({ externalStores: newStores });
                        } else {
                          // Conectar (mostrar diálogo)
                          Alert.alert(
                            `Conectar ${platform.name}`,
                            'Ingresa la URL de tu tienda y API key',
                            [
                              { text: 'Cancelar', style: 'cancel' },
                              {
                                text: 'Conectar',
                                onPress: () => {
                                  const newStore = {
                                    name: platform.name,
                                    url: '',
                                    apiKey: '',
                                    platform: platform.id,
                                  };
                                  updateSettings({
                                    externalStores: [...settings.externalStores, newStore],
                                  });
                                },
                              },
                            ]
                          );
                        }
                      }}
                    >
                      <ThemedText
                        style={[
                          styles.platformButtonText,
                          isConnected && { color: '#FFFFFF' },
                        ]}
                      >
                        {isConnected ? 'Desconectar' : 'Conectar'}
                      </ThemedText>
                    </Pressable>
                  </View>
                );
              })}
            </>
          )}
        </View>

        {/* IA */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: `${accent}15` }]}>
              <IconSymbol name="brain" size={24} color={accent} />
            </View>
            <View style={styles.cardHeaderText}>
              <ThemedText style={styles.cardTitle}>Inteligencia Artificial</ThemedText>
              <ThemedText style={[styles.cardSubtitle, { color: textSecondary }]}>
                Funciones impulsadas por IA
              </ThemedText>
            </View>
          </View>
          
          {renderSettingRow(
            'brain',
            'Asistente IA',
            'Asistente virtual flotante para ayudarte en tus tareas',
            settings.aiAssistantEnabled,
            () => updateSettings({ aiAssistantEnabled: !settings.aiAssistantEnabled })
          )}
        </View>
      </View>
    );
  }

  // ==================== TAB: AVANZADO ====================
  function renderAdvancedTab() {
    return (
      <View style={{ paddingTop: Spacing.md, paddingHorizontal: Spacing.md }}>
        <ThemedText style={styles.sectionTitle}>Configuración Avanzada</ThemedText>
        
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Pressable
            style={styles.actionRow}
            onPress={() => {
              Alert.alert(
                'Exportar Datos',
                '¿Deseas exportar todos tus datos?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Exportar', onPress: () => {} },
                ]
              );
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${accent}15` }]}>
              <IconSymbol name="square.and.arrow.up.fill" size={20} color={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.actionLabel}>Exportar Datos</ThemedText>
              <ThemedText style={[styles.actionSublabel, { color: textSecondary }]}>
                Descarga una copia de todos tus datos
              </ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={16} color={textSecondary} />
          </Pressable>
          
          <View style={[styles.divider, { backgroundColor: borderColor }]} />
          
          <Pressable
            style={styles.actionRow}
            onPress={() => {
              Alert.alert(
                'Eliminar Cuenta',
                'Esta acción es irreversible. ¿Estás seguro?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => {},
                  },
                ]
              );
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#EF444415' }]}>
              <IconSymbol name="trash.fill" size={20} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.actionLabel, { color: '#EF4444' }]}>
                Eliminar Cuenta
              </ThemedText>
              <ThemedText style={[styles.actionSublabel, { color: textSecondary }]}>
                Elimina permanentemente tu cuenta y datos
              </ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={16} color={textSecondary} />
          </Pressable>
        </View>
      </View>
    );
  }
}

// ==================== ESTILOS ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  backButton: {
    marginRight: Spacing.sm,
    padding: Spacing.xs,
  },
  headerTitle: {
    fontFamily: 'Montserrat-Bold',
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Montserrat-Regular',
  },
  tabsContainer: {
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: 1,
  },
  tabsContent: {
    gap: Spacing.sm,
  },
  tabsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  tab: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    position: 'relative',
  },
  tabGridItem: {
    minWidth: '30%',
    maxWidth: '32%',
    alignItems: 'center',
  },
  tabActive: {},
  tabText: {
    fontSize: 15,
    fontFamily: 'Montserrat-Regular',
    color: '#6B7280',
  },
  tabIndicator: {
    marginTop: 2,
    height: 3,
    borderRadius: 3,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    // paddingTop controlado por dynamicStyles
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Montserrat-Bold',
    marginBottom: Spacing.sm,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
    marginBottom: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    marginHorizontal: Spacing.md,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat-SemiBold',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: 'Montserrat-Regular',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: 'Montserrat-SemiBold',
    marginBottom: 2,
  },
  settingSublabel: {
    fontSize: 13,
    fontFamily: 'Montserrat-Regular',
  },
  optionsRow: {
    gap: Spacing.sm,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  optionButtonText: {
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
  },
  formGroup: {
    marginBottom: Spacing.md,
  },
  formRow: {
    gap: Spacing.sm,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Montserrat-SemiBold',
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    fontFamily: 'Montserrat-Regular',
  },
  inputSmall: {
    width: 80,
  },
  inputWithSuffix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inputSuffix: {
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
  },
  countriesGrid: {
    gap: Spacing.sm,
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  countryFlag: {
    fontSize: 24,
  },
  countryName: {
    fontSize: 15,
    fontFamily: 'Montserrat-SemiBold',
  },
  countryTax: {
    fontSize: 12,
    fontFamily: 'Montserrat-Regular',
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  moduleCard: {
    minWidth: 150,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  moduleIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleName: {
    fontSize: 14,
    fontFamily: 'Montserrat-SemiBold',
    marginBottom: Spacing.xs,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  premiumBadgeText: {
    fontSize: 10,
    fontFamily: 'Montserrat-Bold',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  platformIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformName: {
    fontSize: 15,
    fontFamily: 'Montserrat-SemiBold',
  },
  platformStatus: {
    fontSize: 12,
    fontFamily: 'Montserrat-Regular',
  },
  platformButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  platformButtonText: {
    fontSize: 13,
    fontFamily: 'Montserrat-SemiBold',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 15,
    fontFamily: 'Montserrat-SemiBold',
    marginBottom: 2,
  },
  actionSublabel: {
    fontSize: 13,
    fontFamily: 'Montserrat-Regular',
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Montserrat-SemiBold',
    color: '#FFFFFF',
  },
});
