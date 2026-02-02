/**
 * Página de Alertas Completas
 * Muestra todas las alertas y avisos del sistema sin límite
 */
import { View, ScrollView, StyleSheet, Pressable, TouchableOpacity, Linking, Platform, Alert as RNAlert } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing, BorderRadius } from '@/constants/theme';
import { usePianosData } from '@/hooks/data/use-pianos-data';
import { useServicesData } from '@/hooks/data/use-services-data';
import { useAppointmentsData } from '@/hooks/data/use-appointments-data';
import { useInvoicesData } from '@/hooks/data/use-invoices-data';
import { useQuotesData } from '@/hooks/data/use-quotes-data';
import { useClientsData } from '@/hooks/data/use-clients-data';
import { useAllAlerts, type Alert } from '@/hooks/use-all-alerts';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AlertsScreen() {
  const router = useRouter();
  // Cargar TODOS los pianos y servicios (5000) para calcular alertas correctamente
  const { pianos, loading: loadingPianos } = usePianosData({ pageSize: 5000 });
  const { services, loading: loadingServices } = useServicesData({ pageSize: 5000 });
  const { appointments, loading: loadingAppointments } = useAppointmentsData();
  const { invoices, loading: loadingInvoices } = useInvoicesData();
  const { quotes, loading: loadingQuotes } = useQuotesData();
  const { clients } = useClientsData();
  
  const { alerts, stats } = useAllAlerts(pianos, services, appointments, invoices, quotes);
  
  const [emailClientPreference, setEmailClientPreference] = useState<'gmail' | 'outlook' | 'default'>('gmail');
  
  // Mostrar alertas tan pronto como tengamos datos parciales
  const isLoading = loadingPianos && loadingServices && loadingAppointments && loadingInvoices && loadingQuotes;
  const hasPartialData = !loadingPianos || !loadingServices || !loadingAppointments || !loadingInvoices || !loadingQuotes;
  
  // Cargar preferencia de cliente de correo
  useEffect(() => {
    const loadEmailPreference = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem('userSettings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setEmailClientPreference(parsed.emailClientPreference || 'gmail');
        }
      } catch (error) {
        console.error('Error loading email preference:', error);
      }
    };
    loadEmailPreference();
  }, []);
  
  const error = useThemeColor({}, 'error');
  const warning = useThemeColor({}, 'warning');
  const info = useThemeColor({}, 'tint');
  const success = useThemeColor({}, 'success');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const border = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textColor = useThemeColor({}, 'text');

  // Separar alertas por prioridad
  const urgentAlerts = alerts.filter(a => a.priority === 'urgent');
  const warningAlerts = alerts.filter(a => a.priority === 'warning');
  const infoAlerts = alerts.filter(a => a.priority === 'info');

  // Función para obtener cliente por ID
  const getClient = (clientId: string | number) => {
    const normalizedId = String(clientId);
    return clients.find(c => c.id === normalizedId);
  };

  // Iconos por tipo de alerta
  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'piano': return 'wrench.and.screwdriver.fill';
      case 'appointment': return 'calendar';
      case 'invoice': return 'doc.text.fill';
      case 'quote': return 'doc.on.clipboard.fill';
      case 'reminder': return 'bell.fill';
      default: return 'exclamationmark.circle.fill';
    }
  };

  // Color por prioridad
  const getPriorityColor = (priority: Alert['priority']) => {
    switch (priority) {
      case 'urgent': return error;
      case 'warning': return warning;
      case 'info': return info;
      default: return info;
    }
  };

  const handleAlertPress = (alert: Alert) => {
    if (alert.actionUrl) {
      router.push(alert.actionUrl as any);
    }
  };

  // Función para enviar email
  const handleContactClient = async (clientId: string) => {
    const client = getClient(clientId);
    if (!client || !client.email) {
      RNAlert.alert('Error', 'No se encontró el email del cliente');
      return;
    }

    const subject = encodeURIComponent('Seguimiento de afinación de piano');
    const body = encodeURIComponent(`Estimado/a ${client.firstName} ${client.lastName1 || ''},\n\nNos ponemos en contacto con usted para...\n\nSaludos cordiales`);

    // Construir URLs para diferentes clientes de correo
    const gmailUrl = `googlegmail://co?to=${client.email}&subject=${subject}&body=${body}`;
    const outlookUrl = `ms-outlook://compose?to=${client.email}&subject=${subject}&body=${body}`;
    const defaultUrl = `mailto:${client.email}?subject=${subject}&body=${body}`;

    // Seleccionar URL según preferencia
    let emailUrl = defaultUrl;
    if (emailClientPreference === 'gmail') {
      emailUrl = gmailUrl;
    } else if (emailClientPreference === 'outlook') {
      emailUrl = outlookUrl;
    }

    // Intentar abrir el cliente de correo
    try {
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);
      } else {
        // Si no puede abrir el cliente preferido, usar mailto por defecto
        await Linking.openURL(defaultUrl);
      }
    } catch (error) {
      console.error('Error opening email client:', error);
      RNAlert.alert('Error', 'No se pudo abrir el cliente de correo');
    }
  };

  const renderAlert = (alert: Alert) => (
    <View
      key={alert.id}
      style={[styles.alertItem, { borderLeftColor: getPriorityColor(alert.priority), backgroundColor: cardBackground, borderColor: border }]}
    >
      <Pressable
        style={styles.alertPressableArea}
        onPress={() => handleAlertPress(alert)}
      >
        <View style={[styles.alertIconContainer, { backgroundColor: getPriorityColor(alert.priority) + '20' }]}>
          <IconSymbol 
            name={getAlertIcon(alert.type)} 
            size={16} 
            color={getPriorityColor(alert.priority)} 
          />
        </View>
        <View style={styles.alertTextContainer}>
          <ThemedText style={styles.alertTitle}>{alert.title}</ThemedText>
          <ThemedText style={[styles.alertMessage, { color: textSecondary }]}>
            {alert.message}
          </ThemedText>
        </View>
      </Pressable>
      {alert.type === 'piano' && alert.data?.clientId && (
        <TouchableOpacity
          style={[styles.contactButton, { backgroundColor: error + '15', borderColor: error }]}
          onPress={() => handleContactClient(alert.data!.clientId as string)}
        >
          <IconSymbol name="envelope.fill" size={12} color={error} />
          <ThemedText style={[styles.contactButtonText, { color: error }]}>
            Contactar
          </ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardBackground, borderBottomColor: border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="arrow.left" size={24} color={textColor} />
        </Pressable>
        <View style={styles.headerContent}>
          <ThemedText style={styles.headerTitle}>Todas las Alertas</ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: textSecondary }]}>
            {alerts.length} alertas y avisos
          </ThemedText>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ThemedText style={{ color: textSecondary }}>Cargando alertas...</ThemedText>
            <ThemedText style={{ color: textSecondary, fontSize: 12, marginTop: 8 }}>
              {loadingPianos && 'Cargando pianos...'}
              {loadingServices && 'Cargando servicios...'}
              {loadingAppointments && 'Cargando citas...'}
              {loadingInvoices && 'Cargando facturas...'}
              {loadingQuotes && 'Cargando presupuestos...'}
            </ThemedText>
          </View>
        ) : alerts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="checkmark.circle.fill" size={48} color={success} />
            <ThemedText style={styles.emptyTitle}>¡Todo al día!</ThemedText>
            <ThemedText style={[styles.emptyMessage, { color: textSecondary }]}>
              No hay alertas ni avisos pendientes
            </ThemedText>
          </View>
        ) : (
          <>
            {/* Alertas Urgentes */}
            {urgentAlerts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <IconSymbol name="exclamationmark.triangle.fill" size={20} color={error} />
                  <ThemedText style={[styles.sectionTitle, { color: error }]}>
                    Alertas Urgentes ({urgentAlerts.length})
                  </ThemedText>
                </View>
                <View style={styles.alertsList}>
                  {urgentAlerts.map(renderAlert)}
                </View>
              </View>
            )}

            {/* Avisos (Warning) */}
            {warningAlerts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <IconSymbol name="exclamationmark.circle.fill" size={20} color={warning} />
                  <ThemedText style={[styles.sectionTitle, { color: warning }]}>
                    Avisos ({warningAlerts.length})
                  </ThemedText>
                </View>
                <View style={styles.alertsList}>
                  {warningAlerts.map(renderAlert)}
                </View>
              </View>
            )}

            {/* Información */}
            {infoAlerts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <IconSymbol name="info.circle.fill" size={20} color={info} />
                  <ThemedText style={[styles.sectionTitle, { color: info }]}>
                    Información ({infoAlerts.length})
                  </ThemedText>
                </View>
                <View style={styles.alertsList}>
                  {infoAlerts.map(renderAlert)}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  alertsList: {
    gap: Spacing.sm,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderLeftWidth: 4,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  alertPressableArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  alertIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTextContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  alertMessage: {
    fontSize: 12,
    lineHeight: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  contactButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
