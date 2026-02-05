/**
 * Dashboard de Contabilidad
 * Piano Emotion Manager
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuickStats, useFinancialSummary, useAccounts } from '@/hooks/accounting';
import { useTranslation } from '@/hooks/use-translation';

// ============================================================================
// Types
// ============================================================================

type Period = 'week' | 'month' | 'quarter' | 'year';

// ============================================================================
// Stat Card Component
// ============================================================================

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
  trend?: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend }) => {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        {trend !== undefined && (
          <View style={[styles.trendBadge, { backgroundColor: trend >= 0 ? '#F0FDF4' : '#FEF2F2' }]}>
            <Ionicons
              name={trend >= 0 ? 'trending-up' : 'trending-down'}
              size={12}
              color={trend >= 0 ? '#16A34A' : '#DC2626'}
            />
            <Text style={[styles.trendText, { color: trend >= 0 ? '#16A34A' : '#DC2626' }]}>
              {Math.abs(trend).toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
};

// ============================================================================
// Account Card Component
// ============================================================================

interface AccountCardProps {
  name: string;
  type: string;
  balance: number;
  color?: string;
}

const AccountCard: React.FC<AccountCardProps> = ({ name, type, balance, color }) => {
  const { t } = useTranslation();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const typeIcons: Record<string, string> = {
    cash: 'cash-outline',
    bank: 'business-outline',
    credit_card: 'card-outline',
    savings: 'wallet-outline',
    paypal: 'logo-paypal',
    other: 'ellipsis-horizontal-outline',
  };

  return (
    <View style={[styles.accountCard, { borderLeftColor: color || '#003a8c' }]}>
      <View style={styles.accountIcon}>
        <Ionicons name={typeIcons[type] as any || 'wallet-outline'} size={20} color="#6b7280" />
      </View>
      <View style={styles.accountInfo}>
        <Text style={styles.accountName}>{name}</Text>
        <Text style={styles.accountType}>{t(`accounting.accountType.${type}`)}</Text>
      </View>
      <Text style={[styles.accountBalance, { color: balance >= 0 ? '#16A34A' : '#DC2626' }]}>
        {formatCurrency(balance)}
      </Text>
    </View>
  );
};

// ============================================================================
// Category Bar Component
// ============================================================================

interface CategoryBarProps {
  category: string;
  amount: number;
  total: number;
  color: string;
}

const CategoryBar: React.FC<CategoryBarProps> = ({ category, amount, total, color }) => {
  const { t } = useTranslation();
  const percentage = total > 0 ? (amount / total) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <View style={styles.categoryBar}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryName}>{t(`accounting.category.${category}`)}</Text>
        <Text style={styles.categoryAmount}>{formatCurrency(amount)}</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const AccountingDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('month');

  // Calcular fechas según el período
  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };
  }, [period]);

  const { summary, isLoading: summaryLoading } = useFinancialSummary(
    dateRange.startDate,
    dateRange.endDate
  );
  const { accounts, balance, isLoading: accountsLoading } = useAccounts();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Colores profesionales y sutiles para categorías de gastos
  const expenseColors: Record<string, string> = {
    materials: '#64748B',
    tools: '#6B7280',
    transport: '#78716C',
    vehicle: '#737373',
    office: '#71717A',
    marketing: '#6B7280',
    software: '#64748B',
    insurance: '#78716C',
    taxes: '#737373',
    salaries: '#71717A',
    rent: '#6B7280',
    utilities: '#64748B',
    training: '#78716C',
    other: '#6B7280',
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['week', 'month', 'quarter', 'year'] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, period === p && styles.periodButtonActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodButtonText, period === p && styles.periodButtonTextActive]}>
              {t(`accounting.period.${p}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <StatCard
          title={t('accounting.income')}
          value={formatCurrency(summary?.totalIncome || 0)}
          icon="trending-up"
          color="#16A34A"
        />
        <StatCard
          title={t('accounting.expenses')}
          value={formatCurrency(summary?.totalExpenses || 0)}
          icon="trending-down"
          color="#DC2626"
        />
        <StatCard
          title={t('accounting.profit')}
          value={formatCurrency(summary?.netProfit || 0)}
          icon="analytics"
          color={summary?.netProfit && summary.netProfit >= 0 ? '#003a8c' : '#DC2626'}
        />
        <StatCard
          title={t('accounting.balance')}
          value={formatCurrency(balance)}
          icon="wallet"
          color="#64748B"
        />
      </View>

      {/* Accounts Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('accounting.accounts')}</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllButton}>{t('common.seeAll')}</Text>
          </TouchableOpacity>
        </View>
        {accounts.slice(0, 4).map((account) => (
          <AccountCard
            key={account.id}
            name={account.name}
            type={account.type}
            balance={parseFloat(account.currentBalance || '0')}
            color={account.color || undefined}
          />
        ))}
      </View>

      {/* Expenses by Category */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('accounting.expensesByCategory')}</Text>
        {summary?.expensesByCategory &&
          Object.entries(summary.expensesByCategory)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6)
            .map(([category, amount]) => (
              <CategoryBar
                key={category}
                category={category}
                amount={amount}
                total={summary.totalExpenses}
                color={expenseColors[category] || '#6B7280'}
              />
            ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('accounting.quickActions')}</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.actionIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="add-circle" size={24} color="#16A34A" />
            </View>
            <Text style={styles.actionText}>{t('accounting.addIncome')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.actionIcon, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="remove-circle" size={24} color="#DC2626" />
            </View>
            <Text style={styles.actionText}>{t('accounting.addExpense')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.actionIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="swap-horizontal" size={24} color="#003a8c" />
            </View>
            <Text style={styles.actionText}>{t('accounting.transfer')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.actionIcon, { backgroundColor: '#F8FAFC' }]}>
              <Ionicons name="document-text" size={24} color="#64748B" />
            </View>
            <Text style={styles.actionText}>{t('accounting.reports')}</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  periodButtonActive: {
    backgroundColor: '#003a8c',
    borderColor: '#003a8c',
  },
  periodButtonText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  statCard: {
    width: (Dimensions.get('window').width - 40) / 2,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  seeAllButton: {
    fontSize: 14,
    color: '#003a8c',
    fontWeight: '500',
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
    marginLeft: 12,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  accountType: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: '700',
  },
  categoryBar: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 13,
    color: '#374151',
  },
  categoryAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    width: (Dimensions.get('window').width - 56) / 2,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default AccountingDashboard;
