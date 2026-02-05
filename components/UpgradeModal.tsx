/**
 * Upgrade Modal Component
 * Piano Emotion Manager
 * 
 * Modal that appears when a user tries to access a locked feature.
 * Shows the feature they're trying to access and the plan required.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FeatureInfo, PlanInfo } from '@/hooks/useSubscription';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  feature: FeatureInfo | null;
  requiredPlan: PlanInfo | null;
}

const { width: screenWidth } = Dimensions.get('window');

export function UpgradeModal({ visible, onClose, feature, requiredPlan }: UpgradeModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onClose();
    router.push('/settings/subscription');
  };

  if (!feature || !requiredPlan) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <View style={styles.modalContainer}>
          {/* Header with icon */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons 
                name={(feature.icon as any) || 'lock-closed'} 
                size={32} 
                color="#3b82f6" 
              />
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>Función Premium</Text>
            <Text style={styles.featureName}>{feature.name}</Text>
            <Text style={styles.description}>{feature.description}</Text>

            {/* Required plan info */}
            <View style={styles.planInfo}>
              <View style={styles.planBadge}>
                <Ionicons name="star" size={16} color="#f59e0b" />
                <Text style={styles.planBadgeText}>
                  Disponible desde {requiredPlan.name}
                </Text>
              </View>
              
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Desde</Text>
                <Text style={styles.price}>
                  {requiredPlan.monthlyPrice === 0 
                    ? 'Gratis' 
                    : `${requiredPlan.monthlyPrice.toFixed(2)}€/mes`}
                </Text>
                {requiredPlan.yearlyPrice > 0 && (
                  <Text style={styles.yearlyPrice}>
                    o {requiredPlan.yearlyPrice.toFixed(2)}€/año (ahorra 17%)
                  </Text>
                )}
              </View>
            </View>

            {/* Benefits list */}
            <View style={styles.benefitsList}>
              <Text style={styles.benefitsTitle}>Con este plan obtienes:</Text>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                <Text style={styles.benefitText}>{feature.name}</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                <Text style={styles.benefitText}>Soporte prioritario</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                <Text style={styles.benefitText}>Almacenamiento en la nube</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.upgradeButton} 
              onPress={handleUpgrade}
            >
              <Ionicons name="arrow-up-circle" size={20} color="#fff" />
              <Text style={styles.upgradeButtonText}>Ver planes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.laterButton} 
              onPress={onClose}
            >
              <Text style={styles.laterButtonText}>Quizás más tarde</Text>
            </TouchableOpacity>
          </View>

          {/* Note */}
          <Text style={styles.note}>
            💡 Gratis con mínimo de compra en distribuidor
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: Math.min(screenWidth - 40, 400),
    backgroundColor: '#fff',
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 0,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 4,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  featureName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
    marginBottom: 16,
  },
  planInfo: {
    backgroundColor: '#fefce8',
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  planBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  priceContainer: {
    marginTop: 4,
  },
  priceLabel: {
    fontSize: 12,
    color: '#78716c',
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  yearlyPrice: {
    fontSize: 13,
    color: '#10b981',
    marginTop: 2,
  },
  benefitsList: {
    marginBottom: 8,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#4b5563',
  },
  actions: {
    padding: 20,
    paddingTop: 0,
    gap: 10,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 4,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  laterButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  note: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
});

export default UpgradeModal;
