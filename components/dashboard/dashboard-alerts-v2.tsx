/**
 * Dashboard Alerts Component V2
 * Muestra alertas y avisos consolidados de todo el sistema
 * - Alertas: Urgentes (requieren atención inmediata)
 * - Avisos: Informativos (para conocimiento)
 * - Colapsable por defecto
 */
import { memo, useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, TouchableOpacity, Linking, Platform, ActionSheetIOS, Alert as RNAlert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing, BorderRadius } from '@/constants/theme';
import type { Alert } from '@/hooks/use-all-alerts';
import type { Client } from '@/types';

interface DashboardAlertsV2Props {
  alerts: Alert[];
  totalUrgent: number;
  totalWarning: number;
  totalInfo: number;
  clients: Client[];
  isLoading?: boolean;
  pagination?: {
    total: number;
    hasMore: boolean;
  };
}

export const DashboardAlertsV2 = memo(function DashboardAlertsV2({ alerts, totalUrgent, totalWarning, totalInfo, clients, isLoading = false, pagination }: DashboardAlertsV2Props) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [emailClientPreference, setEmailClientPreference] = useState<'gmail' | 'outlook' | 'default'>('gmail');
  
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
  
  // Función para obtener cliente por ID
  const getClient = (clientId: string) => clients.find(c => c.id === clientId);
  
  const error = useThemeColor({}, 'error');
  const warning = useThemeColor({}, 'warning');
  const info = useThemeColor({}, 'tint');
  const success = useThemeColor({}, 'success');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const border = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textColor = useThemeColor({}, 'text');

  // Separar alertas urgentes y avisos informativos
  const urgentAlerts = alerts.filter(a => a.priority === 'urgent');
  const infoAlerts = alerts.filter(a => a.priority === 'warning' || a.priority === 'tint');
  
  const hasAlerts = alerts.length > 0;
  const hasUrgent = urgentAlerts.length > 0;
  
  // Color principal basado en la prioridad más alta
  const primaryColor = hasAlerts ? (hasUrgent ? error : warning) : success;

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

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };
  
  // Función para contactar al cliente
  const handleContactClient = (alert: Alert) => {
    console.log('🔵 handleContactClient called', alert);
    
    if (alert.type !== 'piano' || !alert.data?.clientId) {
      console.log('❌ Not a piano alert or no clientId');
      return;
    }
    
    const client = getClient(alert.data.clientId);
    console.log('👤 Client found:', client);
    if (!client) {
      console.log('❌ Client not found');
      return;
    }
        const clientName = client.firstName + ' ' + (client.lastName1 || '') || `${client.firstName || ''} ${client.lastName1 || ''}`.trim();
    const phone = client.phone;
    const email = client.email;
    
    console.log('📞 Phone:', phone);
    console.log('📧 Email:', email);
    console.log('🖥️ Platform:', Platform.OS);
    
    // Para web, usar window.confirm en lugar de ActionSheet/Alert
    if (Platform.OS === 'web') {
      const options = [];
      if (phone) {
        options.push('WhatsApp');
        options.push('Llamar');
      }
      if (email) options.push('Email');
      
      const optionsText = options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
      const choice = window.prompt(`Contactar a ${clientName}\n\n${optionsText}\n\nEscribe el número de la opción:`);
      
      if (choice) {
        const index = parseInt(choice, 10) - 1;
        if (phone && index === 0) {
          // WhatsApp
          const firstName = client.firstName || client.firstName + ' ' + (client.lastName1 || '')?.split(' ')[0] || 'cliente';
          const message = encodeURIComponent(`Hola ${firstName}, necesitamos programar el mantenimiento de tu piano.`);
          window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${message}`, '_blank');
        } else if (phone && index === 1) {
          // Llamar
          window.open(`tel:${phone}`, '_blank');
        } else if (email && index === (phone ? 2 : 0)) {
          // Email - Usar preferencia guardada
          const subject = encodeURIComponent('Mantenimiento de piano');
          const firstName = client.firstName || client.firstName + ' ' + (client.lastName1 || '')?.split(' ')[0] || 'cliente';
          const body = encodeURIComponent(`Hola ${firstName},\n\nNecesitamos programar el mantenimiento de tu piano.\n\nSaludos`);
          
          if (emailClientPreference === 'gmail') {
            window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`, '_blank');
          } else if (emailClientPreference === 'outlook') {
            window.open(`https://outlook.office.com/mail/deeplink/compose?to=${email}&subject=${subject}&body=${body}`, '_blank');
          } else {
            window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
          }
        }
      }
      return;
    }
    
    if (Platform.OS === 'ios') {
      const options = [];
      if (phone) {
        options.push('WhatsApp');
        options.push('Llamar');
      }
      if (email) options.push('Email');
      options.push('Cancelar');
      
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: `Contactar a ${clientName}`,
          options,
          cancelButtonIndex: options.length - 1,
        },
        (buttonIndex) => {
          if (phone && buttonIndex === 0) {
            // WhatsApp
            const firstName = client.firstName || client.firstName + ' ' + (client.lastName1 || '')?.split(' ')[0] || 'cliente';
          const message = encodeURIComponent(`Hola ${firstName}, necesitamos programar el mantenimiento de tu piano.`);
            Linking.openURL(`whatsapp://send?phone=${phone}&text=${message}`);
          } else if (phone && buttonIndex === 1) {
            // Llamar
            Linking.openURL(`tel:${phone}`);
          } else if (email && buttonIndex === (phone ? 2 : 0)) {
            // Email
            const subject = encodeURIComponent('Mantenimiento de piano');
            const firstName = client.firstName || client.firstName + ' ' + (client.lastName1 || '')?.split(' ')[0] || 'cliente';
          const body = encodeURIComponent(`Hola ${firstName},\n\nNecesitamos programar el mantenimiento de tu piano.\n\nSaludos`);
            Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
          }
        }
      );
    } else {
      // Android - Mostrar opciones con Alert
      const buttons = [];
      if (phone) {
        buttons.push({ text: 'WhatsApp', onPress: () => {
          const firstName = client.firstName || client.firstName + ' ' + (client.lastName1 || '')?.split(' ')[0] || 'cliente';
          const message = encodeURIComponent(`Hola ${firstName}, necesitamos programar el mantenimiento de tu piano.`);
          Linking.openURL(`whatsapp://send?phone=${phone}&text=${message}`);
        }});
        buttons.push({ text: 'Llamar', onPress: () => Linking.openURL(`tel:${phone}`) });
      }
      if (email) {
        buttons.push({ text: 'Email', onPress: () => {
          const subject = encodeURIComponent('Mantenimiento de piano');
          const firstName = client.firstName || client.firstName + ' ' + (client.lastName1 || '')?.split(' ')[0] || 'cliente';
          const body = encodeURIComponent(`Hola ${firstName},\n\nNecesitamos programar el mantenimiento de tu piano.\n\nSaludos`);
          Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
        }});
      }
      buttons.push({ text: 'Cancelar', style: 'cancel' });
      
      RNAlert.alert(`Contactar a ${clientName}`, 'Selecciona una opción:', buttons);
    }
  };

  // Mostrar loading state mientras se cargan los datos
  if (isLoading) {
    return (
      <View style={[styles.alertBanner, { backgroundColor: cardBackground, borderColor: border }]}>
        <IconSymbol 
          name="clock.fill" 
          size={22} 
          color={textColor} 
        />
        <View style={styles.alertContent}>
          <ThemedText style={[styles.alertText, { color: textColor, opacity: 0.6 }]}>
            Cargando alertas...
          </ThemedText>
        </View>
      </View>
    );
  }

  if (!hasAlerts) {
    return (
      <View style={[styles.alertBanner, { backgroundColor: cardBackground, borderColor: border }]}>
        <IconSymbol 
          name="checkmark.circle.fill" 
          size={22} 
          color={success} 
        />
        <View style={styles.alertContent}>
          <ThemedText style={[styles.alertText, { color: success }]}>
            No hay alertas ni avisos
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: cardBackground, borderColor: border }]}>
      {/* Header - Siempre visible */}
      <Pressable 
        style={styles.header}
        onPress={toggleExpanded}
      >
        <IconSymbol 
          name={hasUrgent ? "exclamationmark.triangle.fill" : "info.circle.fill"} 
          size={22} 
          color={primaryColor} 
        />
        <View style={styles.headerContent}>
          <ThemedText style={styles.headerText}>
            {hasUrgent ? 'Alertas y Avisos' : 'Avisos'}
          </ThemedText>
          <ThemedText style={[styles.headerSubtext, { color: textSecondary }]}>
            {urgentAlerts.length > 0 && `${urgentAlerts.length} alerta${urgentAlerts.length !== 1 ? 's' : ''}`}
            {urgentAlerts.length > 0 && infoAlerts.length > 0 && ' • '}
            {infoAlerts.length > 0 && `${infoAlerts.length} aviso${infoAlerts.length !== 1 ? 's' : ''}`}
            {pagination && pagination.hasMore && ` • Mostrando ${alerts.length} de ${pagination.total}`}
          </ThemedText>
        </View>
        {hasUrgent && (
          <View style={[styles.badge, { backgroundColor: error }]}>
            <ThemedText style={styles.badgeText}>{urgentAlerts.length}</ThemedText>
          </View>
        )}
        <IconSymbol 
          name={isExpanded ? "chevron.up" : "chevron.down"} 
          size={20} 
          color={textSecondary} 
        />
      </Pressable>

      {/* Contenido expandible */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Sección de Alertas Urgentes */}
          {urgentAlerts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <IconSymbol 
                  name="exclamationmark.triangle.fill" 
                  size={16} 
                  color={error} 
                />
                <ThemedText style={[styles.sectionTitle, { color: error }]}>
                  Alertas ({urgentAlerts.length})
                </ThemedText>
              </View>
              <View style={styles.alertsList}>
                {urgentAlerts.map((alert) => (
                  <View
                    key={alert.id}
                    style={[styles.alertItem, { borderLeftColor: error }]}
                  >
                    <Pressable
                      style={styles.alertPressableArea}
                      onPress={() => handleAlertPress(alert)}
                    >
                      <View style={[styles.alertIconContainer, { backgroundColor: error + '20' }]}>
                        <IconSymbol 
                          name={getAlertIcon(alert.type)} 
                          size={16} 
                          color={error} 
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
                        onPress={() => handleContactClient(alert)}
                        activeOpacity={0.7}
                      >
                        <IconSymbol name="phone.fill" size={14} color={error} />
                        <ThemedText style={[styles.contactButtonText, { color: error }]}>Contactar</ThemedText>
                      </TouchableOpacity>
                    )}
                    <Pressable onPress={() => handleAlertPress(alert)}>
                      <IconSymbol 
                        name="chevron.right" 
                        size={16} 
                        color={textSecondary} 
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Sección de Avisos Informativos */}
          {infoAlerts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <IconSymbol 
                  name="info.circle.fill" 
                  size={16} 
                  color={warning} 
                />
                <ThemedText style={[styles.sectionTitle, { color: warning }]}>
                  Avisos ({infoAlerts.length})
                </ThemedText>
              </View>
              <View style={styles.alertsList}>
                {infoAlerts.map((alert) => (
                  <View
                    key={alert.id}
                    style={[styles.alertItem, { borderLeftColor: getPriorityColor(alert.priority) }]}
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
                        onPress={() => handleContactClient(alert)}
                        activeOpacity={0.7}
                      >
                        <IconSymbol name="phone.fill" size={14} color={error} />
                        <ThemedText style={[styles.contactButtonText, { color: error }]}>Contactar</ThemedText>
                      </TouchableOpacity>
                    )}
                    <Pressable onPress={() => handleAlertPress(alert)}>
                      <IconSymbol 
                        name="chevron.right" 
                        size={16} 
                        color={textSecondary} 
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Botón Ver Todas */}
          {pagination && pagination.hasMore && (
            <Pressable
              style={[styles.viewAllButton, { borderColor: border }]}
              onPress={() => router.push('/alerts' as any)}
            >
              <ThemedText style={[styles.viewAllText, { color: primaryColor }]}>
                Ver todas las alertas ({pagination.total})
              </ThemedText>
              <IconSymbol 
                name="arrow.right" 
                size={16} 
                color={primaryColor} 
              />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
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
  },
  alertText: {
    fontSize: 13,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#00000010',
  },
  section: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#00000005',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  alertsList: {
    gap: Spacing.xs,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    gap: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#00000005',
    borderLeftWidth: 3,
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
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTextContainer: {
    flex: 1,
    gap: 2,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  alertMessage: {
    fontSize: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: 1,
  },
  contactButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
