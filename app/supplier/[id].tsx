import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { Supplier, SupplierType, SUPPLIER_TYPE_LABELS, DEFAULT_SUPPLIER } from '@/types/supplier';

const SUPPLIER_TYPES: SupplierType[] = ['manufacturer', 'distributor', 'parts_supplier', 'tools_supplier', 'strings_supplier', 'other'];

export default function SupplierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useSuppliers();

  const isNew = id === 'new';
  const existingSupplier = suppliers.find(s => s.id === id);

  const [form, setForm] = useState<Partial<Supplier>>(
    existingSupplier || { ...DEFAULT_SUPPLIER }
  );

  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'textSecondary');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const accent = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');

  useEffect(() => {
    if (existingSupplier) {
      setForm(existingSupplier);
    }
  }, [existingSupplier]);

  const handleSave = async () => {
    if (!form.name?.trim()) {
      Alert.alert('Error', 'El nombre del proveedor es obligatorio');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (isNew) {
      await addSupplier(form as Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>);
    } else {
      await updateSupplier(id!, form);
    }
    router.back();
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Proveedor',
      `¿Estás seguro de que quieres eliminar a ${form.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deleteSupplier(id!);
            router.back();
          },
        },
      ]
    );
  };

  const renderInput = (
    label: string,
    value: string | undefined,
    key: keyof Supplier,
    options?: { multiline?: boolean; keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url' }
  ) => (
    <View style={styles.inputGroup}>
      <ThemedText style={[styles.label, { color: secondaryText }]}>{label}</ThemedText>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: cardBg, borderColor, color: textColor },
          options?.multiline && styles.multilineInput,
        ]}
        value={value || ''}
        onChangeText={(text) => setForm({ ...form, [key]: text })}
        placeholder={`Introduce ${label.toLowerCase()}`}
        placeholderTextColor={secondaryText}
        multiline={options?.multiline}
        keyboardType={options?.keyboardType}
        autoCapitalize={options?.keyboardType === 'email-address' ? 'none' : 'sentences'}
      />
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={accent} />
        </Pressable>
        <ThemedText type="title" style={styles.title}>
          {isNew ? 'Nuevo Proveedor' : 'Editar Proveedor'}
        </ThemedText>
        <Pressable onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Guardar cambios"
            accessibilityHint="Pulsa para guardar los datos" style={[styles.saveButton, { backgroundColor: accent }]}>
          <ThemedText style={styles.saveButtonText}>Guardar</ThemedText>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Información básica */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={styles.sectionTitle}>Información Básica</ThemedText>
          
          {renderInput('Nombre *', form.name, 'name')}
          
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: secondaryText }]}>Tipo de Proveedor</ThemedText>
            <View style={styles.typeGrid}>
              {SUPPLIER_TYPES.map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.typeButton,
                    { borderColor },
                    form.type === type && { backgroundColor: `${accent}20`, borderColor: accent },
                  ]}
                  onPress={() => setForm({ ...form, type })}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      { color: textColor },
                      form.type === type && { color: accent, fontWeight: '600' },
                    ]}
                    numberOfLines={1}
                  >
                    {SUPPLIER_TYPE_LABELS[type]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {renderInput('Persona de Contacto', form.contactPerson, 'contactPerson')}
        </View>

        {/* Contacto */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={styles.sectionTitle}>Contacto</ThemedText>
          {renderInput('Teléfono', form.phone, 'phone', { keyboardType: 'phone-pad' })}
          {renderInput('Email', form.email, 'email', { keyboardType: 'email-address' })}
          {renderInput('Sitio Web', form.website, 'website', { keyboardType: 'url' })}
        </View>

        {/* Tienda Online */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={styles.sectionTitle}>Tienda Online</ThemedText>
          <ThemedText style={[styles.helpText, { color: secondaryText }]}>
            URL de la tienda para realizar pedidos directamente cuando haya stock bajo
          </ThemedText>
          {renderInput('URL de la Tienda', form.storeUrl, 'storeUrl', { keyboardType: 'url' })}
        </View>

        {/* Dirección */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={styles.sectionTitle}>Dirección</ThemedText>
          {renderInput('Dirección', form.address, 'address')}
          {renderInput('Ciudad', form.city, 'city')}
          {renderInput('País', form.country, 'country')}
        </View>

        {/* Condiciones comerciales */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={styles.sectionTitle}>Condiciones Comerciales</ThemedText>
          {renderInput('Condiciones de Pago', form.paymentTerms, 'paymentTerms')}
          {renderInput('Tiempo de Entrega', form.deliveryTime, 'deliveryTime')}
          {renderInput('Pedido Mínimo', form.minOrder, 'minOrder')}
        </View>

        {/* Notas */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={styles.sectionTitle}>Notas</ThemedText>
          {renderInput('Notas', form.notes, 'notes', { multiline: true })}
        </View>

        {/* Estado */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <Pressable
            style={styles.toggleRow}
            onPress={() => setForm({ ...form, isActive: !form.isActive })}
          >
            <ThemedText>Proveedor Activo</ThemedText>
            <View style={[styles.toggle, form.isActive && { backgroundColor: accent }]}>
              <View style={[styles.toggleThumb, form.isActive && styles.toggleThumbActive]} />
            </View>
          </Pressable>
        </View>

        {/* Eliminar */}
        {!isNew && (
          <Pressable style={styles.deleteButton} onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel="Eliminar"
            accessibilityHint="Pulsa para eliminar este elemento">
            <IconSymbol name="trash.fill" size={20} color="#EF4444" />
            <ThemedText style={styles.deleteButtonText}>Eliminar Proveedor</ThemedText>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: 20,
  },
  saveButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
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
    overflow: 'visible',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  helpText: {
    fontSize: 12,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  input: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'column',
    gap: Spacing.sm,
  },
  typeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  typeButtonText: {
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 4,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    padding: 2,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteButtonText: {
    color: '#EF4444',
    fontWeight: '600',
  },
});
