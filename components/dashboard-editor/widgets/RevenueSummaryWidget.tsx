/**
 * RevenueSummaryWidget - Widget de resumen de ingresos
 * Muestra el resumen de ingresos totales, cobrados y pendientes
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useServicesData } from '@/hooks/data';
import { useInvoices } from '@/hooks/use-invoices';

interface WidgetProps {
  config?: Record<string, any>;
  isEditing?: boolean;
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall' | 'full';
}

export const RevenueSummaryWidget = React.memo(function RevenueSummaryWidget({ config, isEditing }: WidgetProps) {
  const { colors } = useTheme();
  const { services } = useServicesData();
  const { invoices } = useInvoices();

  const revenueSummary = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyServices = services.filter(s => new Date(s.date) >= thisMonth);
    const totalRevenue = monthlyServices.reduce((sum, s) => sum + (s.cost || 0), 0);
    
    const paidInvoices = invoices.filter(i => i.status === 'paid' && new Date(i.date) >= thisMonth);
    const paidAmount = paidInvoices.reduce((sum, i) => sum + i.total, 0);
    
    const pendingInvoices = invoices.filter(i => i.status === 'sent');
    const pendingAmount = pendingInvoices.reduce((sum, i) => sum + i.total, 0);

    return {
      total: totalRevenue,
      paid: paidAmount,
      pending: pendingAmount,
    };
  }, [services, invoices]);

  if (isEditing) {
    return (
      <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
        <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Vista previa de Resumen de Ingresos
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
      <ThemedText style={[styles.revenueSummaryTitle, { color: colors.text }]}>
        Resumen de Ingresos
      </ThemedText>
      
      <View style={styles.revenueSummaryItem}>
        <View style={styles.revenueSummaryRow}>
          <View style={[styles.revenueIndicator, { backgroundColor: '#10B981' }]} />
          <ThemedText style={[styles.revenueLabel, { color: colors.textSecondary }]}>
            Total del mes
          </ThemedText>
        </View>
        <ThemedText style={[styles.revenueValue, { color: colors.text }]}>
          {revenueSummary.total.toFixed(2)}€
        </ThemedText>
      </View>

      <View style={styles.revenueSummaryItem}>
        <View style={styles.revenueSummaryRow}>
          <View style={[styles.revenueIndicator, { backgroundColor: '#22C55E' }]} />
          <ThemedText style={[styles.revenueLabel, { color: colors.textSecondary }]}>
            Cobrado
          </ThemedText>
        </View>
        <ThemedText style={[styles.revenueValue, { color: '#22C55E' }]}>
          {revenueSummary.paid.toFixed(2)}€
        </ThemedText>
      </View>

      <View style={styles.revenueSummaryItem}>
        <View style={styles.revenueSummaryRow}>
          <View style={[styles.revenueIndicator, { backgroundColor: '#F59E0B' }]} />
          <ThemedText style={[styles.revenueLabel, { color: colors.textSecondary }]}>
            Pendiente
          </ThemedText>
        </View>
        <ThemedText style={[styles.revenueValue, { color: '#F59E0B' }]}>
          {revenueSummary.pending.toFixed(2)}€
        </ThemedText>
      </View>
    </View>
  );
});
const styles = StyleSheet.create({
  widgetContent: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
  },
  revenueSummaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  revenueSummaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  revenueSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  revenueIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  revenueLabel: {
    fontSize: 13,
  },
  revenueValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});