/**
 * Pantalla de Gestión de Usuarios por Partner
 * 
 * Permite ver y gestionar los usuarios asociados a un partner,
 * incluyendo agregar, editar permisos y remover usuarios.
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { useSnackbar } from '@/components/snackbar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { trpc } from '@/utils/trpc';
import { useLanguage } from '@/contexts/language-context';

interface PartnerUser {
  id: number;
  userId: number;
  partnerId: number;
  role: 'owner' | 'admin' | 'user';
  permissions: {
    canManageUsers: boolean;
    canManageClients: boolean;
    canManagePianos: boolean;
    canManageServices: boolean;
    canViewReports: boolean;
    canManageSettings: boolean;
  };
  user: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  createdAt: string;
}

export default function PartnerUsersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { success: showSuccess, error: showError } = useSnackbar();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PartnerUser | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');

  // Colores del tema
  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accent = useThemeColor({}, 'accent');
  const textColor = useThemeColor({}, 'text');
  const error = useThemeColor({}, 'error');
  const success = useThemeColor({}, 'success');

  // Queries
  const { data: partner } = trpc.partners.getById.useQuery({ id: parseInt(id) });
  const { data: usersData, isLoading, refetch } = trpc.partners.listUsers.useQuery({
    partnerId: parseInt(id),
  });

  // Mutations
  const addUserMutation = trpc.partners.addUser.useMutation();
  const updatePermissionsMutation = trpc.partners.updateUserPermissions.useMutation();
  const removeUserMutation = trpc.partners.removeUser.useMutation();

  const users = usersData?.users || [];

  // Filtrar usuarios
  const filteredUsers = users.filter((user: PartnerUser) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.user.email.toLowerCase().includes(query) ||
      user.user.firstName?.toLowerCase().includes(query) ||
      user.user.lastName?.toLowerCase().includes(query)
    );
  });

  // Agregar usuario
  const handleAddUser = async () => {
    if (!newUserEmail.trim()) {
      showError(t('partners.users.errors.emailRequired'));
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await addUserMutation.mutateAsync({
        partnerId: parseInt(id),
        email: newUserEmail,
        role: newUserRole,
      });
      showSuccess(t('partners.users.userAdded'));
      setShowAddModal(false);
      setNewUserEmail('');
      setNewUserRole('user');
      refetch();
    } catch (err: any) {
      showError(err.message || t('partners.users.errors.addFailed'));
    }
  };

  // Actualizar permisos
  const handleUpdatePermissions = async (permissions: PartnerUser['permissions']) => {
    if (!selectedUser) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await updatePermissionsMutation.mutateAsync({
        partnerUserId: selectedUser.id,
        permissions,
      });
      showSuccess(t('partners.users.permissionsUpdated'));
      setShowPermissionsModal(false);
      setSelectedUser(null);
      refetch();
    } catch (err: any) {
      showError(err.message || t('partners.users.errors.updateFailed'));
    }
  };

  // Remover usuario
  const handleRemoveUser = (user: PartnerUser) => {
    Alert.alert(
      t('partners.users.confirmRemove.title'),
      t('partners.users.confirmRemove.message', { email: user.user.email }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await removeUserMutation.mutateAsync({
                partnerUserId: user.id,
              });
              showSuccess(t('partners.users.userRemoved'));
              refetch();
            } catch (err: any) {
              showError(err.message || t('partners.users.errors.removeFailed'));
            }
          },
        },
      ]
    );
  };

  // Obtener nombre completo del usuario
  const getUserName = (user: PartnerUser['user']) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email;
  };

  // Obtener color según rol
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return accent;
      case 'admin':
        return success;
      case 'user':
        return textSecondary;
      default:
        return textSecondary;
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Breadcrumbs
          items={[
            { label: t('partners.title'), onPress: () => router.push('/admin/partners') },
            { label: partner?.name || '', onPress: () => router.back() },
            { label: t('partners.users.title'), onPress: () => {} },
          ]}
        />
        <ThemedText style={styles.title}>{t('partners.users.title')}</ThemedText>
        <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
          {t('partners.users.subtitle', { count: users.length })}
        </ThemedText>
      </View>

      {/* Barra de búsqueda */}
      <View style={[styles.searchContainer, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.searchInputContainer}>
          <IconSymbol name="magnifyingglass" size={20} color={textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder={t('partners.users.search')}
            placeholderTextColor={textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <IconSymbol name="xmark.circle.fill" size={20} color={textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Lista de usuarios */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accent} />
            <ThemedText style={[styles.loadingText, { color: textSecondary }]}>
              {t('partners.users.loading')}
            </ThemedText>
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="person.2" size={64} color={textSecondary} />
            <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
              {searchQuery
                ? t('partners.users.noResults')
                : t('partners.users.empty')}
            </ThemedText>
          </View>
        ) : (
          filteredUsers.map((user: PartnerUser) => (
            <View key={user.id} style={[styles.userCard, { backgroundColor: cardBg, borderColor }]}>
              {/* Avatar y nombre */}
              <View style={styles.userHeader}>
                <View style={[styles.userAvatar, { backgroundColor: accent + '20', borderColor: accent }]}>
                  <IconSymbol name="person.fill" size={24} color={accent} />
                </View>
                <View style={styles.userInfo}>
                  <ThemedText style={styles.userName}>{getUserName(user.user)}</ThemedText>
                  <ThemedText style={[styles.userEmail, { color: textSecondary }]}>
                    {user.user.email}
                  </ThemedText>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) + '20' }]}>
                  <ThemedText style={[styles.roleText, { color: getRoleColor(user.role) }]}>
                    {t(`partners.users.roles.${user.role}`)}
                  </ThemedText>
                </View>
              </View>

              {/* Permisos */}
              <View style={styles.permissionsContainer}>
                <ThemedText style={[styles.permissionsTitle, { color: textSecondary }]}>
                  {t('partners.users.permissions.title')}
                </ThemedText>
                <View style={styles.permissionsList}>
                  {Object.entries(user.permissions).map(([key, value]) => (
                    value && (
                      <View key={key} style={[styles.permissionChip, { backgroundColor: success + '20' }]}>
                        <IconSymbol name="checkmark.circle.fill" size={14} color={success} />
                        <ThemedText style={[styles.permissionText, { color: success }]}>
                          {t(`partners.users.permissions.${key}`)}
                        </ThemedText>
                      </View>
                    )
                  ))}
                </View>
              </View>

              {/* Acciones */}
              {user.role !== 'owner' && (
                <View style={styles.userActions}>
                  <Pressable
                    style={[styles.actionButton, { borderColor }]}
                    onPress={() => {
                      setSelectedUser(user);
                      setShowPermissionsModal(true);
                    }}
                  >
                    <IconSymbol name="lock.shield" size={16} color={accent} />
                    <ThemedText style={[styles.actionButtonText, { color: accent }]}>
                      {t('partners.users.editPermissions')}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, { borderColor }]}
                    onPress={() => handleRemoveUser(user)}
                  >
                    <IconSymbol name="trash" size={16} color={error} />
                    <ThemedText style={[styles.actionButtonText, { color: error }]}>
                      {t('common.remove')}
                    </ThemedText>
                  </Pressable>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Botón flotante para agregar usuario */}
      <Pressable
        style={[styles.fab, { backgroundColor: accent, bottom: insets.bottom + Spacing.lg }]}
        onPress={() => setShowAddModal(true)}
      >
        <IconSymbol name="person.badge.plus" size={24} color="#fff" />
      </Pressable>

      {/* Modal para agregar usuario */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>{t('partners.users.addUser')}</ThemedText>
              <Pressable onPress={() => setShowAddModal(false)}>
                <IconSymbol name="xmark" size={24} color={textColor} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.field}>
                <ThemedText style={[styles.label, { color: textSecondary }]}>
                  {t('partners.users.form.email')}
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor, borderColor, color: textColor }]}
                  value={newUserEmail}
                  onChangeText={setNewUserEmail}
                  placeholder={t('partners.users.form.emailPlaceholder')}
                  placeholderTextColor={textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.field}>
                <ThemedText style={[styles.label, { color: textSecondary }]}>
                  {t('partners.users.form.role')}
                </ThemedText>
                <View style={styles.roleButtons}>
                  {['admin', 'user'].map((role) => (
                    <Pressable
                      key={role}
                      style={[
                        styles.roleButton,
                        {
                          backgroundColor: newUserRole === role ? accent : 'transparent',
                          borderColor: newUserRole === role ? accent : borderColor,
                        },
                      ]}
                      onPress={() => setNewUserRole(role as typeof newUserRole)}
                    >
                      <ThemedText
                        style={[
                          styles.roleButtonText,
                          { color: newUserRole === role ? '#fff' : textColor },
                        ]}
                      >
                        {t(`partners.users.roles.${role}`)}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonSecondary, { borderColor }]}
                onPress={() => setShowAddModal(false)}
              >
                <ThemedText style={[styles.modalButtonText, { color: textColor }]}>
                  {t('common.cancel')}
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: accent }]}
                onPress={handleAddUser}
                disabled={addUserMutation.isLoading}
              >
                {addUserMutation.isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={[styles.modalButtonText, { color: '#fff' }]}>
                    {t('common.add')}
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para editar permisos */}
      <Modal
        visible={showPermissionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPermissionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {t('partners.users.editPermissions')}
              </ThemedText>
              <Pressable onPress={() => setShowPermissionsModal(false)}>
                <IconSymbol name="xmark" size={24} color={textColor} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedUser && (
                <>
                  <ThemedText style={[styles.permissionsSubtitle, { color: textSecondary }]}>
                    {getUserName(selectedUser.user)}
                  </ThemedText>

                  {Object.entries(selectedUser.permissions).map(([key, value]) => (
                    <View key={key} style={styles.permissionRow}>
                      <View style={styles.permissionInfo}>
                        <ThemedText style={styles.permissionLabel}>
                          {t(`partners.users.permissions.${key}`)}
                        </ThemedText>
                        <ThemedText style={[styles.permissionDescription, { color: textSecondary }]}>
                          {t(`partners.users.permissions.${key}Description`)}
                        </ThemedText>
                      </View>
                      <Switch
                        value={value}
                        onValueChange={(newValue) => {
                          setSelectedUser({
                            ...selectedUser,
                            permissions: {
                              ...selectedUser.permissions,
                              [key]: newValue,
                            },
                          });
                        }}
                        trackColor={{ false: borderColor, true: accent }}
                        thumbColor="#fff"
                      />
                    </View>
                  ))}
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonSecondary, { borderColor }]}
                onPress={() => setShowPermissionsModal(false)}
              >
                <ThemedText style={[styles.modalButtonText, { color: textColor }]}>
                  {t('common.cancel')}
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: accent }]}
                onPress={() => selectedUser && handleUpdatePermissions(selectedUser.permissions)}
                disabled={updatePermissionsMutation.isLoading}
              >
                {updatePermissionsMutation.isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={[styles.modalButtonText, { color: '#fff' }]}>
                    {t('common.save')}
                  </ThemedText>
                )}
              </Pressable>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  userCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  permissionsContainer: {
    gap: Spacing.xs,
  },
  permissionsTitle: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  permissionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  permissionText: {
    fontSize: 11,
    fontWeight: '500',
  },
  userActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  roleButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonPrimary: {},
  modalButtonSecondary: {
    borderWidth: 1,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  permissionsSubtitle: {
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  permissionInfo: {
    flex: 1,
    gap: 4,
  },
  permissionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  permissionDescription: {
    fontSize: 12,
  },
});
