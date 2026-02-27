/**
 * TunerTutorial — Tutorial interactivo per a principiants
 * 
 * Onboarding de 4 passos que explica:
 * 1. Què és un afinador i com funciona
 * 2. Com interpretar el medidor de cents
 * 3. Com afinar una nota (procés pas a pas)
 * 4. Funcionalitats avançades disponibles
 * 
 * Es mostra la primera vegada que l'usuari accedeix a l'afinador,
 * i es pot tornar a obrir des dels ajustos.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/use-theme-color';

interface TunerTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface TutorialStep {
  icon: string;
  title: string;
  description: string;
  details: string[];
  tip: string;
}

const STEPS: TutorialStep[] = [
  {
    icon: 'musical-notes',
    title: '¿Qué hace este afinador?',
    description: 'Este afinador escucha las notas de tu piano a través del micrófono y te indica si cada cuerda está afinada correctamente.',
    details: [
      'Detecta automáticamente qué nota estás tocando',
      'Muestra la desviación en "cents" (centésimas de semitono)',
      'Funciona con las 88 teclas del piano acústico',
      'No necesita conexión a internet para funcionar',
    ],
    tip: 'Toca una sola tecla a la vez para obtener la mejor detección.',
  },
  {
    icon: 'speedometer',
    title: 'Cómo leer el medidor',
    description: 'El medidor circular muestra cuánto se desvía la nota de su frecuencia ideal. El objetivo es centrar la aguja.',
    details: [
      '🟢 Verde (±2 cents): La nota está afinada correctamente',
      '🟡 Ámbar (±5 cents): Casi afinada, pequeño ajuste necesario',
      '🔴 Rojo (>5 cents): Desafinada, necesita ajuste significativo',
      'La aguja a la izquierda = nota baja (bemol) → tensar la cuerda',
      'La aguja a la derecha = nota alta (sostenido) → aflojar la cuerda',
    ],
    tip: 'El indicador "Estable" aparece cuando la lectura se ha estabilizado. Espera a que aparezca antes de ajustar.',
  },
  {
    icon: 'hammer',
    title: 'Cómo afinar una nota',
    description: 'Proceso paso a paso para afinar correctamente una cuerda del piano:',
    details: [
      '1. Toca la tecla con firmeza (mezzo-forte)',
      '2. Espera a que el medidor se estabilice (1-2 segundos)',
      '3. Lee la desviación: ¿está alta o baja?',
      '4. Gira la clavija con la llave de afinación:',
      '   → Si está baja: gira en sentido horario (tensar)',
      '   → Si está alta: gira en sentido antihorario (aflojar)',
      '5. Vuelve a tocar la tecla y repite hasta que esté en verde',
      '6. Pasa a la siguiente nota',
    ],
    tip: 'Haz ajustes muy pequeños. Un cuarto de vuelta de clavija puede cambiar la afinación varios cents.',
  },
  {
    icon: 'rocket',
    title: 'Herramientas avanzadas',
    description: 'Este afinador incluye funcionalidades profesionales que puedes explorar:',
    details: [
      '📊 Espectrograma: Visualiza los parciales de cada cuerda',
      '📈 Curva Railsback: Ve el estado global de afinación del piano',
      '🎵 Modo Unísono: Detecta batidos entre cuerdas del mismo unísono',
      '🔧 Calibración: Mide la inharmonicidad real de tu piano',
      '🎹 Afinación Guiada: Sigue un asistente paso a paso',
      '🎼 Temperamentos: Usa temperamentos históricos (Werckmeister, etc.)',
      '📄 Informes: Genera un informe PDF de la afinación',
    ],
    tip: 'Si eres principiante, empieza con el modo "Afinación Guiada" que te indica qué nota afinar en cada paso.',
  },
];

const { width: screenWidth } = Dimensions.get('window');

export function TunerTutorial({ onComplete, onSkip }: TunerTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const bgColor = useThemeColor({}, 'background');
  const primaryColor = '#0a7ea4';

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  const handleNext = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [isLast, onComplete]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  return (
    <View style={[styles.overlay, { backgroundColor: bgColor }]}>
      <View style={styles.header}>
        <Text style={[styles.stepIndicator, { color: textSecondary }]}>
          {currentStep + 1} / {STEPS.length}
        </Text>
        <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: textSecondary }]}>Saltar</Text>
        </TouchableOpacity>
      </View>

      {/* Progress dots */}
      <View style={styles.dotsContainer}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i <= currentStep ? primaryColor : borderColor,
                width: i === currentStep ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: primaryColor + '15' }]}>
          <Ionicons name={step.icon as any} size={48} color={primaryColor} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: textColor }]}>{step.title}</Text>

        {/* Description */}
        <Text style={[styles.description, { color: textSecondary }]}>{step.description}</Text>

        {/* Details */}
        <View style={[styles.detailsContainer, { backgroundColor: surfaceColor, borderColor }]}>
          {step.details.map((detail, i) => (
            <View key={i} style={styles.detailRow}>
              <Text style={[styles.detailText, { color: textColor }]}>{detail}</Text>
            </View>
          ))}
        </View>

        {/* Tip */}
        <View style={[styles.tipContainer, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B40' }]}>
          <Ionicons name="bulb" size={18} color="#F59E0B" />
          <Text style={[styles.tipText, { color: textColor }]}>{step.tip}</Text>
        </View>
      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.buttonRow}>
        {currentStep > 0 ? (
          <TouchableOpacity
            onPress={handlePrev}
            style={[styles.button, styles.secondaryButton, { borderColor }]}
          >
            <Ionicons name="chevron-back" size={20} color={textColor} />
            <Text style={[styles.buttonText, { color: textColor }]}>Anterior</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.buttonSpacer} />
        )}

        <TouchableOpacity
          onPress={handleNext}
          style={[styles.button, styles.primaryButton, { backgroundColor: primaryColor }]}
        >
          <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
            {isLast ? 'Empezar a afinar' : 'Siguiente'}
          </Text>
          <Ionicons
            name={isLast ? 'checkmark' : 'chevron-forward'}
            size={20}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepIndicator: {
    fontSize: 14,
    fontWeight: '600',
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 400,
  },
  detailsContainer: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    paddingVertical: 6,
  },
  detailText: {
    fontSize: 14,
    lineHeight: 20,
  },
  tipContainer: {
    width: '100%',
    maxWidth: 440,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButton: {
    // backgroundColor set inline
  },
  secondaryButton: {
    borderWidth: 1,
  },
  buttonSpacer: {
    flex: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
