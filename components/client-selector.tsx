import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  Platform,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { Client, getClientFullName } from '@/types';

interface ClientSelectorProps {
  /** List of available clients */
  clients: Client[];
  /** Currently selected client ID */
  selectedClientId?: string;
  /** Callback when a client is selected */
  onClientSelect: (clientId: string) => void;
  /** Callback to create a new client */
  onCreateClient?: () => void;
  /** Show "Create new client" option */
  showCreateOption?: boolean;
  /** Custom label */
  label?: string;
  /** Is required field */
  required?: boolean;
}

export function ClientSelector({
  clients,
  selectedClientId,
  onClientSelect,
  onCreateClient,
  showCreateOption = true,
  label = 'Cliente',
  required = true,
}: ClientSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'tint');
  const accent = useThemeColor({}, 'accent');

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  // Filter clients based on search text
  const filteredClients = clients.filter((client) => {
    const fullName = getClientFullName(client).toLowerCase();
    const searchLower = searchText.toLowerCase();
    return fullName.includes(searchLower) || client.email?.toLowerCase().includes(searchLower);
  });

  const handleSelectClient = (clientId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClientSelect(clientId);
    setModalVisible(false);
    setSearchText('');
  };

  const handleCreateClient = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setModalVisible(false);
    setSearchText('');
    onCreateClient?.();
  };

  const renderClientItem = ({ item }: { item: Client }) => {
    const isSelected = item.id === selectedClientId;

    return (
      <Pressable
        style={[
          styles.clientItem,
          { borderBottomColor: borderColor },
          isSelected && { backgroundColor: `${accent}15` },
        ]}
        onPress={() => handleSelectClient(item.id)}
      >
        <View style={styles.clientInfo}>
          <View
            style={[
              styles.clientAvatar,
              { backgroundColor: `${primary}20` },
            ]}
          >
            <ThemedText style={styles.avatarText}>
              {getClientFullName(item).charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.clientDetails}>
            <ThemedText
              style={[
                styles.clientName,
                isSelected && { color: accent, fontWeight: '600' },
              ]}
              numberOfLines={1}
            >
              {getClientFullName(item)}
            </ThemedText>
            {item.email && (
              <ThemedText
                style={[styles.clientEmail, { color: textSecondary }]}
                numberOfLines={1}
              >
                {item.email}
              </ThemedText>
            )}
            {item.phone && (
              <ThemedText
                style={[styles.clientPhone, { color: textSecondary }]}
                numberOfLines={1}
              >
                {item.phone}
              </ThemedText>
            )}
          </View>
        </View>
        {isSelected && (
          <IconSymbol name="checkmark.circle.fill" size={24} color={accent} />
        )}
      </Pressable>
    );
  };

  const renderCreateOption = () => {
    if (!showCreateOption || !onCreateClient) return null;

    return (
      <Pressable
        style={[
          styles.createOption,
          { borderTopColor: borderColor, backgroundColor: `${primary}08` },
        ]}
        onPress={handleCreateClient}
      >
        <View style={[styles.createIconContainer, { backgroundColor: `${primary}20` }]}>
          <IconSymbol name="plus.circle" size={24} color={primary} />
        </View>
        <View style={styles.createTextContainer}>
          <ThemedText style={[styles.createText, { color: primary }]}>
            Crear nuevo cliente
          </ThemedText>
          <ThemedText style={[styles.createSubtext, { color: textSecondary }]}>
            Agregar un cliente que no está en la lista
          </ThemedText>
        </View>
        <IconSymbol name="chevron.right" size={16} color={textSecondary} />
      </Pressable>
    );
  };

  // Show warning if no clients and create option is available
  const showNoClientsWarning =
    clients.length === 0 && showCreateOption && onCreateClient;

  return (
    <>
      {/* Trigger Button */}
      <Pressable
        style={[
          styles.triggerButton,
          { borderColor, backgroundColor: cardBg },
          showNoClientsWarning && { borderColor: '#FF6B6B' },
        ]}
        onPress={() => {
          if (showNoClientsWarning) {
            Alert.alert(
              'Sin clientes registrados',
              '¿Deseas crear un nuevo cliente?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Crear cliente',
                  onPress: handleCreateClient,
                  style: 'default',
                },
              ]
            );
          } else {
            setModalVisible(true);
          }
        }}
      >
        <View style={styles.triggerContent}>
          <View style={[styles.triggerIconContainer, { backgroundColor: `${primary}15` }]}>
            <IconSymbol name="person.fill" size={18} color={primary} />
          </View>
          <View style={styles.triggerText}>
            <ThemedText style={[styles.triggerLabel, { color: textSecondary }]}>
              {label}
              {required && <ThemedText style={{ color: '#FF6B6B' }}> *</ThemedText>}
            </ThemedText>
            <ThemedText
              style={[
                styles.triggerValue,
                { color: selectedClient ? textColor : textSecondary },
              ]}
              numberOfLines={1}
            >
              {selectedClient ? getClientFullName(selectedClient) : 'Haz clic para seleccionar/crear un cliente'}
            </ThemedText>
          </View>
        </View>
        <IconSymbol
          name={showNoClientsWarning ? 'exclamationmark.circle.fill' : 'chevron.down'}
          size={20}
          color={showNoClientsWarning ? '#FF6B6B' : textSecondary}
        />
      </Pressable>

      {/* Client Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          setSearchText('');
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <ThemedView style={[styles.modalContent, { backgroundColor: cardBg }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <ThemedText style={styles.modalTitle}>Seleccionar {label}</ThemedText>
              <Pressable
                style={styles.closeButton}
                onPress={() => {
                  setModalVisible(false);
                  setSearchText('');
                }}
              >
                <IconSymbol name="xmark.circle.fill" size={28} color={textSecondary} />
              </Pressable>
            </View>

            {/* Search Input */}
            <View style={[styles.searchContainer, { borderBottomColor: borderColor }]}>
              <IconSymbol name="magnifyingglass" size={18} color={textSecondary} />
              <ThemedText
                style={[styles.searchInput, { color: textColor }]}
                placeholder="Buscar cliente..."
                placeholderTextColor={textSecondary}
                onChangeText={setSearchText}
                value={searchText}
              />
              {searchText.length > 0 && (
                <Pressable onPress={() => setSearchText('')}>
                  <IconSymbol name="xmark.circle.fill" size={18} color={textSecondary} />
                </Pressable>
              )}
            </View>

            {/* Client List */}
            {filteredClients.length > 0 ? (
              <FlatList
                data={filteredClients}
                keyExtractor={(item) => item.id}
                renderItem={renderClientItem}
                contentContainerStyle={styles.listContent}
                scrollEnabled={true}
              />
            ) : (
              <View style={styles.emptyState}>
                <IconSymbol name="person.slash" size={48} color={textSecondary} />
                <ThemedText style={[styles.emptyStateText, { color: textSecondary }]}>
                  {clients.length === 0
                    ? 'No hay clientes registrados'
                    : 'No se encontraron resultados'}
                </ThemedText>
              </View>
            )}

            {/* Create Option */}
            {showCreateOption && onCreateClient && (
              <>
                <View style={[styles.divider, { backgroundColor: borderColor }]} />
                {renderCreateOption()}
              </>
            )}
          </ThemedView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Trigger Button Styles
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  triggerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerText: {
    gap: 4,
    flex: 1,
  },
  triggerLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  triggerValue: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: Spacing.xs,
  },

  // Search Input Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },

  // Client List Styles
  listContent: {
    paddingHorizontal: Spacing.md,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  clientDetails: {
    gap: 2,
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '500',
  },
  clientEmail: {
    fontSize: 13,
  },
  clientPhone: {
    fontSize: 13,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: Spacing.md,
    textAlign: 'center',
  },

  // Create Option Styles
  divider: {
    height: 1,
  },
  createOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  createIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createTextContainer: {
    gap: 2,
    flex: 1,
  },
  createText: {
    fontSize: 16,
    fontWeight: '600',
  },
  createSubtext: {
    fontSize: 13,
  },
});

export default ClientSelector;
