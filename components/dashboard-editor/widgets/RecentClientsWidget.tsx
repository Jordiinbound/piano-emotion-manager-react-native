/**
 * RecentClientsWidget - Widget de clientes recientes del dashboard
 * Muestra los últimos clientes añadidos al sistema
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useClientsData } from '@/hooks/data';
import { getClientFullName } from '@/types';

interface WidgetProps {
  config?: Record<string, any>;
  isEditing?: boolean;
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall' | 'full';
}

export const RecentClientsWidget = React.memo(function RecentClientsWidget({ config, isEditing }: WidgetProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { clients } = useClientsData();

  const recentClients = useMemo(() => {
    return clients
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, config?.limit || 5);
  }, [clients, config]);

  const handleClientPress = (clientId: string) => {
    if (!isEditing) {
      router.push(`/clients/${clientId}` as any);
    }
  };

  if (isEditing) {
    return (
      <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
        <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Vista previa de Clientes Recientes
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
      {recentClients.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={32} color={colors.textSecondary} />
          <ThemedText style={{ color: colors.textSecondary, marginTop: 8 }}>
            No hay clientes recientes
          </ThemedText>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {recentClients.map((client) => (
            <Pressable
              key={client.id}
              style={[styles.listItem, { borderBottomColor: colors.border }]}
              onPress={() => handleClientPress(client.id)}
            >
              <View style={[styles.listItemIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="person" size={20} color={colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <ThemedText style={[styles.listItemTitle, { color: colors.text }]}>
                  {getClientFullName(client)}
                </ThemedText>
                <ThemedText style={[styles.listItemSubtitle, { color: colors.textSecondary }]}>
                  {client.email || client.phone || 'Sin contacto'}
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
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  listItemSubtitle: {
    fontSize: 12,
  },
});