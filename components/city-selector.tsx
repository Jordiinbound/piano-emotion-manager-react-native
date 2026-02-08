import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import ciudadesData from '@/assets/data/ciudades_espana.json';

interface CitySelectorProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  listId?: string;
}

export function CitySelector({ 
  value, 
  onChangeText, 
  placeholder = 'Buscar ciudad...', 
  disabled = false,
  listId = 'cities-list'
}: CitySelectorProps) {
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');

  return (
    <View style={styles.container}>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: cardBg, borderColor, color: textColor },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={textSecondary}
        editable={!disabled}
        // @ts-ignore - list es un atributo HTML válido
        list={listId}
      />
      {/* Datalist nativo de HTML para autocompletado */}
      <datalist id={listId}>
        {ciudadesData.map((city: string, index: number) => (
          <option key={`${city}-${index}`} value={city} />
        ))}
      </datalist>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    fontFamily: 'Montserrat',
  },
});
