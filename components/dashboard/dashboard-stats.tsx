/**
 * Dashboard Stats Component
 * Muestra las estadísticas del mes con navegación, skeleton loading y accesibilidad
 */
import { memo, useCallback, useMemo } from 'react';
import { Pressable, View, StyleSheet, Animated, AccessibilityInfo, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Accordion } from '@/components/accordion';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useResponsive } from '@/hooks/use-responsive';
import { Spacing, BorderRadius } from '@/constants/theme';

// ============================================================================
// CONSTANTES
// ============================================================================

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTHS_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

// ============================================================================
// TIPOS
// ============================================================================

interface DashboardStats {
  totalClients: number;
  totalPianos: number;
  monthlyServices: number;
  monthlyRevenue: number;
}

interface DashboardStatsProps {
  stats: DashboardStats | null;
  selectedMonth: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onGoToCurrentMonth: () => void;
  isLoading?: boolean;
  error?: string | null;
}

interface StatCardProps {
  icon: string;
  value: number | string;
  label: string;
  bgColor: string;
  borderColor: string;
  iconBgColor: string;
  valueColor: string;
  labelColor: string;
  accessibilityLabel: string;
  isLoading?: boolean;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

// ============================================================================
// COMPONENTE SKELETON
// ============================================================================

const SkeletonCard = memo(function SkeletonCard() {
  const borderColor = useThemeColor({}, 'border');
  const backgroundColor = useThemeColor({}, 'cardBackground');
  
  return (
    <View 
      style={[styles.statCard, styles.skeletonCard, { backgroundColor, borderColor }]}
      accessibilityLabel="Cargando estadística"
    >
      <View style={[styles.skeletonCircle, { backgroundColor: borderColor }]} />
      <View style={[styles.skeletonValue, { backgroundColor: borderColor }]} />
      <View style={[styles.skeletonLabel, { backgroundColor: borderColor }]} />
    </View>
  );
});

// ============================================================================
// COMPONENTE STAT CARD
// ============================================================================

const StatCard = memo(function StatCard({ 
  icon, 
  value, 
  label, 
  bgColor, 
  borderColor, 
  iconBgColor, 
  valueColor, 
  labelColor,
  accessibilityLabel,
  isLoading,
  trend,
}: StatCardProps) {
  if (isLoading) {
    return <SkeletonCard />;
  }
  
  return (
    <View 
      style={[styles.statCard, { backgroundColor: bgColor, borderColor }]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.statIconBg, { backgroundColor: iconBgColor }]}>
        <IconSymbol name={icon as any} size={20} color="#FFFFFF" />
      </View>
      <View style={styles.valueContainer}>
        <ThemedText style={[styles.statValue, { color: valueColor }]}>
          {value}
        </ThemedText>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: trend.isPositive ? '#D1FAE5' : '#FEE2E2' }]}>
            <IconSymbol 
              name={trend.isPositive ? "arrow.up" : "arrow.down"} 
              size={10} 
              color={trend.isPositive ? '#059669' : '#DC2626'} 
            />
            <ThemedText style={[styles.trendText, { color: trend.isPositive ? '#059669' : '#DC2626' }]}>
              {Math.abs(trend.value)}%
            </ThemedText>
          </View>
        )}
      </View>
      <ThemedText style={[styles.statLabel, { color: labelColor }]}>{label}</ThemedText>
    </View>
  );
});

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const DashboardStats = memo(function DashboardStats({
  stats,
  selectedMonth,
  onPreviousMonth,
  onNextMonth,
  onGoToCurrentMonth,
  isLoading = false,
  error = null,
}: DashboardStatsProps) {
  const router = useRouter();
  const { isMobile, isDesktop } = useResponsive();
  const accent = useThemeColor({}, 'accent');
  const errorColor = useThemeColor({}, 'error');

  // Calcular título del mes
  const monthTitle = useMemo(() => {
    const now = new Date();
    const isCurrentMonth = selectedMonth.getMonth() === now.getMonth() && 
                          selectedMonth.getFullYear() === now.getFullYear();
    if (isCurrentMonth) {
      return 'Este Mes';
    }
    const monthName = isMobile ? MONTHS_SHORT[selectedMonth.getMonth()] : MONTHS[selectedMonth.getMonth()];
    return `${monthName} ${selectedMonth.getFullYear()}`;
  }, [selectedMonth, isMobile]);

  // Handlers con haptics
  const handlePreviousMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPreviousMonth();
  }, [onPreviousMonth]);

  const handleNextMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNextMonth();
  }, [onNextMonth]);

  const handleGoToCurrentMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onGoToCurrentMonth();
  }, [onGoToCurrentMonth]);

  const handleGoToCalendar = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/agenda' as any);
  }, [router]);

  // Formatear valores para accesibilidad
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  // Valores por defecto si no hay stats
  const safeStats = stats || {
    totalClients: 0,
    totalPianos: 0,
    monthlyServices: 0,
    monthlyRevenue: 0,
  };

  // Renderizar error si existe
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <IconSymbol name="exclamationmark.triangle.fill" size={24} color={errorColor} />
        <ThemedText style={[styles.errorText, { color: errorColor }]}>
          {error}
        </ThemedText>
        <Pressable 
          style={[styles.retryButton, { borderColor: accent }]}
          onPress={onGoToCurrentMonth}
          accessibilityRole="button"
          accessibilityLabel="Reintentar carga de estadísticas"
        >
          <ThemedText style={[styles.retryButtonText, { color: accent }]}>
            Reintentar
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <Accordion 
      title={monthTitle} 
      defaultOpen={false}
      icon="calendar"
      iconColor="#10B981"
      centerContent
      rightAction={
        <View 
          style={styles.monthNavigation}
          accessibilityRole="toolbar"
          accessibilityLabel="Navegación de meses"
        >
          <Pressable 
            onPress={handlePreviousMonth} 
            style={styles.monthNavButton}
            accessibilityRole="button"
            accessibilityLabel="Mes anterior"
            accessibilityHint="Navegar al mes anterior"
          >
            <IconSymbol name="chevron.left" size={18} color={accent} />
          </Pressable>
          <Pressable 
            onPress={handleGoToCurrentMonth} 
            style={[styles.todayButton, { borderColor: accent }]}
            accessibilityRole="button"
            accessibilityLabel="Ir al mes actual"
          >
            <ThemedText style={[styles.todayButtonText, { color: accent }]}>{MONTHS_SHORT[new Date().getMonth()]}</ThemedText>
          </Pressable>
          <Pressable 
            onPress={handleNextMonth} 
            style={styles.monthNavButton}
            accessibilityRole="button"
            accessibilityLabel="Mes siguiente"
            accessibilityHint="Navegar al mes siguiente"
          >
            <IconSymbol name="chevron.right" size={18} color={accent} />
          </Pressable>
          <Pressable 
            onPress={handleGoToCalendar} 
            style={[styles.calendarButton, { backgroundColor: accent }]}
            accessibilityRole="button"
            accessibilityLabel="Abrir calendario"
            accessibilityHint="Ver agenda completa"
          >
            <IconSymbol name="calendar" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      }
    >
      <View 
        style={[styles.statsGrid, isDesktop && styles.statsGridDesktop]}
        accessibilityRole="list"
        accessibilityLabel={`Estadísticas de ${monthTitle}`}
      >
        <StatCard 
          icon="wrench.fill"
          value={safeStats.monthlyServices}
          label="Servicios"
          bgColor="#FEF3C7"
          borderColor="#F59E0B"
          iconBgColor="#F59E0B"
          valueColor="#92400E"
          labelColor="#B45309"
          accessibilityLabel={`${safeStats.monthlyServices} servicios realizados este mes`}
          isLoading={isLoading}
        />
        <StatCard 
          icon="eurosign.circle.fill"
          value={formatCurrency(safeStats.monthlyRevenue)}
          label="Ingresos"
          bgColor="#D1FAE5"
          borderColor="#10B981"
          iconBgColor="#10B981"
          valueColor="#065F46"
          labelColor="#047857"
          accessibilityLabel={`${formatCurrency(safeStats.monthlyRevenue)} de ingresos este mes`}
          isLoading={isLoading}
        />
        <StatCard 
          icon="person.2.fill"
          value={safeStats.totalClients}
          label="Clientes"
          bgColor="#DBEAFE"
          borderColor="#3B82F6"
          iconBgColor="#3B82F6"
          valueColor="#1E40AF"
          labelColor="#1D4ED8"
          accessibilityLabel={`${safeStats.totalClients} clientes en total`}
          isLoading={isLoading}
        />
        <StatCard 
          icon="pianokeys"
          value={safeStats.totalPianos}
          label="Pianos"
          bgColor="#EDE9FE"
          borderColor="#8B5CF6"
          iconBgColor="#8B5CF6"
          valueColor="#5B21B6"
          labelColor="#6D28D9"
          accessibilityLabel={`${safeStats.totalPianos} pianos registrados`}
          isLoading={isLoading}
        />
      </View>
    </Accordion>
  );
});

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0, // Sin gap - las flechas pegadas al botón Hoy
  },
  monthNavButton: {
    padding: 2,
    minWidth: 24,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  calendarButton: {
    padding: 6,
    borderRadius: 4,
    minWidth: 36,
    minHeight: 36,
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
  },
  statsGridDesktop: {
    maxWidth: 600,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    gap: 4,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  // Skeleton styles
  skeletonCard: {
    borderWidth: 1,
  },
  skeletonCircle: {
    width: 36,
    height: 36,
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonValue: {
    width: 60,
    height: 28,
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonLabel: {
    width: 50,
    height: 14,
    borderRadius: 4,
  },
  // Error styles
  errorContainer: {
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

