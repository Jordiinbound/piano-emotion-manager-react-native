/**
 * Portal del Cliente
 * Página pública donde los clientes pueden ver sus pianos, servicios y citas
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View, Pressable, Linking, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useClientsData, usePianosData, useServicesData, useAppointmentsData } from '@/hooks/data';
import { 
  findClientByToken, 
  SERVICE_TYPE_LABELS, 
  PIANO_CATEGORY_LABELS,
  SERVICE_STATUS_LABELS,
  formatPortalDate,
} from '@/hooks/use-client-portal';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSettings } from '@/hooks/use-settings';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';

type TabType = 'pianos' | 'services' | 'appointments';

export default function ClientPortalScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('pianos');
  const [showRequestForm, setShowRequestForm] = useState(false);

  const { clients, isLoading: loadingClients } = useClientsData();
  const { pianos, isLoading: loadingPianos } = usePianosData();
  const { services, isLoading: loadingServices } = useServicesData();
  const { appointments, isLoading: loadingAppointments } = useAppointmentsData();
  const { settings } = useSettings();

  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accent = useThemeColor({}, 'accent');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');

  const isLoading = loadingClients || loadingPianos || loadingServices || loadingAppointments;

  // Encontrar cliente por token
  const client = useMemo(() => {
    if (!token || !clients.length) return null;
    return findClientByToken(token, clients);
  }, [token, clients]);

  // Datos del cliente
  const clientData = useMemo(() => {
    if (!client) return null;

    const clientPianos = pianos.filter(p => p.clientId === client.id);
    const clientServices = services
      .filter(s => s.clientId === client.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const today = new Date().toISOString().split('T')[0];
    const clientAppointments = appointments
      .filter(a => a.clientId === client.id && a.date >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      pianos: clientPianos.map(piano => {
        const pianoServices = clientServices.filter(s => s.pianoId === piano.id);
        const lastService = pianoServices[0];
        return {
          ...piano,
          lastServiceDate: lastService?.date,
          lastServiceType: lastService?.type,
          servicesCount: pianoServices.length,
        };
      }),
      services: clientServices.slice(0, 20).map(service => {
        const piano = clientPianos.find(p => p.id === service.pianoId);
        return {
          ...service,
          pianoBrand: piano?.brand,
          pianoModel: piano?.model,
        };
      }),
      appointments: clientAppointments.map(apt => {
        const piano = clientPianos.find(p => p.id === apt.pianoId);
        return {
          ...apt,
          pianoBrand: piano?.brand,
          pianoModel: piano?.model,
        };
      }),
    };
  }, [client, pianos, services, appointments]);

  // Nombre del cliente
  const clientName = useMemo(() => {
    if (!client) return '';
    return client.type === 'company'
      ? client.companyName || 'Cliente'
      : `${client.firstName} ${client.lastName}`.trim() || 'Cliente';
  }, [client]);

  // Llamar al técnico
  const handleCallTechnician = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (settings?.phone) {
      Linking.openURL(`tel:${settings.phone}`);
    }
  };

  // Enviar email al técnico
  const handleEmailTechnician = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (settings?.email) {
      Linking.openURL(`mailto:${settings.email}`);
    }
  };

  // Pantalla de carga
  if (isLoading) {
    return (
      <LinearGradient
        colors={['#F8F9FA', '#EEF2F7', '#E8EDF5']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <IconSymbol name="pianokeys" size={48} color={accent} />
          <ThemedText style={styles.loadingText}>Cargando tu portal...</ThemedText>
        </View>
      </LinearGradient>
    );
  }

  // Token inválido
  if (!client) {
    return (
      <LinearGradient
        colors={['#F8F9FA', '#EEF2F7', '#E8EDF5']}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <IconSymbol name="exclamationmark.triangle.fill" size={48} color={warning} />
          <ThemedText type="title" style={styles.errorTitle}>
            Enlace no válido
          </ThemedText>
          <ThemedText style={[styles.errorText, { color: textSecondary }]}>
            Este enlace ha expirado o no es válido. Por favor, solicita un nuevo enlace a tu técnico.
          </ThemedText>
        </View>
      </LinearGradient>
    );
  }

  const tabs: { key: TabType; label: string; icon: string; count: number }[] = [
    { key: 'pianos', label: 'Pianos', icon: 'pianokeys', count: clientData?.pianos.length || 0 },
    { key: 'services', label: 'Historial', icon: 'clock.fill', count: clientData?.services.length || 0 },
    { key: 'appointments', label: 'Citas', icon: 'calendar', count: clientData?.appointments.length || 0 },
  ];

  return (
    <LinearGradient
      colors={['#F8F9FA', '#EEF2F7', '#E8EDF5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: accent }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <IconSymbol name="pianokeys" size={32} color="#FFFFFF" />
          </View>
          <View style={styles.headerText}>
            <ThemedText style={styles.headerTitle}>
              {settings?.businessName || 'Piano Emotion'}
            </ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Portal del Cliente
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Bienvenida */}
      <View style={[styles.welcomeCard, { backgroundColor: cardBg, borderColor }]}>
        <ThemedText type="defaultSemiBold" style={styles.welcomeTitle}>
          ¡Hola, {clientName}!
        </ThemedText>
        <ThemedText style={[styles.welcomeText, { color: textSecondary }]}>
          Aquí puedes ver tus pianos, historial de servicios y próximas citas.
        </ThemedText>
        
        {/* Contacto del técnico */}
        <View style={styles.contactButtons}>
          {settings?.phone && (
            <Pressable
              style={[styles.contactButton, { backgroundColor: `${success}15`, borderColor: success }]}
              onPress={handleCallTechnician}
            >
              <IconSymbol name="phone.fill" size={16} color={success} />
              <ThemedText style={[styles.contactButtonText, { color: success }]}>
                Llamar
              </ThemedText>
            </Pressable>
          )}
          {settings?.email && (
            <Pressable
              style={[styles.contactButton, { backgroundColor: `${accent}15`, borderColor: accent }]}
              onPress={handleEmailTechnician}
            >
              <IconSymbol name="envelope.fill" size={16} color={accent} />
              <ThemedText style={[styles.contactButtonText, { color: accent }]}>
                Email
              </ThemedText>
            </Pressable>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[
              styles.tab,
              { borderColor },
              activeTab === tab.key && { backgroundColor: `${accent}15`, borderColor: accent },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab(tab.key);
            }}
          >
            <IconSymbol
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.key ? accent : textSecondary}
            />
            <ThemedText
              style={[
                styles.tabLabel,
                { color: activeTab === tab.key ? accent : textSecondary },
              ]}
            >
              {tab.label}
            </ThemedText>
            {tab.count > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: activeTab === tab.key ? accent : textSecondary }]}>
                <ThemedText style={styles.tabBadgeText}>{tab.count}</ThemedText>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* Contenido */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Pianos */}
        {activeTab === 'pianos' && (
          <View>
            {clientData?.pianos.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: cardBg, borderColor }]}>
                <IconSymbol name="pianokeys" size={48} color={textSecondary} />
                <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
                  No tienes pianos registrados
                </ThemedText>
              </View>
            ) : (
              clientData?.pianos.map((piano) => (
                <View key={piano.id} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIcon, { backgroundColor: `${accent}15` }]}>
                      <IconSymbol name="pianokeys" size={24} color={accent} />
                    </View>
                    <View style={styles.cardInfo}>
                      <ThemedText type="defaultSemiBold">
                        {piano.brand} {piano.model}
                      </ThemedText>
                      <ThemedText style={[styles.cardSubtitle, { color: textSecondary }]}>
                        {PIANO_CATEGORY_LABELS[piano.category] || piano.category}
                        {piano.year && ` · ${piano.year}`}
                      </ThemedText>
                    </View>
                  </View>
                  
                  <View style={styles.cardDetails}>
                    {piano.serialNumber && (
                      <View style={styles.detailRow}>
                        <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>
                          Nº Serie:
                        </ThemedText>
                        <ThemedText>{piano.serialNumber}</ThemedText>
                      </View>
                    )}
                    {piano.location && (
                      <View style={styles.detailRow}>
                        <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>
                          Ubicación:
                        </ThemedText>
                        <ThemedText>{piano.location}</ThemedText>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>
                        Servicios:
                      </ThemedText>
                      <ThemedText>{piano.servicesCount || 0} realizados</ThemedText>
                    </View>
                    {piano.lastServiceDate && (
                      <View style={styles.detailRow}>
                        <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>
                          Último servicio:
                        </ThemedText>
                        <ThemedText>
                          {SERVICE_TYPE_LABELS[piano.lastServiceType || ''] || piano.lastServiceType}
                          {' · '}
                          {formatPortalDate(piano.lastServiceDate)}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Historial de servicios */}
        {activeTab === 'services' && (
          <View>
            {clientData?.services.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: cardBg, borderColor }]}>
                <IconSymbol name="clock.fill" size={48} color={textSecondary} />
                <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
                  No hay servicios en tu historial
                </ThemedText>
              </View>
            ) : (
              clientData?.services.map((service) => (
                <View key={service.id} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIcon, { backgroundColor: `${success}15` }]}>
                      <IconSymbol name="wrench.fill" size={24} color={success} />
                    </View>
                    <View style={styles.cardInfo}>
                      <ThemedText type="defaultSemiBold">
                        {SERVICE_TYPE_LABELS[service.type] || service.type}
                      </ThemedText>
                      <ThemedText style={[styles.cardSubtitle, { color: textSecondary }]}>
                        {formatPortalDate(service.date)}
                      </ThemedText>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: (service as any).status === 'completed' ? `${success}15` : `${warning}15` }
                    ]}>
                      <ThemedText style={[
                        styles.statusText,
                        { color: (service as any).status === 'completed' ? success : warning }
                      ]}>
                        {SERVICE_STATUS_LABELS[(service as any).status] || (service as any).status}
                      </ThemedText>
                    </View>
                  </View>
                  
                  {(service.pianoBrand || service.notes) && (
                    <View style={styles.cardDetails}>
                      {service.pianoBrand && (
                        <View style={styles.detailRow}>
                          <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>
                            Piano:
                          </ThemedText>
                          <ThemedText>{service.pianoBrand} {service.pianoModel}</ThemedText>
                        </View>
                      )}
                      {service.notes && (
                        <View style={styles.detailRow}>
                          <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>
                            Notas:
                          </ThemedText>
                          <ThemedText numberOfLines={2}>{service.notes}</ThemedText>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* Citas */}
        {activeTab === 'appointments' && (
          <View>
            {clientData?.appointments.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: cardBg, borderColor }]}>
                <IconSymbol name="calendar" size={48} color={textSecondary} />
                <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
                  No tienes citas programadas
                </ThemedText>
                <ThemedText style={[styles.emptySubtext, { color: textSecondary }]}>
                  Contacta con tu técnico para programar una cita
                </ThemedText>
              </View>
            ) : (
              clientData?.appointments.map((apt) => (
                <View key={apt.id} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIcon, { backgroundColor: `${accent}15` }]}>
                      <IconSymbol name="calendar" size={24} color={accent} />
                    </View>
                    <View style={styles.cardInfo}>
                      <ThemedText type="defaultSemiBold">
                        {SERVICE_TYPE_LABELS[apt.type] || apt.type}
                      </ThemedText>
                      <ThemedText style={[styles.cardSubtitle, { color: textSecondary }]}>
                        {formatPortalDate(apt.date)}
                        {apt.time && ` · ${apt.time}`}
                      </ThemedText>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: apt.status === 'confirmed' ? `${success}15` : `${warning}15` }
                    ]}>
                      <ThemedText style={[
                        styles.statusText,
                        { color: apt.status === 'confirmed' ? success : warning }
                      ]}>
                        {apt.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                      </ThemedText>
                    </View>
                  </View>
                  
                  {(apt.pianoBrand || apt.notes) && (
                    <View style={styles.cardDetails}>
                      {apt.pianoBrand && (
                        <View style={styles.detailRow}>
                          <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>
                            Piano:
                          </ThemedText>
                          <ThemedText>{apt.pianoBrand} {apt.pianoModel}</ThemedText>
                        </View>
                      )}
                      {apt.notes && (
                        <View style={styles.detailRow}>
                          <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>
                            Notas:
                          </ThemedText>
                          <ThemedText numberOfLines={2}>{apt.notes}</ThemedText>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText style={[styles.footerText, { color: textSecondary }]}>
            {settings?.businessName || 'Piano Emotion Manager'}
          </ThemedText>
          <ThemedText style={[styles.footerSubtext, { color: textSecondary }]}>
            Portal del Cliente
          </ThemedText>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  errorTitle: {
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    lineHeight: 22,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  welcomeCard: {
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  welcomeTitle: {
    fontSize: 18,
    marginBottom: Spacing.xs,
  },
  welcomeText: {
    fontSize: 14,
    lineHeight: 20,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardDetails: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  detailLabel: {
    fontSize: 13,
    minWidth: 80,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: 4,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: 12,
  },
});
