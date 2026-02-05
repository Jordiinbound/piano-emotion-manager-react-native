import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Stack } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useInvoicesData } from '@/hooks/data';
import { BorderRadius, Spacing } from '@/constants/theme';

type ViewMode = 'monthly' | 'quarterly' | 'yearly';

export default function BillingSummaryScreen() {
  const { invoices = [] } = useInvoicesData();
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);

  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const primary = useThemeColor({}, 'tint');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const error = useThemeColor({}, 'error');
  const border = useThemeColor({}, 'border');

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Obtener años disponibles
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    invoices.forEach(inv => {
      const year = new Date(inv.date).getFullYear();
      years.add(year);
    });
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [invoices]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    let filteredInvoices = invoices;

    if (viewMode === 'monthly') {
      filteredInvoices = invoices.filter(inv => {
        const date = new Date(inv.date);
        return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
      });
    } else if (viewMode === 'quarterly') {
      filteredInvoices = invoices.filter(inv => {
        const date = new Date(inv.date);
        const invoiceQuarter = Math.floor(date.getMonth() / 3) + 1;
        return date.getFullYear() === selectedYear && invoiceQuarter === selectedQuarter;
      });
    } else {
      filteredInvoices = invoices.filter(inv => {
        const date = new Date(inv.date);
        return date.getFullYear() === selectedYear;
      });
    }

    const total = filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const paid = filteredInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
    const pending = filteredInvoices
      .filter(inv => inv.status === 'sent' || inv.status === 'draft')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
    const cancelled = filteredInvoices
      .filter(inv => inv.status === 'cancelled')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    const count = filteredInvoices.length;
    const paidCount = filteredInvoices.filter(inv => inv.status === 'paid').length;
    const pendingCount = filteredInvoices.filter(inv => inv.status === 'sent' || inv.status === 'draft').length;

    // Calcular IVA
    const vatAmount = filteredInvoices.reduce((sum, inv) => {
      const subtotal = (inv.total || 0) / 1.21; // Asumiendo 21% IVA
      return sum + ((inv.total || 0) - subtotal);
    }, 0);

    // Desglose por mes (para vista anual)
    const monthlyBreakdown = viewMode === 'yearly' ? months.map((month, index) => {
      const monthInvoices = invoices.filter(inv => {
        const date = new Date(inv.date);
        return date.getFullYear() === selectedYear && date.getMonth() === index;
      });
      return {
        month,
        total: monthInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
        count: monthInvoices.length,
      };
    }) : [];

    return {
      total,
      paid,
      pending,
      cancelled,
      vatAmount,
      count,
      paidCount,
      pendingCount,
      monthlyBreakdown,
    };
  }, [invoices, viewMode, selectedYear, selectedMonth, selectedQuarter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const maxMonthlyTotal = Math.max(...stats.monthlyBreakdown.map(m => m.total), 1);

  const getPeriodText = () => {
    if (viewMode === 'monthly') {
      return `${months[selectedMonth]} ${selectedYear}`;
    } else if (viewMode === 'quarterly') {
      return `T${selectedQuarter} ${selectedYear}`;
    } else {
      return `Año ${selectedYear}`;
    }
  };

  const handlePreviousPeriod = () => {
    if (viewMode === 'monthly') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else if (viewMode === 'quarterly') {
      if (selectedQuarter === 1) {
        setSelectedQuarter(4);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedQuarter(selectedQuarter - 1);
      }
    } else {
      setSelectedYear(selectedYear - 1);
    }
  };

  const handleNextPeriod = () => {
    if (viewMode === 'monthly') {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    } else if (viewMode === 'quarterly') {
      if (selectedQuarter === 4) {
        setSelectedQuarter(1);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedQuarter(selectedQuarter + 1);
      }
    } else {
      setSelectedYear(selectedYear + 1);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Resumen de Facturación',
          headerStyle: { backgroundColor },
          headerTintColor: textColor,
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Selector de vista */}
        <View style={[styles.viewSelector, { backgroundColor: cardBg }]}>
          <Pressable
            style={[
              styles.viewOption,
              viewMode === 'monthly' && { backgroundColor: primary },
            ]}
            onPress={() => setViewMode('monthly')}
          >
            <ThemedText style={[
              styles.viewOptionText,
              viewMode === 'monthly' && { color: '#fff' },
            ]}>
              Mensual
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.viewOption,
              viewMode === 'quarterly' && { backgroundColor: primary },
            ]}
            onPress={() => setViewMode('quarterly')}
          >
            <ThemedText style={[
              styles.viewOptionText,
              viewMode === 'quarterly' && { color: '#fff' },
            ]}>
              Trimestral
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.viewOption,
              viewMode === 'yearly' && { backgroundColor: primary },
            ]}
            onPress={() => setViewMode('yearly')}
          >
            <ThemedText style={[
              styles.viewOptionText,
              viewMode === 'yearly' && { color: '#fff' },
            ]}>
              Anual
            </ThemedText>
          </Pressable>
        </View>

        {/* Selector de período */}
        <View style={[styles.periodSelector, { backgroundColor: cardBg }]}>
          <Pressable
            style={styles.periodArrow}
            onPress={handlePreviousPeriod}
          >
            <IconSymbol name="chevron.left" size={20} color={primary} />
          </Pressable>
          
          <ThemedText style={styles.periodText}>
            {getPeriodText()}
          </ThemedText>
          
          <Pressable
            style={styles.periodArrow}
            onPress={handleNextPeriod}
          >
            <IconSymbol name="chevron.right" size={20} color={primary} />
          </Pressable>
        </View>

        {/* Tarjeta de total */}
        <View style={[styles.totalCard, { backgroundColor: primary }]}>
          <ThemedText style={styles.totalLabel}>Total Facturado</ThemedText>
          <ThemedText style={styles.totalAmount}>{formatCurrency(stats.total)}</ThemedText>
          <ThemedText style={styles.totalCount}>
            {stats.count} factura{stats.count !== 1 ? 's' : ''}
          </ThemedText>
        </View>

        {/* Estadísticas */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: cardBg }]}>
            <View style={[styles.statIcon, { backgroundColor: success + '20' }]}>
              <IconSymbol name="checkmark.circle" size={20} color={success} />
            </View>
            <ThemedText style={[styles.statLabel, { color: textSecondary }]}>Cobrado</ThemedText>
            <ThemedText style={[styles.statAmount, { color: success }]}>
              {formatCurrency(stats.paid)}
            </ThemedText>
            <ThemedText style={[styles.statCount, { color: textSecondary }]}>
              {stats.paidCount} facturas
            </ThemedText>
          </View>

          <View style={[styles.statCard, { backgroundColor: cardBg }]}>
            <View style={[styles.statIcon, { backgroundColor: warning + '20' }]}>
              <IconSymbol name="clock" size={20} color={warning} />
            </View>
            <ThemedText style={[styles.statLabel, { color: textSecondary }]}>Pendiente</ThemedText>
            <ThemedText style={[styles.statAmount, { color: warning }]}>
              {formatCurrency(stats.pending)}
            </ThemedText>
            <ThemedText style={[styles.statCount, { color: textSecondary }]}>
              {stats.pendingCount} facturas
            </ThemedText>
          </View>
        </View>

        {/* IVA */}
        <View style={[styles.vatCard, { backgroundColor: cardBg }]}>
          <View style={styles.vatHeader}>
            <IconSymbol name="percent" size={20} color={primary} />
            <ThemedText style={styles.vatTitle}>IVA Repercutido</ThemedText>
          </View>
          <ThemedText style={[styles.vatAmount, { color: primary }]}>
            {formatCurrency(stats.vatAmount)}
          </ThemedText>
          <ThemedText style={[styles.vatNote, { color: textSecondary }]}>
            Base imponible: {formatCurrency(stats.total - stats.vatAmount)}
          </ThemedText>
        </View>

        {/* Desglose mensual (solo en vista anual) */}
        {viewMode === 'yearly' && (
          <View style={[styles.breakdownSection, { backgroundColor: cardBg }]}>
            <View style={styles.breakdownHeader}>
              <IconSymbol name="chart.bar" size={20} color={primary} />
              <ThemedText style={styles.breakdownTitle}>Desglose Mensual</ThemedText>
            </View>

            {stats.monthlyBreakdown.map((item, index) => (
              <View key={item.month} style={[styles.breakdownRow, { borderBottomColor: border }]}>
                <ThemedText style={styles.breakdownMonth}>{item.month}</ThemedText>
                <View style={styles.breakdownBarContainer}>
                  <View 
                    style={[
                      styles.breakdownBar, 
                      { 
                        backgroundColor: primary,
                        width: `${(item.total / maxMonthlyTotal) * 100}%`,
                      }
                    ]} 
                  />
                </View>
                <View style={styles.breakdownValues}>
                  <ThemedText style={styles.breakdownAmount}>
                    {formatCurrency(item.total)}
                  </ThemedText>
                  <ThemedText style={[styles.breakdownCount, { color: textSecondary }]}>
                    {item.count}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Acciones */}
        <View style={[styles.actionsSection, { backgroundColor: cardBg }]}>
          <Pressable style={[styles.actionButton, { borderColor: primary }]}>
            <IconSymbol name="arrow.down.doc" size={18} color={primary} />
            <ThemedText style={[styles.actionButtonText, { color: primary }]}>
              Exportar a PDF
            </ThemedText>
          </Pressable>
          <Pressable style={[styles.actionButton, { borderColor: primary }]}>
            <IconSymbol name="tablecells" size={18} color={primary} />
            <ThemedText style={[styles.actionButtonText, { color: primary }]}>
              Exportar a Excel
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
  viewSelector: {
    flexDirection: 'row',
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: 4,
  },
  viewOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  viewOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  periodArrow: {
    padding: Spacing.sm,
  },
  periodText: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalCard: {
    margin: Spacing.md,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  totalLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  totalAmount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '700',
  },
  totalCount: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  statCount: {
    fontSize: 11,
    marginTop: 2,
  },
  vatCard: {
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  vatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  vatTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  vatAmount: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  vatNote: {
    fontSize: 12,
  },
  breakdownSection: {
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  breakdownMonth: {
    width: 80,
    fontSize: 13,
  },
  breakdownBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    marginHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  breakdownBar: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownValues: {
    width: 90,
    alignItems: 'flex-end',
  },
  breakdownAmount: {
    fontSize: 13,
    fontWeight: '500',
  },
  breakdownCount: {
    fontSize: 10,
  },
  actionsSection: {
    flexDirection: 'row',
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 40,
  },
});
