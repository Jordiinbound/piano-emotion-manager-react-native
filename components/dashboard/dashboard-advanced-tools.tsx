/**
 * Dashboard Advanced Tools Component
 * Muestra las herramientas avanzadas con clasificación FREE/PRO/PREMIUM
 */
import { useState } from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Accordion } from '@/components/accordion';
import { AnimatedCard } from '@/components/animated-card';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Spacing, BorderRadius } from '@/constants/theme';
import { useUserTier } from '@/hooks/use-user-tier';

// Tipos de plan
type PlanTier = 'free' | 'pro' | 'premium';

// Definición de módulos avanzados con clasificación correcta
const ADVANCED_MODULES: Array<{
  key: string;
  icon: string;
  label: string;
  color: string;
  tier: PlanTier;
}> = [
  // FREE - Disponibles para todos
  { key: 'shop', icon: 'cart.fill', label: 'Tienda', color: '#84CC16', tier: 'free' },
  { key: 'calendar_adv', icon: 'calendar.badge.clock', label: 'Calendario+', color: '#A855F7', tier: 'free' },
  { key: 'dashboard_editor', icon: 'square.grid.2x2', label: 'Dashboard+', color: '#EC4899', tier: 'free' },
  { key: 'modules', icon: 'creditcard.fill', label: 'Gestionar Plan', color: '#8B5CF6', tier: 'free' },
  
  // PRO - Requieren suscripción Pro
  { key: 'team', icon: 'person.3.fill', label: 'Equipos', color: '#10B981', tier: 'pro' },
  { key: 'crm', icon: 'heart.fill', label: 'CRM', color: '#EF4444', tier: 'pro' },
  { key: 'reports', icon: 'chart.pie.fill', label: 'Reportes', color: '#06B6D4', tier: 'pro' },
  { key: 'client_portal', icon: 'globe', label: 'Portal Clientes', color: '#0891B2', tier: 'pro' },
  { key: 'distributor', icon: 'building.columns.fill', label: 'Distribuidor', color: '#BE185D', tier: 'pro' },
  { key: 'marketing', icon: 'megaphone.fill', label: 'Marketing', color: '#E91E63', tier: 'pro' },
  { key: 'payments', icon: 'creditcard.fill', label: 'Pasarelas Pago', color: '#635BFF', tier: 'pro' },
  
  // PREMIUM - Solo para Premium
  { key: 'accounting', icon: 'calculator', label: 'Contabilidad', color: '#F97316', tier: 'premium' },
  { key: 'workflows', icon: 'arrow.triangle.branch', label: 'Workflows', color: '#6366F1', tier: 'premium' },
  { key: 'predictions', icon: 'brain.head.profile', label: 'IA Avanzada', color: '#8B5CF6', tier: 'premium' },
];

// Mapeo de rutas
const ROUTE_MAP: Record<string, string> = {
  team: '/(app)/team',
  crm: '/(app)/crm',
  calendar_adv: '/(app)/calendar',
  reports: '/(app)/reports',
  accounting: '/(app)/accounting',
  shop: '/(app)/shop',
  modules: '/settings/modules',
  client_portal: '/portal',
  distributor: '/distributor-panel',
  workflows: '/workflows',
  marketing: '/marketing',
  payments: '/payment-settings',
  dashboard_editor: '/dashboard-editor',
  predictions: '/predictions',
};

// Información de planes para el modal
const PLAN_INFO = {
  pro: {
    name: 'Pro',
    color: '#F59E0B',
    price: '9,99€/mes',
    features: [
      'Gestión de equipos',
      'CRM completo',
      'Reportes avanzados',
      'Portal de clientes',
      'Marketing',
      'Pasarelas de pago',
    ],
  },
  premium: {
    name: 'Premium',
    color: '#8B5CF6',
    price: '19,99€/mes',
    features: [
      'Todo lo de Pro',
      'Contabilidad con impuestos',
      'Workflows automatizados',
      'IA avanzada y predicciones',
    ],
  },
};

interface DashboardAdvancedToolsProps {
  userTier?: PlanTier;
}

export function DashboardAdvancedTools({ userTier: userTierProp }: DashboardAdvancedToolsProps) {
  const router = useRouter();
  const { tier: tierFromHook, isLoading } = useUserTier();
  const userTier = userTierProp || tierFromHook;
  
  const [upgradeModal, setUpgradeModal] = useState<{ visible: boolean; tier: 'pro' | 'premium' | null }>({
    visible: false,
    tier: null,
  });

  const canAccess = (moduleTier: PlanTier): boolean => {
    // Normalizar el plan actual para asegurar compatibilidad
    const normalizedTier = userTier?.toLowerCase() || 'free';
    
    // Log para debug
    console.log('[DashboardAdvancedTools] Checking access:', { userTier: normalizedTier, moduleTier });

    // 1. Premium tiene acceso a TODO
    if (normalizedTier.includes('premium')) return true;
    
    // 2. Pro tiene acceso a Pro y Free
    if (normalizedTier.includes('pro') || normalizedTier.includes('starter')) {
      return moduleTier === 'pro' || moduleTier === 'free';
    }
    
    // 3. Free solo tiene acceso a Free
    return moduleTier === 'free';
  };

  const handleAction = (module: typeof ADVANCED_MODULES[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (!canAccess(module.tier)) {
      // Mostrar modal de upgrade
      setUpgradeModal({
        visible: true,
        tier: module.tier === 'premium' ? 'premium' : 'pro',
      });
      return;
    }
    
    const route = ROUTE_MAP[module.key];
    if (route) {
      router.push(route as any);
    }
  };

  const handleUpgrade = () => {
    setUpgradeModal({ visible: false, tier: null });
    router.push('/settings/modules' as any);
  };

  const getBadgeForModule = (tier: PlanTier): string | undefined => {
    // Solo mostrar badge si el usuario NO tiene acceso al módulo
    if (tier === 'pro' && !canAccess('pro')) return 'PRO';
    if (tier === 'premium' && !canAccess('premium')) return 'PREMIUM';
    return undefined;
  };

  return (
    <>
      <Accordion 
        title="Herramientas Avanzadas" 
        defaultOpen={false}
        icon="star.fill"
        iconColor="#F59E0B"
      >
        <View style={styles.centeredGrid}>
          {ADVANCED_MODULES.map((module) => {
            const hasAccess = canAccess(module.tier);
            const badge = getBadgeForModule(module.tier);
            
            return (
              <AnimatedCard
                key={module.key}
                icon={module.icon}
                label={module.label}
                color={hasAccess ? module.color : '#9CA3AF'}
                onPress={() => handleAction(module)}
                disabled={!hasAccess}
                badge={badge}
                badgeColor={module.tier === 'premium' ? '#8B5CF6' : '#F59E0B'}
              />
            );
          })}
        </View>
      </Accordion>

      {/* Modal de Upgrade */}
      <Modal
        visible={upgradeModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setUpgradeModal({ visible: false, tier: null })}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setUpgradeModal({ visible: false, tier: null })}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {upgradeModal.tier && (
              <>
                <View style={[styles.modalHeader, { backgroundColor: PLAN_INFO[upgradeModal.tier].color }]}>
                  <IconSymbol name="star.fill" size={32} color="#FFFFFF" />
                  <ThemedText style={styles.modalTitle}>
                    Plan {PLAN_INFO[upgradeModal.tier].name}
                  </ThemedText>
                  <ThemedText style={styles.modalPrice}>
                    {PLAN_INFO[upgradeModal.tier].price}
                  </ThemedText>
                </View>
                
                <View style={styles.modalBody}>
                  <ThemedText style={styles.modalSubtitle}>
                    Desbloquea estas funcionalidades:
                  </ThemedText>
                  
                  {PLAN_INFO[upgradeModal.tier].features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <IconSymbol name="checkmark.circle.fill" size={20} color={PLAN_INFO[upgradeModal.tier!].color} />
                      <ThemedText style={styles.featureText}>{feature}</ThemedText>
                    </View>
                  ))}
                </View>
                
                <View style={styles.modalFooter}>
                  <Pressable
                    style={[styles.upgradeButton, { backgroundColor: PLAN_INFO[upgradeModal.tier].color }]}
                    onPress={handleUpgrade}
                  >
                    <ThemedText style={styles.upgradeButtonText}>
                      Actualizar a {PLAN_INFO[upgradeModal.tier].name}
                    </ThemedText>
                  </Pressable>
                  
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => setUpgradeModal({ visible: false, tier: null })}
                  >
                    <ThemedText style={styles.cancelButtonText}>Ahora no</ThemedText>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  centeredGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm, // Reducido de md a sm para igualar con Accesos Rápidos
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalPrice: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  modalBody: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
  modalFooter: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.sm,
  },
  upgradeButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 15,
  },
});
