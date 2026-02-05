/**
 * Tax ID Input Component
 * Input con validación en tiempo real de NIF/NIE/CIF español
 */
import { useState, useCallback, useEffect } from 'react';
import { View, TextInput, StyleSheet, Animated } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { validateSpanishTaxId, TaxIdType } from '@/utils/spanish-tax-id';
import { Spacing, BorderRadius } from '@/constants/theme';

interface TaxIdInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onValidationChange?: (isValid: boolean, type: TaxIdType) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export function TaxIdInput({
  value,
  onChangeText,
  onValidationChange,
  placeholder = 'NIF, NIE o CIF',
  label = 'Identificador Fiscal',
  required = false,
  disabled = false,
}: TaxIdInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    type: TaxIdType;
    errorMessage?: string;
  } | null>(null);
  
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const placeholderColor = useThemeColor({}, 'tabIconDefault');
  const errorColor = '#DC2626';
  const successColor = '#10B981';
  const warningColor = '#F59E0B';

  // Validar en tiempo real
  useEffect(() => {
    if (value.length >= 3) {
      const result = validateSpanishTaxId(value);
      setValidationResult(result);
      onValidationChange?.(result.isValid, result.type);
    } else if (value.length === 0) {
      setValidationResult(null);
      onValidationChange?.(true, 'UNKNOWN');
    } else {
      setValidationResult(null);
    }
  }, [value, onValidationChange]);

  const handleChangeText = useCallback((text: string) => {
    // Convertir a mayúsculas y eliminar caracteres no válidos
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    onChangeText(cleaned);
  }, [onChangeText]);

  // Determinar el estado visual
  const getStatusColor = () => {
    if (!validationResult) return borderColor;
    if (validationResult.isValid) return successColor;
    if (validationResult.type !== 'UNKNOWN') return errorColor;
    return warningColor;
  };

  const getStatusIcon = () => {
    if (!validationResult) return null;
    if (validationResult.isValid) {
      return <IconSymbol name="checkmark.circle.fill" size={20} color={successColor} />;
    }
    if (validationResult.type !== 'UNKNOWN') {
      return <IconSymbol name="xmark.circle.fill" size={20} color={errorColor} />;
    }
    return <IconSymbol name="exclamationmark.triangle.fill" size={20} color={warningColor} />;
  };

  const getTypeLabel = () => {
    if (!validationResult || validationResult.type === 'UNKNOWN') return null;
    const labels: Record<TaxIdType, string> = {
      NIF: 'NIF (Persona física)',
      NIE: 'NIE (Extranjero)',
      CIF: 'CIF (Empresa)',
      UNKNOWN: '',
    };
    return labels[validationResult.type];
  };

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelRow}>
          <ThemedText style={styles.label}>
            {label}
            {required && <ThemedText style={styles.required}> *</ThemedText>}
          </ThemedText>
          {getTypeLabel() && (
            <View style={[styles.typeBadge, { backgroundColor: `${successColor}20` }]}>
              <ThemedText style={[styles.typeText, { color: successColor }]}>
                {getTypeLabel()}
              </ThemedText>
            </View>
          )}
        </View>
      )}
      
      <View style={[
        styles.inputContainer,
        { 
          backgroundColor,
          borderColor: isFocused ? getStatusColor() : borderColor,
          borderWidth: isFocused ? 2 : 1,
        },
        disabled && styles.inputDisabled,
      ]}>
        <TextInput
          style={[styles.input, { color: textColor }]}
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={!disabled}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={9}
        />
        <View style={styles.statusIcon}>
          {getStatusIcon()}
        </View>
      </View>

      {validationResult?.errorMessage && (
        <View style={styles.errorContainer}>
          <IconSymbol name="exclamationmark.circle" size={14} color={errorColor} />
          <ThemedText style={[styles.errorText, { color: errorColor }]}>
            {validationResult.errorMessage}
          </ThemedText>
        </View>
      )}

      {!validationResult && value.length > 0 && value.length < 9 && (
        <ThemedText style={[styles.hintText, { color: placeholderColor }]}>
          Introduce el identificador completo (9 caracteres)
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  required: {
    color: '#DC2626',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    letterSpacing: 1,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  statusIcon: {
    width: 24,
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  errorText: {
    fontSize: 12,
  },
  hintText: {
    fontSize: 12,
  },
});
