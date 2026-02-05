/**
 * Alert Config Banner Component
 * Piano Emotion Manager
 * 
 * Banner informativo que se muestra la primera vez que el usuario entra al dashboard
 * para informarle sobre la configuración avanzada de alertas.
 */

import { memo } from 'react';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { trpc } from '@/utils/trpc';

interface AlertConfigBannerProps {
  onDismiss: () => void;
}

export const AlertConfigBanner = memo(function AlertConfigBanner({ onDismiss }: AlertConfigBannerProps) {
  const utils = trpc.useUtils();
  const dismissMutation = trpc.alertSettings.updateSettings.useMutation({
    onSuccess: () => {
      utils.alertSettings.getSettings.invalidate();
      onDismiss();
    },
  });

  const handleGoToSettings = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/settings/alert-settings');
  };

  const handleDismiss = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Marcar como visto en la base de datos
    dismissMutation.mutate({
      hasSeenAdvancedConfigTip: 1,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="bulb-outline" size={24} color="#F59E0B" />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>¿Sabías que puedes personalizar los umbrales de alertas?</Text>
        <Text style={styles.description}>
          Configura cuándo quieres recibir avisos de afinación, regulación, facturas y más según tus preferencias.
        </Text>
        
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={handleGoToSettings}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryButtonText}>Ir a Configuración</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={handleDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={handleDismiss}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={20} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#78350F',
    marginBottom: 12,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D97706',
  },
  secondaryButtonText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});
