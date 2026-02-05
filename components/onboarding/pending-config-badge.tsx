/**
 * PendingConfigBadge Component
 * Badge que muestra el número de pasos de configuración pendientes
 */
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import * as Haptics from 'expo-haptics';
import { getSkippedSteps } from '@/utils/onboarding-helpers';

interface PendingConfigBadgeProps {
  onPress?: () => void;
}

export function PendingConfigBadge({ onPress }: PendingConfigBadgeProps) {
  const router = useRouter();
  const primaryColor = useThemeColor({}, 'tint');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadPendingCount();
    
    // Refrescar cada vez que la app vuelve al foreground
    const interval = setInterval(loadPendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadPendingCount = async () => {
    try {
      const skipped = await getSkippedSteps();
      setPendingCount(skipped.length);
    } catch (error) {
      console.error('Error loading pending count:', error);
    }
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onPress) {
      onPress();
    } else {
      router.push('/settings/pending-configuration' as any);
    }
  };

  if (pendingCount === 0) {
    return null;
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: primaryColor + '20', borderColor: primaryColor },
        pressed && styles.pressed,
      ]}
    >
      <IconSymbol name="exclamationmark.circle.fill" size={20} color={primaryColor} />
      <Text style={[styles.text, { color: primaryColor }]}>
        {pendingCount} configuración{pendingCount > 1 ? 'es' : ''} pendiente{pendingCount > 1 ? 's' : ''}
      </Text>
      <IconSymbol name="chevron.right" size={16} color={primaryColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    borderWidth: 1,
    gap: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
});
