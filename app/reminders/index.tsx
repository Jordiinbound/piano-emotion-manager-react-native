import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { BorderRadius, Spacing } from '@/constants/theme';

interface ReminderTemplate {
  id: string;
  name: string;
  type: string;
  description: string;
  enabled: boolean;
  channels: string[];
  timing: string;
}

const REMINDER_TYPES = [
  { id: 'maintenance', icon: 'build-outline', color: '#3B82F6' },
  { id: 'follow_up', icon: 'chatbubble-outline', color: '#10B981' },
  { id: 'warranty_expiry', icon: 'shield-checkmark-outline', color: '#F59E0B' },
  { id: 'appointment', icon: 'calendar-outline', color: '#8B5CF6' },
  { id: 'payment_due', icon: 'card-outline', color: '#EF4444' },
  { id: 'contract_renewal', icon: 'document-text-outline', color: '#06B6D4' },
];

const PREDEFINED_TEMPLATES = [
  {
    id: 'maintenance_6_months',
    name: 'Recordatorio de Afinación (6 meses)',
    type: 'maintenance',
    description: 'Recuerda al cliente que han pasado 6 meses desde la última afinación',
    enabled: true,
    channels: ['email', 'push'],
    timing: '6 meses después del último servicio',
  },
  {
    id: 'maintenance_12_months',
    name: 'Mantenimiento Anual',
    type: 'maintenance',
    description: 'Recordatorio anual de mantenimiento',
    enabled: true,
    channels: ['email', 'push'],
    timing: '12 meses después del último servicio',
  },
  {
    id: 'follow_up_7_days',
    name: 'Seguimiento Post-Servicio',
    type: 'follow_up',
    description: 'Contacta al cliente una semana después del servicio',
    enabled: true,
    channels: ['email'],
    timing: '7 días después del servicio',
  },
  {
    id: 'warranty_expiry_30_days',
    name: 'Vencimiento de Garantía',
    type: 'warranty_expiry',
    description: 'Notifica que la garantía expira en 30 días',
    enabled: true,
    channels: ['email', 'push'],
    timing: '30 días antes del vencimiento',
  },
  {
    id: 'appointment_reminder_24h',
    name: 'Recordatorio de Cita (24h)',
    type: 'appointment',
    description: 'Recuerda la cita programada para mañana',
    enabled: true,
    channels: ['push', 'email', 'sms'],
    timing: '24 horas antes de la cita',
  },
  {
    id: 'appointment_reminder_2h',
    name: 'Recordatorio de Cita (2h)',
    type: 'appointment',
    description: 'Recuerda la cita en 2 horas',
    enabled: true,
    channels: ['push', 'sms'],
    timing: '2 horas antes de la cita',
  },
  {
    id: 'payment_reminder_7_days',
    name: 'Pago Pendiente',
    type: 'payment_due',
    description: 'Recuerda facturas pendientes de pago',
    enabled: false,
    channels: ['email'],
    timing: '7 días después del vencimiento',
  },
  {
    id: 'contract_renewal_30_days',
    name: 'Renovación de Contrato',
    type: 'contract_renewal',
    description: 'Notifica que el contrato expira en 30 días',
    enabled: true,
    channels: ['email', 'push'],
    timing: '30 días antes del vencimiento',
  },
];

export default function RemindersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  
  const [templates, setTemplates] = useState(PREDEFINED_TEMPLATES);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const textPrimary = colors.text;
  const textSecondary = colors.textSecondary;
  const background = colors.background;
  const cardBg = colors.card;
  const border = colors.border;

  const toggleTemplate = (templateId: string) => {
    setTemplates(prev =>
      prev.map(t =>
        t.id === templateId ? { ...t, enabled: !t.enabled } : t
      )
    );
  };

  const filteredTemplates = selectedType
    ? templates.filter(t => t.type === selectedType)
    : templates;

  const getTypeInfo = (typeId: string) => {
    return REMINDER_TYPES.find(t => t.id === typeId) || REMINDER_TYPES[0];
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return 'mail-outline';
      case 'push': return 'notifications-outline';
      case 'sms': return 'chatbox-outline';
      case 'whatsapp': return 'logo-whatsapp';
      default: return 'ellipse-outline';
    }
  };

  const handleEditTemplate = (template: ReminderTemplate) => {
    setEditingTemplate(template);
    setShowEditModal(true);
  };

  const getTypeDescription = (typeId: string) => {
    switch (typeId) {
      case 'maintenance': return 'Avisos para afinaciones y reparaciones periódicas';
      case 'follow_up': return 'Seguimiento tras completar un servicio';
      case 'warranty_expiry': return 'Avisos antes de que expire la garantía';
      case 'appointment': return 'Recordatorios de citas agendadas';
      case 'payment_due': return 'Avisos de facturas pendientes';
      case 'contract_renewal': return 'Avisos para renovar contratos de mantenimiento';
      default: return '';
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: background }]}>
      {/* Header Elegante */}
      <View style={[styles.header, { borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <ThemedText style={[styles.title, { color: textPrimary }]}>
          Recordatorios
        </ThemedText>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Estadísticas */}
        <View style={[styles.statsContainer, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: colors.primary }]}>
              {templates.filter(t => t.enabled).length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: textSecondary }]}>Activos</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: border }]} />
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: textPrimary }]}>
              {templates.length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: textSecondary }]}>Total</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: border }]} />
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: '#10B981' }]}>156</ThemedText>
            <ThemedText style={[styles.statLabel, { color: textSecondary }]}>Enviados</ThemedText>
          </View>
        </View>

        {/* Filtros Compactos y Centrados */}
        <View style={[styles.filterWrapper, { borderBottomColor: border }]}>
          <View style={styles.filterContent}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: !selectedType ? colors.primary : cardBg, borderColor: border }
              ]}
              onPress={() => setSelectedType(null)}
            >
              <ThemedText style={[styles.filterText, { color: !selectedType ? '#fff' : textSecondary }]}>
                Todos
              </ThemedText>
            </TouchableOpacity>
            
            {REMINDER_TYPES.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.filterChip,
                  { 
                    backgroundColor: selectedType === type.id ? type.color : cardBg,
                    borderColor: selectedType === type.id ? type.color : border
                  }
                ]}
                onPress={() => setSelectedType(type.id)}
              >
                <Ionicons
                  name={type.icon as any}
                  size={16}
                  color={selectedType === type.id ? '#fff' : type.color}
                  style={{ marginRight: 4 }}
                />
                <ThemedText style={[styles.filterText, { color: selectedType === type.id ? '#fff' : textSecondary }]}>
                  {t(`reminders.types.${type.id}`) || type.id}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Lista de plantillas */}
        <View style={styles.templatesSection}>
          <ThemedText style={[styles.sectionTitle, { color: textPrimary }]}>
            Reglas de Recordatorio
          </ThemedText>
          
          {filteredTemplates.map(template => {
            const typeInfo = getTypeInfo(template.type);
            return (
              <TouchableOpacity
                key={template.id}
                style={[styles.templateCard, { backgroundColor: cardBg, borderColor: border }]}
                onPress={() => handleEditTemplate(template)}
              >
                <View style={styles.templateHeader}>
                  <View style={[styles.typeIcon, { backgroundColor: `${typeInfo.color}20` }]}>
                    <Ionicons name={typeInfo.icon as any} size={24} color={typeInfo.color} />
                  </View>
                  <View style={styles.templateInfo}>
                    <ThemedText style={[styles.templateName, { color: textPrimary }]}>
                      {template.name}
                    </ThemedText>
                    <ThemedText style={[styles.templateTiming, { color: textSecondary }]}>
                      {template.timing}
                    </ThemedText>
                  </View>
                  <Switch
                    value={template.enabled}
                    onValueChange={() => toggleTemplate(template.id)}
                    trackColor={{ false: border, true: `${typeInfo.color}80` }}
                    thumbColor={template.enabled ? typeInfo.color : '#f4f3f4'}
                  />
                </View>
                <ThemedText style={[styles.templateDescription, { color: textSecondary }]}>
                  {template.description}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
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
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 80,
    borderBottomWidth: 1,
  },
  backButton: {
    position: 'absolute',
    left: 24,
  },
  addButton: {
    position: 'absolute',
    right: 24,
    width: 36,
    height: 36,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
  },
  statItem: {
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
  statDivider: {
    width: 1,
    height: 30,
  },
  filterWrapper: {
    height: 160,
    borderBottomWidth: 1,
    justifyContent: 'center',
  },
  filterContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 40,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  templatesSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  templateCard: {
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 12,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  templateTiming: {
    fontSize: 12,
  },
  templateDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});
