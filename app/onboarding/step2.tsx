/**
 * Onboarding Step 2 - Datos Fiscales
 * Información fiscal del partner: razón social, NIF, dirección, IBAN
 */
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSnackbar } from '@/hooks/use-snackbar';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OnboardingData } from '@/types/onboarding';
import { ONBOARDING_STORAGE_KEY } from '@/types/onboarding';
import { SkipButton } from '@/components/onboarding/skip-button';
import { markStepAsSkipped } from '@/utils/onboarding-helpers';

export default function OnboardingStep2Screen() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const primaryColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const inputBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  // Form state
  const [legalName, setLegalName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [street, setStreet] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [iban, setIban] = useState('');
  const [bankName, setBankName] = useState('');

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load saved data on mount
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const saved = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (saved) {
        const data: OnboardingData = JSON.parse(saved);
        if (data.step2) {
          setLegalName(data.step2.legalName || '');
          setBusinessName(data.step2.businessName || '');
          setTaxId(data.step2.taxId || '');
          setStreet(data.step2.address?.street || '');
          setPostalCode(data.step2.address?.postalCode || '');
          setCity(data.step2.address?.city || '');
          setProvince(data.step2.address?.province || '');
          setIban(data.step2.iban || '');
          setBankName(data.step2.bankName || '');
        }
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!legalName.trim()) {
      newErrors.legalName = 'La razón social es obligatoria';
    }

    if (!taxId.trim()) {
      newErrors.taxId = 'El NIF/CIF es obligatorio';
    } else if (!validateTaxId(taxId)) {
      newErrors.taxId = 'Formato de NIF/CIF inválido';
    }

    if (!street.trim()) {
      newErrors.street = 'La dirección es obligatoria';
    }

    if (!postalCode.trim()) {
      newErrors.postalCode = 'El código postal es obligatorio';
    } else if (!/^\d{5}$/.test(postalCode)) {
      newErrors.postalCode = 'Código postal inválido (5 dígitos)';
    }

    if (!city.trim()) {
      newErrors.city = 'La ciudad es obligatoria';
    }

    if (!province.trim()) {
      newErrors.province = 'La provincia es obligatoria';
    }

    if (iban && !validateIban(iban)) {
      newErrors.iban = 'Formato de IBAN inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateTaxId = (id: string): boolean => {
    // Validación básica de NIF/CIF español
    const nifRegex = /^[0-9]{8}[A-Z]$/;
    const cifRegex = /^[A-Z][0-9]{7}[A-Z0-9]$/;
    return nifRegex.test(id.toUpperCase()) || cifRegex.test(id.toUpperCase());
  };

  const validateIban = (iban: string): boolean => {
    // Validación básica de IBAN
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
    return ibanRegex.test(iban.replace(/\s/g, '').toUpperCase());
  };

  const handleNext = async () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showSnackbar('Por favor, completa todos los campos obligatorios', 'error');
      return;
    }

    try {
      // Save data
      const saved = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      const data: OnboardingData = saved ? JSON.parse(saved) : {};
      
      data.step2 = {
        legalName: legalName.trim(),
        businessName: businessName.trim() || undefined,
        taxId: taxId.trim().toUpperCase(),
        address: {
          street: street.trim(),
          postalCode: postalCode.trim(),
          city: city.trim(),
          province: province.trim(),
        },
        iban: iban.trim() || undefined,
        bankName: bankName.trim() || undefined,
      };

      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data));
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/onboarding/step3');
    } catch (error) {
      console.error('Error saving data:', error);
      showSnackbar('Error al guardar los datos', 'error');
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await markStepAsSkipped(2);
    router.push('/onboarding/step3');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={handleBack} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color={primaryColor} />
            </Pressable>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: borderColor }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: primaryColor, width: '25%' },
                  ]}
                />
              </View>
              <ThemedText style={styles.progressText}>Paso 2 de 8</ThemedText>
            </View>
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <ThemedText style={styles.title}>Datos Fiscales</ThemedText>
            <ThemedText style={styles.subtitle}>
              Información fiscal de tu empresa
            </ThemedText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Razón Social */}
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>
                Razón Social <Text style={styles.required}>*</Text>
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBackground, borderColor, color: textColor },
                  errors.legalName && styles.inputError,
                ]}
                value={legalName}
                onChangeText={(text) => {
                  setLegalName(text);
                  if (errors.legalName) {
                    setErrors({ ...errors, legalName: '' });
                  }
                }}
                placeholder="Ej: Piano Emotion S.L."
                placeholderTextColor={borderColor}
                autoCapitalize="words"
              />
              {errors.legalName && (
                <ThemedText style={styles.errorText}>{errors.legalName}</ThemedText>
              )}
            </View>

            {/* Nombre Comercial */}
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Nombre Comercial (opcional)</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBackground, borderColor, color: textColor },
                ]}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Ej: Piano Emotion"
                placeholderTextColor={borderColor}
                autoCapitalize="words"
              />
            </View>

            {/* NIF/CIF */}
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>
                NIF/CIF <Text style={styles.required}>*</Text>
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBackground, borderColor, color: textColor },
                  errors.taxId && styles.inputError,
                ]}
                value={taxId}
                onChangeText={(text) => {
                  setTaxId(text);
                  if (errors.taxId) {
                    setErrors({ ...errors, taxId: '' });
                  }
                }}
                placeholder="Ej: B12345678"
                placeholderTextColor={borderColor}
                autoCapitalize="characters"
                maxLength={9}
              />
              {errors.taxId && (
                <ThemedText style={styles.errorText}>{errors.taxId}</ThemedText>
              )}
            </View>

            {/* Dirección Fiscal */}
            <ThemedText style={styles.sectionTitle}>Dirección Fiscal</ThemedText>

            {/* Calle */}
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>
                Calle y Número <Text style={styles.required}>*</Text>
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBackground, borderColor, color: textColor },
                  errors.street && styles.inputError,
                ]}
                value={street}
                onChangeText={(text) => {
                  setStreet(text);
                  if (errors.street) {
                    setErrors({ ...errors, street: '' });
                  }
                }}
                placeholder="Ej: Calle Mayor 123"
                placeholderTextColor={borderColor}
                autoCapitalize="words"
              />
              {errors.street && (
                <ThemedText style={styles.errorText}>{errors.street}</ThemedText>
              )}
            </View>

            {/* Código Postal y Ciudad */}
            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <ThemedText style={styles.label}>
                  Código Postal <Text style={styles.required}>*</Text>
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: inputBackground, borderColor, color: textColor },
                    errors.postalCode && styles.inputError,
                  ]}
                  value={postalCode}
                  onChangeText={(text) => {
                    setPostalCode(text);
                    if (errors.postalCode) {
                      setErrors({ ...errors, postalCode: '' });
                    }
                  }}
                  placeholder="28001"
                  placeholderTextColor={borderColor}
                  keyboardType="numeric"
                  maxLength={5}
                />
                {errors.postalCode && (
                  <ThemedText style={styles.errorText}>{errors.postalCode}</ThemedText>
                )}
              </View>

              <View style={[styles.inputContainer, styles.halfWidth]}>
                <ThemedText style={styles.label}>
                  Ciudad <Text style={styles.required}>*</Text>
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: inputBackground, borderColor, color: textColor },
                    errors.city && styles.inputError,
                  ]}
                  value={city}
                  onChangeText={(text) => {
                    setCity(text);
                    if (errors.city) {
                      setErrors({ ...errors, city: '' });
                    }
                  }}
                  placeholder="Madrid"
                  placeholderTextColor={borderColor}
                  autoCapitalize="words"
                />
                {errors.city && (
                  <ThemedText style={styles.errorText}>{errors.city}</ThemedText>
                )}
              </View>
            </View>

            {/* Provincia */}
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>
                Provincia <Text style={styles.required}>*</Text>
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBackground, borderColor, color: textColor },
                  errors.province && styles.inputError,
                ]}
                value={province}
                onChangeText={(text) => {
                  setProvince(text);
                  if (errors.province) {
                    setErrors({ ...errors, province: '' });
                  }
                }}
                placeholder="Madrid"
                placeholderTextColor={borderColor}
                autoCapitalize="words"
              />
              {errors.province && (
                <ThemedText style={styles.errorText}>{errors.province}</ThemedText>
              )}
            </View>

            {/* Datos Bancarios (opcional) */}
            <ThemedText style={styles.sectionTitle}>Datos Bancarios (opcional)</ThemedText>

            {/* IBAN */}
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>IBAN</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBackground, borderColor, color: textColor },
                  errors.iban && styles.inputError,
                ]}
                value={iban}
                onChangeText={(text) => {
                  setIban(text);
                  if (errors.iban) {
                    setErrors({ ...errors, iban: '' });
                  }
                }}
                placeholder="ES00 0000 0000 0000 0000 0000"
                placeholderTextColor={borderColor}
                autoCapitalize="characters"
              />
              {errors.iban && (
                <ThemedText style={styles.errorText}>{errors.iban}</ThemedText>
              )}
            </View>

            {/* Banco */}
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Nombre del Banco</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBackground, borderColor, color: textColor },
                ]}
                value={bankName}
                onChangeText={setBankName}
                placeholder="Ej: Banco Santander"
                placeholderTextColor={borderColor}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Skip Button */}
          <View style={styles.skipContainer}>
            <SkipButton onSkip={handleSkip} />
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.nextButton,
                { backgroundColor: primaryColor },
                pressed && styles.buttonPressed,
              ]}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>Continuar</Text>
              <IconSymbol name="arrow.right" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  backButton: {
    padding: 8,
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 4,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    opacity: 0.6,
  },
  titleContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  form: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 16,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  buttonContainer: {
    gap: 12,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 4,
    gap: 8,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  skipContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
});
