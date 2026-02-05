/**
 * RecentInvoicesWidget - Widget de facturas recientes del dashboard
 * Muestra las últimas facturas creadas en el sistema
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useInvoices } from '@/hooks/use-invoices';

interface WidgetProps {
  config?: Record<string, any>;
  isEditing?: boolean;
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall' | 'full';
}

export const RecentInvoicesWidget = React.memo(function RecentInvoicesWidget({ config, isEditing }: WidgetProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { invoices } = useInvoices();

  const recentInvoices = useMemo(() => {
    return invoices
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, config?.limit || 5);
  }, [invoices, config]);

  const handleInvoicePress = (invoiceId: string) => {
    if (!isEditing) {
      router.push(`/invoices/${invoiceId}` as any);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#10B981';
      case 'sent': return '#F59E0B';
      case 'draft': return '#64748B';
      case 'overdue': return '#EF4444';
      default: return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Pagada';
      case 'sent': return 'Enviada';
      case 'draft': return 'Borrador';
      case 'overdue': return 'Vencida';
      default: return status;
    }
  };

  if (isEditing) {
    return (
      <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
        <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Vista previa de Facturas Recientes
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
      {recentInvoices.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={32} color={colors.textSecondary} />
          <ThemedText style={{ color: colors.textSecondary, marginTop: 8 }}>
            No hay facturas recientes
          </ThemedText>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {recentInvoices.map((invoice) => (
            <Pressable
              key={invoice.id}
              style={[styles.listItem, { borderBottomColor: colors.border }]}
              onPress={() => handleInvoicePress(invoice.id)}
            >
              <View style={[styles.listItemIcon, { backgroundColor: `${getStatusColor(invoice.status)}15` }]}>
                <Ionicons name="document-text" size={20} color={getStatusColor(invoice.status)} />
              </View>
              <View style={styles.listItemContent}>
                <ThemedText style={[styles.listItemTitle, { color: colors.text }]}>
                  {invoice.number}
                </ThemedText>
                <ThemedText style={[styles.listItemSubtitle, { color: colors.textSecondary }]}>
                  {getStatusLabel(invoice.status)} • {invoice.total.toFixed(2)}€
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
});
const styles = StyleSheet.create({
  widgetContent: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  listItemSubtitle: {
    fontSize: 12,
  },
});