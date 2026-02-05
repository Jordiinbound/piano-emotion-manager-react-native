/**
 * MapWidget - Widget de mapa de clientes del dashboard
 * Muestra un placeholder para acceder al mapa de clientes
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

interface WidgetProps {
  config?: Record<string, any>;
  isEditing?: boolean;
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall' | 'full';
}

export const MapWidget = React.memo(function MapWidget({ config, isEditing }: WidgetProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const handleMapPress = () => {
    if (!isEditing) {
      router.push('/clients-map' as any);
    }
  };

  return (
    <Pressable 
      style={[styles.widgetContent, { backgroundColor: colors.card }]}
      onPress={handleMapPress}
      disabled={isEditing}
    >
      <View style={styles.mapPlaceholder}>
        <Ionicons name="map" size={48} color={colors.primary} />
        <ThemedText style={[styles.mapText, { color: colors.text }]}>
          Mapa de Clientes
        </ThemedText>
        <ThemedText style={[styles.mapSubtext, { color: colors.textSecondary }]}>
          Toca para ver el mapa completo
        </ThemedText>
      </View>
    </Pressable>
  );
});
const styles = StyleSheet.create({
  widgetContent: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  mapText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  mapSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
});