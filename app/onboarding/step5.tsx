/**
 * Onboarding Step 5 - Tipos de Servicios y Tareas
 * Configuración de servicios ofrecidos con sus tareas específicas
 */
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSnackbar } from '@/hooks/use-snackbar';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ServiceTypeCard } from '@/components/onboarding/service-type-card';
import type { 
  OnboardingData, 
  ONBOARDING_STORAGE_KEY,
  ServiceType,
  DEFAULT_SERVICE_TYPES 
} from '@/types/onboarding';

export default function OnboardingStep5Screen() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const primaryColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');

  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [hasLoadedDefaults, setHasLoadedDefaults] = useState(false);

  // Load saved data on mount
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const saved = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (saved) {
        const data: OnboardingData = JSON.parse(saved);
        if (data.step5 && data.step5.serviceTypes.length > 0) {
          setServiceTypes(data.step5.serviceTypes);
          setHasLoadedDefaults(true);
        }
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const handleLoadDefaults = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setServiceTypes([...DEFAULT_SERVICE_TYPES]);
    setHasLoadedDefaults(true);
    showSnackbar('Servicios predefinidos cargados', 'success');
  };

  const handleAddService = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newService: ServiceType = {
      id: `service-${Date.now()}`,
      name: 'Nuevo Servicio',
      price: 0,
      duration: 1,
      tasks: [
        {
          id: `task-${Date.now()}`,
          description: 'Nueva tarea',
          completed: false,
        },
      ],
    };
    setServiceTypes([...serviceTypes, newService]);
  };

  const handleUpdateService = (index: number, updatedService: ServiceType) => {
    const newServices = [...serviceTypes];
    newServices[index] = updatedService;
    setServiceTypes(newServices);
  };

  const handleDeleteService = (index: number) => {
    Alert.alert(
      'Eliminar servicio',
      '¿Estás seguro de que quieres eliminar este servicio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const newServices = serviceTypes.filter((_, i) => i !== index);
            setServiceTypes(newServices);
            showSnackbar('Servicio eliminado', 'success');
          },
        },
      ]
    );
  };

  const validateServices = (): boolean => {
    if (serviceTypes.length === 0) {
      showSnackbar('Debes configurar al menos un servicio', 'error');
      return false;
    }

    for (const service of serviceTypes) {
      if (!service.name.trim()) {
        showSnackbar('Todos los servicios deben tener un nombre', 'error');
        return false;
      }
      if (service.price <= 0) {
        showSnackbar(`El servicio "${service.name}" debe tener un precio mayor a 0`, 'error');
        return false;
      }
      if (service.duration <= 0) {
        showSnackbar(`El servicio "${service.name}" debe tener una duración mayor a 0`, 'error');
        return false;
      }
      if (service.tasks.length === 0) {
        showSnackbar(`El servicio "${service.name}" debe tener al menos una tarea`, 'error');
        return false;
      }
      for (const task of service.tasks) {
        if (!task.description.trim()) {
          showSnackbar(`Todas las tareas del servicio "${service.name}" deben tener descripción`, 'error');
          return false;
        }
      }
    }

    return true;
  };

  const handleNext = async () => {
    if (!validateServices()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      // Save data
      const saved = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      const data: OnboardingData = saved ? JSON.parse(saved) : {};
      
      data.step5 = {
        serviceTypes,
      };

      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data));
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/onboarding/step6');
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
    await markStepAsSkipped(5);
    router.push('/onboarding/step6');
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
                  { backgroundColor: primaryColor, width: '62.5%' },
                ]}
              />
            </View>
            <ThemedText style={styles.progressText}>Paso 5 de 8</ThemedText>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <ThemedText style={styles.title}>Servicios y Tareas</ThemedText>
          <ThemedText style={styles.subtitle}>
            Define los servicios que ofreces y las tareas de cada uno
          </ThemedText>
        </View>

        {/* Empty State or Load Defaults */}
        {serviceTypes.length === 0 && !hasLoadedDefaults && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: `${primaryColor}15` }]}>
              <IconSymbol name="wrench.and.screwdriver" size={48} color={primaryColor} />
            </View>
            <ThemedText style={styles.emptyTitle}>Configura tus servicios</ThemedText>
            <ThemedText style={styles.emptyDescription}>
              Puedes cargar servicios predefinidos o crear los tuyos desde cero
            </ThemedText>
            
            <Pressable
              style={({ pressed }) => [
                styles.loadDefaultsButton,
                { backgroundColor: primaryColor },
                pressed && styles.buttonPressed,
              ]}
              onPress={handleLoadDefaults}
            >
              <IconSymbol name="sparkles" size={20} color="#FFFFFF" />
              <Text style={styles.loadDefaultsButtonText}>Usar servicios predefinidos</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.addFirstButton,
                { borderColor },
                pressed && styles.buttonPressed,
              ]}
              onPress={handleAddService}
            >
              <IconSymbol name="plus.circle" size={20} color={primaryColor} />
              <ThemedText style={[styles.addFirstButtonText, { color: primaryColor }]}>
                Crear desde cero
              </ThemedText>
            </Pressable>
          </View>
        )}

        {/* Service List */}
        {serviceTypes.length > 0 && (
          <View style={styles.serviceList}>
            {serviceTypes.map((service, index) => (
              <ServiceTypeCard
                key={service.id}
                service={service}
                onUpdate={(updated) => handleUpdateService(index, updated)}
                onDelete={() => handleDeleteService(index)}
              />
            ))}

            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                { borderColor },
                pressed && styles.buttonPressed,
              ]}
              onPress={handleAddService}
            >
              <IconSymbol name="plus.circle" size={24} color={primaryColor} />
              <ThemedText style={[styles.addButtonText, { color: primaryColor }]}>
                Agregar otro servicio
              </ThemedText>
            </Pressable>
          </View>
        )}

        {/* Buttons */}
        {serviceTypes.length > 0 && (
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

            <Pressable
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <ThemedText style={styles.skipText}>Omitir por ahora</ThemedText>
            </Pressable>
          </View>
        )}
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 32,
  },
  loadDefaultsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 4,
    gap: 8,
    width: '100%',
    marginBottom: 12,
  },
  loadDefaultsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 4,
    gap: 8,
    width: '100%',
    borderWidth: 2,
  },
  addFirstButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  serviceList: {
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 4,
    gap: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
