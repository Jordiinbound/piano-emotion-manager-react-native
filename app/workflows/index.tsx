import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';


// Tipos de datos
interface WorkflowAction {
  type: string;
  name: string;
  config?: Record<string, unknown>;
}

interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  actions: WorkflowAction[];
  enabled: boolean;
  lastRun?: string;
  runCount?: number;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  trigger: string;
  actions: WorkflowAction[];
}
// Tipos de trigger
const TRIGGER_TYPES = [
  { id: 'service_completed', name: 'Servicio Completado', icon: 'checkmark-circle-outline', color: '#10B981' },
  { id: 'client_created', name: 'Cliente Creado', icon: 'person-add-outline', color: '#3B82F6' },
  { id: 'appointment_scheduled', name: 'Cita Programada', icon: 'calendar-outline', color: '#8B5CF6' },
  { id: 'invoice_paid', name: 'Factura Pagada', icon: 'card-outline', color: '#10B981' },
  { id: 'invoice_overdue', name: 'Factura Vencida', icon: 'alert-circle-outline', color: '#EF4444' },
  { id: 'quote_accepted', name: 'Presupuesto Aceptado', icon: 'thumbs-up-outline', color: '#F59E0B' },
  { id: 'quote_rejected', name: 'Presupuesto Rechazado', icon: 'thumbs-down-outline', color: '#EF4444' },
];

// Tipos de acción
const ACTION_TYPES = [
  { id: 'send_email', name: 'Enviar Email', icon: 'mail-outline', color: '#3B82F6' },
  { id: 'send_sms', name: 'Enviar SMS', icon: 'chatbox-outline', color: '#10B981' },
  { id: 'send_whatsapp', name: 'Enviar WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
  { id: 'send_push', name: 'Notificación Push', icon: 'notifications-outline', color: '#8B5CF6' },
  { id: 'create_task', name: 'Crear Tarea', icon: 'checkbox-outline', color: '#F59E0B' },
  { id: 'delay', name: 'Esperar', icon: 'time-outline', color: '#6B7280' },
  { id: 'condition', name: 'Condición', icon: 'git-branch-outline', color: '#EC4899' },
  { id: 'webhook', name: 'Webhook', icon: 'globe-outline', color: '#06B6D4' },
];

// Plantillas predefinidas
const WORKFLOW_TEMPLATES = [
  {
    id: 'welcome_client',
    name: 'Bienvenida a Nuevo Cliente',
    description: 'Envía un email de bienvenida cuando se registra un nuevo cliente',
    trigger: 'client_created',
    actions: [{ type: 'send_email', name: 'Email de bienvenida' }],
  },
  {
    id: 'service_followup',
    name: 'Seguimiento Post-Servicio',
    description: 'Envía un email de seguimiento 7 días después del servicio',
    trigger: 'service_completed',
    actions: [{ type: 'delay', name: 'Esperar 7 días' }, { type: 'send_email', name: 'Email de seguimiento' }],
  },
  {
    id: 'invoice_reminder',
    name: 'Recordatorio de Pago',
    description: 'Envía recordatorios cuando una factura está vencida',
    trigger: 'invoice_overdue',
    actions: [{ type: 'send_email', name: 'Email recordatorio' }, { type: 'create_task', name: 'Tarea de seguimiento' }],
  },
  {
    id: 'appointment_confirm',
    name: 'Confirmación de Cita',
    description: 'Envía confirmación por email y SMS al programar una cita',
    trigger: 'appointment_scheduled',
    actions: [{ type: 'send_email', name: 'Email confirmación' }, { type: 'send_sms', name: 'SMS confirmación' }],
  },
];

// Workflows de ejemplo
const SAMPLE_WORKFLOWS = [
  {
    id: '1',
    name: 'Bienvenida a Nuevo Cliente',
    description: 'Envía un email de bienvenida cuando se registra un nuevo cliente',
    trigger: 'client_created',
    actions: [{ type: 'send_email' }],
    enabled: true,
    executionCount: 45,
    lastExecuted: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    name: 'Seguimiento Post-Servicio',
    description: 'Envía un email de seguimiento 7 días después del servicio',
    trigger: 'service_completed',
    actions: [{ type: 'delay' }, { type: 'send_email' }],
    enabled: true,
    executionCount: 128,
    lastExecuted: '2024-01-14T15:45:00Z',
  },
  {
    id: '3',
    name: 'Recordatorio de Pago',
    description: 'Envía recordatorios cuando una factura está vencida',
    trigger: 'invoice_overdue',
    actions: [{ type: 'send_email' }, { type: 'create_task' }],
    enabled: false,
    executionCount: 23,
    lastExecuted: '2024-01-10T09:00:00Z',
  },
];

export default function WorkflowsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  
  const [workflows, setWorkflows] = useState(SAMPLE_WORKFLOWS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  const textPrimary = colors.text;
  const textSecondary = colors.textSecondary;
  const background = colors.background;
  const cardBg = colors.card;
  const border = colors.border;

  const getTriggerInfo = (triggerId: string) => {
    return TRIGGER_TYPES.find(t => t.id === triggerId) || TRIGGER_TYPES[0];
  };

  const getActionInfo = (actionId: string) => {
    return ACTION_TYPES.find(a => a.id === actionId) || ACTION_TYPES[0];
  };

  const toggleWorkflow = (workflowId: string) => {
    setWorkflows(prev =>
      prev.map(w =>
        w.id === workflowId ? { ...w, enabled: !w.enabled } : w
      )
    );
  };

  const renderStats = () => {
    const activeCount = workflows.filter(w => w.enabled).length;
    const totalExecutions = workflows.reduce((sum, w) => sum + w.executionCount, 0);
    
    return (
      <View style={[styles.statsContainer, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: colors.primary }]}>
            {activeCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: textSecondary }]}>
            Activos
          </ThemedText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: border }]} />
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: textPrimary }]}>
            {workflows.length}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: textSecondary }]}>
            Total
          </ThemedText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: border }]} />
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: '#10B981' }]}>
            {totalExecutions}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: textSecondary }]}>
            Ejecuciones
          </ThemedText>
        </View>
      </View>
    );
  };

  const renderWorkflowCard = (workflow: Workflow) => {
    const trigger = getTriggerInfo(workflow.trigger);
    
    return (
      <TouchableOpacity
        key={workflow.id}
        style={[styles.workflowCard, { backgroundColor: cardBg, borderColor: border }]}
        onPress={() => router.push(`/workflows/${workflow.id}`)}
      >
        <View style={styles.workflowHeader}>
          <View style={[styles.triggerBadge, { backgroundColor: `${trigger.color}20` }]}>
            <Ionicons name={trigger.icon as any} size={20} color={trigger.color} />
          </View>
          <View style={styles.workflowInfo}>
            <ThemedText style={[styles.workflowName, { color: textPrimary }]}>
              {workflow.name}
            </ThemedText>
            <ThemedText style={[styles.triggerName, { color: trigger.color }]}>
              {trigger.name}
            </ThemedText>
          </View>
          <Switch
            value={workflow.enabled}
            onValueChange={() => toggleWorkflow(workflow.id)}
            trackColor={{ false: border, true: `${colors.primary}80` }}
            thumbColor={workflow.enabled ? colors.primary : '#f4f3f4'}
          />
        </View>
        
        <ThemedText style={[styles.workflowDescription, { color: textSecondary }]}>
          {workflow.description}
        </ThemedText>
        
        {/* Visualización de acciones */}
        <View style={styles.actionsFlow}>
          <View style={[styles.flowStart, { backgroundColor: trigger.color }]}>
            <Ionicons name="flash" size={12} color="#fff" />
          </View>
          <View style={[styles.flowLine, { backgroundColor: border }]} />
          
          {workflow.actions.map((action: WorkflowAction, index: number) => {
            const actionInfo = getActionInfo(action.type);
            return (
              <React.Fragment key={index}>
                <View style={[styles.actionNode, { backgroundColor: `${actionInfo.color}20`, borderColor: actionInfo.color }]}>
                  <Ionicons name={actionInfo.icon as any} size={16} color={actionInfo.color} />
                </View>
                {index < workflow.actions.length - 1 && (
                  <View style={[styles.flowLine, { backgroundColor: border }]} />
                )}
              </React.Fragment>
            );
          })}
        </View>
        
        {/* Estadísticas */}
        <View style={styles.workflowStats}>
          <View style={styles.workflowStatItem}>
            <Ionicons name="play-circle-outline" size={14} color={textSecondary} />
            <ThemedText style={[styles.workflowStatText, { color: textSecondary }]}>
              {workflow.executionCount} ejecuciones
            </ThemedText>
          </View>
          {workflow.lastExecuted && (
            <View style={styles.workflowStatItem}>
              <Ionicons name="time-outline" size={14} color={textSecondary} />
              <ThemedText style={[styles.workflowStatText, { color: textSecondary }]}>
                Última: {new Date(workflow.lastExecuted).toLocaleDateString()}
              </ThemedText>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderTemplateCard = (template: WorkflowTemplate) => {
    const trigger = getTriggerInfo(template.trigger);
    
    return (
      <TouchableOpacity
        key={template.id}
        style={[styles.templateCard, { backgroundColor: cardBg, borderColor: border }]}
        onPress={() => {
          setShowTemplatesModal(false);
          // Crear workflow desde plantilla
          Alert.alert('Crear Workflow', `¿Crear workflow "${template.name}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Crear', onPress: () => {
              const newWorkflow = {
                id: Date.now().toString(),
                ...template,
                enabled: false,
                executionCount: 0,
                lastExecuted: null,
              };
              setWorkflows(prev => [newWorkflow, ...prev]);
            }}
          ]);
        }}
      >
        <View style={styles.templateHeader}>
          <View style={[styles.triggerBadge, { backgroundColor: `${trigger.color}20` }]}>
            <Ionicons name={trigger.icon as any} size={24} color={trigger.color} />
          </View>
          <View style={styles.templateInfo}>
            <ThemedText style={[styles.templateName, { color: textPrimary }]}>
              {template.name}
            </ThemedText>
            <ThemedText style={[styles.templateDescription, { color: textSecondary }]}>
              {template.description}
            </ThemedText>
          </View>
        </View>
        
        <View style={styles.templateActions}>
          {template.actions.map((action: WorkflowAction, index: number) => {
            const actionInfo = getActionInfo(action.type);
            return (
              <View
                key={index}
                style={[styles.templateActionBadge, { backgroundColor: `${actionInfo.color}15` }]}
              >
                <Ionicons name={actionInfo.icon as any} size={14} color={actionInfo.color} />
                <ThemedText style={[styles.templateActionText, { color: actionInfo.color }]}>
                  {action.name || actionInfo.name}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <ThemedText type="title" style={{ color: textPrimary }}>
          Workflows
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
        {renderStats()}

        {/* Botón de plantillas */}
        <TouchableOpacity
          style={[styles.templatesButton, { backgroundColor: `${colors.primary}10`, borderColor: colors.primary }]}
          onPress={() => setShowTemplatesModal(true)}
        >
          <Ionicons name="copy-outline" size={20} color={colors.primary} />
          <ThemedText style={[styles.templatesButtonText, { color: colors.primary }]}>
            Usar una plantilla predefinida
          </ThemedText>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </TouchableOpacity>

        {/* Lista de workflows */}
        <View style={styles.workflowsSection}>
          <ThemedText style={[styles.sectionTitle, { color: textPrimary }]}>
            Mis Workflows
          </ThemedText>
          
          {workflows.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: cardBg, borderColor: border }]}>
              <Ionicons name="git-branch-outline" size={48} color={textSecondary} />
              <ThemedText style={[styles.emptyTitle, { color: textPrimary }]}>
                No hay workflows
              </ThemedText>
              <ThemedText style={[styles.emptyDescription, { color: textSecondary }]}>
                Crea tu primer workflow para automatizar tareas repetitivas
              </ThemedText>
            </View>
          ) : (
            workflows.map(renderWorkflowCard)
          )}
        </View>

        {/* Información */}
        <View style={[styles.infoCard, { backgroundColor: `${colors.primary}10`, borderColor: colors.primary }]}>
          <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <ThemedText style={[styles.infoTitle, { color: colors.primary }]}>
              Automatiza tu trabajo
            </ThemedText>
            <ThemedText style={[styles.infoText, { color: textSecondary }]}>
              Los workflows te permiten automatizar tareas repetitivas. Define un evento 
              disparador y las acciones que quieres ejecutar automáticamente.
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      {/* Modal de creación */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <ThemedView style={[styles.modalContainer, { backgroundColor: background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: border }]}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <ThemedText style={{ color: colors.primary }}>Cancelar</ThemedText>
            </TouchableOpacity>
            <ThemedText type="subtitle" style={{ color: textPrimary }}>
              Nuevo Workflow
            </ThemedText>
            <View style={{ width: 60 }} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <ThemedText style={[styles.modalLabel, { color: textSecondary }]}>
              Selecciona el evento que disparará el workflow
            </ThemedText>
            
            {TRIGGER_TYPES.map(trigger => (
              <TouchableOpacity
                key={trigger.id}
                style={[styles.triggerOption, { backgroundColor: cardBg, borderColor: border }]}
                onPress={() => {
                  setShowCreateModal(false);
                  router.push(`/workflows/new?trigger=${trigger.id}`);
                }}
              >
                <View style={[styles.triggerOptionIcon, { backgroundColor: `${trigger.color}20` }]}>
                  <Ionicons name={trigger.icon as any} size={28} color={trigger.color} />
                </View>
                <View style={styles.triggerOptionInfo}>
                  <ThemedText style={[styles.triggerOptionName, { color: textPrimary }]}>
                    {trigger.name}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={textSecondary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ThemedView>
      </Modal>

      {/* Modal de plantillas */}
      <Modal
        visible={showTemplatesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTemplatesModal(false)}
      >
        <ThemedView style={[styles.modalContainer, { backgroundColor: background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: border }]}>
            <TouchableOpacity onPress={() => setShowTemplatesModal(false)}>
              <ThemedText style={{ color: colors.primary }}>Cerrar</ThemedText>
            </TouchableOpacity>
            <ThemedText type="subtitle" style={{ color: textPrimary }}>
              Plantillas
            </ThemedText>
            <View style={{ width: 60 }} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <ThemedText style={[styles.modalLabel, { color: textSecondary }]}>
              Selecciona una plantilla para empezar rápidamente
            </ThemedText>
            
            {WORKFLOW_TEMPLATES.map(renderTemplateCard)}
          </ScrollView>
        </ThemedView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: '100%',
  },
  templatesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    gap: 12,
  },
  templatesButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  workflowsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  workflowCard: {
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 12,
  },
  workflowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  triggerBadge: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workflowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  workflowName: {
    fontSize: 16,
    fontWeight: '600',
  },
  triggerName: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  workflowDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  actionsFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  flowStart: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowLine: {
    width: 20,
    height: 2,
  },
  actionNode: {
    width: 32,
    height: 32,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workflowStats: {
    flexDirection: 'row',
    gap: 16,
  },
  workflowStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  workflowStatText: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 4,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalLabel: {
    fontSize: 14,
    marginBottom: 16,
  },
  triggerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 12,
  },
  triggerOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerOptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  triggerOptionName: {
    fontSize: 16,
    fontWeight: '600',
  },
  templateCard: {
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 12,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  templateInfo: {
    flex: 1,
    marginLeft: 12,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
  },
  templateDescription: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  templateActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  templateActionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    gap: 4,
  },
  templateActionText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
