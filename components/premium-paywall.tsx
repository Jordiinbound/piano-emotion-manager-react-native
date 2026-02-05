/**
 * Componente de Paywall para funcionalidades Premium
 * Piano Emotion Manager
 * 
 * Muestra un mensaje de upgrade cuando el usuario intenta acceder a funcionalidades de pago
 */

import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';

interface PremiumPaywallProps {
  feature: string;
  description?: string;
  icon?: string;
  minPlan?: 'starter' | 'professional' | 'enterprise';
}

export function PremiumPaywall({ 
  feature, 
  description,
  icon = 'lock.fill',
  minPlan = 'professional'
}: PremiumPaywallProps) {
  const router = useRouter();
  const accent = useThemeColor({}, 'accent');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');

  const planNames = {
    starter: 'Profesional Básico',
    professional: 'Profesional Avanzado',
    enterprise: 'Empresa'
  };

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/settings/subscription' as any);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={[styles.iconContainer, { backgroundColor: `${accent}15` }]}>
          <IconSymbol name={icon as any} size={48} color={accent} />
        </View>
        
        <ThemedText style={styles.title}>
          {feature}
        </ThemedText>
        
        <ThemedText style={[styles.description, { color: textSecondary }]}>
          {description || `Esta funcionalidad requiere un plan ${planNames[minPlan]} o superior.`}
        </ThemedText>

        <View style={styles.features}>
          <View style={styles.featureRow}>
            <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" />
            <ThemedText style={styles.featureText}>Facturación electrónica oficial</ThemedText>
          </View>
          <View style={styles.featureRow}>
            <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" />
            <ThemedText style={styles.featureText}>Exportación contable (CSV, Excel, PDF)</ThemedText>
          </View>
          <View style={styles.featureRow}>
            <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" />
            <ThemedText style={styles.featureText}>Libro de IVA y modelos fiscales</ThemedText>
          </View>
          <View style={styles.featureRow}>
            <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" />
            <ThemedText style={styles.featureText}>Soporte multi-país (10 países)</ThemedText>
          </View>
          <View style={styles.featureRow}>
            <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" />
            <ThemedText style={styles.featureText}>WhatsApp Business y Email integrado</ThemedText>
          </View>
        </View>

        <Pressable
          style={[styles.upgradeButton, { backgroundColor: accent }]}
          onPress={handleUpgrade}
        >
          <IconSymbol name="arrow.up.circle.fill" size={20} color="#FFFFFF" />
          <ThemedText style={styles.upgradeButtonText}>
            Ver planes y precios
          </ThemedText>
        </Pressable>

        <ThemedText style={[styles.priceHint, { color: textSecondary }]}>
          Desde 9,99€/mes
        </ThemedText>
      </View>
    </ThemedView>
  );
}

/**
 * Hook para verificar si el usuario tiene acceso a funcionalidades premium
 */
export function usePremiumAccess() {
  // Por ahora usamos un estado simple, en producción se conectaría con el backend
  // Conectar con el estado de suscripción
  const checkSubscription = async () => {
    try {
      const response = await fetch('/api/subscription/status');
      if (response.ok) {
        const data = await response.json();
        return data.plan !== 'free';
      }
    } catch (error) {
      console.error('Error verificando suscripción:', error);
    }
    return false;
  };
  
  const isPremium = false; // Cambiar a true para usuarios de pago
  const currentPlan = 'free'; // 'free' | 'starter' | 'professional' | 'enterprise'
  
  const hasAccess = (requiredPlan: 'starter' | 'professional' | 'enterprise' = 'professional'): boolean => {
    const planHierarchy = ['free', 'starter', 'professional', 'enterprise'];
    const currentIndex = planHierarchy.indexOf(currentPlan);
    const requiredIndex = planHierarchy.indexOf(requiredPlan);
    return currentIndex >= requiredIndex;
  };

  return {
    isPremium,
    currentPlan,
    hasAccess,
    hasAccountingAccess: hasAccess('professional'),
    hasEInvoicingAccess: hasAccess('professional'),
    hasAnalyticsAccess: hasAccess('starter'),
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  features: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
    width: '100%',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  priceHint: {
    fontSize: 13,
    marginTop: Spacing.sm,
  },
});
