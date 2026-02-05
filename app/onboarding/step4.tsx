/**
 * Onboarding Step 4 - Cliente de Correo Preferido
 * Selección del cliente de correo: Gmail, Outlook o Default
 */
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
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

type EmailClient = 'gmail' | 'outlook' | 'default';

export default function OnboardingStep4Screen() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const primaryColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');

  const [selectedClient, setSelectedClient] = useState<EmailClient>('gmail');

  // Load saved data on mount
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const saved = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (saved) {
        const data: OnboardingData = JSON.parse(saved);
        if (data.step4) {
          setSelectedClient(data.step4.emailClientPreference);
        }
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const handleNext = async () => {
    try {
      // Save data
      const saved = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      const data: OnboardingData = saved ? JSON.parse(saved) : {};
      
      data.step4 = {
        emailClientPreference: selectedClient,
      };

      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data));
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/onboarding/step5');
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
    await markStepAsSkipped(4);
    router.push('/onboarding/step5');
  };

  const handleSelectClient = (client: EmailClient) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedClient(client);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
                  { backgroundColor: primaryColor, width: '50%' },
                ]}
              />
            </View>
            <ThemedText style={styles.progressText}>Paso 4 de 8</ThemedText>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <ThemedText style={styles.title}>Cliente de Correo</ThemedText>
          <ThemedText style={styles.subtitle}>
            ¿Qué cliente de correo usas para contactar clientes?
          </ThemedText>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {/* Gmail */}
          <Pressable
            onPress={() => handleSelectClient('gmail')}
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: cardBg,
                borderColor: selectedClient === 'gmail' ? primaryColor : borderColor,
                borderWidth: selectedClient === 'gmail' ? 2 : 1,
              },
              pressed && styles.optionPressed,
            ]}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#EA433515' }]}>
              <IconSymbol name="envelope.fill" size={28} color="#EA4335" />
            </View>
            <View style={styles.optionContent}>
              <ThemedText style={styles.optionTitle}>Gmail</ThemedText>
              <ThemedText style={[styles.optionDescription, { color: textSecondary }]}>
                Abre Gmail web con el mensaje pre-rellenado
              </ThemedText>
            </View>
            {selectedClient === 'gmail' && (
              <View style={styles.checkmark}>
                <IconSymbol name="checkmark.circle.fill" size={24} color={primaryColor} />
              </View>
            )}
          </Pressable>

          {/* Outlook */}
          <Pressable
            onPress={() => handleSelectClient('outlook')}
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: cardBg,
                borderColor: selectedClient === 'outlook' ? primaryColor : borderColor,
                borderWidth: selectedClient === 'outlook' ? 2 : 1,
              },
              pressed && styles.optionPressed,
            ]}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#0078D415' }]}>
              <IconSymbol name="envelope.badge.fill" size={28} color="#0078D4" />
            </View>
            <View style={styles.optionContent}>
              <ThemedText style={styles.optionTitle}>Outlook</ThemedText>
              <ThemedText style={[styles.optionDescription, { color: textSecondary }]}>
                Abre Outlook web con el mensaje pre-rellenado
              </ThemedText>
            </View>
            {selectedClient === 'outlook' && (
              <View style={styles.checkmark}>
                <IconSymbol name="checkmark.circle.fill" size={24} color={primaryColor} />
              </View>
            )}
          </Pressable>

          {/* Default */}
          <Pressable
            onPress={() => handleSelectClient('default')}
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: cardBg,
                borderColor: selectedClient === 'default' ? primaryColor : borderColor,
                borderWidth: selectedClient === 'default' ? 2 : 1,
              },
              pressed && styles.optionPressed,
            ]}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${primaryColor}15` }]}>
              <IconSymbol name="laptopcomputer" size={28} color={primaryColor} />
            </View>
            <View style={styles.optionContent}>
              <ThemedText style={styles.optionTitle}>Cliente Predeterminado</ThemedText>
              <ThemedText style={[styles.optionDescription, { color: textSecondary }]}>
                Usa el cliente de correo configurado en tu sistema
              </ThemedText>
            </View>
            {selectedClient === 'default' && (
              <View style={styles.checkmark}>
                <IconSymbol name="checkmark.circle.fill" size={24} color={primaryColor} />
              </View>
            )}
          </Pressable>
        </View>

        {/* Info */}
        <ThemedView style={[styles.infoBox, { backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}30` }]}>
          <IconSymbol name="info.circle" size={20} color={primaryColor} />
          <ThemedText style={styles.infoText}>
            Esta configuración se usará cuando contactes a clientes desde las alertas. Podrás cambiarla en cualquier momento desde Configuración.
          </ThemedText>
        </ThemedView>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  optionsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 4,
    gap: 16,
  },
  optionPressed: {
    opacity: 0.8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  checkmark: {
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 4,
    gap: 12,
    marginBottom: 32,
    alignItems: 'flex-start',
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
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
});
