/**
 * InventoryAlertsWidget - Widget de alertas de inventario
 * Muestra alertas de productos con stock bajo
 */

import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

interface WidgetProps {
  config?: Record<string, any>;
  isEditing?: boolean;
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall' | 'full';
}

export const InventoryAlertsWidget = React.memo(function InventoryAlertsWidget({ config, isEditing }: WidgetProps) {
  const { colors } = useTheme();
  const router = useRouter();

  // Simulación de alertas de inventario (conectar con hook real cuando esté disponible)
  const alerts = [
    { id: '1', product: 'Cuerdas de piano', stock: 5, minStock: 10, color: '#F59E0B' },
    { id: '2', product: 'Fieltros', stock: 2, minStock: 15, color: '#EF4444' },
    { id: '3', product: 'Afinadores', stock: 8, minStock: 10, color: '#F59E0B' },
  ];

  const handleAlertPress = () => {
    if (!isEditing) {
      router.push('/inventory' as any);
    }
  };

  if (isEditing) {
    return (
      <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
        <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Vista previa de Alertas de Inventario
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
      {alerts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={32} color={colors.success} />
          <ThemedText style={{ color: colors.textSecondary, marginTop: 8 }}>
            Stock en niveles óptimos
          </ThemedText>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {alerts.map((alert) => (
            <Pressable
              key={alert.id}
              style={[styles.inventoryAlertItem, { borderBottomColor: colors.border }]}
              onPress={handleAlertPress}
            >
              <Ionicons name="alert-circle" size={20} color={alert.color} />
              <View style={styles.inventoryAlertContent}>
                <ThemedText style={[styles.inventoryAlertTitle, { color: colors.text }]}>
                  {alert.product}
                </ThemedText>
                <ThemedText style={[styles.inventoryAlertSubtitle, { color: colors.textSecondary }]}>
                  Stock: {alert.stock} (mínimo: {alert.minStock})
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
});
const styles = StyleSheet.create({
  widgetContent: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  inventoryAlertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  inventoryAlertContent: {
    flex: 1,
    marginLeft: 12,
  },
  inventoryAlertTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  inventoryAlertSubtitle: {
    fontSize: 12,
  },
});