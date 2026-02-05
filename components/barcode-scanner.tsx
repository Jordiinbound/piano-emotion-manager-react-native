import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { barcodeScannerService, BarcodeResult } from '@/services/barcode-scanner-service';
import { BorderRadius, Spacing } from '@/constants/theme';

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (result: BarcodeResult) => void;
  title?: string;
  subtitle?: string;
}

// Tipos de código de barras soportados en móvil
const MOBILE_BARCODE_TYPES = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'code93',
  'codabar',
  'itf14',
  'qr',
  'datamatrix',
  'pdf417',
];

export function BarcodeScanner({ visible, onClose, onScan, title, subtitle }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [cameraSupported, setCameraSupported] = useState(true);

  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const primary = useThemeColor({}, 'tint');
  const success = useThemeColor({}, 'success');

  useEffect(() => {
    if (visible && Platform.OS === 'web') {
      initScanner();
    }

    return () => {
      if (Platform.OS === 'web') {
        barcodeScannerService.stopScanner();
      }
    };
  }, [visible]);

  const initScanner = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Verificar soporte de cámara
      const supported = await barcodeScannerService.checkCameraSupport();
      setCameraSupported(supported);

      if (!supported) {
        setError('Tu navegador no soporta acceso a la cámara');
        setIsLoading(false);
        return;
      }

      // Esperar a que el elemento esté disponible
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!scannerRef.current) {
        setError('Error inicializando el escáner');
        setIsLoading(false);
        return;
      }

      await barcodeScannerService.startScanner(scannerRef.current, {
        onDetected: handleDetected,
        onError: (err) => {
          setError(err.message);
        },
      });

      setIsLoading(false);
    } catch (err: unknown) {
      setError(err.message || 'Error iniciando el escáner');
      setIsLoading(false);
    }
  };

  const handleDetected = (result: BarcodeResult) => {
    // Evitar escaneos duplicados rápidos
    if (lastScanned === result.code) return;
    
    setLastScanned(result.code);
    onScan(result);
    
    // Resetear después de 2 segundos para permitir nuevo escaneo
    setTimeout(() => setLastScanned(null), 2000);
  };

  const handleClose = () => {
    barcodeScannerService.stopScanner();
    onClose();
  };

  // Versión móvil con expo-camera
  if (Platform.OS !== 'web') {
    return (
      <MobileBarcodeScanner
        visible={visible}
        onClose={onClose}
        onScan={onScan}
        title={title}
        subtitle={subtitle}
        colors={{ cardBg, textColor, textSecondary, primary, success }}
      />
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <ThemedView style={[styles.modalContent, { backgroundColor: cardBg }]}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>
              {title || 'Escanear Código de Barras'}
            </ThemedText>
            <Pressable onPress={handleClose}>
              <IconSymbol name="xmark.circle.fill" size={28} color={textSecondary} />
            </Pressable>
          </View>

          {/* Scanner area */}
          <View style={styles.scannerContainer}>
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <IconSymbol name="camera" size={32} color={primary} />
                <ThemedText style={[styles.loadingText, { color: textSecondary }]}>
                  Iniciando cámara...
                </ThemedText>
              </View>
            )}

            {error && (
              <View style={styles.errorOverlay}>
                <IconSymbol name="exclamationmark.triangle" size={32} color="#ff6b6b" />
                <ThemedText style={styles.errorText}>{error}</ThemedText>
                <Pressable
                  style={[styles.retryButton, { borderColor: primary }]}
                  onPress={initScanner}
                >
                  <ThemedText style={[styles.retryButtonText, { color: primary }]}>
                    Reintentar
                  </ThemedText>
                </Pressable>
              </View>
            )}

            {lastScanned && (
              <View style={[styles.scannedOverlay, { backgroundColor: success }]}>
                <IconSymbol name="checkmark.circle.fill" size={24} color="#fff" />
                <ThemedText style={styles.scannedText}>
                  Escaneado: {lastScanned}
                </ThemedText>
              </View>
            )}

            <div
              ref={scannerRef as any}
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
              }}
            />

            {/* Overlay con marco de escaneo */}
            {!isLoading && !error && (
              <View style={styles.scanOverlay}>
                <View style={styles.scanFrame}>
                  <View style={[styles.scanCorner, styles.topLeft, { borderColor: primary }]} />
                  <View style={[styles.scanCorner, styles.topRight, { borderColor: primary }]} />
                  <View style={[styles.scanCorner, styles.bottomLeft, { borderColor: primary }]} />
                  <View style={[styles.scanCorner, styles.bottomRight, { borderColor: primary }]} />
                </View>
                <ThemedText style={styles.scanHint}>
                  Centra el código de barras en el recuadro
                </ThemedText>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <ThemedText style={[styles.footerText, { color: textSecondary }]}>
              Soporta: EAN-13, EAN-8, Code 128, Code 39, UPC
            </ThemedText>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scannerContainer: {
    width: '100%',
    height: 350,
    position: 'relative',
    backgroundColor: '#000',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 10,
  },
  loadingText: {
    marginTop: Spacing.sm,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 10,
    padding: Spacing.lg,
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  retryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  retryButtonText: {
    fontWeight: '500',
  },
  scannedOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
    zIndex: 10,
  },
  scannedText: {
    color: '#fff',
    fontWeight: '500',
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  scanFrame: {
    width: 250,
    height: 150,
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanHint: {
    color: '#fff',
    marginTop: Spacing.lg,
    fontSize: 13,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  footer: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
  notSupported: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  notSupportedText: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  closeButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

// ============================================
// COMPONENTE MÓVIL CON EXPO-CAMERA
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.7;

interface MobileBarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (result: BarcodeResult) => void;
  title?: string;
  subtitle?: string;
  colors: {
    cardBg: string;
    textColor: string;
    textSecondary: string;
    primary: string;
    success: string;
  };
}

function MobileBarcodeScanner({
  visible,
  onClose,
  onScan,
  title = 'Escanear Código',
  subtitle = 'Apunta la cámara al código de barras',
  colors,
}: MobileBarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  // Resetear estado cuando se abre el modal
  useEffect(() => {
    if (visible) {
      setScanned(false);
      setLastScannedCode(null);
    }
  }, [visible]);

  // Solicitar permisos al abrir
  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible, permission]);

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    // Evitar escaneos múltiples del mismo código
    if (scanned || result.data === lastScannedCode) {
      return;
    }

    setScanned(true);
    setLastScannedCode(result.data);
    
    // Feedback háptico
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Notificar al padre con formato BarcodeResult
    onScan({
      code: result.data,
      format: result.type,
      timestamp: new Date(),
    });
  };

  const handleRescan = () => {
    setScanned(false);
    setLastScannedCode(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Si no hay permisos
  if (!permission?.granted && visible) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={mobileStyles.container}>
          <View style={mobileStyles.header}>
            <Pressable style={mobileStyles.closeButton} onPress={onClose}>
              <IconSymbol name="xmark" size={24} color="#333" />
            </Pressable>
            <ThemedText style={mobileStyles.title}>{title}</ThemedText>
            <View style={mobileStyles.placeholder} />
          </View>

          <View style={mobileStyles.permissionContainer}>
            <IconSymbol name="camera.fill" size={64} color="#9CA3AF" />
            <ThemedText style={mobileStyles.permissionTitle}>
              Permiso de Cámara Requerido
            </ThemedText>
            <ThemedText style={mobileStyles.permissionText}>
              Para escanear códigos de barras, necesitamos acceso a la cámara de tu dispositivo.
            </ThemedText>
            <Pressable style={mobileStyles.permissionButton} onPress={requestPermission}>
              <ThemedText style={mobileStyles.permissionButtonText}>
                Permitir Acceso
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={mobileStyles.container}>
        {/* Header */}
        <View style={mobileStyles.header}>
          <Pressable style={mobileStyles.closeButton} onPress={onClose}>
            <IconSymbol name="xmark" size={24} color="#333" />
          </Pressable>
          <ThemedText style={mobileStyles.title}>{title}</ThemedText>
          <View style={mobileStyles.placeholder} />
        </View>

        {/* Cámara */}
        <View style={mobileStyles.cameraContainer}>
          <CameraView
            style={mobileStyles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: MOBILE_BARCODE_TYPES as any,
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          >
            {/* Overlay con guía de escaneo */}
            <View style={mobileStyles.overlay}>
              <View style={mobileStyles.overlayTop} />
              <View style={mobileStyles.overlayMiddle}>
                <View style={mobileStyles.overlaySide} />
                <View style={mobileStyles.scanArea}>
                  {/* Esquinas de la guía */}
                  <View style={[mobileStyles.corner, mobileStyles.cornerTopLeft]} />
                  <View style={[mobileStyles.corner, mobileStyles.cornerTopRight]} />
                  <View style={[mobileStyles.corner, mobileStyles.cornerBottomLeft]} />
                  <View style={[mobileStyles.corner, mobileStyles.cornerBottomRight]} />
                  
                  {/* Línea de escaneo */}
                  {!scanned && (
                    <View style={mobileStyles.scanLine} />
                  )}
                </View>
                <View style={mobileStyles.overlaySide} />
              </View>
              <View style={mobileStyles.overlayBottom}>
                <ThemedText style={mobileStyles.subtitle}>{subtitle}</ThemedText>
              </View>
            </View>
          </CameraView>
        </View>

        {/* Resultado del escaneo */}
        {scanned && lastScannedCode && (
          <View style={mobileStyles.resultContainer}>
            <View style={mobileStyles.resultCard}>
              <IconSymbol name="checkmark.circle.fill" size={32} color="#10B981" />
              <View style={mobileStyles.resultContent}>
                <ThemedText style={mobileStyles.resultLabel}>Código detectado</ThemedText>
                <ThemedText style={mobileStyles.resultCode}>{lastScannedCode}</ThemedText>
              </View>
            </View>
            
            <View style={mobileStyles.resultActions}>
              <Pressable style={mobileStyles.rescanButton} onPress={handleRescan}>
                <IconSymbol name="arrow.clockwise" size={20} color="#6B7280" />
                <ThemedText style={mobileStyles.rescanButtonText}>Escanear otro</ThemedText>
              </Pressable>
            </View>
          </View>
        )}

        {/* Tipos de código soportados */}
        <View style={mobileStyles.supportedTypes}>
          <ThemedText style={mobileStyles.supportedTypesTitle}>Códigos soportados:</ThemedText>
          <ThemedText style={mobileStyles.supportedTypesList}>
            EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR
          </ThemedText>
        </View>
      </View>
    </Modal>
  );
}

const mobileStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: '#FFF',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE * 0.6,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#10B981',
    borderWidth: 3,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanLine: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: '#10B981',
    opacity: 0.8,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    paddingTop: Spacing.lg,
  },
  subtitle: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  permissionText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  permissionButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: '#FFF',
    padding: Spacing.md,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.md,
  },
  resultContent: {
    flex: 1,
  },
  resultLabel: {
    fontSize: 13,
    color: '#059669',
    marginBottom: 2,
  },
  resultCode: {
    fontSize: 18,
    fontWeight: '600',
    color: '#065F46',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  rescanButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  supportedTypes: {
    backgroundColor: '#FFF',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  supportedTypesTitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  supportedTypesList: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default BarcodeScanner;
