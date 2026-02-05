/**
 * AdvancedToolsWidget - Widget de herramientas avanzadas del dashboard
 * Proporciona acceso a funcionalidades avanzadas y módulos premium
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

export const AdvancedToolsWidget = React.memo(function AdvancedToolsWidget({ config, isEditing }: WidgetProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const tools = [
    { id: 'store', icon: 'storefront', label: 'Tienda', color: '#10B981', route: '/store' },
    { id: 'calendar_plus', icon: 'calendar-outline', label: 'Calendario+', color: '#3B82F6', route: '/calendar-plus' },
    { id: 'dashboard_editor', icon: 'grid', label: 'Dashboard+', color: '#EC4899', route: '/dashboard-editor' },
    { id: 'team', icon: 'people-circle', label: 'Equipos', color: '#8B5CF6', route: '/team' },
    { id: 'crm', icon: 'analytics', label: 'CRM', color: '#06B6D4', route: '/crm' },
    { id: 'reports_advanced', icon: 'document-text', label: 'Reportes', color: '#6366F1', route: '/reports' },
    { id: 'portal', icon: 'globe', label: 'Portal Clientes', color: '#14B8A6', route: '/portal' },
    { id: 'distributor', icon: 'business', label: 'Distribuidor', color: '#EF4444', route: '/distributor' },
    { id: 'marketing', icon: 'megaphone', label: 'Marketing', color: '#F97316', route: '/marketing' },
    { id: 'payments', icon: 'card', label: 'Pasarelas Pago', color: '#22C55E', route: '/payments' },
    { id: 'accounting', icon: 'calculator', label: 'Contabilidad', color: '#64748B', route: '/accounting' },
    { id: 'workflows', icon: 'git-branch', label: 'Workflows', color: '#EC4899', route: '/workflows' },
    { id: 'ai', icon: 'sparkles', label: 'IA Avanzada', color: '#8B5CF6', route: '/ai' },
  ];

  const handleTool = (route: string) => {
    if (!isEditing) {
      router.push(route as any);
    }
  };

  return (
    <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.toolsGrid}>
          {tools.map((tool) => (
            <Pressable
              key={tool.id}
              style={[styles.toolButton, { backgroundColor: `${tool.color}10`, borderColor: `${tool.color}30` }]}
              onPress={() => handleTool(tool.route)}
              disabled={isEditing}
            >
              <Ionicons name={tool.icon as any} size={24} color={tool.color} />
              <ThemedText style={[styles.toolLabel, { color: colors.text }]}>
                {tool.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
});
const styles = StyleSheet.create({
  widgetContent: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toolButton: {
    flex: 1,
    minWidth: '30%',
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
});