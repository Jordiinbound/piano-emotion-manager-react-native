/**
 * Página de Gestión de Miembros del Equipo
 * Piano Emotion Manager
 * 
 * Lista y gestión de todos los miembros de la organización.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCurrentOrganization } from '../../../hooks/use-organization';
import { 
  useTeamMembers, 
  useMyPermissions,
  OrganizationRole 
} from '../../../hooks/use-team-members';
import { TeamMembersList } from '../../../components/team/TeamMembersList';
import { useTheme } from '../../../hooks/use-theme';

// ==========================================
// TIPOS
// ==========================================

interface InviteModalProps {
  visible: boolean;
  onClose: () => void;
  onInvite: (email: string, role: OrganizationRole, message?: string) => Promise<void>;
  isLoading: boolean;
}

// ==========================================
// COMPONENTES
// ==========================================

function InviteModal({ visible, onClose, onInvite, isLoading }: InviteModalProps) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizationRole>('technician');
  const [message, setMessage] = useState('');
  
  const roles: { value: OrganizationRole; label: string }[] = [
    { value: 'admin', label: 'Administrador' },
    { value: 'manager', label: 'Gestor' },
    { value: 'senior_tech', label: 'Técnico Senior' },
    { value: 'technician', label: 'Técnico' },
    { value: 'apprentice', label: 'Aprendiz' },
    { value: 'receptionist', label: 'Recepcionista' },
    { value: 'accountant', label: 'Contable' },
    { value: 'viewer', label: 'Solo Lectura' },
  ];
  
  const handleInvite = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor, introduce un email');
      return;
    }
    
    if (!email.includes('@')) {
      Alert.alert('Error', 'Por favor, introduce un email válido');
      return;
    }
    
    try {
      await onInvite(email.trim(), role, message.trim() || undefined);
      setEmail('');
      setRole('technician');
      setMessage('');
      onClose();
      Alert.alert('Éxito', 'Invitación enviada correctamente');
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo enviar la invitación');
    }
  };
  
  const handleClose = () => {
    setEmail('');
    setRole('technician');
    setMessage('');
    onClose();
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay as any}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader as any}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Invitar Miembro
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent as any}>
            {/* Email */}
            <Text style={[styles.label, { color: colors.text }]}>
              Email *
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              value={email}
              onChangeText={setEmail}
              placeholder="email@ejemplo.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            {/* Rol */}
            <Text style={[styles.label, { color: colors.text }]}>
              Rol *
            </Text>
            <View style={styles.roleGrid as any}>
              {roles.map((r: any) => (
                <TouchableOpacity
                  key={r.value}
                  style={[
                    styles.roleOption,
                    { backgroundColor: colors.background },
                    role === r.value && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setRole(r.value)}
                >
                  <Text
                    style={[
                      styles.roleText,
                      { color: role === r.value ? '#fff' : colors.text },
                    ]}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Mensaje personalizado */}
            <Text style={[styles.label, { color: colors.text }]}>
              Mensaje (opcional)
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: colors.background, color: colors.text },
              ]}
              value={message}
              onChangeText={setMessage}
              placeholder="Añade un mensaje personalizado a la invitación..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </ScrollView>
          
          <View style={styles.modalFooter as any}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.background }]}
              onPress={handleClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.inviteButton,
                { backgroundColor: colors.primary },
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleInvite}
              disabled={isLoading}
            >
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.inviteButtonText as any}>
                {isLoading ? 'Enviando...' : 'Enviar Invitación'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function TeamMembersPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Hooks
  const { currentOrganizationId } = useCurrentOrganization();
  
  const {
    members,
    isLoading,
    isInviting,
    inviteMember,
    changeMemberRole,
    suspendMember,
    removeMember,
    refetch,
  } = useTeamMembers(currentOrganizationId ?? 0);
  
  const { isAdmin, isManager, hasPermission } = useMyPermissions(currentOrganizationId ?? 0);
  
  // Handlers
  const handleInviteMember = useCallback(async (
    email: string,
    role: OrganizationRole,
    message?: string
  ) => {
    await inviteMember({ email, role: role as any, message });
  }, [inviteMember]);
  
  const handleChangeMemberRole = useCallback(async (memberId: number, newRole: string) => {
    try {
      await changeMemberRole(memberId, newRole as any);
      Alert.alert('Éxito', 'Rol actualizado correctamente');
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo cambiar el rol');
    }
  }, [changeMemberRole]);
  
  const handleSuspendMember = useCallback(async (memberId: number) => {
    Alert.prompt(
      'Suspender Miembro',
      'Indica el motivo de la suspensión:',
      async (reason) => {
        if (reason && reason.trim()) {
          try {
            await suspendMember(memberId, reason.trim());
            Alert.alert('Éxito', 'Miembro suspendido');
          } catch (error: unknown) {
            Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo suspender al miembro');
          }
        }
      },
      'plain-text'
    );
  }, [suspendMember]);
  
  const handleRemoveMember = useCallback(async (memberId: number) => {
    Alert.alert(
      'Eliminar Miembro',
      '¿Estás seguro de que quieres eliminar a este miembro? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(memberId);
              Alert.alert('Éxito', 'Miembro eliminado');
            } catch (error: unknown) {
              Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo eliminar al miembro');
            }
          },
        },
      ]
    );
  }, [removeMember]);
  
  // Check permissions
  const canInvite = hasPermission('invitations', 'create');
  const canManageMembers = hasPermission('members', 'update');
  
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Miembros del Equipo',
          headerRight: () => canInvite ? (
            <TouchableOpacity
              style={styles.headerButton as any}
              onPress={() => setShowInviteModal(true)}
            >
              <Ionicons name="person-add-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          ) : null,
        }}
      />
      
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TeamMembersList
          members={members}
          onInviteMember={canInvite ? () => setShowInviteModal(true) : undefined}
          onChangeMemberRole={canManageMembers ? handleChangeMemberRole : undefined}
          onSuspendMember={canManageMembers ? handleSuspendMember : undefined}
          onRemoveMember={canManageMembers ? handleRemoveMember : undefined}
          onRefresh={refetch}
          isLoading={isLoading}
        />
      </View>
      
      <InviteModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteMember}
        isLoading={isInviting}
      />
    </>
  );
}

// ==========================================
// ESTILOS
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    padding: 12,
    borderRadius: 4,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 4,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  inviteButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 4,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
