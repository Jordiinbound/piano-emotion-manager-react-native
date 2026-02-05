/**
 * Configuración de Facturación Electrónica
 * Piano Emotion Manager
 * 
 * Configuración de sistemas de facturación electrónica por país
 */

import { useRouter, Stack } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Switch,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';

interface CountryConfig {
  code: string;
  name: string;
  flag: string;
  system: string;
  mandatory: boolean;
  mandatoryDate?: string;
  enabled: boolean;
  configured: boolean;
  fields: ConfigField[];
}

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'switch';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  value: string | boolean;
}

const COUNTRIES: CountryConfig[] = [
  {
    code: 'ES',
    name: 'España',
    flag: '🇪🇸',
    system: 'Veri*Factu / TicketBAI',
    mandatory: true,
    mandatoryDate: '1 enero 2026',
    enabled: false,
    configured: false,
    fields: [
      { key: 'nif', label: 'NIF/CIF', type: 'text', placeholder: 'B12345678', required: true, value: '' },
      { key: 'certificate', label: 'Certificado digital', type: 'text', placeholder: 'Ruta al certificado .p12', required: true, value: '' },
      { key: 'certificatePassword', label: 'Contraseña certificado', type: 'text', placeholder: '••••••••', required: true, value: '' },
      { key: 'environment', label: 'Entorno', type: 'select', options: [
        { value: 'sandbox', label: 'Pruebas (Sandbox)' },
        { value: 'production', label: 'Producción' },
      ], required: true, value: 'sandbox' },
      { key: 'ticketbai', label: 'Usar TicketBAI (País Vasco)', type: 'switch', value: false },
    ],
  },
  {
    code: 'IT',
    name: 'Italia',
    flag: '🇮🇹',
    system: 'SDI / FatturaPA',
    mandatory: true,
    mandatoryDate: 'Desde 2019',
    enabled: false,
    configured: false,
    fields: [
      { key: 'partitaIva', label: 'Partita IVA', type: 'text', placeholder: 'IT12345678901', required: true, value: '' },
      { key: 'codiceFiscale', label: 'Codice Fiscale', type: 'text', placeholder: 'RSSMRA85M01H501Z', required: true, value: '' },
      { key: 'codiceDestinatario', label: 'Codice Destinatario', type: 'text', placeholder: '0000000', required: true, value: '' },
      { key: 'pecEmail', label: 'Email PEC', type: 'text', placeholder: 'azienda@pec.it', value: '' },
      { key: 'regimeFiscale', label: 'Regime Fiscale', type: 'select', options: [
        { value: 'RF01', label: 'RF01 - Ordinario' },
        { value: 'RF02', label: 'RF02 - Contribuyentes mínimos' },
        { value: 'RF04', label: 'RF04 - Agricultura' },
        { value: 'RF19', label: 'RF19 - Forfettario' },
      ], required: true, value: 'RF01' },
      { key: 'environment', label: 'Entorno', type: 'select', options: [
        { value: 'sandbox', label: 'Pruebas (Sandbox)' },
        { value: 'production', label: 'Producción' },
      ], required: true, value: 'sandbox' },
    ],
  },
  {
    code: 'DE',
    name: 'Alemania',
    flag: '🇩🇪',
    system: 'ZUGFeRD / XRechnung',
    mandatory: true,
    mandatoryDate: '1 enero 2025',
    enabled: false,
    configured: false,
    fields: [
      { key: 'ustIdNr', label: 'USt-IdNr', type: 'text', placeholder: 'DE123456789', required: true, value: '' },
      { key: 'steuernummer', label: 'Steuernummer', type: 'text', placeholder: '12/345/67890', value: '' },
      { key: 'leitwegId', label: 'Leitweg-ID (B2G)', type: 'text', placeholder: '991-12345-67', value: '' },
      { key: 'profile', label: 'Perfil ZUGFeRD', type: 'select', options: [
        { value: 'BASIC', label: 'BASIC' },
        { value: 'EN16931', label: 'EN16931 (Comfort)' },
        { value: 'XRECHNUNG', label: 'XRechnung (B2G)' },
      ], required: true, value: 'EN16931' },
    ],
  },
  {
    code: 'FR',
    name: 'Francia',
    flag: '🇫🇷',
    system: 'Factur-X / Chorus Pro',
    mandatory: true,
    mandatoryDate: '1 sept 2026',
    enabled: false,
    configured: false,
    fields: [
      { key: 'siret', label: 'SIRET', type: 'text', placeholder: '12345678901234', required: true, value: '' },
      { key: 'tvaIntra', label: 'TVA Intracommunautaire', type: 'text', placeholder: 'FR12345678901', required: true, value: '' },
      { key: 'chorusProId', label: 'ID Chorus Pro (B2G)', type: 'text', placeholder: 'ID de la entidad', value: '' },
      { key: 'profile', label: 'Perfil Factur-X', type: 'select', options: [
        { value: 'MINIMUM', label: 'Minimum' },
        { value: 'BASIC', label: 'Basic' },
        { value: 'EN16931', label: 'EN16931' },
      ], required: true, value: 'EN16931' },
    ],
  },
  {
    code: 'PT',
    name: 'Portugal',
    flag: '🇵🇹',
    system: 'CIUS-PT / SAF-T',
    mandatory: true,
    mandatoryDate: 'Desde 2023',
    enabled: false,
    configured: false,
    fields: [
      { key: 'nif', label: 'NIF', type: 'text', placeholder: '123456789', required: true, value: '' },
      { key: 'atSoftwareCertId', label: 'ID Certificación AT', type: 'text', placeholder: '1234', required: true, value: '' },
      { key: 'atcudSeries', label: 'Serie ATCUD', type: 'text', placeholder: 'FT2024', required: true, value: '' },
      { key: 'privateKey', label: 'Clave privada RSA', type: 'text', placeholder: 'Ruta al archivo .pem', required: true, value: '' },
      { key: 'generateQR', label: 'Generar código QR', type: 'switch', value: true },
    ],
  },
  {
    code: 'DK',
    name: 'Dinamarca',
    flag: '🇩🇰',
    system: 'OIOUBL / NemHandel',
    mandatory: true,
    mandatoryDate: '1 enero 2026',
    enabled: false,
    configured: false,
    fields: [
      { key: 'cvr', label: 'CVR-nummer', type: 'text', placeholder: '12345678', required: true, value: '' },
      { key: 'ean', label: 'EAN/GLN', type: 'text', placeholder: '5790000000000', value: '' },
      { key: 'nemhandelId', label: 'NemHandel ID', type: 'text', placeholder: 'ID de registro', value: '' },
      { key: 'accessPoint', label: 'Access Point PEPPOL', type: 'select', options: [
        { value: 'none', label: 'Sin configurar' },
        { value: 'storecove', label: 'Storecove' },
        { value: 'pagero', label: 'Pagero' },
        { value: 'other', label: 'Otro' },
      ], value: 'none' },
    ],
  },
  {
    code: 'BE',
    name: 'Bélgica',
    flag: '🇧🇪',
    system: 'PEPPOL / Mercurius',
    mandatory: true,
    mandatoryDate: '1 enero 2026',
    enabled: false,
    configured: false,
    fields: [
      { key: 'bce', label: 'Numéro BCE', type: 'text', placeholder: '0123.456.789', required: true, value: '' },
      { key: 'tvaNumber', label: 'Numéro TVA', type: 'text', placeholder: 'BE0123456789', required: true, value: '' },
      { key: 'mercuriusId', label: 'ID Mercurius (B2G)', type: 'text', placeholder: 'ID de la entidad', value: '' },
      { key: 'accessPoint', label: 'Access Point PEPPOL', type: 'select', options: [
        { value: 'none', label: 'Sin configurar' },
        { value: 'storecove', label: 'Storecove' },
        { value: 'basware', label: 'Basware' },
        { value: 'other', label: 'Otro' },
      ], value: 'none' },
    ],
  },
  {
    code: 'GB',
    name: 'Reino Unido',
    flag: '🇬🇧',
    system: 'Making Tax Digital (MTD)',
    mandatory: true,
    mandatoryDate: 'Desde 2019',
    enabled: false,
    configured: false,
    fields: [
      { key: 'vrn', label: 'VAT Registration Number', type: 'text', placeholder: 'GB123456789', required: true, value: '' },
      { key: 'companyNumber', label: 'Company Number', type: 'text', placeholder: '12345678', value: '' },
      { key: 'hmrcClientId', label: 'HMRC Client ID', type: 'text', placeholder: 'ID de la aplicación', required: true, value: '' },
      { key: 'hmrcClientSecret', label: 'HMRC Client Secret', type: 'text', placeholder: '••••••••', required: true, value: '' },
      { key: 'environment', label: 'Entorno', type: 'select', options: [
        { value: 'sandbox', label: 'Pruebas (Sandbox)' },
        { value: 'production', label: 'Producción' },
      ], required: true, value: 'sandbox' },
    ],
  },
];

export default function EInvoicingSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [countries, setCountries] = useState<CountryConfig[]>(COUNTRIES);
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configValues, setConfigValues] = useState<Record<string, string | boolean>>({});

  const accent = useThemeColor({}, 'accent');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const error = useThemeColor({}, 'error');
  const textColor = useThemeColor({}, 'text');

  const handleCountryPress = (country: CountryConfig) => {
    setSelectedCountry(country);
    const values: Record<string, string | boolean> = {};
    country.fields.forEach(field => {
      values[field.key] = field.value;
    });
    setConfigValues(values);
    setShowConfigModal(true);
  };

  const handleToggleCountry = (countryCode: string, enabled: boolean) => {
    setCountries(prev => prev.map(c => 
      c.code === countryCode ? { ...c, enabled } : c
    ));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveConfig = () => {
    if (!selectedCountry) return;

    // Validar campos requeridos
    const missingFields = selectedCountry.fields
      .filter(f => f.required && !configValues[f.key])
      .map(f => f.label);

    if (missingFields.length > 0) {
      Alert.alert(
        'Campos requeridos',
        `Por favor completa los siguientes campos:\n\n• ${missingFields.join('\n• ')}`
      );
      return;
    }

    // Actualizar configuración
    setCountries(prev => prev.map(c => 
      c.code === selectedCountry.code 
        ? { 
            ...c, 
            configured: true, 
            enabled: true,
            fields: c.fields.map(f => ({ ...f, value: configValues[f.key] }))
          } 
        : c
    ));

    setShowConfigModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Guardado', `Configuración de ${selectedCountry.name} guardada correctamente.`);
  };

  const renderConfigField = (field: ConfigField) => {
    switch (field.type) {
      case 'text':
        return (
          <View key={field.key} style={styles.configField}>
            <ThemedText style={[styles.configLabel, { color: textSecondary }]}>
              {field.label} {field.required && '*'}
            </ThemedText>
            <TextInput
              style={[styles.configInput, { borderColor, color: textColor }]}
              placeholder={field.placeholder}
              placeholderTextColor={textSecondary}
              value={configValues[field.key] as string || ''}
              onChangeText={(v) => setConfigValues(prev => ({ ...prev, [field.key]: v }))}
              secureTextEntry={field.key.toLowerCase().includes('password') || field.key.toLowerCase().includes('secret')}
              autoCapitalize="none"
            />
          </View>
        );

      case 'select':
        return (
          <View key={field.key} style={styles.configField}>
            <ThemedText style={[styles.configLabel, { color: textSecondary }]}>
              {field.label} {field.required && '*'}
            </ThemedText>
            <View style={styles.selectOptions}>
              {field.options?.map(option => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.selectOption,
                    { borderColor },
                    configValues[field.key] === option.value && { borderColor: accent, backgroundColor: `${accent}10` },
                  ]}
                  onPress={() => setConfigValues(prev => ({ ...prev, [field.key]: option.value }))}
                >
                  <ThemedText style={[
                    styles.selectOptionText,
                    configValues[field.key] === option.value && { color: accent },
                  ]}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        );

      case 'switch':
        return (
          <View key={field.key} style={styles.configSwitchRow}>
            <ThemedText style={styles.configSwitchLabel}>{field.label}</ThemedText>
            <Switch
              value={configValues[field.key] as boolean || false}
              onValueChange={(v) => setConfigValues(prev => ({ ...prev, [field.key]: v }))}
              trackColor={{ false: borderColor, true: accent }}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Facturación Electrónica' }} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Información */}
        <View style={[styles.infoCard, { backgroundColor: `${accent}10`, borderColor: accent }]}>
          <IconSymbol name="info.circle.fill" size={20} color={accent} />
          <ThemedText style={[styles.infoText, { color: accent }]}>
            Configura los sistemas de facturación electrónica para cada país donde operes. 
            Algunos países requieren facturación electrónica obligatoria.
          </ThemedText>
        </View>

        {/* Lista de países */}
        {countries.map((country) => (
          <Pressable
            key={country.code}
            style={[styles.countryCard, { backgroundColor: cardBg, borderColor }]}
            onPress={() => handleCountryPress(country)}
          >
            <View style={styles.countryHeader}>
              <View style={styles.countryInfo}>
                <ThemedText style={styles.countryFlag}>{country.flag}</ThemedText>
                <View>
                  <ThemedText style={styles.countryName}>{country.name}</ThemedText>
                  <ThemedText style={[styles.countrySystem, { color: textSecondary }]}>
                    {country.system}
                  </ThemedText>
                </View>
              </View>
              <Switch
                value={country.enabled}
                onValueChange={(v) => handleToggleCountry(country.code, v)}
                trackColor={{ false: borderColor, true: accent }}
              />
            </View>

            <View style={styles.countryDetails}>
              {country.mandatory && (
                <View style={[styles.badge, { backgroundColor: `${error}15` }]}>
                  <ThemedText style={[styles.badgeText, { color: error }]}>
                    Obligatorio: {country.mandatoryDate}
                  </ThemedText>
                </View>
              )}
              <View style={[
                styles.badge,
                { backgroundColor: country.configured ? `${success}15` : `${warning}15` }
              ]}>
                <ThemedText style={[
                  styles.badgeText,
                  { color: country.configured ? success : warning }
                ]}>
                  {country.configured ? '✓ Configurado' : 'Sin configurar'}
                </ThemedText>
              </View>
            </View>

            <View style={styles.configureRow}>
              <ThemedText style={[styles.configureText, { color: accent }]}>
                Configurar →
              </ThemedText>
            </View>
          </Pressable>
        ))}

        {/* Documentación */}
        <View style={[styles.docsCard, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={styles.docsTitle}>Documentación Técnica</ThemedText>
          <ThemedText style={[styles.docsText, { color: textSecondary }]}>
            Consulta la guía técnica completa para la implementación de facturación electrónica 
            en cada país, incluyendo requisitos, formatos y certificaciones necesarias.
          </ThemedText>
          <Pressable
            style={[styles.docsButton, { borderColor: accent }]}
            onPress={() => Alert.alert('Documentación', 'La documentación técnica está disponible en docs/GUIA_TECNICA_IMPLEMENTACION_FACTURACION_ELECTRONICA.md')}
          >
            <IconSymbol name="doc.text.fill" size={16} color={accent} />
            <ThemedText style={[styles.docsButtonText, { color: accent }]}>
              Ver Documentación
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      {/* Modal de configuración */}
      <Modal
        visible={showConfigModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowConfigModal(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <Pressable onPress={() => setShowConfigModal(false)}>
              <ThemedText style={[styles.modalCancel, { color: error }]}>Cancelar</ThemedText>
            </Pressable>
            <ThemedText style={styles.modalTitle}>
              {selectedCountry?.flag} {selectedCountry?.name}
            </ThemedText>
            <Pressable onPress={handleSaveConfig}>
              <ThemedText style={[styles.modalSave, { color: accent }]}>Guardar</ThemedText>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.systemInfo, { backgroundColor: `${accent}10` }]}>
              <ThemedText style={[styles.systemLabel, { color: textSecondary }]}>Sistema</ThemedText>
              <ThemedText style={[styles.systemName, { color: accent }]}>
                {selectedCountry?.system}
              </ThemedText>
            </View>

            {selectedCountry?.fields.map(renderConfigField)}

            <View style={[styles.helpCard, { borderColor }]}>
              <IconSymbol name="questionmark.circle.fill" size={20} color={textSecondary} />
              <ThemedText style={[styles.helpText, { color: textSecondary }]}>
                ¿Necesitas ayuda con la configuración? Consulta la documentación técnica o 
                contacta con soporte.
              </ThemedText>
            </View>
          </ScrollView>
        </ThemedView>
      </Modal>
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
  infoCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  countryCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  countryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  countryFlag: {
    fontSize: 32,
  },
  countryName: {
    fontSize: 17,
    fontWeight: '600',
  },
  countrySystem: {
    fontSize: 13,
  },
  countryDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  configureRow: {
    alignItems: 'flex-end',
  },
  configureText: {
    fontSize: 14,
    fontWeight: '500',
  },
  docsCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  docsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  docsText: {
    fontSize: 13,
    lineHeight: 18,
  },
  docsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  docsButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  modalCancel: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: Spacing.md,
  },
  systemInfo: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  systemLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  systemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  configField: {
    marginBottom: Spacing.md,
  },
  configLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  configInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: 16,
  },
  selectOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  selectOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  selectOptionText: {
    fontSize: 14,
  },
  configSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  configSwitchLabel: {
    fontSize: 15,
  },
  helpCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    alignItems: 'flex-start',
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
