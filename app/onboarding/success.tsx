/**
 * Onboarding Success Screen
 * Pantalla de confirmación exitosa del registro
 */
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
} from 'react-native-reanimated';

export default function OnboardingSuccessScreen() {
  const router = useRouter();
  const primaryColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  // Animation values
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Trigger success haptic
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Animate checkmark
    scale.value = withSequence(
      withSpring(1.2, { damping: 10 }),
      withSpring(1)
    );
    opacity.value = withDelay(200, withSpring(1));
  }, []);

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
        <Animated.View style={[styles.iconContainer, checkmarkStyle]}>
          <View style={[styles.iconCircle, { backgroundColor: primaryColor + '20' }]}>
            <IconSymbol name="checkmark.circle.fill" size={120} color={primaryColor} />
          </View>
        </Animated.View>

        {/* Content */}
        <Animated.View style={[styles.content, contentStyle]}>
          <ThemedText style={styles.title}>
            ¡Todo listo!
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Tu espacio de trabajo ha sido creado exitosamente
          </ThemedText>

          {/* Features */}
          <View style={styles.featuresContainer}>
            <FeatureItem
              icon="person.2"
              title="Gestión de Clientes"
              description="Administra tus clientes y sus pianos"
              color={primaryColor}
            />
            <FeatureItem
              icon="calendar"
              title="Servicios y Citas"
              description="Programa y gestiona servicios de afinación"
              color={primaryColor}
            />
            <FeatureItem
              icon="chart.bar"
              title="Reportes y Análisis"
              description="Obtén insights de tu negocio"
              color={primaryColor}
            />
            <FeatureItem
              icon="gear"
              title="Configuración Completa"
              description="Personaliza todo a tu medida"
              color={primaryColor}
            />
          </View>

          {/* Next Steps */}
          <ThemedView style={styles.nextStepsBox}>
            <ThemedText style={styles.nextStepsTitle}>
              Próximos pasos sugeridos:
            </ThemedText>
            <View style={styles.stepsList}>
              <StepItem number={1} text="Invita a tu equipo" />
              <StepItem number={2} text="Agrega tus primeros clientes" />
              <StepItem number={3} text="Configura tu catálogo de servicios" />
              <StepItem number={4} text="Personaliza los umbrales de alertas (Configuración)" />
              <StepItem number={5} text="Explora el panel de control" />
            </View>
          </ThemedView>

          {/* Continue Button */}
          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              { backgroundColor: primaryColor },
              pressed && styles.buttonPressed,
            ]}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Ir al Panel de Control</Text>
            <IconSymbol name="arrow.right" size={20} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// COMPONENTES
// ============================================================================

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
  color: string;
}

function FeatureItem({ icon, title, description, color }: FeatureItemProps) {
  const cardBackground = useThemeColor({}, 'cardBackground');
  const subtextColor = useThemeColor({}, 'subtext');

  return (
    <ThemedView style={[styles.featureCard, { backgroundColor: cardBackground }]}>
      <View style={[styles.featureIcon, { backgroundColor: color + '15' }]}>
        <IconSymbol name={icon} size={24} color={color} />
      </View>
      <View style={styles.featureContent}>
        <ThemedText style={styles.featureTitle}>{title}</ThemedText>
        <ThemedText style={[styles.featureDescription, { color: subtextColor }]}>
          {description}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

interface StepItemProps {
  number: number;
  text: string;
}

function StepItem({ number, text }: StepItemProps) {
  const primaryColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  return (
    <View style={styles.stepItem}>
      <View style={[styles.stepNumber, { backgroundColor: primaryColor + '20' }]}>
        <Text style={[styles.stepNumberText, { color: primaryColor }]}>
          {number}
        </Text>
      </View>
      <ThemedText style={styles.stepText}>{text}</ThemedText>
    </View>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginTop: 40,
    marginBottom: 32,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 40,
  },
  featuresContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  featureCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 4,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  nextStepsBox: {
    width: '100%',
    padding: 20,
    borderRadius: 4,
    marginBottom: 32,
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  stepsList: {
    gap: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
  },
  continueButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 4,
    gap: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
