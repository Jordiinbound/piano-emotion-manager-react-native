/**
 * Timeline Item Component
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

interface TimelineItemProps {
  event: {
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: Date;
    icon: string;
    color: string;
    relatedEntityId?: string;
    relatedEntityType?: string;
  };
}

export function TimelineItem({ event }: TimelineItemProps) {
  const router = useRouter();

  const handlePress = () => {
    if (!event.relatedEntityId || !event.relatedEntityType) return;

    // Navigate to related entity
    const routes: Record<string, string> = {
      service: `/services/${event.relatedEntityId}`,
      invoice: `/invoices/${event.relatedEntityId}`,
      appointment: `/appointments/${event.relatedEntityId}`,
      piano: `/pianos/${event.relatedEntityId}`,
      message: `/portal/messages`,
    };

    const route = routes[event.relatedEntityType];
    if (route) {
      router.push(route as any);
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      disabled={!event.relatedEntityId}
    >
      <View style={[styles.iconContainer, { backgroundColor: event.color + '20' }]}>
        <Text style={styles.icon}>{event.icon}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.timestamp}>{formatTime(event.timestamp)}</Text>
        {event.description && (
          <Text style={styles.description} numberOfLines={2}>
            {event.description}
          </Text>
        )}
        {event.relatedEntityId && (
          <Text style={styles.link}>Ver detalles →</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 4,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  link: {
    fontSize: 14,
    color: '#2196F3',
    marginTop: 4,
  },
});
