import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BorderRadius, Spacing } from '@/constants/theme';

const COLORS = {
  primary: '#003a8c',
  white: '#ffffff',
};

interface CustomHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  iconColor?: string;
  onMenuPress?: () => void;
  showMenuButton?: boolean;
  showBackButton?: boolean;
  rightAction?: React.ReactNode;
}

export default function CustomHeader({ 
  title, 
  subtitle,
  icon,
  iconColor = '#FFFFFF',
  onMenuPress, 
  showMenuButton = false,
  showBackButton = false,
  rightAction 
}: CustomHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 0 : Math.max(insets.top, 0) }]}>
      {/* Barra azul única con todo el contenido */}
      <View style={styles.headerBar}>
        {/* Sección izquierda: Menú (si aplica) + Icono + Título/Subtítulo */}
        <View style={styles.leftSection}>
          {showMenuButton && (
            <Pressable
              style={({ pressed }) => [styles.menuButton, pressed && styles.buttonPressed]}
              onPress={onMenuPress}
            >
              <Ionicons name="menu" size={24} color={COLORS.white} />
            </Pressable>
          )}
          
          {showBackButton && (
            <Pressable
              style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Volver atrás"
            >
              <IconSymbol name="chevron.left" size={24} color={COLORS.white} />
            </Pressable>
          )}

          {icon && (
            <View style={styles.iconContainer}>
              <IconSymbol name={icon as any} size={32} color={iconColor} />
            </View>
          )}

          <View style={styles.titleContainer}>
            <ThemedText 
              type="title" 
              style={[
                styles.title,
                Platform.OS === 'web' && { fontSize: 24 }
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
        </View>

        {/* Sección derecha: Iconos de navegación */}
        <View style={styles.rightSection}>
          {rightAction}
          


          {/* Notifications Button */}
          <Pressable
            style={({ pressed }) => [styles.iconButton, pressed && styles.buttonPressed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/alerts');
            }}
          >
            <Ionicons name="notifications-outline" size={24} color={COLORS.white} />
          </Pressable>

          {/* Settings Button */}
          <Pressable
            style={({ pressed }) => [styles.iconButton, pressed && styles.buttonPressed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/settings');
            }}
          >
            <Ionicons name="settings-outline" size={24} color={COLORS.white} />
          </Pressable>

          {/* User Avatar */}
          <Pressable
            style={({ pressed }) => [styles.avatar, pressed && styles.buttonPressed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/settings');
            }}
          >
            <Ionicons name="person" size={20} color={COLORS.primary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 80,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  menuButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  backButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      web: 'Arkhip, Montserrat-Bold, system-ui, -apple-system, sans-serif',
    }),
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    fontFamily: 'Montserrat',
    fontWeight: '400',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
