/**
 * Dashboard Screen - Elegant Professional Design
 * Nuevo diseño con Sidebar/Drawer responsive
 */
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import {
  DashboardStats,
  DashboardAlerts,
  DashboardQuickActionsOnly,
  DashboardPredictions,
  DashboardRecentServices,
} from '@/components/dashboard';
import { AlertConfigBanner } from '@/components/dashboard/alert-config-banner';
import { useClientsData, usePianosData, useServicesData, useAppointmentsData, useInvoicesData, useQuotesData } from '@/hooks/data';
import { useRecommendations } from '@/hooks/use-recommendations';
import { useAlertsOptimized } from '@/hooks/use-alerts-optimized';
import { trpc } from '@/utils/trpc';
import { useUser } from '../../lib/clerk-wrapper';
import * as Haptics from 'expo-haptics';

export default function DashboardScreen() {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  // Usuario autenticado
  const { user } = useUser();

  // Datos
  const { clients } = useClientsData();
  const { pianos } = usePianosData();
  const { services } = useServicesData();
  const { appointments } = useAppointmentsData();
  const { invoices } = useInvoicesData();
  const { quotes } = useQuotesData();
  const { urgentCount, pendingCount } = useRecommendations(pianos, services);
  
  // Sistema de alertas optimizado
  const { alerts: optimizedAlerts, stats: optimizedStats, pagination, isLoading: alertsLoading } = useAlertsOptimized(15);
  const allAlerts = { 
    alerts: optimizedAlerts || [], 
    stats: optimizedStats || { total: 0, urgent: 0, warning: 0, info: 0 },
    pagination: pagination || { total: 0, limit: 15, offset: 0, hasMore: false }
  };
  
  // Configuración de alertas (para mostrar banner)
  const { data: alertSettings } = trpc.alertSettings.getSettings.useQuery();
  const [showBanner, setShowBanner] = useState(false);
  
  useEffect(() => {
    if (alertSettings && alertSettings.hasSeenAdvancedConfigTip === 0) {
      setShowBanner(true);
    }
  }, [alertSettings]);

  // Servicios recientes (2 pasados + 2 futuros)
  const recentServices = useMemo(() => {
    const now = new Date();
    
    const pastServices = services
      .filter(s => new Date(s.date) < now)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 2)
      .map(s => ({ ...s, isPast: true }));
    
    const futureServices = services
      .filter(s => new Date(s.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 2)
      .map(s => ({ ...s, isPast: false }));
    
    return [...pastServices, ...futureServices];
  }, [services]);

  // Estadísticas del mes
  const stats = useMemo(() => {
    const selectedServices = services.filter((s) => {
      const serviceDate = new Date(s.date);
      return serviceDate.getMonth() === selectedMonth.getMonth() && 
             serviceDate.getFullYear() === selectedMonth.getFullYear();
    });

    const monthlyRevenue = selectedServices.reduce((sum, s) => sum + (s.cost || 0), 0);

    return {
      totalClients: clients.length,
      totalPianos: pianos.length,
      monthlyServices: selectedServices.length,
      monthlyRevenue,
      urgentCount,
      pendingCount,
    };
  }, [clients, pianos, services, urgentCount, pendingCount, selectedMonth]);

  // Navegación entre meses
  const navigatePreviousMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  }, []);

  const navigateNextMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  }, []);

  const goToCurrentMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMonth(new Date());
  }, []);

  return (
    <ResponsiveLayout title="Inicio">
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Banner de configuración de alertas */}
        {showBanner && (
          <AlertConfigBanner onDismiss={() => setShowBanner(false)} />
        )}

        {/* Alertas */}
        <DashboardAlerts 
          alerts={allAlerts.alerts}
          totalUrgent={allAlerts.stats.urgent}
          totalWarning={allAlerts.stats.warning}
          totalInfo={allAlerts.stats.info}
          clients={clients}
          isLoading={alertsLoading}
          pagination={allAlerts.pagination}
        />

        {/* Estadísticas del mes */}
        <DashboardStats
          stats={stats}
          selectedMonth={selectedMonth}
          onPreviousMonth={navigatePreviousMonth}
          onNextMonth={navigateNextMonth}
          onGoToCurrentMonth={goToCurrentMonth}
        />

        {/* Predicciones IA */}
        <DashboardPredictions />

        {/* Servicios recientes / Próximas citas */}
        <DashboardRecentServices 
          services={recentServices}
          clients={clients}
          pianos={pianos}
        />

        {/* Acciones Rápidas */}
        <DashboardQuickActionsOnly />
      </ScrollView>
    </ResponsiveLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
});
