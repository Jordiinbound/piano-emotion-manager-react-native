/**
 * Onboarding Step 7 - Notificaciones y Calendario
 * Configuración de notificaciones push/email y sincronización de calendario
 */
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSnackbar } from '@/hooks/use-snackbar';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { 
  OnboardingData, 
  ONBOARDING_STORAGE_KEY,
  OnboardingStep7
} from '@/types/onboarding';

export default function OnboardingStep7Screen() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const primaryColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [calendarSync, setCalendarSync] = useState<OnboardingStep7['calendarSync']>('none');

  // Load saved data on mount
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const saved = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (saved) {
        const data: OnboardingData = JSON.parse(saved);
        if (data.step7) {
          setPushEnabled(data.step7.pushNotifications);
          setEmailEnabled(data.step7.emailNotifications);
          setCalendarSync(data.step7.calendarSync);
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
      
      data.step7 = {
        pushNotifications: pushEnabled,
        emailNotifications: emailEnabled,
        calendarSync,
      };

      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data));
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/onboarding/step8');
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
    await markStepAsSkipped(7);
    router.push('/onboarding/step8');
  };

  const handleSelectCalendar = (type: OnboardingStep7['calendarSync']) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCalendarSync(type);
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
                  { backgroundColor: primaryColor, width: '87.5%' },
                ]}
              />
            </View>
            <ThemedText style={styles.progressText}>Paso 7 de 8</ThemedText>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <ThemedText style={styles.title}>Notificaciones</ThemedText>
          <ThemedText style={styles.subtitle}>
            Configura cómo quieres recibir notificaciones
          </ThemedText>
        </View>

        {/* Notifications Section */}
        <ThemedText style={styles.sectionTitle}>Canales de Notificación</ThemedText>
        
        <ThemedView style={[styles.notificationCard, { backgroundColor: cardBg, borderColor }]}>
          <View style={[styles.iconContainer, { backgroundColor: `${primaryColor}15` }]}>
            <IconSymbol name="bell.fill" size={24} color={primaryColor} />
          </View>
          <View style={styles.notificationContent}>
            <ThemedText style={styles.notificationTitle}>Notificaciones Push</ThemedText>
            <ThemedText style={[styles.notificationDescription, { color: textSecondary }]}>
              Recibe alertas en tiempo real en tu dispositivo
            </ThemedText>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={(value) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPushEnabled(value);
            }}
            trackColor={{ false: borderColor, true: primaryColor }}
            thumbColor="#FFFFFF"
          />
        </ThemedView>

        <ThemedView style={[styles.notificationCard, { backgroundColor: cardBg, borderColor }]}>
          <View style={[styles.iconContainer, { backgroundColor: `${primaryColor}15` }]}>
            <IconSymbol name="envelope.fill" size={24} color={primaryColor} />
          </View>
          <View style={styles.notificationContent}>
            <ThemedText style={styles.notificationTitle}>Notificaciones por Email</ThemedText>
            <ThemedText style={[styles.notificationDescription, { color: textSecondary }]}>
              Recibe resúmenes diarios por correo electrónico
            </ThemedText>
          </View>
          <Switch
            value={emailEnabled}
            onValueChange={(value) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setEmailEnabled(value);
            }}
            trackColor={{ false: borderColor, true: primaryColor }}
            thumbColor="#FFFFFF"
          />
        </ThemedView>

        {/* Calendar Sync Section */}
        <ThemedText style={styles.sectionTitle}>Sincronización de Calendario</ThemedText>
        <ThemedText style={[styles.sectionDescription, { color: textSecondary }]}>
          Sincroniza tus citas automáticamente con tu calendario
        </ThemedText>

        <View style={styles.calendarOptions}>
          {/* None */}
          <Pressable
            onPress={() => handleSelectCalendar('none')}
            style={({ pressed }) => [
              styles.calendarOption,
              {
                backgroundColor: cardBg,
                borderColor: calendarSync === 'none' ? primaryColor : borderColor,
                borderWidth: calendarSync === 'none' ? 2 : 1,
              },
              pressed && styles.optionPressed,
            ]}
          >
            <View style={[styles.calendarIconContainer, { backgroundColor: '#6B728015' }]}>
              <IconSymbol name="xmark" size={24} color="#6B7280" />
            </View>
            <View style={styles.calendarContent}>
              <ThemedText style={styles.calendarTitle}>No sincronizar</ThemedText>
              <ThemedText style={[styles.calendarDescription, { color: textSecondary }]}>
                Gestiona las citas solo en Piano Emotion
              </ThemedText>
            </View>
            {calendarSync === 'none' && (
              <IconSymbol name="checkmark.circle.fill" size={24} color={primaryColor} />
            )}
          </Pressable>

          {/* Google */}
          <Pressable
            onPress={() => handleSelectCalendar('google')}
            style={({ pressed }) => [
              styles.calendarOption,
              {
                backgroundColor: cardBg,
                borderColor: calendarSync === 'google' ? primaryColor : borderColor,
                borderWidth: calendarSync === 'google' ? 2 : 1,
              },
              pressed && styles.optionPressed,
            ]}
          >
            <View style={[styles.calendarIconContainer, { backgroundColor: '#EA433515' }]}>
              <IconSymbol name="calendar" size={24} color="#EA4335" />
            </View>
            <View style={styles.calendarContent}>
              <ThemedText style={styles.calendarTitle}>Google Calendar</ThemedText>
              <ThemedText style={[styles.calendarDescription, { color: textSecondary }]}>
                Sincroniza con tu cuenta de Google
              </ThemedText>
            </View>
            {calendarSync === 'google' && (
              <IconSymbol name="checkmark.circle.fill" size={24} color={primaryColor} />
            )}
          </Pressable>

          {/* Outlook */}
          <Pressable
            onPress={() => handleSelectCalendar('outlook')}
            style={({ pressed }) => [
              styles.calendarOption,
              {
                backgroundColor: cardBg,
                borderColor: calendarSync === 'outlook' ? primaryColor : borderColor,
                borderWidth: calendarSync === 'outlook' ? 2 : 1,
              },
              pressed && styles.optionPressed,
            ]}
          >
            <View style={[styles.calendarIconContainer, { backgroundColor: '#0078D415' }]}>
              <IconSymbol name="calendar.badge.clock" size={24} color="#0078D4" />
            </View>
            <View style={styles.calendarContent}>
              <ThemedText style={styles.calendarTitle}>Outlook Calendar</ThemedText>
              <ThemedText style={[styles.calendarDescription, { color: textSecondary }]}>
                Sincroniza con tu cuenta de Microsoft
              </ThemedText>
            </View>
            {calendarSync === 'outlook' && (
              <IconSymbol name="checkmark.circle.fill" size={24} color={primaryColor} />
            )}
          </Pressable>
        </View>

        {/* Info */}
        {calendarSync !== 'none' && (
          <ThemedView style={[styles.infoBox, { backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}30` }]}>
            <IconSymbol name="info.circle" size={20} color={primaryColor} />
            <ThemedText style={styles.infoText}>
              La sincronización se configurará después de completar el onboarding
            </ThemedText>
          </ThemedView>
        )}

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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  calendarOptions: {
    gap: 12,
    marginBottom: 16,
  },
  calendarOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 4,
    gap: 12,
  },
  optionPressed: {
    opacity: 0.8,
  },
  calendarIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarContent: {
    flex: 1,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  calendarDescription: {
    fontSize: 13,
    lineHeight: 18,
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
