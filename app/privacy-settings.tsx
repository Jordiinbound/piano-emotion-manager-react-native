import React, { useState, useEffect } from 'react';
import { 
  ScrollView, 
  StyleSheet, 
  View, 
  Pressable, 
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useGDPR, DataSummary } from '@/hooks/use-gdpr';
import { BorderRadius, Spacing } from '@/constants/theme';

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'tint');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const error = useThemeColor({}, 'error');

  const {
    isExporting,
    isDeleting,
    exportProgress,
    deleteProgress,
    error: gdprError,
    exportAllData,
    deleteAllData,
    getDataSummary,
  } = useGDPR();

  const [dataSummary, setDataSummary] = useState<DataSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    loadDataSummary();
  }, []);

  const loadDataSummary = async () => {
    setLoadingSummary(true);
    const summary = await getDataSummary();
    setDataSummary(summary);
    setLoadingSummary(false);
  };

  const handleExportData = async () => {
    Alert.alert(
      'Exportar Datos',
      'Se generará un archivo JSON con todos tus datos personales. Este proceso puede tardar unos segundos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Exportar',
          onPress: async () => {
            const result = await exportAllData();
            if (result) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                'Exportación Completada',
                'Tus datos han sido exportados correctamente.'
              );
            } else {
              Alert.alert('Error', gdprError || 'No se pudieron exportar los datos.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAllData = async () => {
    Alert.alert(
      '⚠️ Eliminar Todos los Datos',
      'Esta acción eliminará PERMANENTEMENTE todos tus datos:\n\n' +
      '• Información de clientes\n' +
      '• Datos de pianos\n' +
      '• Historial de servicios\n' +
      '• Citas y recordatorios\n' +
      '• Facturas\n' +
      '• Inventario\n' +
      '• Preferencias\n\n' +
      'Esta acción NO se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmación Final',
              '¿Estás ABSOLUTAMENTE seguro? Todos tus datos serán eliminados de forma permanente.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Sí, eliminar todo',
                  style: 'destructive',
                  onPress: async () => {
                    const success = await deleteAllData();
                    if (success) {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      Alert.alert(
                        'Datos Eliminados',
                        'Todos tus datos han sido eliminados correctamente.',
                        [
                          {
                            text: 'OK',
                            onPress: () => router.replace('/'),
                          },
                        ]
                      );
                    } else {
                      Alert.alert('Error', gdprError || 'No se pudieron eliminar los datos.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <Stack.Screen
        options={{
          title: 'Privacidad y Datos',
          headerShown: true,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color={primary} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: cardBg, borderColor }]}>
          <IconSymbol name="shield.lefthalf.filled" size={40} color={primary} />
          <ThemedText style={styles.title}>Gestión de Privacidad</ThemedText>
          <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
            Controla tus datos personales según el RGPD
          </ThemedText>
        </View>

        {/* Resumen de datos */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="chart.bar.fill" size={20} color={primary} />
            <ThemedText style={styles.sectionTitle}>Resumen de tus Datos</ThemedText>
          </View>

          {loadingSummary ? (
            <ActivityIndicator size="small" color={primary} style={{ padding: Spacing.lg }} />
          ) : dataSummary ? (
            <View style={styles.summaryGrid}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <ThemedText style={styles.summaryValue}>{dataSummary.totalClients}</ThemedText>
                  <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>Clientes</ThemedText>
                </View>
                <View style={styles.summaryItem}>
                  <ThemedText style={styles.summaryValue}>{dataSummary.totalPianos}</ThemedText>
                  <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>Pianos</ThemedText>
                </View>
                <View style={styles.summaryItem}>
                  <ThemedText style={styles.summaryValue}>{dataSummary.totalServices}</ThemedText>
                  <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>Servicios</ThemedText>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <ThemedText style={styles.summaryValue}>{dataSummary.totalAppointments}</ThemedText>
                  <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>Citas</ThemedText>
                </View>
                <View style={styles.summaryItem}>
                  <ThemedText style={styles.summaryValue}>{dataSummary.totalInvoices}</ThemedText>
                  <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>Facturas</ThemedText>
                </View>
                <View style={styles.summaryItem}>
                  <ThemedText style={styles.summaryValue}>{dataSummary.totalInventoryItems}</ThemedText>
                  <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>Inventario</ThemedText>
                </View>
              </View>
              <View style={[styles.storageInfo, { borderTopColor: borderColor }]}>
                <ThemedText style={[styles.storageText, { color: textSecondary }]}>
                  Almacenamiento usado: {dataSummary.storageUsed}
                </ThemedText>
                {dataSummary.oldestRecord && (
                  <ThemedText style={[styles.storageText, { color: textSecondary }]}>
                    Datos desde: {dataSummary.oldestRecord}
                  </ThemedText>
                )}
              </View>
            </View>
          ) : (
            <ThemedText style={[styles.noData, { color: textSecondary }]}>
              No hay datos almacenados
            </ThemedText>
          )}
        </View>

        {/* Tus derechos */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="person.fill.checkmark" size={20} color={primary} />
            <ThemedText style={styles.sectionTitle}>Tus Derechos (RGPD)</ThemedText>
          </View>

          {/* Derecho de acceso */}
          <Pressable
            style={[styles.rightItem, { borderBottomColor: borderColor }]}
            onPress={() => router.push('/privacy-policy')}
          >
            <View style={[styles.rightIcon, { backgroundColor: `${primary}15` }]}>
              <IconSymbol name="eye.fill" size={20} color={primary} />
            </View>
            <View style={styles.rightContent}>
              <ThemedText style={styles.rightTitle}>Derecho de Acceso</ThemedText>
              <ThemedText style={[styles.rightDesc, { color: textSecondary }]}>
                Conocer qué datos personales tratamos sobre ti
              </ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={16} color={textSecondary} />
          </Pressable>

          {/* Derecho de portabilidad */}
          <Pressable
            style={[styles.rightItem, { borderBottomColor: borderColor }]}
            onPress={handleExportData}
            disabled={isExporting}
          >
            <View style={[styles.rightIcon, { backgroundColor: `${success}15` }]}>
              <IconSymbol name="square.and.arrow.down.fill" size={20} color={success} />
            </View>
            <View style={styles.rightContent}>
              <ThemedText style={styles.rightTitle}>Derecho de Portabilidad</ThemedText>
              <ThemedText style={[styles.rightDesc, { color: textSecondary }]}>
                Descargar todos tus datos en formato JSON
              </ThemedText>
              {isExporting && (
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { backgroundColor: borderColor }]}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { backgroundColor: success, width: `${exportProgress}%` }
                      ]} 
                    />
                  </View>
                  <ThemedText style={[styles.progressText, { color: textSecondary }]}>
                    {exportProgress}%
                  </ThemedText>
                </View>
              )}
            </View>
            {isExporting ? (
              <ActivityIndicator size="small" color={success} />
            ) : (
              <IconSymbol name="chevron.right" size={16} color={textSecondary} />
            )}
          </Pressable>

          {/* Derecho de rectificación */}
          <Pressable
            style={[styles.rightItem, { borderBottomColor: borderColor }]}
            onPress={() => router.push('/(drawer)/clients')}
          >
            <View style={[styles.rightIcon, { backgroundColor: `${warning}15` }]}>
              <IconSymbol name="pencil" size={20} color={warning} />
            </View>
            <View style={styles.rightContent}>
              <ThemedText style={styles.rightTitle}>Derecho de Rectificación</ThemedText>
              <ThemedText style={[styles.rightDesc, { color: textSecondary }]}>
                Modificar datos incorrectos o incompletos
              </ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={16} color={textSecondary} />
          </Pressable>

          {/* Derecho al olvido */}
          <Pressable
            style={styles.rightItem}
            onPress={handleDeleteAllData}
            disabled={isDeleting}
          >
            <View style={[styles.rightIcon, { backgroundColor: `${error}15` }]}>
              <IconSymbol name="trash.fill" size={20} color={error} />
            </View>
            <View style={styles.rightContent}>
              <ThemedText style={styles.rightTitle}>Derecho al Olvido</ThemedText>
              <ThemedText style={[styles.rightDesc, { color: textSecondary }]}>
                Eliminar permanentemente todos tus datos
              </ThemedText>
              {isDeleting && (
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { backgroundColor: borderColor }]}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { backgroundColor: error, width: `${deleteProgress}%` }
                      ]} 
                    />
                  </View>
                  <ThemedText style={[styles.progressText, { color: textSecondary }]}>
                    {deleteProgress}%
                  </ThemedText>
                </View>
              )}
            </View>
            {isDeleting ? (
              <ActivityIndicator size="small" color={error} />
            ) : (
              <IconSymbol name="chevron.right" size={16} color={textSecondary} />
            )}
          </Pressable>
        </View>

        {/* Enlaces legales */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="doc.text.fill" size={20} color={primary} />
            <ThemedText style={styles.sectionTitle}>Documentos Legales</ThemedText>
          </View>

          <Pressable
            style={[styles.linkItem, { borderBottomColor: borderColor }]}
            onPress={() => router.push('/privacy-policy')}
          >
            <ThemedText style={[styles.linkText, { color: primary }]}>
              Política de Privacidad
            </ThemedText>
            <IconSymbol name="chevron.right" size={16} color={primary} />
          </Pressable>

          <Pressable
            style={[styles.linkItem, { borderBottomColor: borderColor }]}
            onPress={() => router.push('/terms-conditions')}
          >
            <ThemedText style={[styles.linkText, { color: primary }]}>
              Términos y Condiciones
            </ThemedText>
            <IconSymbol name="chevron.right" size={16} color={primary} />
          </Pressable>

          <Pressable
            style={styles.linkItem}
            onPress={() => {
              // Abrir modal de cookies
              Alert.alert(
                'Configuración de Cookies',
                'Las cookies son pequeños archivos que se almacenan en tu dispositivo para mejorar tu experiencia.\n\n' +
                '• Cookies esenciales: Necesarias para el funcionamiento de la app\n' +
                '• Cookies de rendimiento: Nos ayudan a mejorar la app\n' +
                '• Cookies de análisis: Nos permiten entender cómo usas la app',
                [
                  { text: 'Cerrar', style: 'cancel' },
                ]
              );
              Alert.alert('Cookies', 'Próximamente podrás gestionar tus preferencias de cookies.');
            }}
          >
            <ThemedText style={[styles.linkText, { color: primary }]}>
              Política de Cookies
            </ThemedText>
            <IconSymbol name="chevron.right" size={16} color={primary} />
          </Pressable>
        </View>

        {/* Información de contacto */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="envelope.fill" size={20} color={primary} />
            <ThemedText style={styles.sectionTitle}>Contacto para Privacidad</ThemedText>
          </View>

          <ThemedText style={[styles.contactText, { color: textSecondary }]}>
            Para cualquier consulta relacionada con tus datos personales o para ejercer 
            tus derechos, puedes contactarnos en:
          </ThemedText>

          <View style={styles.contactInfo}>
            <View style={styles.contactRow}>
              <IconSymbol name="envelope" size={16} color={primary} />
              <ThemedText style={[styles.contactEmail, { color: primary }]}>
                privacidad@pianoemotion.es
              </ThemedText>
            </View>
            <View style={styles.contactRow}>
              <IconSymbol name="person.badge.shield.checkmark" size={16} color={primary} />
              <ThemedText style={[styles.contactEmail, { color: primary }]}>
                dpd@pianoemotion.es (DPD)
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText style={[styles.footerText, { color: textSecondary }]}>
            Inbound Emotion S.L. - CIF: B66351685
          </ThemedText>
          <ThemedText style={[styles.footerText, { color: textSecondary }]}>
            Cumplimiento RGPD (UE) 2016/679
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
  },
  header: {
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: Spacing.md,
  },
  subtitle: {
    fontSize: 14,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  section: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryGrid: {
    gap: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  storageInfo: {
    borderTopWidth: 1,
    paddingTop: Spacing.md,
    gap: Spacing.xs,
  },
  storageText: {
    fontSize: 13,
    textAlign: 'center',
  },
  noData: {
    textAlign: 'center',
    padding: Spacing.lg,
  },
  rightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  rightIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightContent: {
    flex: 1,
  },
  rightTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rightDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    width: 35,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '500',
  },
  contactText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  contactInfo: {
    gap: Spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  contactEmail: {
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: 12,
  },
});
