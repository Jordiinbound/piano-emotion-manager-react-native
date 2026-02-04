/**
 * Página Principal de Reportes y Analytics
 * Piano Emotion Manager
 */

import React, { useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useHeader } from '@/contexts/HeaderContext';
import { useTranslation } from '@/hooks/use-translation';
import { AnalyticsDashboard } from '@/components/reports';

export default function ReportsScreen() {
  const router = useRouter();
  const { setHeaderConfig } = useHeader();
  const { t } = useTranslation();

  // Configurar header en montaje inicial (para hard refresh)
  useEffect(() => {
    setHeaderConfig({
      title: t('navigation.reports'),
      subtitle: t('reports.subtitle'),
      icon: 'chart.bar.fill',
      showBackButton: false,
    });
  }, [setHeaderConfig, t]);

  // Configurar header cuando la pantalla recibe foco (navegación)
  useFocusEffect(
    React.useCallback(() => {
    setHeaderConfig({
      title: t('navigation.reports'),
      subtitle: t('reports.subtitle'),
      icon: 'chart.bar.fill',
      showBackButton: false,
    });
    }, [setHeaderConfig, t])
  );

  return (
    <View style={styles.container}>
      <AnalyticsDashboard
        onNavigateToReports={() => router.push('/analytics')}
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
