/**
 * Dashboard Editor Tutorial
 * Tutorial integrado que explica cómo usar el Dashboard Editor
 */

import React, { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface TutorialStep {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: '¡Bienvenido al Dashboard Editor!',
    description: 'Personaliza completamente tu dashboard con widgets arrastrables, accesos rápidos configurables y visualizaciones de datos en tiempo real. Esta funcionalidad está disponible exclusivamente para usuarios Pro y Premium.',
    icon: 'diamond',
    iconColor: '#3B82F6',
  },
  {
    title: 'Añade Widgets',
    description: 'Activa el modo edición y explora el catálogo de widgets disponibles. Puedes añadir estadísticas, gráficos, listas de clientes, servicios recientes, y mucho más. Cada widget muestra datos reales de tu negocio.',
    icon: 'add-circle',
    iconColor: '#10B981',
  },
  {
    title: 'Organiza tu Dashboard',
    description: 'Elimina los widgets que no necesites haciendo clic en el icono de papelera. Los cambios se guardan automáticamente y se reflejan inmediatamente en tu dashboard principal.',
    icon: 'grid',
    iconColor: '#F59E0B',
  },
  {
    title: 'Widgets Interactivos',
    description: 'Todos los widgets son completamente funcionales. Puedes hacer clic en ellos para navegar a los módulos correspondientes, ver detalles, y realizar acciones. Los gráficos incluyen selectores de período y datos filtrados.',
    icon: 'stats-chart',
    iconColor: '#8B5CF6',
  },
  {
    title: 'Tipos de Widgets Disponibles',
    description: 'Explora 25+ tipos de widgets organizados por categorías: Secciones principales (Alertas, Acciones Rápidas, Predicciones IA), Estadísticas (Ingresos, Servicios, Clientes), Gráficos (Líneas, Barras, Circular), Listas (Clientes, Facturas, Citas), y Utilidades (Calendario, Tareas, Mapa).',
    icon: 'apps',
    iconColor: '#EF4444',
  },
  {
    title: 'Guardado Automático',
    description: 'Tu configuración se guarda automáticamente en la nube. Verás un indicador de guardado en el header cada vez que hagas cambios. Puedes acceder a tu dashboard personalizado desde cualquier dispositivo.',
    icon: 'cloud-done',
    iconColor: '#06B6D4',
  },
];

interface DashboardEditorTutorialProps {
  visible: boolean;
  onClose: () => void;
}

export function DashboardEditorTutorial({ visible, onClose }: DashboardEditorTutorialProps) {
  const { colors } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  const currentStepData = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={[styles.headerTitle, { color: colors.text }]}>
              Tutorial Dashboard Editor
            </ThemedText>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            {TUTORIAL_STEPS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: index === currentStep
                      ? colors.primary
                      : index < currentStep
                      ? colors.primary + '50'
                      : colors.border,
                  },
                ]}
              />
            ))}
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Icon */}
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: currentStepData.iconColor + '20' },
              ]}
            >
              <Ionicons
                name={currentStepData.icon}
                size={64}
                color={currentStepData.iconColor}
              />
            </View>

            {/* Title */}
            <ThemedText style={[styles.title, { color: colors.text }]}>
              {currentStepData.title}
            </ThemedText>

            {/* Description */}
            <ThemedText style={[styles.description, { color: colors.textSecondary }]}>
              {currentStepData.description}
            </ThemedText>

            {/* Step Counter */}
            <ThemedText style={[styles.stepCounter, { color: colors.textSecondary }]}>
              Paso {currentStep + 1} de {TUTORIAL_STEPS.length}
            </ThemedText>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            {!isFirstStep && (
              <Pressable
                style={[styles.button, styles.secondaryButton, { borderColor: colors.border }]}
                onPress={handlePrevious}
              >
                <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
                <ThemedText style={[styles.buttonText, { color: colors.textSecondary }]}>
                  Anterior
                </ThemedText>
              </Pressable>
            )}

            <Pressable
              style={[
                styles.button,
                styles.primaryButton,
                { backgroundColor: colors.primary },
                isFirstStep && styles.buttonFull,
              ]}
              onPress={handleNext}
            >
              <ThemedText style={[styles.buttonText, { color: '#FFFFFF' }]}>
                {isLastStep ? '¡Empezar!' : 'Siguiente'}
              </ThemedText>
              {!isLastStep && <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
            </Pressable>
          </View>

          {/* Skip Button */}
          {!isLastStep && (
            <Pressable style={styles.skipButton} onPress={handleClose}>
              <ThemedText style={[styles.skipButtonText, { color: colors.textSecondary }]}>
                Saltar tutorial
              </ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    maxHeight: 400,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  stepCounter: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 4,
    gap: 8,
  },
  buttonFull: {
    flex: 1,
  },
  primaryButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
