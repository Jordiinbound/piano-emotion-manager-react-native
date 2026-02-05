/**
 * Premium Badge Component
 * Muestra un badge "Premium" para features bloqueadas
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface PremiumBadgeProps {
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  onPress?: () => void;
}

export function PremiumBadge({ 
  size = 'medium', 
  showIcon = true,
  onPress 
}: PremiumBadgeProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/settings/subscription');
    }
  };

  const sizeStyles = {
    small: styles.badgeSmall,
    medium: styles.badgeMedium,
    large: styles.badgeLarge,
  };

  const textSizeStyles = {
    small: styles.textSmall,
    medium: styles.textMedium,
    large: styles.textLarge,
  };

  const iconSizes = {
    small: 12,
    medium: 14,
    large: 16,
  };

  return (
    <TouchableOpacity 
      style={[styles.badge, sizeStyles[size]]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {showIcon && (
        <Ionicons 
          name="diamond" 
          size={iconSizes[size]} 
          color="#fff" 
        />
      )}
      <Text style={[styles.text, textSizeStyles[size]]}>
        PREMIUM
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 4,
    gap: 4,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeMedium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    color: '#fff',
    fontWeight: '700',
  },
  textSmall: {
    fontSize: 10,
  },
  textMedium: {
    fontSize: 11,
  },
  textLarge: {
    fontSize: 12,
  },
});
