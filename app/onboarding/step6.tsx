/**
 * Onboarding Step 6 - Configuración de Alertas
 * Configuración de qué alertas recibir y con qué frecuencia
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
import { AlertToggle } from '@/components/onboarding/alert-toggle';
import type { 
  OnboardingData, 
  ONBOARDING_STORAGE_KEY,
  OnboardingStep6,
  DEFAULT_ALERTS
} from '@/types/onboarding';

type AlertFrequency = 'realtime' | 'daily' | 'weekly';

export default function OnboardingStep6Screen() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const primaryColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');

  const [alerts, setAlerts] = useState<OnboardingStep6['alerts']>(DEFAULT_ALERTS);
  const [frequency, setFrequency] = useState<AlertFrequency>('realtime');

  // Load saved data on mount
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const saved = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (saved) {
        const data: OnboardingData = JSON.parse(saved);
        if (data.step6) {
          setAlerts(data.step6.alerts);
          setFrequency(data.step6.alertFrequency);
        }
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const handleToggleAlert = (key: keyof OnboardingStep6['alerts']) => {
    setAlerts({ ...alerts, [key]: !alerts[key] });
  };

  const handleNext = async () => {
    try {
      // Save data
      const saved = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      const data: OnboardingData = saved ? JSON.parse(saved) : {};
      
      data.step6 = {
        alerts,
        alertFrequency: frequency,
      };

      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data));
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/onboarding/step7');
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
    await markStepAsSkipped(6);
    router.push('/onboarding/step7');
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
                  { backgroundColor: primaryColor, width: '75%' },
                ]}
              />
            </View>
            <ThemedText style={styles.progressText}>Paso 6 de 8</ThemedText>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <ThemedText style={styles.title}>Configuración de Alertas</ThemedText>
          <ThemedText style={styles.subtitle}>
            Decide qué alertas quieres recibir
          </ThemedText>
        </View>

        {/* Pianos Section */}
        <ThemedText style={styles.sectionTitle}>Pianos</ThemedText>
        <AlertToggle
          icon="pianokeys"
          title="Afinación requerida"
          description="Cada 6 meses desde la última afinación"
          enabled={alerts.pianoTuning}
          onToggle={() => handleToggleAlert('pianoTuning')}
        />
        <AlertToggle
          icon="slider.horizontal.3"
          title="Regulación requerida"
          description="Cada 12 meses desde la última regulación"
          enabled={alerts.pianoRegulation}
          onToggle={() => handleToggleAlert('pianoRegulation')}
        />
        <AlertToggle
          icon="wrench.and.screwdriver"
          title="Mantenimiento general"
          description="Cada 3 meses desde el último mantenimiento"
          enabled={alerts.pianoMaintenance}
          onToggle={() => handleToggleAlert('pianoMaintenance')}
        />

        {/* Presupuestos Section */}
        <ThemedText style={styles.sectionTitle}>Presupuestos</ThemedText>
        <AlertToggle
          icon="doc.text"
          title="Presupuestos pendientes"
          description="Presupuestos enviados esperando respuesta"
          enabled={alerts.quotesPending}
          onToggle={() => handleToggleAlert('quotesPending')}
        />
        <AlertToggle
          icon="clock"
          title="Presupuestos próximos a expirar"
          description="Presupuestos que expiran en menos de 7 días"
          enabled={alerts.quotesExpiring}
          onToggle={() => handleToggleAlert('quotesExpiring')}
        />

        {/* Facturas Section */}
        <ThemedText style={styles.sectionTitle}>Facturas</ThemedText>
        <AlertToggle
          icon="dollarsign.circle"
          title="Facturas pendientes"
          description="Facturas enviadas pendientes de pago"
          enabled={alerts.invoicesPending}
          onToggle={() => handleToggleAlert('invoicesPending')}
        />
        <AlertToggle
          icon="exclamationmark.triangle"
          title="Facturas vencidas"
          description="Facturas con fecha de vencimiento pasada"
          enabled={alerts.invoicesOverdue}
          onToggle={() => handleToggleAlert('invoicesOverdue')}
        />

        {/* Citas Section */}
        <ThemedText style={styles.sectionTitle}>Citas</ThemedText>
        <AlertToggle
          icon="calendar.badge.clock"
          title="Citas próximas"
          description="Recordatorio 24 horas antes de la cita"
          enabled={alerts.upcomingAppointments}
          onToggle={() => handleToggleAlert('upcomingAppointments')}
        />
        <AlertToggle
          icon="questionmark.circle"
          title="Citas sin confirmar"
          description="Citas creadas que no han sido confirmadas"
          enabled={alerts.unconfirmedAppointments}
          onToggle={() => handleToggleAlert('unconfirmedAppointments')}
        />

        {/* Frequency Section */}
        <ThemedText style={styles.sectionTitle}>Frecuencia de verificación</ThemedText>
        <ThemedView style={[styles.frequencyContainer, { backgroundColor: cardBg, borderColor }]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFrequency('realtime');
            }}
            style={[
              styles.frequencyOption,
              frequency === 'realtime' && { backgroundColor: `${primaryColor}15` },
            ]}
          >
            <View style={styles.frequencyLeft}>
              <IconSymbol name="bolt.fill" size={20} color={primaryColor} />
              <ThemedText style={styles.frequencyTitle}>Tiempo real</ThemedText>
            </View>
            {frequency === 'realtime' && (
              <IconSymbol name="checkmark.circle.fill" size={20} color={primaryColor} />
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFrequency('daily');
            }}
            style={[
              styles.frequencyOption,
              frequency === 'daily' && { backgroundColor: `${primaryColor}15` },
            ]}
          >
            <View style={styles.frequencyLeft}>
              <IconSymbol name="sun.max.fill" size={20} color={primaryColor} />
              <ThemedText style={styles.frequencyTitle}>Diaria (9:00 AM)</ThemedText>
            </View>
            {frequency === 'daily' && (
              <IconSymbol name="checkmark.circle.fill" size={20} color={primaryColor} />
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFrequency('weekly');
            }}
            style={[
              styles.frequencyOption,
              frequency === 'weekly' && { backgroundColor: `${primaryColor}15` },
            ]}
          >
            <View style={styles.frequencyLeft}>
              <IconSymbol name="calendar" size={20} color={primaryColor} />
              <ThemedText style={styles.frequencyTitle}>Semanal (Lunes 9:00 AM)</ThemedText>
            </View>
            {frequency === 'weekly' && (
              <IconSymbol name="checkmark.circle.fill" size={20} color={primaryColor} />
            )}
          </Pressable>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 16,
  },
  frequencyContainer: {
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 32,
  },
  frequencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  frequencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  frequencyTitle: {
    fontSize: 15,
    fontWeight: '500',
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
