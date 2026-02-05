/**
 * Onboarding Welcome Screen
 * Pantalla de bienvenida al proceso de registro de nuevo partner
 */
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import * as Haptics from 'expo-haptics';

export default function OnboardingWelcomeScreen() {
  const router = useRouter();
  const primaryColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/step1');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'bottom']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: primaryColor + '20' }]}>
            <IconSymbol name="music.note" size={64} color={primaryColor} />
          </View>
          <ThemedText style={styles.title}>
            ¡Bienvenido a Piano Emotion!
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Configura tu espacio de trabajo en 8 pasos
          </ThemedText>
        </View>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          <StepCard
            icon="building.2"
            title="1-2. Información de la Empresa"
            description="Datos básicos y fiscales de tu negocio"
            color={primaryColor}
          />
          <StepCard
            icon="gearshape"
            title="3-4. Configuración Inicial"
            description="Modo de negocio y preferencias de comunicación"
            color={primaryColor}
          />
          <StepCard
            icon="wrench.and.screwdriver"
            title="5. Servicios y Tareas"
            description="Define los servicios que ofreces y sus tareas"
            color={primaryColor}
          />
          <StepCard
            icon="bell"
            title="6-7. Alertas y Notificaciones"
            description="Configura alertas y sincronización de calendario"
            color={primaryColor}
          />
          <StepCard
            icon="paintbrush"
            title="8. Personalización"
            description="Logo y colores corporativos"
            color={primaryColor}
          />
        </View>

        {/* Info */}
        <ThemedView style={styles.infoBox}>
          <IconSymbol name="info.circle" size={20} color={primaryColor} />
          <ThemedText style={styles.infoText}>
            Podrás modificar toda esta información más adelante desde la configuración
          </ThemedText>
        </ThemedView>

        {/* Start Button */}
        <Pressable
          style={({ pressed }) => [
            styles.startButton,
            { backgroundColor: primaryColor },
            pressed && styles.buttonPressed,
          ]}
          onPress={handleStart}
        >
          <Text style={styles.startButtonText}>Comenzar</Text>
          <IconSymbol name="arrow.right" size={20} color="#FFFFFF" />
        </Pressable>

        {/* Skip */}
        <Pressable
          style={styles.skipButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.replace('/(tabs)');
          }}
        >
          <ThemedText style={styles.skipText}>
            Omitir por ahora
          </ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// COMPONENTES
// ============================================================================

interface StepCardProps {
  icon: string;
  title: string;
  description: string;
  color: string;
}

function StepCard({ icon, title, description, color }: StepCardProps) {
  const cardBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'subtext');

  return (
    <ThemedView style={[styles.stepCard, { backgroundColor: cardBackground }]}>
      <View style={[styles.stepIconContainer, { backgroundColor: color + '15' }]}>
        <IconSymbol name={icon} size={28} color={color} />
      </View>
      <View style={styles.stepContent}>
        <ThemedText style={styles.stepTitle}>{title}</ThemedText>
        <ThemedText style={[styles.stepDescription, { color: subtextColor }]}>
          {description}
        </ThemedText>
      </View>
    </ThemedView>
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
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  stepsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  stepCard: {
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
  stepIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 4,
    gap: 12,
    marginBottom: 32,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 4,
    gap: 8,
    marginBottom: 16,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    opacity: 0.6,
  },
});
