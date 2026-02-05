import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { InvoiceConcept, InvoiceSummary } from '@/hooks/use-invoice-materials';
import { useInventory } from '@/hooks/use-inventory';
import { BorderRadius, Spacing } from '@/constants/theme';

interface InvoiceConceptsListProps {
  concepts: InvoiceConcept[];
  summary: InvoiceSummary;
  onAddService: (service: { name: string; description?: string; unitPrice: number; taxRate?: number }) => void;
  onAddMaterial: (material: { inventoryItemId?: string; name: string; quantity: number; unitPrice: number; taxRate?: number }) => void;
  onUpdateConcept: (id: string, updates: Partial<InvoiceConcept>) => void;
  onRemoveConcept: (id: string) => void;
  onMoveConcept: (id: string, direction: 'up' | 'down') => void;
  editable?: boolean;
}

export function InvoiceConceptsList({
  concepts,
  summary,
  onAddService,
  onAddMaterial,
  onUpdateConcept,
  onRemoveConcept,
  onMoveConcept,
  editable = true,
}: InvoiceConceptsListProps) {
  const { items: inventoryItems } = useInventory();
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<'service' | 'material'>('service');
  const [editingConcept, setEditingConcept] = useState<InvoiceConcept | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formQuantity, setFormQuantity] = useState('1');
  const [formPrice, setFormPrice] = useState('');
  const [formTaxRate, setFormTaxRate] = useState('21');
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<string | null>(null);

  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const primary = useThemeColor({}, 'tint');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const error = useThemeColor({}, 'error');
  const border = useThemeColor({}, 'border');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormQuantity('1');
    setFormPrice('');
    setFormTaxRate('21');
    setSelectedInventoryItem(null);
    setEditingConcept(null);
  };

  const openAddModal = (type: 'service' | 'material') => {
    setAddType(type);
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (concept: InvoiceConcept) => {
    setEditingConcept(concept);
    setAddType(concept.type);
    setFormName(concept.name);
    setFormDescription(concept.description || '');
    setFormQuantity(concept.quantity.toString());
    setFormPrice(concept.unitPrice.toString());
    setFormTaxRate(concept.taxRate.toString());
    setShowAddModal(true);
  };

  const handleSelectInventoryItem = (itemId: string) => {
    const item = inventoryItems.find(i => i.id === itemId);
    if (item) {
      setSelectedInventoryItem(itemId);
      setFormName(item.name);
      setFormPrice(item.salePrice?.toString() || item.price?.toString() || '');
    }
  };

  const handleSave = () => {
    const price = parseFloat(formPrice);
    const quantity = parseFloat(formQuantity) || 1;
    const taxRate = parseFloat(formTaxRate) || 21;

    if (!formName || isNaN(price)) return;

    if (editingConcept) {
      onUpdateConcept(editingConcept.id, {
        name: formName,
        description: formDescription || undefined,
        quantity,
        unitPrice: price,
        taxRate,
      });
    } else if (addType === 'service') {
      onAddService({
        name: formName,
        description: formDescription || undefined,
        unitPrice: price,
        taxRate,
      });
    } else {
      onAddMaterial({
        inventoryItemId: selectedInventoryItem || undefined,
        name: formName,
        quantity,
        unitPrice: price,
        taxRate,
      });
    }

    setShowAddModal(false);
    resetForm();
  };

  return (
    <View style={styles.container}>
      {/* Cabecera */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Conceptos</ThemedText>
        {editable && (
          <View style={styles.headerActions}>
            <Pressable
              style={[styles.addButton, { borderColor: primary }]}
              onPress={() => openAddModal('service')}
            >
              <IconSymbol name="wrench.and.screwdriver" size={14} color={primary} />
              <ThemedText style={[styles.addButtonText, { color: primary }]}>Servicio</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.addButton, { borderColor: success }]}
              onPress={() => openAddModal('material')}
            >
              <IconSymbol name="shippingbox" size={14} color={success} />
              <ThemedText style={[styles.addButtonText, { color: success }]}>Material</ThemedText>
            </Pressable>
          </View>
        )}
      </View>

      {/* Lista de conceptos */}
      {concepts.length > 0 ? (
        <View style={styles.conceptsList}>
          {concepts.map((concept, index) => (
            <View 
              key={concept.id} 
              style={[styles.conceptCard, { backgroundColor: cardBg, borderColor: border }]}
            >
              <View style={styles.conceptHeader}>
                <View style={[
                  styles.conceptTypeBadge,
                  { backgroundColor: concept.type === 'service' ? primary + '20' : success + '20' }
                ]}>
                  <IconSymbol 
                    name={concept.type === 'service' ? 'wrench.and.screwdriver' : 'shippingbox'} 
                    size={12} 
                    color={concept.type === 'service' ? primary : success} 
                  />
                </View>
                <ThemedText style={styles.conceptName} numberOfLines={1}>
                  {concept.name}
                </ThemedText>
                {editable && (
                  <View style={styles.conceptActions}>
                    {index > 0 && (
                      <Pressable onPress={() => onMoveConcept(concept.id, 'up')}>
                        <IconSymbol name="chevron.up" size={16} color={textSecondary} />
                      </Pressable>
                    )}
                    {index < concepts.length - 1 && (
                      <Pressable onPress={() => onMoveConcept(concept.id, 'down')}>
                        <IconSymbol name="chevron.down" size={16} color={textSecondary} />
                      </Pressable>
                    )}
                    <Pressable onPress={() => openEditModal(concept)}>
                      <IconSymbol name="pencil" size={16} color={primary} />
                    </Pressable>
                    <Pressable onPress={() => onRemoveConcept(concept.id)}>
                      <IconSymbol name="trash" size={16} color={error} />
                    </Pressable>
                  </View>
                )}
              </View>
              
              {concept.description && (
                <ThemedText style={[styles.conceptDescription, { color: textSecondary }]} numberOfLines={2}>
                  {concept.description}
                </ThemedText>
              )}

              <View style={styles.conceptDetails}>
                <View style={styles.conceptDetail}>
                  <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>Cantidad</ThemedText>
                  <ThemedText style={styles.detailValue}>{concept.quantity}</ThemedText>
                </View>
                <View style={styles.conceptDetail}>
                  <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>Precio ud.</ThemedText>
                  <ThemedText style={styles.detailValue}>{formatCurrency(concept.unitPrice)}</ThemedText>
                </View>
                <View style={styles.conceptDetail}>
                  <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>IVA</ThemedText>
                  <ThemedText style={styles.detailValue}>{concept.taxRate}%</ThemedText>
                </View>
                <View style={styles.conceptDetail}>
                  <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>Total</ThemedText>
                  <ThemedText style={[styles.detailValue, { color: primary, fontWeight: '600' }]}>
                    {formatCurrency(concept.total)}
                  </ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.emptyState, { backgroundColor: cardBg }]}>
          <IconSymbol name="doc.text" size={32} color={textSecondary} />
          <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
            No hay conceptos añadidos
          </ThemedText>
          <ThemedText style={[styles.emptyHint, { color: textSecondary }]}>
            Añade servicios o materiales a la factura
          </ThemedText>
        </View>
      )}

      {/* Resumen */}
      {concepts.length > 0 && (
        <View style={[styles.summaryCard, { backgroundColor: cardBg }]}>
          <View style={styles.summaryRow}>
            <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>Subtotal</ThemedText>
            <ThemedText style={styles.summaryValue}>{formatCurrency(summary.subtotal)}</ThemedText>
          </View>
          
          {summary.totalDiscount > 0 && (
            <View style={styles.summaryRow}>
              <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>Descuento</ThemedText>
              <ThemedText style={[styles.summaryValue, { color: success }]}>
                -{formatCurrency(summary.totalDiscount)}
              </ThemedText>
            </View>
          )}
          
          <View style={styles.summaryRow}>
            <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>Base imponible</ThemedText>
            <ThemedText style={styles.summaryValue}>{formatCurrency(summary.taxBase)}</ThemedText>
          </View>
          
          {summary.taxes.map((tax, index) => (
            <View key={index} style={styles.summaryRow}>
              <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>
                IVA ({tax.rate}%)
              </ThemedText>
              <ThemedText style={styles.summaryValue}>{formatCurrency(tax.amount)}</ThemedText>
            </View>
          ))}
          
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <ThemedText style={styles.totalLabel}>TOTAL</ThemedText>
            <ThemedText style={[styles.totalValue, { color: primary }]}>
              {formatCurrency(summary.total)}
            </ThemedText>
          </View>
        </View>
      )}

      {/* Modal de añadir/editar */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {editingConcept ? 'Editar' : 'Añadir'} {addType === 'service' ? 'Servicio' : 'Material'}
              </ThemedText>
              <Pressable onPress={() => setShowAddModal(false)}>
                <IconSymbol name="xmark.circle.fill" size={28} color={textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Selector de inventario para materiales */}
              {addType === 'material' && !editingConcept && inventoryItems.length > 0 && (
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Seleccionar del inventario</ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {inventoryItems.slice(0, 10).map(item => (
                      <Pressable
                        key={item.id}
                        style={[
                          styles.inventoryOption,
                          { borderColor: border },
                          selectedInventoryItem === item.id && { borderColor: primary, backgroundColor: primary + '10' },
                        ]}
                        onPress={() => handleSelectInventoryItem(item.id)}
                      >
                        <ThemedText style={styles.inventoryOptionName} numberOfLines={1}>
                          {item.name}
                        </ThemedText>
                        <ThemedText style={[styles.inventoryOptionPrice, { color: primary }]}>
                          {formatCurrency(item.salePrice || item.price || 0)}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Nombre *</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor, color: textColor, borderColor: border }]}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder={addType === 'service' ? 'Ej: Afinación de piano' : 'Ej: Cuerda de piano'}
                  placeholderTextColor={textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Descripción</ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor, color: textColor, borderColor: border }]}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  placeholder="Descripción opcional..."
                  placeholderTextColor={textSecondary}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <ThemedText style={styles.formLabel}>Cantidad</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor, color: textColor, borderColor: border }]}
                    value={formQuantity}
                    onChangeText={setFormQuantity}
                    placeholder="1"
                    placeholderTextColor={textSecondary}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <ThemedText style={styles.formLabel}>Precio unitario (€) *</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor, color: textColor, borderColor: border }]}
                    value={formPrice}
                    onChangeText={setFormPrice}
                    placeholder="0.00"
                    placeholderTextColor={textSecondary}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Tipo de IVA</ThemedText>
                <View style={styles.taxOptions}>
                  {['21', '10', '4', '0'].map(rate => (
                    <Pressable
                      key={rate}
                      style={[
                        styles.taxOption,
                        { borderColor: border },
                        formTaxRate === rate && { borderColor: primary, backgroundColor: primary + '10' },
                      ]}
                      onPress={() => setFormTaxRate(rate)}
                    >
                      <ThemedText style={[
                        styles.taxOptionText,
                        formTaxRate === rate && { color: primary, fontWeight: '600' },
                      ]}>
                        {rate}%
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Preview */}
              {formPrice && (
                <View style={[styles.previewCard, { backgroundColor: primary + '10' }]}>
                  <ThemedText style={[styles.previewLabel, { color: textSecondary }]}>
                    Total del concepto:
                  </ThemedText>
                  <ThemedText style={[styles.previewValue, { color: primary }]}>
                    {formatCurrency(
                      (parseFloat(formQuantity) || 1) * 
                      (parseFloat(formPrice) || 0) * 
                      (1 + (parseFloat(formTaxRate) || 21) / 100)
                    )}
                  </ThemedText>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.cancelButton, { borderColor: border }]}
                onPress={() => setShowAddModal(false)}
              >
                <ThemedText>Cancelar</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.saveButton,
                  { backgroundColor: primary },
                  (!formName || !formPrice) && styles.buttonDisabled,
                ]}
                onPress={handleSave}
                disabled={!formName || !formPrice}
              >
                <ThemedText style={styles.saveButtonText}>
                  {editingConcept ? 'Guardar' : 'Añadir'}
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: 4,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  conceptsList: {
    gap: Spacing.sm,
  },
  conceptCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  conceptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  conceptTypeBadge: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conceptName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  conceptActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  conceptDescription: {
    fontSize: 12,
    marginTop: Spacing.xs,
    marginLeft: 32,
  },
  conceptDetails: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  conceptDetail: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: Spacing.sm,
  },
  emptyHint: {
    fontSize: 12,
    marginTop: 4,
  },
  summaryCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryTotal: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
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
    borderBottomColor: 'rgba(0,0,0,0.1)',
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
  formRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  input: {
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    fontSize: 15,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  inventoryOption: {
    padding: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.sm,
    minWidth: 120,
  },
  inventoryOptionName: {
    fontSize: 13,
    fontWeight: '500',
  },
  inventoryOptionPrice: {
    fontSize: 12,
    marginTop: 2,
  },
  taxOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  taxOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  taxOptionText: {
    fontSize: 14,
  },
  previewCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
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
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default InvoiceConceptsList;
