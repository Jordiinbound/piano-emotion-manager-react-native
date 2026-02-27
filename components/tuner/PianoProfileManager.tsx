/**
 * PianoProfileManager — Gestión de perfiles de pianos y historial de afinaciones
 * 
 * Permite crear, editar y gestionar perfiles de pianos individuales.
 * Cada perfil almacena: datos del piano, calibración de inharmonicidad,
 * y un historial completo de afinaciones con curvas de Railsback.
 * 
 * Almacenamiento: AsyncStorage (offline-first), con sincronización futura.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { TOTAL_KEYS, getFullNoteName } from '@/constants/piano-tuning';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface TuningRecord {
  id: string;
  timestamp: number;
  temperamentId: string;
  concertPitch: number;
  /** Desviación en cents medida para cada tecla (índice 0-87, null si no medida) */
  measurements: (number | null)[];
  /** Inharmonicidad medida por tecla (null si no medida) */
  inharmonicity: (number | null)[];
  /** Notas del técnico */
  notes: string;
  /** Número de teclas medidas */
  keysMeasured: number;
}

export interface PianoProfile {
  id: string;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  year: number | null;
  location: string;
  type: 'grand' | 'upright' | 'digital' | 'other';
  notes: string;
  createdAt: number;
  updatedAt: number;
  tuningHistory: TuningRecord[];
  /** Calibración de inharmonicidad guardada */
  calibrationData: (number | null)[] | null;
}

const STORAGE_KEY = 'piano_profiles';
const ACTIVE_PROFILE_KEY = 'active_piano_profile';

// ─── Props ──────────────────────────────────────────────────────────────────

interface PianoProfileManagerProps {
  onSelectProfile: (profile: PianoProfile | null) => void;
  activeProfileId: string | null;
  currentMeasurements?: Map<number, { cents: number; inharmonicity: number | null; timestamp: number }>;
}

// ─── Componente ─────────────────────────────────────────────────────────────

export function PianoProfileManager({
  onSelectProfile,
  activeProfileId,
  currentMeasurements,
}: PianoProfileManagerProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const bgColor = useThemeColor({}, 'background');
  
  const [profiles, setProfiles] = useState<PianoProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<PianoProfile | null>(null);
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(activeProfileId);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formSerial, setFormSerial] = useState('');
  const [formYear, setFormYear] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formType, setFormType] = useState<PianoProfile['type']>('grand');
  const [formNotes, setFormNotes] = useState('');
  
  // Cargar perfiles
  useEffect(() => {
    loadProfiles();
  }, []);
  
  const loadProfiles = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setProfiles(JSON.parse(data));
      }
    } catch (e) {
      console.error('Error loading profiles:', e);
    }
  };
  
  const saveProfiles = async (updatedProfiles: PianoProfile[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfiles));
      setProfiles(updatedProfiles);
    } catch (e) {
      console.error('Error saving profiles:', e);
    }
  };
  
  const resetForm = () => {
    setFormName('');
    setFormBrand('');
    setFormModel('');
    setFormSerial('');
    setFormYear('');
    setFormLocation('');
    setFormType('grand');
    setFormNotes('');
    setEditingProfile(null);
  };
  
  const handleCreateProfile = useCallback(() => {
    resetForm();
    setShowForm(true);
  }, []);
  
  const handleEditProfile = useCallback((profile: PianoProfile) => {
    setFormName(profile.name);
    setFormBrand(profile.brand);
    setFormModel(profile.model);
    setFormSerial(profile.serialNumber);
    setFormYear(profile.year ? String(profile.year) : '');
    setFormLocation(profile.location);
    setFormType(profile.type);
    setFormNotes(profile.notes);
    setEditingProfile(profile);
    setShowForm(true);
  }, []);
  
  const handleSaveProfile = useCallback(async () => {
    if (!formName.trim()) {
      if (Platform.OS === 'web') {
        window.alert('El nombre del piano es obligatorio');
      } else {
        Alert.alert('Error', 'El nombre del piano es obligatorio');
      }
      return;
    }
    
    const now = Date.now();
    
    if (editingProfile) {
      // Actualizar perfil existente
      const updated = profiles.map(p =>
        p.id === editingProfile.id
          ? {
              ...p,
              name: formName.trim(),
              brand: formBrand.trim(),
              model: formModel.trim(),
              serialNumber: formSerial.trim(),
              year: formYear ? parseInt(formYear) : null,
              location: formLocation.trim(),
              type: formType,
              notes: formNotes.trim(),
              updatedAt: now,
            }
          : p
      );
      await saveProfiles(updated);
    } else {
      // Crear nuevo perfil
      const newProfile: PianoProfile = {
        id: `piano_${now}_${Math.random().toString(36).substr(2, 9)}`,
        name: formName.trim(),
        brand: formBrand.trim(),
        model: formModel.trim(),
        serialNumber: formSerial.trim(),
        year: formYear ? parseInt(formYear) : null,
        location: formLocation.trim(),
        type: formType,
        notes: formNotes.trim(),
        createdAt: now,
        updatedAt: now,
        tuningHistory: [],
        calibrationData: null,
      };
      await saveProfiles([...profiles, newProfile]);
    }
    
    setShowForm(false);
    resetForm();
  }, [formName, formBrand, formModel, formSerial, formYear, formLocation, formType, formNotes, editingProfile, profiles]);
  
  const handleDeleteProfile = useCallback(async (profileId: string) => {
    const doDelete = () => {
      const updated = profiles.filter(p => p.id !== profileId);
      saveProfiles(updated);
      if (activeProfileId === profileId) {
        onSelectProfile(null);
      }
    };
    
    if (Platform.OS === 'web') {
      if (window.confirm('¿Eliminar este perfil de piano y todo su historial?')) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Eliminar perfil',
        '¿Eliminar este perfil de piano y todo su historial?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  }, [profiles, activeProfileId, onSelectProfile]);
  
  const handleSaveTuningRecord = useCallback(async (profileId: string) => {
    if (!currentMeasurements || currentMeasurements.size === 0) {
      if (Platform.OS === 'web') {
        window.alert('No hay mediciones para guardar. Afine algunas teclas primero.');
      } else {
        Alert.alert('Sin datos', 'No hay mediciones para guardar. Afine algunas teclas primero.');
      }
      return;
    }
    
    const measurements: (number | null)[] = new Array(TOTAL_KEYS).fill(null);
    const inharmonicity: (number | null)[] = new Array(TOTAL_KEYS).fill(null);
    let keysMeasured = 0;
    
    currentMeasurements.forEach((data, keyIndex) => {
      measurements[keyIndex] = data.cents;
      inharmonicity[keyIndex] = data.inharmonicity;
      keysMeasured++;
    });
    
    const record: TuningRecord = {
      id: `tuning_${Date.now()}`,
      timestamp: Date.now(),
      temperamentId: 'equal',
      concertPitch: 440,
      measurements,
      inharmonicity,
      notes: '',
      keysMeasured,
    };
    
    const updated = profiles.map(p =>
      p.id === profileId
        ? { ...p, tuningHistory: [...p.tuningHistory, record], updatedAt: Date.now() }
        : p
    );
    
    await saveProfiles(updated);
    
    if (Platform.OS === 'web') {
      window.alert(`Afinación guardada: ${keysMeasured} teclas medidas.`);
    } else {
      Alert.alert('Guardado', `Afinación guardada: ${keysMeasured} teclas medidas.`);
    }
  }, [currentMeasurements, profiles]);
  
  const handleSelectProfile = useCallback((profile: PianoProfile) => {
    onSelectProfile(profile);
    AsyncStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);
  }, [onSelectProfile]);
  
  const pianoTypeLabels: Record<PianoProfile['type'], string> = {
    grand: 'Piano de cola',
    upright: 'Piano vertical',
    digital: 'Piano digital',
    other: 'Otro',
  };
  
  const inputStyle = [styles.input, { color: textColor, borderColor, backgroundColor: bgColor }];
  
  // ─── Formulario ─────────────────────────────────────────────────────────
  
  if (showForm) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={[styles.formCard, { backgroundColor: surfaceColor, borderColor }]}>
          <ThemedText style={[styles.formTitle, { color: textColor }]}>
            {editingProfile ? 'Editar Piano' : 'Nuevo Piano'}
          </ThemedText>
          
          <ThemedText style={[styles.label, { color: textSecondary }]}>Nombre *</ThemedText>
          <TextInput
            style={inputStyle}
            value={formName}
            onChangeText={setFormName}
            placeholder="Ej: Piano del salón, Steinway del conservatorio"
            placeholderTextColor={textSecondary}
          />
          
          <ThemedText style={[styles.label, { color: textSecondary }]}>Marca</ThemedText>
          <TextInput
            style={inputStyle}
            value={formBrand}
            onChangeText={setFormBrand}
            placeholder="Ej: Steinway, Yamaha, Kawai, Bösendorfer"
            placeholderTextColor={textSecondary}
          />
          
          <ThemedText style={[styles.label, { color: textSecondary }]}>Modelo</ThemedText>
          <TextInput
            style={inputStyle}
            value={formModel}
            onChangeText={setFormModel}
            placeholder="Ej: Model D, C7, SK-5"
            placeholderTextColor={textSecondary}
          />
          
          <ThemedText style={[styles.label, { color: textSecondary }]}>Número de serie</ThemedText>
          <TextInput
            style={inputStyle}
            value={formSerial}
            onChangeText={setFormSerial}
            placeholder="Número de serie del piano"
            placeholderTextColor={textSecondary}
          />
          
          <ThemedText style={[styles.label, { color: textSecondary }]}>Año de fabricación</ThemedText>
          <TextInput
            style={inputStyle}
            value={formYear}
            onChangeText={setFormYear}
            placeholder="Ej: 1985"
            placeholderTextColor={textSecondary}
            keyboardType="numeric"
          />
          
          <ThemedText style={[styles.label, { color: textSecondary }]}>Ubicación</ThemedText>
          <TextInput
            style={inputStyle}
            value={formLocation}
            onChangeText={setFormLocation}
            placeholder="Ej: Conservatorio Municipal, Casa del Sr. García"
            placeholderTextColor={textSecondary}
          />
          
          <ThemedText style={[styles.label, { color: textSecondary }]}>Tipo</ThemedText>
          <View style={styles.typeRow}>
            {(['grand', 'upright', 'digital', 'other'] as const).map(type => (
              <TouchableOpacity
                key={type}
                onPress={() => setFormType(type)}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: formType === type ? '#6366F1' : 'transparent',
                    borderColor: formType === type ? '#6366F1' : borderColor,
                  },
                ]}
              >
                <ThemedText style={[
                  styles.typeChipText,
                  { color: formType === type ? '#FFFFFF' : textSecondary },
                ]}>
                  {pianoTypeLabels[type]}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          
          <ThemedText style={[styles.label, { color: textSecondary }]}>Notas</ThemedText>
          <TextInput
            style={[...inputStyle, styles.textArea]}
            value={formNotes}
            onChangeText={setFormNotes}
            placeholder="Observaciones sobre el piano..."
            placeholderTextColor={textSecondary}
            multiline
            numberOfLines={3}
          />
          
          <View style={styles.formButtons}>
            <TouchableOpacity
              onPress={() => { setShowForm(false); resetForm(); }}
              style={[styles.cancelButton, { borderColor }]}
            >
              <ThemedText style={[styles.cancelButtonText, { color: textColor }]}>Cancelar</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSaveProfile}
              style={styles.saveButton}
            >
              <ThemedText style={styles.saveButtonText}>Guardar</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }
  
  // ─── Lista de perfiles ──────────────────────────────────────────────────
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Botón crear nuevo */}
      <TouchableOpacity
        onPress={handleCreateProfile}
        style={[styles.createButton, { borderColor: '#6366F1' }]}
      >
        <ThemedText style={styles.createButtonText}>+ Nuevo Piano</ThemedText>
      </TouchableOpacity>
      
      {profiles.length === 0 && (
        <View style={[styles.emptyCard, { backgroundColor: surfaceColor, borderColor }]}>
          <ThemedText style={[styles.emptyTitle, { color: textColor }]}>Sin pianos registrados</ThemedText>
          <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
            Cree un perfil para cada piano que afine. Podrá guardar el historial de afinaciones y la calibración de inharmonicidad de cada uno.
          </ThemedText>
        </View>
      )}
      
      {profiles.map(profile => {
        const isActive = profile.id === activeProfileId;
        const isExpanded = profile.id === expandedProfileId;
        const lastTuning = profile.tuningHistory.length > 0
          ? profile.tuningHistory[profile.tuningHistory.length - 1]
          : null;
        
        return (
          <View
            key={profile.id}
            style={[
              styles.profileCard,
              {
                backgroundColor: surfaceColor,
                borderColor: isActive ? '#6366F1' : borderColor,
                borderWidth: isActive ? 2 : 1,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setExpandedProfileId(isExpanded ? null : profile.id)}
              style={styles.profileHeader}
            >
              <View style={styles.profileHeaderLeft}>
                <View style={[styles.pianoIcon, { backgroundColor: isActive ? '#6366F1' : borderColor }]}>
                  <ThemedText style={styles.pianoIconText}>
                    {profile.type === 'grand' ? '🎹' : profile.type === 'upright' ? '🎵' : '🎶'}
                  </ThemedText>
                </View>
                <View>
                  <ThemedText style={[styles.profileName, { color: textColor }]}>{profile.name}</ThemedText>
                  <ThemedText style={[styles.profileSubtitle, { color: textSecondary }]}>
                    {[profile.brand, profile.model].filter(Boolean).join(' ') || pianoTypeLabels[profile.type]}
                  </ThemedText>
                </View>
              </View>
              {isActive && (
                <View style={styles.activeBadge}>
                  <ThemedText style={styles.activeBadgeText}>Activo</ThemedText>
                </View>
              )}
            </TouchableOpacity>
            
            {isExpanded && (
              <View style={styles.profileDetails}>
                {/* Info del piano */}
                <View style={[styles.detailGrid, { borderColor }]}>
                  {profile.brand && (
                    <View style={styles.detailItem}>
                      <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>Marca</ThemedText>
                      <ThemedText style={[styles.detailValue, { color: textColor }]}>{profile.brand}</ThemedText>
                    </View>
                  )}
                  {profile.model && (
                    <View style={styles.detailItem}>
                      <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>Modelo</ThemedText>
                      <ThemedText style={[styles.detailValue, { color: textColor }]}>{profile.model}</ThemedText>
                    </View>
                  )}
                  {profile.serialNumber && (
                    <View style={styles.detailItem}>
                      <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>Nº Serie</ThemedText>
                      <ThemedText style={[styles.detailValue, { color: textColor }]}>{profile.serialNumber}</ThemedText>
                    </View>
                  )}
                  {profile.year && (
                    <View style={styles.detailItem}>
                      <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>Año</ThemedText>
                      <ThemedText style={[styles.detailValue, { color: textColor }]}>{profile.year}</ThemedText>
                    </View>
                  )}
                  {profile.location && (
                    <View style={styles.detailItem}>
                      <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>Ubicación</ThemedText>
                      <ThemedText style={[styles.detailValue, { color: textColor }]}>{profile.location}</ThemedText>
                    </View>
                  )}
                </View>
                
                {/* Historial de afinaciones */}
                <View style={styles.historySection}>
                  <ThemedText style={[styles.historyTitle, { color: textColor }]}>
                    Historial de afinaciones ({profile.tuningHistory.length})
                  </ThemedText>
                  
                  {profile.tuningHistory.length === 0 ? (
                    <ThemedText style={[styles.historyEmpty, { color: textSecondary }]}>
                      Sin afinaciones registradas
                    </ThemedText>
                  ) : (
                    profile.tuningHistory.slice(-5).reverse().map(record => (
                      <View key={record.id} style={[styles.historyItem, { borderColor }]}>
                        <View style={styles.historyItemLeft}>
                          <ThemedText style={[styles.historyDate, { color: textColor }]}>
                            {new Date(record.timestamp).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </ThemedText>
                          <ThemedText style={[styles.historyKeys, { color: textSecondary }]}>
                            {record.keysMeasured} teclas medidas
                          </ThemedText>
                        </View>
                        <ThemedText style={[styles.historyTime, { color: textSecondary }]}>
                          {new Date(record.timestamp).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </ThemedText>
                      </View>
                    ))
                  )}
                </View>
                
                {/* Acciones */}
                <View style={styles.actionRow}>
                  {!isActive && (
                    <TouchableOpacity
                      onPress={() => handleSelectProfile(profile)}
                      style={[styles.actionButton, { backgroundColor: '#6366F1' }]}
                    >
                      <ThemedText style={styles.actionButtonText}>Seleccionar</ThemedText>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleSaveTuningRecord(profile.id)}
                    style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                  >
                    <ThemedText style={styles.actionButtonText}>Guardar afinación</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleEditProfile(profile)}
                    style={[styles.actionButtonOutline, { borderColor }]}
                  >
                    <ThemedText style={[styles.actionButtonOutlineText, { color: textColor }]}>Editar</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteProfile(profile.id)}
                    style={[styles.actionButtonOutline, { borderColor: '#EF4444' }]}
                  >
                    <ThemedText style={[styles.actionButtonOutlineText, { color: '#EF4444' }]}>Eliminar</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Estilos ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  
  createButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createButtonText: { color: '#6366F1', fontSize: 15, fontWeight: '600' },
  
  emptyCard: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  
  profileCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  profileHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  pianoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pianoIconText: { fontSize: 20 },
  profileName: { fontSize: 15, fontWeight: '600' },
  profileSubtitle: { fontSize: 12, marginTop: 1 },
  activeBadge: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  
  profileDetails: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  detailItem: {
    width: '48%',
  },
  detailLabel: { fontSize: 11, marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: '500' },
  
  historySection: { gap: 6 },
  historyTitle: { fontSize: 14, fontWeight: '600' },
  historyEmpty: { fontSize: 13, fontStyle: 'italic' },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  historyItemLeft: {},
  historyDate: { fontSize: 13, fontWeight: '500' },
  historyKeys: { fontSize: 11, marginTop: 1 },
  historyTime: { fontSize: 12 },
  
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  actionButtonOutline: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionButtonOutlineText: { fontSize: 12, fontWeight: '500' },
  
  // Form styles
  formCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  formTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeChipText: { fontSize: 12, fontWeight: '500' },
  formButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: { fontSize: 14, fontWeight: '600' },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#6366F1',
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
