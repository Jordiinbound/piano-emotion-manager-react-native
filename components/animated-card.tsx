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

  const cardSize = size === 'small' ? 90 : 100;
  const iconContainerSize = size === 'small' ? 40 : 44;
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
    paddingVertical: 6, // Reducido para menor altura
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
    position: 'relative',
    // Sombras muy prominentes
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
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
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
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
