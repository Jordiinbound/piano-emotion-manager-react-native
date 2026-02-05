/**
 * Onboarding Step 8 - Personalización
 * Personalización: logo, colores corporativos, nombre de marca
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
import { SkipButton } from '@/components/onboarding/skip-button';
import { markStepAsSkipped } from '@/utils/onboarding-helpers';

const ONBOARDING_STORAGE_KEY = '@onboarding_data';

interface OnboardingData {
  step1?: {
    name: string;
    slug: string;
    email: string;
    supportEmail?: string;
    supportPhone?: string;
  };
  step2?: {
    brandName?: string;
    primaryColor: string;
    secondaryColor: string;
  };
  step3?: {
    allowMultipleSuppliers: boolean;
    ecommerceEnabled: boolean;
    autoOrderEnabled: boolean;
    autoOrderThreshold: number;
    notificationEmail?: string;
  };
}

const PRESET_COLORS = [
  { name: 'Azul', primary: '#3b82f6', secondary: '#10b981' },
  { name: 'Púrpura', primary: '#8b5cf6', secondary: '#ec4899' },
  { name: 'Verde', primary: '#10b981', secondary: '#3b82f6' },
  { name: 'Naranja', primary: '#f59e0b', secondary: '#ef4444' },
  { name: 'Rosa', primary: '#ec4899', secondary: '#8b5cf6' },
  { name: 'Índigo', primary: '#6366f1', secondary: '#14b8a6' },
];

export default function OnboardingStep2Screen() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const defaultPrimaryColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const inputBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  // Form state
  const [brandName, setBrandName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [secondaryColor, setSecondaryColor] = useState('#10b981');

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
        
        // Load step 2 data if exists
        if (data.step2) {
          setBrandName(data.step2.brandName || '');
          setPrimaryColor(data.step2.primaryColor || '#3b82f6');
          setSecondaryColor(data.step2.secondaryColor || '#10b981');
        }
        
        // If no brand name, use company name from step 1
        if (!data.step2?.brandName && data.step1?.name) {
          setBrandName(data.step1.name);
        }
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const saveData = async () => {
    try {
      const existing = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      const data: OnboardingData = existing ? JSON.parse(existing) : {};
      
      data.step2 = {
        brandName: brandName || undefined,
        primaryColor,
        secondaryColor,
      };

      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate color format
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    
    if (!hexColorRegex.test(primaryColor)) {
      newErrors.primaryColor = 'Color hex válido requerido (#RRGGBB)';
    }
    
    if (!hexColorRegex.test(secondaryColor)) {
      newErrors.secondaryColor = 'Color hex válido requerido (#RRGGBB)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showSnackbar('Por favor, corrige los errores', 'error');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await saveData();
    router.push('/onboarding/success');
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };
  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await markStepAsSkipped(8);
    router.push('/(tabs)');
  };

  const handlePresetSelect = (preset: typeof PRESET_COLORS[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
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
            <ThemedText style={styles.stepIndicator}>Paso 8 de 8</ThemedText>
            <ThemedText style={styles.title}>Personalización</ThemedText>
            <ThemedText style={styles.subtitle}>
              Dale tu toque personal
            </ThemedText>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressBar, { backgroundColor: borderColor }]}>
            <View style={[styles.progressFill, { width: '66%', backgroundColor: primaryColor }]} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Brand Name */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>
                Nombre de Marca (Opcional)
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBackground, color: textColor, borderColor },
                ]}
                value={brandName}
                onChangeText={setBrandName}
                placeholder="Ej: Piano Emotion"
                placeholderTextColor={textColor + '60'}
                autoCapitalize="words"
              />
              <ThemedText style={styles.hint}>
                Si es diferente al nombre de la empresa
              </ThemedText>
            </View>

            {/* Color Presets */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>
                Paleta de Colores Predefinida
              </ThemedText>
              <View style={styles.presetsContainer}>
                {PRESET_COLORS.map((preset, index) => (
                  <Pressable
                    key={index}
                    style={({ pressed }) => [
                      styles.presetCard,
                      { backgroundColor: inputBackground, borderColor },
                      primaryColor === preset.primary && styles.presetSelected,
                      primaryColor === preset.primary && { borderColor: preset.primary },
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => handlePresetSelect(preset)}
                  >
                    <View style={styles.presetColors}>
                      <View style={[styles.presetColor, { backgroundColor: preset.primary }]} />
                      <View style={[styles.presetColor, { backgroundColor: preset.secondary }]} />
                    </View>
                    <ThemedText style={styles.presetName}>{preset.name}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Primary Color */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>
                Color Primario *
              </ThemedText>
              <View style={styles.colorInputContainer}>
                <View style={[styles.colorPreview, { backgroundColor: primaryColor }]} />
                <TextInput
                  style={[
                    styles.input,
                    styles.colorInput,
                    { backgroundColor: inputBackground, color: textColor, borderColor },
                    errors.primaryColor && styles.inputError,
                  ]}
                  value={primaryColor}
                  onChangeText={setPrimaryColor}
                  placeholder="#3b82f6"
                  placeholderTextColor={textColor + '60'}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={7}
                />
              </View>
              {errors.primaryColor && (
                <ThemedText style={styles.errorText}>{errors.primaryColor}</ThemedText>
              )}
            </View>

            {/* Secondary Color */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>
                Color Secundario *
              </ThemedText>
              <View style={styles.colorInputContainer}>
                <View style={[styles.colorPreview, { backgroundColor: secondaryColor }]} />
                <TextInput
                  style={[
                    styles.input,
                    styles.colorInput,
                    { backgroundColor: inputBackground, color: textColor, borderColor },
                    errors.secondaryColor && styles.inputError,
                  ]}
                  value={secondaryColor}
                  onChangeText={setSecondaryColor}
                  placeholder="#10b981"
                  placeholderTextColor={textColor + '60'}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={7}
                />
              </View>
              {errors.secondaryColor && (
                <ThemedText style={styles.errorText}>{errors.secondaryColor}</ThemedText>
              )}
            </View>

            {/* Preview */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>
                Vista Previa
              </ThemedText>
              <ThemedView style={[styles.previewCard, { backgroundColor: inputBackground, borderColor }]}>
                <View style={[styles.previewHeader, { backgroundColor: primaryColor }]}>
                  <Text style={styles.previewTitle}>
                    {brandName || 'Tu Marca'}
                  </Text>
                </View>
                <View style={styles.previewContent}>
                  <View style={[styles.previewButton, { backgroundColor: primaryColor }]}>
                    <Text style={styles.previewButtonText}>Botón Primario</Text>
                  </View>
                  <View style={[styles.previewButton, { backgroundColor: secondaryColor }]}>
                    <Text style={styles.previewButtonText}>Botón Secundario</Text>
                  </View>
                </View>
              </ThemedView>
            </View>
          </View>
        </ScrollView>


        {/* Skip Button */}
        <View style={styles.skipContainer}>
          <SkipButton onSkip={handleSkip} />
        </View>

        {/* Footer Buttons */}
        <View style={[styles.footer, { backgroundColor, borderTopColor: borderColor }]}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              { borderColor },
              pressed && styles.buttonPressed,
            ]}
            onPress={handleBack}
          >
            <IconSymbol name="arrow.left" size={20} color={textColor} />
            <ThemedText style={styles.backButtonText}>Atrás</ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.nextButton,
              { backgroundColor: primaryColor },
              pressed && styles.buttonPressed,
            ]}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>Siguiente</Text>
            <IconSymbol name="arrow.right" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  stepIndicator: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 8,
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
  progressBar: {
    height: 4,
    borderRadius: 4,
    marginBottom: 32,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  form: {
    gap: 24,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    padding: 16,
    borderRadius: 4,
    fontSize: 16,
    borderWidth: 1,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  hint: {
    fontSize: 12,
    opacity: 0.6,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetCard: {
    width: 100,
    padding: 12,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    gap: 8,
  },
  presetSelected: {
    borderWidth: 2,
  },
  presetColors: {
    flexDirection: 'row',
    gap: 4,
  },
  presetColor: {
    width: 32,
    height: 32,
    borderRadius: 4,
  },
  presetName: {
    fontSize: 12,
    fontWeight: '500',
  },
  colorInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorPreview: {
    width: 48,
    height: 48,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  colorInput: {
    flex: 1,
  },
  previewCard: {
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  previewHeader: {
    padding: 16,
    alignItems: 'center',
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  previewContent: {
    padding: 16,
    gap: 12,
  },
  previewButton: {
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  previewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 4,
    gap: 8,
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
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
});
