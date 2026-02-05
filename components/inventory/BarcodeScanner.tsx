/**
 * Componente de Escáner de Código de Barras
 * Piano Emotion Manager
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Vibration,
  Alert,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/hooks/use-translation';
import { useProductByBarcode } from '@/hooks/inventory';

// ============================================================================
// Types
// ============================================================================

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onProductFound: (productId: number) => void;
  onBarcodeNotFound?: (barcode: string) => void;
}

interface ScanResult {
  type: string;
  data: string;
}

// ============================================================================
// Main Component
// ============================================================================

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  visible,
  onClose,
  onProductFound,
  onBarcodeNotFound,
}) => {
  const { t } = useTranslation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const { product, isLoading, scanBarcode, clearBarcode } = useProductByBarcode();

  // Request camera permission
  useEffect(() => {
    const getPermission = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    if (visible) {
      getPermission();
    }
  }, [visible]);

  // Handle product found
  useEffect(() => {
    if (product && lastScannedCode) {
      Vibration.vibrate(100);
      onProductFound(product.id);
      handleClose();
    } else if (!isLoading && lastScannedCode && !product) {
      Vibration.vibrate([0, 100, 100, 100]);
      if (onBarcodeNotFound) {
        onBarcodeNotFound(lastScannedCode);
      } else {
        Alert.alert(
          t('inventory.productNotFound'),
          t('inventory.barcodeNotFoundMessage', { barcode: lastScannedCode }),
          [
            { text: t('common.cancel'), onPress: handleClose },
            { text: t('common.retry'), onPress: () => setScanned(false) },
          ]
        );
      }
    }
  }, [product, isLoading, lastScannedCode]);

  const handleClose = () => {
    setScanned(false);
    setLastScannedCode(null);
    clearBarcode();
    onClose();
  };

  const handleBarCodeScanned = ({ type, data }: ScanResult) => {
    if (scanned) return;
    
    setScanned(true);
    setLastScannedCode(data);
    scanBarcode(data);
  };

  const toggleFlash = () => {
    setFlashOn(!flashOn);
  };

  // Permission not determined
  if (hasPermission === null) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        </View>
      </Modal>
    );
  }

  // Permission denied
  if (hasPermission === false) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <View style={styles.container}>
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={64} color="#9ca3af" />
            <Text style={styles.permissionTitle}>
              {t('inventory.cameraPermissionRequired')}
            </Text>
            <Text style={styles.permissionText}>
              {t('inventory.cameraPermissionDescription')}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={flashOn}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: [
              'ean13',
              'ean8',
              'upc_a',
              'upc_e',
              'code39',
              'code93',
              'code128',
              'codabar',
              'itf14',
              'qr',
              'datamatrix',
            ],
          }}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('inventory.scanBarcode')}</Text>
            <TouchableOpacity style={styles.headerButton} onPress={toggleFlash}>
              <Ionicons
                name={flashOn ? 'flash' : 'flash-off'}
                size={24}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          {/* Scan Area */}
          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              
              {/* Scan Line Animation */}
              <View style={styles.scanLine} />
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            {isLoading ? (
              <View style={styles.loadingIndicator}>
                <Text style={styles.footerText}>{t('inventory.searchingProduct')}</Text>
              </View>
            ) : scanned ? (
              <TouchableOpacity
                style={styles.rescanButton}
                onPress={() => setScanned(false)}
              >
                <Ionicons name="refresh" size={20} color="#fff" />
                <Text style={styles.rescanButtonText}>{t('inventory.scanAgain')}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.footerText}>
                {t('inventory.positionBarcode')}
              </Text>
            )}

            {lastScannedCode && (
              <Text style={styles.scannedCode}>
                {t('inventory.scannedCode')}: {lastScannedCode}
              </Text>
            )}
          </View>
        </CameraView>
      </View>
    </Modal>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  scanArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 280,
    height: 180,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#3b82f6',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: '#3b82f6',
    top: '50%',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  scannedCode: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
  },
  rescanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 32,
  },
  closeButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 4,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BarcodeScanner;
