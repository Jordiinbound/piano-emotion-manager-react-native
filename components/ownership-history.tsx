import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useOwnershipHistory, OwnershipRecord } from '@/hooks/use-ownership-history';
import { useClients } from '@/hooks/use-clients';
import { BorderRadius, Spacing } from '@/constants/theme';

interface OwnershipHistoryProps {
  pianoId: string;
  currentClientId?: string;
  currentClientName?: string;
  onTransfer?: (newClientId: string) => void;
}

const TRANSFER_TYPES: { value: OwnershipRecord['transferType']; label: string; icon: string }[] = [
  { value: 'purchase', label: 'Compra', icon: 'cart' },
  { value: 'sale', label: 'Venta', icon: 'tag' },
  { value: 'gift', label: 'Regalo', icon: 'gift' },
  { value: 'inheritance', label: 'Herencia', icon: 'person.2' },
  { value: 'rental', label: 'Alquiler', icon: 'key' },
  { value: 'other', label: 'Otro', icon: 'ellipsis.circle' },
];

export function OwnershipHistory({ 
  pianoId, 
  currentClientId, 
  currentClientName,
  onTransfer 
}: OwnershipHistoryProps) {
  const { history, isLoading, transferPiano, deleteOwnershipRecord } = useOwnershipHistory(pianoId);
  const { clients } = useClients();
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [transferType, setTransferType] = useState<OwnershipRecord['transferType']>('purchase');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferNotes, setTransferNotes] = useState('');

  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const primary = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const success = useThemeColor({}, 'success');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTransferTypeLabel = (type: OwnershipRecord['transferType']) => {
    return TRANSFER_TYPES.find(t => t.value === type)?.label || type;
  };

  const getTransferTypeIcon = (type: OwnershipRecord['transferType']) => {
    return TRANSFER_TYPES.find(t => t.value === type)?.icon || 'ellipsis.circle';
  };

  const handleTransfer = () => {
    if (!selectedClientId) return;

    const selectedClient = clients.find(c => c.id === selectedClientId);
    if (!selectedClient) return;

    transferPiano(
      selectedClientId,
      selectedClient.name,
      transferType,
      transferDate,
      transferNotes || undefined
    );

    if (onTransfer) {
      onTransfer(selectedClientId);
    }

    // Resetear formulario
    setShowTransferModal(false);
    setSelectedClientId('');
    setTransferType('purchase');
    setTransferDate(new Date().toISOString().split('T')[0]);
    setTransferNotes('');
  };

  return (
    <View style={styles.container}>
      {/* Cabecera */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconSymbol name="clock.arrow.circlepath" size={20} color={primary} />
          <ThemedText style={styles.headerTitle}>Historial de Propietarios</ThemedText>
        </View>
        <Pressable
          style={[styles.transferButton, { backgroundColor: primary }]}
          onPress={() => setShowTransferModal(true)}
        >
          <IconSymbol name="arrow.right.arrow.left" size={14} color="#fff" />
          <ThemedText style={styles.transferButtonText}>Transferir</ThemedText>
        </Pressable>
      </View>

      {/* Propietario actual */}
      {currentClientName && (
        <View style={[styles.currentOwner, { backgroundColor: success + '15', borderColor: success }]}>
          <IconSymbol name="person.fill.checkmark" size={20} color={success} />
          <View style={styles.currentOwnerInfo}>
            <ThemedText style={[styles.currentOwnerLabel, { color: success }]}>
              Propietario actual
            </ThemedText>
            <ThemedText style={styles.currentOwnerName}>{currentClientName}</ThemedText>
          </View>
        </View>
      )}

      {/* Lista de historial */}
      {history.length > 0 ? (
        <View style={styles.historyList}>
          {history.map((record, index) => (
            <View 
              key={record.id} 
              style={[
                styles.historyItem,
                { backgroundColor: cardBg, borderColor: border },
                index === 0 && record.endDate === null && { borderColor: success },
              ]}
            >
              <View style={styles.historyItemLeft}>
                <View style={[styles.historyIcon, { backgroundColor: primary + '20' }]}>
                  <IconSymbol 
                    name={getTransferTypeIcon(record.transferType) as any} 
                    size={16} 
                    color={primary} 
                  />
                </View>
                <View style={styles.historyInfo}>
                  <ThemedText style={styles.historyClientName}>{record.clientName}</ThemedText>
                  <ThemedText style={[styles.historyDates, { color: textSecondary }]}>
                    {formatDate(record.startDate)}
                    {record.endDate ? ` - ${formatDate(record.endDate)}` : ' - Actual'}
                  </ThemedText>
                  <View style={styles.historyMeta}>
                    <View style={[styles.historyBadge, { backgroundColor: primary + '15' }]}>
                      <ThemedText style={[styles.historyBadgeText, { color: primary }]}>
                        {getTransferTypeLabel(record.transferType)}
                      </ThemedText>
                    </View>
                  </View>
                  {record.notes && (
                    <ThemedText style={[styles.historyNotes, { color: textSecondary }]}>
                      {record.notes}
                    </ThemedText>
                  )}
                </View>
              </View>
              
              {record.endDate !== null && (
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => deleteOwnershipRecord(record.id)}
                >
                  <IconSymbol name="trash" size={16} color={textSecondary} />
                </Pressable>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.emptyState, { backgroundColor: cardBg }]}>
          <IconSymbol name="clock" size={32} color={textSecondary} />
          <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
            No hay historial de propietarios registrado
          </ThemedText>
        </View>
      )}

      {/* Modal de transferencia */}
      <Modal
        visible={showTransferModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTransferModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Transferir Piano</ThemedText>
              <Pressable onPress={() => setShowTransferModal(false)}>
                <IconSymbol name="xmark.circle.fill" size={28} color={textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Selector de cliente */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Nuevo propietario</ThemedText>
                <View style={[styles.clientList, { backgroundColor: backgroundColor }]}>
                  {clients
                    .filter(c => c.id !== currentClientId)
                    .map(client => (
                      <Pressable
                        key={client.id}
                        style={[
                          styles.clientOption,
                          { borderColor: border },
                          selectedClientId === client.id && { 
                            borderColor: primary, 
                            backgroundColor: primary + '10' 
                          },
                        ]}
                        onPress={() => setSelectedClientId(client.id)}
                      >
                        <ThemedText style={styles.clientOptionName}>{client.name}</ThemedText>
                        {selectedClientId === client.id && (
                          <IconSymbol name="checkmark.circle.fill" size={20} color={primary} />
                        )}
                      </Pressable>
                    ))}
                </View>
              </View>

              {/* Tipo de transferencia */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Tipo de transferencia</ThemedText>
                <View style={styles.transferTypes}>
                  {TRANSFER_TYPES.map(type => (
                    <Pressable
                      key={type.value}
                      style={[
                        styles.transferTypeOption,
                        { borderColor: border },
                        transferType === type.value && { 
                          borderColor: primary, 
                          backgroundColor: primary + '10' 
                        },
                      ]}
                      onPress={() => setTransferType(type.value)}
                    >
                      <IconSymbol 
                        name={type.icon as any} 
                        size={18} 
                        color={transferType === type.value ? primary : textSecondary} 
                      />
                      <ThemedText style={[
                        styles.transferTypeLabel,
                        transferType === type.value && { color: primary },
                      ]}>
                        {type.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Fecha */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Fecha de transferencia</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: backgroundColor, color: textColor, borderColor: border }]}
                  value={transferDate}
                  onChangeText={setTransferDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={textSecondary}
                />
              </View>

              {/* Notas */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Notas (opcional)</ThemedText>
                <TextInput
                  style={[
                    styles.input, 
                    styles.textArea,
                    { backgroundColor: backgroundColor, color: textColor, borderColor: border }
                  ]}
                  value={transferNotes}
                  onChangeText={setTransferNotes}
                  placeholder="Añadir notas sobre la transferencia..."
                  placeholderTextColor={textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.cancelButton, { borderColor: border }]}
                onPress={() => setShowTransferModal(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.confirmButton, 
                  { backgroundColor: primary },
                  !selectedClientId && styles.buttonDisabled,
                ]}
                onPress={handleTransfer}
                disabled={!selectedClientId}
              >
                <ThemedText style={styles.confirmButtonText}>Confirmar</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  transferButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  currentOwner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  currentOwnerInfo: {
    flex: 1,
  },
  currentOwnerLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  currentOwnerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  historyList: {
    gap: Spacing.sm,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  historyItemLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: Spacing.sm,
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyInfo: {
    flex: 1,
  },
  historyClientName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  historyDates: {
    fontSize: 13,
    marginBottom: 4,
  },
  historyMeta: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  historyBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.sm,
  },
  historyBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  historyNotes: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius.sm,
  },
  emptyText: {
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
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
    fontWeight: '600',
  },
  modalBody: {
    padding: Spacing.lg,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  clientList: {
    borderRadius: BorderRadius.sm,
    maxHeight: 200,
  },
  clientOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  clientOptionName: {
    fontSize: 15,
  },
  transferTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  transferTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  transferTypeLabel: {
    fontSize: 13,
  },
  input: {
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default OwnershipHistory;
