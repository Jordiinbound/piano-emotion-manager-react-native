/**
 * Página Principal de Reportes y Analytics
 * Piano Emotion Manager
 */

import React, { useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useHeader } from '@/contexts/HeaderContext';
import { AnalyticsDashboard } from '@/components/reports';

export default function ReportsScreen() {
  const router = useRouter();
  const { setHeaderConfig } = useHeader();

  // Configurar header
  useFocusEffect(
    React.useCallback(() => {
    setHeaderConfig({
      title: 'Reportes',
      subtitle: 'Analisis y estadisticas del negocio',
      icon: 'chart.bar.fill',
      showBackButton: false,
    });
    }, [setHeaderConfig])
  );

  return (
    <View style={styles.container}>
      <AnalyticsDashboard
        onNavigateToReports={() => router.push('/analytics/report')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
});
