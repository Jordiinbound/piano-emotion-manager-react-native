/**
 * AlertToggle Component
 * Toggle para activar/desactivar alertas individuales
 */
import { View, StyleSheet, Switch } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';

interface AlertToggleProps {
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function AlertToggle({ icon, title, description, enabled, onToggle }: AlertToggleProps) {
  const accent = useThemeColor({}, 'accent');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');

  return (
    <ThemedView style={[styles.container, { backgroundColor: cardBg, borderColor }]}>
      <View style={[styles.iconContainer, { backgroundColor: `${accent}15` }]}>
        <IconSymbol name={icon} size={20} color={accent} />
      </View>
      <View style={styles.content}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText style={[styles.description, { color: textSecondary }]}>
          {description}
        </ThemedText>
      </View>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: borderColor, true: accent }}
        thumbColor="#FFFFFF"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
});
