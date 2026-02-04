import React, { useState, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  useColorScheme,
  useWindowDimensions,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../components/themed-text';
import { ThemedView } from '../components/themed-view';
import { Colors } from '../constants/theme';
import { trpc } from '../lib/trpc';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TabType = 'revenue' | 'churn' | 'maintenance' | 'workload' | 'inventory';

// Paleta de colores suaves para cada pestaña (tonalidad matizada)
const TAB_COLORS = {
  revenue: '#2d6b4a',      // Verde más oscuro
  churn: '#6a4d8f',        // Púrpura más oscuro
  maintenance: '#3a5590',  // Azul más oscuro
  workload: '#a56d2a',     // Naranja/dorado más oscuro
  inventory: '#3a6d7f',    // Cian más oscuro
};

// MOCK_DATA eliminado - solo usamos datos reales de la BD

export default function PredictionsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 768;
  
  const colors = {
    ...themeColors,
    primary: themeColors.tint,
    card: themeColors.cardBackground,
  };
  
  const textPrimary = themeColors.text;
  const textSecondary = themeColors.textSecondary || themeColors.text + '99';
  const cardBg = themeColors.cardBackground;
  const border = themeColors.border || themeColors.text + '20';

  const [activeTab, setActiveTab] = useState<TabType>('revenue');
  const [refreshing, setRefreshing] = useState(false);
  const contentScrollRef = useRef<ScrollView>(null);
  
  // Estados para modal de contacto
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState<{
    name: string;
    email?: string;
    phone?: string;
    context: 'churn' | 'maintenance';
    details?: string;
  } | null>(null);

  const revenueQuery = trpc.advanced.predictions.getRevenue.useQuery(
    { months: 12 },
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );
  
  const churnQuery = trpc.advanced.predictions.getChurnRisk.useQuery(
    undefined,
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );
  
  const maintenanceQuery = trpc.advanced.predictions.getMaintenance.useQuery(
    undefined,
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );
  
  const workloadQuery = trpc.advanced.predictions.getWorkload.useQuery(
    { weeks: 12 },
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );
  
  const inventoryQuery = trpc.advanced.predictions.getInventoryDemand.useQuery(
    undefined,
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );

  // Debug logs
  console.log('[Predictions] Revenue data length:', revenueQuery.data?.length);
  console.log('[Predictions] Churn data length:', churnQuery.data?.length);
  console.log('[Predictions] Maintenance data length:', maintenanceQuery.data?.length);
  console.log('[Predictions] Workload data length:', workloadQuery.data?.length);
  console.log('[Predictions] Inventory data length:', inventoryQuery.data?.length);

  const data = {
    revenue: revenueQuery.data && revenueQuery.data.length > 0 
      ? revenueQuery.data.slice(0, 12).map(r => ({
          period: r.period,
          value: r.value,
          confidence: r.confidence,
          trend: r.trend,
          factors: r.factors,
        }))
      : [],
    churn: churnQuery.data && churnQuery.data.length > 0
      ? churnQuery.data.slice(0, 12).map((c: any) => ({
          clientName: c.clientName,
          clientEmail: c.clientEmail,
          clientPhone: c.clientPhone,
          riskScore: c.riskScore,
          daysSince: c.daysSinceLastService,
          suggestedAction: c.suggestedAction,
        }))
      : [],
    maintenance: maintenanceQuery.data && maintenanceQuery.data.length > 0
      ? maintenanceQuery.data.slice(0, 12).map((m: any) => ({
          pianoInfo: m.pianoInfo,
          clientName: m.clientName,
          clientEmail: m.clientEmail,
          clientPhone: m.clientPhone,
          predictedDate: new Date(m.predictedDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
          serviceType: m.serviceType,
          confidence: m.confidence,
          basedOn: m.basedOn,
        }))
      : [],
    workload: workloadQuery.data && workloadQuery.data.length > 0
      ? workloadQuery.data.slice(0, 12).map((w: any) => ({
          week: w.week,
          scheduled: w.scheduledAppointments,
          estimated: w.estimatedTotal,
          recommendation: w.recommendation,
        }))
      : [],
    inventory: inventoryQuery.data && inventoryQuery.data.length > 0
      ? inventoryQuery.data.slice(0, 12).map((i: any) => ({
          itemName: i.itemName,
          currentStock: i.currentStock,
          monthlyUsage: i.monthlyUsage,
          monthsUntilMin: i.monthsUntilMin,
          urgency: i.urgency,
        }))
      : [],
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      revenueQuery.refetch(),
      churnQuery.refetch(),
      maintenanceQuery.refetch(),
      workloadQuery.refetch(),
      inventoryQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  const tabs = [
    { id: 'revenue', label: 'Ingresos', icon: 'cash-outline' },
    { id: 'churn', label: 'Clientes', icon: 'people-outline' },
    { id: 'maintenance', label: 'Servicios', icon: 'construct-outline' },
    { id: 'workload', label: 'Carga', icon: 'calendar-outline' },
    { id: 'inventory', label: 'Inventario', icon: 'cube-outline' },
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return { name: 'trending-up', color: '#22C55E' };
      case 'down': return { name: 'trending-down', color: '#EF4444' };
      default: return { name: 'remove', color: '#F59E0B' };
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      default: return '#22C55E';
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return '#EF4444';
    if (score >= 50) return '#F59E0B';
    return '#22C55E';
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'revenue': return renderRevenueTab();
      case 'churn': return renderChurnTab();
      case 'maintenance': return renderMaintenanceTab();
      case 'workload': return renderWorkloadTab();
      case 'inventory': return renderInventoryTab();
      default: return null;
    }
  };

  const renderRevenueTab = () => (
    <View style={styles.tabContent}>
      <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={styles.summaryHeader}>
          <Ionicons name="analytics" size={24} color={colors.primary} />
          <ThemedText style={[styles.summaryTitle, { color: textPrimary }]}>
            Predicción de Ingresos
          </ThemedText>
        </View>
        <ThemedText style={[styles.summaryDescription, { color: textSecondary }]}>
          Basado en tu historial de los últimos 12 meses
        </ThemedText>
      </View>

      {data.revenue.map((prediction, index) => {
        const trend = getTrendIcon(prediction.trend);
        return (
          <View key={index} style={[styles.predictionCard, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.predictionHeader}>
              <ThemedText style={[styles.predictionPeriod, { color: textPrimary }]}>
                {prediction.period}
              </ThemedText>
            </View>

            <View style={styles.predictionValue}>
              <ThemedText style={[styles.valueText, { color: textPrimary }]}>
                {prediction.value.toLocaleString('es-ES')} €
              </ThemedText>
              <Ionicons name={trend.name as any} size={24} color={trend.color} />
            </View>

            <View style={styles.factorsList}>
              {prediction.factors.map((factor, i) => (
                <View key={i} style={[styles.factorChip, { backgroundColor: `${colors.primary}10` }]}>
                  <ThemedText style={{ color: colors.primary, fontSize: 12 }}>
                    {factor}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );

  const renderChurnTab = () => (
    <View style={styles.tabContent}>
      <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={styles.summaryHeader}>
          <Ionicons name="warning" size={24} color="#F59E0B" />
          <ThemedText style={[styles.summaryTitle, { color: textPrimary }]}>
            Clientes en Riesgo
          </ThemedText>
        </View>
        <ThemedText style={[styles.summaryDescription, { color: textSecondary }]}>
          Clientes que podrían necesitar atención
        </ThemedText>
      </View>

      {data.churn.map((client, index) => (
        <View key={index} style={[styles.churnCard, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={styles.churnHeader}>
            <View style={styles.churnInfo}>
              <ThemedText style={[styles.clientName, { color: textPrimary }]}>{client.clientName}</ThemedText>
              <ThemedText style={[styles.daysSince, { color: textSecondary }]}>
                Último servicio hace {client.daysSince} días
              </ThemedText>
            </View>
            <View style={[styles.riskBadge, { backgroundColor: `${getRiskColor(client.riskScore)}20` }]}>
              <ThemedText style={{ color: getRiskColor(client.riskScore), fontWeight: '700' }}>
                {client.riskScore}% riesgo
              </ThemedText>
            </View>
          </View>
          <View style={[styles.riskBar, { backgroundColor: `${getRiskColor(client.riskScore)}10` }]}>
            <View style={[styles.riskBarFill, { width: `${client.riskScore}%`, backgroundColor: getRiskColor(client.riskScore) }]} />
          </View>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              setSelectedContact({
                name: client.clientName,
                email: client.clientEmail,
                phone: client.clientPhone,
                context: 'churn',
                details: `Cliente en riesgo (${client.riskScore}% riesgo). Último servicio hace ${client.daysSince} días.`,
              });
              setContactModalVisible(true);
            }}
          >
            <Ionicons name="mail-outline" size={18} color="#fff" />
            <ThemedText style={styles.actionButtonText}>{client.suggestedAction}</ThemedText>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderMaintenanceTab = () => (
    <View style={styles.tabContent}>
      <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={styles.summaryHeader}>
          <Ionicons name="construct" size={24} color={colors.primary} />
          <ThemedText style={[styles.summaryTitle, { color: textPrimary }]}>
            Servicios Previstos
          </ThemedText>
        </View>
        <ThemedText style={[styles.summaryDescription, { color: textSecondary }]}>
          Próximos servicios recomendados
        </ThemedText>
      </View>

      {data.maintenance.map((item, index) => (
        <View key={index} style={[styles.maintenanceCard, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={styles.maintenanceHeader}>
            <View style={[styles.maintenanceIcon, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name="musical-notes" size={20} color={colors.primary} />
            </View>
            <View style={styles.maintenanceInfo}>
              <ThemedText style={[styles.pianoInfo, { color: textPrimary }]}>{item.pianoInfo}</ThemedText>
              <ThemedText style={[styles.clientNameSmall, { color: textSecondary }]}>{item.clientName}</ThemedText>
            </View>
          </View>
          <View style={styles.maintenanceDetails}>
            <View style={styles.maintenanceDetail}>
              <Ionicons name="calendar-outline" size={16} color={textSecondary} />
              <ThemedText style={{ marginLeft: 4, color: textSecondary, fontSize: 13 }}>{item.predictedDate}</ThemedText>
            </View>
            <View style={styles.maintenanceDetail}>
              <Ionicons name="settings-outline" size={16} color={textSecondary} />
              <ThemedText style={{ marginLeft: 4, color: textSecondary, fontSize: 13 }}>{item.serviceType}</ThemedText>
            </View>

          </View>
          <TouchableOpacity 
            style={[styles.scheduleButton, { borderColor: colors.primary }]}
            onPress={() => {
              setSelectedContact({
                name: item.clientName,
                email: item.clientEmail,
                phone: item.clientPhone,
                context: 'maintenance',
                details: `${item.serviceType} recomendado para ${item.pianoInfo}. ${item.basedOn}`,
              });
              setContactModalVisible(true);
            }}
          >
            <ThemedText style={{ color: colors.primary, fontWeight: '600' }}>Programar Cita</ThemedText>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderWorkloadTab = () => (
    <View style={styles.tabContent}>
      <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={styles.summaryHeader}>
          <Ionicons name="calendar" size={24} color={colors.primary} />
          <ThemedText style={[styles.summaryTitle, { color: textPrimary }]}>
            Carga de Trabajo
          </ThemedText>
        </View>
        <ThemedText style={[styles.summaryDescription, { color: textSecondary }]}>
          Estimación de demanda para las próximas semanas
        </ThemedText>
      </View>

      {data.workload.filter(week => week && typeof week.scheduled === 'number' && typeof week.estimated === 'number').map((week, index) => {
        const percentage = (week.scheduled / week.estimated) * 100;
        return (
          <View key={index} style={[styles.workloadCard, { backgroundColor: cardBg, borderColor: border }]}>
            <ThemedText style={[styles.weekTitle, { color: textPrimary }]}>{week.week}</ThemedText>
            <View style={styles.workloadStats}>
              <View style={styles.workloadStat}>
                <ThemedText style={[styles.statValue, { color: textPrimary }]}>{week.scheduled}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: textSecondary }]}>Citas Agendadas</ThemedText>
              </View>
              <View style={styles.workloadStat}>
                <ThemedText style={[styles.statValue, { color: colors.primary }]}>{week.estimated}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: textSecondary }]}>Citas Estimadas</ThemedText>
              </View>
            </View>
            <View style={[styles.workloadBar, { backgroundColor: `${colors.primary}10` }]}>
              <View style={[styles.workloadBarFill, { width: `${percentage}%`, backgroundColor: colors.primary }]} />
            </View>
            <ThemedText style={[styles.recommendation, { color: textSecondary }]}>
              💡 {week.recommendation}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );

  const renderInventoryTab = () => (
    <View style={styles.tabContent}>
      <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={styles.summaryHeader}>
          <Ionicons name="cube" size={24} color={colors.primary} />
          <ThemedText style={[styles.summaryTitle, { color: textPrimary }]}>
            Demanda de Inventario
          </ThemedText>
        </View>
        <ThemedText style={[styles.summaryDescription, { color: textSecondary }]}>
          Predicción de agotamiento de stock
        </ThemedText>
      </View>

      {data.inventory.map((item, index) => (
        <View key={index} style={[styles.inventoryCard, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={styles.inventoryHeader}>
            <ThemedText style={[styles.itemName, { color: textPrimary }]}>{item.itemName}</ThemedText>
            <View style={[styles.urgencyBadge, { backgroundColor: `${getUrgencyColor(item.urgency)}20` }]}>
              <Ionicons name="time-outline" size={14} color={getUrgencyColor(item.urgency)} />
              <ThemedText style={{ color: getUrgencyColor(item.urgency), fontSize: 12, fontWeight: '700', marginLeft: 4 }}>
                {item.monthsUntilMin < 1 ? 'Crítico' : 'Próximo'}
              </ThemedText>
            </View>
          </View>
          <View style={styles.inventoryStats}>
            <View style={styles.inventoryStat}>
              <ThemedText style={[styles.inventoryValue, { color: textPrimary }]}>{item.currentStock}</ThemedText>
              <ThemedText style={[styles.inventoryLabel, { color: textSecondary }]}>Stock Actual</ThemedText>
            </View>
            <View style={styles.inventoryStat}>
              <ThemedText style={[styles.inventoryValue, { color: textPrimary }]}>{item.monthlyUsage}</ThemedText>
              <ThemedText style={[styles.inventoryLabel, { color: textSecondary }]}>Uso Mensual</ThemedText>
            </View>
            <View style={styles.inventoryStat}>
              <ThemedText style={[styles.inventoryValue, { color: getUrgencyColor(item.urgency) }]}>{item.monthsUntilMin}</ThemedText>
              <ThemedText style={[styles.inventoryLabel, { color: textSecondary }]}>Meses Restantes</ThemedText>
            </View>
          </View>
          <TouchableOpacity style={[styles.orderButton, { backgroundColor: colors.primary }]}>
            <Ionicons name="cart-outline" size={18} color="#fff" />
            <ThemedText style={styles.orderButtonText}>Pedir Repuestos</ThemedText>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <ThemedText style={[styles.title, { color: textPrimary }]}>Previsiones</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={[styles.tabsContainer, { borderBottomColor: border }]}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabButton,
              isMobile && { maxWidth: 90 },  // maxWidth solo en móvil
              activeTab === tab.id && { borderBottomColor: TAB_COLORS[tab.id as TabType], borderBottomWidth: 2 }
            ]}
            onPress={() => setActiveTab(tab.id as TabType)}
          >
            <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <Ionicons 
                name={tab.icon as any} 
                size={24} 
                color={TAB_COLORS[tab.id as TabType]} 
              />
              <ThemedText 
                style={[
                  styles.tabLabel, 
                  { 
                    color: TAB_COLORS[tab.id as TabType],
                    opacity: activeTab === tab.id ? 1 : 0.8,  // Aumentado de 0.6 a 0.8
                    fontSize: isMobile ? 9 : 16,  // Reducido a 9 para evitar corte de palabras
                  }
                ]}
              >
                {tab.label}
              </ThemedText>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        ref={contentScrollRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} color={colors.primary} />
        }
      >
        {renderTabContent()}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de contacto */}
      <Modal
        visible={contactModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setContactModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: textPrimary }]}>
                Contactar con {selectedContact?.name}
              </ThemedText>
              <TouchableOpacity onPress={() => setContactModalVisible(false)}>
                <Ionicons name="close" size={24} color={textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedContact?.details && (
              <ThemedText style={[styles.modalDetails, { color: textSecondary }]}>
                {selectedContact.details}
              </ThemedText>
            )}

            <View style={styles.contactOptions}>
              {selectedContact?.email && (
                <TouchableOpacity
                  style={[styles.contactOption, { backgroundColor: `${colors.primary}15` }]}
                  onPress={() => {
                    Linking.openURL(`mailto:${selectedContact.email}`);
                    setContactModalVisible(false);
                  }}
                >
                  <Ionicons name="mail-outline" size={24} color={colors.primary} />
                  <ThemedText style={[styles.contactOptionText, { color: colors.primary }]}>
                    Enviar Email
                  </ThemedText>
                </TouchableOpacity>
              )}

              {selectedContact?.phone && (
                <>
                  <TouchableOpacity
                    style={[styles.contactOption, { backgroundColor: `${colors.primary}15` }]}
                    onPress={() => {
                      Linking.openURL(`https://wa.me/${selectedContact.phone.replace(/\D/g, '')}`);
                      setContactModalVisible(false);
                    }}
                  >
                    <Ionicons name="logo-whatsapp" size={24} color={colors.primary} />
                    <ThemedText style={[styles.contactOptionText, { color: colors.primary }]}>
                      WhatsApp
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.contactOption, { backgroundColor: `${colors.primary}15` }]}
                    onPress={() => {
                      Linking.openURL(`tel:${selectedContact.phone}`);
                      setContactModalVisible(false);
                    }}
                  >
                    <Ionicons name="call-outline" size={24} color={colors.primary} />
                    <ThemedText style={[styles.contactOptionText, { color: colors.primary }]}>
                      Llamar
                    </ThemedText>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={[styles.contactOption, { backgroundColor: `${colors.primary}15` }]}
                onPress={() => {
                  setContactModalVisible(false);
                  router.push('/agenda');
                }}
              >
                <Ionicons name="calendar-outline" size={24} color={colors.primary} />
                <ThemedText style={[styles.contactOptionText, { color: colors.primary }]}>
                  Agendar Cita
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 56,  // Aumentado significativamente para más espacio superior
    borderBottomWidth: 1,
  },
  backButton: {
    position: 'absolute',
    left: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  tabsContainer: {
    maxHeight: 120,
    borderBottomWidth: 1,
    paddingTop: 20,  // Añadido para más espacio entre título y pestañas
  },
  tabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',  // Distribuir uniformemente
    paddingHorizontal: 8,  // Reducido para más espacio
    paddingBottom: 15,
    width: '100%',
  },
  tabButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 6,
    flex: 1,  // Cada pestaña ocupa espacio igual
    textAlign: 'center',
  },
  tabLabel: {
    marginTop: 8,
    fontSize: 16,  // Original (se sobrescribe en móvil con inline style)
    fontWeight: '600',  // Mantenido para mejor legibilidad
    textAlign: 'center',
    width: '100%',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  tabContent: {
    flex: 1,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  summaryDescription: {
    fontSize: 14,
  },
  predictionCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  predictionPeriod: {
    fontSize: 14,
    fontWeight: '600',
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  predictionValue: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  valueText: {
    fontSize: 22,
    fontWeight: '700',
    marginRight: 6,
  },
  factorsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  factorChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  churnCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  churnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  churnInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  daysSince: {
    fontSize: 13,
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  riskBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 12,
  },
  riskBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  maintenanceCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  maintenanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  maintenanceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  maintenanceInfo: {
    flex: 1,
  },
  pianoInfo: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 1,
  },
  clientNameSmall: {
    fontSize: 13,
  },
  maintenanceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  maintenanceDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  scheduleButton: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  workloadCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  weekTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  workloadStats: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  workloadStat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  workloadBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  workloadBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  recommendation: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  inventoryCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inventoryStats: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  inventoryStat: {
    flex: 1,
    alignItems: 'center',
  },
  inventoryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  inventoryLabel: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  orderButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Estilos del modal de contacto
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  modalDetails: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  contactOptions: {
    gap: 12,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  contactOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
