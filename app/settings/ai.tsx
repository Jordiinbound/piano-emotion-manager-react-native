/**
 * Configuración de IA y Asistente Inteligente
 * Piano Emotion Manager
 * 
 * Configuración de funcionalidades de inteligencia artificial
 */

import { useRouter, Stack } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';

interface AIFeature {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  premium: boolean;
  category: 'recommendations' | 'automation' | 'analysis' | 'assistant';
}

const AI_FEATURES: AIFeature[] = [
  // Recomendaciones
  {
    id: 'service_recommendations',
    name: 'Recomendaciones de Servicio',
    description: 'Sugiere servicios adicionales basándose en el historial del piano y patrones de uso',
    icon: 'lightbulb.fill',
    enabled: true,
    premium: false,
    category: 'recommendations',
  },
  {
    id: 'pricing_suggestions',
    name: 'Sugerencias de Precios',
    description: 'Recomienda precios óptimos basándose en el mercado y tu historial',
    icon: 'eurosign.circle.fill',
    enabled: false,
    premium: true,
    category: 'recommendations',
  },
  {
    id: 'client_insights',
    name: 'Insights de Clientes',
    description: 'Identifica patrones de comportamiento y oportunidades de venta',
    icon: 'person.fill.viewfinder',
    enabled: false,
    premium: true,
    category: 'recommendations',
  },
  // Automatización
  {
    id: 'smart_scheduling',
    name: 'Programación Inteligente',
    description: 'Optimiza automáticamente las rutas y horarios de citas',
    icon: 'calendar.badge.clock',
    enabled: true,
    premium: false,
    category: 'automation',
  },
  {
    id: 'auto_reminders',
    name: 'Recordatorios Automáticos',
    description: 'Envía recordatorios personalizados a clientes según su historial',
    icon: 'bell.badge.fill',
    enabled: true,
    premium: false,
    category: 'automation',
  },
  {
    id: 'inventory_predictions',
    name: 'Predicción de Inventario',
    description: 'Predice necesidades de stock basándose en servicios programados',
    icon: 'shippingbox.fill',
    enabled: false,
    premium: true,
    category: 'automation',
  },
  {
    id: 'auto_invoicing',
    name: 'Facturación Automática',
    description: 'Genera facturas automáticamente al completar servicios',
    icon: 'doc.text.fill',
    enabled: false,
    premium: false,
    category: 'automation',
  },
  // Análisis
  {
    id: 'piano_diagnostics',
    name: 'Diagnóstico de Pianos',
    description: 'Analiza el estado del piano y sugiere mantenimiento preventivo',
    icon: 'waveform.path.ecg',
    enabled: false,
    premium: true,
    category: 'analysis',
  },
  {
    id: 'business_analytics',
    name: 'Análisis de Negocio',
    description: 'Genera informes y tendencias automáticas de tu negocio',
    icon: 'chart.bar.fill',
    enabled: false,
    premium: true,
    category: 'analysis',
  },
  {
    id: 'sentiment_analysis',
    name: 'Análisis de Satisfacción',
    description: 'Analiza feedback de clientes para mejorar el servicio',
    icon: 'face.smiling.fill',
    enabled: false,
    premium: true,
    category: 'analysis',
  },
  // Asistente
  {
    id: 'voice_assistant',
    name: 'Asistente por Voz',
    description: 'Controla la app con comandos de voz mientras trabajas',
    icon: 'mic.fill',
    enabled: false,
    premium: true,
    category: 'assistant',
  },
  {
    id: 'smart_search',
    name: 'Búsqueda Inteligente',
    description: 'Encuentra información usando lenguaje natural',
    icon: 'magnifyingglass',
    enabled: true,
    premium: false,
    category: 'assistant',
  },
  {
    id: 'auto_notes',
    name: 'Notas Automáticas',
    description: 'Genera resúmenes de servicios a partir de notas de voz',
    icon: 'note.text',
    enabled: false,
    premium: true,
    category: 'assistant',
  },
];

const CATEGORIES = [
  { id: 'recommendations', name: 'Recomendaciones', icon: 'lightbulb.fill' },
  { id: 'automation', name: 'Automatización', icon: 'gearshape.fill' },
  { id: 'analysis', name: 'Análisis', icon: 'chart.bar.fill' },
  { id: 'assistant', name: 'Asistente', icon: 'bubble.left.fill' },
];

export default function AISettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [features, setFeatures] = useState<AIFeature[]>(AI_FEATURES);
  const [hasChanges, setHasChanges] = useState(false);

  const accent = useThemeColor({}, 'accent');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const error = useThemeColor({}, 'error');
  const textColor = useThemeColor({}, 'text');

  const handleToggleFeature = (featureId: string) => {
    const feature = features.find(f => f.id === featureId);
    
    if (feature?.premium && !feature.enabled) {
      Alert.alert(
        'Función Premium',
        'Esta función requiere una suscripción Premium. ¿Deseas ver los planes disponibles?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ver Planes', onPress: () => router.push('/settings/subscription' as any) },
        ]
      );
      return;
    }

    setFeatures(prev => prev.map(f => 
      f.id === featureId ? { ...f, enabled: !f.enabled } : f
    ));
    setHasChanges(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Guardado', 'La configuración de IA se ha guardado correctamente.');
    setHasChanges(false);
  };

  const enabledCount = features.filter(f => f.enabled).length;
  const premiumCount = features.filter(f => f.premium).length;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Inteligencia Artificial',
          headerRight: () => (
            <Pressable onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Guardar cambios"
            accessibilityHint="Pulsa para guardar los datos" disabled={!hasChanges}>
              <ThemedText style={[styles.saveButton, { color: hasChanges ? accent : textSecondary }]}>
                Guardar
              </ThemedText>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Resumen */}
        <View style={[styles.summaryCard, { backgroundColor: `${accent}10`, borderColor: accent }]}>
          <View style={styles.summaryIcon}>
            <IconSymbol name="brain" size={32} color={accent} />
          </View>
          <View style={styles.summaryInfo}>
            <ThemedText style={styles.summaryTitle}>Asistente IA</ThemedText>
            <ThemedText style={[styles.summaryText, { color: textSecondary }]}>
              {enabledCount} de {features.length} funciones activas
            </ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: success }]}>
            <ThemedText style={styles.statusText}>Activo</ThemedText>
          </View>
        </View>

        {/* Categorías */}
        {CATEGORIES.map((category) => {
          const categoryFeatures = features.filter(f => f.category === category.id);
          const enabledInCategory = categoryFeatures.filter(f => f.enabled).length;

          return (
            <View key={category.id} style={[styles.categorySection, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryTitleRow}>
                  <IconSymbol name={category.icon as any} size={20} color={accent} />
                  <ThemedText style={styles.categoryTitle}>{category.name}</ThemedText>
                </View>
                <ThemedText style={[styles.categoryCount, { color: textSecondary }]}>
                  {enabledInCategory}/{categoryFeatures.length}
                </ThemedText>
              </View>

              {categoryFeatures.map((feature) => (
                <Pressable
                  key={feature.id}
                  style={[styles.featureRow, { borderTopColor: borderColor }]}
                  onPress={() => handleToggleFeature(feature.id)}
                >
                  <View style={[
                    styles.featureIcon,
                    { backgroundColor: feature.enabled ? `${accent}15` : `${textSecondary}10` }
                  ]}>
                    <IconSymbol
                      name={feature.icon as any}
                      size={20}
                      color={feature.enabled ? accent : textSecondary}
                    />
                  </View>
                  <View style={styles.featureInfo}>
                    <View style={styles.featureNameRow}>
                      <ThemedText style={styles.featureName}>{feature.name}</ThemedText>
                      {feature.premium && (
                        <View style={[styles.premiumBadge, { backgroundColor: warning }]}>
                          <ThemedText style={styles.premiumBadgeText}>★</ThemedText>
                        </View>
                      )}
                    </View>
                    <ThemedText style={[styles.featureDescription, { color: textSecondary }]}>
                      {feature.description}
                    </ThemedText>
                  </View>
                  <Switch
                    value={feature.enabled}
                    onValueChange={() => handleToggleFeature(feature.id)}
                    trackColor={{ false: borderColor, true: accent }}
                  />
                </Pressable>
              ))}
            </View>
          );
        })}

        {/* Información sobre IA */}
        <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={styles.infoTitle}>Sobre la IA</ThemedText>
          <ThemedText style={[styles.infoText, { color: textSecondary }]}>
            Las funciones de inteligencia artificial analizan tus datos localmente para ofrecerte 
            recomendaciones personalizadas. Tu información nunca se comparte con terceros.
          </ThemedText>
          
          <View style={styles.infoPoints}>
            <View style={styles.infoPoint}>
              <IconSymbol name="lock.fill" size={16} color={success} />
              <ThemedText style={[styles.infoPointText, { color: textSecondary }]}>
                Datos procesados localmente
              </ThemedText>
            </View>
            <View style={styles.infoPoint}>
              <IconSymbol name="shield.fill" size={16} color={success} />
              <ThemedText style={[styles.infoPointText, { color: textSecondary }]}>
                Privacidad garantizada
              </ThemedText>
            </View>
            <View style={styles.infoPoint}>
              <IconSymbol name="bolt.fill" size={16} color={success} />
              <ThemedText style={[styles.infoPointText, { color: textSecondary }]}>
                Mejora continua con el uso
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Desbloquear Premium */}
        <Pressable
          style={[styles.premiumCard, { backgroundColor: `${warning}15`, borderColor: warning }]}
          onPress={() => router.push('/settings/subscription' as any)}
        >
          <View style={styles.premiumContent}>
            <IconSymbol name="star.fill" size={24} color={warning} />
            <View style={styles.premiumInfo}>
              <ThemedText style={styles.premiumTitle}>Desbloquea todas las funciones</ThemedText>
              <ThemedText style={[styles.premiumText, { color: textSecondary }]}>
                {premiumCount} funciones premium disponibles con tu suscripción
              </ThemedText>
            </View>
          </View>
          <IconSymbol name="chevron.right" size={16} color={warning} />
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  categorySection: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryCount: {
    fontSize: 13,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureInfo: {
    flex: 1,
  },
  featureNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  featureName: {
    fontSize: 15,
    fontWeight: '500',
  },
  premiumBadge: {
    width: 18,
    height: 18,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  featureDescription: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  infoCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  infoPoints: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  infoPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoPointText: {
    fontSize: 13,
  },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  premiumContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  premiumInfo: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  premiumText: {
    fontSize: 12,
    marginTop: 2,
  },
});
