import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import ciudadesData from '@/assets/data/ciudades_espana.json';

interface CitySelectorProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CitySelector({ 
  value, 
  onChangeText, 
  placeholder = 'Seleccionar ciudad...', 
  disabled = false 
}: CitySelectorProps) {
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');

  return (
    <View style={styles.container}>
      <select
        value={value}
        onChange={(e: any) => onChangeText(e.target.value)}
        disabled={disabled}
        style={{
          width: '100%',
          padding: Spacing.sm,
          fontSize: 15,
          fontFamily: 'Montserrat',
          backgroundColor: cardBg,
          color: textColor,
          borderWidth: 1,
          borderColor: borderColor,
          borderRadius: BorderRadius.md,
          borderStyle: 'solid',
          outline: 'none',
        } as any}
      >
        <option value="">{placeholder}</option>
        {ciudadesData.map((city: string, index: number) => (
          <option key={`${city}-${index}`} value={city}>
            {city}
          </option>
        ))}
      </select>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
