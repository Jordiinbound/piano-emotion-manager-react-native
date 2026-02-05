import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Image,
  ActionSheetIOS,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

import { ServiceCard } from '@/components/cards';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useClientsData, usePianosData, useServicesData } from '@/hooks/data';
import { useRecommendations } from '@/hooks/use-recommendations';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import {
  Piano,
  PianoCategory,
  PianoType,
  PianoCondition,
  PIANO_CATEGORY_LABELS,
  PIANO_CONDITION_LABELS,
  PIANO_CONDITION_COLORS,
  getPianoTypesForCategory,
  getPianoTypeLabel,
  getClientFullName,
} from '@/types';

export default function PianoDetailScreen() {
  const { id, clientId: initialClientId } = useLocalSearchParams<{ id: string; clientId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isNew = id === 'new';

  const { clients, getClient } = useClientsData();
  const { pianos, addPiano, updatePiano, deletePiano, getPiano } = usePianosData();
  const { services, getServicesByPiano } = useServicesData();
  const { getRecommendationsForPiano } = useRecommendations(pianos, services);

  const [isEditing, setIsEditing] = useState(isNew);
  const [form, setForm] = useState<Partial<Piano>>({
    clientId: initialClientId || '',
    brand: '',
    model: '',
    serialNumber: '',
    year: undefined,
    category: 'vertical',
    type: 'console',
    size: undefined,
    condition: 'unknown',
    photo: '',
    notes: '',
    // Configuración de alertas
    alertsEnabled: true,
    customThresholdsEnabled: false,
    tuningIntervalDays: 180,
    regulationIntervalDays: 730,
  });

  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accent = useThemeColor({}, 'accent');
  const error = useThemeColor({}, 'error');
  const textColor = useThemeColor({}, 'text');

  // Cargar datos del piano existente
  useEffect(() => {
    if (!isNew && id) {
      const piano = getPiano(id);
      if (piano) {
        setForm(piano);
      }
    }
  }, [id, isNew, pianos]);

  // Actualizar tipo cuando cambia la categoría
  useEffect(() => {
    if (isEditing) {
      const types = getPianoTypesForCategory(form.category || 'vertical');
      if (types.length > 0 && !types.find(t => t.key === form.type)) {
        setForm(prev => ({ ...prev, type: types[0].key }));
      }
    }
  }, [form.category, isEditing]);

  const pianoServices = !isNew && id ? getServicesByPiano(id) : [];
  const recommendations = !isNew && id ? getRecommendationsForPiano(id) : [];
  const client = form.clientId ? getClient(form.clientId) : null;

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.clientId) {
      Alert.alert('Error', 'Debes seleccionar un cliente');
      return;
    }
    if (!form.brand?.trim()) {
      Alert.alert('Error', 'La marca es obligatoria');
      return;
    }
    if (!form.model?.trim()) {
      Alert.alert('Error', 'El modelo es obligatorio');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      if (isNew) {
        const newPiano = await addPiano({
          clientId: form.clientId,
          brand: form.brand.trim(),
          model: form.model.trim(),
          serialNumber: form.serialNumber?.trim(),
          year: form.year,
          category: form.category || 'vertical',
          type: form.type || 'console',
          size: form.size,
          condition: form.condition || 'unknown',
          photo: form.photo,
          notes: form.notes?.trim(),
          // Configuración de alertas
          alertsEnabled: form.alertsEnabled ?? true,
          customThresholdsEnabled: form.customThresholdsEnabled ?? false,
          tuningIntervalDays: form.tuningIntervalDays ?? 180,
          regulationIntervalDays: form.regulationIntervalDays ?? 730,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Éxito', 'Piano creado correctamente');
        router.replace({
          pathname: '/piano/[id]',
          params: { id: newPiano.id },
        });
      } else if (id) {
        await updatePiano(id, form);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Éxito', 'Piano actualizado correctamente');
        setIsEditing(false);
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar el piano';
      setSaveError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar piano',
      '¿Estás seguro de que quieres eliminar este piano? Se perderá todo el historial de servicios asociado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deletePiano(id!);
            router.back();
          },
        },
      ]
    );
  };

  const handleAddService = () => {
    router.push({
      pathname: '/service/[id]' as any,
      params: { id: 'new', pianoId: id, clientId: form.clientId },
    });
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      let result;
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permiso denegado', 'Necesitas permitir el acceso a la cámara');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: 'images',
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permiso denegado', 'Necesitas permitir el acceso a la galería');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }
      if (!result.canceled && result.assets[0]) {
        setForm({ ...form, photo: result.assets[0].uri });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const showImageOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancelar', 'Tomar foto', 'Elegir de galería', 'Eliminar foto'],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickImage(true);
          else if (buttonIndex === 2) pickImage(false);
          else if (buttonIndex === 3) setForm({ ...form, photo: '' });
        }
      );
    } else {
      Alert.alert(
        'Foto del piano',
        'Selecciona una opción',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Tomar foto', onPress: () => pickImage(true) },
          { text: 'Elegir de galería', onPress: () => pickImage(false) },
          ...(form.photo ? [{ text: 'Eliminar foto', style: 'destructive' as const, onPress: () => setForm({ ...form, photo: '' }) }] : []),
        ]
      );
    }
  };

  const handleServicePress = (serviceId: string) => {
    router.push({
      pathname: '/service/[id]' as any,
      params: { id: serviceId },
    });
  };

  const conditionColor = PIANO_CONDITION_COLORS[form.condition || 'unknown'];
  const pianoTypes = getPianoTypesForCategory(form.category || 'vertical');

  const renderInput = (
    label: string,
    key: keyof Piano,
    placeholder: string,
    options?: { keyboardType?: 'default' | 'numeric'; multiline?: boolean }
  ) => (
    <View style={styles.inputGroup}>
      <ThemedText style={[styles.label, { color: textSecondary }]}>{label}</ThemedText>
      {isEditing ? (
        <TextInput
          style={[
            styles.input,
            { backgroundColor: cardBg, borderColor, color: textColor },
            options?.multiline && styles.inputMultiline,
          ]}
          value={form[key]?.toString() || ''}
          onChangeText={(text) => {
            if (options?.keyboardType === 'numeric') {
              setForm({ ...form, [key]: text ? parseInt(text, 10) : undefined });
            } else {
              setForm({ ...form, [key]: text });
            }
          }}
          placeholder={placeholder}
          placeholderTextColor={textSecondary}
          keyboardType={options?.keyboardType}
          multiline={options?.multiline}
          numberOfLines={options?.multiline ? 3 : 1}
        />
      ) : (
        <ThemedText style={styles.value}>{form[key]?.toString() || '-'}</ThemedText>
      )}
    </View>
  );

  const renderClientSelector = () => (
    <View style={styles.inputGroup}>
      <ThemedText style={[styles.label, { color: textSecondary }]}>Cliente *</ThemedText>
      {isEditing ? (
        clients.length === 0 ? (
          <View style={[styles.emptyClientState, { backgroundColor: cardBg, borderColor }]}>
            <ThemedText style={[styles.emptyClientText, { color: textSecondary }]}>
              No hay clientes registrados
            </ThemedText>
            <Pressable
              style={[styles.createClientButton, { backgroundColor: accent }]}
              onPress={() => router.push('/client/new')}
            >
              <ThemedText style={styles.createClientButtonText}>+ Crear cliente</ThemedText>
            </Pressable>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            <View style={styles.clientSelector}>
              {clients.map((c) => (
                <Pressable
                  key={c.id}
                  style={[
                    styles.clientOption,
                    { backgroundColor: cardBg, borderColor },
                    form.clientId === c.id && { backgroundColor: accent, borderColor: accent },
                  ]}
                  onPress={() => setForm({ ...form, clientId: c.id })}
                >
                  <ThemedText
                    style={[
                      styles.clientText,
                      { color: form.clientId === c.id ? '#FFFFFF' : textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {getClientFullName(c)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )
      ) : (
        <ThemedText style={styles.value}>{client ? getClientFullName(client) : '-'}</ThemedText>
      )}
    </View>
  );

  const renderCategorySelector = () => (
    <View style={styles.inputGroup}>
      <ThemedText style={[styles.label, { color: textSecondary }]}>Categoría</ThemedText>
      {isEditing ? (
        <View style={styles.selectorRow}>
          {(['vertical', 'grand'] as PianoCategory[]).map((cat) => (
            <Pressable
              key={cat}
              style={[
                styles.selectorOption,
                { backgroundColor: cardBg, borderColor },
                form.category === cat && { backgroundColor: accent, borderColor: accent },
              ]}
              onPress={() => setForm({ ...form, category: cat })}
            >
              <ThemedText
                style={[
                  styles.selectorText,
                  { color: form.category === cat ? '#FFFFFF' : textSecondary },
                ]}
              >
                {PIANO_CATEGORY_LABELS[cat]}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : (
        <ThemedText style={styles.value}>
          {PIANO_CATEGORY_LABELS[form.category || 'vertical']}
        </ThemedText>
      )}
    </View>
  );

  const renderTypeSelector = () => (
    <View style={styles.inputGroup}>
      <ThemedText style={[styles.label, { color: textSecondary }]}>
        Tipo ({form.category === 'vertical' ? 'por altura' : 'por longitud'})
      </ThemedText>
      {isEditing ? (
        <View style={styles.typeGrid}>
          {pianoTypes.map((pt) => (
            <Pressable
              key={pt.key}
              style={[
                styles.typeOption,
                { backgroundColor: cardBg, borderColor },
                form.type === pt.key && { backgroundColor: accent, borderColor: accent },
              ]}
              onPress={() => setForm({ ...form, type: pt.key })}
            >
              <ThemedText
                style={[
                  styles.typeLabel,
                  { color: form.type === pt.key ? '#FFFFFF' : textColor },
                ]}
              >
                {pt.label}
              </ThemedText>
              <ThemedText
                style={[
                  styles.typeDesc,
                  { color: form.type === pt.key ? '#FFFFFF' : textSecondary },
                ]}
              >
                {pt.description}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : (
        <ThemedText style={styles.value}>
          {getPianoTypeLabel(form.type || 'console')}
        </ThemedText>
      )}
    </View>
  );

  const renderConditionSelector = () => (
    <View style={styles.inputGroup}>
      <ThemedText style={[styles.label, { color: textSecondary }]}>Estado</ThemedText>
      {isEditing ? (
        <View style={styles.selectorRow}>
          {(['tunable', 'needs_repair', 'unknown'] as PianoCondition[]).map((cond) => {
            const color = PIANO_CONDITION_COLORS[cond];
            return (
              <Pressable
                key={cond}
                style={[
                  styles.conditionOption,
                  { backgroundColor: `${color}15`, borderColor: color },
                  form.condition === cond && { backgroundColor: color },
                ]}
                onPress={() => setForm({ ...form, condition: cond })}
              >
                <ThemedText
                  style={[
                    styles.conditionOptionText,
                    { color: form.condition === cond ? '#FFFFFF' : color },
                  ]}
                >
                  {PIANO_CONDITION_LABELS[cond]}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <ThemedText style={styles.value}>
          {PIANO_CONDITION_LABELS[form.condition || 'unknown']}
        </ThemedText>
      )}
    </View>
  );

  const renderAlertConfiguration = () => (
    <View style={styles.alertConfigSection}>
      <View style={styles.alertConfigHeader}>
        <IconSymbol name="bell.fill" size={20} color={accent} />
        <ThemedText style={[styles.alertConfigTitle, { color: textColor }]}>
          Configuración de Alertas
        </ThemedText>
      </View>
      
      {isEditing ? (
        <View style={styles.alertConfigContent}>
          {/* Switch para activar/desactivar alertas */}
          <View style={styles.alertConfigRow}>
            <View style={styles.alertConfigLabelContainer}>
              <ThemedText style={[styles.alertConfigLabel, { color: textColor }]}>
                Alertas activadas
              </ThemedText>
              <ThemedText style={[styles.alertConfigDescription, { color: textSecondary }]}>
                Recibir notificaciones de mantenimiento
              </ThemedText>
            </View>
            <Pressable
              style={[
                styles.switchContainer,
                { backgroundColor: form.alertsEnabled ? accent : borderColor },
              ]}
              onPress={() => setForm({ ...form, alertsEnabled: !form.alertsEnabled })}
            >
              <View
                style={[
                  styles.switchThumb,
                  { backgroundColor: '#FFFFFF' },
                  form.alertsEnabled && styles.switchThumbActive,
                ]}
              />
            </Pressable>
          </View>

          {/* Switch para umbrales personalizados */}
          {form.alertsEnabled && (
            <View style={styles.alertConfigRow}>
              <View style={styles.alertConfigLabelContainer}>
                <ThemedText style={[styles.alertConfigLabel, { color: textColor }]}>
                  Umbrales personalizados
                </ThemedText>
                <ThemedText style={[styles.alertConfigDescription, { color: textSecondary }]}>
                  Usar intervalos específicos para este piano
                </ThemedText>
              </View>
              <Pressable
                style={[
                  styles.switchContainer,
                  { backgroundColor: form.customThresholdsEnabled ? accent : borderColor },
                ]}
                onPress={() => setForm({ ...form, customThresholdsEnabled: !form.customThresholdsEnabled })}
              >
                <View
                  style={[
                    styles.switchThumb,
                    { backgroundColor: '#FFFFFF' },
                    form.customThresholdsEnabled && styles.switchThumbActive,
                  ]}
                />
              </Pressable>
            </View>
          )}

          {/* Configuración de intervalos personalizados */}
          {form.alertsEnabled && form.customThresholdsEnabled && (
            <View style={styles.customThresholdsContainer}>
              {/* Intervalo de afinación */}
              <View style={styles.thresholdInputGroup}>
                <View style={styles.thresholdLabelRow}>
                  <IconSymbol name="tuningfork" size={18} color={accent} />
                  <ThemedText style={[styles.thresholdLabel, { color: textColor }]}>
                    Intervalo de afinación
                  </ThemedText>
                </View>
                <ThemedText style={[styles.thresholdDescription, { color: textSecondary }]}>
                  Días entre afinaciones (recomendado: 180 días / 6 meses)
                </ThemedText>
                <View style={styles.thresholdInputContainer}>
                  <TextInput
                    style={[
                      styles.thresholdInput,
                      { backgroundColor: cardBg, borderColor, color: textColor },
                    ]}
                    value={form.tuningIntervalDays?.toString() || '180'}
                    onChangeText={(text) => {
                      const value = parseInt(text, 10);
                      setForm({ ...form, tuningIntervalDays: isNaN(value) ? 180 : value });
                    }}
                    placeholder="180"
                    placeholderTextColor={textSecondary}
                    keyboardType="numeric"
                  />
                  <ThemedText style={[styles.thresholdUnit, { color: textSecondary }]}>
                    días
                  </ThemedText>
                </View>
                <View style={styles.thresholdExamples}>
                  <Pressable
                    style={[styles.thresholdExample, { borderColor }]}
                    onPress={() => setForm({ ...form, tuningIntervalDays: 90 })}
                  >
                    <ThemedText style={[styles.thresholdExampleText, { color: textSecondary }]}>
                      3 meses (90)
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.thresholdExample, { borderColor }]}
                    onPress={() => setForm({ ...form, tuningIntervalDays: 180 })}
                  >
                    <ThemedText style={[styles.thresholdExampleText, { color: textSecondary }]}>
                      6 meses (180)
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.thresholdExample, { borderColor }]}
                    onPress={() => setForm({ ...form, tuningIntervalDays: 365 })}
                  >
                    <ThemedText style={[styles.thresholdExampleText, { color: textSecondary }]}>
                      1 año (365)
                    </ThemedText>
                  </Pressable>
                </View>
              </View>

              {/* Intervalo de regulación */}
              <View style={styles.thresholdInputGroup}>
                <View style={styles.thresholdLabelRow}>
                  <IconSymbol name="wrench.fill" size={18} color={accent} />
                  <ThemedText style={[styles.thresholdLabel, { color: textColor }]}>
                    Intervalo de regulación
                  </ThemedText>
                </View>
                <ThemedText style={[styles.thresholdDescription, { color: textSecondary }]}>
                  Días entre regulaciones (recomendado: 730 días / 2 años)
                </ThemedText>
                <View style={styles.thresholdInputContainer}>
                  <TextInput
                    style={[
                      styles.thresholdInput,
                      { backgroundColor: cardBg, borderColor, color: textColor },
                    ]}
                    value={form.regulationIntervalDays?.toString() || '730'}
                    onChangeText={(text) => {
                      const value = parseInt(text, 10);
                      setForm({ ...form, regulationIntervalDays: isNaN(value) ? 730 : value });
                    }}
                    placeholder="730"
                    placeholderTextColor={textSecondary}
                    keyboardType="numeric"
                  />
                  <ThemedText style={[styles.thresholdUnit, { color: textSecondary }]}>
                    días
                  </ThemedText>
                </View>
                <View style={styles.thresholdExamples}>
                  <Pressable
                    style={[styles.thresholdExample, { borderColor }]}
                    onPress={() => setForm({ ...form, regulationIntervalDays: 365 })}
                  >
                    <ThemedText style={[styles.thresholdExampleText, { color: textSecondary }]}>
                      1 año (365)
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.thresholdExample, { borderColor }]}
                    onPress={() => setForm({ ...form, regulationIntervalDays: 730 })}
                  >
                    <ThemedText style={[styles.thresholdExampleText, { color: textSecondary }]}>
                      2 años (730)
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.thresholdExample, { borderColor }]}
                    onPress={() => setForm({ ...form, regulationIntervalDays: 1095 })}
                  >
                    <ThemedText style={[styles.thresholdExampleText, { color: textSecondary }]}>
                      3 años (1095)
                    </ThemedText>
                  </Pressable>
                </View>
              </View>

              {/* Información sobre cómo funcionan las alertas */}
              <View style={[styles.alertInfoBox, { backgroundColor: `${accent}10`, borderColor: accent }]}>
                <IconSymbol name="info.circle.fill" size={16} color={accent} />
                <ThemedText style={[styles.alertInfoText, { color: textColor }]}>
                  Las alertas se generarán cuando se alcance el intervalo configurado. 
                  Una alerta urgente aparecerá al 150% del intervalo (ej: 270 días para afinación de 180 días).
                </ThemedText>
              </View>
            </View>
          )}

          {/* Mensaje cuando las alertas están desactivadas */}
          {!form.alertsEnabled && (
            <View style={[styles.alertDisabledBox, { backgroundColor: `${textSecondary}10`, borderColor: textSecondary }]}>
              <IconSymbol name="bell.slash.fill" size={16} color={textSecondary} />
              <ThemedText style={[styles.alertDisabledText, { color: textSecondary }]}>
                Las alertas están desactivadas para este piano. No recibirás notificaciones de mantenimiento.
              </ThemedText>
            </View>
          )}

          {/* Mensaje cuando se usan umbrales globales */}
          {form.alertsEnabled && !form.customThresholdsEnabled && (
            <View style={[styles.alertGlobalBox, { backgroundColor: `${accent}10`, borderColor: accent }]}>
              <IconSymbol name="globe" size={16} color={accent} />
              <ThemedText style={[styles.alertGlobalText, { color: textColor }]}>
                Este piano usa los umbrales globales configurados en Configuración de Alertas.
              </ThemedText>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.alertConfigContent}>
          {/* Vista de solo lectura */}
          <View style={styles.alertConfigReadOnly}>
            <View style={styles.alertConfigReadOnlyRow}>
              <ThemedText style={[styles.alertConfigReadOnlyLabel, { color: textSecondary }]}>
                Estado:
              </ThemedText>
              <View style={styles.alertConfigReadOnlyValue}>
                <View
                  style={[
                    styles.alertStatusDot,
                    { backgroundColor: form.alertsEnabled ? '#10B981' : '#EF4444' },
                  ]}
                />
                <ThemedText style={[styles.alertConfigReadOnlyText, { color: textColor }]}>
                  {form.alertsEnabled ? 'Activadas' : 'Desactivadas'}
                </ThemedText>
              </View>
            </View>

            {form.alertsEnabled && (
              <>
                <View style={styles.alertConfigReadOnlyRow}>
                  <ThemedText style={[styles.alertConfigReadOnlyLabel, { color: textSecondary }]}>
                    Umbrales:
                  </ThemedText>
                  <ThemedText style={[styles.alertConfigReadOnlyText, { color: textColor }]}>
                    {form.customThresholdsEnabled ? 'Personalizados' : 'Globales'}
                  </ThemedText>
                </View>

                {form.customThresholdsEnabled && (
                  <>
                    <View style={styles.alertConfigReadOnlyRow}>
                      <ThemedText style={[styles.alertConfigReadOnlyLabel, { color: textSecondary }]}>
                        Afinación:
                      </ThemedText>
                      <ThemedText style={[styles.alertConfigReadOnlyText, { color: textColor }]}>
                        Cada {form.tuningIntervalDays || 180} días
                      </ThemedText>
                    </View>
                    <View style={styles.alertConfigReadOnlyRow}>
                      <ThemedText style={[styles.alertConfigReadOnlyLabel, { color: textSecondary }]}>
                        Regulación:
                      </ThemedText>
                      <ThemedText style={[styles.alertConfigReadOnlyText, { color: textColor }]}>
                        Cada {form.regulationIntervalDays || 730} días
                      </ThemedText>
                    </View>
                  </>
                )}
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: isNew ? 'Nuevo Piano' : `${form.brand} ${form.model}`,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ marginRight: 16 }}>
              <IconSymbol name="chevron.left" size={24} color={accent} />
            </Pressable>
          ),
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
        {/* Estado del piano */}
        {!isNew && (
          <View style={[styles.conditionBanner, { backgroundColor: `${conditionColor}15`, borderColor: conditionColor }]}>
            <View style={[styles.conditionDot, { backgroundColor: conditionColor }]} />
            <ThemedText style={[styles.conditionText, { color: conditionColor }]}>
              {PIANO_CONDITION_LABELS[form.condition || 'unknown']}
            </ThemedText>
          </View>
        )}

        {/* Información del piano */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          {renderClientSelector()}
          {renderInput('Marca *', 'brand', 'Ej: Yamaha, Steinway...')}
          {renderInput('Modelo *', 'model', 'Ej: U1, Model D...')}
          {renderInput('Número de serie', 'serialNumber', 'Número de serie')}
          {renderInput('Año de fabricación', 'year', 'Ej: 2015', { keyboardType: 'numeric' })}
          {renderCategorySelector()}
          {renderTypeSelector()}
          {renderInput(
            form.category === 'vertical' ? 'Altura (cm)' : 'Longitud (cm)',
            'size',
            form.category === 'vertical' ? 'Ej: 121' : 'Ej: 180',
            { keyboardType: 'numeric' }
          )}
          {isEditing && renderConditionSelector()}

          {/* Foto del piano */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: textSecondary }]}>Foto del piano</ThemedText>
            {form.photo ? (
              <Pressable onPress={isEditing ? showImageOptions : undefined} style={styles.photoContainer}>
                <Image source={{ uri: form.photo }} style={styles.pianoPhoto} resizeMode="cover" />
                {isEditing && (
                  <View style={styles.photoOverlay}>
                    <IconSymbol name="camera.fill" size={24} color="#FFFFFF" />
                    <ThemedText style={styles.photoOverlayText}>Cambiar foto</ThemedText>
                  </View>
                )}
              </Pressable>
            ) : isEditing ? (
              <Pressable
                onPress={showImageOptions}
                style={[styles.addPhotoButton, { borderColor, backgroundColor: cardBg }]}
              >
                <IconSymbol name="camera.fill" size={32} color={textSecondary} />
                <ThemedText style={[styles.addPhotoText, { color: textSecondary }]}>Añadir foto</ThemedText>
              </Pressable>
            ) : (
              <ThemedText style={{ color: textSecondary }}>Sin foto</ThemedText>
            )}
          </View>

          {renderInput('Notas', 'notes', 'Notas adicionales...', { multiline: true })}
          
          {/* Configuración de Alertas */}
          {renderAlertConfiguration()}
        </View>

        {/* Recomendaciones */}
        {!isNew && recommendations.length > 0 && (
          <View style={styles.recommendationsSection}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Recomendaciones</ThemedText>
            {recommendations.map((rec, index) => (
              <View
                key={index}
                style={[
                  styles.recommendationCard,
                  {
                    backgroundColor: rec.priority === 'urgent' ? '#FEE2E2' : rec.priority === 'pending' ? '#FEF3C7' : '#D1FAE5',
                    borderColor: rec.priority === 'urgent' ? '#EF4444' : rec.priority === 'pending' ? '#F59E0B' : '#10B981',
                  },
                ]}
              >
                <IconSymbol
                  name={rec.priority === 'urgent' ? 'exclamationmark.triangle.fill' : 'info.circle.fill'}
                  size={20}
                  color={rec.priority === 'urgent' ? '#EF4444' : rec.priority === 'pending' ? '#F59E0B' : '#10B981'}
                />
                <ThemedText style={styles.recommendationText}>{rec.message}</ThemedText>
              </View>
            ))}
            
            {/* Acciones recomendadas */}
            {client && (
              <View style={styles.actionsContainer}>
                <ThemedText style={[styles.actionsTitle, { color: textColor }]}>Acciones recomendadas</ThemedText>
                <View style={styles.actionsButtons}>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: accent, borderColor: accent }]}
                    onPress={() => {
                      const clientName = `${client.firstName} ${client.lastName1}`;
                      const phone = client.phone;
                      const email = client.email;
                      
                      if (Platform.OS === 'ios') {
                        const options = [];
                        if (phone) {
                          options.push('WhatsApp');
                          options.push('Llamar');
                        }
                        if (email) options.push('Email');
                        options.push('Cancelar');
                        
                        ActionSheetIOS.showActionSheetWithOptions(
                          {
                            title: `Contactar a ${clientName}`,
                            options,
                            cancelButtonIndex: options.length - 1,
                          },
                          (buttonIndex) => {
                            if (phone && buttonIndex === 0) {
                              const message = encodeURIComponent(`Hola ${client.firstName}, necesitamos programar el mantenimiento de tu piano.`);
                              Linking.openURL(`whatsapp://send?phone=${phone}&text=${message}`);
                            } else if (phone && buttonIndex === 1) {
                              Linking.openURL(`tel:${phone}`);
                            } else if (email && buttonIndex === (phone ? 2 : 0)) {
                              const subject = encodeURIComponent('Mantenimiento de piano');
                              const body = encodeURIComponent(`Hola ${client.firstName},\n\nNecesitamos programar el mantenimiento de tu piano.\n\nSaludos`);
                              Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
                            }
                          }
                        );
                      } else {
                        const buttons = [];
                        if (phone) {
                          buttons.push({ text: 'WhatsApp', onPress: () => {
                            const message = encodeURIComponent(`Hola ${client.firstName}, necesitamos programar el mantenimiento de tu piano.`);
                            Linking.openURL(`whatsapp://send?phone=${phone}&text=${message}`);
                          }});
                          buttons.push({ text: 'Llamar', onPress: () => Linking.openURL(`tel:${phone}`) });
                        }
                        if (email) {
                          buttons.push({ text: 'Email', onPress: () => {
                            const subject = encodeURIComponent('Mantenimiento de piano');
                            const body = encodeURIComponent(`Hola ${client.firstName},\n\nNecesitamos programar el mantenimiento de tu piano.\n\nSaludos`);
                            Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
                          }});
                        }
                        buttons.push({ text: 'Cancelar', style: 'cancel' });
                        
                        Alert.alert(`Contactar a ${clientName}`, 'Selecciona una opción:', buttons);
                      }
                    }}
                  >
                    <IconSymbol name="phone.fill" size={18} color="#FFFFFF" />
                    <ThemedText style={styles.actionButtonText}>Contactar cliente</ThemedText>
                  </Pressable>
                  
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: cardBg, borderColor: accent }]}
                    onPress={() => router.push({ pathname: '/appointment/[id]' as any, params: { id: 'new', pianoId: id, clientId: client.id } })}
                  >
                    <IconSymbol name="calendar" size={18} color={accent} />
                    <ThemedText style={[styles.actionButtonTextOutline, { color: accent }]}>Programar cita</ThemedText>
                  </Pressable>
                  
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: cardBg, borderColor: accent }]}
                    onPress={handleAddService}
                  >
                    <IconSymbol name="wrench.fill" size={18} color={accent} />
                    <ThemedText style={[styles.actionButtonTextOutline, { color: accent }]}>Crear servicio</ThemedText>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Historial de servicios */}
        {!isNew && (
          <View style={styles.servicesSection}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">Historial de Servicios</ThemedText>
              <Pressable onPress={handleAddService}>
                <IconSymbol name="plus.circle.fill" size={28} color={accent} />
              </Pressable>
            </View>

            {pianoServices.length === 0 ? (
              <View style={[styles.emptyServices, { backgroundColor: cardBg, borderColor }]}>
                <ThemedText style={{ color: textSecondary, textAlign: 'center' }}>
                  No hay servicios registrados para este piano.
                </ThemedText>
              </View>
            ) : (
              pianoServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onPress={() => handleServicePress(service.id)}
                />
              ))
            )}
          </View>
        )}

        {/* Botones de acción */}
        {isEditing && (
          <Pressable style={[styles.saveButton, { backgroundColor: accent }]} onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Guardar cambios"
            accessibilityHint="Pulsa para guardar los datos">
            <ThemedText style={styles.saveButtonText}>
              {isNew ? 'Crear Piano' : 'Guardar Cambios'}
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
              Eliminar Piano
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
  },
  conditionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  conditionDot: {
    width: 10,
    height: 10,
    borderRadius: 4,
  },
  conditionText: {
    fontWeight: '600',
  },
  section: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  inputGroup: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
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
  horizontalScroll: {
    marginHorizontal: -Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  clientSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  clientOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  clientText: {
    fontSize: 14,
  },
  emptyClientState: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyClientText: {
    fontSize: 14,
    textAlign: 'center',
  },
  createClientButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  createClientButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  selectorRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  selectorOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  selectorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  typeGrid: {
    gap: Spacing.sm,
  },
  typeOption: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  typeLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  typeDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  conditionOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  conditionOptionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  recommendationsSection: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actionsContainer: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#00000010',
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  actionsButtons: {
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  actionButtonTextOutline: {
    fontSize: 15,
    fontWeight: '700',
  },
  servicesSection: {
    marginTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyServices: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  saveButton: {
    marginTop: Spacing.lg,
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
    marginTop: Spacing.lg,
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
  photoContainer: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  pianoPhoto: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  photoOverlayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  addPhotoButton: {
    width: '100%',
    height: 150,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  addPhotoText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Estilos de configuración de alertas
  alertConfigSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  alertConfigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  alertConfigTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  alertConfigContent: {
    gap: Spacing.md,
  },
  alertConfigRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  alertConfigLabelContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  alertConfigLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  alertConfigDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  switchContainer: {
    width: 50,
    height: 28,
    borderRadius: 4,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  switchThumbActive: {
    marginLeft: 22,
  },
  customThresholdsContainer: {
    gap: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  thresholdInputGroup: {
    gap: Spacing.sm,
  },
  thresholdLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  thresholdLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  thresholdDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  thresholdInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  thresholdInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  thresholdUnit: {
    fontSize: 15,
    fontWeight: '500',
  },
  thresholdExamples: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  thresholdExample: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  thresholdExampleText: {
    fontSize: 13,
  },
  alertInfoBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  alertInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  alertDisabledBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  alertDisabledText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  alertGlobalBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  alertGlobalText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  alertConfigReadOnly: {
    gap: Spacing.sm,
  },
  alertConfigReadOnlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  alertConfigReadOnlyLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  alertConfigReadOnlyValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  alertConfigReadOnlyText: {
    fontSize: 14,
  },
  alertStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
