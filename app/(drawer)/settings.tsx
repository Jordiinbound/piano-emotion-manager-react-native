/**
 * Página Principal de Configuración
 * Piano Emotion Manager
 */

import React, { useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useHeader } from '@/contexts/HeaderContext';
import { AnimatedCard } from '@/components/animated-card';
import { Spacing } from '@/constants/theme';

const SETTINGS_SECTIONS = [
  { key: 'ai', icon: 'brain.head.profile', label: 'Configuración IA', color: '#8B5CF6', route: '/ai-settings' },
  { key: 'predictions', icon: 'chart.line.uptrend.xyaxis', label: 'Previsiones', color: '#10B981', route: '/settings/prediction-settings' },
  { key: 'calendar', icon: 'calendar', label: 'Calendario', color: '#A855F7', route: '/calendar-settings' },
  { key: 'inventory', icon: 'shippingbox.fill', label: 'Inventario', color: '#F59E0B', route: '/inventory-settings' },
  { key: 'notifications', icon: 'bell.fill', label: 'Notificaciones', color: '#F97316', route: '/notification-settings' },
  { key: 'invoice', icon: 'doc.text.fill', label: 'Facturación', color: '#3B82F6', route: '/invoice-settings' },
  { key: 'payment', icon: 'creditcard.fill', label: 'Pagos', color: '#635BFF', route: '/payment-settings' },
  { key: 'modules', icon: 'square.grid.2x2.fill', label: 'Módulos y Plan', color: '#8B5CF6', route: '/settings/modules' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { setHeaderConfig } = useHeader();

  // Configurar header
  useFocusEffect(
    React.useCallback(() => {
    setHeaderConfig({
      title: 'Configuracion',
      subtitle: 'Ajustes del sistema',
      icon: 'gearshape.fill',
      showBackButton: false,
    });
    }, [setHeaderConfig])
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {SETTINGS_SECTIONS.map((section) => (
            <AnimatedCard
              key={section.key}
              icon={section.icon}
              label={section.label}
              color={section.color}
              onPress={() => router.push(section.route as any)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
  },
});
