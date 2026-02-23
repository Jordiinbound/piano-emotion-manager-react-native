import { Pressable, StyleSheet, View } from 'react-native';
// AnimatedCard - Sombras actualizadas 2026-02-09
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedCardProps {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  size?: 'small' | 'medium';
  disabled?: boolean;
  badge?: string;
  badgeColor?: string;
  premium?: boolean; // Mantener compatibilidad con código existente
}

export function AnimatedCard({ 
  icon, 
  label, 
  color, 
  onPress, 
  size = 'medium',
  disabled = false,
  badge,
  badgeColor = '#F59E0B',
  premium = false,
}: AnimatedCardProps) {
  const scale = useSharedValue(1);
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');

  // Si premium está activo y no hay badge, usar badge PRO
  const displayBadge = badge || (premium ? 'PRO' : undefined);
  const displayBadgeColor = badge ? badgeColor : '#F59E0B';
  
  // Color efectivo (gris si está deshabilitado)
  const effectiveColor = disabled ? '#9CA3AF' : color;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(1.08, { damping: 15, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const cardSize = size === 'small' ? 60 : 60; // Reducido a 60px como solicitado
  const iconContainerSize = size === 'small' ? 48 : 56; // Iconos mantienen tamaño 56px
  const iconSize = size === 'small' ? 24 : 28;

  return (
    <AnimatedPressable
      style={[
        styles.card,
        animatedStyle,
        { 
          backgroundColor: disabled ? '#F3F4F6' : cardBg, 
          borderColor: disabled ? '#E5E7EB' : borderColor,
          width: cardSize,
          opacity: disabled ? 0.8 : 1,
        }
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onHoverIn={handlePressIn}
      onHoverOut={handlePressOut}
    >
      {/* Badge */}
      {displayBadge && (
        <View style={[styles.badge, { backgroundColor: displayBadgeColor }]}>
          <ThemedText style={styles.badgeText}>{displayBadge}</ThemedText>
        </View>
      )}
      
      {/* Icono con candado si está deshabilitado */}
      <View style={[
        styles.iconContainer, 
        { 
          backgroundColor: `${effectiveColor}15`,
          width: iconContainerSize,
          height: iconContainerSize,
        }
      ]}>
        <IconSymbol name={icon as any} size={iconSize} color={effectiveColor} />
        {disabled && (
          <View style={styles.lockOverlay}>
            <IconSymbol name="lock.fill" size={12} color="#6B7280" />
          </View>
        )}
      </View>
      
      <ThemedText style={[
        styles.label,
        disabled && styles.labelDisabled,
      ]}>
        {label}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: 6, // Padding vertical aún más reducido
    paddingHorizontal: 2, // Padding horizontal mínimo
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 3, // Gap mínimo entre elementos
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  iconContainer: {
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 2,
  },
  label: {
    fontSize: 10, // Reducido de 12 a 10 para tarjetas más compactas
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 13,
  },
  labelDisabled: {
    color: '#9CA3AF',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },
});
