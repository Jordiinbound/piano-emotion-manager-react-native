/**
 * Dashboard de Analytics
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
  color: string;
}

interface PeriodSelectorProps {
  selected: PeriodPreset;
  onSelect: (preset: PeriodPreset) => void;
}

// ============================================================================
// Metric Card Component
// ============================================================================

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  color,
}) => {
  const isPositive = change !== undefined && change >= 0;

  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      {change !== undefined && (
        <View style={styles.changeContainer}>
          <Ionicons
            name={isPositive ? 'trending-up' : 'trending-down'}
            size={14}
            color={isPositive ? '#22c55e' : '#ef4444'}
          />
          <Text
            style={[
              styles.changeText,
              { color: isPositive ? '#22c55e' : '#ef4444' },
            ]}
          >
            {isPositive ? '+' : ''}{change.toFixed(1)}%
          </Text>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// Period Selector Component
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {periods.map((period) => (
          <TouchableOpacity
            key={period.key}
            style={[
              styles.periodButton,
              selected === period.key && styles.periodButtonActive,
            ]}
            onPress={() => onSelect(period.key)}
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
// Simple Chart Component (Placeholder)
// ============================================================================

interface SimpleBarChartProps {
  data: { label: string; value: number }[];
  color: string;
}

const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ data, color }) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={styles.chartContainer}>
      <View style={styles.barsContainer}>
        {data.slice(-7).map((item, index) => (
          <View key={index} style={styles.barWrapper}>
            <View
              style={[
                styles.bar,
                {
                  height: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: color,
                },
              ]}
            />
            <Text style={styles.barLabel}>{item.label}</Text>
          </View>
        ))}
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
        <Text style={styles.headerTitle}>{t('reports.analytics')}</Text>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => downloadPDF('executive', dateRange)}
          disabled={isExporting}
        >
          <Ionicons name="download-outline" size={20} color="#3b82f6" />
          <Text style={styles.exportButtonText}>{t('reports.export')}</Text>
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <PeriodSelector selected={preset} onSelect={changePeriod} />

      {/* Main Metrics */}
      <View style={styles.metricsGrid}>
        <MetricCard
          title={t('reports.revenue')}
          value={formatCurrency(metrics?.revenue.total || 0)}
          change={metrics?.revenue.changePercent}
          icon="cash-outline"
          color="#3b82f6"
        />
        <MetricCard
          title={t('reports.services')}
          value={metrics?.services.total || 0}
          icon="construct-outline"
          color="#22c55e"
        />
        <MetricCard
          title={t('reports.clients')}
          value={metrics?.clients.total || 0}
          change={metrics?.clients.new ? (metrics.clients.new / metrics.clients.total) * 100 : 0}
          icon="people-outline"
          color="#8b5cf6"
        />
        <MetricCard
          title={t('reports.avgTicket')}
          value={formatCurrency(metrics?.averages.ticketValue || 0)}
          icon="receipt-outline"
          color="#f59e0b"
        />
      </View>

      {/* Revenue Chart */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('reports.revenueEvolution')}</Text>
          <TouchableOpacity onPress={() => downloadCSV('revenue', dateRange)}>
            <Ionicons name="download-outline" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
        {revenueData && revenueData.length > 0 ? (
          <SimpleBarChart
            data={revenueData.map((d) => ({ label: d.period, value: d.revenue }))}
            color="#3b82f6"
          />
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyChartText}>{t('reports.noData')}</Text>
          </View>
        )}
      </View>

      {/* Services by Type */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('reports.servicesByType')}</Text>
        </View>
        {servicesData && servicesData.length > 0 ? (
          <View style={styles.servicesList}>
            {servicesData.slice(0, 5).map((service, index) => (
              <View key={index} style={styles.serviceItem}>
                <View style={styles.serviceInfo}>
                  <View
                    style={[
                      styles.serviceDot,
                      { backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'][index] },
                    ]}
                  />
                  <Text style={styles.serviceName}>{service.typeName}</Text>
                </View>
                <View style={styles.serviceStats}>
                  <Text style={styles.serviceCount}>{service.count}</Text>
                  <Text style={styles.servicePercent}>{service.percentage.toFixed(1)}%</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyChartText}>{t('reports.noData')}</Text>
          </View>
        )}
      </View>

      {/* Quick Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('reports.quickStats')}</Text>
        <View style={styles.quickStatsGrid}>
          <View style={styles.quickStatCard}>
            <Text style={styles.quickStatValue}>
              {metrics?.services.completionRate.toFixed(0)}%
            </Text>
            <Text style={styles.quickStatLabel}>{t('reports.completionRate')}</Text>
          </View>
          <View style={styles.quickStatCard}>
            <Text style={styles.quickStatValue}>
              {metrics?.clients.retention.toFixed(0)}%
            </Text>
            <Text style={styles.quickStatLabel}>{t('reports.retention')}</Text>
          </View>
          <View style={styles.quickStatCard}>
            <Text style={styles.quickStatValue}>
              {metrics?.pianos.total || 0}
            </Text>
            <Text style={styles.quickStatLabel}>{t('reports.pianos')}</Text>
          </View>
        </View>
      </View>

      {/* View All Reports Button */}
      {onNavigateToReports && (
        <TouchableOpacity style={styles.viewAllButton} onPress={onNavigateToReports}>
          <Text style={styles.viewAllButtonText}>{t('reports.viewAllReports')}</Text>
          <Ionicons name="arrow-forward" size={20} color="#3b82f6" />
        </TouchableOpacity>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
    marginLeft: 4,
  },
  periodSelector: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  periodButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  periodButtonText: {
    color: '#6b7280',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  metricCard: {
    width: (SCREEN_WIDTH - 40) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
  },
  metricTitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    height: 200,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 24,
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 8,
  },
  emptyChart: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  servicesList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 14,
    color: '#374151',
  },
  serviceStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 8,
  },
  servicePercent: {
    fontSize: 12,
    color: '#9ca3af',
  },
  quickStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  viewAllButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
    marginRight: 8,
  },
  bottomPadding: {
    height: 40,
  },
});

export default AnalyticsDashboard;
