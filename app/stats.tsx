import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useClientsData, usePianosData, useServicesData } from '@/hooks/data';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { SERVICE_TYPE_LABELS, CLIENT_TYPE_LABELS, getClientFullName } from '@/types';

const { width: screenWidth } = Dimensions.get('window');

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { clients } = useClientsData();
  const { pianos } = usePianosData();
  const { services } = useServicesData();

  const accent = useThemeColor({}, 'accent');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');

  // Calcular estadísticas
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    const thisYear = now.getFullYear().toString();

    // Servicios por mes
    const servicesThisMonth = services.filter((s) => s.date.startsWith(thisMonth));
    const servicesLastMonth = services.filter((s) => s.date.startsWith(lastMonth));
    const servicesThisYear = services.filter((s) => s.date.startsWith(thisYear));

    // Ingresos
    const revenueThisMonth = servicesThisMonth.reduce((sum, s) => sum + (s.cost || 0), 0);
    const revenueLastMonth = servicesLastMonth.reduce((sum, s) => sum + (s.cost || 0), 0);
    const revenueThisYear = servicesThisYear.reduce((sum, s) => sum + (s.cost || 0), 0);

    // Servicios por tipo
    const servicesByType: Record<string, number> = {};
    services.forEach((s) => {
      servicesByType[s.type] = (servicesByType[s.type] || 0) + 1;
    });

    // Clientes por tipo
    const clientsByType: Record<string, number> = {};
    clients.forEach((c) => {
      clientsByType[c.type] = (clientsByType[c.type] || 0) + 1;
    });

    // Pianos por categoría
    const pianosByCategory = {
      vertical: pianos.filter((p) => p.category === 'vertical').length,
      grand: pianos.filter((p) => p.category === 'grand').length,
    };

    // Top clientes (por número de servicios)
    const clientServiceCount: Record<string, number> = {};
    services.forEach((s) => {
      clientServiceCount[s.clientId] = (clientServiceCount[s.clientId] || 0) + 1;
    });
    const topClients = Object.entries(clientServiceCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([clientId, count]) => ({
        client: clients.find((c) => c.id === clientId),
        count,
      }));

    // Promedio de servicios por cliente
    const avgServicesPerClient = clients.length > 0 ? services.length / clients.length : 0;

    return {
      totals: {
        clients: clients.length,
        pianos: pianos.length,
        services: services.length,
      },
      monthly: {
        servicesThisMonth: servicesThisMonth.length,
        servicesLastMonth: servicesLastMonth.length,
        revenueThisMonth,
        revenueLastMonth,
      },
      yearly: {
        services: servicesThisYear.length,
        revenue: revenueThisYear,
      },
      servicesByType,
      clientsByType,
      pianosByCategory,
      topClients,
      avgServicesPerClient,
    };
  }, [clients, pianos, services]);

  const StatCard = ({ title, value, subtitle, icon, color }: { title: string; value: string | number; subtitle?: string; icon: string; color: string }) => (
    <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <IconSymbol name={icon} size={24} color={color} />
      </View>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statTitle}>{title}</ThemedText>
      {subtitle && (
        <ThemedText style={[styles.statSubtitle, { color: textSecondary }]}>{subtitle}</ThemedText>
      )}
    </View>
  );

  const ProgressBar = ({ label, value, total, color }: { label: string; value: number; total: number; color: string }) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return (
      <View style={styles.progressItem}>
        <View style={styles.progressHeader}>
          <ThemedText style={styles.progressLabel}>{label}</ThemedText>
          <ThemedText style={[styles.progressValue, { color: textSecondary }]}>{value}</ThemedText>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: `${color}20` }]}>
          <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Estadísticas' }} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Resumen general */}
        <View style={styles.section}>
          <ThemedText type="subtitle">Resumen General</ThemedText>
          <View style={styles.statsGrid}>
            <StatCard
              title="Clientes"
              value={stats.totals.clients}
              icon="person.2.fill"
              color={accent}
            />
            <StatCard
              title="Pianos"
              value={stats.totals.pianos}
              icon="pianokeys"
              color={success}
            />
            <StatCard
              title="Servicios"
              value={stats.totals.services}
              icon="wrench.fill"
              color={warning}
            />
            <StatCard
              title="Promedio"
              value={stats.avgServicesPerClient.toFixed(1)}
              subtitle="servicios/cliente"
              icon="chart.bar.fill"
              color="#8B5CF6"
            />
          </View>
        </View>

        {/* Este mes */}
        <View style={[styles.section, styles.card, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText type="subtitle">Este Mes</ThemedText>
          <View style={styles.monthStats}>
            <View style={styles.monthStat}>
              <ThemedText style={[styles.monthValue, { color: accent }]}>
                {stats.monthly.servicesThisMonth}
              </ThemedText>
              <ThemedText style={[styles.monthLabel, { color: textSecondary }]}>Servicios</ThemedText>
            </View>
            <View style={styles.monthDivider} />
            <View style={styles.monthStat}>
              <ThemedText style={[styles.monthValue, { color: success }]}>
                €{stats.monthly.revenueThisMonth.toFixed(0)}
              </ThemedText>
              <ThemedText style={[styles.monthLabel, { color: textSecondary }]}>Ingresos</ThemedText>
            </View>
          </View>
          <View style={styles.comparison}>
            <ThemedText style={[styles.comparisonText, { color: textSecondary }]}>
              Mes anterior: {stats.monthly.servicesLastMonth} servicios · €{stats.monthly.revenueLastMonth.toFixed(0)}
            </ThemedText>
          </View>
        </View>

        {/* Este año */}
        <View style={[styles.section, styles.card, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText type="subtitle">Este Año</ThemedText>
          <View style={styles.monthStats}>
            <View style={styles.monthStat}>
              <ThemedText style={[styles.monthValue, { color: accent }]}>
                {stats.yearly.services}
              </ThemedText>
              <ThemedText style={[styles.monthLabel, { color: textSecondary }]}>Servicios</ThemedText>
            </View>
            <View style={styles.monthDivider} />
            <View style={styles.monthStat}>
              <ThemedText style={[styles.monthValue, { color: success }]}>
                €{stats.yearly.revenue.toFixed(0)}
              </ThemedText>
              <ThemedText style={[styles.monthLabel, { color: textSecondary }]}>Ingresos</ThemedText>
            </View>
          </View>
        </View>

        {/* Servicios por tipo */}
        <View style={[styles.section, styles.card, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText type="subtitle">Servicios por Tipo</ThemedText>
          <View style={styles.progressList}>
            {Object.entries(stats.servicesByType).map(([type, count]) => (
              <ProgressBar
                key={type}
                label={SERVICE_TYPE_LABELS[type as keyof typeof SERVICE_TYPE_LABELS] || type}
                value={count}
                total={stats.totals.services}
                color={accent}
              />
            ))}
            {Object.keys(stats.servicesByType).length === 0 && (
              <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
                No hay servicios registrados
              </ThemedText>
            )}
          </View>
        </View>

        {/* Clientes por tipo */}
        <View style={[styles.section, styles.card, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText type="subtitle">Clientes por Tipo</ThemedText>
          <View style={styles.progressList}>
            {Object.entries(stats.clientsByType).map(([type, count]) => (
              <ProgressBar
                key={type}
                label={CLIENT_TYPE_LABELS[type as keyof typeof CLIENT_TYPE_LABELS] || type}
                value={count}
                total={stats.totals.clients}
                color={success}
              />
            ))}
            {Object.keys(stats.clientsByType).length === 0 && (
              <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
                No hay clientes registrados
              </ThemedText>
            )}
          </View>
        </View>

        {/* Pianos por categoría */}
        <View style={[styles.section, styles.card, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText type="subtitle">Pianos por Categoría</ThemedText>
          <View style={styles.pianoStats}>
            <View style={styles.pianoStat}>
              <IconSymbol name="pianokeys" size={32} color={accent} />
              <ThemedText style={styles.pianoValue}>{stats.pianosByCategory.vertical}</ThemedText>
              <ThemedText style={[styles.pianoLabel, { color: textSecondary }]}>Verticales</ThemedText>
            </View>
            <View style={styles.pianoStat}>
              <IconSymbol name="pianokeys" size={32} color={warning} />
              <ThemedText style={styles.pianoValue}>{stats.pianosByCategory.grand}</ThemedText>
              <ThemedText style={[styles.pianoLabel, { color: textSecondary }]}>De Cola</ThemedText>
            </View>
          </View>
        </View>

        {/* Top clientes */}
        <View style={[styles.section, styles.card, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText type="subtitle">Clientes Más Activos</ThemedText>
          <View style={styles.topList}>
            {stats.topClients.map((item, index) => (
              <View key={item.client?.id || index} style={styles.topItem}>
                <View style={[styles.topRank, { backgroundColor: `${accent}15` }]}>
                  <ThemedText style={[styles.topRankText, { color: accent }]}>{index + 1}</ThemedText>
                </View>
                <ThemedText style={styles.topName} numberOfLines={1}>
                  {item.client ? getClientFullName(item.client) : 'Cliente desconocido'}
                </ThemedText>
                <ThemedText style={[styles.topCount, { color: textSecondary }]}>
                  {item.count} servicios
                </ThemedText>
              </View>
            ))}
            {stats.topClients.length === 0 && (
              <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
                No hay datos suficientes
              </ThemedText>
            )}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.md,
  },
  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statCard: {
    width: (screenWidth - Spacing.md * 2 - Spacing.sm) / 2 - 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  statSubtitle: {
    fontSize: 11,
  },
  monthStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: Spacing.md,
  },
  monthStat: {
    alignItems: 'center',
    flex: 1,
  },
  monthValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  monthLabel: {
    fontSize: 13,
  },
  monthDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  comparison: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  comparisonText: {
    fontSize: 13,
    textAlign: 'center',
  },
  progressList: {
    gap: Spacing.md,
  },
  progressItem: {
    gap: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 14,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  pianoStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.md,
  },
  pianoStat: {
    alignItems: 'center',
    gap: 4,
  },
  pianoValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  pianoLabel: {
    fontSize: 13,
  },
  topList: {
    gap: Spacing.sm,
  },
  topItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  topRank: {
    width: 28,
    height: 28,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRankText: {
    fontSize: 14,
    fontWeight: '700',
  },
  topName: {
    flex: 1,
    fontSize: 15,
  },
  topCount: {
    fontSize: 13,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
});
