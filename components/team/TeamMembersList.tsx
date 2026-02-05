/**
 * Lista de Miembros del Equipo
 * Piano Emotion Manager
 * 
 * Componente para visualizar y gestionar los miembros de una organización.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { usePermissions } from '@/hooks/use-permissions';

// ==========================================
// TIPOS
// ==========================================

export interface TeamMember {
  id: number;
  userId: number;
  displayName: string;
  email: string;
  role: string;
  status: 'active' | 'pending_invitation' | 'suspended' | 'inactive';
  jobTitle?: string;
  phone?: string;
  color?: string;
  joinedAt?: Date;
  lastActiveAt?: Date;
}

interface TeamMembersListProps {
  members: TeamMember[];
  onInviteMember: (email: string, role: string) => Promise<void>;
  onChangeMemberRole: (memberId: number, newRole: string) => Promise<void>;
  onSuspendMember: (memberId: number, reason: string) => Promise<void>;
  onRemoveMember: (memberId: number) => Promise<void>;
  onRefresh: () => void;
  isLoading?: boolean;
}

// ==========================================
// CONSTANTES
// ==========================================

const ROLES = [
  { value: 'admin', label: 'Administrador', description: 'Control total de la organización' },
  { value: 'manager', label: 'Manager', description: 'Gestión de técnicos y asignaciones' },
  { value: 'senior_tech', label: 'Técnico Senior', description: 'Técnico con permisos ampliados' },
  { value: 'technician', label: 'Técnico', description: 'Técnico estándar' },
  { value: 'apprentice', label: 'Aprendiz', description: 'Acceso limitado, en formación' },
  { value: 'receptionist', label: 'Recepcionista', description: 'Gestión de citas y clientes' },
  { value: 'accountant', label: 'Contable', description: 'Facturación y reportes financieros' },
  { value: 'viewer', label: 'Observador', description: 'Solo lectura' },
];

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  pending_invitation: '#f59e0b',
  suspended: '#ef4444',
  inactive: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  pending_invitation: 'Pendiente',
  suspended: 'Suspendido',
  inactive: 'Inactivo',
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export function TeamMembersList({
  members,
  onInviteMember,
  onChangeMemberRole,
  onSuspendMember,
  onRemoveMember,
  onRefresh,
  isLoading = false,
}: TeamMembersListProps) {
  const { colors } = useTheme();
  const { can, isAdmin } = usePermissions();
  
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('technician');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ==========================================
  // HANDLERS
  // ==========================================
  
  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Por favor, introduce un email válido');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onInviteMember(inviteEmail.trim(), inviteRole);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('technician');
      Alert.alert('Éxito', 'Invitación enviada correctamente');
    } catch (error: unknown) {
      Alert.alert('Error', error.message || 'No se pudo enviar la invitación');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleChangeRole = async (newRole: string) => {
    if (!selectedMember) return;
    
    setIsSubmitting(true);
    try {
      await onChangeMemberRole(selectedMember.id, newRole);
      setShowRoleModal(false);
      setSelectedMember(null);
      Alert.alert('Éxito', 'Rol actualizado correctamente');
    } catch (error: unknown) {
      Alert.alert('Error', error.message || 'No se pudo cambiar el rol');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSuspend = (member: TeamMember) => {
    Alert.prompt(
      'Suspender Miembro',
      `¿Estás seguro de que quieres suspender a ${member.displayName}? Introduce el motivo:`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Suspender',
          style: 'destructive',
          onPress: async (reason) => {
            if (reason) {
              try {
                await onSuspendMember(member.id, reason);
                Alert.alert('Éxito', 'Miembro suspendido');
              } catch (error: unknown) {
                Alert.alert('Error', error.message);
              }
            }
          },
        },
      ],
      'plain-text'
    );
  };
  
  const handleRemove = (member: TeamMember) => {
    Alert.alert(
      'Eliminar Miembro',
      `¿Estás seguro de que quieres eliminar a ${member.displayName} de la organización?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await onRemoveMember(member.id);
              Alert.alert('Éxito', 'Miembro eliminado');
            } catch (error: unknown) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };
  
  // ==========================================
  // RENDER
  // ==========================================
  
  const renderMemberItem = ({ item }: { item: TeamMember }) => (
    <View style={[styles.memberCard, { backgroundColor: colors.card }]}>
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: item.color || colors.primary }]}>
        <Text style={styles.avatarText}>
          {item.displayName?.charAt(0).toUpperCase() || '?'}
        </Text>
      </View>
      
      {/* Info */}
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: colors.text }]}>
          {item.displayName || 'Sin nombre'}
        </Text>
        <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>
          {item.email}
        </Text>
        <View style={styles.memberMeta}>
          <View style={[styles.badge, { backgroundColor: colors.background }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              {ROLES.find(r => r.value === item.role)?.label || item.role}
            </Text>
          </View>
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] }]} />
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>
      
      {/* Actions */}
      {can('members', 'update') && item.role !== 'owner' && (
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => {
            setSelectedMember(item);
            setShowRoleModal(true);
          }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Equipo ({members.length})
        </Text>
        {can('invitations', 'create') && (
          <TouchableOpacity
            style={[styles.inviteButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowInviteModal(true)}
          >
            <Ionicons name="person-add" size={18} color="#fff" />
            <Text style={styles.inviteButtonText}>Invitar</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Lista */}
      <FlatList
        data={members}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMemberItem}
        refreshing={isLoading}
        onRefresh={onRefresh}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No hay miembros en el equipo
            </Text>
          </View>
        }
      />
      
      {/* Modal de Invitación */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Invitar Miembro
            </Text>
            
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="Email del nuevo miembro"
              placeholderTextColor={colors.textSecondary}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <Text style={[styles.label, { color: colors.text }]}>Rol</Text>
            <View style={styles.roleList}>
              {ROLES.map((role) => (
                <TouchableOpacity
                  key={role.value}
                  style={[
                    styles.roleOption,
                    { backgroundColor: colors.background },
                    inviteRole === role.value && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                  onPress={() => setInviteRole(role.value)}
                >
                  <Text style={[styles.roleLabel, { color: colors.text }]}>{role.label}</Text>
                  <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
                    {role.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.background }]}
                onPress={() => setShowInviteModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleInvite}
                disabled={isSubmitting}
              >
                <Text style={styles.modalButtonTextPrimary}>
                  {isSubmitting ? 'Enviando...' : 'Enviar Invitación'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Modal de Cambio de Rol */}
      <Modal
        visible={showRoleModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Gestionar: {selectedMember?.displayName}
            </Text>
            
            <Text style={[styles.label, { color: colors.text }]}>Cambiar Rol</Text>
            <View style={styles.roleList}>
              {ROLES.map((role) => (
                <TouchableOpacity
                  key={role.value}
                  style={[
                    styles.roleOption,
                    { backgroundColor: colors.background },
                    selectedMember?.role === role.value && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                  onPress={() => handleChangeRole(role.value)}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.roleLabel, { color: colors.text }]}>{role.label}</Text>
                  <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
                    {role.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.dangerZone}>
              <TouchableOpacity
                style={[styles.dangerButton, { borderColor: '#f59e0b' }]}
                onPress={() => {
                  setShowRoleModal(false);
                  if (selectedMember) handleSuspend(selectedMember);
                }}
              >
                <Ionicons name="pause-circle-outline" size={20} color="#f59e0b" />
                <Text style={[styles.dangerButtonText, { color: '#f59e0b' }]}>Suspender</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.dangerButton, { borderColor: '#ef4444' }]}
                onPress={() => {
                  setShowRoleModal(false);
                  if (selectedMember) handleRemove(selectedMember);
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                <Text style={[styles.dangerButtonText, { color: '#ef4444' }]}>Eliminar</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.background }]}
              onPress={() => setShowRoleModal(false)}
            >
              <Text style={[styles.closeButtonText, { color: colors.text }]}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ==========================================
// ESTILOS
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    gap: 6,
  },
  inviteButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
  },
  menuButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    padding: 12,
    borderRadius: 4,
    fontSize: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  roleList: {
    gap: 8,
    marginBottom: 16,
  },
  roleOption: {
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  roleDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 4,
    alignItems: 'center',
  },
  modalButtonText: {
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontWeight: '600',
  },
  dangerZone: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  dangerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    gap: 8,
  },
  dangerButtonText: {
    fontWeight: '600',
  },
  closeButton: {
    padding: 14,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 12,
  },
  closeButtonText: {
    fontWeight: '600',
  },
});

export default TeamMembersList;
