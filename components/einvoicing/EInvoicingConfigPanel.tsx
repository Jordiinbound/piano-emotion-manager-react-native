/**
 * Panel de Configuración de Facturación Electrónica Multi-País
 * Piano Emotion Manager
 * 
 * Versión compatible con React Native
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/hooks/use-translation';

// Tipos
export type SupportedCountry = 'ES' | 'IT' | 'DE' | 'FR' | 'PT' | 'DK' | 'BE' | 'GB';

export interface CountryConfig {
  enabled: boolean;
  environment: 'test' | 'production';
  verifactu?: { certificatePath?: string; certificatePassword?: string };
  sdi?: { codiceDestinatario?: string; pecDestinatario?: string; regimeFiscale?: string };
  zugferd?: { profile?: string; leitwegId?: string };
  facturx?: { siret?: string; profile?: string; chorusProEnabled?: boolean };
  ciuspt?: { atSoftwareCertificateNumber?: string; serieDocumento?: string };
  oioubl?: { cvr?: string; ean?: string; nemhandelEnabled?: boolean };
  peppol?: { enterpriseNumber?: string; accessPointId?: string };
  mtd?: { vrn?: string; clientId?: string; clientSecret?: string };
}

interface EInvoicingConfigPanelProps {
  country: SupportedCountry;
  config: CountryConfig;
  onSave: (config: CountryConfig) => Promise<void>;
  onTest?: () => Promise<{ success: boolean; message: string }>;
}

// Información de cada país
const COUNTRY_INFO: Record<SupportedCountry, {
  name: string;
  flag: string;
  system: string;
  mandatory: string;
}> = {
  ES: { name: 'España', flag: '🇪🇸', system: 'Verifactu (AEAT)', mandatory: 'B2B obligatorio 2025' },
  IT: { name: 'Italia', flag: '🇮🇹', system: 'SDI / FatturaPA', mandatory: 'Obligatorio desde 2019' },
  DE: { name: 'Alemania', flag: '🇩🇪', system: 'ZUGFeRD / XRechnung', mandatory: 'B2B obligatorio 2025' },
  FR: { name: 'Francia', flag: '🇫🇷', system: 'Factur-X / Chorus Pro', mandatory: 'B2B obligatorio 2026-27' },
  PT: { name: 'Portugal', flag: '🇵🇹', system: 'CIUS-PT / SAF-T', mandatory: 'ATCUD obligatorio 2022' },
  DK: { name: 'Dinamarca', flag: '🇩🇰', system: 'OIOUBL / NemHandel', mandatory: 'B2G obligatorio' },
  BE: { name: 'Bélgica', flag: '🇧🇪', system: 'PEPPOL / Mercurius', mandatory: 'B2B obligatorio 2026' },
  GB: { name: 'Reino Unido', flag: '🇬🇧', system: 'Making Tax Digital', mandatory: 'MTD obligatorio' },
};

export const EInvoicingConfigPanel: React.FC<EInvoicingConfigPanelProps> = ({
  country,
  config,
  onSave,
  onTest,
}) => {
  const { t } = useTranslation();
  const [localConfig, setLocalConfig] = useState<CountryConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const countryInfo = COUNTRY_INFO[country];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localConfig);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!onTest) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await onTest();
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  };

  const updateConfig = (key: string, value: string | boolean | number) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.flag}>{countryInfo.flag}</Text>
        <View style={styles.headerInfo}>
          <Text style={styles.countryName}>{countryInfo.name}</Text>
          <Text style={styles.systemName}>{countryInfo.system}</Text>
          <View style={styles.mandatoryBadge}>
            <Text style={styles.mandatoryText}>{countryInfo.mandatory}</Text>
          </View>
        </View>
      </View>

      {/* Activar/Desactivar */}
      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={styles.label}>{t('einvoicing.enabled') || 'Activar facturación electrónica'}</Text>
          <Switch
            value={localConfig.enabled}
            onValueChange={(value) => updateConfig('enabled', value)}
            trackColor={{ false: '#E5E7EB', true: '#10B981' }}
          />
        </View>
      </View>

      {localConfig.enabled && (
        <>
          {/* Entorno */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('einvoicing.environment') || 'Entorno'}</Text>
            <View style={styles.environmentButtons}>
              <TouchableOpacity
                style={[
                  styles.envButton,
                  localConfig.environment === 'test' && styles.envButtonActive,
                ]}
                onPress={() => updateConfig('environment', 'test')}
              >
                <Ionicons
                  name="flask-outline"
                  size={20}
                  color={localConfig.environment === 'test' ? '#fff' : '#6B7280'}
                />
                <Text style={[
                  styles.envButtonText,
                  localConfig.environment === 'test' && styles.envButtonTextActive,
                ]}>
                  {t('einvoicing.testMode') || 'Pruebas'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.envButton,
                  localConfig.environment === 'production' && styles.envButtonActiveProduction,
                ]}
                onPress={() => updateConfig('environment', 'production')}
              >
                <Ionicons
                  name="rocket-outline"
                  size={20}
                  color={localConfig.environment === 'production' ? '#fff' : '#6B7280'}
                />
                <Text style={[
                  styles.envButtonText,
                  localConfig.environment === 'production' && styles.envButtonTextActive,
                ]}>
                  {t('einvoicing.productionMode') || 'Producción'}
                </Text>
              </TouchableOpacity>
            </View>
            {localConfig.environment === 'production' && (
              <View style={styles.warningBox}>
                <Ionicons name="warning-outline" size={20} color="#F59E0B" />
                <Text style={styles.warningText}>
                  {t('einvoicing.productionWarning') || 'Las facturas enviadas en producción tienen validez legal'}
                </Text>
              </View>
            )}
          </View>

          {/* Configuración específica por país */}
          {country === 'ES' && (
            <SpainConfig
              config={localConfig.verifactu}
              onChange={(verifactu) => updateConfig('verifactu', verifactu)}
            />
          )}
          {country === 'IT' && (
            <ItalyConfig
              config={localConfig.sdi}
              onChange={(sdi) => updateConfig('sdi', sdi)}
            />
          )}
          {country === 'DE' && (
            <GermanyConfig
              config={localConfig.zugferd}
              onChange={(zugferd) => updateConfig('zugferd', zugferd)}
            />
          )}
          {country === 'FR' && (
            <FranceConfig
              config={localConfig.facturx}
              onChange={(facturx) => updateConfig('facturx', facturx)}
            />
          )}
          {country === 'PT' && (
            <PortugalConfig
              config={localConfig.ciuspt}
              onChange={(ciuspt) => updateConfig('ciuspt', ciuspt)}
            />
          )}
          {country === 'DK' && (
            <DenmarkConfig
              config={localConfig.oioubl}
              onChange={(oioubl) => updateConfig('oioubl', oioubl)}
            />
          )}
          {country === 'BE' && (
            <BelgiumConfig
              config={localConfig.peppol}
              onChange={(peppol) => updateConfig('peppol', peppol)}
            />
          )}
          {country === 'GB' && (
            <UKConfig
              config={localConfig.mtd}
              onChange={(mtd) => updateConfig('mtd', mtd)}
            />
          )}
        </>
      )}

      {/* Botones de acción */}
      <View style={styles.actions}>
        {onTest && localConfig.enabled && (
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTest}
            disabled={isTesting}
          >
            {isTesting ? (
              <ActivityIndicator color="#3B82F6" />
            ) : (
              <>
                <Ionicons name="play-outline" size={20} color="#3B82F6" />
                <Text style={styles.testButtonText}>{t('einvoicing.testConnection') || 'Probar conexión'}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>{t('common.save') || 'Guardar'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Resultado del test */}
      {testResult && (
        <View style={[styles.testResult, testResult.success ? styles.testSuccess : styles.testError]}>
          <Ionicons
            name={testResult.success ? 'checkmark-circle' : 'close-circle'}
            size={24}
            color={testResult.success ? '#10B981' : '#EF4444'}
          />
          <Text style={styles.testResultText}>{testResult.message}</Text>
        </View>
      )}
    </ScrollView>
  );
};

// Componentes de configuración específicos por país

const SpainConfig: React.FC<{
  config?: CountryConfig['verifactu'];
  onChange: (config: CountryConfig['verifactu']) => void;
}> = ({ config, onChange }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>🇪🇸 Configuración Verifactu</Text>
    <View style={styles.field}>
      <Text style={styles.label}>Ruta del certificado</Text>
      <TextInput
        style={styles.input}
        value={config?.certificatePath || ''}
        onChangeText={(text) => onChange({ ...config, certificatePath: text })}
        placeholder="/path/to/certificate.p12"
      />
    </View>
    <View style={styles.field}>
      <Text style={styles.label}>Contraseña del certificado</Text>
      <TextInput
        style={styles.input}
        value={config?.certificatePassword || ''}
        onChangeText={(text) => onChange({ ...config, certificatePassword: text })}
        secureTextEntry
        placeholder="••••••••"
      />
    </View>
  </View>
);

const ItalyConfig: React.FC<{
  config?: CountryConfig['sdi'];
  onChange: (config: CountryConfig['sdi']) => void;
}> = ({ config, onChange }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>🇮🇹 Configuración SDI</Text>
    <View style={styles.field}>
      <Text style={styles.label}>Codice Destinatario</Text>
      <TextInput
        style={styles.input}
        value={config?.codiceDestinatario || ''}
        onChangeText={(text) => onChange({ ...config, codiceDestinatario: text })}
        placeholder="0000000"
        maxLength={7}
      />
    </View>
    <View style={styles.field}>
      <Text style={styles.label}>PEC Destinatario (opcional)</Text>
      <TextInput
        style={styles.input}
        value={config?.pecDestinatario || ''}
        onChangeText={(text) => onChange({ ...config, pecDestinatario: text })}
        placeholder="email@pec.it"
        keyboardType="email-address"
      />
    </View>
    <View style={styles.field}>
      <Text style={styles.label}>Régimen Fiscal</Text>
      <TextInput
        style={styles.input}
        value={config?.regimeFiscale || 'RF01'}
        onChangeText={(text) => onChange({ ...config, regimeFiscale: text })}
        placeholder="RF01"
      />
    </View>
  </View>
);

const GermanyConfig: React.FC<{
  config?: CountryConfig['zugferd'];
  onChange: (config: CountryConfig['zugferd']) => void;
}> = ({ config, onChange }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>🇩🇪 Configuración ZUGFeRD</Text>
    <View style={styles.field}>
      <Text style={styles.label}>Perfil</Text>
      <TextInput
        style={styles.input}
        value={config?.profile || 'EN16931'}
        onChangeText={(text) => onChange({ ...config, profile: text })}
        placeholder="EN16931"
      />
    </View>
    <View style={styles.field}>
      <Text style={styles.label}>Leitweg-ID (para B2G)</Text>
      <TextInput
        style={styles.input}
        value={config?.leitwegId || ''}
        onChangeText={(text) => onChange({ ...config, leitwegId: text })}
        placeholder="04011000-1234512345-12"
      />
    </View>
  </View>
);

const FranceConfig: React.FC<{
  config?: CountryConfig['facturx'];
  onChange: (config: CountryConfig['facturx']) => void;
}> = ({ config, onChange }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>🇫🇷 Configuración Factur-X</Text>
    <View style={styles.field}>
      <Text style={styles.label}>SIRET</Text>
      <TextInput
        style={styles.input}
        value={config?.siret || ''}
        onChangeText={(text) => onChange({ ...config, siret: text })}
        placeholder="12345678901234"
        maxLength={14}
      />
    </View>
    <View style={styles.field}>
      <Text style={styles.label}>Perfil</Text>
      <TextInput
        style={styles.input}
        value={config?.profile || 'EN16931'}
        onChangeText={(text) => onChange({ ...config, profile: text })}
        placeholder="EN16931"
      />
    </View>
    <View style={styles.switchRow}>
      <Text style={styles.label}>Chorus Pro habilitado</Text>
      <Switch
        value={config?.chorusProEnabled || false}
        onValueChange={(value) => onChange({ ...config, chorusProEnabled: value })}
        trackColor={{ false: '#E5E7EB', true: '#10B981' }}
      />
    </View>
  </View>
);

const PortugalConfig: React.FC<{
  config?: CountryConfig['ciuspt'];
  onChange: (config: CountryConfig['ciuspt']) => void;
}> = ({ config, onChange }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>🇵🇹 Configuración CIUS-PT</Text>
    <View style={styles.field}>
      <Text style={styles.label}>Número de certificación AT</Text>
      <TextInput
        style={styles.input}
        value={config?.atSoftwareCertificateNumber || ''}
        onChangeText={(text) => onChange({ ...config, atSoftwareCertificateNumber: text })}
        placeholder="1234/AT"
      />
    </View>
    <View style={styles.field}>
      <Text style={styles.label}>Serie de documento</Text>
      <TextInput
        style={styles.input}
        value={config?.serieDocumento || ''}
        onChangeText={(text) => onChange({ ...config, serieDocumento: text })}
        placeholder="FT2024"
      />
    </View>
  </View>
);

const DenmarkConfig: React.FC<{
  config?: CountryConfig['oioubl'];
  onChange: (config: CountryConfig['oioubl']) => void;
}> = ({ config, onChange }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>🇩🇰 Configuración OIOUBL</Text>
    <View style={styles.field}>
      <Text style={styles.label}>CVR-nummer</Text>
      <TextInput
        style={styles.input}
        value={config?.cvr || ''}
        onChangeText={(text) => onChange({ ...config, cvr: text })}
        placeholder="12345678"
        maxLength={8}
      />
    </View>
    <View style={styles.field}>
      <Text style={styles.label}>EAN/GLN</Text>
      <TextInput
        style={styles.input}
        value={config?.ean || ''}
        onChangeText={(text) => onChange({ ...config, ean: text })}
        placeholder="5790000123456"
        maxLength={13}
      />
    </View>
    <View style={styles.switchRow}>
      <Text style={styles.label}>NemHandel habilitado</Text>
      <Switch
        value={config?.nemhandelEnabled || false}
        onValueChange={(value) => onChange({ ...config, nemhandelEnabled: value })}
        trackColor={{ false: '#E5E7EB', true: '#10B981' }}
      />
    </View>
  </View>
);

const BelgiumConfig: React.FC<{
  config?: CountryConfig['peppol'];
  onChange: (config: CountryConfig['peppol']) => void;
}> = ({ config, onChange }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>🇧🇪 Configuración PEPPOL</Text>
    <View style={styles.field}>
      <Text style={styles.label}>Numéro d'entreprise</Text>
      <TextInput
        style={styles.input}
        value={config?.enterpriseNumber || ''}
        onChangeText={(text) => onChange({ ...config, enterpriseNumber: text })}
        placeholder="0123.456.789"
      />
    </View>
    <View style={styles.field}>
      <Text style={styles.label}>Access Point ID</Text>
      <TextInput
        style={styles.input}
        value={config?.accessPointId || ''}
        onChangeText={(text) => onChange({ ...config, accessPointId: text })}
        placeholder="AP ID"
      />
    </View>
  </View>
);

const UKConfig: React.FC<{
  config?: CountryConfig['mtd'];
  onChange: (config: CountryConfig['mtd']) => void;
}> = ({ config, onChange }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>🇬🇧 Configuración MTD</Text>
    <View style={styles.field}>
      <Text style={styles.label}>VAT Registration Number</Text>
      <TextInput
        style={styles.input}
        value={config?.vrn || ''}
        onChangeText={(text) => onChange({ ...config, vrn: text })}
        placeholder="GB123456789"
      />
    </View>
    <View style={styles.field}>
      <Text style={styles.label}>Client ID (HMRC)</Text>
      <TextInput
        style={styles.input}
        value={config?.clientId || ''}
        onChangeText={(text) => onChange({ ...config, clientId: text })}
        placeholder="Client ID"
      />
    </View>
    <View style={styles.field}>
      <Text style={styles.label}>Client Secret (HMRC)</Text>
      <TextInput
        style={styles.input}
        value={config?.clientSecret || ''}
        onChangeText={(text) => onChange({ ...config, clientSecret: text })}
        secureTextEntry
        placeholder="••••••••"
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  flag: {
    fontSize: 48,
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  systemName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  mandatoryBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  mandatoryText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  field: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  environmentButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  envButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  envButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  envButtonActiveProduction: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  envButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  envButtonTextActive: {
    color: '#fff',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 4,
    marginTop: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3B82F6',
    backgroundColor: '#fff',
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  testResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 4,
  },
  testSuccess: {
    backgroundColor: '#D1FAE5',
  },
  testError: {
    backgroundColor: '#FEE2E2',
  },
  testResultText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
});

export default EInvoicingConfigPanel;
