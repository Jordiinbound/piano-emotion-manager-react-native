/**
 * Página de Herramientas Avanzadas
 * Piano Emotion Manager - Diseño moderno y elegante
 */

import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet, ScrollView, Modal, Pressable, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useHeader } from '@/contexts/HeaderContext';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Spacing } from '@/constants/theme';
import { useUserTier } from '@/hooks/use-user-tier';
import { useThemeColor } from '@/hooks/use-theme-color';

// Tipos de plan
type PlanTier = 'free' | 'pro' | 'premium';

// Definición de módulos avanzados organizados por categorías
const CATEGORIES = [
  {
    id: 'free',
    title: 'Herramientas Gratuitas',
    modules: [
      { key: 'shop', icon: 'cart.fill', label: 'Tienda', color: '#84CC16', tier: 'free' as PlanTier },
      { key: 'calendar_adv', icon: 'calendar.badge.clock', label: 'Calendario+', color: '#A855F7', tier: 'free' as PlanTier },
      { key: 'dashboard_editor', icon: 'square.grid.2x2', label: 'Dashboard+', color: '#EC4899', tier: 'free' as PlanTier },
      { key: 'modules', icon: 'creditcard.fill', label: 'Gestionar Plan', color: '#8B5CF6', tier: 'free' as PlanTier },
    ],
  },
  {
    id: 'pro',
    title: 'Herramientas Pro',
    modules: [
      { key: 'team', icon: 'person.3.fill', label: 'Equipos', color: '#10B981', tier: 'pro' as PlanTier },
      { key: 'crm', icon: 'heart.fill', label: 'CRM', color: '#EF4444', tier: 'pro' as PlanTier },
      { key: 'reports', icon: 'chart.pie.fill', label: 'Reportes', color: '#06B6D4', tier: 'pro' as PlanTier },
      { key: 'client_portal', icon: 'globe', label: 'Portal Clientes', color: '#0891B2', tier: 'pro' as PlanTier },
      { key: 'distributor', icon: 'building.columns.fill', label: 'Distribuidor', color: '#BE185D', tier: 'pro' as PlanTier },
      { key: 'marketing', icon: 'megaphone.fill', label: 'Marketing', color: '#E91E63', tier: 'pro' as PlanTier },
      { key: 'payments', icon: 'creditcard.fill', label: 'Pasarelas Pago', color: '#635BFF', tier: 'pro' as PlanTier },
    ],
  },
  {
    id: 'premium',
    title: 'Herramientas Premium',
    modules: [
      { key: 'accounting', icon: 'calculator', label: 'Contabilidad', color: '#F97316', tier: 'premium' as PlanTier },
      { key: 'workflows', icon: 'arrow.triangle.branch', label: 'Workflows', color: '#6366F1', tier: 'premium' as PlanTier },
      { key: 'predictions', icon: 'brain.head.profile', label: 'IA Avanzada', color: '#8B5CF6', tier: 'premium' as PlanTier },
    ],
  },
];

// Mapeo de rutas
const ROUTE_MAP: Record<string, string> = {
  team: '/(app)/team',
  crm: '/(app)/crm',
  calendar_adv: '/(app)/calendar',
  reports: '/reports',
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
    color: '#E07856',
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

export default function AdvancedToolsScreen() {
  const router = useRouter();
  const { setHeaderConfig } = useHeader();
  const { tier: tierFromHook } = useUserTier();
  const userTier = tierFromHook;
  const { width } = useWindowDimensions();
  
  const background = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');

  // Configurar header
  useFocusEffect(
    React.useCallback(() => {
      setHeaderConfig({
        title: 'Herramientas Avanzadas',
        subtitle: 'Funciones premium y avanzadas',
        icon: 'star.fill',
        showBackButton: false,
      });
    }, [setHeaderConfig])
  );
  
  const [upgradeModal, setUpgradeModal] = useState<{ visible: boolean; tier: 'pro' | 'premium' | null }>({
    visible: false,
    tier: null,
  });

  const canAccess = (moduleTier: PlanTier): boolean => {
    const normalizedTier = userTier?.toLowerCase() || 'free';
    if (normalizedTier.includes('premium')) return true;
    if (normalizedTier.includes('pro') || normalizedTier.includes('starter')) {
      return moduleTier === 'pro' || moduleTier === 'free';
    }
    return moduleTier === 'free';
  };

  const handleAction = (module: { key: string; tier: PlanTier }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (!canAccess(module.tier)) {
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

  // Responsive: determinar número de columnas
  const numColumns = width > 1024 ? 4 : width > 768 ? 3 : width > 600 ? 2 : 2;
  const cardWidth = width > 600 ? `${(100 / numColumns) - 2}%` : '48%';

  return (
    <>
      <View style={[styles.container, { backgroundColor: background }]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {CATEGORIES.map((category) => (
            <View key={category.id} style={styles.categorySection}>
              <ThemedText style={styles.categoryTitle}>{category.title}</ThemedText>
              
              <View style={styles.modulesGrid}>
                {category.modules.map((module) => {
                  const hasAccess = canAccess(module.tier);
                  const showBadge = !hasAccess;
                  
                  return (
                    <Pressable
                      key={module.key}
                      style={[
                        styles.moduleCard,
                        { 
                          backgroundColor: cardBg, 
                          borderColor: hasAccess ? borderColor : '#E5E7EB',
                          width: cardWidth,
                          opacity: hasAccess ? 1 : 0.6,
                        },
                      ]}
                      onPress={() => handleAction(module)}
                    >
                      <View style={[styles.iconContainer, { backgroundColor: `${module.color}15` }]}>
                        <IconSymbol 
                          name={module.icon} 
                          size={28} 
                          color={hasAccess ? module.color : '#9CA3AF'} 
                        />
                      </View>
                      <ThemedText style={styles.moduleLabel} numberOfLines={2}>
                        {module.label}
                      </ThemedText>
                      {showBadge && (
                        <View style={[styles.badge, { backgroundColor: PLAN_INFO[module.tier === 'premium' ? 'premium' : 'pro'].color }]}>
                          <ThemedText style={styles.badgeText}>
                            {module.tier === 'premium' ? 'PREMIUM' : 'PRO'}
                          </ThemedText>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

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
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  categorySection: {
    marginBottom: Spacing.xl,
  },
  categoryTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  moduleCard: {
    minWidth: 150,
    padding: Spacing.lg,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleLabel: {
    fontSize: 14,
    fontFamily: 'Montserrat-SemiBold',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Montserrat-Bold',
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
    borderRadius: 4,
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
    fontFamily: 'Montserrat-Bold',
    color: '#FFFFFF',
  },
  modalPrice: {
    fontSize: 18,
    fontFamily: 'Montserrat-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  modalBody: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalSubtitle: {
    fontSize: 16,
    fontFamily: 'Montserrat-SemiBold',
    marginBottom: Spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureText: {
    fontSize: 15,
    fontFamily: 'Montserrat-Regular',
    flex: 1,
  },
  modalFooter: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.sm,
  },
  upgradeButton: {
    padding: Spacing.md,
    borderRadius: 4,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Montserrat-SemiBold',
  },
  cancelButton: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 15,
    fontFamily: 'Montserrat-Regular',
  },
});
