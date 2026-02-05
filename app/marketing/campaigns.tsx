import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

// Tipos de filtros para seleccionar destinatarios
const filterOptions = [
  { id: 'maintenance_due', name: 'Necesitan mantenimiento', description: 'Clientes sin servicio en los últimos 6 meses', icon: 'construct-outline' },
  { id: 'inactive', name: 'Clientes inactivos', description: 'Sin actividad en más de 12 meses', icon: 'time-outline' },
  { id: 'recent_service', name: 'Servicio reciente', description: 'Servicio en los últimos 30 días (seguimiento)', icon: 'checkmark-done-outline' },
  { id: 'all_clients', name: 'Todos los clientes', description: 'Enviar a toda la base de datos', icon: 'people-outline' },
  { id: 'custom', name: 'Filtro personalizado', description: 'Definir criterios específicos', icon: 'options-outline' },
];

// Tipos de plantillas para campañas
const campaignTemplates = [
  { id: 'maintenance_reminder', name: 'Recordatorio de Mantenimiento', icon: 'construct-outline' },
  { id: 'reactivation', name: 'Reactivación de Clientes', icon: 'refresh-outline' },
  { id: 'follow_up', name: 'Seguimiento Post-Servicio', icon: 'chatbubble-outline' },
  { id: 'promotion', name: 'Promoción/Oferta', icon: 'pricetag-outline' },
  { id: 'custom', name: 'Mensaje Personalizado', icon: 'create-outline' },
];

// Canales de comunicación
const channelOptions = [
  { id: 'whatsapp', name: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366', description: 'Enviar mensajes por WhatsApp personal' },
  { id: 'email', name: 'Email', icon: 'mail-outline', color: '#EA4335', description: 'Enviar emails desde tu correo personal' },
  { id: 'sms', name: 'SMS', icon: 'chatbubble-outline', color: '#3B82F6', description: 'Enviar SMS desde tu móvil personal' },
  { id: 'both', name: 'Todos', icon: 'layers-outline', color: '#6366F1', description: 'Enviar por WhatsApp, Email y SMS' },
];

interface Campaign {
  id: number;
  name: string;
  status: 'draft' | 'in_progress' | 'completed' | 'paused';
  templateType: string;
  channel: 'whatsapp' | 'email' | 'sms' | 'both';
  totalRecipients: number;
  sentCount: number;
  createdAt: string;
}

export default function CampaignsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form state for new campaign
  const [campaignName, setCampaignName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'email' | 'sms' | 'both'>('whatsapp');
  const [step, setStep] = useState(1); // 1: Name+Channel, 2: Template, 3: Filter
  
  useEffect(() => {
    loadCampaigns();
  }, []);
  
  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      // TODO: Llamar a la API real
      // Datos de ejemplo
      setCampaigns([
        {
          id: 1,
          name: 'Recordatorio Mantenimiento Enero',
          status: 'completed',
          templateType: 'maintenance_reminder',
          channel: 'whatsapp',
          totalRecipients: 45,
          sentCount: 45,
          createdAt: '2025-01-15',
        },
        {
          id: 2,
          name: 'Reactivación Clientes Inactivos',
          status: 'in_progress',
          templateType: 'reactivation',
          channel: 'email',
          totalRecipients: 23,
          sentCount: 12,
          createdAt: '2025-01-20',
        },
      ]);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const createCampaign = async () => {
    if (!campaignName.trim() || !selectedTemplate || !selectedFilter) {
      Alert.alert('Error', 'Por favor complete todos los campos');
      return;
    }
    
    try {
      // TODO: Llamar a la API real para crear la campaña
      Alert.alert(
        'Campaña Creada',
        '¿Desea iniciar el envío ahora?',
        [
          { text: 'Más tarde', style: 'cancel', onPress: () => {
            setIsCreateModalVisible(false);
            resetForm();
            loadCampaigns();
          }},
          { text: 'Iniciar Envío', onPress: () => {
            setIsCreateModalVisible(false);
            resetForm();
            // Navegar a la pantalla de envío por lotes
            router.push('/marketing/send?campaignId=new');
          }},
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear la campaña');
    }
  };
  
  const resetForm = () => {
    setCampaignName('');
    setSelectedTemplate(null);
    setSelectedFilter(null);
    setSelectedChannel('whatsapp');
    setStep(1);
  };
  
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return 'logo-whatsapp';
      case 'email': return 'mail-outline';
      case 'sms': return 'chatbubble-outline';
      case 'both': return 'layers-outline';
      default: return 'chatbubble-outline';
    }
  };
  
  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return '#25D366';
      case 'email': return '#EA4335';
      case 'sms': return '#3B82F6';
      case 'both': return '#6366F1';
      default: return colors.textSecondary;
    }
  };
  
  const openCampaign = (campaign: Campaign) => {
    if (campaign.status === 'in_progress' || campaign.status === 'draft') {
      router.push(`/marketing/send?campaignId=${campaign.id}`);
    } else {
      // Ver detalles de campaña completada
      Alert.alert('Campaña Completada', `Enviados: ${campaign.sentCount}/${campaign.totalRecipients}`);
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'in_progress': return '#2196F3';
      case 'paused': return '#FF9800';
      default: return colors.textSecondary;
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completada';
      case 'in_progress': return 'En progreso';
      case 'paused': return 'Pausada';
      case 'draft': return 'Borrador';
      default: return status;
    }
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    createButton: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 4,
    },
    createButtonText: {
      color: '#fff',
      fontWeight: '600',
      marginLeft: 6,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    campaignCard: {
      backgroundColor: colors.card,
      borderRadius: 4,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    campaignHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    campaignName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 4,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#fff',
    },
    campaignStats: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 20,
    },
    statText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 6,
    },
    progressBar: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 4,
      marginTop: 12,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 4,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    modalBody: {
      padding: 16,
    },
    stepIndicator: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 24,
    },
    stepDot: {
      width: 10,
      height: 10,
      borderRadius: 4,
      backgroundColor: colors.border,
      marginHorizontal: 4,
    },
    stepDotActive: {
      backgroundColor: colors.primary,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: 4,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 4,
      padding: 16,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: colors.border,
    },
    optionCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    optionIcon: {
      width: 44,
      height: 44,
      borderRadius: 4,
      backgroundColor: colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    optionInfo: {
      flex: 1,
    },
    optionName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    optionDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    secondaryButton: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 4,
      padding: 16,
      alignItems: 'center',
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    primaryButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 4,
      padding: 16,
      alignItems: 'center',
      marginLeft: 8,
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    quickActions: {
      marginBottom: 24,
    },
    quickActionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary + '10',
      borderRadius: 4,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.primary + '30',
    },
    quickActionIcon: {
      width: 48,
      height: 48,
      borderRadius: 4,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    quickActionInfo: {
      flex: 1,
    },
    quickActionName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    quickActionDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });
  
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.inputLabel}>Nombre de la campaña</Text>
            <TextInput
              style={styles.input}
              value={campaignName}
              onChangeText={setCampaignName}
              placeholder="Ej: Recordatorio Mantenimiento Febrero"
              placeholderTextColor={colors.textSecondary}
            />
            
            <Text style={styles.inputLabel}>Canal de envío</Text>
            {channelOptions.map((channel) => (
              <TouchableOpacity
                key={channel.id}
                style={[
                  styles.optionCard,
                  selectedChannel === channel.id && {
                    borderColor: channel.color,
                    backgroundColor: channel.color + '10',
                  }
                ]}
                onPress={() => setSelectedChannel(channel.id as 'whatsapp' | 'email' | 'sms' | 'both')}
              >
                <View style={[styles.optionIcon, { backgroundColor: channel.color + '20' }]}>
                  <Ionicons name={channel.icon as any} size={24} color={channel.color} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionName}>{channel.name}</Text>
                  <Text style={styles.optionDescription}>{channel.description}</Text>
                </View>
                {selectedChannel === channel.id && (
                  <Ionicons name="checkmark-circle" size={24} color={channel.color} />
                )}
              </TouchableOpacity>
            ))}
          </>
        );
      
      case 2:
        return (
          <>
            <Text style={styles.inputLabel}>Tipo de mensaje</Text>
            {campaignTemplates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.optionCard,
                  selectedTemplate === template.id && styles.optionCardSelected
                ]}
                onPress={() => setSelectedTemplate(template.id)}
              >
                <View style={styles.optionIcon}>
                  <Ionicons name={template.icon as any} size={24} color={colors.primary} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionName}>{template.name}</Text>
                </View>
                {selectedTemplate === template.id && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </>
        );
      
      case 3:
        return (
          <>
            <Text style={styles.inputLabel}>Seleccionar destinatarios</Text>
            {filterOptions.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.optionCard,
                  selectedFilter === filter.id && styles.optionCardSelected
                ]}
                onPress={() => setSelectedFilter(filter.id)}
              >
                <View style={styles.optionIcon}>
                  <Ionicons name={filter.icon as any} size={24} color={colors.primary} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionName}>{filter.name}</Text>
                  <Text style={styles.optionDescription}>{filter.description}</Text>
                </View>
                {selectedFilter === filter.id && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Campañas</Text>
        </View>
        <TouchableOpacity style={styles.createButton} onPress={() => setIsCreateModalVisible(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createButtonText}>Nueva</Text>
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      <ScrollView style={styles.content}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          
          <TouchableOpacity 
            style={styles.quickActionCard}
            onPress={() => router.push('/marketing/send?type=maintenance')}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="construct" size={24} color="#fff" />
            </View>
            <View style={styles.quickActionInfo}>
              <Text style={styles.quickActionName}>Recordatorios de Mantenimiento</Text>
              <Text style={styles.quickActionDescription}>
                Enviar a clientes que necesitan servicio
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionCard}
            onPress={() => router.push('/marketing/send?type=reactivation')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FF9800' }]}>
              <Ionicons name="refresh" size={24} color="#fff" />
            </View>
            <View style={styles.quickActionInfo}>
              <Text style={styles.quickActionName}>Reactivar Clientes Inactivos</Text>
              <Text style={styles.quickActionDescription}>
                Contactar clientes sin actividad reciente
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        
        {/* Campaign List */}
        <Text style={styles.sectionTitle}>Historial de Campañas</Text>
        
        {campaigns.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={64} color={colors.textSecondary} style={styles.emptyIcon} />
            <Text style={styles.emptyText}>
              No hay campañas todavía.{'\n'}Crea tu primera campaña de marketing.
            </Text>
          </View>
        ) : (
          campaigns.map((campaign) => (
            <TouchableOpacity
              key={campaign.id}
              style={styles.campaignCard}
              onPress={() => openCampaign(campaign)}
            >
              <View style={styles.campaignHeader}>
                <Text style={styles.campaignName}>{campaign.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(campaign.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(campaign.status)}</Text>
                </View>
              </View>
              
              <View style={styles.campaignStats}>
                <View style={styles.statItem}>
                  <Ionicons name={getChannelIcon(campaign.channel) as any} size={18} color={getChannelColor(campaign.channel)} />
                  <Text style={[styles.statText, { color: getChannelColor(campaign.channel) }]}>
                    {campaign.channel === 'both' ? 'WhatsApp + Email' : campaign.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="people-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.statText}>{campaign.totalRecipients} destinatarios</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="checkmark-done-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.statText}>{campaign.sentCount} enviados</Text>
                </View>
              </View>
              
              {campaign.status === 'in_progress' && (
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${(campaign.sentCount / campaign.totalRecipients) * 100}%` }
                    ]} 
                  />
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      
      {/* Create Campaign Modal */}
      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsCreateModalVisible(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva Campaña</Text>
              <TouchableOpacity onPress={() => {
                setIsCreateModalVisible(false);
                resetForm();
              }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {/* Step indicator */}
              <View style={styles.stepIndicator}>
                {[1, 2, 3].map((s) => (
                  <View 
                    key={s} 
                    style={[styles.stepDot, step >= s && styles.stepDotActive]} 
                  />
                ))}
              </View>
              
              {renderStep()}
              
              {/* Navigation buttons */}
              <View style={styles.buttonRow}>
                {step > 1 ? (
                  <TouchableOpacity 
                    style={styles.secondaryButton}
                    onPress={() => setStep(step - 1)}
                  >
                    <Text style={styles.secondaryButtonText}>Anterior</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ flex: 1, marginRight: 8 }} />
                )}
                
                {step < 3 ? (
                  <TouchableOpacity 
                    style={styles.primaryButton}
                    onPress={() => {
                      if (step === 1 && !campaignName.trim()) {
                        Alert.alert('Error', 'Introduce un nombre para la campaña');
                        return;
                      }
                      if (step === 2 && !selectedTemplate) {
                        Alert.alert('Error', 'Selecciona un tipo de mensaje');
                        return;
                      }
                      setStep(step + 1);
                    }}
                  >
                    <Text style={styles.primaryButtonText}>Siguiente</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={styles.primaryButton}
                    onPress={createCampaign}
                  >
                    <Text style={styles.primaryButtonText}>Crear Campaña</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
