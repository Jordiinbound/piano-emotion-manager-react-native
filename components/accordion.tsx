import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  darkMode?: boolean;
  icon?: string;
  iconColor?: string;
  badge?: number | string;
  badgeColor?: string;
  rightAction?: React.ReactNode;
  centerContent?: boolean;
}

export function Accordion({ 
  title, 
  children, 
  defaultOpen = false, 
  darkMode = false,
  icon,
  iconColor = '#C9A227',
  badge,
  badgeColor = '#EF4444',
  rightAction,
  centerContent = false,
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const rotation = useSharedValue(defaultOpen ? 90 : 0);
  
  const borderColor = darkMode ? 'rgba(255,255,255,0.15)' : useThemeColor({}, 'border');
  const cardBg = darkMode ? 'rgba(255,255,255,0.08)' : useThemeColor({}, 'cardBackground');
  const textColor = darkMode ? '#FFFFFF' : useThemeColor({}, 'text');

  const toggleAccordion = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsOpen(!isOpen);
    rotation.value = withTiming(isOpen ? 0 : 90, { duration: 200 });
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={[styles.container, { borderColor, backgroundColor: cardBg }]}>
      <Pressable style={styles.header} onPress={toggleAccordion}>
        <View style={styles.titleRow}>
          {icon && (
            <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
              <IconSymbol name={icon as any} size={18} color={iconColor} />
            </View>
          )}
          <ThemedText type="subtitle" style={[styles.title, darkMode && { color: '#FFFFFF' }]}>{title}</ThemedText>
          {badge !== undefined && (typeof badge === 'string' || badge > 0) && (
            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
              <ThemedText style={styles.badgeText}>{badge}</ThemedText>
            </View>
          )}
        </View>
        <View style={styles.rightSection}>
          {rightAction}
          <Animated.View style={chevronStyle}>
            <IconSymbol name="chevron.right" size={20} color={textColor} />
          </Animated.View>
        </View>
      </Pressable>
      {isOpen && (
        <View style={[styles.content, centerContent && styles.contentCentered]}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    // Removed overflow: 'hidden' to prevent content clipping in nested components
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  contentCentered: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
