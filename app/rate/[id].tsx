import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useServiceCatalog } from '@/hooks/use-service-catalog';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { ServiceRate, ServiceRateCategory, SERVICE_RATE_CATEGORY_LABELS } from '@/types/service-catalog';

export default function RateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isNew = id === 'new';

  const { rates, addRate, updateRate, deleteRate, getRate } = useServiceCatalog();

  const [isEditing, setIsEditing] = useState(isNew);
  const [form, setForm] = useState<Partial<ServiceRate>>({
    name: '',
    description: '',
    category: 'other',
    basePrice: 0,
    taxRate: 21,
    estimatedDuration: undefined,
    isActive: true,
  });

  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accent = useThemeColor({}, 'accent');
  const error = useThemeColor({}, 'error');
  const textColor = useThemeColor({}, 'text');
  const success = useThemeColor({}, 'success');

  useEffect(() => {
    if (!isNew && id) {
      const rate = getRate(id);
      if (rate) {
        setForm(rate);
      }
    }
  }, [id, isNew, rates]);

  const handleSave = async () => {
    if (!form.name?.trim()) {
      Alert.alert('Error', 'El nombre del servicio es obligatorio');
      return;
    }

    if (!form.basePrice || form.basePrice <= 0) {
      Alert.alert('Error', 'El precio base debe ser mayor que 0');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (isNew) {
      await addRate({
        name: form.name.trim(),
        description: form.description?.trim(),
        category: form.category || 'other',
        basePrice: form.basePrice,
        taxRate: form.taxRate || 21,
        estimatedDuration: form.estimatedDuration,
        isActive: form.isActive ?? true,
      });
      router.back();
    } else if (id) {
      await updateRate(id, form);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar tarifa',
      '¿Estás seguro de que quieres eliminar esta tarifa?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deleteRate(id!);
            router.back();
          },
        },
      ]
    );
  };

  const categories: ServiceRateCategory[] = [
    'tuning', 'maintenance', 'regulation', 'repair', 'inspection', 'restoration', 'transport', 'other'
  ];

  const totalWithTax = (form.basePrice || 0) * (1 + (form.taxRate || 0) / 100);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: isNew ? 'Nueva Tarifa' : 'Detalle de Tarifa',
          headerRight: () =>
            !isNew && (
              <Pressable onPress={() => setIsEditing(!isEditing)}>
                <ThemedText style={{ color: accent }}>
                  {isEditing ? 'Cancelar' : 'Editar'}
                </ThemedText>
              </Pressable>
            ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Nombre */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={[styles.label, { color: textSecondary }]}>Nombre del servicio *</ThemedText>
          {isEditing ? (
            <TextInput
              style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
              value={form.name}
              onChangeText={(text) => setForm({ ...form, name: text })}
              placeholder="Ej: Afinación estándar"
              placeholderTextColor={textSecondary}
            />
          ) : (
            <ThemedText style={styles.value}>{form.name || '-'}</ThemedText>
          )}
        </View>

        {/* Descripción */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={[styles.label, { color: textSecondary }]}>Descripción</ThemedText>
          {isEditing ? (
            <TextInput
              style={[
                styles.input,
                styles.inputMultiline,
                { backgroundColor: cardBg, borderColor, color: textColor },
              ]}
              value={form.description}
              onChangeText={(text) => setForm({ ...form, description: text })}
              placeholder="Descripción del servicio..."
              placeholderTextColor={textSecondary}
              multiline
              numberOfLines={3}
            />
          ) : (
            <ThemedText style={styles.value}>{form.description || '-'}</ThemedText>
          )}
        </View>

        {/* Categoría */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={[styles.label, { color: textSecondary }]}>Categoría</ThemedText>
          {isEditing ? (
            <View style={styles.categoryGrid}>
              {categories.map((cat) => (
                <Pressable
                  key={cat}
                  style={[
                    styles.categoryOption,
                    { backgroundColor: cardBg, borderColor },
                    form.category === cat && { backgroundColor: accent, borderColor: accent },
                  ]}
                  onPress={() => setForm({ ...form, category: cat })}
                >
                  <ThemedText
                    style={[
                      styles.categoryText,
                      { color: form.category === cat ? '#FFFFFF' : textSecondary },
                    ]}
                  >
                    {SERVICE_RATE_CATEGORY_LABELS[cat]}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          ) : (
            <ThemedText style={styles.value}>
              {SERVICE_RATE_CATEGORY_LABELS[form.category as ServiceRateCategory] || '-'}
            </ThemedText>
          )}
        </View>

        {/* Precio y IVA */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={[styles.label, { color: textSecondary }]}>Precio</ThemedText>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={[styles.sublabel, { color: textSecondary }]}>Precio base (€) *</ThemedText>
              {isEditing ? (
                <TextInput
                  style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                  value={form.basePrice?.toString() || ''}
                  onChangeText={(text) => setForm({ ...form, basePrice: parseFloat(text) || 0 })}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={textSecondary}
                />
              ) : (
                <ThemedText style={styles.value}>€{form.basePrice?.toFixed(2) || '0.00'}</ThemedText>
              )}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={[styles.sublabel, { color: textSecondary }]}>IVA (%)</ThemedText>
              {isEditing ? (
                <TextInput
                  style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                  value={form.taxRate?.toString() || '21'}
                  onChangeText={(text) => setForm({ ...form, taxRate: parseInt(text) || 21 })}
                  keyboardType="number-pad"
                  placeholder="21"
                  placeholderTextColor={textSecondary}
                />
              ) : (
                <ThemedText style={styles.value}>{form.taxRate || 21}%</ThemedText>
              )}
            </View>
          </View>

          <View style={[styles.totalBox, { backgroundColor: `${success}10`, borderColor: success }]}>
            <ThemedText style={[styles.totalLabel, { color: textSecondary }]}>Precio con IVA</ThemedText>
            <ThemedText style={[styles.totalValue, { color: success }]}>
              €{totalWithTax.toFixed(2)}
            </ThemedText>
          </View>
        </View>

        {/* Duración estimada */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={[styles.label, { color: textSecondary }]}>Duración estimada (minutos)</ThemedText>
          {isEditing ? (
            <TextInput
              style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
              value={form.estimatedDuration?.toString() || ''}
              onChangeText={(text) => setForm({ ...form, estimatedDuration: parseInt(text) || undefined })}
              keyboardType="number-pad"
              placeholder="60"
              placeholderTextColor={textSecondary}
            />
          ) : (
            <ThemedText style={styles.value}>
              {form.estimatedDuration ? `${form.estimatedDuration} minutos` : '-'}
            </ThemedText>
          )}
        </View>

        {/* Estado activo */}
        {isEditing && (
          <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
            <Pressable
              style={styles.toggleRow}
              onPress={() => setForm({ ...form, isActive: !form.isActive })}
            >
              <View>
                <ThemedText style={styles.toggleLabel}>Servicio activo</ThemedText>
                <ThemedText style={[styles.toggleDescription, { color: textSecondary }]}>
                  Los servicios inactivos no aparecen al crear facturas
                </ThemedText>
              </View>
              <View
                style={[
                  styles.toggle,
                  { backgroundColor: form.isActive ? success : textSecondary },
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    form.isActive && styles.toggleKnobActive,
                  ]}
                />
              </View>
            </Pressable>
          </View>
        )}

        {/* Botones de acción */}
        {isEditing && (
          <Pressable style={[styles.saveButton, { backgroundColor: accent }]} onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Guardar cambios"
            accessibilityHint="Pulsa para guardar los datos">
            <ThemedText style={styles.saveButtonText}>
              {isNew ? 'Crear Tarifa' : 'Guardar Cambios'}
            </ThemedText>
          </Pressable>
        )}

        {!isNew && !isEditing && (
          <Pressable style={[styles.deleteButton, { borderColor: error }]} onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel="Eliminar"
            accessibilityHint="Pulsa para eliminar este elemento">
            <IconSymbol name="trash.fill" size={20} color={error} />
            <ThemedText style={[styles.deleteButtonText, { color: error }]}>
              Eliminar Tarifa
            </ThemedText>
          </Pressable>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  section: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  inputGroup: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  sublabel: {
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  value: {
    fontSize: 16,
    paddingVertical: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  totalLabel: {
    fontSize: 14,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 4,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  saveButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
