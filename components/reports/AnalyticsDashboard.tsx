/**
 * Dashboard de Analytics - Diseño Moderno y Elegante
 * Piano Emotion Manager
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useDashboardMetrics,
  useRevenueChart,
  useServicesByType,
  useMonthlyTrends,
  useReportExport,
  type PeriodPreset,
  type DateRange,
} from '@/hooks/reports';
import { useTranslation } from '@/hooks/use-translation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// Types
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: keyof typeof Ionicons.glyphMap;
  gradientColors: string[];
  iconColor: string;
}

interface PeriodSelectorProps {
  selected: PeriodPreset;
  onSelect: (preset: PeriodPreset) => void;
}

// ============================================================================
// Metric Card Component - Rediseñado
// ============================================================================

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  gradientColors,
  iconColor,
}) => {
  const isPositive = change !== undefined && change >= 0;

  return (
    <View style={styles.metricCard}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.metricGradient}
      >
        <View style={styles.metricHeader}>
          <View style={[styles.metricIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name={icon} size={24} color={iconColor} />
          </View>
          {change !== undefined && (
            <View style={[styles.changeBadge, { backgroundColor: isPositive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }]}>
              <Ionicons
                name={isPositive ? 'trending-up' : 'trending-down'}
                size={12}
                color={isPositive ? '#22c55e' : '#ef4444'}
              />
              <Text style={[styles.changeText, { color: isPositive ? '#22c55e' : '#ef4444' }]}>
                {isPositive ? '+' : ''}{change.toFixed(1)}%
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricTitle}>{title}</Text>
      </LinearGradient>
    </View>
  );
};

// ============================================================================
// Period Selector Component - Rediseñado
// ============================================================================

const PeriodSelector: React.FC<PeriodSelectorProps> = ({ selected, onSelect }) => {
  const { t } = useTranslation();

  const periods: { key: PeriodPreset; label: string }[] = [
    { key: 'thisWeek', label: t('reports.thisWeek') },
    { key: 'thisMonth', label: t('reports.thisMonth') },
    { key: 'thisQuarter', label: t('reports.thisQuarter') },
    { key: 'thisYear', label: t('reports.thisYear') },
  ];

  return (
    <View style={styles.periodSelector}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodScrollContent}>
        {periods.map((period) => (
          <TouchableOpacity
            key={period.key}
            style={[
              styles.periodButton,
              selected === period.key && styles.periodButtonActive,
            ]}
            onPress={() => onSelect(period.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.periodButtonText,
                selected === period.key && styles.periodButtonTextActive,
              ]}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// ============================================================================
// Enhanced Bar Chart Component
// ============================================================================

interface EnhancedBarChartProps {
  data: { label: string; value: number }[];
  color: string;
}

const EnhancedBarChart: React.FC<EnhancedBarChartProps> = ({ data, color }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Ionicons name="bar-chart-outline" size={48} color="#d1d5db" />
        <Text style={styles.emptyChartText}>No hay datos disponibles</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const displayData = data.slice(-12); // Últimos 12 períodos

  return (
    <View style={styles.chartContainer}>
      <View style={styles.barsContainer}>
        {displayData.map((item, index) => {
          const heightPercent = (item.value / maxValue) * 100;
          return (
            <View key={index} style={styles.barWrapper}>
              <View style={styles.barColumn}>
                <Text style={styles.barValue}>
                  {item.value > 0 ? `${item.value.toFixed(0)}` : ''}
                </Text>
                <View style={styles.barTrack}>
                  <LinearGradient
                    colors={[color, color + '80']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[
                      styles.bar,
                      {
                        height: `${Math.max(heightPercent, 4)}%`,
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.barLabel} numberOfLines={1}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ============================================================================
// Main Dashboard Component
// ============================================================================

interface AnalyticsDashboardProps {
  onNavigateToReports?: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  onNavigateToReports,
}) => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

  const {
    metrics,
    isLoading,
    refetch,
    dateRange,
    preset,
    changePeriod,
  } = useDashboardMetrics('thisMonth');

  const { data: revenueData } = useRevenueChart(dateRange, 'month');
  const { data: servicesData } = useServicesByType(dateRange);
  const { downloadCSV, downloadPDF, isExporting } = useReportExport();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('reports.analytics')}</Text>
          <Text style={styles.headerSubtitle}>Resumen de rendimiento</Text>
        </View>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => downloadPDF('executive', dateRange)}
          disabled={isExporting}
          activeOpacity={0.7}
        >
          <Ionicons name="download-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <PeriodSelector selected={preset} onSelect={changePeriod} />

      {/* Main Metrics Grid */}
      <View style={styles.metricsGrid}>
        <MetricCard
          title={t('reports.revenue')}
          value={formatCurrency(metrics?.revenue.total || 0)}
          change={metrics?.revenue.changePercent}
          icon="cash-outline"
          gradientColors={['#3b82f6', '#2563eb']}
          iconColor="#fff"
        />
        <MetricCard
          title={t('reports.services')}
          value={metrics?.services.total || 0}
          icon="construct-outline"
          gradientColors={['#22c55e', '#16a34a']}
          iconColor="#fff"
        />
        <MetricCard
          title={t('reports.clients')}
          value={metrics?.clients.total || 0}
          change={metrics?.clients.new ? (metrics.clients.new / metrics.clients.total) * 100 : 0}
          icon="people-outline"
          gradientColors={['#8b5cf6', '#7c3aed']}
          iconColor="#fff"
        />
        <MetricCard
          title={t('reports.avgTicket')}
          value={formatCurrency(metrics?.averages.ticketValue || 0)}
          icon="receipt-outline"
          gradientColors={['#f59e0b', '#d97706']}
          iconColor="#fff"
        />
      </View>

      {/* Revenue Chart Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{t('reports.revenueEvolution')}</Text>
            <Text style={styles.sectionSubtitle}>Últimos 12 períodos</Text>
          </View>
          <TouchableOpacity 
            onPress={() => downloadCSV('revenue', dateRange)}
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <Ionicons name="download-outline" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <View style={styles.chartCard}>
          <EnhancedBarChart
            data={revenueData?.map((d) => ({ label: d.period, value: d.revenue })) || []}
            color="#3b82f6"
          />
        </View>
      </View>

      {/* Services by Type Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{t('reports.servicesByType')}</Text>
            <Text style={styles.sectionSubtitle}>Top 5 servicios</Text>
          </View>
        </View>
        {servicesData && servicesData.length > 0 ? (
          <View style={styles.servicesCard}>
            {servicesData.slice(0, 5).map((service, index) => {
              const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
              return (
                <View key={index} style={styles.serviceItem}>
                  <View style={styles.serviceLeft}>
                    <View style={[styles.serviceDot, { backgroundColor: colors[index] }]} />
                    <Text style={styles.serviceName}>{service.typeName}</Text>
                  </View>
                  <View style={styles.serviceRight}>
                    <Text style={styles.serviceCount}>{service.count}</Text>
                    <View style={styles.servicePercentBadge}>
                      <Text style={styles.servicePercent}>{service.percentage.toFixed(1)}%</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="construct-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyCardText}>No hay datos de servicios</Text>
          </View>
        )}
      </View>

      {/* Quick Stats Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{t('reports.quickStats')}</Text>
            <Text style={styles.sectionSubtitle}>Indicadores clave</Text>
          </View>
        </View>
        <View style={styles.quickStatsGrid}>
          <View style={styles.quickStatCard}>
            <View style={[styles.quickStatIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.quickStatValue}>
              {metrics?.services.completionRate.toFixed(0)}%
            </Text>
            <Text style={styles.quickStatLabel}>{t('reports.completionRate')}</Text>
          </View>
          <View style={styles.quickStatCard}>
            <View style={[styles.quickStatIcon, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="repeat-outline" size={24} color="#22c55e" />
            </View>
            <Text style={styles.quickStatValue}>
              {metrics?.clients.retention.toFixed(0)}%
            </Text>
            <Text style={styles.quickStatLabel}>{t('reports.retention')}</Text>
          </View>
          <View style={styles.quickStatCard}>
            <View style={[styles.quickStatIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="musical-notes-outline" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.quickStatValue}>
              {metrics?.pianos.total || 0}
            </Text>
            <Text style={styles.quickStatLabel}>{t('reports.pianos')}</Text>
          </View>
        </View>
      </View>

      {/* View All Reports Button */}
      {onNavigateToReports && (
        <TouchableOpacity 
          style={styles.viewAllButton} 
          onPress={onNavigateToReports}
          activeOpacity={0.7}
        >
          <Text style={styles.viewAllButtonText}>{t('reports.viewAllReports')}</Text>
          <Ionicons name="arrow-forward" size={20} color="#3b82f6" />
        </TouchableOpacity>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

// ============================================================================
// Styles - Diseño Moderno y Elegante
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  exportButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  periodSelector: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  periodScrollContent: {
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  periodButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  periodButtonText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 14,
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  metricCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  metricGradient: {
    padding: 20,
    minHeight: 140,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  metricTitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  chartContainer: {
    height: 220,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 20,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 40,
  },
  barColumn: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  barValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  barTrack: {
    flex: 1,
    width: '100%',
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    minHeight: 100,
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 8,
  },
  barLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 8,
    fontWeight: '500',
  },
  emptyChart: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyChartText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
  servicesCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  serviceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 14,
  },
  serviceName: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },
  serviceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serviceCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    minWidth: 32,
    textAlign: 'right',
  },
  servicePercentBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 56,
  },
  servicePercent: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyCardText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
  quickStatsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  quickStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickStatValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 32,
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  viewAllButtonText: {
    color: '#3b82f6',
    fontWeight: '700',
    marginRight: 8,
    fontSize: 15,
  },
  bottomPadding: {
    height: 40,
  },
});

export default AnalyticsDashboard;
