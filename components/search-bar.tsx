import React, { memo } from 'react';
import { StyleSheet, TextInput, View, Pressable } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
}

export const SearchBar = memo(function SearchBar({ 
  value, 
  onChangeText, 
  placeholder = 'Buscar...',
  accessibilityLabel = 'Campo de búsqueda',
}: SearchBarProps) {
  const backgroundColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({}, 'textDisabled');
  const iconColor = useThemeColor({}, 'icon');

  return (
    <View 
      style={[styles.container, { backgroundColor, borderColor }]}
      accessible={true}
      accessibilityRole="search"
      accessibilityLabel={accessibilityLabel}
    >
      <IconSymbol name="magnifyingglass" size={20} color={iconColor} />
      <TextInput
        style={[styles.input, { color: textColor }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={`Escribe para ${placeholder.toLowerCase()}`}
      />
      {value.length > 0 && (
        <Pressable 
          onPress={() => onChangeText('')}
          hitSlop={8}
          accessibilityLabel="Limpiar búsqueda"
          accessibilityRole="button"
        >
          <IconSymbol name="xmark.circle.fill" size={18} color={placeholderColor} />
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 4,
    outlineStyle: 'none', // Eliminar outline en web
  },
});
