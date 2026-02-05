import { useEffect, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BorderRadius, Spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TutorialStep {
  id: string;
  icon: string;
  iconColor: string;
  title: string;
  description: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    icon: 'star.fill',
    iconColor: '#F59E0B',
    title: '¡Bienvenido a Piano Emotion Manager!',
    description: 'Tu asistente completo para gestionar clientes, pianos, servicios y facturación. Te guiaremos en los primeros pasos.',
  },
  {
    id: 'clients',
    icon: 'person.2.fill',
    iconColor: '#3B82F6',
    title: 'Gestiona tus Clientes',
    description: 'Añade clientes con sus datos de contacto, dirección fiscal y de envío. La validación de NIF/CIF es automática.',
  },
  {
    id: 'pianos',
    icon: 'pianokeys',
    iconColor: '#8B5CF6',
    title: 'Registra los Pianos',
    description: 'Cada piano tiene su ficha con marca, modelo, número de serie y ubicación. Vincula cada piano a su propietario.',
  },
  {
    id: 'services',
    icon: 'wrench.fill',
    iconColor: '#10B981',
    title: 'Registra tus Servicios',
    description: 'Afinaciones, reparaciones, regulaciones... Registra cada servicio con fecha, tipo, coste y materiales usados.',
  },
  {
    id: 'invoices',
    icon: 'doc.text.fill',
    iconColor: '#EC4899',
    title: 'Genera Facturas',
    description: 'Crea facturas profesionales en PDF. Importa servicios con sus materiales automáticamente y envíalas por email.',
  },
  {
    id: 'inventory',
    icon: 'shippingbox.fill',
    iconColor: '#F97316',
    title: 'Controla tu Inventario',
    description: 'Gestiona materiales, proveedores y stock. Recibe alertas cuando el stock esté bajo y contacta proveedores directamente.',
  },
  {
    id: 'ready',
    icon: 'checkmark.circle.fill',
    iconColor: '#10B981',
    title: '¡Todo listo!',
    description: 'Ya conoces las funciones principales. Explora la sección de Ayuda en el Dashboard si necesitas más información.',
  },
];

const STORAGE_KEY = '@piano_emotion_tutorial_completed';

interface OnboardingTutorialProps {
  onComplete?: () => void;
}

export function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkTutorialStatus();
  }, []);

  const checkTutorialStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(STORAGE_KEY);
      if (completed !== 'true') {
        setVisible(true);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  };

  const handlePrevious = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    completeTutorial();
  };

  const completeTutorial = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
      setVisible(false);
      onComplete?.();
    } catch (error) {
    }
  };

  if (loading || !visible) {
    return null;
  }

  const step = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#FFFFFF', '#F8FAFC']}
            style={styles.card}
          >
            {/* Skip button */}
            {!isLastStep && (
              <Pressable style={styles.skipButton} onPress={handleSkip}>
                <ThemedText style={styles.skipText}>Omitir</ThemedText>
              </Pressable>
            )}

            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: step.iconColor + '20' }]}>
              <IconSymbol name={step.icon as any} size={48} color={step.iconColor} />
            </View>

            {/* Content */}
            <ThemedText style={styles.title}>{step.title}</ThemedText>
            <ThemedText style={styles.description}>{step.description}</ThemedText>

            {/* Progress dots */}
            <View style={styles.dotsContainer}>
              {tutorialSteps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentStep && styles.dotActive,
                    index < currentStep && styles.dotCompleted,
                  ]}
                />
              ))}
            </View>

            {/* Navigation buttons */}
            <View style={styles.buttonsContainer}>
              {!isFirstStep && (
                <Pressable style={styles.secondaryButton} onPress={handlePrevious}>
                  <IconSymbol name="chevron.left" size={20} color="#6B7280" />
                  <ThemedText style={styles.secondaryButtonText}>Anterior</ThemedText>
                </Pressable>
              )}
              <Pressable
                style={[styles.primaryButton, isFirstStep && styles.primaryButtonFull]}
                onPress={handleNext}
              >
                <ThemedText style={styles.primaryButtonText}>
                  {isLastStep ? 'Comenzar' : 'Siguiente'}
                </ThemedText>
                {!isLastStep && (
                  <IconSymbol name="chevron.right" size={20} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

// Export function to reset tutorial (for testing or settings)
export async function resetTutorial() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    return false;
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  skipButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.sm,
  },
  skipText: {
    fontSize: 14,
    color: '#6B7280',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    marginTop: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#3B82F6',
  },
  dotCompleted: {
    backgroundColor: '#10B981',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
    minHeight: 48,
  },
  primaryButtonFull: {
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: Spacing.xs,
    minHeight: 48,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
});
