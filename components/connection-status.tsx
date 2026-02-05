import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Pressable,
  Modal,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { BorderRadius, Spacing } from '@/constants/theme';

interface ConnectionStatusProps {
  /** Mostrar siempre o solo cuando hay problemas */
  showAlways?: boolean;
  /** Posición del indicador */
  position?: 'top' | 'bottom';
}

export function ConnectionStatus({ showAlways = false, position = 'bottom' }: ConnectionStatusProps) {
  const { isOnline, isSyncing, pendingOperations, lastSyncAt, forceSync, lastError } = useOfflineSync();
  const [showDetails, setShowDetails] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));

  const cardBg = useThemeColor({}, 'cardBackground');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const error = useThemeColor({}, 'error');
  const primary = useThemeColor({}, 'tint');

  // Determinar si mostrar el banner
  const shouldShow = showAlways || !isOnline || pendingOperations > 0 || isSyncing;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: shouldShow ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [shouldShow, slideAnim]);

  const getStatusColor = () => {
    if (!isOnline) return error;
    if (pendingOperations > 0) return warning;
    return success;
  };

  const getStatusIcon = () => {
    if (isSyncing) return 'arrow.triangle.2.circlepath';
    if (!isOnline) return 'wifi.slash';
    if (pendingOperations > 0) return 'clock.arrow.circlepath';
    return 'checkmark.circle.fill';
  };

  const getStatusText = () => {
    if (isSyncing) return 'Sincronizando...';
    if (!isOnline) return 'Sin conexión';
    if (pendingOperations > 0) return `${pendingOperations} pendiente${pendingOperations > 1 ? 's' : ''}`;
    return 'Conectado';
  };

  const formatLastSync = () => {
    if (!lastSyncAt) return 'Nunca';
    const date = new Date(lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    
    return date.toLocaleDateString();
  };

  const handleSync = async () => {
    if (isOnline && !isSyncing) {
      try {
        await forceSync();
      } catch (err) {
      }
    }
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [position === 'bottom' ? 100 : -100, 0],
  });

  if (!shouldShow && !showAlways) {
    return null;
  }

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          position === 'bottom' ? styles.bottom : styles.top,
          { transform: [{ translateY }] },
        ]}
      >
        <Pressable
          style={[styles.banner, { backgroundColor: cardBg }]}
          onPress={() => setShowDetails(true)}
        >
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]}>
            <IconSymbol 
              name={getStatusIcon() as any} 
              size={14} 
              color="#fff" 
            />
          </View>
          <ThemedText style={styles.statusText}>{getStatusText()}</ThemedText>
          {pendingOperations > 0 && isOnline && !isSyncing && (
            <Pressable 
              style={[styles.syncButton, { backgroundColor: primary }]}
              onPress={handleSync}
            >
              <IconSymbol name="arrow.clockwise" size={12} color="#fff" />
            </Pressable>
          )}
        </Pressable>
      </Animated.View>

      {/* Modal de detalles */}
      <Modal
        visible={showDetails}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Estado de Sincronización</ThemedText>
              <Pressable onPress={() => setShowDetails(false)}>
                <IconSymbol name="xmark.circle.fill" size={28} color={textSecondary} />
              </Pressable>
            </View>

            <View style={styles.statusSection}>
              <View style={styles.statusRow}>
                <View style={[styles.bigStatusDot, { backgroundColor: getStatusColor() }]}>
                  <IconSymbol name={getStatusIcon() as any} size={24} color="#fff" />
                </View>
                <View style={styles.statusInfo}>
                  <ThemedText style={styles.statusLabel}>
                    {isOnline ? 'Conectado' : 'Sin conexión'}
                  </ThemedText>
                  <ThemedText style={[styles.statusSubtext, { color: textSecondary }]}>
                    {isSyncing ? 'Sincronizando datos...' : 
                     !isOnline ? 'Los cambios se guardarán localmente' :
                     'Todos los datos están sincronizados'}
                  </ThemedText>
                </View>
              </View>
            </View>

            <View style={[styles.infoSection, { borderTopColor: textSecondary + '20' }]}>
              <View style={styles.infoRow}>
                <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>
                  Última sincronización
                </ThemedText>
                <ThemedText style={styles.infoValue}>{formatLastSync()}</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>
                  Operaciones pendientes
                </ThemedText>
                <ThemedText style={styles.infoValue}>{pendingOperations}</ThemedText>
              </View>
              {lastError && (
                <View style={styles.infoRow}>
                  <ThemedText style={[styles.infoLabel, { color: error }]}>
                    Último error
                  </ThemedText>
                  <ThemedText style={[styles.infoValue, { color: error }]} numberOfLines={2}>
                    {lastError}
                  </ThemedText>
                </View>
              )}
            </View>

            {pendingOperations > 0 && isOnline && (
              <Pressable
                style={[styles.syncFullButton, { backgroundColor: primary }]}
                onPress={handleSync}
                disabled={isSyncing}
              >
                <IconSymbol name="arrow.clockwise" size={18} color="#fff" />
                <ThemedText style={styles.syncButtonText}>
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
                </ThemedText>
              </Pressable>
            )}

            <ThemedText style={[styles.helpText, { color: textSecondary }]}>
              {!isOnline 
                ? 'Puedes seguir trabajando sin conexión. Los cambios se sincronizarán automáticamente cuando vuelvas a estar conectado.'
                : 'La sincronización se realiza automáticamente cada 5 minutos.'}
            </ThemedText>
          </ThemedView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: Spacing.md,
  },
  top: {
    top: 0,
  },
  bottom: {
    bottom: 0,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: Spacing.sm,
  },
  statusDot: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  syncButton: {
    width: 28,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  statusSection: {
    marginBottom: Spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bigStatusDot: {
    width: 48,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 14,
  },
  infoSection: {
    borderTopWidth: 1,
    paddingTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: '50%',
    textAlign: 'right',
  },
  syncFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ConnectionStatus;
