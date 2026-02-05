/**
 * Onboarding Step 3 - Modo de Negocio
 * Selección del modo: Individual o Equipo
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

type BusinessMode = 'individual' | 'team';

export default function OnboardingStep3Screen() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const primaryColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');

  const [selectedMode, setSelectedMode] = useState<BusinessMode | null>(null);

  // Load saved data on mount
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const saved = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (saved) {
        const data: OnboardingData = JSON.parse(saved);
        if (data.step3) {
          setSelectedMode(data.step3.businessMode);
        }
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const handleNext = async () => {
    if (!selectedMode) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showSnackbar('Por favor, selecciona un modo de negocio', 'error');
      return;
    }

    try {
      // Save data
      const saved = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      const data: OnboardingData = saved ? JSON.parse(saved) : {};
      
      data.step3 = {
        businessMode: selectedMode,
      };

      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data));
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/onboarding/step4');
    } catch (error) {
      console.error('Error saving data:', error);
      showSnackbar('Error al guardar los datos', 'error');
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleSelectMode = (mode: BusinessMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMode(mode);
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
                  { backgroundColor: primaryColor, width: '37.5%' },
                ]}
              />
            </View>
            <ThemedText style={styles.progressText}>Paso 3 de 8</ThemedText>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <ThemedText style={styles.title}>Modo de Negocio</ThemedText>
          <ThemedText style={styles.subtitle}>
            ¿Trabajas solo o con un equipo?
          </ThemedText>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {/* Individual */}
          <Pressable
            onPress={() => handleSelectMode('individual')}
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: cardBg,
                borderColor: selectedMode === 'individual' ? primaryColor : borderColor,
                borderWidth: selectedMode === 'individual' ? 2 : 1,
              },
              pressed && styles.optionPressed,
            ]}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${primaryColor}15` }]}>
              <IconSymbol name="person.fill" size={32} color={primaryColor} />
            </View>
            <View style={styles.optionContent}>
              <ThemedText style={styles.optionTitle}>Individual</ThemedText>
              <ThemedText style={[styles.optionDescription, { color: textSecondary }]}>
                Trabajo solo, gestión personal de clientes y servicios
              </ThemedText>
            </View>
            {selectedMode === 'individual' && (
              <View style={styles.checkmark}>
                <IconSymbol name="checkmark.circle.fill" size={24} color={primaryColor} />
              </View>
            )}
          </Pressable>

          {/* Team */}
          <Pressable
            onPress={() => handleSelectMode('team')}
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: cardBg,
                borderColor: selectedMode === 'team' ? primaryColor : borderColor,
                borderWidth: selectedMode === 'team' ? 2 : 1,
              },
              pressed && styles.optionPressed,
            ]}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${primaryColor}15` }]}>
              <IconSymbol name="person.3.fill" size={32} color={primaryColor} />
            </View>
            <View style={styles.optionContent}>
              <ThemedText style={styles.optionTitle}>Equipo</ThemedText>
              <ThemedText style={[styles.optionDescription, { color: textSecondary }]}>
                Trabajo con un equipo, asignación de tareas y colaboración
              </ThemedText>
            </View>
            {selectedMode === 'team' && (
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
            Podrás cambiar esta configuración más adelante desde los ajustes
          </ThemedText>
        </ThemedView>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.nextButton,
              { backgroundColor: primaryColor },
              !selectedMode && styles.nextButtonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleNext}
            disabled={!selectedMode}
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
    width: 60,
    height: 60,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
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
  nextButtonDisabled: {
    opacity: 0.5,
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
