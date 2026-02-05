import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Pressable, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { SignaturePad, SignatureDisplay } from '@/components/signature-pad';
import { useClientsData, usePianosData, useServicesData } from '@/hooks/data';
import { Service, Task, getClientFullName, getClientFormattedAddress } from '@/types';

const SERVICE_TYPE_LABELS: Record<string, string> = {
  tuning: 'Afinación',
  repair: 'Reparación',
  regulation: 'Regulación',
  maintenance_basic: 'Mantenimiento Básico',
  maintenance_complete: 'Mantenimiento Completo',
  maintenance_premium: 'Mantenimiento Premium',
  inspection: 'Inspección',
  restoration: 'Restauración',
  other: 'Otro',
};

export default function WorkOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const accent = useThemeColor({}, 'accent');
  const { services, updateService } = useServicesData();
  const { clients } = useClientsData();
  const { pianos } = usePianosData();
  
  const [service, setService] = useState<Service | null>(null);
  const [client, setClient] = useState<any>(null);
  const [piano, setPiano] = useState<any>(null);
  const [signature, setSignature] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id && services.length > 0) {
      const found = services.find(s => s.id === id);
      if (found) {
        setService(found);
        setSignature(found.clientSignature || '');
        
        const foundClient = clients.find(c => c.id === found.clientId);
        setClient(foundClient || null);
        
        const foundPiano = pianos.find(p => p.id === found.pianoId);
        setPiano(foundPiano || null);
      }
    }
  }, [id, services, clients, pianos]);

  const handleSaveSignature = async (sig: string) => {
    if (!service) return;
    
    setIsSaving(true);
    try {
      await updateService(service.id, { clientSignature: sig });
      setSignature(sig);
      
      if (Platform.OS === 'web') {
        alert('Firma guardada correctamente');
      } else {
        Alert.alert('Éxito', 'Firma guardada correctamente');
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        alert('Error al guardar la firma');
      } else {
        Alert.alert('Error', 'No se pudo guardar la firma');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearSignature = async () => {
    if (!service) return;
    
    try {
      await updateService(service.id, { clientSignature: '' });
      setSignature('');
    } catch (error) {
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!service) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Cargando orden de trabajo...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Orden de Trabajo',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ marginRight: 16 }}>
              <IconSymbol name="chevron.left" size={24} color={accent} />
            </Pressable>
          ),
        }} 
      />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 20) + 20 }
        ]}
      >
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.orderTitle}>
            Orden de Trabajo
          </ThemedText>
          <ThemedText style={styles.orderNumber}>
            Nº {service.id.slice(-8).toUpperCase()}
          </ThemedText>
        </ThemedView>

        {/* Información del Servicio */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Datos del Servicio
          </ThemedText>
          
          <View style={styles.infoRow}>
            <ThemedText style={styles.label}>Fecha:</ThemedText>
            <ThemedText style={styles.value}>{formatDate(service.date)}</ThemedText>
          </View>
          
          <View style={styles.infoRow}>
            <ThemedText style={styles.label}>Tipo:</ThemedText>
            <ThemedText style={styles.value}>
              {SERVICE_TYPE_LABELS[service.type] || service.type}
            </ThemedText>
          </View>
          
          {service.cost && (
            <View style={styles.infoRow}>
              <ThemedText style={styles.label}>Importe:</ThemedText>
              <ThemedText style={[styles.value, styles.cost]}>
                {service.cost?.toFixed(2)} €
              </ThemedText>
            </View>
          )}
          
          {service.duration && (
            <View style={styles.infoRow}>
              <ThemedText style={styles.label}>Duración:</ThemedText>
              <ThemedText style={styles.value}>{service.duration} minutos</ThemedText>
            </View>
          )}
        </ThemedView>

        {/* Información del Cliente */}
        {client && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Datos del Cliente
            </ThemedText>
            
            <View style={styles.infoRow}>
              <ThemedText style={styles.label}>Nombre:</ThemedText>
              <ThemedText style={styles.value}>{getClientFullName(client)}</ThemedText>
            </View>
            
            {client.address && (
              <View style={styles.infoRow}>
                <ThemedText style={styles.label}>Dirección:</ThemedText>
                <ThemedText style={styles.value}>{getClientFormattedAddress(client)}</ThemedText>
              </View>
            )}
            
            {client.phone && (
              <View style={styles.infoRow}>
                <ThemedText style={styles.label}>Teléfono:</ThemedText>
                <ThemedText style={styles.value}>{client.phone}</ThemedText>
              </View>
            )}
          </ThemedView>
        )}

        {/* Información del Piano */}
        {piano && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Datos del Piano
            </ThemedText>
            
            <View style={styles.infoRow}>
              <ThemedText style={styles.label}>Marca:</ThemedText>
              <ThemedText style={styles.value}>{piano.brand}</ThemedText>
            </View>
            
            {piano.model && (
              <View style={styles.infoRow}>
                <ThemedText style={styles.label}>Modelo:</ThemedText>
                <ThemedText style={styles.value}>{piano.model}</ThemedText>
              </View>
            )}
            
            {piano.serialNumber && (
              <View style={styles.infoRow}>
                <ThemedText style={styles.label}>Nº Serie:</ThemedText>
                <ThemedText style={styles.value}>{piano.serialNumber}</ThemedText>
              </View>
            )}
          </ThemedView>
        )}

        {/* Tareas Realizadas */}
        {service.tasks && service.tasks.length > 0 && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Tareas Realizadas
            </ThemedText>
            
            {service.tasks.map((task: Task, index: number) => (
              <View key={index} style={styles.taskRow}>
                <ThemedText style={styles.taskCheck}>
                  {task.completed ? '✓' : '○'}
                </ThemedText>
                <View style={styles.taskContent}>
                  <ThemedText style={[
                    styles.taskName,
                    task.completed && styles.taskCompleted
                  ]}>
                    {task.name}
                  </ThemedText>
                  {task.notes && (
                    <ThemedText style={styles.taskNotes}>{task.notes}</ThemedText>
                  )}
                </View>
              </View>
            ))}
          </ThemedView>
        )}

        {/* Notas */}
        {service.notes && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Observaciones
            </ThemedText>
            <ThemedText style={styles.notes}>{service.notes}</ThemedText>
          </ThemedView>
        )}

        {/* Firma Digital */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Conformidad del Cliente
          </ThemedText>
          
          <ThemedText style={styles.legalText}>
            El cliente declara haber recibido el servicio descrito en esta orden de trabajo 
            a su entera satisfacción y autoriza el cobro del importe indicado.
          </ThemedText>

          {signature ? (
            <View style={styles.signatureContainer}>
              <SignatureDisplay signature={signature} width={280} height={140} />
              <Pressable 
                style={styles.editSignatureButton}
                onPress={handleClearSignature}
              >
                <ThemedText style={styles.editSignatureText}>
                  Modificar firma
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <SignaturePad
              onSave={handleSaveSignature}
              onClear={handleClearSignature}
              width={300}
              height={180}
            />
          )}
        </ThemedView>

        {/* Botones de acción */}
        <View style={styles.actions}>
          <Pressable 
            style={styles.printButton}
            onPress={() => {
              if (Platform.OS === 'web') {
                window.print();
              } else {
                Alert.alert('Info', 'Usa la versión web para imprimir');
              }
            }}
          >
            <ThemedText style={styles.printButtonText}>Imprimir / PDF</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#2D5A27',
  },
  orderTitle: {
    fontSize: 24,
    color: '#2D5A27',
  },
  orderNumber: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 12,
    color: '#2D5A27',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: 100,
    fontWeight: '600',
    color: '#666',
  },
  value: {
    flex: 1,
  },
  cost: {
    fontWeight: '700',
    color: '#2D5A27',
    fontSize: 16,
  },
  taskRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  taskCheck: {
    width: 24,
    fontSize: 16,
    color: '#2D5A27',
  },
  taskContent: {
    flex: 1,
  },
  taskName: {
    fontSize: 14,
  },
  taskCompleted: {
    color: '#666',
  },
  taskNotes: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  notes: {
    fontSize: 14,
    lineHeight: 20,
    color: '#444',
  },
  legalText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
    lineHeight: 18,
    textAlign: 'center',
  },
  signatureContainer: {
    alignItems: 'center',
  },
  editSignatureButton: {
    marginTop: 12,
    padding: 8,
  },
  editSignatureText: {
    color: '#007AFF',
    fontSize: 14,
  },
  actions: {
    marginTop: 20,
    alignItems: 'center',
  },
  printButton: {
    backgroundColor: '#2D5A27',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 4,
  },
  printButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
