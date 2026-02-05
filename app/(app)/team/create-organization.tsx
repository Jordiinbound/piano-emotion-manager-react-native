/**
 * Página de Creación de Organización
 * Piano Emotion Manager
 * 
 * Formulario para crear una nueva organización/empresa.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOrganization } from '../../../hooks/use-organization';

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function CreateOrganizationPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const { createOrganization, isCreating } = useOrganization();
  
  // Form state
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  // Validation
  const isValid = name.trim().length >= 2;
  
  // Handlers
  const handleCreate = useCallback(async () => {
    if (!isValid) {
      Alert.alert('Error', 'Por favor, introduce un nombre para la organización');
      return;
    }
    
    try {
      const org = await createOrganization({
        name: name.trim(),
        taxId: taxId.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      
      Alert.alert(
        'Organización Creada',
        `"${org.name}" ha sido creada correctamente. Ahora puedes invitar a miembros de tu equipo.`,
        [
          {
            text: 'Ir al Equipo',
            onPress: () => router.replace('/team'),
          },
        ]
      );
    } catch (error: unknown) {
      Alert.alert('Error', error.message || 'No se pudo crear la organización');
    }
  }, [isValid, name, taxId, address, city, postalCode, phone, email, createOrganization, router]);
  
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Nueva Organización',
          headerBackTitle: 'Cancelar',
        }}
      />
      
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={[styles.scrollView, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="business" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Crea tu Organización
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Configura tu empresa para gestionar tu equipo de técnicos
            </Text>
          </View>
          
          {/* Form */}
          <View style={[styles.form, { backgroundColor: colors.card }]}>
            {/* Nombre */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.text }]}>
                Nombre de la Empresa <Text style={{ color: colors.primary }}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="Ej: Piano Services Madrid"
                placeholderTextColor={colors.textSecondary}
                autoFocus
              />
            </View>
            
            {/* NIF/CIF */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.text }]}>
                NIF/CIF
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                value={taxId}
                onChangeText={setTaxId}
                placeholder="Ej: B12345678"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
              />
            </View>
            
            {/* Dirección */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.text }]}>
                Dirección
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                value={address}
                onChangeText={setAddress}
                placeholder="Ej: Calle Mayor, 123"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            
            {/* Ciudad y CP */}
            <View style={styles.row}>
              <View style={[styles.fieldContainer, { flex: 2 }]}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Ciudad
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Ej: Madrid"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              
              <View style={[styles.fieldContainer, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.text }]}>
                  C.P.
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                  value={postalCode}
                  onChangeText={setPostalCode}
                  placeholder="28001"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>
            
            {/* Teléfono */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.text }]}>
                Teléfono
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="Ej: +34 912 345 678"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>
            
            {/* Email */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.text }]}>
                Email
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder="Ej: info@tuempresa.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
          
          {/* Info */}
          <View style={[styles.infoBox, { backgroundColor: colors.primary + '10' }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Podrás completar más datos y configurar tu organización después de crearla.
            </Text>
          </View>
          
          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              (!isValid || isCreating) && styles.submitButtonDisabled,
            ]}
            onPress={handleCreate}
            disabled={!isValid || isCreating}
          >
            {isCreating ? (
              <Text style={styles.submitButtonText}>Creando...</Text>
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Crear Organización</Text>
              </>
            )}
          </TouchableOpacity>
          
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

// ==========================================
// ESTILOS
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: 4,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 4,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 4,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
});
