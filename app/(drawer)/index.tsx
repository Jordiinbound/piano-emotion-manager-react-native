/**
 * Dashboard Screen - Elegant Professional Design
 * Piano Emotion Manager
 * 
 * Diseño aprobado con:
 * - Barra de alertas (verde/roja, compacta y elegante)
 * - Grid 2x2 de métricas "Este Mes"
 * - Predicciones IA con indicadores circulares
 * - Próximas citas
 * - Acciones rápidas (botones terracota)
 * - Botón flotante IA
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useHeader } from '@/contexts/HeaderContext';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

// Hooks y datos
import { useServicesData, useAppointmentsData, usePianosData, useInvoicesData, useQuotesData } from '@/hooks/data';
import { useTranslation } from '@/hooks/use-translation';
import { trpc } from '@/utils/trpc';
import { useAllAlerts } from '@/hooks/use-all-alerts';
import { usePredictionsSummary, useChurnRisk, useMaintenancePredictions, useInventoryPredictions, useWorkloadPredictions } from '@/hooks/use-predictions';
import { formatCompactNumber } from '@/utils/format';

// Colores del diseño Elegant Professional (tonalidad suave)
const COLORS = {
  primary: '#003a8c',      // Azul Cobalto (mantener cabecera)
  accent: '#e07a5f',       // Terracota
  white: '#ffffff',
  background: '#f5f5f5',
  
  // Alertas (tonos suaves)
  alertSuccess: '#52a67d', // Verde suave
  alertDanger: '#d66b6b',  // Rojo suave
  
  // Métricas (tonos suaves manteniendo colores originales)
  services: '#5b7fc7',     // Azul suave (antes #003a8c)
  income: '#52a67d',       // Verde suave (antes #10b981)
  clients: '#5ba3b8',      // Cian suave (antes #0891b2)
  pianos: '#9b7fc9',       // Violeta suave (antes #7c3aed)
  
  // IA (tono suave)
  aiWarning: '#d9a05b',    // Naranja/dorado suave (antes #f59e0b)
  
  // Textos
  textPrimary: '#1a1a1a',
  textSecondary: '#666666',
};

export default function DashboardScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { setHeaderConfig } = useHeader();
  const { width } = useWindowDimensions();
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Configurar header
  useFocusEffect(
    React.useCallback(() => {
    setHeaderConfig({
      title: 'Inicio',
      subtitle: 'Panel de control principal',
      icon: 'house.fill',
      showBackButton: false,
    });
    }, [setHeaderConfig])
  );

  // Datos
  const { services } = useServicesData();
  const { appointments, upcomingAppointments: hookUpcomingAppointments, loading: appointmentsLoading } = useAppointmentsData();
  const { pianos } = usePianosData({ pageSize: 5000 });
  const { invoices } = useInvoicesData();
  const { quotes } = useQuotesData();
  const { alerts, stats: alertStats } = useAllAlerts(pianos, services, appointments, invoices, quotes);
  
  // Predicciones
  const { data: predictionsSummary, isLoading: isPredictionsLoading } = usePredictionsSummary();
  const { data: churnRisk } = useChurnRisk();
  const { data: maintenancePredictions } = useMaintenancePredictions();
  const { data: inventoryPredictions } = useInventoryPredictions();
  const { data: workloadPredictions } = useWorkloadPredictions(4);

  // Determinar si es móvil, tablet o desktop
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  // Obtener métricas del mes seleccionado desde el backend
  const { data: monthStats, isLoading: isLoadingStats } = trpc.dashboard.getMonthlyMetrics.useQuery({
    year: selectedMonth.getFullYear(),
    month: selectedMonth.getMonth() + 1, // JavaScript usa 0-11, backend usa 1-12
  });

  // Valores por defecto mientras carga
  const stats = monthStats || {
    clients: 0,
    pianos: 0,
    services: 0,
    revenue: 0,
  };

  // Próximas citas (3 más cercanas) - usar las del hook que ya están calculadas correctamente
  const upcomingAppointments = useMemo(() => {
    return hookUpcomingAppointments.slice(0, 3);
  }, [hookUpcomingAppointments]);

  // Navegación de meses
  const navigatePreviousMonth = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  }, []);

  const navigateNextMonth = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  }, []);

  const goToToday = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedMonth(new Date());
  }, []);

  // Determinar estado de alertas
  const hasAlerts = (alertStats?.urgent || 0) + (alertStats?.warning || 0) > 0;
  const alertCount = (alertStats?.urgent || 0) + (alertStats?.warning || 0);

  return (
    <View style={styles.container as any}>
      <ScrollView
        style={styles.scrollView as any}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. BARRA DE ALERTAS - Compacta y elegante */}
        <Pressable
          style={styles.alertBanner}
          onPress={() => router.push('/alerts')}
        >
          <LinearGradient
            colors={hasAlerts 
              ? ['#e89090', '#e08080', '#d87070'] // Rojo sutil: menos contraste
              : ['#75c8a0', '#65b890', '#5aad85'] // Verde sutil: menos contraste
            }
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 0 }}
            style={styles.alertGradient as any}
          >
            <View style={styles.alertContent as any}>
              <Ionicons
                name={hasAlerts ? 'warning-outline' : 'checkmark-circle-outline'}
                size={18}
                color={COLORS.white}
              />
              <Text style={styles.alertText as any}>
                {hasAlerts
                  ? `${alertCount} ${alertCount === 1 ? 'alerta requiere' : 'alertas requieren'} tu atención`
                  : 'Todo en orden'}
              </Text>
            </View>
            {hasAlerts && (
              <Text style={styles.alertLink as any}>Ver →</Text>
            )}
          </LinearGradient>
        </Pressable>

        {/* Contenedor principal con padding */}
        <View style={styles.mainContent as any}>
          {/* 2. SECCIÓN "ESTE MES" + PREDICCIONES IA */}
          <View style={[styles.topSection, isDesktop && styles.topSectionDesktop]}>
            {/* Este Mes - Grid 2x2 */}
            <View style={[styles.thisMonthContainer, isDesktop && styles.thisMonthDesktop]}>
              {/* Header con navegación */}
              <View style={styles.sectionHeader as any}>
                <Text style={styles.sectionTitle as any}>Este Mes</Text>
                <View style={styles.monthNavigation as any}>
                  <Pressable
                    style={styles.monthButton as any}
                    onPress={navigatePreviousMonth}
                  >
                    <Ionicons name="chevron-back" size={20} color={COLORS.textSecondary} />
                  </Pressable>
                  <Pressable style={styles.todayButton as any} onPress={goToToday}>
                    <Text style={styles.todayText as any}>
                      {selectedMonth.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }).replace('.', '')}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.monthButton as any}
                    onPress={navigateNextMonth}
                  >
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                  </Pressable>
                  <Pressable 
                    style={styles.calendarButton as any}
                    onPress={() => router.push('/calendar')}
                  >
                    <Ionicons name="calendar-outline" size={20} color={COLORS.aiWarning} />
                  </Pressable>
                </View>
              </View>

              {/* Grid de métricas 2x2 */}
              {isLoadingStats ? (
                <View style={[styles.metricsGrid as any, { justifyContent: 'center', alignItems: 'center', minHeight: 200 }]}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={{ marginTop: 12, color: COLORS.textSecondary, fontSize: 14 }}>Cargando métricas...</Text>
                </View>
              ) : (
              <View style={styles.metricsGrid as any}>
                <MetricCard
                  icon="construct-outline"
                  iconColor={COLORS.services}
                  value={stats.services.toString()}
                  label="Servicios"
                  onPress={() => router.push('/(drawer)/services')}
                />
                <MetricCard
                  icon="cash-outline"
                  iconColor={COLORS.income}
                  value={`${stats.revenue.toFixed(0)} €`}
                  label="Ingresos"
                  onPress={() => router.push('/(drawer)/invoices')}
                />
                <MetricCard
                  icon="people-outline"
                  iconColor={COLORS.clients}
                  value={stats.clients.toString()}
                  label="Clientes"
                  onPress={() => router.push('/(drawer)/clients')}
                />
                <MetricCard
                  icon="musical-notes-outline"
                  iconColor={COLORS.pianos}
                  value={stats.pianos.toString()}
                  label="Pianos"
                  onPress={() => router.push('/(drawer)/inventory')}
                />
              </View>
              )}
            </View>

            {/* Predicciones IA */}
            <View style={[styles.aiPredictionsContainer, isDesktop && styles.aiPredictionsDesktop]}>
              <View style={styles.sectionHeader as any}>
                <View style={styles.aiHeaderLeft as any}>
                  <Ionicons name="bulb-outline" size={22} color={COLORS.pianos} />
                  <Text style={styles.sectionTitle as any}>Previsión próximos 30 días</Text>
                </View>
                <Pressable onPress={() => router.push('/predictions')}>
                  <Text style={styles.linkText as any}>Ver todo →</Text>
                </Pressable>
              </View>

              {isPredictionsLoading ? (
                <View style={{ justifyContent: 'center', alignItems: 'center', minHeight: 200, paddingVertical: 40 }}>
                  <ActivityIndicator size="large" color={COLORS.pianos} />
                  <Text style={{ marginTop: 12, color: COLORS.textSecondary, fontSize: 14 }}>Calculando previsiones...</Text>
                </View>
              ) : (
                <>
              <View style={styles.predictionsRow as any}>
                <CircularIndicator
                  color={COLORS.income}
                  icon="trending-up"
                  label="Ingresos prev."
                  value={predictionsSummary?.revenue?.nextMonthValue ? formatCompactNumber(predictionsSummary.revenue.nextMonthValue) : '-'}
                />
                <CircularIndicator
                  color={COLORS.aiWarning}
                  icon="help-circle-outline"
                  label="Clientes riesgo"
                  value={predictionsSummary?.clientChurn?.atRiskCount?.toString() || '0'}
                />
                <CircularIndicator
                  color={COLORS.pianos}
                  icon="build-outline"
                  label="Servic. Próximos"
                  value={predictionsSummary?.maintenance?.nextMonth?.toString() || '0'}
                />
              </View>
              
              {/* Segunda fila de predicciones */}
              <View style={styles.predictionsRow as any}>
                <CircularIndicator
                  color={COLORS.clients}
                  icon="cube-outline"
                  label="Inventario"
                  value={predictionsSummary?.inventory?.urgentItems?.toString() || '0'}
                />
                <CircularIndicator
                  color={COLORS.services}
                  icon="calendar-outline"
                  label="Carga trabajo"
                  value={predictionsSummary?.workload?.totalNext30Days?.toString() || '0'}
                />
              </View>
                </>
              )}
            </View>
          </View>

          {/* 3. PRÓXIMAS CITAS + ACCIONES RÁPIDAS */}
          <View style={[styles.bottomSection, isDesktop && styles.bottomSectionDesktop]}>
            {/* Próximas Citas */}
            <View style={[styles.appointmentsContainer, isDesktop && styles.appointmentsDesktop]}>
              <Text style={styles.sectionTitle as any}>Próximas Citas</Text>
              {appointmentsLoading ? (
                <View style={styles.loadingContainer as any}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText as any}>Cargando citas...</Text>
                </View>
              ) : upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((apt, index) => (
                  <AppointmentRow
                    key={apt.id}
                    appointment={apt}
                    onPress={() => {
                      // Navegación asíncrona para evitar bloqueo de UI
                      setTimeout(() => {
                        router.push(`/appointment/${apt.id}`);
                      }, 0);
                    }}
                  />
                ))
              ) : (
                <View style={styles.emptyState as any}>
                  <Ionicons name="calendar-outline" size={48} color={COLORS.textSecondary} />
                  <Text style={styles.emptyText as any}>No hay citas próximas</Text>
                </View>
              )}
            </View>

            {/* Acciones Rápidas */}
            <View style={[styles.quickActionsContainer, isDesktop && styles.quickActionsDesktop]}>
              <Text style={styles.sectionTitle as any}>Acciones Rápidas</Text>
              <View style={styles.actionsGrid as any}>
                <ActionButton icon="person-add-outline" label="Nuevo Cliente" onPress={() => router.push('/client/new')} />
                <ActionButton icon="construct-outline" label="Nuevo Servicio" onPress={() => router.push('/service/new')} />
                <ActionButton icon="receipt-outline" label="Nueva Factura" onPress={() => router.push('/invoice/new')} />
                <ActionButton icon="musical-notes-outline" label="Nuevo Piano" onPress={() => router.push('/piano/new')} />
                <ActionButton icon="document-text-outline" label="Nuevo Presupuesto" onPress={() => router.push('/quote/new')} />
                <ActionButton icon="calendar-outline" label="Nueva Cita" onPress={() => router.push('/appointment/new')} />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>


    </View>
  );
}

// ============================================================================
// COMPONENTES
// ============================================================================

interface MetricCardProps {
  icon: string;
  iconColor: string;
  value: string;
  label: string;
  onPress?: () => void;
}

function MetricCard({ icon, iconColor, value, label, onPress }: MetricCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.metricCard,
        pressed && styles.metricCardPressed,
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon as any} size={32} color={iconColor} />
      <Text style={styles.metricValue as any}>{value}</Text>
      <Text style={styles.metricLabel as any}>{label}</Text>
    </Pressable>
  );
}

interface CircularIndicatorProps {
  color: string;
  icon: string;
  label: string;
  value: string;
}

function CircularIndicator({ color, icon, label, value }: CircularIndicatorProps) {
  return (
    <View style={styles.circularIndicator as any}>
      <View style={[styles.circle, { borderColor: color }]}>
        <Ionicons name={icon as any} size={24} color={color} />
        <Text style={[styles.circleValue, { color }]}>{value}</Text>
      </View>
      <Text style={styles.circleLabel as any}>{label}</Text>
    </View>
  );
}

interface AppointmentRowProps {
  appointment: any;
  onPress: () => void;
}

function AppointmentRow({ appointment, onPress }: AppointmentRowProps) {
  // Usar startTime directamente en lugar de extraer de date
  const timeStr = appointment.startTime || '00:00';
  // Parsear la fecha correctamente (YYYY-MM-DD)
  const [year, month, day] = appointment.date.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month es 0-indexed
  const dateStr = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

  return (
    <Pressable
      style={({ pressed }) => [
        styles.appointmentRow,
        pressed && styles.appointmentRowPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.appointmentTime as any}>
        <Text style={styles.appointmentTimeText as any}>{timeStr}</Text>
        <Text style={styles.appointmentDateText as any}>{dateStr}</Text>
      </View>
      <View style={styles.appointmentDetails as any}>
        <Text style={styles.appointmentTitle as any} numberOfLines={1}>
          {appointment.title || 'Cita sin título'}
        </Text>
        <Text style={styles.appointmentClient as any} numberOfLines={1}>
          {appointment.clientName || 'Cliente no especificado'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
    </Pressable>
  );
}

interface ActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
}

function ActionButton({ icon, label, onPress }: ActionButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionButton,
        pressed && styles.actionButtonPressed,
      ]}
      onPress={onPress}
    >
      <LinearGradient
        colors={['#e88568', '#e07a5f', '#d86f54']} // Terracota más cercano al color original
        start={{ x: 1, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.actionButtonGradient as any}
      >
        <Ionicons name={icon as any} size={24} color={COLORS.white} />
        <Text style={styles.actionButtonText as any}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 72, // Espacio para el botón flotante (10% menos)
  },

  // Barra de alertas - Compacta y elegante
  alertBanner: {
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 6px 16px rgba(0,0,0,0.2), 0 3px 6px rgba(0,0,0,0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  alertGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '500',
  },
  alertLink: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },

  // Contenido principal
  mainContent: {
    padding: 11,
  },

  // Sección superior
  topSection: {
    gap: 11,
    marginBottom: 11,
    flexDirection: 'column',
  },
  topSectionDesktop: {
    flexDirection: 'row',
    gap: 14,
  },

  // Este Mes
  thisMonthContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 4,
    padding: 11,
    maxWidth: '95%',
    alignSelf: 'center',
    width: '100%',
    ...Platform.select({
      web: {
        boxShadow: '0 6px 16px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  thisMonthDesktop: {
    flex: 1,
    alignSelf: 'stretch',
  },

  // Header de sección
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 11,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Navegación de mes
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthButton: {
    padding: 4,
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: COLORS.background,
  },
  todayText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  calendarButton: {
    padding: 4,
  },

  // Grid de métricas
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  metricCard: {
    backgroundColor: COLORS.white,
    borderRadius: 4,
    padding: 11,
    alignItems: 'center',
    width: 'calc(50% - 5.7px)', // 2 columnas con gap (5% menos)
    minWidth: 133,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
      },
    }),
  },
  metricCardPressed: {
    opacity: 0.7,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 5,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  // Predicciones IA
  aiPredictionsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 4,
    padding: 11,
    maxWidth: '95%',
    alignSelf: 'center',
    width: '100%',
    minHeight: 160,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 20px rgba(0,0,0,0.18), 0 4px 8px rgba(0,0,0,0.12)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
        elevation: 10,
      },
    }),
  },
  aiPredictionsDesktop: {
    flex: 1,
    alignSelf: 'stretch',
  },
  aiHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  predictionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 7,
    minHeight: 120,
    paddingVertical: 16,
  },
  circularIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 4,
  },
  circle: {
    width: 63,
    height: 63,
    borderRadius: 32, // Circular
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    flexDirection: 'column',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
      },
    }),
  },
  circleValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  circleLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },

  // Sección inferior
  bottomSection: {
    gap: 11,
    flexDirection: 'column',
  },
  bottomSectionDesktop: {
    flexDirection: 'row',
    gap: 14,
  },

  // Próximas citas
  appointmentsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 4,
    padding: 11,
    maxWidth: '95%',
    alignSelf: 'center',
    width: '100%',
    minHeight: 250,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 20px rgba(0,0,0,0.18), 0 4px 8px rgba(0,0,0,0.12)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
        elevation: 10,
      },
    }),
  },
  appointmentsDesktop: {
    flex: 1,
    alignSelf: 'stretch',
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    minHeight: 70,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  appointmentRowPressed: {
    opacity: 0.7,
  },
  appointmentTime: {
    width: 70,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  appointmentTimeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  appointmentDateText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  appointmentDetails: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  appointmentClient: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 22,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 7,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Acciones rápidas
  quickActionsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 4,
    padding: 11,
    maxWidth: '95%',
    alignSelf: 'center',
    width: '100%',
    ...Platform.select({
      web: {
        boxShadow: '0 6px 16px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  quickActionsDesktop: {
    flex: 1,
    alignSelf: 'stretch',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 7,
  },
  actionButton: {
    borderRadius: 4,
    width: 'calc(50% - 4.5px)', // 2 columnas
    minWidth: 117,
    minHeight: 63,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 20px rgba(224, 122, 95, 0.6), 0 4px 8px rgba(224, 122, 95, 0.4)',
      },
      default: {
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 12,
      },
    }),
  },
  actionButtonGradient: {
    padding: 11,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  actionButtonPressed: {
    opacity: 0.8,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
  },


});
