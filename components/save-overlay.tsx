import React, { useEffect } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { LoadingSpinner, LoadingMessageType } from './loading-spinner';
import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';
import { BorderRadius, Spacing } from '@/constants/theme';

interface SaveOverlayProps {
  visible: boolean;
  status: 'saving' | 'success' | 'error';
  messageType?: LoadingMessageType;
  customMessage?: string;
  onDismiss?: () => void;
}

export function SaveOverlay({ 
  visible, 
  status, 
  messageType = 'saving',
  customMessage,
  onDismiss 
}: SaveOverlayProps) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.back(1.5)) });
      
      if (status === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        checkScale.value = withSequence(
          withTiming(1.2, { duration: 200 }),
          withTiming(1, { duration: 150 })
        );
        // Auto dismiss after success
        setTimeout(() => {
          onDismiss?.();
        }, 1200);
      } else if (status === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        // Auto dismiss after error
        setTimeout(() => {
          onDismiss?.();
        }, 2000);
      }
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.8, { duration: 150 });
      checkScale.value = 0;
    }
  }, [visible, status]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const getMessage = () => {
    if (customMessage) return customMessage;
    switch (status) {
      case 'saving':
        return messageType === 'saving' ? 'Guardando...' : undefined;
      case 'success':
        return 'Guardado correctamente';
      case 'error':
        return 'Error al guardar';
      default:
        return undefined;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, containerStyle]}>
        <Animated.View style={[styles.card, cardStyle]}>
          {status === 'saving' && (
            <LoadingSpinner 
              size="medium" 
              messageType={messageType}
              message={customMessage}
            />
          )}
          
          {status === 'success' && (
            <View style={styles.successContainer}>
              <Animated.View style={[styles.iconCircle, styles.successCircle, checkStyle]}>
                <IconSymbol name="checkmark" size={40} color="#FFFFFF" />
              </Animated.View>
              <ThemedText style={styles.successText}>{getMessage()}</ThemedText>
            </View>
          )}
          
          {status === 'error' && (
            <View style={styles.errorContainer}>
              <View style={[styles.iconCircle, styles.errorCircle]}>
                <IconSymbol name="xmark" size={40} color="#FFFFFF" />
              </View>
              <ThemedText style={styles.errorText}>{getMessage()}</ThemedText>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// Hook para usar el overlay fácilmente
export function useSaveOverlay() {
  const [overlayState, setOverlayState] = React.useState<{
    visible: boolean;
    status: 'saving' | 'success' | 'error';
    messageType?: LoadingMessageType;
    customMessage?: string;
  }>({
    visible: false,
    status: 'saving',
  });

  const showSaving = (messageType?: LoadingMessageType, customMessage?: string) => {
    setOverlayState({
      visible: true,
      status: 'saving',
      messageType: messageType || 'saving',
      customMessage,
    });
  };

  const showSuccess = (customMessage?: string) => {
    setOverlayState((prev) => ({
      ...prev,
      status: 'success',
      customMessage,
    }));
  };

  const showError = (customMessage?: string) => {
    setOverlayState((prev) => ({
      ...prev,
      status: 'error',
      customMessage: customMessage || 'Error al guardar',
    }));
  };

  const hide = () => {
    setOverlayState((prev) => ({
      ...prev,
      visible: false,
    }));
  };

  return {
    overlayState,
    showSaving,
    showSuccess,
    showError,
    hide,
    SaveOverlayComponent: (
      <SaveOverlay
        visible={overlayState.visible}
        status={overlayState.status}
        messageType={overlayState.messageType}
        customMessage={overlayState.customMessage}
        onDismiss={hide}
      />
    ),
  };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    minWidth: 200,
    minHeight: 150,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  successContainer: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  errorContainer: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successCircle: {
    backgroundColor: '#10B981',
  },
  errorCircle: {
    backgroundColor: '#EF4444',
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
  },
});
