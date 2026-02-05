import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Modal,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';

interface SaveAnimationProps {
  visible: boolean;
  message?: string;
  type?: 'saving' | 'success' | 'error';
  onComplete?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export function SaveAnimation({
  visible,
  message,
  type = 'saving',
  onComplete,
  autoHide = true,
  autoHideDelay = 1500,
}: SaveAnimationProps) {
  const [scaleAnim] = useState(new Animated.Value(0));
  const [opacityAnim] = useState(new Animated.Value(0));
  const [rotateAnim] = useState(new Animated.Value(0));
  const [checkmarkAnim] = useState(new Animated.Value(0));

  const cardBg = useThemeColor({}, 'cardBackground');
  const primary = useThemeColor({}, 'tint');
  const success = useThemeColor({}, 'success');
  const error = useThemeColor({}, 'error');

  const getColor = () => {
    switch (type) {
      case 'success': return success;
      case 'error': return error;
      default: return primary;
    }
  };

  const getMessage = () => {
    if (message) return message;
    switch (type) {
      case 'success': return 'Guardado correctamente';
      case 'error': return 'Error al guardar';
      default: return 'Guardando...';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return 'checkmark.circle.fill';
      case 'error': return 'xmark.circle.fill';
      default: return 'arrow.clockwise';
    }
  };

  useEffect(() => {
    if (visible) {
      // Animación de entrada
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Animación de rotación para "saving"
      if (type === 'saving') {
        Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          })
        ).start();
      }

      // Animación de checkmark para "success"
      if (type === 'success') {
        Animated.spring(checkmarkAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }

      // Auto-hide
      if (autoHide && type !== 'saving') {
        const timer = setTimeout(() => {
          handleClose();
        }, autoHideDelay);
        return () => clearTimeout(timer);
      }
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      rotateAnim.setValue(0);
      checkmarkAnim.setValue(0);
    }
  }, [visible, type]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onComplete) {
        onComplete();
      }
    });
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            { backgroundColor: cardBg },
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.iconContainer,
              { backgroundColor: getColor() + '20' },
              type === 'saving' && { transform: [{ rotate: spin }] },
              type === 'success' && { transform: [{ scale: checkmarkAnim }] },
            ]}
          >
            <IconSymbol
              name={getIcon() as any}
              size={40}
              color={getColor()}
            />
          </Animated.View>
          <ThemedText style={styles.message}>{getMessage()}</ThemedText>
        </Animated.View>
      </View>
    </Modal>
  );
}

/**
 * Hook para usar la animación de guardado
 */
export function useSaveAnimation() {
  const [state, setState] = useState<{
    visible: boolean;
    type: 'saving' | 'success' | 'error';
    message?: string;
  }>({
    visible: false,
    type: 'saving',
    message: undefined,
  });

  const showSaving = (message?: string) => {
    setState({ visible: true, type: 'saving', message });
  };

  const showSuccess = (message?: string) => {
    setState({ visible: true, type: 'success', message });
  };

  const showError = (message?: string) => {
    setState({ visible: true, type: 'error', message });
  };

  const hide = () => {
    setState(prev => ({ ...prev, visible: false }));
  };

  /**
   * Ejecutar una operación async con animación
   */
  const withAnimation = async <T,>(
    operation: () => Promise<T>,
    options?: {
      savingMessage?: string;
      successMessage?: string;
      errorMessage?: string;
    }
  ): Promise<T | null> => {
    showSaving(options?.savingMessage);
    
    try {
      const result = await operation();
      showSuccess(options?.successMessage);
      return result;
    } catch (error) {
      showError(options?.errorMessage || 'Error al guardar');
      throw error;
    }
  };

  return {
    ...state,
    showSaving,
    showSuccess,
    showError,
    hide,
    withAnimation,
    SaveAnimationComponent: (
      <SaveAnimation
        visible={state.visible}
        type={state.type}
        message={state.message}
        onComplete={hide}
      />
    ),
  };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default SaveAnimation;
