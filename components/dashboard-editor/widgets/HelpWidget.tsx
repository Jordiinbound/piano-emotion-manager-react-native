/**
 * HelpWidget - Widget de ayuda del dashboard
 * Proporciona acceso rápido a recursos de ayuda y soporte
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

export const HelpWidget = React.memo(function HelpWidget({ config, isEditing }: WidgetProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const helpItems = [
    { id: 'docs', icon: 'book', label: 'Documentación', color: '#3B82F6', route: '/help/docs' },
    { id: 'tutorials', icon: 'play-circle', label: 'Tutoriales', color: '#10B981', route: '/help/tutorials' },
    { id: 'faq', icon: 'help-circle', label: 'Preguntas frecuentes', color: '#F59E0B', route: '/help/faq' },
    { id: 'support', icon: 'chatbubbles', label: 'Soporte', color: '#EF4444', route: '/help/support' },
    { id: 'whats-new', icon: 'sparkles', label: 'Novedades', color: '#8B5CF6', route: '/help/whats-new' },
    { id: 'feedback', icon: 'megaphone', label: 'Enviar feedback', color: '#06B6D4', route: '/help/feedback' },
  ];

  const handleHelpItem = (route: string) => {
    if (!isEditing) {
      router.push(route as any);
    }
  };

  return (
    <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {helpItems.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.helpItem, { borderBottomColor: colors.border }]}
            onPress={() => handleHelpItem(item.route)}
            disabled={isEditing}
          >
            <View style={[styles.helpItemIcon, { backgroundColor: `${item.color}15` }]}>
              <Ionicons name={item.icon as any} size={20} color={item.color} />
            </View>
            <ThemedText style={[styles.helpItemLabel, { color: colors.text }]}>
              {item.label}
            </ThemedText>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>
        ))}
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
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  helpItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpItemLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  },
});