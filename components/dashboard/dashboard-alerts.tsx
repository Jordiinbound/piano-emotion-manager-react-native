/**
 * Dashboard Alerts Component
 * Muestra alertas consolidadas de pianos que requieren atención
 */
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing, BorderRadius } from '@/constants/theme';

interface DashboardAlertsProps {
  urgentCount: number;
  pendingCount: number;
}

export function DashboardAlerts({ urgentCount, pendingCount }: DashboardAlertsProps) {
  const router = useRouter();
  const error = useThemeColor({}, 'error');
  const warning = useThemeColor({}, 'warning');

  // Determinar si hay alertas
  const hasAlerts = urgentCount > 0 || pendingCount > 0;
  
  // Determinar el color principal basado en si hay urgentes
  const hasUrgent = urgentCount > 0;
  const primaryColor = hasAlerts ? (hasUrgent ? error : warning) : '#10B981';
  
  // Usar colores del tema para el fondo
  const cardBackground = useThemeColor({}, 'cardBackground');
  const border = useThemeColor({}, 'border');

  const handlePress = () => {
    if (hasAlerts) {
      router.push('/(tabs)/services');
    }
  };

  const Container = hasAlerts ? Pressable : View;

  return (
    <Container 
      style={[styles.alertBanner, { backgroundColor: cardBackground, borderColor: border }]}
      onPress={hasAlerts ? handlePress : undefined}
    >
      <IconSymbol 
        name={hasAlerts ? (hasUrgent ? "exclamationmark.triangle.fill" : "clock.fill") : "checkmark.circle.fill"} 
        size={22} 
        color={primaryColor} 
      />
      <View style={styles.alertContent}>
        {/* Mostrar mensaje cuando no hay alertas */}
        {!hasAlerts && (
          <View style={styles.alertRow}>
            <View style={[styles.alertDot, { backgroundColor: primaryColor }]} />
            <ThemedText style={[styles.alertText, { color: primaryColor }]}>
              No hay alertas
            </ThemedText>
          </View>
        )}
        {/* Mostrar alertas urgentes */}
        {urgentCount > 0 && (
          <View style={styles.alertRow}>
            <View style={[styles.alertDot, { backgroundColor: error }]} />
            <ThemedText style={[styles.alertText, { color: error }]}>
              {urgentCount} {urgentCount === 1 ? 'piano requiere' : 'pianos requieren'} atención urgente
            </ThemedText>
          </View>
        )}
        {/* Mostrar pendientes */}
        {pendingCount > 0 && (
          <View style={styles.alertRow}>
            <View style={[styles.alertDot, { backgroundColor: warning }]} />
            <ThemedText style={[styles.alertText, { color: warning }]}>
              {pendingCount} {pendingCount === 1 ? 'piano necesita' : 'pianos necesitan'} servicio pronto
            </ThemedText>
          </View>
        )}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  alertContent: {
    flex: 1,
    gap: 2,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  alertDot: {
    width: 6,
    height: 6,
    borderRadius: 4,
  },
  alertText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
