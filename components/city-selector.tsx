import React, { useState, useMemo } from 'react';
import { View, TextInput, FlatList, Text, Pressable, StyleSheet, Platform } from 'react-native';
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
  placeholder = 'Buscar ciudad...', 
  disabled = false 
}: CitySelectorProps) {
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const [searchText, setSearchText] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);

  // Filtrar ciudades basándose en el texto de búsqueda
  const filteredCities = useMemo(() => {
    if (!searchText || searchText.length < 2) {
      return [];
    }
    const search = searchText.toLowerCase();
    return ciudadesData
      .filter((city: string) => city.toLowerCase().includes(search))
      .slice(0, 50); // Limitar a 50 resultados para rendimiento
  }, [searchText]);

  const handleSelectCity = (city: string) => {
    setSearchText(city);
    onChangeText(city);
    setShowDropdown(false);
  };

  const handleChangeText = (text: string) => {
    setSearchText(text);
    onChangeText(text);
    setShowDropdown(text.length >= 2);
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={searchText}
        onChangeText={handleChangeText}
        onFocus={() => {
          if (searchText.length >= 2) {
            setShowDropdown(true);
          }
        }}
        placeholder={placeholder}
        editable={!disabled}
        style={[
          styles.input,
          {
            backgroundColor: cardBg,
            color: textColor,
            borderColor: borderColor,
          }
        ]}
      />
      
      {showDropdown && filteredCities.length > 0 && (
        <View style={[styles.dropdown, { backgroundColor: cardBg, borderColor: borderColor }]}>
          <FlatList
            data={filteredCities}
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={({ item }) => (
              <Pressable
                style={styles.dropdownItem}
                onPress={() => handleSelectCity(item)}
              >
                <Text style={[styles.dropdownItemText, { color: textColor }]}>
                  {item}
                </Text>
              </Pressable>
            )}
            style={styles.dropdownList}
            nestedScrollEnabled
          />
        </View>
      )}
      
      {showDropdown && filteredCities.length === 0 && searchText.length >= 2 && (
        <View style={[styles.dropdown, { backgroundColor: cardBg, borderColor: borderColor }]}>
          <Text style={[styles.noResultsText, { color: textColor }]}>
            No se encontraron ciudades
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    zIndex: 1000,
  },
  input: {
    width: '100%',
    padding: Spacing.sm,
    fontSize: 15,
    fontFamily: 'Montserrat',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    ...Platform.select({
      web: {
        outline: 'none',
      },
    }),
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    marginTop: 4,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
      },
    }),
  },
  dropdownList: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: 'Montserrat',
  },
  noResultsText: {
    padding: Spacing.md,
    fontSize: 14,
    fontFamily: 'Montserrat',
    textAlign: 'center',
  },
});
