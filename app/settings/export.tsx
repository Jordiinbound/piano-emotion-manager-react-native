/**
 * Export Screen
 * 
 * Screen for exporting data to PDF and Excel
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { trpc } from '../../utils/trpc';

type ExportType = 'clients' | 'services' | 'invoices' | 'inventory';
type ExportFormat = 'pdf' | 'excel';

export default function ExportScreen() {
  const [loading, setLoading] = useState(false);

  const exportClients = trpc.export.exportClients.useMutation();
  const exportServices = trpc.export.exportServices.useMutation();
  const exportInvoices = trpc.export.exportInvoices.useMutation();
  const exportInventory = trpc.export.exportInventory.useMutation();

  const handleExport = async (type: ExportType, format: ExportFormat) => {
    setLoading(true);

    try {
      let result;

      switch (type) {
        case 'clients':
          result = await exportClients.mutateAsync({ format });
          break;
        case 'services':
          result = await exportServices.mutateAsync({ format });
          break;
        case 'invoices':
          result = await exportInvoices.mutateAsync({ format });
          break;
        case 'inventory':
          result = await exportInventory.mutateAsync({ format });
          break;
      }

      if (result.success) {
        await downloadFile(result.base64, result.filename);
        Alert.alert('Éxito', 'Archivo exportado correctamente');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al exportar');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (base64: string, filename: string) => {
    const fileUri = FileSystem.documentDirectory + filename;

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    } else {
      Alert.alert('Archivo guardado', `Guardado en: ${fileUri}`);
    }
  };

  const exportOptions = [
    {
      type: 'clients' as ExportType,
      title: 'Lista de Clientes',
      description: 'Exportar todos los clientes con su información',
      icon: '📋',
      color: '#2196F3',
    },
    {
      type: 'services' as ExportType,
      title: 'Lista de Servicios',
      description: 'Exportar servicios realizados',
      icon: '🔧',
      color: '#4CAF50',
    },
    {
      type: 'invoices' as ExportType,
      title: 'Lista de Facturas',
      description: 'Exportar facturas emitidas',
      icon: '💰',
      color: '#FF9800',
    },
    {
      type: 'inventory' as ExportType,
      title: 'Inventario',
      description: 'Exportar inventario de repuestos',
      icon: '📦',
      color: '#795548',
    },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Exportar Datos',
          headerBackTitle: 'Volver',
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.header}>¿Qué deseas exportar?</Text>
        <Text style={styles.subheader}>
          Selecciona el formato de exportación para cada tipo de datos
        </Text>

        {exportOptions.map((option) => (
          <View key={option.type} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
                <Text style={styles.icon}>{option.icon}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={styles.cardDescription}>{option.description}</Text>
              </View>
            </View>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.exportButton, styles.pdfButton]}
                onPress={() => handleExport(option.type, 'pdf')}
                disabled={loading}
              >
                <Text style={styles.exportButtonText}>📄 PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.exportButton, styles.excelButton]}
                onPress={() => handleExport(option.type, 'excel')}
                disabled={loading}
              >
                <Text style={styles.exportButtonText}>📊 Excel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {loading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>Generando archivo...</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subheader: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  exportButton: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  pdfButton: {
    backgroundColor: '#f44336',
  },
  excelButton: {
    backgroundColor: '#4CAF50',
  },
  exportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: 'white',
    borderRadius: 4,
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
});
