import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWebNotifications } from '@/hooks/use-web-notifications';
import { NotificationItem } from '@/services/notification-service';
import { BorderRadius, Spacing } from '@/constants/theme';

interface NotificationCenterProps {
  /** Mostrar como modal o inline */
  mode?: 'modal' | 'inline';
  /** Callback cuando se cierra el modal */
  onClose?: () => void;
  /** Visible (solo para modo modal) */
  visible?: boolean;
}

export function NotificationCenter({ mode = 'inline', onClose, visible = true }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useWebNotifications();

  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const primary = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const error = useThemeColor({}, 'error');

  const handleNotificationPress = async (notification: NotificationItem) => {
    await markAsRead(notification.id);
    
    if (notification.actionUrl) {
      if (onClose) onClose();
      router.push(notification.actionUrl as any);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Hace ${diffDays}d`;
    
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const content = (
    <ThemedView style={[styles.container, mode === 'modal' && styles.modalContainer]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: border }]}>
        <View style={styles.headerLeft}>
          <ThemedText style={styles.title}>Notificaciones</ThemedText>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: primary }]}>
              <ThemedText style={styles.badgeText}>{unreadCount}</ThemedText>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {notifications.length > 0 && (
            <>
              <Pressable 
                style={styles.headerButton}
                onPress={markAllAsRead}
              >
                <ThemedText style={[styles.headerButtonText, { color: primary }]}>
                  Marcar leídas
                </ThemedText>
              </Pressable>
              <Pressable 
                style={styles.headerButton}
                onPress={clearAll}
              >
                <IconSymbol name="trash" size={18} color={textSecondary} />
              </Pressable>
            </>
          )}
          {mode === 'modal' && onClose && (
            <Pressable style={styles.closeButton} onPress={onClose}>
              <IconSymbol name="xmark.circle.fill" size={28} color={textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Lista de notificaciones */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="bell.slash" size={48} color={textSecondary} />
            <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
              No tienes notificaciones
            </ThemedText>
          </View>
        ) : (
          notifications.map((notification) => (
            <Pressable
              key={notification.id}
              style={[
                styles.notificationItem,
                { 
                  backgroundColor: notification.read ? 'transparent' : primary + '08',
                  borderBottomColor: border,
                },
              ]}
              onPress={() => handleNotificationPress(notification)}
            >
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <ThemedText 
                    style={[
                      styles.notificationTitle,
                      !notification.read && styles.unreadTitle,
                    ]}
                    numberOfLines={1}
                  >
                    {notification.title}
                  </ThemedText>
                  <ThemedText style={[styles.notificationTime, { color: textSecondary }]}>
                    {formatTime(notification.createdAt)}
                  </ThemedText>
                </View>
                <ThemedText 
                  style={[styles.notificationBody, { color: textSecondary }]}
                  numberOfLines={2}
                >
                  {notification.body}
                </ThemedText>
              </View>
              
              {/* Indicador de no leída */}
              {!notification.read && (
                <View style={[styles.unreadDot, { backgroundColor: primary }]} />
              )}
              
              {/* Botón eliminar */}
              <Pressable
                style={styles.deleteButton}
                onPress={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <IconSymbol name="xmark" size={14} color={textSecondary} />
              </Pressable>
            </Pressable>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );

  if (mode === 'modal') {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            {content}
          </View>
        </View>
      </Modal>
    );
  }

  return content;
}

/**
 * Botón de notificaciones para la barra de navegación
 */
export function NotificationButton() {
  const [showCenter, setShowCenter] = useState(false);
  const { unreadCount } = useWebNotifications();
  
  const textColor = useThemeColor({}, 'text');
  const primary = useThemeColor({}, 'tint');

  return (
    <>
      <Pressable 
        style={styles.navButton}
        onPress={() => setShowCenter(true)}
      >
        <IconSymbol name="bell" size={24} color={textColor} />
        {unreadCount > 0 && (
          <View style={[styles.navBadge, { backgroundColor: primary }]}>
            <ThemedText style={styles.navBadgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </ThemedText>
          </View>
        )}
      </Pressable>

      <NotificationCenter
        mode="modal"
        visible={showCenter}
        onClose={() => setShowCenter(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalContainer: {
    maxHeight: '80%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerButton: {
    padding: Spacing.xs,
  },
  headerButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  closeButton: {
    marginLeft: Spacing.sm,
  },
  list: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 15,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  notificationContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    flex: 1,
    marginRight: Spacing.sm,
  },
  unreadTitle: {
    fontWeight: '600',
  },
  notificationTime: {
    fontSize: 11,
  },
  notificationBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: Spacing.sm,
  },
  deleteButton: {
    padding: Spacing.xs,
    marginTop: 2,
  },
  navButton: {
    position: 'relative',
    padding: Spacing.xs,
  },
  navBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  navBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default NotificationCenter;
