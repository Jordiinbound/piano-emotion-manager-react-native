import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import { ThemedText } from './themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing } from '@/constants/theme';

// Mensajes contextuales predefinidos
export const LOADING_MESSAGES = {
  // Carga general
  loading: 'Cargando...',
  
  // Módulos específicos
  clients: 'Cargando clientes...',
  pianos: 'Cargando pianos...',
  services: 'Cargando servicios...',
  inventory: 'Cargando inventario...',
  suppliers: 'Cargando proveedores...',
  agenda: 'Cargando agenda...',
  
  // Acciones
  saving: 'Guardando cambios...',
  deleting: 'Eliminando...',
  syncing: 'Sincronizando datos...',
  updating: 'Actualizando...',
  
  // Búsqueda y filtros
  searching: 'Buscando...',
  filtering: 'Aplicando filtros...',
  
  // Operaciones específicas
  generatingInvoice: 'Generando factura...',
  sendingEmail: 'Enviando correo...',
  exportingData: 'Exportando datos...',
  importingData: 'Importando datos...',
  
  // Conexión
  connecting: 'Conectando...',
  reconnecting: 'Reconectando...',
} as const;

export type LoadingMessageType = keyof typeof LOADING_MESSAGES;

interface LoadingSpinnerProps {
  message?: string;
  messageType?: LoadingMessageType;
  size?: 'small' | 'medium' | 'large';
  showMessage?: boolean;
}

export function LoadingSpinner({ 
  message, 
  messageType,
  size = 'medium',
  showMessage = true 
}: LoadingSpinnerProps) {
  const accent = useThemeColor({}, 'tint');
  const secondaryText = useThemeColor({}, 'textSecondary');
  
  // Determinar el mensaje a mostrar
  const displayMessage = message || (messageType ? LOADING_MESSAGES[messageType] : LOADING_MESSAGES.loading);
  
  // Animación de rotación
  const rotation = useSharedValue(0);
  
  // Animación de escala (pulsación)
  const scale = useSharedValue(1);
  
  // Animación de las teclas del piano
  const key1 = useSharedValue(0);
  const key2 = useSharedValue(0);
  const key3 = useSharedValue(0);
  const key4 = useSharedValue(0);
  const key5 = useSharedValue(0);

  useEffect(() => {
    // Animación de rotación suave
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
    
    // Animación de pulsación
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    
    // Animación de teclas de piano (efecto ola)
    const animateKey = (keyValue: SharedValue<number>, delay: number) => {
      setTimeout(() => {
        keyValue.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) })
          ),
          -1,
          false
        );
      }, delay);
    };
    
    animateKey(key1, 0);
    animateKey(key2, 100);
    animateKey(key3, 200);
    animateKey(key4, 300);
    animateKey(key5, 400);
  }, []);

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const createKeyStyle = (keyValue: SharedValue<number>) => {
    return useAnimatedStyle(() => ({
      transform: [{ translateY: interpolate(keyValue.value, [0, 1], [0, -8]) }],
      opacity: interpolate(keyValue.value, [0, 1], [0.6, 1]),
    }));
  };

  const key1Style = createKeyStyle(key1);
  const key2Style = createKeyStyle(key2);
  const key3Style = createKeyStyle(key3);
  const key4Style = createKeyStyle(key4);
  const key5Style = createKeyStyle(key5);

  const sizeConfig = {
    small: { container: 60, key: 6, keyHeight: 20 },
    medium: { container: 80, key: 8, keyHeight: 28 },
    large: { container: 100, key: 10, keyHeight: 36 },
  };

  const config = sizeConfig[size];

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.spinnerContainer, pulseStyle]}>
        {/* Piano keys animation */}
        <View style={[styles.pianoContainer, { width: config.container, height: config.container }]}>
          <View style={styles.keysRow}>
            <Animated.View 
              style={[
                styles.pianoKey, 
                { 
                  width: config.key, 
                  height: config.keyHeight,
                  backgroundColor: accent 
                },
                key1Style
              ]} 
            />
            <Animated.View 
              style={[
                styles.pianoKey, 
                { 
                  width: config.key, 
                  height: config.keyHeight,
                  backgroundColor: accent 
                },
                key2Style
              ]} 
            />
            <Animated.View 
              style={[
                styles.pianoKey, 
                { 
                  width: config.key, 
                  height: config.keyHeight,
                  backgroundColor: accent 
                },
                key3Style
              ]} 
            />
            <Animated.View 
              style={[
                styles.pianoKey, 
                { 
                  width: config.key, 
                  height: config.keyHeight,
                  backgroundColor: accent 
                },
                key4Style
              ]} 
            />
            <Animated.View 
              style={[
                styles.pianoKey, 
                { 
                  width: config.key, 
                  height: config.keyHeight,
                  backgroundColor: accent 
                },
                key5Style
              ]} 
            />
          </View>
          
          {/* Circular progress indicator */}
          <Animated.View style={[styles.circleContainer, spinnerStyle]}>
            <View style={[styles.circle, { borderColor: `${accent}30` }]}>
              <View style={[styles.circleProgress, { borderTopColor: accent }]} />
            </View>
          </Animated.View>
        </View>
      </Animated.View>
      
      {showMessage && displayMessage && (
        <ThemedText style={[styles.message, { color: secondaryText }]}>
          {displayMessage}
        </ThemedText>
      )}
    </View>
  );
}

// Componente simplificado para usar en RefreshControl
export function RefreshLoadingSpinner() {
  return <LoadingSpinner size="small" showMessage={false} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  spinnerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pianoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  keysRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  pianoKey: {
    borderRadius: 4,
  },
  circleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleProgress: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 4,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
  },
});
