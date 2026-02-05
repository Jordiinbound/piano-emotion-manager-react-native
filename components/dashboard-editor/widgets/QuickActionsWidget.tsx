/**
 * QuickActionsWidget - Widget de acciones rápidas del dashboard
 * Proporciona acceso rápido a las acciones más comunes
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

export const QuickActionsWidget = React.memo(function QuickActionsWidget({ config, isEditing }: WidgetProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const actions = [
    { id: 'new-service', icon: 'add-circle', label: 'Nuevo Servicio', color: '#10B981', route: '/services/new' },
    { id: 'new-client', icon: 'person-add', label: 'Nuevo Cliente', color: '#3B82F6', route: '/clients/new' },
    { id: 'new-appointment', icon: 'calendar', label: 'Nueva Cita', color: '#F59E0B', route: '/agenda/new' },
    { id: 'new-invoice', icon: 'document-text', label: 'Nueva Factura', color: '#8B5CF6', route: '/invoices/new' },
  ];

  const handleAction = (route: string) => {
    if (!isEditing) {
      router.push(route as any);
    }
  };

  return (
    <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
      <View style={styles.actionsGrid}>
        {actions.map((action) => (
          <Pressable
            key={action.id}
            style={[styles.actionButton, { backgroundColor: `${action.color}15` }]}
            onPress={() => handleAction(action.route)}
            disabled={isEditing}
          >
            <Ionicons name={action.icon as any} size={24} color={action.color} />
            <ThemedText style={[styles.actionLabel, { color: colors.text }]}>
              {action.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
});
const styles = StyleSheet.create({
  widgetContent: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
});