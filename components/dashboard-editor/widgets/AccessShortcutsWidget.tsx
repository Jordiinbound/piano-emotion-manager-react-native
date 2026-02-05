/**
 * AccessShortcutsWidget - Widget de accesos directos del dashboard
 * Proporciona acceso rápido a las secciones principales de la aplicación
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

export const AccessShortcutsWidget = React.memo(function AccessShortcutsWidget({ config, isEditing }: WidgetProps) {
  const { colors } = useTheme();
  const router = useRouter();

  // Accesos disponibles que el usuario puede elegir
  const availableShortcuts = [
    { id: 'clients', icon: 'people', label: 'Clientes', color: '#3B82F6', route: '/clients' },
    { id: 'pianos', icon: 'musical-notes', label: 'Pianos', color: '#8B5CF6', route: '/pianos' },
    { id: 'services', icon: 'construct', label: 'Servicios', color: '#10B981', route: '/services' },
    { id: 'agenda', icon: 'calendar', label: 'Agenda', color: '#F59E0B', route: '/agenda' },
    { id: 'invoices', icon: 'document-text', label: 'Facturas', color: '#EF4444', route: '/invoices' },
    { id: 'quotes', icon: 'calculator', label: 'Presupuestos', color: '#06B6D4', route: '/quotes' },
    { id: 'inventory', icon: 'cube', label: 'Inventario', color: '#EC4899', route: '/inventory' },
    { id: 'partners', icon: 'briefcase', label: 'Proveedores', color: '#14B8A6', route: '/partners' },
    { id: 'contracts', icon: 'document', label: 'Contratos', color: '#6366F1', route: '/contracts' },
    { id: 'reminders', icon: 'notifications', label: 'Recordatorios', color: '#F97316', route: '/reminders' },
    { id: 'reports', icon: 'bar-chart', label: 'Informes', color: '#22C55E', route: '/reports' },
    { id: 'settings', icon: 'settings', label: 'Ajustes', color: '#64748B', route: '/settings' },
  ];

  // Si el usuario ha configurado sus accesos, usarlos; si no, mostrar los primeros 6
  const selectedShortcuts = config?.shortcuts 
    ? availableShortcuts.filter(s => config.shortcuts.includes(s.id))
    : availableShortcuts.slice(0, 6);

  const handleShortcut = (route: string) => {
    if (!isEditing) {
      router.push(route as any);
    }
  };

  return (
    <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
      <View style={styles.shortcutsGrid}>
        {selectedShortcuts.map((shortcut) => (
          <Pressable
            key={shortcut.id}
            style={[styles.shortcutButton, { backgroundColor: `${shortcut.color}15` }]}
            onPress={() => handleShortcut(shortcut.route)}
            disabled={isEditing}
          >
            <View style={[styles.shortcutIconContainer, { backgroundColor: shortcut.color }]}>
              <Ionicons name={shortcut.icon as any} size={20} color="#FFFFFF" />
            </View>
            <ThemedText style={[styles.shortcutLabel, { color: colors.text }]}>
              {shortcut.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
      {isEditing && (
        <ThemedText style={{ color: colors.textSecondary, fontSize: 11, marginTop: 8, textAlign: 'center' }}>
          Configurable: elige qué accesos mostrar
        </ThemedText>
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
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shortcutButton: {
    flex: 1,
    minWidth: '30%',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  shortcutLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});