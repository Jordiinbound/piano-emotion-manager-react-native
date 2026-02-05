/**
 * Onboarding Step 1 - Basic Information
 * Información básica del partner: nombre, slug, email
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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSnackbar } from '@/hooks/use-snackbar';
import { trpc } from '@/lib/trpc';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { OnboardingData } from '@/types/onboarding';
import { ONBOARDING_STORAGE_KEY } from '@/types/onboarding';
import { SkipButton } from '@/components/onboarding/skip-button';
import { markStepAsSkipped } from '@/utils/onboarding-helpers';

export default function OnboardingStep1Screen() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const primaryColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const inputBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');

  // Validation state
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // tRPC mutations
  const checkSlugMutation = trpc.onboarding.checkSlugAvailability.useQuery(
    { slug },
    { enabled: false }
  );
  const checkEmailMutation = trpc.onboarding.checkEmailAvailability.useQuery(
    { email },
    { enabled: false }
  );
  const suggestSlugMutation = trpc.onboarding.suggestSlug.useQuery(
    { name },
    { enabled: false }
  );

  // Load saved data on mount
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const saved = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (saved) {
        const data: OnboardingData = JSON.parse(saved);
        if (data.step1) {
          setName(data.step1.name || '');
          setSlug(data.step1.slug || '');
          setEmail(data.step1.email || '');
          setSupportEmail(data.step1.supportEmail || '');
          setSupportPhone(data.step1.supportPhone || '');
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
      
      data.step1 = {
        name,
        slug,
        email,
        supportEmail: supportEmail || undefined,
        supportPhone: supportPhone || undefined,
      };

      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    
    // Auto-generate slug if it's empty or matches the previous auto-generated value
    if (!slug || slug === generateSlugFromName(name)) {
      const newSlug = generateSlugFromName(value);
      setSlug(newSlug);
    }
  };

  const generateSlugFromName = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-') // Replace special chars with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50);
  };

  // Check slug availability with debounce
  useEffect(() => {
    if (!slug || slug.length < 2) {
      setSlugAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingSlug(true);
      try {
        const result = await checkSlugMutation.refetch();
        setSlugAvailable(result.data?.available || false);
      } catch (error) {
        console.error('Error checking slug:', error);
      } finally {
        setCheckingSlug(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slug]);

  // Check email availability with debounce
  useEffect(() => {
    if (!email || !email.includes('@')) {
      setEmailAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingEmail(true);
      try {
        const result = await checkEmailMutation.refetch();
        setEmailAvailable(result.data?.available || false);
      } catch (error) {
        console.error('Error checking email:', error);
      } finally {
        setCheckingEmail(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [email]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }

    if (!slug.trim()) {
      newErrors.slug = 'El slug es obligatorio';
    } else if (!/^[a-z0-9-]+$/.test(slug)) {
      newErrors.slug = 'Solo letras minúsculas, números y guiones';
    } else if (slugAvailable === false) {
      newErrors.slug = 'Este slug ya está en uso';
    }

    if (!email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email no válido';
    } else if (emailAvailable === false) {
      newErrors.email = 'Este email ya está en uso';
    }

    if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
      newErrors.supportEmail = 'Email no válido';
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
    router.push('/onboarding/step2');
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await markStepAsSkipped(1);
    router.push('/onboarding/step2');
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
            <ThemedText style={styles.stepIndicator}>Paso 1 de 3</ThemedText>
            <ThemedText style={styles.title}>Información Básica</ThemedText>
            <ThemedText style={styles.subtitle}>
              Cuéntanos sobre tu empresa
            </ThemedText>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressBar, { backgroundColor: borderColor }]}>
            <View style={[styles.progressFill, { width: '33%', backgroundColor: primaryColor }]} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>
                Nombre de la Empresa *
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBackground, color: textColor, borderColor },
                  errors.name && styles.inputError,
                ]}
                value={name}
                onChangeText={handleNameChange}
                placeholder="Ej: Piano Emotion España"
                placeholderTextColor={textColor + '60'}
                autoCapitalize="words"
              />
              {errors.name && (
                <ThemedText style={styles.errorText}>{errors.name}</ThemedText>
              )}
            </View>

            {/* Slug */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>
                Identificador Único (Slug) *
              </ThemedText>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: inputBackground, color: textColor, borderColor },
                    errors.slug && styles.inputError,
                  ]}
                  value={slug}
                  onChangeText={setSlug}
                  placeholder="piano-emotion-espana"
                  placeholderTextColor={textColor + '60'}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {checkingSlug && (
                  <ActivityIndicator
                    size="small"
                    color={primaryColor}
                    style={styles.inputIcon}
                  />
                )}
                {!checkingSlug && slugAvailable === true && (
                  <IconSymbol
                    name="checkmark.circle.fill"
                    size={20}
                    color="#10b981"
                    style={styles.inputIcon}
                  />
                )}
                {!checkingSlug && slugAvailable === false && (
                  <IconSymbol
                    name="xmark.circle.fill"
                    size={20}
                    color="#ef4444"
                    style={styles.inputIcon}
                  />
                )}
              </View>
              <ThemedText style={styles.hint}>
                Solo letras minúsculas, números y guiones
              </ThemedText>
              {errors.slug && (
                <ThemedText style={styles.errorText}>{errors.slug}</ThemedText>
              )}
            </View>

            {/* Email */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>
                Email Principal *
              </ThemedText>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: inputBackground, color: textColor, borderColor },
                    errors.email && styles.inputError,
                  ]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="contacto@empresa.com"
                  placeholderTextColor={textColor + '60'}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {checkingEmail && (
                  <ActivityIndicator
                    size="small"
                    color={primaryColor}
                    style={styles.inputIcon}
                  />
                )}
                {!checkingEmail && emailAvailable === true && (
                  <IconSymbol
                    name="checkmark.circle.fill"
                    size={20}
                    color="#10b981"
                    style={styles.inputIcon}
                  />
                )}
                {!checkingEmail && emailAvailable === false && (
                  <IconSymbol
                    name="xmark.circle.fill"
                    size={20}
                    color="#ef4444"
                    style={styles.inputIcon}
                  />
                )}
              </View>
              {errors.email && (
                <ThemedText style={styles.errorText}>{errors.email}</ThemedText>
              )}
            </View>

            {/* Support Email (Optional) */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>
                Email de Soporte (Opcional)
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBackground, color: textColor, borderColor },
                  errors.supportEmail && styles.inputError,
                ]}
                value={supportEmail}
                onChangeText={setSupportEmail}
                placeholder="soporte@empresa.com"
                placeholderTextColor={textColor + '60'}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.supportEmail && (
                <ThemedText style={styles.errorText}>{errors.supportEmail}</ThemedText>
              )}
            </View>

            {/* Support Phone (Optional) */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>
                Teléfono de Soporte (Opcional)
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBackground, color: textColor, borderColor },
                ]}
                value={supportPhone}
                onChangeText={setSupportPhone}
                placeholder="+34 123 456 789"
                placeholderTextColor={textColor + '60'}
                keyboardType="phone-pad"
              />
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
    gap: 20,
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
  inputWithIcon: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  hint: {
    fontSize: 12,
    opacity: 0.6,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
  },
  skipContainer: {
    alignItems: 'center',
    paddingVertical: 12,
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
