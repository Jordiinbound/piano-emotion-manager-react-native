/**
 * Client Portal - Dashboard
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { trpc } from '../../utils/trpc';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PortalDashboardScreen() {
  const router = useRouter();
  const { data: summary, isLoading } = trpc.clientPortal.dashboard.getSummary.useQuery();
  const { data: unreadCount } = trpc.clientPortal.messages.getUnreadCount.useQuery();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('portal_token');
    if (!token) {
      router.replace('/portal/login');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('portal_token');
    await AsyncStorage.removeItem('portal_user');
    router.replace('/portal/login');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi Portal</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/portal/services')}
        >
          <Text style={styles.cardTitle}>Servicios</Text>
          <Text style={styles.cardValue}>{summary?.totalServices || 0}</Text>
          <Text style={styles.cardSubtitle}>servicios realizados</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/portal/pianos')}
        >
          <Text style={styles.cardTitle}>Pianos</Text>
          <Text style={styles.cardValue}>{summary?.totalPianos || 0}</Text>
          <Text style={styles.cardSubtitle}>pianos registrados</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/portal/invoices')}
        >
          <Text style={styles.cardTitle}>Facturas</Text>
          <Text style={styles.cardValue}>{summary?.pendingInvoices?.length || 0}</Text>
          <Text style={styles.cardSubtitle}>facturas pendientes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/portal/messages')}
        >
          <Text style={styles.cardTitle}>Mensajes</Text>
          <Text style={styles.cardValue}>{unreadCount?.count || 0}</Text>
          <Text style={styles.cardSubtitle}>mensajes nuevos</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Próximas Citas</Text>
        {summary?.upcomingAppointments?.length === 0 ? (
          <Text style={styles.emptyText}>No tienes citas programadas</Text>
        ) : (
          summary?.upcomingAppointments?.map((appointment: any) => (
            <View key={appointment.id} style={styles.listItem}>
              <Text style={styles.listItemTitle}>{appointment.serviceType}</Text>
              <Text style={styles.listItemSubtitle}>{appointment.date}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Servicios Recientes</Text>
        {summary?.recentServices?.length === 0 ? (
          <Text style={styles.emptyText}>No hay servicios recientes</Text>
        ) : (
          summary?.recentServices?.map((service: any) => (
            <View key={service.id} style={styles.listItem}>
              <Text style={styles.listItemTitle}>{service.serviceType}</Text>
              <Text style={styles.listItemSubtitle}>{service.date}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  logoutText: {
    color: '#2196F3',
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 4,
    padding: 20,
    margin: 10,
    width: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    padding: 20,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  listItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  listItemTitle: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});
