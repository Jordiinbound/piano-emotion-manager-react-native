/**
 * Página de Suscripción con Stripe
 * Piano Emotion Manager
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc';

type PlanId = 'FREE' | 'PROFESSIONAL' | 'PREMIUM_IA';

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Obtener planes disponibles
  const { data: plansData, isLoading: plansLoading, error: plansError } = trpc.advanced.subscription.getPlans.useQuery();
  
  // Debug
  console.log('Plans data:', plansData);
  console.log('Plans error:', plansError);
  
  // Fallback si la consulta falla
  const plans = (plansData && plansData.length > 0) ? plansData : [
    {
      id: 'FREE',
      name: 'Plan Gratuito',
      price: 0,
      currency: 'EUR',
      interval: 'year',
      limits: {
        clients: 100,
        pianos: 200,
        servicesPerMonth: 100,
        invoicesPerMonth: 100,
        storage: '500 MB',
      },
      features: [
        'Hasta 100 clientes',
        'Hasta 200 pianos',
        'Hasta 100 servicios/mes',
        'Hasta 100 facturas/mes',
        'Calendario completo',
        'Inventario básico',
        'Recordatorios',
        'Contratos',
        'Mapa de clientes',
        'Rutas',
        'Importar/Exportar',
        '500 MB almacenamiento',
      ],
    },
    {
      id: 'PROFESSIONAL',
      name: 'Plan Pro',
      price: 30,
      currency: 'EUR',
      interval: 'year',
      priceId: 'price_1SiNNrDpmJIxYFlvPsgsL3iX',
      limits: {
        clients: -1,
        pianos: -1,
        servicesPerMonth: -1,
        invoicesPerMonth: -1,
        storage: '2 GB',
      },
      features: [
        'Todo lo del Plan Gratuito',
        'Clientes ilimitados',
        'Pianos ilimitados',
        'Servicios ilimitados',
        'Facturas ilimitadas',
        'Comunicaciones (WhatsApp, Email)',
        'Marketing y campañas',
        'CRM avanzado',
        'Equipos (multi-técnico)',
        'Contabilidad',
        'Analytics avanzados',
        'Portal de clientes',
        'Automatizaciones básicas',
        'Sync Google/Outlook',
        'Pasarelas de pago',
        '2 GB almacenamiento',
        'Soporte prioritario por email',
      ],
    },
    {
      id: 'PREMIUM_IA',
      name: 'Plan Premium',
      price: 50,
      currency: 'EUR',
      interval: 'year',
      priceId: 'price_1SiMu2DpmJIxYFlv3ZHbLKBg',
      limits: {
        clients: -1,
        pianos: -1,
        servicesPerMonth: -1,
        invoicesPerMonth: -1,
        storage: '5 GB',
      },
      features: [
        'Todo lo del Plan Pro',
        'Asistente de chat con IA (Gemini)',
        'Predicciones con IA',
        'Generación automática de emails',
        'Informes de servicio con IA',
        'Análisis de riesgo de clientes',
        'Sugerencias de precios inteligentes',
        'Workflows avanzados',
        'Marca blanca (tienda exclusiva)',
        'API personalizada',
        '5 GB almacenamiento',
        'Soporte prioritario por email',
      ],
    },
  ];
  
  // DEBUG
  React.useEffect(() => {
    console.log('[DEBUG] plansData:', plansData);
    console.log('[DEBUG] plans (with fallback):', plans);
    console.log('[DEBUG] plansLoading:', plansLoading);
    console.log('[DEBUG] plansError:', plansError);
  }, [plansData, plans, plansLoading, plansError]);
  
  // Obtener plan actual del usuario
  const { data: currentPlan, isLoading: currentPlanLoading } = trpc.advanced.subscription.getCurrentPlan.useQuery();

  // Mutation para crear checkout
  const createCheckout = trpc.advanced.subscription.createCheckout.useMutation({
    onSuccess: async (data) => {
      if (data.url) {
        // Abrir Stripe Checkout en el navegador
        if (Platform.OS === 'web') {
          window.location.href = data.url;
        } else {
          await Linking.openURL(data.url);
        }
      }
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error('Error creating checkout:', error);
      setIsProcessing(false);
      alert('Error al procesar el pago. Por favor, inténtalo de nuevo.');
    },
  });

  // Mutation para abrir portal de gestión
  const createPortal = trpc.advanced.subscription.createPortal.useMutation({
    onSuccess: async (data) => {
      if (data.url) {
        if (Platform.OS === 'web') {
          window.location.href = data.url;
        } else {
          await Linking.openURL(data.url);
        }
      }
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error('Error creating portal:', error);
      setIsProcessing(false);
    },
  });

  const handleSelectPlan = async (planId: PlanId) => {
    if (planId === 'FREE' || planId === currentPlan?.plan) return;
    
    setSelectedPlan(planId);
    setIsProcessing(true);

    const baseUrl = Platform.OS === 'web' 
      ? window.location.origin 
      : 'https://piano-emotion-manager.vercel.app';

    createCheckout.mutate({
      plan: planId as 'PROFESSIONAL' | 'PREMIUM_IA',
      successUrl: `${baseUrl}/settings/subscription?success=true`,
      cancelUrl: `${baseUrl}/settings/subscription?canceled=true`,
    });
  };

  const handleManageSubscription = () => {
    setIsProcessing(true);
    const baseUrl = Platform.OS === 'web' 
      ? window.location.origin 
      : 'https://piano-emotion-manager.vercel.app';
    
    createPortal.mutate({
      returnUrl: `${baseUrl}/settings/subscription`,
    });
  };

  const isLoading = plansLoading || currentPlanLoading;
  
  // Debug
  console.log('Plans array:', plans);
  console.log('Is loading:', isLoading);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Suscripción' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Cargando planes...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Suscripción' }} />
      
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Banner del plan actual */}
        <View style={styles.currentPlanBanner}>
          <View style={styles.currentPlanInfo}>
            <Text style={styles.currentPlanLabel}>Tu plan actual</Text>
            <Text style={styles.currentPlanName}>
              {plans?.find(p => p.id === currentPlan?.plan)?.name || 'Plan Gratuito'}
            </Text>
          </View>
          {currentPlan?.plan !== 'FREE' && currentPlan?.status === 'active' && (
            <TouchableOpacity 
              style={styles.manageButton}
              onPress={handleManageSubscription}
              disabled={isProcessing}
            >
              <Text style={styles.manageButtonText}>Gestionar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Lista de planes */}
        {plans?.map((plan) => {
          const isCurrentPlan = plan.id === currentPlan?.plan;
          const isPremium = plan.id === 'PREMIUM_IA';
          
          return (
            <View 
              key={plan.id} 
              style={[
                styles.planCard,
                isPremium && styles.planCardPremium,
                isCurrentPlan && styles.planCardCurrent,
              ]}
            >
              {isPremium && (
                <View style={styles.recommendedBadge}>
                  <Ionicons name="star" size={12} color="#fff" />
                  <Text style={styles.recommendedText}>Recomendado</Text>
                </View>
              )}
              
              {isCurrentPlan && (
                <View style={styles.currentBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                  <Text style={styles.currentBadgeText}>Plan actual</Text>
                </View>
              )}

              <Text style={styles.planName}>{plan.name}</Text>
              
              <View style={styles.priceContainer}>
                <Text style={styles.price}>
                  {plan.price === 0 ? 'Gratis' : `€${plan.price}`}
                </Text>
                {plan.price > 0 && (
                  <Text style={styles.priceInterval}>/año</Text>
                )}
              </View>

              <View style={styles.featuresContainer}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Ionicons 
                      name="checkmark-circle" 
                      size={16} 
                      color={isPremium ? '#8B5CF6' : '#10b981'} 
                    />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.selectButton,
                  isCurrentPlan && styles.selectButtonCurrent,
                  isPremium && !isCurrentPlan && styles.selectButtonPremium,
                  plan.id === 'FREE' && styles.selectButtonFree,
                ]}
                onPress={() => handleSelectPlan(plan.id as PlanId)}
                disabled={isCurrentPlan || plan.id === 'FREE' || isProcessing}
              >
                {isProcessing && selectedPlan === plan.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[
                    styles.selectButtonText,
                    isCurrentPlan && styles.selectButtonTextCurrent,
                    plan.id === 'FREE' && styles.selectButtonTextFree,
                  ]}>
                    {isCurrentPlan 
                      ? 'Plan actual' 
                      : plan.id === 'FREE' 
                        ? 'Plan base' 
                        : 'Suscribirse'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Información adicional */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Información importante</Text>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark" size={20} color="#3b82f6" />
            <Text style={styles.infoText}>Pago seguro con Stripe</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="refresh" size={20} color="#3b82f6" />
            <Text style={styles.infoText}>Cancela cuando quieras</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="card" size={20} color="#3b82f6" />
            <Text style={styles.infoText}>Sin compromisos de permanencia</Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  currentPlanBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentPlanInfo: {
    flex: 1,
  },
  currentPlanLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  currentPlanName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  manageButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  manageButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  planCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  planCardPremium: {
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  planCardCurrent: {
    borderWidth: 2,
    borderColor: '#10b981',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  recommendedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  currentBadgeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  price: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
  },
  priceInterval: {
    fontSize: 16,
    color: '#64748b',
    marginLeft: 4,
  },
  featuresContainer: {
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  selectButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
  },
  selectButtonPremium: {
    backgroundColor: '#8B5CF6',
  },
  selectButtonCurrent: {
    backgroundColor: '#e2e8f0',
  },
  selectButtonFree: {
    backgroundColor: '#e2e8f0',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  selectButtonTextCurrent: {
    color: '#64748b',
  },
  selectButtonTextFree: {
    color: '#64748b',
  },
  infoSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
  },
});
