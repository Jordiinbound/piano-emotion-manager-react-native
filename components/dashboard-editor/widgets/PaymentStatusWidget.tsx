/**
 * PaymentStatusWidget - Widget de estado de pagos
 * Muestra el resumen del estado de las facturas (pagadas, enviadas, borradores)
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useInvoices } from '@/hooks/use-invoices';

interface WidgetProps {
  config?: Record<string, any>;
  isEditing?: boolean;
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall' | 'full';
}

export const PaymentStatusWidget = React.memo(function PaymentStatusWidget({ config, isEditing }: WidgetProps) {
  const { colors } = useTheme();
  const { invoices } = useInvoices();

  const paymentStatus = useMemo(() => {
    const paid = invoices.filter(i => i.status === 'paid').length;
    const sent = invoices.filter(i => i.status === 'sent').length;
    const draft = invoices.filter(i => i.status === 'draft').length;
    const total = invoices.length;

    return { paid, sent, draft, total };
  }, [invoices]);

  if (isEditing) {
    return (
      <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
        <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Vista previa de Estado de Pagos
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
      <ThemedText style={[styles.paymentStatusTitle, { color: colors.text }]}>
        Estado de Pagos
      </ThemedText>
      
      <View style={styles.paymentStatusGrid}>
        <View style={styles.paymentStatusItem}>
          <ThemedText style={[styles.paymentStatusValue, { color: '#10B981' }]}>
            {paymentStatus.paid}
          </ThemedText>
          <ThemedText style={[styles.paymentStatusLabel, { color: colors.textSecondary }]}>
            Pagadas
          </ThemedText>
        </View>

        <View style={styles.paymentStatusItem}>
          <ThemedText style={[styles.paymentStatusValue, { color: '#F59E0B' }]}>
            {paymentStatus.sent}
          </ThemedText>
          <ThemedText style={[styles.paymentStatusLabel, { color: colors.textSecondary }]}>
            Enviadas
          </ThemedText>
        </View>

        <View style={styles.paymentStatusItem}>
          <ThemedText style={[styles.paymentStatusValue, { color: '#64748B' }]}>
            {paymentStatus.draft}
          </ThemedText>
          <ThemedText style={[styles.paymentStatusLabel, { color: colors.textSecondary }]}>
            Borradores
          </ThemedText>
        </View>

        <View style={styles.paymentStatusItem}>
          <ThemedText style={[styles.paymentStatusValue, { color: colors.text }]}>
            {paymentStatus.total}
          </ThemedText>
          <ThemedText style={[styles.paymentStatusLabel, { color: colors.textSecondary }]}>
            Total
          </ThemedText>
        </View>
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
  paymentStatusTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  paymentStatusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  paymentStatusItem: {
    flex: 1,
    minWidth: '40%',
    alignItems: 'center',
    padding: 12,
  },
  paymentStatusValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  paymentStatusLabel: {
    fontSize: 12,
  },
});