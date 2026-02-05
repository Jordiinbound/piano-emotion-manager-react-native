/**
 * Análisis Detallado de Clientes
 */

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LineChart, PieChart, KPICard, ProgressBar } from '@/components/charts';
import { useClientsData, usePianosData, useServicesData } from '@/hooks/data';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';
import { getTopClients, calculateMonthlyTrend, formatCurrency, formatShortDate } from '@/services/analytics-service';
import { getClientFullName } from '@/types';

const CHART_COLORS = ['#4A90A4', '#7CB342', '#FFA726', '#AB47BC', '#26A69A'];

export default function ClientsAnalyticsScreen() {
  const router = useRouter();
  const { clients } = useClientsData();
  const { pianos } = usePianosData();
  const { services } = useServicesData();

  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accent = useThemeColor({}, 'accent');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');

  // Top clientes
  const topClients = useMemo(() => {
    return getTopClients(clients, services, pianos, 10);
  }, [clients, services, pianos]);

  // Distribución por tipo de cliente
  const clientTypeDistribution = useMemo(() => {
    const typeMap = new Map<string, number>();
    clients.forEach(c => {
      typeMap.set(c.type, (typeMap.get(c.type) || 0) + 1);
    });

    const labels: Record<string, string> = {
      individual: 'Particular',
      company: 'Empresa',
      institution: 'Institución',
      school: 'Escuela',
    };

    return Array.from(typeMap.entries()).map(([type, count], i) => ({
      label: labels[type] || type,
      value: count,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [clients]);

  // Nuevos clientes por mes
  const monthlyNewClients = useMemo(() => {
    const trend = calculateMonthlyTrend(services, clients, 12);
    return trend.map(m => ({
      label: m.label.split(' ')[0],
      value: m.newClients,
    }));
  }, [services, clients]);

  // Estadísticas
  const stats = useMemo(() => {
    const clientsWithServices = new Set(services.map(s => s.clientId)).size;
    const clientsWithMultipleServices = new Map<string, number>();
    services.forEach(s => {
      clientsWithMultipleServices.set(s.clientId, (clientsWithMultipleServices.get(s.clientId) || 0) + 1);
    });
    const returningClients = Array.from(clientsWithMultipleServices.values()).filter(c => c > 1).length;
    const retentionRate = clientsWithServices > 0 ? (returningClients / clientsWithServices) * 100 : 0;

    const avgPianosPerClient = clients.length > 0 ? pianos.length / clients.length : 0;
    const avgServicesPerClient = clientsWithServices > 0 ? services.length / clientsWithServices : 0;

    return {
      total: clients.length,
      withServices: clientsWithServices,
      returning: returningClients,
      retentionRate,
      avgPianos: avgPianosPerClient,
      avgServices: avgServicesPerClient,
    };
  }, [clients, services, pianos]);

  const handleClientPress = (clientId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/client/[id]',
      params: { id: clientId },
    });
  };

  return (
    <LinearGradient
      colors={['#F8F9FA', '#EEF2F7', '#E8EDF5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <ScreenHeader
        title="Análisis de Clientes"
        subtitle="Comportamiento y retención"
        icon="person.2.fill"
        showBack
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* KPIs */}
        <View style={styles.kpiGrid}>
          <KPICard
            title="Total Clientes"
            value={stats.total}
            color={accent}
          />
          <KPICard
            title="Con Servicios"
            value={stats.withServices}
            color={success}
          />
          <KPICard
            title="Recurrentes"
            value={stats.returning}
            color={warning}
          />
          <KPICard
            title="Retención"
            value={`${stats.retentionRate.toFixed(0)}%`}
            color="#AB47BC"
          />
        </View>

        {/* Tasa de retención */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold">Tasa de Retención</ThemedText>
          </View>
          <ProgressBar
            value={stats.retentionRate}
            label="Clientes que repiten"
            color={success}
            height={16}
          />
          <View style={styles.retentionStats}>
            <View style={styles.retentionStat}>
              <ThemedText style={[styles.retentionValue, { color: accent }]}>
                {stats.avgPianos.toFixed(1)}
              </ThemedText>
              <ThemedText style={[styles.retentionLabel, { color: textSecondary }]}>
                Pianos/cliente
              </ThemedText>
            </View>
            <View style={styles.retentionStat}>
              <ThemedText style={[styles.retentionValue, { color: success }]}>
                {stats.avgServices.toFixed(1)}
              </ThemedText>
              <ThemedText style={[styles.retentionLabel, { color: textSecondary }]}>
                Servicios/cliente
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Nuevos clientes por mes */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold">Nuevos Clientes por Mes</ThemedText>
          </View>
          <LineChart
            data={monthlyNewClients}
            height={160}
            color={accent}
          />
        </View>

        {/* Distribución por tipo */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold">Tipo de Cliente</ThemedText>
          </View>
          <PieChart
            data={clientTypeDistribution}
            size={140}
          />
        </View>

        {/* Top clientes */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold">Top 10 Clientes</ThemedText>
          </View>
          {topClients.map((client, index) => (
            <Pressable
              key={client.id}
              style={[styles.clientItem, { borderBottomColor: borderColor }]}
              onPress={() => handleClientPress(client.id)}
            >
              <View style={[styles.rankBadge, { backgroundColor: `${accent}15` }]}>
                <ThemedText style={[styles.rankText, { color: accent }]}>
                  #{index + 1}
                </ThemedText>
              </View>
              <View style={styles.clientInfo}>
                <ThemedText numberOfLines={1} style={styles.clientName}>
                  {client.name}
                </ThemedText>
                <ThemedText style={[styles.clientStats, { color: textSecondary }]}>
                  {client.totalServices} servicios · {client.pianoCount} pianos
                </ThemedText>
                <ThemedText style={[styles.clientLastService, { color: textSecondary }]}>
                  Último: {formatShortDate(client.lastServiceDate)}
                </ThemedText>
              </View>
              <View style={styles.clientSpent}>
                <ThemedText style={[styles.spentAmount, { color: success }]}>
                  {formatCurrency(client.totalSpent)}
                </ThemedText>
                <IconSymbol name="chevron.right" size={16} color={textSecondary} />
              </View>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
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
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  section: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  retentionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.md,
  },
  retentionStat: {
    alignItems: 'center',
  },
  retentionValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  retentionLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  rankText: {
    fontWeight: '700',
    fontSize: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontWeight: '600',
  },
  clientStats: {
    fontSize: 12,
    marginTop: 2,
  },
  clientLastService: {
    fontSize: 11,
    marginTop: 2,
  },
  clientSpent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  spentAmount: {
    fontWeight: '700',
  },
});
