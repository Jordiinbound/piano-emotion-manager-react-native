import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Share, Platform } from 'react-native';

import { PianoCard } from '@/components/cards';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { useSnackbar } from '@/components/snackbar';
import { CitySelector } from '@/components/city-selector';
import { useClientsData, usePianosData, useServicesData } from '@/hooks/data';
import { useWhatsApp } from '@/hooks/use-whatsapp';
import { generatePortalUrl } from '@/hooks/use-client-portal';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { Client, ClientType, ClientAddress, Piano, CLIENT_TYPE_LABELS, getClientFullName, getClientFormattedAddress } from '@/types';
import { validateSpanishTaxId, TaxIdValidationResult } from '@/utils/spanish-tax-id';
import { trpc } from '@/utils/trpc';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isNew = id === 'new';

  const { clients, addClient, updateClient, deleteClient, getClient } = useClientsData();
  const { pianos, getPianosByClient } = usePianosData();
  const { getServicesByClient } = useServicesData();
  const { error: showError } = useSnackbar();
  const { sendCustomMessage } = useWhatsApp();

  const [isEditing, setIsEditing] = useState(isNew);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [form, setForm] = useState<Partial<Client>>({
    firstName: '',
    lastName1: '',
    lastName2: '',
    taxId: '',
    type: 'individual',
    phone: '',
    email: '',
    address: {
      street: '',
      number: '',
      floor: '',
      postalCode: '',
      city: '',
      province: '',
    },
    shippingAddress: {
      street: '',
      number: '',
      floor: '',
      postalCode: '',
      city: '',
      province: '',
    },
    notes: '',
    routeId: undefined,
    isVip: false,
  });
  const [taxIdValidation, setTaxIdValidation] = useState<TaxIdValidationResult | null>(null);

  // Cargar rutas desde BD
  const { data: routes = [] } = trpc.routes.list.useQuery();

  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accent = useThemeColor({}, 'accent');
  const error = useThemeColor({}, 'error');
  const textColor = useThemeColor({}, 'text');

  // Cargar datos del cliente existente
  useEffect(() => {
    if (!isNew && id) {
      const client = getClient(id);
      if (client) {
        setForm({
          ...client,
          address: client.address || {
            street: '',
            number: '',
            floor: '',
            postalCode: '',
            city: '',
            province: '',
          },
        });
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [id, isNew, clients]);

  const clientPianos = !isNew && id ? getPianosByClient(id) : [];

  const handleSave = async () => {
    if (!form.firstName?.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }
    if (!form.phone?.trim()) {
      Alert.alert('Error', 'El teléfono es obligatorio');
      return;
    }

    try {
      if (isNew) {
        const newClient = await addClient({
          firstName: form.firstName.trim(),
          lastName1: form.lastName1?.trim(),
          lastName2: form.lastName2?.trim(),
          taxId: form.taxId?.trim(),
          type: form.type || 'individual',
          phone: form.phone.trim(),
          email: form.email?.trim(),
          address: form.address,
          notes: form.notes?.trim(),
          routeId: form.routeId,
          isVip: form.isVip || false,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace({
          pathname: '/client/[id]',
          params: { id: newClient.id },
        });
      } else if (id) {
        await updateClient(id, form);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsEditing(false);
      }
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al guardar el cliente';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar cliente',
      '¿Estás seguro de que quieres eliminar este cliente? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deleteClient(id!);
            router.back();
          },
        },
      ]
    );
  };

  const handleCall = () => {
    if (form.phone) {
      Linking.openURL(`tel:${form.phone}`);
    }
  };

  const handleEmail = () => {
    if (form.email) {
      Linking.openURL(`mailto:${form.email}`);
    }
  };

  const handleOpenMaps = () => {
    const address = form.address;
    if (!address) return;
    
    // Construir dirección completa
    const addressParts = [
      address.street,
      address.number,
      address.postalCode,
      address.city,
      address.province,
      'España'
    ].filter(Boolean);
    
    if (addressParts.length < 2) {
      Alert.alert('Dirección incompleta', 'El cliente no tiene una dirección válida para navegar.');
      return;
    }
    
    const fullAddress = addressParts.join(', ');
    const encodedAddress = encodeURIComponent(fullAddress);
    
    // URL de Google Maps para navegación (funciona en móvil y web)
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(mapsUrl);
  };

  const hasValidAddress = () => {
    const address = form.address;
    return address && (address.street || address.city);
  };

  const handleSharePortal = async () => {
    if (!id || isNew) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const portalUrl = generatePortalUrl(id);
    const clientName = form.firstName || 'Cliente';
    const message = `Hola ${clientName}, aquí tienes acceso a tu portal de cliente donde puedes ver tus pianos, historial de servicios y próximas citas:\n\n${portalUrl}`;
    
    try {
      if (Platform.OS === 'web') {
        // En web, copiar al portapapeles
        await Clipboard.setStringAsync(portalUrl);
        Alert.alert(
          'Enlace copiado',
          'El enlace del portal ha sido copiado al portapapeles. Puedes compartirlo con el cliente.',
          [
            { text: 'OK' },
            { 
              text: 'Enviar por WhatsApp', 
              onPress: () => {
                if (form.phone) {
                  sendCustomMessage(form as Client, message);
                }
              }
            },
          ]
        );
      } else {
        // En móvil, usar Share nativo
        await Share.share({
          message,
          title: 'Portal del Cliente',
        });
      }
    } catch (err) {
      showError('No se pudo compartir el enlace');
    }
  };

  const handleAddPiano = () => {
    router.push({
      pathname: '/piano/[id]',
      params: { id: 'new', clientId: id },
    });
  };

  const handlePianoPress = (piano: Piano) => {
    router.push({
      pathname: '/piano/[id]',
      params: { id: piano.id },
    });
  };

  const renderInput = (
    label: string,
    value: string | undefined,
    onChange: (text: string) => void,
    placeholder: string,
    options?: { keyboardType?: 'default' | 'phone-pad' | 'email-address'; multiline?: boolean; required?: boolean }
  ) => (
    <View style={styles.inputGroup}>
      <ThemedText style={[styles.label, { color: textSecondary }]}>
        {label}{options?.required ? ' *' : ''}
      </ThemedText>
      {isEditing ? (
        <TextInput
          style={[
            styles.input,
            { backgroundColor: cardBg, borderColor, color: textColor },
            options?.multiline && styles.inputMultiline,
          ]}
          value={value || ''}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={textSecondary}
          keyboardType={options?.keyboardType}
          multiline={options?.multiline}
          numberOfLines={options?.multiline ? 3 : 1}
        />
      ) : (
        <ThemedText style={styles.value}>{value || '-'}</ThemedText>
      )}
    </View>
  );

  const updateAddress = async (key: keyof ClientAddress, value: string) => {
    const updates: Partial<ClientAddress> = { [key]: value };
    
    // Autocompletar ciudad y provincia si es código postal
    if (key === 'postalCode' && value.length === 5) {
      const { lookupPostalCode } = await import('@/utils/postal-code-lookup');
      const result = lookupPostalCode(value);
      if (result) {
        updates.city = result.city;
        updates.province = result.province;
      }
    }
    
    setForm({
      ...form,
      address: {
        ...form.address,
        ...updates,
      },
    });
  };

  const updateShippingAddress = async (key: keyof ClientAddress, value: string) => {
    const updates: Partial<ClientAddress> = { [key]: value };
    
    // Autocompletar ciudad y provincia si es código postal
    if (key === 'postalCode' && value.length === 5) {
      const { lookupPostalCode } = await import('@/utils/postal-code-lookup');
      const result = lookupPostalCode(value);
      if (result) {
        updates.city = result.city;
        updates.province = result.province;
      }
    }
    
    setForm({
      ...form,
      shippingAddress: {
        ...form.shippingAddress,
        ...updates,
      },
    });
  };

  const copyFiscalToShipping = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setForm({
      ...form,
      shippingAddress: {
        street: form.address?.street || '',
        number: form.address?.number || '',
        floor: form.address?.floor || '',
        postalCode: form.address?.postalCode || '',
        city: form.address?.city || '',
        province: form.address?.province || '',
      },
    });
  };

  const clientTypes: { key: ClientType; label: string }[] = [
    { key: 'individual', label: 'Particular' },
    { key: 'student', label: 'Estudiante' },
    { key: 'professional', label: 'Profesional' },
    { key: 'music_school', label: 'Escuela' },
    { key: 'conservatory', label: 'Conservatorio' },
    { key: 'concert_hall', label: 'Sala conciertos' },
  ];

  const renderTypeSelector = () => (
    <View style={styles.inputGroup}>
      <ThemedText style={[styles.label, { color: textSecondary }]}>Tipo de cliente</ThemedText>
      {isEditing ? (
        <View style={styles.typeSelector}>
          {clientTypes.map((ct) => (
            <Pressable
              key={ct.key}
              style={[
                styles.typeOption,
                { backgroundColor: cardBg, borderColor },
                form.type === ct.key && { backgroundColor: accent, borderColor: accent },
              ]}
              onPress={() => setForm({ ...form, type: ct.key })}
            >
              <ThemedText
                style={[
                  styles.typeText,
                  { color: form.type === ct.key ? '#FFFFFF' : textSecondary },
                ]}
              >
                {ct.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : (
        <ThemedText style={styles.value}>
          {CLIENT_TYPE_LABELS[form.type || 'individual']}
        </ThemedText>
      )}
    </View>
  );

  const fullName = form.firstName ? getClientFullName(form as Client) : '';
  const formattedAddress = form.address ? getClientFormattedAddress(form as Client) : '';

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: isNew ? 'Nuevo Cliente' : fullName || 'Cliente',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ marginRight: 16 }}>
              <IconSymbol name="chevron.left" size={24} color={accent} />
            </Pressable>
          ),
          headerRight: () =>
            !isNew && (
              <Pressable onPress={() => setIsEditing(!isEditing)} style={{ marginRight: 16 }}>
                <ThemedText style={{ color: accent }}>
                  {isEditing ? 'Cancelar' : 'Editar'}
                </ThemedText>
              </Pressable>
            ),
        }}
      />

      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Inicio', path: '/' },
          { label: 'Clientes', path: '/clients' },
          { label: isNew ? 'Nuevo' : fullName || 'Cliente' },
        ]}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accent} />
          <ThemedText style={[styles.loadingText, { color: textSecondary }]}>
            Cargando datos del cliente...
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
        {/* Datos personales */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={styles.sectionTitle}>Datos Personales</ThemedText>
          {renderInput('Nombre', form.firstName, (text) => setForm({ ...form, firstName: text }), 'Nombre', { required: true })}
          {renderInput('Primer Apellido', form.lastName1, (text) => setForm({ ...form, lastName1: text }), 'Primer apellido')}
          {renderInput('Segundo Apellido', form.lastName2, (text) => setForm({ ...form, lastName2: text }), 'Segundo apellido')}
          {renderTypeSelector()}
        </View>

        {/* Datos fiscales */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={styles.sectionTitle}>Datos Fiscales</ThemedText>
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: textSecondary }]}>NIF/CIF</ThemedText>
            {isEditing ? (
              <>
                <TextInput
                  style={[
                    styles.input,
                    { 
                      backgroundColor: cardBg, 
                      borderColor: taxIdValidation && !taxIdValidation.isValid && form.taxId ? error : borderColor,
                      color: textColor 
                    },
                  ]}
                  value={form.taxId || ''}
                  onChangeText={(text) => {
                    const formatted = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setForm({ ...form, taxId: formatted });
                    if (formatted) {
                      setTaxIdValidation(validateSpanishTaxId(formatted));
                    } else {
                      setTaxIdValidation(null);
                    }
                  }}
                  placeholder="12345678A o B12345678"
                  placeholderTextColor={textSecondary}
                  autoCapitalize="characters"
                />
                {taxIdValidation && form.taxId && (
                  <View style={styles.validationRow}>
                    <IconSymbol
                      name={taxIdValidation.isValid ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                      size={16}
                      color={taxIdValidation.isValid ? '#10B981' : error}
                    />
                    <ThemedText
                      style={[
                        styles.validationText,
                        { color: taxIdValidation.isValid ? '#10B981' : error },
                      ]}
                    >
                      {taxIdValidation.isValid
                        ? `${taxIdValidation.type} válido`
                        : taxIdValidation.errorMessage}
                    </ThemedText>
                  </View>
                )}
              </>
            ) : (
              <ThemedText style={styles.value}>{form.taxId || '-'}</ThemedText>
            )}
          </View>
        </View>

        {/* Contacto */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={styles.sectionTitle}>Contacto</ThemedText>
          {renderInput('Teléfono', form.phone, (text) => setForm({ ...form, phone: text }), '+34 600 000 000', { keyboardType: 'phone-pad', required: true })}
          {renderInput('Email', form.email, (text) => setForm({ ...form, email: text }), 'email@ejemplo.com', { keyboardType: 'email-address' })}
        </View>

        {/* Dirección Fiscal */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={styles.sectionTitle}>Dirección Fiscal</ThemedText>
          {isEditing ? (
            <>
              <View style={styles.row}>
                <View style={styles.flex3}>
                  {renderInput('Calle', form.address?.street, (text) => updateAddress('street', text), 'Nombre de la calle')}
                </View>
                <View style={styles.flex1}>
                  {renderInput('Nº', form.address?.number, (text) => updateAddress('number', text), '123')}
                </View>
              </View>
              {renderInput('Piso/Puerta', form.address?.floor, (text) => updateAddress('floor', text), '3º A')}
              <View style={styles.row}>
                <View style={styles.flex1}>
                  {renderInput('C.P.', form.address?.postalCode, (text) => updateAddress('postalCode', text), '08001')}
                </View>
                <View style={styles.flex2}>
                  <View style={styles.inputGroup}>
                    <ThemedText style={[styles.label, { color: textSecondary }]}>Ciudad</ThemedText>
                    <CitySelector
                      value={form.address?.city || ''}
                      onChangeText={(text) => updateAddress('city', text)}
                      placeholder="Seleccionar ciudad..."
                    />
                  </View>
                </View>
              </View>
              {renderInput('Provincia', form.address?.province, (text) => updateAddress('province', text), 'Barcelona')}
            </>
          ) : (
            <ThemedText style={styles.value}>{formattedAddress || '-'}</ThemedText>
          )}
        </View>

        {/* Dirección de Envío */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Dirección de Envío</ThemedText>
            {isEditing && (
              <Pressable
                style={[styles.copyButton, { backgroundColor: accent }]}
                onPress={copyFiscalToShipping}
              >
                <IconSymbol name="doc.on.doc.fill" size={14} color="#FFFFFF" />
                <ThemedText style={styles.copyButtonText}>Copiar fiscal</ThemedText>
              </Pressable>
            )}
          </View>
          {isEditing ? (
            <>
              <View style={styles.row}>
                <View style={styles.flex3}>
                  {renderInput('Calle', form.shippingAddress?.street, (text) => updateShippingAddress('street', text), 'Nombre de la calle')}
                </View>
                <View style={styles.flex1}>
                  {renderInput('Nº', form.shippingAddress?.number, (text) => updateShippingAddress('number', text), '123')}
                </View>
              </View>
              {renderInput('Piso/Puerta', form.shippingAddress?.floor, (text) => updateShippingAddress('floor', text), '3º A')}
              <View style={styles.row}>
                <View style={styles.flex1}>
                  {renderInput('C.P.', form.shippingAddress?.postalCode, (text) => updateShippingAddress('postalCode', text), '08001')}
                </View>
                <View style={styles.flex2}>
                  <View style={styles.inputGroup}>
                    <ThemedText style={[styles.label, { color: textSecondary }]}>Ciudad</ThemedText>
                    <CitySelector
                      value={form.shippingAddress?.city || ''}
                      onChangeText={(text) => updateShippingAddress('city', text)}
                      placeholder="Seleccionar ciudad..."
                    />
                  </View>
                </View>
              </View>
              {renderInput('Provincia', form.shippingAddress?.province, (text) => updateShippingAddress('province', text), 'Barcelona')}
            </>
          ) : (
            <ThemedText style={styles.value}>
              {form.shippingAddress?.street 
                ? `${form.shippingAddress.street}${form.shippingAddress.number ? ` ${form.shippingAddress.number}` : ''}${form.shippingAddress.floor ? `, ${form.shippingAddress.floor}` : ''}, ${form.shippingAddress.postalCode || ''} ${form.shippingAddress.city || ''}, ${form.shippingAddress.province || ''}`
                : 'Sin dirección de envío'}
            </ThemedText>
          )}
        </View>

        {/* Ruta */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={styles.sectionTitle}>Ruta de Trabajo</ThemedText>
          {isEditing ? (
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Ruta asignada</ThemedText>
              <View style={[styles.pickerContainer, { borderColor }]}>
                <select
                  value={form.routeId?.toString() || ''}
                  onChange={(e: any) => {
                    const value = e.target.value;
                    setForm({ ...form, routeId: value ? parseInt(value) : undefined });
                  }}
                  style={{
                    width: '100%',
                    padding: Spacing.sm,
                    fontSize: 15,
                    fontFamily: 'Montserrat',
                    backgroundColor: cardBg,
                    color: textColor,
                    border: 'none',
                    outline: 'none',
                  } as any}
                >
                  <option value="">Sin ruta asignada</option>
                  {routes.map((route: any) => (
                    <option key={route.id} value={route.id}>
                      {route.name}
                    </option>
                  ))}
                </select>
              </View>
              {form.routeId && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs, gap: 4 }}>
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: routes.find((r: any) => r.id === form.routeId)?.color || '#e07a5f',
                    }}
                  />
                  <ThemedText style={{ fontSize: 13, color: textSecondary }}>
                    {routes.find((r: any) => r.id === form.routeId)?.name}
                  </ThemedText>
                </View>
              )}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {form.routeId ? (
                <>
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: routes.find((r: any) => r.id === form.routeId)?.color || '#e07a5f',
                    }}
                  />
                  <ThemedText style={styles.value}>
                    {routes.find((r: any) => r.id === form.routeId)?.name || 'Sin ruta'}
                  </ThemedText>
                </>
              ) : (
                <ThemedText style={[styles.value, { color: textSecondary }]}>Sin ruta asignada</ThemedText>
              )}
            </View>
          )}
        </View>

        {/* Cliente VIP */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.vipContainer}>
            <View style={styles.vipTextContainer}>
              <ThemedText style={styles.sectionTitle}>Cliente VIP</ThemedText>
              <ThemedText style={[styles.label, { color: textSecondary, fontSize: 13, marginTop: 4 }]}>
                Marca este cliente como VIP para darle prioridad
              </ThemedText>
            </View>
            <Switch
              value={form.isVip || false}
              onValueChange={(value) => {
                setForm({ ...form, isVip: value });
                if (!isNew) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              trackColor={{ false: borderColor, true: '#52a67d' }}
              thumbColor={form.isVip ? '#FFFFFF' : '#f4f3f4'}
              disabled={!isEditing}
            />
          </View>
        </View>

        {/* Notas */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={styles.sectionTitle}>Notas</ThemedText>
          {renderInput('Notas', form.notes, (text) => setForm({ ...form, notes: text }), 'Notas adicionales...', { multiline: true })}
        </View>

        {/* Acciones rápidas (solo en modo vista) */}
        {!isNew && !isEditing && (
          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: cardBg, borderColor }]}
              onPress={handleCall}
            accessibilityRole="button"
            accessibilityLabel="Llamar al cliente"
            accessibilityHint="Pulsa para iniciar una llamada telefónica"
            >
              <IconSymbol name="phone.fill" size={24} color={accent} />
              <ThemedText style={[styles.actionText, { color: accent }]}>Llamar</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.actionButton, { backgroundColor: cardBg, borderColor }]}
              onPress={handleEmail}
            accessibilityRole="button"
            accessibilityLabel="Enviar email al cliente"
            accessibilityHint="Pulsa para abrir el correo electrónico"
              disabled={!form.email}
            >
              <IconSymbol name="envelope.fill" size={24} color={form.email ? accent : textSecondary} />
              <ThemedText style={[styles.actionText, { color: form.email ? accent : textSecondary }]}>
                Email
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.actionButton, { backgroundColor: '#52a67d', borderColor: '#52a67d' }]}
              onPress={() => {
                if (form.phone) {
                  sendCustomMessage(form as Client, 'Hola, me pongo en contacto contigo desde Piano Emotion Manager.');
                } else {
                  showError('El cliente no tiene teléfono registrado');
                }
              }}
            >
              <IconSymbol name="message.fill" size={24} color="#FFFFFF" />
              <ThemedText style={[styles.actionText, { color: '#FFFFFF' }]}>WhatsApp</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.actionButton, { backgroundColor: '#5b7fc7', borderColor: '#5b7fc7' }]}
              onPress={handleOpenMaps}
              disabled={!hasValidAddress()}
            >
              <IconSymbol name="map.fill" size={24} color={hasValidAddress() ? '#FFFFFF' : '#FFFFFF80'} />
              <ThemedText style={[styles.actionText, { color: hasValidAddress() ? '#FFFFFF' : '#FFFFFF80' }]}>
                Cómo llegar
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.actionButton, { backgroundColor: '#9b7fc9', borderColor: '#9b7fc9' }]}
              onPress={handleSharePortal}
              accessibilityRole="button"
              accessibilityLabel="Compartir portal del cliente"
              accessibilityHint="Genera y comparte un enlace para que el cliente acceda a su portal"
            >
              <IconSymbol name="link" size={24} color="#FFFFFF" />
              <ThemedText style={[styles.actionText, { color: '#FFFFFF' }]}>
                Portal
              </ThemedText>
            </Pressable>
          </View>
        )}

        {/* Pianos del cliente */}
        {!isNew && (
          <View style={styles.pianosSection}>
            <View style={styles.pianosSectionHeader}>
              <ThemedText type="subtitle">Pianos ({clientPianos.length})</ThemedText>
              {!isEditing && (
                <Pressable onPress={handleAddPiano}>
                  <ThemedText style={{ color: accent }}>+ Añadir</ThemedText>
                </Pressable>
              )}
            </View>
            {clientPianos.length > 0 ? (
              clientPianos.map((piano) => (
                <PianoCard
                  key={piano.id}
                  piano={piano}
                  clientName={fullName}
                  onPress={() => handlePianoPress(piano)}
                />
              ))
            ) : (
              <View style={[styles.emptyState, { backgroundColor: cardBg, borderColor }]}>
                <IconSymbol name="pianokeys" size={32} color={textSecondary} />
                <ThemedText style={{ color: textSecondary, marginTop: 8 }}>
                  Este cliente no tiene pianos registrados
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Botón eliminar */}
        {!isNew && !isEditing && (
          <Pressable
            style={[styles.deleteButton, { borderColor: error }]}
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel="Eliminar"
            accessibilityHint="Pulsa para eliminar este elemento"
          >
            <IconSymbol name="trash.fill" size={20} color={error} />
            <ThemedText style={{ color: error, marginLeft: 8 }}>Eliminar cliente</ThemedText>
          </Pressable>
        )}
        </ScrollView>
      )}

      {/* Botón guardar */}
      {isEditing && !isLoading && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
          <Pressable
            style={[styles.saveButton, { backgroundColor: accent }]}
            onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Guardar cambios"
            accessibilityHint="Pulsa para guardar los datos"
          >
            <ThemedText style={styles.saveButtonText}>
              {isNew ? 'Crear Cliente' : 'Guardar Cambios'}
            </ThemedText>
          </Pressable>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
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
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  inputGroup: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  value: {
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  flex3: {
    flex: 3,
  },
  typeSelector: {
    flexDirection: 'column',
    gap: Spacing.xs,
  },
  typeOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  typeText: {
    fontSize: 14,
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  validationText: {
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  vipContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vipTextContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionButton: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  pianosSection: {
    gap: Spacing.sm,
  },
  pianosSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    backgroundColor: 'transparent',
  },
  saveButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
