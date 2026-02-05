/**
 * RecentServicesWidget - Widget de servicios recientes del dashboard
 * Muestra los últimos servicios realizados
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useClientsData, useServicesData } from '@/hooks/data';
import { getClientFullName } from '@/types';

interface WidgetProps {
  config?: Record<string, any>;
  isEditing?: boolean;
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall' | 'full';
}

export const RecentServicesWidget = React.memo(function RecentServicesWidget({ config, isEditing }: WidgetProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { services } = useServicesData();
  const { clients } = useClientsData();

  const recentServices = useMemo(() => {
    // Crear un mapa de clientes para búsqueda O(1)
    const clientsMap = new Map(clients.map(c => [c.id, c]));
    
    return services
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, config?.limit || 5)
      .map(service => {
        const client = clientsMap.get(service.clientId);
        return {
          ...service,
          clientName: client ? getClientFullName(client) : 'Cliente desconocido',
        };
      });
  }, [services, clients, config]);

  const handleServicePress = (serviceId: string) => {
    if (!isEditing) {
      router.push(`/services/${serviceId}` as any);
    }
  };

  if (isEditing) {
    return (
      <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
        <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Vista previa de Servicios Recientes
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
      {recentServices.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="construct-outline" size={32} color={colors.textSecondary} />
          <ThemedText style={{ color: colors.textSecondary, marginTop: 8 }}>
            No hay servicios recientes
          </ThemedText>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {recentServices.map((service) => (
            <Pressable
              key={service.id}
              style={[styles.listItem, { borderBottomColor: colors.border }]}
              onPress={() => handleServicePress(service.id)}
            >
              <View style={[styles.listItemIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="construct" size={20} color={colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <ThemedText style={[styles.listItemTitle, { color: colors.text }]}>
                  {service.clientName}
                </ThemedText>
                <ThemedText style={[styles.listItemSubtitle, { color: colors.textSecondary }]}>
                  {new Date(service.date).toLocaleDateString('es-ES')} • {service.cost?.toFixed(2)}€
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