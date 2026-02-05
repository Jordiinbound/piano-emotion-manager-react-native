/**
 * Pending Configuration Page
 * Muestra los pasos del onboarding que fueron omitidos y permite completarlos
 */
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import * as Haptics from 'expo-haptics';
import { getSkippedSteps, getStepInfo } from '@/utils/onboarding-helpers';

export default function PendingConfigurationScreen() {
  const router = useRouter();
  const primaryColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  const [skippedSteps, setSkippedSteps] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSkippedSteps();
  }, []);

  const loadSkippedSteps = async () => {
    try {
      setLoading(true);
      const steps = await getSkippedSteps();
      setSkippedSteps(steps.sort((a, b) => a - b));
    } catch (error) {
      console.error('Error loading skipped steps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStepPress = (stepNumber: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const stepInfo = getStepInfo(stepNumber);
    router.push(stepInfo.route as any);
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <ThemedText style={styles.loadingText}>Cargando...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <IconSymbol name="arrow.left" size={24} color={textColor} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Configuración Pendiente</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {skippedSteps.length === 0 ? (
          // No hay pasos pendientes
          <View style={styles.emptyState}>
            <IconSymbol
              name="checkmark.circle.fill"
              size={64}
              color={primaryColor}
              style={styles.emptyIcon}
            />
            <ThemedText style={styles.emptyTitle}>
              ¡Todo Configurado!
            </ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              No tienes configuraciones pendientes. Has completado todos los pasos del onboarding.
            </ThemedText>
          </View>
        ) : (
          // Lista de pasos pendientes
          <>
            <View style={styles.infoCard}>
              <IconSymbol name="info.circle" size={24} color={primaryColor} />
              <View style={styles.infoTextContainer}>
                <ThemedText style={styles.infoTitle}>
                  Completa tu Configuración
                </ThemedText>
                <ThemedText style={styles.infoText}>
                  Tienes {skippedSteps.length} paso{skippedSteps.length > 1 ? 's' : ''} pendiente{skippedSteps.length > 1 ? 's' : ''} de configurar. 
                  Puedes completarlos ahora o más tarde.
                </ThemedText>
              </View>
            </View>

            <View style={styles.stepsContainer}>
              {skippedSteps.map((stepNumber) => {
                const stepInfo = getStepInfo(stepNumber);
                return (
                  <Pressable
                    key={stepNumber}
                    style={({ pressed }) => [
                      styles.stepCard,
                      { backgroundColor: cardBackground, borderColor },
                      pressed && styles.stepCardPressed,
                    ]}
                    onPress={() => handleStepPress(stepNumber)}
                  >
                    <View style={styles.stepIconContainer}>
                      <View style={[styles.stepIcon, { backgroundColor: primaryColor + '20' }]}>
                        <Text style={[styles.stepNumber, { color: primaryColor }]}>
                          {stepNumber}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.stepContent}>
                      <ThemedText style={styles.stepTitle}>
                        {stepInfo.title}
                      </ThemedText>
                      <ThemedText style={styles.stepDescription}>
                        {stepInfo.description}
                      </ThemedText>
                    </View>

                    <IconSymbol
                      name="chevron.right"
                      size={20}
                      color={textColor + '60'}
                    />
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 24,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 4,
    backgroundColor: '#3b82f620',
    marginBottom: 24,
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
    gap: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
  stepsContainer: {
    gap: 12,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    gap: 16,
  },
  stepCardPressed: {
    opacity: 0.7,
  },
  stepIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  stepDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
});
