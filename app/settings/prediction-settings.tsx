/**
 * Configuración de Previsiones
 * Piano Emotion Manager
 * 
 * Configuración personalizada de parámetros para predicciones de riesgo de clientes y mantenimiento.
 */

import { useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { trpc } from '@/utils/trpc';

interface PredictionSettingsForm {
  // Riesgo de pérdida de clientes
  churnRiskMinDays: number;
  churnRiskIntervalMultiplier: number;
  churnRiskMinScore: number;
  
  // Predicción de mantenimiento
  maintenanceTuningIntervalDays: number;
  maintenanceRegulationIntervalDays: number;
  maintenancePredictionWindowMonths: number;
}

export default function PredictionSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');

  const [formData, setFormData] = useState<PredictionSettingsForm>({
    churnRiskMinDays: 180,
    churnRiskIntervalMultiplier: 1.5,
    churnRiskMinScore: 25,
    maintenanceTuningIntervalDays: 180,
    maintenanceRegulationIntervalDays: 730,
    maintenancePredictionWindowMonths: 6,
  });

  const [isSaving, setIsSaving] = useState(false);

  // Obtener configuración actual
  const { data: settings, isLoading } = trpc.alertSettings.get.useQuery();
  
  useEffect(() => {
    if (settings) {
      setFormData({
        churnRiskMinDays: settings.churnRiskMinDays || 180,
        churnRiskIntervalMultiplier: parseFloat(settings.churnRiskIntervalMultiplier || '1.5'),
        churnRiskMinScore: settings.churnRiskMinScore || 25,
        maintenanceTuningIntervalDays: settings.maintenanceTuningIntervalDays || 180,
        maintenanceRegulationIntervalDays: settings.maintenanceRegulationIntervalDays || 730,
        maintenancePredictionWindowMonths: settings.maintenancePredictionWindowMonths || 6,
      });
    }
  }, [settings]);

  const saveMutation = trpc.alertSettings.update.useMutation({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsSaving(false);
      router.back();
    },
    onError: (error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsSaving(false);
      console.error('Error al guardar configuración:', error);
    },
  });

  const handleSave = () => {
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    saveMutation.mutate(formData);
  };

  const updateField = (field: keyof PredictionSettingsForm, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, [field]: numValue }));
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <Stack.Screen
          options={{
            title: 'Configuración de Previsiones',
            headerShown: true,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <Stack.Screen
        options={{
          title: 'Configuración de Previsiones',
          headerShown: true,
          headerRight: () => (
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={({ pressed }) => [
                styles.saveButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={tintColor} />
              ) : (
                <ThemedText style={[styles.saveButtonText, { color: tintColor }]}>
                  Guardar
                </ThemedText>
              )}
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
      >
        {/* Sección: Riesgo de Pérdida de Clientes */}
        <View style={[styles.section, { backgroundColor: cardBackground }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="person.crop.circle.badge.exclamationmark" size={24} color={tintColor} />
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
              Riesgo de Pérdida de Clientes
            </ThemedText>
          </View>
          
          <ThemedText style={[styles.sectionDescription, { color: textSecondary }]}>
            Configura los parámetros para detectar clientes en riesgo de abandono basándose en su historial de servicios.
          </ThemedText>

          {/* Días mínimos sin servicio */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldHeader}>
              <ThemedText style={[styles.fieldLabel, { color: textColor }]}>
                Días mínimos sin servicio
              </ThemedText>
              <View style={[styles.badge, { backgroundColor: `${tintColor}15` }]}>
                <ThemedText style={[styles.badgeText, { color: tintColor }]}>
                  {formData.churnRiskMinDays} días
                </ThemedText>
              </View>
            </View>
            <ThemedText style={[styles.fieldDescription, { color: textSecondary }]}>
              Si un cliente no recibe servicio durante este período, se considera en riesgo inicial.
              {'\n\n'}
              <ThemedText style={{ fontWeight: '600' }}>Ejemplo:</ThemedText> Con 180 días, un cliente sin servicio durante 6 meses empezará a acumular puntos de riesgo.
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor, borderColor, color: textColor }]}
              value={formData.churnRiskMinDays.toString()}
              onChangeText={(value) => updateField('churnRiskMinDays', value)}
              keyboardType="numeric"
              placeholder="180"
              placeholderTextColor={textSecondary}
            />
          </View>

          {/* Multiplicador de intervalo */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldHeader}>
              <ThemedText style={[styles.fieldLabel, { color: textColor }]}>
                Multiplicador de intervalo promedio
              </ThemedText>
              <View style={[styles.badge, { backgroundColor: `${tintColor}15` }]}>
                <ThemedText style={[styles.badgeText, { color: tintColor }]}>
                  {formData.churnRiskIntervalMultiplier}x
                </ThemedText>
              </View>
            </View>
            <ThemedText style={[styles.fieldDescription, { color: textSecondary }]}>
              Detecta clientes que superan su intervalo habitual de servicios. El sistema calcula cuántos días pasan normalmente entre servicios para cada cliente.
              {'\n\n'}
              <ThemedText style={{ fontWeight: '600' }}>Ejemplo:</ThemedText> Con 1.5x, si un cliente normalmente viene cada 6 meses (180 días), se considera en riesgo a los 9 meses (270 días).
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor, borderColor, color: textColor }]}
              value={formData.churnRiskIntervalMultiplier.toString()}
              onChangeText={(value) => updateField('churnRiskIntervalMultiplier', value)}
              keyboardType="decimal-pad"
              placeholder="1.5"
              placeholderTextColor={textSecondary}
            />
          </View>

          {/* Umbral mínimo de riesgo */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldHeader}>
              <ThemedText style={[styles.fieldLabel, { color: textColor }]}>
                Umbral mínimo de riesgo
              </ThemedText>
              <View style={[styles.badge, { backgroundColor: `${tintColor}15` }]}>
                <ThemedText style={[styles.badgeText, { color: tintColor }]}>
                  {formData.churnRiskMinScore} puntos
                </ThemedText>
              </View>
            </View>
            <ThemedText style={[styles.fieldDescription, { color: textSecondary }]}>
              Solo se mostrarán clientes que superen este umbral de riesgo. El sistema asigna puntos según múltiples factores (días sin servicio, intervalo promedio, etc.).
              {'\n\n'}
              <ThemedText style={{ fontWeight: '600' }}>Escala:</ThemedText> 0-24 (bajo), 25-49 (medio), 50-74 (alto), 75-100 (crítico)
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor, borderColor, color: textColor }]}
              value={formData.churnRiskMinScore.toString()}
              onChangeText={(value) => updateField('churnRiskMinScore', value)}
              keyboardType="numeric"
              placeholder="25"
              placeholderTextColor={textSecondary}
            />
          </View>
        </View>

        {/* Sección: Predicción de Mantenimiento */}
        <View style={[styles.section, { backgroundColor: cardBackground }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="wrench.and.screwdriver" size={24} color={tintColor} />
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
              Predicción de Mantenimiento
            </ThemedText>
          </View>
          
          <ThemedText style={[styles.sectionDescription, { color: textSecondary }]}>
            Configura los intervalos recomendados para cada tipo de servicio y la ventana de predicción.
          </ThemedText>

          {/* Intervalo de afinación */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldHeader}>
              <ThemedText style={[styles.fieldLabel, { color: textColor }]}>
                Intervalo recomendado para Afinación
              </ThemedText>
              <View style={[styles.badge, { backgroundColor: `${tintColor}15` }]}>
                <ThemedText style={[styles.badgeText, { color: tintColor }]}>
                  {formData.maintenanceTuningIntervalDays} días
                </ThemedText>
              </View>
            </View>
            <ThemedText style={[styles.fieldDescription, { color: textSecondary }]}>
              Intervalo estándar entre afinaciones. El sistema predice cuándo tocará la próxima afinación basándose en el historial de cada piano.
              {'\n\n'}
              <ThemedText style={{ fontWeight: '600' }}>Recomendación:</ThemedText> 180 días (6 meses) para uso doméstico, 90 días (3 meses) para uso profesional.
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor, borderColor, color: textColor }]}
              value={formData.maintenanceTuningIntervalDays.toString()}
              onChangeText={(value) => updateField('maintenanceTuningIntervalDays', value)}
              keyboardType="numeric"
              placeholder="180"
              placeholderTextColor={textSecondary}
            />
          </View>

          {/* Intervalo de regulación */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldHeader}>
              <ThemedText style={[styles.fieldLabel, { color: textColor }]}>
                Intervalo recomendado para Regulación
              </ThemedText>
              <View style={[styles.badge, { backgroundColor: `${tintColor}15` }]}>
                <ThemedText style={[styles.badgeText, { color: tintColor }]}>
                  {formData.maintenanceRegulationIntervalDays} días
                </ThemedText>
              </View>
            </View>
            <ThemedText style={[styles.fieldDescription, { color: textSecondary }]}>
              Intervalo estándar entre regulaciones. La regulación es un mantenimiento más profundo que la afinación.
              {'\n\n'}
              <ThemedText style={{ fontWeight: '600' }}>Recomendación:</ThemedText> 730 días (2 años) para uso doméstico, 365 días (1 año) para uso profesional.
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor, borderColor, color: textColor }]}
              value={formData.maintenanceRegulationIntervalDays.toString()}
              onChangeText={(value) => updateField('maintenanceRegulationIntervalDays', value)}
              keyboardType="numeric"
              placeholder="730"
              placeholderTextColor={textSecondary}
            />
          </View>

          {/* Ventana de predicción */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldHeader}>
              <ThemedText style={[styles.fieldLabel, { color: textColor }]}>
                Ventana de predicción (meses)
              </ThemedText>
              <View style={[styles.badge, { backgroundColor: `${tintColor}15` }]}>
                <ThemedText style={[styles.badgeText, { color: tintColor }]}>
                  {formData.maintenancePredictionWindowMonths} meses
                </ThemedText>
              </View>
            </View>
            <ThemedText style={[styles.fieldDescription, { color: textSecondary }]}>
              Define cuántos meses hacia adelante se mostrarán las predicciones de mantenimiento.
              {'\n\n'}
              <ThemedText style={{ fontWeight: '600' }}>Ejemplo:</ThemedText> Con 6 meses, solo se mostrarán servicios predichos para los próximos 6 meses.
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor, borderColor, color: textColor }]}
              value={formData.maintenancePredictionWindowMonths.toString()}
              onChangeText={(value) => updateField('maintenancePredictionWindowMonths', value)}
              keyboardType="numeric"
              placeholder="6"
              placeholderTextColor={textSecondary}
            />
          </View>
        </View>
      </ScrollView>
    </ThemedView>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  fieldGroup: {
    marginBottom: Spacing.lg,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  fieldDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
  },
});
