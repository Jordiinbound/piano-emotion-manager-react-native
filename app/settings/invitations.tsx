import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { trpc } from '../../lib/trpc';
import { IconSymbol } from '../../components/ui/icon-symbol';

export default function InvitationsScreen() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: invitations, isLoading, refetch } = trpc.invitations.list.useQuery();
  const createInvitation = trpc.invitations.create.useMutation();
  const revokeInvitation = trpc.invitations.revoke.useMutation();

  const handleSendInvitation = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createInvitation.mutateAsync({ email });
      Alert.alert(
        'Invitación enviada',
        `Se ha creado una invitación para ${email}\n\nEnlace: ${result.invitationLink}`,
        [
          {
            text: 'Copiar enlace',
            onPress: () => {
              // En producción, usar Clipboard.setString
              console.log('Enlace:', result.invitationLink);
            },
          },
          { text: 'OK' },
        ]
      );
      setEmail('');
      refetch();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo enviar la invitación');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeInvitation = async (id: string, email: string) => {
    Alert.alert(
      'Revocar invitación',
      `¿Estás seguro de que quieres revocar la invitación para ${email}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Revocar',
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeInvitation.mutateAsync({ id });
              Alert.alert('Éxito', 'Invitación revocada');
              refetch();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo revocar la invitación');
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Gestión de Invitaciones',
          headerBackTitle: 'Atrás',
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Invitar Usuarios</Text>
          <Text style={styles.subtitle}>
            Solo los usuarios invitados podrán registrarse en la aplicación
          </Text>
        </View>

        {/* Formulario de invitación */}
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Email del usuario</Text>
          <TextInput
            style={styles.input}
            placeholder="usuario@ejemplo.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleSendInvitation}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <IconSymbol name="paperplane.fill" size={18} color="#FFFFFF" />
                <Text style={styles.buttonText}>Enviar Invitación</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Lista de invitaciones */}
        <View style={styles.listCard}>
          <Text style={styles.listTitle}>Invitaciones Enviadas</Text>
          {isLoading ? (
            <ActivityIndicator style={styles.loader} />
          ) : invitations && invitations.length > 0 ? (
            invitations.map((invitation) => (
              <View key={invitation.id} style={styles.invitationItem}>
                <View style={styles.invitationInfo}>
                  <Text style={styles.invitationEmail}>{invitation.email}</Text>
                  <Text style={styles.invitationDate}>
                    Enviada: {formatDate(invitation.createdAt)}
                  </Text>
                  <View style={styles.invitationStatus}>
                    {invitation.used ? (
                      <View style={[styles.statusBadge, styles.statusUsed]}>
                        <Text style={styles.statusText}>Usada</Text>
                      </View>
                    ) : new Date() > new Date(invitation.expiresAt) ? (
                      <View style={[styles.statusBadge, styles.statusExpired]}>
                        <Text style={styles.statusText}>Expirada</Text>
                      </View>
                    ) : (
                      <View style={[styles.statusBadge, styles.statusPending]}>
                        <Text style={styles.statusText}>Pendiente</Text>
                      </View>
                    )}
                  </View>
                </View>
                {!invitation.used && new Date() <= new Date(invitation.expiresAt) && (
                  <Pressable
                    style={styles.revokeButton}
                    onPress={() => handleRevokeInvitation(invitation.id, invitation.email)}
                  >
                    <IconSymbol name="xmark.circle.fill" size={24} color="#EF4444" />
                  </Pressable>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No hay invitaciones enviadas</Text>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  button: {
    backgroundColor: '#5B9A8B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 4,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  loader: {
    marginVertical: 20,
  },
  invitationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  invitationInfo: {
    flex: 1,
  },
  invitationEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  invitationDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  invitationStatus: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusUsed: {
    backgroundColor: '#D1FAE5',
  },
  statusExpired: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  revokeButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    paddingVertical: 20,
  },
});
