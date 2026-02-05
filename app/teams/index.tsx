/**
 * Módulo de Gestión de Equipos
 * Piano Emotion Manager
 * 
 * Pantalla principal para gestionar organizaciones, miembros y asignaciones
 */

import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useLanguage } from '@/contexts/language-context';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';

// Tipos
type TabType = 'members' | 'assignments' | 'zones' | 'absences';

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'manager' | 'senior_tech' | 'technician' | 'apprentice' | 'receptionist' | 'accountant' | 'viewer';
  status: 'active' | 'pending_invitation' | 'suspended' | 'inactive';
  phone?: string;
  color?: string;
  specialties?: string[];
  assignedZones?: string[];
  lastActiveAt?: string;
  avatar?: string;
};

type WorkAssignment = {
  id: string;
  technicianId: string;
  technicianName: string;
  clientName: string;
  pianoInfo: string;
  serviceType: string;
  scheduledDate: string;
  scheduledTime: string;
  status: 'unassigned' | 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
};

type ServiceZone = {
  id: string;
  name: string;
  postalCodes: string[];
  assignedTechnicians: string[];
  color: string;
};

type Absence = {
  id: string;
  memberId: string;
  memberName: string;
  type: 'vacation' | 'sick_leave' | 'personal' | 'training' | 'other';
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
};

// Datos de ejemplo
const MOCK_MEMBERS: TeamMember[] = [
  {
    id: '1',
    name: 'Carlos García',
    email: 'carlos@pianoemotion.com',
    role: 'owner',
    status: 'active',
    phone: '+34 612 345 678',
    color: '#3B82F6',
    specialties: ['Afinación', 'Restauración'],
    lastActiveAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'María López',
    email: 'maria@pianoemotion.com',
    role: 'senior_tech',
    status: 'active',
    phone: '+34 623 456 789',
    color: '#10B981',
    specialties: ['Afinación', 'Regulación'],
    assignedZones: ['28001-28010'],
    lastActiveAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '3',
    name: 'Pedro Martínez',
    email: 'pedro@pianoemotion.com',
    role: 'technician',
    status: 'active',
    phone: '+34 634 567 890',
    color: '#F59E0B',
    specialties: ['Afinación'],
    assignedZones: ['28011-28020'],
    lastActiveAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '4',
    name: 'Ana Fernández',
    email: 'ana@pianoemotion.com',
    role: 'apprentice',
    status: 'pending_invitation',
    color: '#8B5CF6',
  },
];

const MOCK_ASSIGNMENTS: WorkAssignment[] = [
  {
    id: '1',
    technicianId: '2',
    technicianName: 'María López',
    clientName: 'Juan Pérez',
    pianoInfo: 'Yamaha U3',
    serviceType: 'Afinación',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '10:00',
    status: 'assigned',
    priority: 'normal',
  },
  {
    id: '2',
    technicianId: '3',
    technicianName: 'Pedro Martínez',
    clientName: 'Laura Sánchez',
    pianoInfo: 'Steinway B',
    serviceType: 'Regulación',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '15:00',
    status: 'in_progress',
    priority: 'high',
  },
  {
    id: '3',
    technicianId: '',
    technicianName: 'Sin asignar',
    clientName: 'Roberto Díaz',
    pianoInfo: 'Kawai K-500',
    serviceType: 'Afinación',
    scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    scheduledTime: '11:00',
    status: 'unassigned',
    priority: 'urgent',
  },
];

const MOCK_ZONES: ServiceZone[] = [
  {
    id: '1',
    name: 'Centro Madrid',
    postalCodes: ['28001', '28002', '28003', '28004', '28005'],
    assignedTechnicians: ['2'],
    color: '#3B82F6',
  },
  {
    id: '2',
    name: 'Norte Madrid',
    postalCodes: ['28034', '28035', '28036', '28037'],
    assignedTechnicians: ['3'],
    color: '#10B981',
  },
];

const MOCK_ABSENCES: Absence[] = [
  {
    id: '1',
    memberId: '2',
    memberName: 'María López',
    type: 'vacation',
    startDate: '2025-01-15',
    endDate: '2025-01-22',
    status: 'approved',
    notes: 'Vacaciones de invierno',
  },
  {
    id: '2',
    memberId: '3',
    memberName: 'Pedro Martínez',
    type: 'training',
    startDate: '2025-01-10',
    endDate: '2025-01-10',
    status: 'pending',
    notes: 'Curso de restauración',
  },
];

const ROLE_LABELS: Record<TeamMember['role'], string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  manager: 'Gerente',
  senior_tech: 'Técnico Senior',
  technician: 'Técnico',
  apprentice: 'Aprendiz',
  receptionist: 'Recepcionista',
  accountant: 'Contable',
  viewer: 'Visor',
};

const STATUS_LABELS: Record<TeamMember['status'], string> = {
  active: 'Activo',
  pending_invitation: 'Invitación pendiente',
  suspended: 'Suspendido',
  inactive: 'Inactivo',
};

const ASSIGNMENT_STATUS_LABELS: Record<WorkAssignment['status'], string> = {
  unassigned: 'Sin asignar',
  assigned: 'Asignado',
  accepted: 'Aceptado',
  in_progress: 'En progreso',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const PRIORITY_LABELS: Record<WorkAssignment['priority'], string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

const ABSENCE_TYPE_LABELS: Record<Absence['type'], string> = {
  vacation: 'Vacaciones',
  sick_leave: 'Baja médica',
  personal: 'Asuntos personales',
  training: 'Formación',
  other: 'Otro',
};

export default function TeamsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Colores del tema
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accent = useThemeColor({}, 'accent');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const error = useThemeColor({}, 'error');

  // Estadísticas
  const stats = useMemo(() => ({
    totalMembers: MOCK_MEMBERS.length,
    activeMembers: MOCK_MEMBERS.filter(m => m.status === 'active').length,
    pendingInvitations: MOCK_MEMBERS.filter(m => m.status === 'pending_invitation').length,
    unassignedWork: MOCK_ASSIGNMENTS.filter(a => a.status === 'unassigned').length,
    todayAssignments: MOCK_ASSIGNMENTS.filter(a => 
      a.scheduledDate === new Date().toISOString().split('T')[0]
    ).length,
    pendingAbsences: MOCK_ABSENCES.filter(a => a.status === 'pending').length,
  }), []);

  // Filtrar miembros
  const filteredMembers = useMemo(() => {
    if (!searchQuery) return MOCK_MEMBERS;
    const query = searchQuery.toLowerCase();
    return MOCK_MEMBERS.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.email.toLowerCase().includes(query) ||
      ROLE_LABELS[m.role].toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Filtrar asignaciones
  const filteredAssignments = useMemo(() => {
    if (!searchQuery) return MOCK_ASSIGNMENTS;
    const query = searchQuery.toLowerCase();
    return MOCK_ASSIGNMENTS.filter(a =>
      a.clientName.toLowerCase().includes(query) ||
      a.technicianName.toLowerCase().includes(query) ||
      a.serviceType.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleInviteMember = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Invitar miembro',
      'Introduce el email del nuevo miembro para enviar una invitación.',
      [
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleAssignWork = (assignmentId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Asignar trabajo',
      'Selecciona un técnico para asignar este trabajo.',
      [
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const tabs: { key: TabType; label: string; icon: string; badge?: number }[] = [
    { key: 'members', label: 'Miembros', icon: 'person.3.fill', badge: stats.pendingInvitations > 0 ? stats.pendingInvitations : undefined },
    { key: 'assignments', label: 'Asignaciones', icon: 'list.clipboard.fill', badge: stats.unassignedWork > 0 ? stats.unassignedWork : undefined },
    { key: 'zones', label: 'Zonas', icon: 'map.fill' },
    { key: 'absences', label: 'Ausencias', icon: 'calendar.badge.clock', badge: stats.pendingAbsences > 0 ? stats.pendingAbsences : undefined },
  ];

  const getStatusColor = (status: TeamMember['status']) => {
    switch (status) {
      case 'active': return success;
      case 'pending_invitation': return warning;
      case 'suspended': return error;
      case 'inactive': return textSecondary;
      default: return textSecondary;
    }
  };

  const getPriorityColor = (priority: WorkAssignment['priority']) => {
    switch (priority) {
      case 'urgent': return error;
      case 'high': return warning;
      case 'normal': return accent;
      case 'low': return textSecondary;
      default: return textSecondary;
    }
  };

  const getAssignmentStatusColor = (status: WorkAssignment['status']) => {
    switch (status) {
      case 'completed': return success;
      case 'in_progress': return accent;
      case 'assigned':
      case 'accepted': return warning;
      case 'unassigned': return error;
      case 'cancelled': return textSecondary;
      default: return textSecondary;
    }
  };

  return (
    <LinearGradient
      colors={['#F8F9FA', '#EEF2F7', '#E8EDF5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <View style={styles.headerTop}>
          <Pressable
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <IconSymbol name="chevron.left" size={24} color={accent} />
          </Pressable>
          <ThemedText type="title" style={styles.headerTitle}>
            Gestión de Equipos
          </ThemedText>
          <Pressable
            style={[styles.addButton, { backgroundColor: accent }]}
            onPress={handleInviteMember}
          >
            <IconSymbol name="person.badge.plus" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Estadísticas rápidas */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
            <ThemedText style={[styles.statValue, { color: accent }]}>{stats.activeMembers}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: textSecondary }]}>Activos</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
            <ThemedText style={[styles.statValue, { color: warning }]}>{stats.todayAssignments}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: textSecondary }]}>Hoy</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
            <ThemedText style={[styles.statValue, { color: error }]}>{stats.unassignedWork}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: textSecondary }]}>Sin asignar</ThemedText>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                size={18}
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
              {tab.badge && (
                <View style={[styles.tabBadge, { backgroundColor: error }]}>
                  <ThemedText style={styles.tabBadgeText}>{tab.badge}</ThemedText>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Búsqueda */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: cardBg, borderColor }]}>
          <IconSymbol name="magnifyingglass" size={18} color={textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: useThemeColor({}, 'text') }]}
            placeholder="Buscar..."
            placeholderTextColor={textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <IconSymbol name="xmark.circle.fill" size={18} color={textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Contenido */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Tab: Miembros */}
        {activeTab === 'members' && (
          <View>
            {filteredMembers.map((member) => (
              <Pressable
                key={member.id}
                style={[styles.card, { backgroundColor: cardBg, borderColor }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  // router.push(`/teams/member/${member.id}`);
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.avatar, { backgroundColor: member.color || accent }]}>
                    <ThemedText style={styles.avatarText}>
                      {member.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </ThemedText>
                  </View>
                  <View style={styles.cardInfo}>
                    <ThemedText type="defaultSemiBold">{member.name}</ThemedText>
                    <ThemedText style={[styles.cardSubtitle, { color: textSecondary }]}>
                      {member.email}
                    </ThemedText>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(member.status)}20` }]}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(member.status) }]} />
                    <ThemedText style={[styles.statusText, { color: getStatusColor(member.status) }]}>
                      {STATUS_LABELS[member.status]}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.cardDetails}>
                  <View style={styles.detailItem}>
                    <IconSymbol name="person.fill" size={14} color={textSecondary} />
                    <ThemedText style={[styles.detailText, { color: textSecondary }]}>
                      {ROLE_LABELS[member.role]}
                    </ThemedText>
                  </View>
                  {member.specialties && member.specialties.length > 0 && (
                    <View style={styles.detailItem}>
                      <IconSymbol name="wrench.fill" size={14} color={textSecondary} />
                      <ThemedText style={[styles.detailText, { color: textSecondary }]}>
                        {member.specialties.join(', ')}
                      </ThemedText>
                    </View>
                  )}
                  {member.assignedZones && member.assignedZones.length > 0 && (
                    <View style={styles.detailItem}>
                      <IconSymbol name="map.fill" size={14} color={textSecondary} />
                      <ThemedText style={[styles.detailText, { color: textSecondary }]}>
                        {member.assignedZones.join(', ')}
                      </ThemedText>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Tab: Asignaciones */}
        {activeTab === 'assignments' && (
          <View>
            {filteredAssignments.map((assignment) => (
              <Pressable
                key={assignment.id}
                style={[styles.card, { backgroundColor: cardBg, borderColor }]}
                onPress={() => {
                  if (assignment.status === 'unassigned') {
                    handleAssignWork(assignment.id);
                  }
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(assignment.priority) }]} />
                  <View style={styles.cardInfo}>
                    <ThemedText type="defaultSemiBold">{assignment.clientName}</ThemedText>
                    <ThemedText style={[styles.cardSubtitle, { color: textSecondary }]}>
                      {assignment.pianoInfo} • {assignment.serviceType}
                    </ThemedText>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getAssignmentStatusColor(assignment.status)}20` }]}>
                    <ThemedText style={[styles.statusText, { color: getAssignmentStatusColor(assignment.status) }]}>
                      {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.cardDetails}>
                  <View style={styles.detailItem}>
                    <IconSymbol name="calendar" size={14} color={textSecondary} />
                    <ThemedText style={[styles.detailText, { color: textSecondary }]}>
                      {assignment.scheduledDate} a las {assignment.scheduledTime}
                    </ThemedText>
                  </View>
                  <View style={styles.detailItem}>
                    <IconSymbol name="person.fill" size={14} color={textSecondary} />
                    <ThemedText style={[styles.detailText, { color: assignment.status === 'unassigned' ? error : textSecondary }]}>
                      {assignment.technicianName}
                    </ThemedText>
                  </View>
                </View>
                {assignment.status === 'unassigned' && (
                  <Pressable
                    style={[styles.assignButton, { backgroundColor: accent }]}
                    onPress={() => handleAssignWork(assignment.id)}
                  >
                    <IconSymbol name="person.badge.plus" size={16} color="#FFFFFF" />
                    <ThemedText style={styles.assignButtonText}>Asignar técnico</ThemedText>
                  </Pressable>
                )}
              </Pressable>
            ))}
          </View>
        )}

        {/* Tab: Zonas */}
        {activeTab === 'zones' && (
          <View>
            {MOCK_ZONES.map((zone) => (
              <View key={zone.id} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.zoneColor, { backgroundColor: zone.color }]} />
                  <View style={styles.cardInfo}>
                    <ThemedText type="defaultSemiBold">{zone.name}</ThemedText>
                    <ThemedText style={[styles.cardSubtitle, { color: textSecondary }]}>
                      {zone.postalCodes.length} códigos postales
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.cardDetails}>
                  <View style={styles.detailItem}>
                    <IconSymbol name="mappin" size={14} color={textSecondary} />
                    <ThemedText style={[styles.detailText, { color: textSecondary }]}>
                      {zone.postalCodes.join(', ')}
                    </ThemedText>
                  </View>
                  <View style={styles.detailItem}>
                    <IconSymbol name="person.2.fill" size={14} color={textSecondary} />
                    <ThemedText style={[styles.detailText, { color: textSecondary }]}>
                      {zone.assignedTechnicians.length} técnico(s) asignado(s)
                    </ThemedText>
                  </View>
                </View>
              </View>
            ))}
            <Pressable
              style={[styles.addZoneButton, { borderColor: accent }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Alert.alert('Nueva zona', 'Crear una nueva zona de servicio');
              }}
            >
              <IconSymbol name="plus" size={20} color={accent} />
              <ThemedText style={[styles.addZoneText, { color: accent }]}>Añadir zona</ThemedText>
            </Pressable>
          </View>
        )}

        {/* Tab: Ausencias */}
        {activeTab === 'absences' && (
          <View>
            {MOCK_ABSENCES.map((absence) => (
              <View key={absence.id} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <ThemedText type="defaultSemiBold">{absence.memberName}</ThemedText>
                    <ThemedText style={[styles.cardSubtitle, { color: textSecondary }]}>
                      {ABSENCE_TYPE_LABELS[absence.type]}
                    </ThemedText>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: absence.status === 'approved' ? `${success}20` : absence.status === 'pending' ? `${warning}20` : `${error}20` }
                  ]}>
                    <ThemedText style={[
                      styles.statusText,
                      { color: absence.status === 'approved' ? success : absence.status === 'pending' ? warning : error }
                    ]}>
                      {absence.status === 'approved' ? 'Aprobada' : absence.status === 'pending' ? 'Pendiente' : 'Rechazada'}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.cardDetails}>
                  <View style={styles.detailItem}>
                    <IconSymbol name="calendar" size={14} color={textSecondary} />
                    <ThemedText style={[styles.detailText, { color: textSecondary }]}>
                      {absence.startDate} - {absence.endDate}
                    </ThemedText>
                  </View>
                  {absence.notes && (
                    <View style={styles.detailItem}>
                      <IconSymbol name="note.text" size={14} color={textSecondary} />
                      <ThemedText style={[styles.detailText, { color: textSecondary }]}>
                        {absence.notes}
                      </ThemedText>
                    </View>
                  )}
                </View>
                {absence.status === 'pending' && (
                  <View style={styles.absenceActions}>
                    <Pressable
                      style={[styles.absenceButton, { backgroundColor: success }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        Alert.alert('Aprobar', '¿Aprobar esta ausencia?');
                      }}
                    >
                      <IconSymbol name="checkmark" size={16} color="#FFFFFF" />
                      <ThemedText style={styles.absenceButtonText}>Aprobar</ThemedText>
                    </Pressable>
                    <Pressable
                      style={[styles.absenceButton, { backgroundColor: error }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        Alert.alert('Rechazar', '¿Rechazar esta ausencia?');
                      }}
                    >
                      <IconSymbol name="xmark" size={16} color="#FFFFFF" />
                      <ThemedText style={styles.absenceButtonText}>Rechazar</ThemedText>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'web' ? 20 : 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  backButton: {
    padding: Spacing.sm,
    marginLeft: -Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  tabsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
    gap: Spacing.xs,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cardInfo: {
    flex: 1,
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardDetails: {
    gap: Spacing.xs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: 13,
  },
  priorityIndicator: {
    width: 4,
    height: 44,
    borderRadius: 4,
    marginRight: Spacing.md,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  assignButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  zoneColor: {
    width: 12,
    height: 44,
    borderRadius: 4,
    marginRight: Spacing.md,
  },
  addZoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: Spacing.sm,
  },
  addZoneText: {
    fontSize: 15,
    fontWeight: '600',
  },
  absenceActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  absenceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  absenceButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
