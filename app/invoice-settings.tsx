import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  Modal,
} from 'react-native';
import { Stack } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { 
  invoiceTemplateService, 
  InvoiceTemplate, 
  InvoiceNumberingSettings 
} from '@/services/invoice-template-service';
import { BorderRadius, Spacing } from '@/constants/theme';

export default function InvoiceSettingsScreen() {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [numbering, setNumbering] = useState<InvoiceNumberingSettings | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [previewNumber, setPreviewNumber] = useState('');

  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const primary = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const success = useThemeColor({}, 'success');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    await invoiceTemplateService.initialize();
    setTemplates(invoiceTemplateService.getTemplates());
    setNumbering(invoiceTemplateService.getNumberingSettings());
    setPreviewNumber(invoiceTemplateService.previewNextInvoiceNumber());
  };

  const handleUpdateNumbering = (updates: Partial<InvoiceNumberingSettings>) => {
    if (!numbering) return;
    invoiceTemplateService.updateNumberingSettings(updates);
    setNumbering(invoiceTemplateService.getNumberingSettings());
    setPreviewNumber(invoiceTemplateService.previewNextInvoiceNumber());
  };

  const handleSetDefaultTemplate = (id: string) => {
    invoiceTemplateService.setDefaultTemplate(id);
    setTemplates(invoiceTemplateService.getTemplates());
  };

  const handleDeleteTemplate = (id: string) => {
    invoiceTemplateService.deleteTemplate(id);
    setTemplates(invoiceTemplateService.getTemplates());
  };

  const handleSaveTemplate = () => {
    if (!selectedTemplate) return;
    
    if (selectedTemplate.id.startsWith('template_') || selectedTemplate.id === 'default') {
      invoiceTemplateService.updateTemplate(selectedTemplate.id, selectedTemplate);
    } else {
      invoiceTemplateService.createTemplate(selectedTemplate);
    }
    
    setTemplates(invoiceTemplateService.getTemplates());
    setShowTemplateModal(false);
    setSelectedTemplate(null);
  };

  const openNewTemplate = () => {
    setSelectedTemplate({
      id: 'new',
      name: 'Nueva Plantilla',
      isDefault: false,
      primaryColor: '#1a5f7a',
      secondaryColor: '#57c5b6',
      accentColor: '#159895',
      logoPosition: 'left',
      logoSize: 'medium',
      fontFamily: 'Helvetica',
      headerFontSize: 24,
      bodyFontSize: 10,
      showBorder: true,
      borderStyle: 'solid',
      borderColor: '#e0e0e0',
      showWatermark: false,
      showHeader: true,
      showFooter: true,
      footerText: '',
      showPaymentInfo: true,
      showNotes: true,
      showTerms: true,
      termsText: '',
      numberPrefix: 'F',
      numberSuffix: '',
      numberPadding: 4,
      numberSeparator: '-',
      includeYear: true,
      resetYearly: true,
    });
    setShowTemplateModal(true);
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Configuración de Facturas',
          headerStyle: { backgroundColor },
          headerTintColor: textColor,
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Sección de Numeración */}
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="number" size={20} color={primary} />
            <ThemedText style={styles.sectionTitle}>Numeración de Facturas</ThemedText>
          </View>

          <View style={[styles.previewBox, { backgroundColor: primary + '10', borderColor: primary }]}>
            <ThemedText style={[styles.previewLabel, { color: textSecondary }]}>
              Próximo número:
            </ThemedText>
            <ThemedText style={[styles.previewNumber, { color: primary }]}>
              {previewNumber}
            </ThemedText>
          </View>

          {numbering && (
            <>
              <View style={[styles.inputRow, { borderBottomColor: border }]}>
                <ThemedText style={styles.inputLabel}>Prefijo</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor, color: textColor, borderColor: border }]}
                  value={numbering.prefix}
                  onChangeText={(text) => handleUpdateNumbering({ prefix: text })}
                  placeholder="F"
                  placeholderTextColor={textSecondary}
                />
              </View>

              <View style={[styles.inputRow, { borderBottomColor: border }]}>
                <ThemedText style={styles.inputLabel}>Separador</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor, color: textColor, borderColor: border }]}
                  value={numbering.separator}
                  onChangeText={(text) => handleUpdateNumbering({ separator: text })}
                  placeholder="-"
                  placeholderTextColor={textSecondary}
                />
              </View>

              <View style={[styles.inputRow, { borderBottomColor: border }]}>
                <ThemedText style={styles.inputLabel}>Dígitos</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor, color: textColor, borderColor: border }]}
                  value={String(numbering.padding)}
                  onChangeText={(text) => handleUpdateNumbering({ padding: parseInt(text) || 4 })}
                  keyboardType="numeric"
                  placeholderTextColor={textSecondary}
                />
              </View>

              <View style={[styles.inputRow, { borderBottomColor: border }]}>
                <ThemedText style={styles.inputLabel}>Número actual</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor, color: textColor, borderColor: border }]}
                  value={String(numbering.currentNumber)}
                  onChangeText={(text) => handleUpdateNumbering({ currentNumber: parseInt(text) || 1 })}
                  keyboardType="numeric"
                  placeholderTextColor={textSecondary}
                />
              </View>

              <View style={[styles.switchRow, { borderBottomColor: border }]}>
                <View style={styles.switchInfo}>
                  <ThemedText style={styles.inputLabel}>Incluir año</ThemedText>
                  <ThemedText style={[styles.switchDescription, { color: textSecondary }]}>
                    Añade el año al número (ej: F2025-0001)
                  </ThemedText>
                </View>
                <Switch
                  value={numbering.includeYear}
                  onValueChange={(value) => handleUpdateNumbering({ includeYear: value })}
                  trackColor={{ false: border, true: primary + '80' }}
                  thumbColor={numbering.includeYear ? primary : '#f4f3f4'}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <ThemedText style={styles.inputLabel}>Reiniciar cada año</ThemedText>
                  <ThemedText style={[styles.switchDescription, { color: textSecondary }]}>
                    Vuelve a 0001 cada 1 de enero
                  </ThemedText>
                </View>
                <Switch
                  value={numbering.resetYearly}
                  onValueChange={(value) => handleUpdateNumbering({ resetYearly: value })}
                  trackColor={{ false: border, true: primary + '80' }}
                  thumbColor={numbering.resetYearly ? primary : '#f4f3f4'}
                />
              </View>
            </>
          )}
        </View>

        {/* Sección de Plantillas */}
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="doc.text" size={20} color={primary} />
            <ThemedText style={styles.sectionTitle}>Plantillas de Factura</ThemedText>
            <Pressable
              style={[styles.addButton, { backgroundColor: primary }]}
              onPress={openNewTemplate}
            >
              <IconSymbol name="plus" size={16} color="#fff" />
            </Pressable>
          </View>

          {templates.map((template) => (
            <View 
              key={template.id} 
              style={[
                styles.templateCard, 
                { borderColor: border },
                template.id === invoiceTemplateService.getDefaultTemplate().id && {
                  borderColor: success,
                  backgroundColor: success + '10',
                }
              ]}
            >
              <View style={styles.templateInfo}>
                <View style={styles.templateHeader}>
                  <View 
                    style={[styles.colorPreview, { backgroundColor: template.primaryColor }]} 
                  />
                  <ThemedText style={styles.templateName}>{template.name}</ThemedText>
                  {template.id === invoiceTemplateService.getDefaultTemplate().id && (
                    <View style={[styles.defaultBadge, { backgroundColor: success }]}>
                      <ThemedText style={styles.defaultBadgeText}>Por defecto</ThemedText>
                    </View>
                  )}
                </View>
                <ThemedText style={[styles.templateDetails, { color: textSecondary }]}>
                  {template.fontFamily} • {template.showBorder ? 'Con borde' : 'Sin borde'}
                </ThemedText>
              </View>

              <View style={styles.templateActions}>
                {template.id !== invoiceTemplateService.getDefaultTemplate().id && (
                  <Pressable
                    style={[styles.actionButton, { borderColor: success }]}
                    onPress={() => handleSetDefaultTemplate(template.id)}
                  >
                    <IconSymbol name="checkmark" size={14} color={success} />
                  </Pressable>
                )}
                <Pressable
                  style={[styles.actionButton, { borderColor: primary }]}
                  onPress={() => {
                    setSelectedTemplate(template);
                    setShowTemplateModal(true);
                  }}
                >
                  <IconSymbol name="pencil" size={14} color={primary} />
                </Pressable>
                {template.id !== 'default' && (
                  <Pressable
                    style={[styles.actionButton, { borderColor: '#ff6b6b' }]}
                    onPress={() => handleDeleteTemplate(template.id)}
                  >
                    <IconSymbol name="trash" size={14} color="#ff6b6b" />
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Modal de edición de plantilla */}
      <Modal
        visible={showTemplateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTemplateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: border }]}>
              <ThemedText style={styles.modalTitle}>
                {selectedTemplate?.id === 'new' ? 'Nueva Plantilla' : 'Editar Plantilla'}
              </ThemedText>
              <Pressable onPress={() => setShowTemplateModal(false)}>
                <IconSymbol name="xmark.circle.fill" size={28} color={textSecondary} />
              </Pressable>
            </View>

            {selectedTemplate && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Nombre de la plantilla</ThemedText>
                  <TextInput
                    style={[styles.formInput, { backgroundColor, color: textColor, borderColor: border }]}
                    value={selectedTemplate.name}
                    onChangeText={(text) => setSelectedTemplate({ ...selectedTemplate, name: text })}
                    placeholder="Mi plantilla"
                    placeholderTextColor={textSecondary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Color principal</ThemedText>
                  <TextInput
                    style={[styles.formInput, { backgroundColor, color: textColor, borderColor: border }]}
                    value={selectedTemplate.primaryColor}
                    onChangeText={(text) => setSelectedTemplate({ ...selectedTemplate, primaryColor: text })}
                    placeholder="#1a5f7a"
                    placeholderTextColor={textSecondary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Texto del pie</ThemedText>
                  <TextInput
                    style={[styles.formInput, styles.textArea, { backgroundColor, color: textColor, borderColor: border }]}
                    value={selectedTemplate.footerText}
                    onChangeText={(text) => setSelectedTemplate({ ...selectedTemplate, footerText: text })}
                    placeholder="Gracias por confiar en nuestros servicios"
                    placeholderTextColor={textSecondary}
                    multiline
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Condiciones de pago</ThemedText>
                  <TextInput
                    style={[styles.formInput, styles.textArea, { backgroundColor, color: textColor, borderColor: border }]}
                    value={selectedTemplate.termsText}
                    onChangeText={(text) => setSelectedTemplate({ ...selectedTemplate, termsText: text })}
                    placeholder="Pago a 30 días..."
                    placeholderTextColor={textSecondary}
                    multiline
                  />
                </View>

                <View style={styles.switchGroup}>
                  <ThemedText style={styles.formLabel}>Mostrar borde</ThemedText>
                  <Switch
                    value={selectedTemplate.showBorder}
                    onValueChange={(value) => setSelectedTemplate({ ...selectedTemplate, showBorder: value })}
                    trackColor={{ false: border, true: primary + '80' }}
                    thumbColor={selectedTemplate.showBorder ? primary : '#f4f3f4'}
                  />
                </View>

                <View style={styles.switchGroup}>
                  <ThemedText style={styles.formLabel}>Mostrar información de pago</ThemedText>
                  <Switch
                    value={selectedTemplate.showPaymentInfo}
                    onValueChange={(value) => setSelectedTemplate({ ...selectedTemplate, showPaymentInfo: value })}
                    trackColor={{ false: border, true: primary + '80' }}
                    thumbColor={selectedTemplate.showPaymentInfo ? primary : '#f4f3f4'}
                  />
                </View>

                <View style={styles.switchGroup}>
                  <ThemedText style={styles.formLabel}>Mostrar notas</ThemedText>
                  <Switch
                    value={selectedTemplate.showNotes}
                    onValueChange={(value) => setSelectedTemplate({ ...selectedTemplate, showNotes: value })}
                    trackColor={{ false: border, true: primary + '80' }}
                    thumbColor={selectedTemplate.showNotes ? primary : '#f4f3f4'}
                  />
                </View>
              </ScrollView>
            )}

            <View style={[styles.modalFooter, { borderTopColor: border }]}>
              <Pressable
                style={[styles.cancelButton, { borderColor: border }]}
                onPress={() => setShowTemplateModal(false)}
              >
                <ThemedText>Cancelar</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.saveButton, { backgroundColor: primary }]}
                onPress={handleSaveTemplate}
              >
                <ThemedText style={styles.saveButtonText}>Guardar</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>
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
  section: {
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBox: {
    margin: Spacing.md,
    marginTop: 0,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  previewNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  inputLabel: {
    fontSize: 15,
  },
  input: {
    width: 100,
    padding: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  switchInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  switchDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  templateInfo: {
    flex: 1,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  colorPreview: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '500',
  },
  defaultBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.sm,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  templateDetails: {
    fontSize: 12,
    marginLeft: 24,
  },
  templateActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalBody: {
    padding: Spacing.lg,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  formInput: {
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
