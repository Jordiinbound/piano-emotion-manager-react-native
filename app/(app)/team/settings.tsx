/**
 * Página de Configuración de la Organización
 * Piano Emotion Manager
 * 
 * Configuración general de la organización para administradores.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { 
  useCurrentOrganization, 
  useOrganizationSettings 
} from '../../../hooks/use-organization';
import { useMyPermissions } from '../../../hooks/use-team-members';
import { useTheme } from '../../../hooks/use-theme';

// ==========================================
// TIPOS
// ==========================================

interface SettingsSection {
  title: string;
  icon: string;
  fields: SettingsField[];
}

interface SettingsField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'time' | 'days' | 'currency';
  placeholder?: string;
  required?: boolean;
}

// ==========================================
// CONSTANTES
// ==========================================

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'DKK', 'SEK', 'NOK'];

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    title: 'Información General',
    icon: 'business-outline',
    fields: [
      { key: 'name', label: 'Nombre de la Empresa', type: 'text', required: true },
      { key: 'legalName', label: 'Razón Social', type: 'text' },
      { key: 'taxId', label: 'NIF/CIF', type: 'text' },
      { key: 'description', label: 'Descripción', type: 'text' },
    ],
  },
  {
    title: 'Contacto',
    icon: 'call-outline',
    fields: [
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Teléfono', type: 'phone' },
      { key: 'website', label: 'Sitio Web', type: 'text', placeholder: 'https://' },
    ],
  },
  {
    title: 'Dirección',
    icon: 'location-outline',
    fields: [
      { key: 'address', label: 'Dirección', type: 'text' },
      { key: 'city', label: 'Ciudad', type: 'text' },
      { key: 'postalCode', label: 'Código Postal', type: 'text' },
    ],
  },
  {
    title: 'Datos Bancarios',
    icon: 'card-outline',
    fields: [
      { key: 'bankName', label: 'Nombre del Banco', type: 'text' },
      { key: 'bankAccount', label: 'IBAN', type: 'text' },
      { key: 'swiftBic', label: 'SWIFT/BIC', type: 'text' },
    ],
  },
  {
    title: 'Facturación',
    icon: 'receipt-outline',
    fields: [
      { key: 'invoicePrefix', label: 'Prefijo de Factura', type: 'text', placeholder: 'FAC-' },
      { key: 'defaultTaxRate', label: 'IVA por Defecto (%)', type: 'number' },
      { key: 'defaultCurrency', label: 'Moneda', type: 'currency' },
    ],
  },
];

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function TeamSettingsPage() {
  const { colors } = useTheme();
  const router = useRouter();
  
  // Hooks
  const { currentOrganization, currentOrganizationId } = useCurrentOrganization();
  const { settings, updateSettings, isUpdating } = useOrganizationSettings(currentOrganizationId ?? 0);
  const { isAdmin } = useMyPermissions(currentOrganizationId ?? 0);
  
  // State
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [workingHoursStart, setWorkingHoursStart] = useState('08:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('20:00');
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Initialize form data from settings
  useEffect(() => {
    if (settings) {
      setFormData({
        name: settings.name,
        legalName: settings.legalName,
        taxId: settings.taxId,
        description: settings.description,
        email: settings.email,
        phone: settings.phone,
        website: settings.website,
        address: settings.address,
        city: settings.city,
        postalCode: settings.postalCode,
        bankName: settings.bankName,
        bankAccount: settings.bankAccount,
        swiftBic: settings.swiftBic,
        invoicePrefix: settings.invoicePrefix,
        defaultTaxRate: settings.defaultTaxRate?.toString(),
        defaultCurrency: settings.defaultCurrency,
      });
      setWorkingHoursStart(settings.workingHoursStart ?? '08:00');
      setWorkingHoursEnd(settings.workingHoursEnd ?? '20:00');
      setWorkingDays(settings.workingDays ?? [1, 2, 3, 4, 5]);
    }
  }, [settings]);
  
  // Handlers
  const handleFieldChange = useCallback((key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);
  
  const toggleWorkingDay = useCallback((day: number) => {
    setWorkingDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day].sort();
      }
    });
    setHasChanges(true);
  }, []);
  
  const handleSave = useCallback(async () => {
    if (!isAdmin) {
      Alert.alert('Sin permiso', 'Solo los administradores pueden modificar la configuración');
      return;
    }
    
    try {
      await updateSettings({
        ...formData,
        defaultTaxRate: formData.defaultTaxRate ? parseFloat(formData.defaultTaxRate) : undefined,
        workingHoursStart,
        workingHoursEnd,
        workingDays,
      });
      
      setHasChanges(false);
      Alert.alert('Éxito', 'Configuración guardada correctamente');
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo guardar la configuración');
    }
  }, [isAdmin, updateSettings, formData, workingHoursStart, workingHoursEnd, workingDays]);
  
  // Redirect if not admin
  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          Acceso Restringido
        </Text>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Solo los administradores pueden acceder a esta configuración.
        </Text>
      </View>
    );
  }
  
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Configuración',
          headerRight: () => hasChanges ? (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Guardar cambios"
            accessibilityHint="Pulsa para guardar los datos"
              disabled={isUpdating}
            >
              <Text style={[styles.saveButtonText, { color: colors.primary }]}>
                {isUpdating ? 'Guardando...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          ) : null,
        }}
      />
      
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {/* Secciones de configuración */}
        {SETTINGS_SECTIONS.map((section: any) => (
          <View key={section.title} style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name={section.icon as any} size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {section.title}
              </Text>
            </View>
            
            {section.fields.map((field: any) => (
              <View key={field.key} style={styles.fieldContainer}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  {field.label}
                  {field.required && <Text style={{ color: colors.primary }}> *</Text>}
                </Text>
                
                {field.type === 'currency' ? (
                  <View style={styles.currencyGrid}>
                    {CURRENCIES.map((currency: any) => (
                      <TouchableOpacity
                        key={currency}
                        style={[
                          styles.currencyOption,
                          { backgroundColor: colors.background },
                          formData.defaultCurrency === currency && { backgroundColor: colors.primary },
                        ]}
                        onPress={() => handleFieldChange('defaultCurrency', currency)}
                      >
                        <Text
                          style={[
                            styles.currencyText,
                            { color: formData.defaultCurrency === currency ? '#fff' : colors.text },
                          ]}
                        >
                          {currency}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                    value={formData[field.key] ?? ''}
                    onChangeText={(value) => handleFieldChange(field.key, value)}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.textSecondary}
                    keyboardType={
                      field.type === 'email' ? 'email-address' :
                      field.type === 'phone' ? 'phone-pad' :
                      field.type === 'number' ? 'numeric' :
                      'default'
                    }
                    autoCapitalize={field.type === 'email' ? 'none' : 'sentences'}
                  />
                )}
              </View>
            ))}
          </View>
        ))}
        
        {/* Horario de Trabajo */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Horario de Trabajo
            </Text>
          </View>
          
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                Hora Inicio
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                value={workingHoursStart}
                onChangeText={(value) => {
                  setWorkingHoursStart(value);
                  setHasChanges(true);
                }}
                placeholder="08:00"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            
            <View style={styles.timeField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                Hora Fin
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                value={workingHoursEnd}
                onChangeText={(value) => {
                  setWorkingHoursEnd(value);
                  setHasChanges(true);
                }}
                placeholder="20:00"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
          
          <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>
            Días Laborables
          </Text>
          <View style={styles.daysGrid}>
            {DAYS_OF_WEEK.map((day: any) => (
              <TouchableOpacity
                key={day.value}
                style={[
                  styles.dayOption,
                  { backgroundColor: colors.background },
                  workingDays.includes(day.value) && { backgroundColor: colors.primary },
                ]}
                onPress={() => toggleWorkingDay(day.value)}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: workingDays.includes(day.value) ? '#fff' : colors.text },
                  ]}
                >
                  {day.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Zona peligrosa */}
        <View style={[styles.section, styles.dangerSection]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning-outline" size={20} color="#ef4444" />
            <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>
              Zona Peligrosa
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => {
              Alert.alert(
                'Eliminar Organización',
                'Esta acción eliminará permanentemente la organización y todos sus datos. ¿Estás seguro?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Eliminar', style: 'destructive', onPress: () => {} },
                ]
              );
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
            <Text style={styles.dangerButtonText}>Eliminar Organización</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </>
  );
}

// ==========================================
// ESTILOS
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  content: {
    padding: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    padding: 12,
    borderRadius: 4,
    fontSize: 16,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  timeField: {
    flex: 1,
  },
  daysGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  dayOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  currencyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dangerSection: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  dangerButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
});
