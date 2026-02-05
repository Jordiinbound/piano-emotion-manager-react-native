import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { trpc } from '../utils/trpc';

export default function DebugForecastScreen() {
  const debugQuery = trpc.advanced.predictions.debugHistoricalData.useQuery();

  if (debugQuery.isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.text}>Cargando datos de debug...</Text>
      </View>
    );
  }

  if (debugQuery.error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {debugQuery.error.message}</Text>
      </View>
    );
  }

  const data = debugQuery.data;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>DEBUG: Datos Históricos de Servicios</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Partner ID:</Text>
        <Text style={styles.text}>{data?.partnerId}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Total de Servicios:</Text>
        <Text style={styles.text}>{JSON.stringify(data?.totalServices, null, 2)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rango de Fechas:</Text>
        <Text style={styles.text}>{JSON.stringify(data?.dateRange, null, 2)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Datos Mensuales (últimos 12 meses):</Text>
        <Text style={styles.text}>{JSON.stringify(data?.monthlyData, null, 2)}</Text>
        <Text style={styles.text}>Número de meses con datos: {data?.monthlyData?.length || 0}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
  },
});
