import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
// @ts-ignore - expo-file-system types may not be available in all environments
import * as ExpoFileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { createBackup, restoreBackup, getBackupInfo, verifyDataIntegrity, clearAllData } from '@/lib/data-migration';

export default function BackupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastBackupInfo, setLastBackupInfo] = useState<string | null>(null);
  
  const cardBg = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#374151' }, 'background');

  const containerStyle = Platform.OS === 'web' 
    ? [styles.container, { background: 'linear-gradient(135deg, #F8F9FA 0%, #EEF2F7 50%, #E8EDF5 100%)' } as any]
    : styles.container;

  const GradientWrapper = Platform.OS === 'web' 
    ? ({ children, style }: { children: React.ReactNode; style: ViewStyle }) => <View style={style}>{children}</View>
    : ({ children, style }: { children: React.ReactNode; style: ViewStyle }) => (
        <LinearGradient
          colors={['#F8F9FA', '#EEF2F7', '#E8EDF5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={style}
        >
          {children}
        </LinearGradient>
      );

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // Crear backup
      const backupData = await createBackup();
      const backupJson = JSON.stringify(backupData, null, 2);
      
      // Generar nombre de archivo con fecha
      const date = new Date();
      const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
      const fileName = `piano_emotion_backup_${dateStr}.json`;
      
      if (Platform.OS === 'web') {
        // En web, descargar directamente
        const blob = new Blob([backupJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Alert.alert(
          'Copia de seguridad creada',
          'El archivo se ha descargado correctamente. Guárdalo en un lugar seguro.',
          [{ text: 'Entendido' }]
        );
      } else {
        // En móvil, guardar y compartir
        // @ts-ignore
const fileUri = `${ExpoFileSystem.documentDirectory}${fileName}`;
        await ExpoFileSystem.writeAsStringAsync(fileUri, backupJson);
        
        // Compartir el archivo
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Guardar copia de seguridad',
          });
        }
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      setLastBackupInfo(`Última copia: ${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
      
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudo crear la copia de seguridad. Inténtalo de nuevo.',
        [{ text: 'Entendido' }]
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      // Confirmar antes de importar
      Alert.alert(
        'Restaurar copia de seguridad',
        '⚠️ Esta acción reemplazará todos los datos actuales con los de la copia de seguridad. Esta acción no se puede deshacer.\n\n¿Deseas continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Restaurar', 
            style: 'destructive',
            onPress: performImport 
          },
        ]
      );
    } catch (error) {
    }
  };

  const performImport = async () => {
    try {
      setIsImporting(true);
      
      if (Platform.OS === 'web') {
        // En web, usar input file
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e: Event) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
              try {
                const content = event.target?.result as string;
                const backupData = JSON.parse(content);
                
                await restoreBackup(backupData);
                
                Alert.alert(
                  'Restauración completada',
                  'Los datos se han restaurado correctamente. La aplicación se recargará.',
                  [{ text: 'Entendido', onPress: () => window.location.reload() }]
                );
              } catch (err) {
                Alert.alert('Error', 'El archivo no es una copia de seguridad válida.');
              } finally {
                setIsImporting(false);
              }
            };
            reader.readAsText(file);
          } else {
            setIsImporting(false);
          }
        };
        
        input.click();
      } else {
        // En móvil, usar DocumentPicker
        const result = await DocumentPicker.getDocumentAsync({
          type: 'application/json',
          copyToCacheDirectory: true,
        });
        
        if (result.canceled) {
          setIsImporting(false);
          return;
        }
        
        const fileUri = result.assets[0].uri;
        const content = await ExpoFileSystem.readAsStringAsync(fileUri);
        const backupData = JSON.parse(content);
        
        await restoreBackup(backupData);
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        Alert.alert(
          'Restauración completada',
          'Los datos se han restaurado correctamente.',
          [{ text: 'Entendido', onPress: () => router.replace('/') }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudo restaurar la copia de seguridad. Asegúrate de seleccionar un archivo válido.',
        [{ text: 'Entendido' }]
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleVerifyData = async () => {
    try {
      const result = await verifyDataIntegrity();
      
      if (result.isValid) {
        Alert.alert(
          'Verificación completada',
          `✅ Todos los datos están correctos.\n\n• Clientes: ${result.counts.clients}\n• Pianos: ${result.counts.pianos}\n• Servicios: ${result.counts.services}`,
          [{ text: 'Entendido' }]
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert(
          'Problemas detectados',
          `Se encontraron algunos problemas:\n\n${result.errors.join('\n')}\n\nTe recomendamos restaurar una copia de seguridad reciente.`,
          [{ text: 'Entendido' }]
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo verificar los datos.');
    }
  };

  const handleClearData = async () => {
    Alert.alert(
      'Eliminar todos los datos',
      '⚠️ ATENCIÓN: Esta acción eliminará TODOS los datos de la aplicación de forma permanente.\n\nEsta acción NO se puede deshacer.\n\n¿Estás seguro de que deseas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar todo', 
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                'Datos eliminados',
                'Todos los datos han sido eliminados.',
                [{ text: 'Entendido', onPress: () => router.replace('/') }]
              );
            } catch (error) {
              Alert.alert('Error', 'No se pudieron eliminar los datos.');
            }
          }
        },
      ]
    );
  };

  if (isExporting || isImporting) {
    return (
      <GradientWrapper style={containerStyle}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner 
            message={isExporting ? 'Creando copia de seguridad...' : 'Restaurando datos...'} 
            size="large" 
          />
        </View>
      </GradientWrapper>
    );
  }

  return (
    <GradientWrapper style={containerStyle}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: insets.bottom + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={textColor} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Copia de Seguridad</ThemedText>
          <View style={styles.backButton} />
        </View>

        {/* Intro */}
        <View style={[styles.introCard, { backgroundColor: cardBg, borderColor }]}>
          <IconSymbol name="arrow.clockwise.icloud.fill" size={40} color="#6366F1" />
          <ThemedText style={[styles.introTitle, { color: textColor }]}>
            Protege tus datos
          </ThemedText>
          <ThemedText style={[styles.introText, { color: textSecondary }]}>
            Crea copias de seguridad periódicas para no perder tu información. Guárdalas en un lugar seguro como la nube o tu ordenador.
          </ThemedText>
          {lastBackupInfo && (
            <ThemedText style={[styles.lastBackup, { color: '#10B981' }]}>
              {lastBackupInfo}
            </ThemedText>
          )}
        </View>

        {/* Export */}
        <Pressable 
          style={[styles.actionCard, { backgroundColor: cardBg, borderColor }]}
          onPress={handleExport}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#DCFCE7' }]}>
            <IconSymbol name="square.and.arrow.up" size={28} color="#10B981" />
          </View>
          <View style={styles.actionContent}>
            <ThemedText style={[styles.actionTitle, { color: textColor }]}>
              Exportar Datos
            </ThemedText>
            <ThemedText style={[styles.actionDescription, { color: textSecondary }]}>
              Crea un archivo con todos tus datos para guardarlo en un lugar seguro
            </ThemedText>
          </View>
          <IconSymbol name="chevron.right" size={20} color={textSecondary} />
        </Pressable>

        {/* Import */}
        <Pressable 
          style={[styles.actionCard, { backgroundColor: cardBg, borderColor }]}
          onPress={handleImport}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#DBEAFE' }]}>
            <IconSymbol name="square.and.arrow.down" size={28} color="#3B82F6" />
          </View>
          <View style={styles.actionContent}>
            <ThemedText style={[styles.actionTitle, { color: textColor }]}>
              Importar Datos
            </ThemedText>
            <ThemedText style={[styles.actionDescription, { color: textSecondary }]}>
              Restaura tus datos desde una copia de seguridad anterior
            </ThemedText>
          </View>
          <IconSymbol name="chevron.right" size={20} color={textSecondary} />
        </Pressable>

        {/* Verify */}
        <Pressable 
          style={[styles.actionCard, { backgroundColor: cardBg, borderColor }]}
          onPress={handleVerifyData}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
            <IconSymbol name="checkmark.shield.fill" size={28} color="#F59E0B" />
          </View>
          <View style={styles.actionContent}>
            <ThemedText style={[styles.actionTitle, { color: textColor }]}>
              Verificar Integridad
            </ThemedText>
            <ThemedText style={[styles.actionDescription, { color: textSecondary }]}>
              Comprueba que todos los datos están correctos y sin errores
            </ThemedText>
          </View>
          <IconSymbol name="chevron.right" size={20} color={textSecondary} />
        </Pressable>

        {/* Warning Section */}
        <View style={[styles.warningCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <IconSymbol name="exclamationmark.triangle.fill" size={24} color="#EF4444" />
          <ThemedText style={[styles.warningTitle, { color: '#991B1B' }]}>
            Zona de peligro
          </ThemedText>
          <ThemedText style={[styles.warningText, { color: '#7F1D1D' }]}>
            Las siguientes acciones son irreversibles. Asegúrate de tener una copia de seguridad antes de continuar.
          </ThemedText>
          
          <Pressable 
            style={styles.dangerButton}
            onPress={handleClearData}
          >
            <IconSymbol name="trash.fill" size={18} color="#FFFFFF" />
            <ThemedText style={styles.dangerButtonText}>
              Eliminar todos los datos
            </ThemedText>
          </Pressable>
        </View>

        {/* Tips */}
        <View style={[styles.tipsCard, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={[styles.tipsTitle, { color: textColor }]}>
            💡 Consejos
          </ThemedText>
          <ThemedText style={[styles.tipItem, { color: textSecondary }]}>
            • Haz una copia de seguridad al menos una vez por semana
          </ThemedText>
          <ThemedText style={[styles.tipItem, { color: textSecondary }]}>
            • Guarda las copias en varios lugares (nube, email, ordenador)
          </ThemedText>
          <ThemedText style={[styles.tipItem, { color: textSecondary }]}>
            • Crea una copia antes de actualizar la app
          </ThemedText>
          <ThemedText style={[styles.tipItem, { color: textSecondary }]}>
            • Verifica los datos periódicamente para detectar problemas
          </ThemedText>
        </View>
      </ScrollView>
    </GradientWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    fontWeight: '600',
  },
  introCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  introTitle: {
    fontSize: 20,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  introText: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
  },
  lastBackup: {
    fontSize: 13,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    fontWeight: '600',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    fontFamily: 'Montserrat',
    fontWeight: '400',
    lineHeight: 18,
  },
  warningCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  warningTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    fontWeight: '600',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  warningText: {
    fontSize: 13,
    fontFamily: 'Montserrat',
    fontWeight: '400',
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    fontWeight: '600',
  },
  tipsCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  tipsTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  tipItem: {
    fontSize: 13,
    fontFamily: 'Montserrat',
    fontWeight: '400',
    lineHeight: 22,
  },
});
