import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LoadingSpinner } from '@/components/loading-spinner';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useInvoicesData } from '@/hooks/data/use-invoices-data';
import { useBusinessInfo } from '@/hooks/use-invoices';
import { useServiceCatalog } from '@/hooks/use-service-catalog';
import { useClientsData, usePianosData, useServicesData } from '@/hooks/data';
import { useInventoryData } from '@/hooks/data';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { Invoice, InvoiceItem, calculateInvoiceTotals, DEFAULT_TAX_RATE, INVOICE_STATUS_LABELS } from '@/types/invoice';
import { SERVICE_RATE_CATEGORY_LABELS } from '@/types/service-catalog';
import { getClientFullName, getClientFormattedAddress } from '@/types';
import { openInvoiceForPrint, sendInvoiceByEmail, downloadInvoiceHTML } from '@/lib/invoice-pdf';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isNew = id === 'new';

  const { invoices, loading, addInvoice, updateInvoice, deleteInvoice, getInvoice, markAsSent, markAsPaid } = useInvoicesData();
  const { businessInfo } = useBusinessInfo();
  const { rates, getActiveRates } = useServiceCatalog();
  const { clients } = useClientsData();
  const { pianos } = usePianosData();
  const { services, getServicesByClient } = useServicesData();
  const { materials, getMaterial } = useInventoryData();

  const [isEditing, setIsEditing] = useState(isNew);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showServiceSelector, setShowServiceSelector] = useState(false);

  const [form, setForm] = useState<Partial<Invoice>>({
    date: new Date().toISOString().split('T')[0],
    status: 'draft',
    items: [],
    business: businessInfo,
    clientId: '',
    clientName: '',
  });

  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accent = useThemeColor({}, 'accent');
  const error = useThemeColor({}, 'error');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const textColor = useThemeColor({}, 'text');
  const background = useThemeColor({}, 'background');

  useEffect(() => {
    if (!isNew && id) {
      const invoice = getInvoice(id);
      if (invoice) {
        // Crear copia para no mutar el original
        const invoiceData = { ...invoice };
        
        // Asignar número de factura si no existe (migración de facturas antiguas)
        if (!invoiceData.invoiceNumber) {
          invoiceData.invoiceNumber = `2026/${String(invoices.length + 1).padStart(6, '0')}`;
        }
        
        // Poblar clientName desde clientId si no existe
        if (invoiceData.clientId && !invoiceData.clientName) {
          const client = clients.find(c => c.id === invoiceData.clientId);
          if (client) {
            invoiceData.clientName = getClientFullName(client);
            invoiceData.clientEmail = client.email;
            invoiceData.clientAddress = getClientFormattedAddress(client);
            invoiceData.clientTaxId = client.taxId;
          }
        }
        
        // Asegurar que items sea un array
        if (!invoiceData.items || !Array.isArray(invoiceData.items)) {
          invoiceData.items = [];
        }
        
        // Si no hay totales calculados, calcularlos ahora
        if (!invoiceData.subtotal || !invoiceData.total) {
          const calculatedTotals = calculateInvoiceTotals(invoiceData.items);
          invoiceData.subtotal = calculatedTotals.subtotal;
          invoiceData.taxAmount = calculatedTotals.taxAmount;
          invoiceData.total = calculatedTotals.total;
        }
        
        console.log('[Invoice Detail] Loaded invoice:', {
          id: invoiceData.id,
          invoiceNumber: invoiceData.invoiceNumber,
          clientName: invoiceData.clientName,
          clientId: invoiceData.clientId,
          itemsCount: invoiceData.items?.length || 0,
          subtotal: invoiceData.subtotal,
          total: invoiceData.total,
          status: invoiceData.status
        });
        
        // Si se modificaron datos (número, cliente, totales), guardar en AsyncStorage
        const needsUpdate = !invoice.invoiceNumber || 
                           (invoiceData.clientId && !invoice.clientName) || 
                           !invoice.subtotal || 
                           !invoice.total;
        
        if (needsUpdate) {
          console.log('[Invoice Detail] Updating invoice with missing data');
          updateInvoice(id, invoiceData).catch(err => {
            console.error('[Invoice Detail] Error updating invoice:', err);
          });
        }
        
        setForm(invoiceData);
      } else {
        console.log('[Invoice Detail] Invoice not found:', id);
      }
    } else {
      setForm(prev => ({ ...prev, business: businessInfo }));
    }
  }, [id, isNew, invoices, businessInfo, clients]);

  const totals = useMemo(() => {
    // Si la factura ya existe y tiene totales guardados, usarlos
    if (!isNew && form.subtotal !== undefined && form.tax !== undefined && form.total !== undefined) {
      return {
        subtotal: form.subtotal || 0,
        taxAmount: form.tax || 0,
        total: form.total || 0,
      };
    }
    // Si no, calcular desde items
    return calculateInvoiceTotals(form.items || []);
  }, [form.items, form.subtotal, form.tax, form.total, isNew]);

  const handleAddItem = (serviceId?: string) => {
    let newItem: InvoiceItem;

    if (serviceId) {
      const rate = rates.find(r => r.id === serviceId);
      if (rate) {
        const total = rate.basePrice * (1 + rate.taxRate / 100);
        newItem = {
          description: rate.name,
          quantity: 1,
          unitPrice: rate.basePrice,
          taxRate: rate.taxRate,
          total,
        };
      } else {
        return;
      }
    } else {
      newItem = {
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: DEFAULT_TAX_RATE,
        total: 0,
      };
    }

    setForm(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem],
    }));
    setShowServicePicker(false);
  };

  const handleUpdateItem = (index: number, updates: Partial<InvoiceItem>) => {
    const newItems = [...(form.items || [])];
    const item = { ...newItems[index], ...updates };
    item.total = item.quantity * item.unitPrice * (1 + item.taxRate / 100);
    newItems[index] = item;
    setForm(prev => ({ ...prev, items: newItems }));
  };

  const handleRemoveItem = (index: number) => {
    const newItems = (form.items || []).filter((_, i) => i !== index);
    setForm(prev => ({ ...prev, items: newItems }));
  };

  // Función para importar materiales de un servicio realizado
  const handleImportServiceMaterials = (serviceId: string) => {
    const service = services.find((s: { id: string }) => s.id === serviceId);
    if (!service || !service.materialsUsed || service.materialsUsed.length === 0) {
      Alert.alert('Info', 'Este servicio no tiene materiales registrados');
      return;
    }

    const newItems: InvoiceItem[] = [];
    
    // Añadir el servicio como concepto principal
    const serviceRate = rates.find(r => r.name === service.type || r.id === service.type);
    if (serviceRate) {
      newItems.push({
        description: `Servicio: ${serviceRate.name}`,
        quantity: 1,
        unitPrice: serviceRate.basePrice,
        taxRate: serviceRate.taxRate,
        total: serviceRate.basePrice * (1 + serviceRate.taxRate / 100),
      });
    }

    // Añadir cada material usado
    service.materialsUsed.forEach((usage: { materialId: string; quantity: number }) => {
      const material = getMaterial(usage.materialId);
      if (material) {
        const unitPrice = material.salePrice || material.unitPrice || material.costPrice || 0;
        const taxRate = DEFAULT_TAX_RATE;
        newItems.push({
          description: `Material: ${material.name}`,
          quantity: usage.quantity,
          unitPrice,
          taxRate,
          total: usage.quantity * unitPrice * (1 + taxRate / 100),
        });
      }
    });

    if (newItems.length > 0) {
      setForm(prev => ({
        ...prev,
        items: [...(prev.items || []), ...newItems],
      }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowServiceSelector(false);
  };

  // Obtener servicios del cliente seleccionado
  const clientServices = useMemo(() => {
    if (!form.clientId) return [];
    return getServicesByClient(form.clientId);
  }, [form.clientId, services]);

  const handleSelectClient = (clientId: string) => {
    const client = clients.find((c: { id: string }) => c.id === clientId);
    if (client) {
      setForm(prev => ({
        ...prev,
        clientId: client.id,
        clientName: getClientFullName(client),
        clientEmail: client.email,
        clientAddress: getClientFormattedAddress(client),
      }));
    }
    setShowClientPicker(false);
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.clientName?.trim()) {
      Alert.alert('Error', 'Debes seleccionar un cliente');
      return;
    }

    if (!form.items || form.items.length === 0) {
      Alert.alert('Error', 'La factura debe tener al menos un concepto');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const invoiceData = {
        ...form,
        business: businessInfo,
        ...totals,
      };

      if (isNew) {
        await addInvoice(invoiceData as any);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Éxito', 'Factura creada correctamente');
        router.back();
      } else if (id) {
        await updateInvoice(id, invoiceData);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Éxito', 'Factura actualizada correctamente');
        setIsEditing(false);
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar la factura';
      setSaveError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    if (!id || isNew) return;
    const invoice = getInvoice(id);
    if (invoice) {
      if (Platform.OS === 'web') {
        openInvoiceForPrint(invoice);
      } else {
        Alert.alert('Info', 'La generación de PDF está disponible en la versión web');
      }
    }
  };

  const handleDownload = () => {
    if (!id || isNew) return;
    const invoice = getInvoice(id);
    if (invoice) {
      if (Platform.OS === 'web') {
        downloadInvoiceHTML(invoice);
      } else {
        Alert.alert('Info', 'La descarga está disponible en la versión web');
      }
    }
  };

  const handleSendEmail = async () => {
    if (!id || isNew) return;
    const invoice = getInvoice(id);
    if (invoice) {
      if (!invoice.clientEmail) {
        Alert.alert('Error', 'El cliente no tiene email configurado');
        return;
      }
      sendInvoiceByEmail(invoice);
      await markAsSent(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleToggleStatus = async () => {
    if (!id || isNew) return;
    
    const isPaid = form.status === 'paid';
    const newStatus = isPaid ? 'draft' : 'paid';
    const statusLabel = isPaid ? 'Pendiente' : 'Pagada';
    
    try {
      if (isPaid) {
        // Cambiar de pagada a pendiente
        await updateInvoice(id, { status: 'draft', paidAt: undefined });
        setForm(prev => ({
          ...prev,
          status: 'draft',
          paidAt: undefined
        }));
      } else {
        // Cambiar de pendiente a pagada
        await markAsPaid(id);
        setForm(prev => ({
          ...prev,
          status: 'paid',
          paidAt: new Date().toISOString()
        }));
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(`✅ Factura ${statusLabel}`, `La factura ha sido marcada como ${statusLabel.toLowerCase()} correctamente.`);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'No se pudo cambiar el estado de la factura. Inténtalo de nuevo.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar factura',
      '¿Estás seguro de que quieres eliminar esta factura?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deleteInvoice(id!);
            router.back();
          },
        },
      ]
    );
  };

  const activeRates = getActiveRates();
  // Colores modernos para badges de estado
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'paid':
        return { color: success, bgColor: `${success}10`, borderColor: success };
      case 'sent':
        return { color: accent, bgColor: `${accent}10`, borderColor: accent };
      case 'cancelled':
        return { color: error, bgColor: `${error}10`, borderColor: error };
      case 'draft':
      default:
        return { color: textSecondary, bgColor: 'transparent', borderColor: borderColor };
    }
  };
  const statusStyle = getStatusStyle(form.status || 'draft');

  // Mostrar spinner mientras carga
  if (loading && !isNew) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Cargando factura...',
          }}
        />
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: isNew ? 'Nueva Factura' : `Factura ${form.invoiceNumber || ''}`,
          headerRight: () =>
            !isNew && (
              <Pressable onPress={() => setIsEditing(!isEditing)} style={{ marginRight: Spacing.md }}>
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
        {/* Estado */}
        {!isNew && (
          <View style={[styles.statusBanner, { backgroundColor: statusStyle.bgColor, borderColor: statusStyle.borderColor }]}>
            <ThemedText style={[styles.statusText, { color: statusStyle.color }]}>
              {INVOICE_STATUS_LABELS[form.status as keyof typeof INVOICE_STATUS_LABELS]}
            </ThemedText>
          </View>
        )}

        {/* Cliente */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={[styles.sectionTitle, { color: textSecondary }]}>Cliente</ThemedText>
          
          {isEditing ? (
            <Pressable
              style={[styles.pickerButton, { borderColor }]}
              onPress={() => setShowClientPicker(true)}
            >
              <ThemedText style={form.clientName ? {} : { color: textSecondary }}>
                {form.clientName || 'Seleccionar cliente...'}
              </ThemedText>
              <IconSymbol name="chevron.right" size={16} color={textSecondary} />
            </Pressable>
          ) : (
            <View>
              <ThemedText style={styles.clientName}>{form.clientName}</ThemedText>
              {form.clientEmail && (
                <ThemedText style={[styles.clientInfo, { color: textSecondary }]}>{form.clientEmail}</ThemedText>
              )}
              {form.clientAddress && (
                <ThemedText style={[styles.clientInfo, { color: textSecondary }]}>{form.clientAddress}</ThemedText>
              )}
            </View>
          )}
        </View>

        {/* Fecha */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={[styles.sectionTitle, { color: textSecondary }]}>Fecha</ThemedText>
          {isEditing ? (
            <TextInput
              style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
              value={form.date}
              onChangeText={(text) => setForm({ ...form, date: text })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={textSecondary}
            />
          ) : (
            <ThemedText>{form.date ? new Date(form.date).toLocaleDateString('es-ES') : '-'}</ThemedText>
          )}
        </View>

        {/* Conceptos */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionTitle, { color: textSecondary }]}>Conceptos</ThemedText>
            {isEditing && (
              <View style={styles.headerButtons}>
                {form.clientId && clientServices.length > 0 && (
                  <Pressable
                    style={[styles.addButton, { backgroundColor: `${success}15`, marginRight: Spacing.sm }]}
                    onPress={() => setShowServiceSelector(true)}
                  >
                    <IconSymbol name="doc.text.fill" size={16} color={success} />
                    <ThemedText style={[styles.addButtonText, { color: success }]}>Importar servicio</ThemedText>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.addButton, { backgroundColor: `${accent}15` }]}
                  onPress={() => setShowServicePicker(true)}
                >
                  <IconSymbol name="plus" size={16} color={accent} />
                  <ThemedText style={[styles.addButtonText, { color: accent }]}>Añadir</ThemedText>
                </Pressable>
              </View>
            )}
          </View>

          {(form.items || []).map((item, index) => (
            <View key={index} style={[styles.itemCard, { borderColor }]}>
              {isEditing ? (
                <>
                  <View style={styles.itemHeader}>
                    <TextInput
                      style={[styles.itemDescription, { color: textColor }]}
                      value={item.description}
                      onChangeText={(text) => handleUpdateItem(index, { description: text })}
                      placeholder="Descripción"
                      placeholderTextColor={textSecondary}
                    />
                    <Pressable onPress={() => handleRemoveItem(index)}>
                      <IconSymbol name="trash.fill" size={18} color={error} />
                    </Pressable>
                  </View>
                  <View style={styles.itemRow}>
                    <View style={styles.itemField}>
                      <ThemedText style={[styles.itemLabel, { color: textSecondary }]}>Cant.</ThemedText>
                      <TextInput
                        style={[styles.itemInput, { borderColor, color: textColor }]}
                        value={item.quantity.toString()}
                        onChangeText={(text) => handleUpdateItem(index, { quantity: parseInt(text) || 1 })}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={styles.itemField}>
                      <ThemedText style={[styles.itemLabel, { color: textSecondary }]}>Precio</ThemedText>
                      <TextInput
                        style={[styles.itemInput, { borderColor, color: textColor }]}
                        value={item.unitPrice.toString()}
                        onChangeText={(text) => handleUpdateItem(index, { unitPrice: parseFloat(text) || 0 })}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.itemField}>
                      <ThemedText style={[styles.itemLabel, { color: textSecondary }]}>IVA %</ThemedText>
                      <TextInput
                        style={[styles.itemInput, { borderColor, color: textColor }]}
                        value={item.taxRate.toString()}
                        onChangeText={(text) => handleUpdateItem(index, { taxRate: parseInt(text) || 21 })}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <ThemedText style={styles.itemDescriptionView}>{item.description}</ThemedText>
                  <View style={styles.itemRowView}>
                    <ThemedText style={[styles.itemDetail, { color: textSecondary }]}>
                      {item.quantity} x €{item.unitPrice.toFixed(2)} (+{item.taxRate}% IVA)
                    </ThemedText>
                    <ThemedText style={styles.itemTotal}>€{item.total.toFixed(2)}</ThemedText>
                  </View>
                </>
              )}
            </View>
          ))}

          {(form.items || []).length === 0 && (
            <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
              No hay conceptos añadidos
            </ThemedText>
          )}
        </View>

        {/* Totales */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.totalRow}>
            <ThemedText style={{ color: textSecondary }}>Subtotal</ThemedText>
            <ThemedText>€{totals.subtotal.toFixed(2)}</ThemedText>
          </View>
          <View style={styles.totalRow}>
            <ThemedText style={{ color: textSecondary }}>IVA</ThemedText>
            <ThemedText>€{totals.taxAmount.toFixed(2)}</ThemedText>
          </View>
          <View style={[styles.totalRow, styles.totalFinal]}>
            <ThemedText style={styles.totalLabel}>TOTAL</ThemedText>
            <ThemedText style={[styles.totalValue, { color: statusStyle.color }]}>€{totals.total.toFixed(2)}</ThemedText>
          </View>
        </View>

        {/* Notas */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={[styles.sectionTitle, { color: textSecondary }]}>Notas</ThemedText>
          {isEditing ? (
            <TextInput
              style={[styles.input, styles.inputMultiline, { backgroundColor: cardBg, borderColor, color: textColor }]}
              value={form.notes}
              onChangeText={(text) => setForm({ ...form, notes: text })}
              placeholder="Notas adicionales..."
              placeholderTextColor={textSecondary}
              multiline
              numberOfLines={3}
            />
          ) : (
            <ThemedText style={{ color: form.notes ? textColor : textSecondary }}>
              {form.notes || 'Sin notas'}
            </ThemedText>
          )}
        </View>

        {/* Acciones */}
        {isEditing ? (
          <Pressable style={[styles.saveButton, { backgroundColor: accent }]} onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Guardar cambios"
            accessibilityHint="Pulsa para guardar los datos">
            <ThemedText style={styles.saveButtonText}>
              {isNew ? 'Crear Factura' : 'Guardar Cambios'}
            </ThemedText>
          </Pressable>
        ) : (
          <View style={styles.actionsContainer}>
            <View style={styles.actionsRow}>
              <Pressable style={[styles.actionButton, { backgroundColor: `${accent}15` }]} onPress={handlePrint}>
                <IconSymbol name="printer.fill" size={20} color={accent} />
                <ThemedText style={[styles.actionButtonText, { color: accent }]}>Imprimir/PDF</ThemedText>
              </Pressable>
              <Pressable style={[styles.actionButton, { backgroundColor: `${accent}15` }]} onPress={handleDownload}>
                <IconSymbol name="arrow.down.doc.fill" size={20} color={accent} />
                <ThemedText style={[styles.actionButtonText, { color: accent }]}>Descargar</ThemedText>
              </Pressable>
            </View>
            <Pressable style={[styles.actionButtonFull, { backgroundColor: accent }]} onPress={handleSendEmail}>
              <IconSymbol name="paperplane.fill" size={20} color="#FFFFFF" />
              <ThemedText style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Enviar por Email</ThemedText>
            </Pressable>
            <Pressable 
              style={[styles.actionButtonFull, { backgroundColor: form.status === 'paid' ? accent : success }]} 
              onPress={handleToggleStatus}
            >
              <IconSymbol 
                name={form.status === 'paid' ? "arrow.counterclockwise.circle.fill" : "checkmark.circle.fill"} 
                size={20} 
                color="#FFFFFF" 
              />
              <ThemedText style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                {form.status === 'paid' ? 'Marcar como Pendiente' : 'Marcar como Pagada'}
              </ThemedText>
            </Pressable>
            <Pressable 
              style={[styles.actionButtonFull, { backgroundColor: accent }]} 
              onPress={async () => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  // Generar PDF usando el servicio
                  const { generateInvoicePDF } = await import('@/server/services/pdf/invoice-pdf.service');
                  const pdfData = await generateInvoicePDF({
                    invoiceNumber: form.invoiceNumber || '',
                    date: form.date || new Date().toISOString(),
                    dueDate: form.dueDate,
                    status: form.status || 'draft',
                    clientName: form.clientName || '',
                    clientEmail: form.clientEmail,
                    clientAddress: form.clientAddress,
                    clientTaxId: form.clientTaxId,
                    items: form.items || [],
                    subtotal: form.subtotal || 0,
                    taxRate: form.taxRate || 21,
                    taxAmount: form.taxAmount || 0,
                    total: form.total || 0,
                    notes: form.notes,
                    paymentTerms: form.paymentTerms,
                  });
                  Alert.alert('✅ PDF Generado', `Factura ${form.invoiceNumber} exportada correctamente.\n\nTamaño: ${Math.round(pdfData.length / 1024)} KB`);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch (err) {
                  console.error('Error generando PDF:', err);
                  Alert.alert('Error', 'No se pudo generar el PDF. Inténtalo de nuevo.');
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                }
              }}
            >
              <IconSymbol name="doc.fill" size={20} color="#FFFFFF" />
              <ThemedText style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Exportar PDF</ThemedText>
            </Pressable>
            <Pressable style={[styles.deleteButton, { borderColor: error }]} onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel="Eliminar"
            accessibilityHint="Pulsa para eliminar este elemento">
              <IconSymbol name="trash.fill" size={20} color={error} />
              <ThemedText style={[styles.deleteButtonText, { color: error }]}>Eliminar Factura</ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Modal selector de servicios */}
      {showServicePicker && (
        <Pressable style={styles.modalOverlay} onPress={() => setShowServicePicker(false)}>
          <View style={[styles.modalContent, { backgroundColor: background }]}>
            <ThemedText style={styles.modalTitle}>Seleccionar servicio</ThemedText>
            <ScrollView style={styles.modalScroll}>
              <Pressable
                style={[styles.modalOption, { borderColor }]}
                onPress={() => handleAddItem()}
              >
                <ThemedText>+ Concepto personalizado</ThemedText>
              </Pressable>
              {activeRates.map(rate => (
                <Pressable
                  key={rate.id}
                  style={[styles.modalOption, { borderColor }]}
                  onPress={() => handleAddItem(rate.id)}
                >
                  <View>
                    <ThemedText>{rate.name}</ThemedText>
                    <ThemedText style={[styles.modalOptionDetail, { color: textSecondary }]}>
                      {SERVICE_RATE_CATEGORY_LABELS[rate.category]} - €{rate.basePrice.toFixed(2)}
                    </ThemedText>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      )}

      {/* Modal selector de servicios del cliente para importar materiales */}
      {showServiceSelector && (
        <Pressable style={styles.modalOverlay} onPress={() => setShowServiceSelector(false)}>
          <View style={[styles.modalContent, { backgroundColor: background }]}>
            <ThemedText style={styles.modalTitle}>Importar servicio con materiales</ThemedText>
            <ScrollView style={styles.modalScroll}>
              {clientServices.map((service: { id: string; type: string; date: string }) => (
                <Pressable
                  key={service.id}
                  style={[styles.modalOption, { borderColor }]}
                  onPress={() => handleImportServiceMaterials(service.id)}
                >
                  <View>
                    <ThemedText style={{ fontWeight: '500' }}>{service.type}</ThemedText>
                    <ThemedText style={[styles.modalOptionDetail, { color: textSecondary }]}>
                      {new Date(service.date).toLocaleDateString('es-ES')}
                      {service.materialsUsed && service.materialsUsed.length > 0 && 
                        ` - ${service.materialsUsed.length} material(es)`
                      }
                    </ThemedText>
                  </View>
                  {service.materialsUsed && service.materialsUsed.length > 0 && (
                    <IconSymbol name="shippingbox.fill" size={16} color={success} />
                  )}
                </Pressable>
              ))}
              {clientServices.length === 0 && (
                <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
                  No hay servicios registrados para este cliente
                </ThemedText>
              )}
            </ScrollView>
          </View>
        </Pressable>
      )}

      {/* Modal selector de clientes */}
      {showClientPicker && (
        <Pressable style={styles.modalOverlay} onPress={() => setShowClientPicker(false)}>
          <View style={[styles.modalContent, { backgroundColor: background }]}>
            <ThemedText style={styles.modalTitle}>Seleccionar cliente</ThemedText>
            <ScrollView style={styles.modalScroll}>
              {clients.map((client: { id: string; firstName: string; lastName1?: string; phone: string }) => (
                <Pressable
                  key={client.id}
                  style={[styles.modalOption, { borderColor }]}
                  onPress={() => handleSelectClient(client.id)}
                >
                  <ThemedText>{getClientFullName(client)}</ThemedText>
                  {client.email && (
                    <ThemedText style={[styles.modalOptionDetail, { color: textSecondary }]}>
                      {client.email}
                    </ThemedText>
                  )}
                </Pressable>
              ))}
              {clients.length === 0 && (
                <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
                  No hay clientes registrados
                </ThemedText>
              )}
            </ScrollView>
          </View>
        </Pressable>
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
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  statusBanner: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  clientName: {
    fontSize: 17,
    fontWeight: '600',
  },
  clientInfo: {
    fontSize: 14,
    marginTop: 2,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  itemCard: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  itemDescription: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  itemDescriptionView: {
    fontSize: 15,
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  itemRowView: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemField: {
    flex: 1,
    gap: 2,
  },
  itemLabel: {
    fontSize: 11,
  },
  itemInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    fontSize: 14,
  },
  itemDetail: {
    fontSize: 13,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalFinal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  actionsContainer: {
    gap: Spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  actionButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalOption: {
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  modalOptionDetail: {
    fontSize: 13,
    marginTop: 2,
  },
});
