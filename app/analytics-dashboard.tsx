import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

import { useThemeColor } from '@/hooks/use-theme-color';
import { useInvoices } from '@/hooks/use-invoices';
import { useServices } from '@/hooks/use-services';
import { useClients } from '@/hooks/use-clients';
import { BorderRadius, Spacing } from '@/constants/theme';

const { width: screenWidth } = Dimensions.get('window');

type TimeRange = 'month' | 'quarter' | 'year';

// Calcular ancho de tarjetas KPI para evitar 3 columnas
// Saltar directamente de 2 columnas a 4 columnas
const getKpiCardWidth = () => {
  if (screenWidth < 768) {
    // Móvil: 2 columnas (48% cada una)
    return '48%';
  } else if (screenWidth < 1200) {
    // Tablet: 2 columnas (48% cada una) - evitar 3 columnas
    return '48%';
  } else {
    // Desktop: 4 columnas (23% cada una)
    return '23%';
  }
};

export default function AnalyticsDashboardScreen() {
  const router = useRouter();
  const invoicesResult = useInvoices();
  const servicesResult = useServices();
  const clientsResult = useClients();
  
  const invoices = Array.isArray(invoicesResult?.invoices) ? invoicesResult.invoices : [];
  const services = Array.isArray(servicesResult?.services) ? servicesResult.services : [];
  const clients = Array.isArray(clientsResult?.clients) ? clientsResult.clients : [];
  const [timeRange, setTimeRange] = useState<TimeRange>('year');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const primary = useThemeColor({}, 'tint');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const error = useThemeColor({}, 'error');
  const border = useThemeColor({}, 'border');

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  // Calcular datos del gráfico de ingresos
  const revenueData = useMemo(() => {
    const monthlyData = Array(12).fill(0);
    
    invoices
      .filter(inv => {
        const date = new Date(inv.date);
        return date.getFullYear() === selectedYear && inv.status === 'paid';
      })
      .forEach(inv => {
        const month = new Date(inv.date).getMonth();
        monthlyData[month] += inv.total || 0;
      });

    return monthlyData;
  }, [invoices, selectedYear]);

  // Calcular estadísticas generales
  const stats = useMemo(() => {
    const yearInvoices = invoices.filter(inv => {
      const date = new Date(inv.date);
      return date.getFullYear() === selectedYear;
    });

    const totalRevenue = yearInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    const pendingRevenue = yearInvoices
      .filter(inv => inv.status === 'sent' || inv.status === 'draft')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    const yearServices = services.filter(srv => {
      const date = new Date(srv.date);
      return date.getFullYear() === selectedYear;
    });

    const activeClients = new Set(yearServices.map(srv => srv.clientId)).size;

    // Comparar con año anterior
    const lastYearInvoices = invoices.filter(inv => {
      const date = new Date(inv.date);
      return date.getFullYear() === selectedYear - 1 && inv.status === 'paid';
    });
    const lastYearRevenue = lastYearInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const revenueChange = lastYearRevenue > 0 
      ? ((totalRevenue - lastYearRevenue) / lastYearRevenue) * 100 
      : 0;

    return {
      totalRevenue,
      pendingRevenue,
      totalServices: yearServices.length,
      activeClients,
      averageTicket: yearInvoices.length > 0 ? totalRevenue / yearInvoices.length : 0,
      revenueChange,
    };
  }, [invoices, services, selectedYear]);

  // Rentabilidad por tipo de servicio
  const serviceTypeStats = useMemo(() => {
    const typeMap: Record<string, { count: number; revenue: number }> = {};

    services
      .filter(srv => new Date(srv.date).getFullYear() === selectedYear)
      .forEach(srv => {
        const type = srv.type || 'Otros';
        if (!typeMap[type]) {
          typeMap[type] = { count: 0, revenue: 0 };
        }
        typeMap[type].count++;
        typeMap[type].revenue += srv.price || 0;
      });

    return Object.entries(typeMap)
      .map(([type, data]) => ({
        type,
        count: data.count,
        revenue: data.revenue,
        average: data.revenue / data.count,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [services, selectedYear]);

  // Top clientes
  const topClients = useMemo(() => {
    const clientMap: Record<string, { name: string; revenue: number; services: number }> = {};

    invoices
      .filter(inv => new Date(inv.date).getFullYear() === selectedYear && inv.status === 'paid')
      .forEach(inv => {
        const clientId = inv.clientId;
        const client = clients.find(c => c.id === clientId);
        if (!client) return;

        if (!clientMap[clientId]) {
          clientMap[clientId] = { name: client.name, revenue: 0, services: 0 };
        }
        clientMap[clientId].revenue += inv.total || 0;
        clientMap[clientId].services++;
      });

    return Object.values(clientMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [invoices, clients, selectedYear]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const maxRevenue = Math.max(...revenueData, 1);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Análisis y Estadísticas',
          headerStyle: { backgroundColor },
          headerTintColor: textColor,
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Selector de año */}
        <View style={[styles.yearSelector, { backgroundColor: cardBg }]}>
          <Pressable
            style={styles.yearArrow}
            onPress={() => setSelectedYear(selectedYear - 1)}
          >
            <IconSymbol name="chevron.left" size={20} color={primary} />
          </Pressable>
          <ThemedText style={styles.yearText}>{selectedYear}</ThemedText>
          <Pressable
            style={styles.yearArrow}
            onPress={() => setSelectedYear(selectedYear + 1)}
          >
            <IconSymbol name="chevron.right" size={20} color={primary} />
          </Pressable>
        </View>

        {/* KPIs principales */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, styles.kpiCardLarge, { backgroundColor: primary }]}>
            <ThemedText style={styles.kpiLabel}>Ingresos Totales</ThemedText>
            <ThemedText style={styles.kpiValue}>{formatCurrency(stats.totalRevenue)}</ThemedText>
            {stats.revenueChange !== 0 && (
              <View style={styles.kpiChange}>
                <IconSymbol 
                  name={stats.revenueChange > 0 ? 'arrow.up' : 'arrow.down'} 
                  size={12} 
                  color="#fff" 
                />
                <ThemedText style={styles.kpiChangeText}>
                  {Math.abs(stats.revenueChange).toFixed(1)}% vs año anterior
                </ThemedText>
              </View>
            )}
          </View>

          <View style={[styles.kpiCard, { backgroundColor: cardBg, width: getKpiCardWidth() }]}>
            <View style={[styles.kpiIcon, { backgroundColor: warning + '20' }]}>
              <IconSymbol name="clock" size={18} color={warning} />
            </View>
            <ThemedText style={[styles.kpiSmallLabel, { color: textSecondary }]}>Pendiente</ThemedText>
            <ThemedText style={[styles.kpiSmallValue, { color: warning }]}>
              {formatCurrency(stats.pendingRevenue)}
            </ThemedText>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: cardBg, width: getKpiCardWidth() }]}>
            <View style={[styles.kpiIcon, { backgroundColor: success + '20' }]}>
              <IconSymbol name="wrench.and.screwdriver" size={18} color={success} />
            </View>
            <ThemedText style={[styles.kpiSmallLabel, { color: textSecondary }]}>Servicios</ThemedText>
            <ThemedText style={styles.kpiSmallValue}>{stats.totalServices}</ThemedText>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: cardBg, width: getKpiCardWidth() }]}>
            <View style={[styles.kpiIcon, { backgroundColor: primary + '20' }]}>
              <IconSymbol name="person.2" size={18} color={primary} />
            </View>
            <ThemedText style={[styles.kpiSmallLabel, { color: textSecondary }]}>Clientes activos</ThemedText>
            <ThemedText style={styles.kpiSmallValue}>{stats.activeClients}</ThemedText>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: cardBg, width: getKpiCardWidth() }]}>
            <View style={[styles.kpiIcon, { backgroundColor: success + '20' }]}>
              <IconSymbol name="eurosign.circle" size={18} color={success} />
            </View>
            <ThemedText style={[styles.kpiSmallLabel, { color: textSecondary }]}>Ticket medio</ThemedText>
            <ThemedText style={styles.kpiSmallValue}>{formatCurrency(stats.averageTicket)}</ThemedText>
          </View>
        </View>

        {/* Gráfico de ingresos mensuales */}
        <View style={[styles.chartSection, { backgroundColor: cardBg }]}>
          <View style={styles.chartHeader}>
            <IconSymbol name="chart.bar" size={20} color={primary} />
            <ThemedText style={styles.chartTitle}>Ingresos Mensuales</ThemedText>
          </View>

          <View style={styles.chart}>
            {revenueData.map((value, index) => (
              <View key={index} style={styles.chartBar}>
                <View style={styles.chartBarContainer}>
                  <View 
                    style={[
                      styles.chartBarFill,
                      { 
                        backgroundColor: primary,
                        height: `${(value / maxRevenue) * 100}%`,
                      }
                    ]} 
                  />
                </View>
                <ThemedText style={[styles.chartLabel, { color: textSecondary }]}>
                  {months[index]}
                </ThemedText>
              </View>
            ))}
          </View>

          <View style={styles.chartLegend}>
            {revenueData.map((value, index) => (
              value > 0 && (
                <View key={index} style={styles.chartLegendItem}>
                  <ThemedText style={[styles.chartLegendMonth, { color: textSecondary }]}>
                    {months[index]}:
                  </ThemedText>
                  <ThemedText style={styles.chartLegendValue}>
                    {formatCurrency(value)}
                  </ThemedText>
                </View>
              )
            ))}
          </View>
        </View>

        {/* Rentabilidad por tipo de servicio */}
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="chart.pie" size={20} color={primary} />
            <ThemedText style={styles.sectionTitle}>Rentabilidad por Servicio</ThemedText>
          </View>

          {serviceTypeStats.length > 0 ? (
            serviceTypeStats.map((item, index) => (
              <View key={item.type} style={[styles.serviceRow, { borderBottomColor: border }]}>
                <View style={styles.serviceInfo}>
                  <ThemedText style={styles.serviceType}>{item.type}</ThemedText>
                  <ThemedText style={[styles.serviceCount, { color: textSecondary }]}>
                    {item.count} servicio{item.count !== 1 ? 's' : ''}
                  </ThemedText>
                </View>
                <View style={styles.serviceStats}>
                  <ThemedText style={[styles.serviceRevenue, { color: success }]}>
                    {formatCurrency(item.revenue)}
                  </ThemedText>
                  <ThemedText style={[styles.serviceAverage, { color: textSecondary }]}>
                    Media: {formatCurrency(item.average)}
                  </ThemedText>
                </View>
              </View>
            ))
          ) : (
            <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
              No hay datos de servicios para este año
            </ThemedText>
          )}
        </View>

        {/* Top clientes */}
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="star" size={20} color={primary} />
            <ThemedText style={styles.sectionTitle}>Top 5 Clientes</ThemedText>
          </View>

          {topClients.length > 0 ? (
            topClients.map((client, index) => (
              <View key={index} style={[styles.clientRow, { borderBottomColor: border }]}>
                <View style={[styles.clientRank, { backgroundColor: primary + '20' }]}>
                  <ThemedText style={[styles.clientRankText, { color: primary }]}>
                    {index + 1}
                  </ThemedText>
                </View>
                <View style={styles.clientInfo}>
                  <ThemedText style={styles.clientName}>{client.name}</ThemedText>
                  <ThemedText style={[styles.clientServices, { color: textSecondary }]}>
                    {client.services} factura{client.services !== 1 ? 's' : ''}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.clientRevenue, { color: success }]}>
                  {formatCurrency(client.revenue)}
                </ThemedText>
              </View>
            ))
          ) : (
            <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
              No hay datos de clientes para este año
            </ThemedText>
          )}
        </View>

        {/* Acciones */}
	        <View style={[styles.actionsSection, { backgroundColor: cardBg }]}>
	          <Pressable style={[styles.actionButton, { borderColor: primary }]}>
	            <IconSymbol name="arrow.down.doc" size={18} color={primary} />
	            <ThemedText style={[styles.actionButtonText, { color: primary }]}>
	              Exportar Informe PDF
	            </ThemedText>
	          </Pressable>
	        </View>

        <View style={styles.bottomPadding} />
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
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  yearArrow: {
    padding: Spacing.sm,
  },
  yearText: {
    fontSize: 20,
    fontWeight: '700',
    marginHorizontal: Spacing.xl,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  kpiCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  kpiCardLarge: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  kpiLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  kpiValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  kpiChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: 4,
  },
  kpiChangeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  kpiSmallLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  kpiSmallValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  chartSection: {
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  chart: {
    flexDirection: 'row',
    height: 150,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
  },
  chartBarContainer: {
    width: '70%',
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  chartLabel: {
    fontSize: 9,
    marginTop: 4,
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  chartLegendItem: {
    flexDirection: 'row',
    gap: 4,
  },
  chartLegendMonth: {
    fontSize: 11,
  },
  chartLegendValue: {
    fontSize: 11,
    fontWeight: '500',
  },
  section: {
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceType: {
    fontSize: 14,
    fontWeight: '500',
  },
  serviceCount: {
    fontSize: 12,
    marginTop: 2,
  },
  serviceStats: {
    alignItems: 'flex-end',
  },
  serviceRevenue: {
    fontSize: 15,
    fontWeight: '600',
  },
  serviceAverage: {
    fontSize: 11,
    marginTop: 2,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  clientRank: {
    width: 28,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientRankText: {
    fontSize: 14,
    fontWeight: '700',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '500',
  },
  clientServices: {
    fontSize: 12,
    marginTop: 2,
  },
  clientRevenue: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    padding: Spacing.lg,
    fontSize: 14,
  },
  actionsSection: {
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 40,
  },
});
