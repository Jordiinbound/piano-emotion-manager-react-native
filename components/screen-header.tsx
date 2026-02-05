import React from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';
import { BorderRadius, Spacing } from '@/constants/theme';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
  showBackButton?: boolean;
  icon?: string;
  iconColor?: string;
  rightAction?: React.ReactNode;
}

export function ScreenHeader({ 
  title, 
  subtitle, 
  showLogo = false,
  showBackButton = false,
  icon,
  iconColor = '#FFFFFF',
  rightAction
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <LinearGradient
      colors={['#7A8B99', '#8E9DAA', '#A2B1BD']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[
        styles.headerGradient,
        { marginTop: Math.max(insets.top, 20) }
      ]}
    >
      <View style={styles.headerRow}>
        {showBackButton && (
          <Pressable 
            onPress={handleBack} 
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Volver atrás"
            accessibilityHint="Pulsa para volver a la pantalla anterior"
          >
            <IconSymbol name="chevron.left" size={24} color="#FFFFFF" />
          </Pressable>
        )}
        {showLogo ? (
          <Image
            source={require('@/assets/images/icon.png')}
            style={[
              styles.headerLogo,
              { tintColor: '#FFFFFF' },
              Platform.OS === 'web' && { filter: 'brightness(0) invert(1)' } as any
            ]}
            resizeMode="contain"
          />
        ) : icon ? (
          <View style={styles.iconContainer}>
            <IconSymbol name={icon as any} size={32} color={iconColor} />
          </View>
        ) : null}
        <View style={styles.headerText}>
          <ThemedText 
            type="title" 
            style={[
              styles.headerTitle, 
              { color: '#FFFFFF' },
              Platform.OS === 'web' && { fontSize: 32 }
            ]}
          >
            {title}
          </ThemedText>
          {subtitle && (
            <ThemedText style={styles.subtitle}>
              {subtitle}
            </ThemedText>
          )}
        </View>
        {rightAction && (
          <View style={styles.rightActionContainer}>
            {rightAction}
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLogo: {
    width: 95,
    height: 95,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  rightActionContainer: {
    marginLeft: Spacing.sm,
  },
  headerTitle: {
    fontFamily: 'Arkhip',
    fontSize: 24,
    lineHeight: 32,
    textTransform: 'none',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontSize: 14,
  },
});
