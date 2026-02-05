/**
 * Postal Code Input Component
 * Input con autocompletado de ciudad y provincia basado en código postal español
 */
import { useState, useCallback, useEffect } from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { lookupPostalCode, PostalCodeResult } from '@/utils/postal-code-lookup';
import { Spacing, BorderRadius } from '@/constants/theme';

interface PostalCodeInputProps {
  postalCode: string;
  city: string;
  province: string;
  onPostalCodeChange: (postalCode: string) => void;
  onCityChange: (city: string) => void;
  onProvinceChange: (province: string) => void;
  disabled?: boolean;
}

export function PostalCodeInput({
  postalCode,
  city,
  province,
  onPostalCodeChange,
  onCityChange,
  onProvinceChange,
  disabled = false,
}: PostalCodeInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [lookupResult, setLookupResult] = useState<PostalCodeResult | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const placeholderColor = useThemeColor({}, 'tabIconDefault');
  const accentColor = useThemeColor({}, 'accent');
  const successColor = '#10B981';

  // Buscar ciudad/provincia cuando cambia el código postal
  useEffect(() => {
    if (postalCode.length === 5) {
      const result = lookupPostalCode(postalCode);
      setLookupResult(result);
      
      // Mostrar sugerencia si encontramos datos y los campos están vacíos
      if (result.isValid && (result.city || result.province)) {
        const shouldSuggest = 
          (result.city && city !== result.city) ||
          (result.province && province !== result.province);
        setShowSuggestion(shouldSuggest);
      } else {
        setShowSuggestion(false);
      }
    } else {
      setLookupResult(null);
      setShowSuggestion(false);
    }
  }, [postalCode, city, province]);

  const handlePostalCodeChange = useCallback((text: string) => {
    // Solo permitir dígitos
    const cleaned = text.replace(/\D/g, '').slice(0, 5);
    onPostalCodeChange(cleaned);
  }, [onPostalCodeChange]);

  const handleApplySuggestion = useCallback(() => {
    if (lookupResult) {
      if (lookupResult.city) {
        onCityChange(lookupResult.city);
      }
      if (lookupResult.province) {
        onProvinceChange(lookupResult.province);
      }
      setShowSuggestion(false);
    }
  }, [lookupResult, onCityChange, onProvinceChange]);

  return (
    <View style={styles.container}>
      {/* Código Postal */}
      <View style={styles.row}>
        <View style={styles.postalCodeContainer}>
          <ThemedText style={styles.label}>Código Postal</ThemedText>
          <View style={[
            styles.inputContainer,
            { 
              backgroundColor,
              borderColor: isFocused ? accentColor : borderColor,
            },
            disabled && styles.inputDisabled,
          ]}>
            <TextInput
              style={[styles.input, { color: textColor }]}
              value={postalCode}
              onChangeText={handlePostalCodeChange}
              placeholder="28001"
              placeholderTextColor={placeholderColor}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              editable={!disabled}
              keyboardType="number-pad"
              maxLength={5}
            />
            {lookupResult?.isValid && (
              <IconSymbol name="checkmark.circle.fill" size={18} color={successColor} />
            )}
          </View>
        </View>

        {/* Ciudad */}
        <View style={styles.cityContainer}>
          <ThemedText style={styles.label}>Ciudad</ThemedText>
          <View style={[
            styles.inputContainer,
            { backgroundColor, borderColor },
            disabled && styles.inputDisabled,
          ]}>
            <TextInput
              style={[styles.input, { color: textColor }]}
              value={city}
              onChangeText={onCityChange}
              placeholder="Ciudad"
              placeholderTextColor={placeholderColor}
              editable={!disabled}
            />
          </View>
        </View>
      </View>

      {/* Provincia */}
      <View>
        <ThemedText style={styles.label}>Provincia</ThemedText>
        <View style={[
          styles.inputContainer,
          { backgroundColor, borderColor },
          disabled && styles.inputDisabled,
        ]}>
          <TextInput
            style={[styles.input, { color: textColor }]}
            value={province}
            onChangeText={onProvinceChange}
            placeholder="Provincia"
            placeholderTextColor={placeholderColor}
            editable={!disabled}
          />
        </View>
      </View>

      {/* Sugerencia de autocompletado */}
      {showSuggestion && lookupResult && (
        <Pressable 
          style={[styles.suggestionContainer, { backgroundColor: `${successColor}15`, borderColor: successColor }]}
          onPress={handleApplySuggestion}
        >
          <View style={styles.suggestionContent}>
            <IconSymbol name="sparkles" size={16} color={successColor} />
            <View style={styles.suggestionText}>
              <ThemedText style={[styles.suggestionTitle, { color: successColor }]}>
                Autocompletar dirección
              </ThemedText>
              <ThemedText style={styles.suggestionDetails}>
                {lookupResult.city && `Ciudad: ${lookupResult.city}`}
                {lookupResult.city && lookupResult.province && ' • '}
                {lookupResult.province && `Provincia: ${lookupResult.province}`}
              </ThemedText>
            </View>
          </View>
          <View style={[styles.applyButton, { backgroundColor: successColor }]}>
            <ThemedText style={styles.applyButtonText}>Aplicar</ThemedText>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  postalCodeContainer: {
    width: 120,
  },
  cityContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  suggestionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionDetails: {
    fontSize: 12,
    opacity: 0.8,
  },
  applyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
