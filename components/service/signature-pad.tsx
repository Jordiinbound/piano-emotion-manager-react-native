/**
 * Signature Pad Component
 * Componente para capturar firma digital del cliente
 */
import { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, Platform, Image, Modal } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing, BorderRadius } from '@/constants/theme';

// Nota: En producción, usar react-native-signature-canvas o expo-signature-pad
// Este es un placeholder que simula la funcionalidad

interface SignaturePadProps {
  signature: string | null;
  onSignatureChange: (signature: string | null) => void;
  signerName?: string;
  onSignerNameChange?: (name: string) => void;
  disabled?: boolean;
  label?: string;
}

export function SignaturePad({
  signature,
  onSignatureChange,
  signerName,
  onSignerNameChange,
  disabled = false,
  label = 'Firma del cliente',
}: SignaturePadProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [tempSignature, setTempSignature] = useState<string | null>(null);
  
  const backgroundColor = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'accent');
  const textColor = useThemeColor({}, 'text');
  const successColor = '#10B981';

  const openSignaturePad = useCallback(() => {
    if (disabled) return;
    setTempSignature(null);
    setIsModalVisible(true);
  }, [disabled]);

  const handleSave = useCallback(() => {
    if (tempSignature) {
      onSignatureChange(tempSignature);
    }
    setIsModalVisible(false);
  }, [tempSignature, onSignatureChange]);

  const handleClear = useCallback(() => {
    setTempSignature(null);
  }, []);

  const handleCancel = useCallback(() => {
    setTempSignature(null);
    setIsModalVisible(false);
  }, []);

  const handleRemoveSignature = useCallback(() => {
    onSignatureChange(null);
  }, [onSignatureChange]);

  // Simulación de firma (en producción usar canvas real)
  const simulateSignature = useCallback(() => {
    // Generar una firma SVG simple como placeholder
    const svgSignature = `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="100" viewBox="0 0 300 100">
        <path d="M 20 50 Q 50 20, 80 50 T 140 50 T 200 50 T 260 50" 
              stroke="#1e40af" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M 100 60 Q 120 80, 150 60 T 200 70" 
              stroke="#1e40af" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>
    `)}`;
    setTempSignature(svgSignature);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconSymbol name="signature" size={20} color={textColor} />
        <ThemedText style={styles.label}>{label}</ThemedText>
        {signature && (
          <View style={[styles.signedBadge, { backgroundColor: `${successColor}20` }]}>
            <IconSymbol name="checkmark.circle.fill" size={14} color={successColor} />
            <ThemedText style={[styles.signedText, { color: successColor }]}>Firmado</ThemedText>
          </View>
        )}
      </View>

      {signature ? (
        <View style={[styles.signaturePreview, { backgroundColor, borderColor }]}>
          <Image 
            source={{ uri: signature }} 
            style={styles.signatureImage}
            resizeMode="contain"
          />
          {signerName && (
            <ThemedText style={styles.signerName}>{signerName}</ThemedText>
          )}
          <ThemedText style={styles.signatureDate}>
            {new Date().toLocaleDateString('es-ES', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </ThemedText>
          {!disabled && (
            <Pressable 
              style={[styles.removeButton, { borderColor }]}
              onPress={handleRemoveSignature}
            >
              <IconSymbol name="trash" size={16} color="#DC2626" />
              <ThemedText style={styles.removeText}>Eliminar firma</ThemedText>
            </Pressable>
          )}
        </View>
      ) : (
        <Pressable
          style={[
            styles.signatureButton,
            { backgroundColor, borderColor },
            disabled && styles.disabled,
          ]}
          onPress={openSignaturePad}
          disabled={disabled}
        >
          <IconSymbol name="pencil.tip" size={32} color={accentColor} />
          <ThemedText style={[styles.signatureButtonText, { color: accentColor }]}>
            Toca para firmar
          </ThemedText>
          <ThemedText style={styles.signatureHint}>
            El cliente debe firmar aquí para confirmar el servicio
          </ThemedText>
        </Pressable>
      )}

      {/* Modal de firma */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCancel}
      >
        <View style={[styles.modalContainer, { backgroundColor }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={handleCancel} style={styles.modalButton}>
              <ThemedText style={styles.cancelText}>Cancelar</ThemedText>
            </Pressable>
            <ThemedText style={styles.modalTitle}>Firma</ThemedText>
            <Pressable 
              onPress={handleSave} 
              style={styles.modalButton}
              disabled={!tempSignature}
            >
              <ThemedText style={[
                styles.saveText, 
                { color: tempSignature ? accentColor : borderColor }
              ]}>
                Guardar
              </ThemedText>
            </Pressable>
          </View>

          <View style={[styles.signatureArea, { borderColor }]}>
            {tempSignature ? (
              <Image 
                source={{ uri: tempSignature }} 
                style={styles.tempSignatureImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.signaturePlaceholder}>
                <IconSymbol name="hand.draw" size={48} color={borderColor} />
                <ThemedText style={[styles.placeholderText, { color: borderColor }]}>
                  Firme aquí
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.modalActions}>
            <Pressable 
              style={[styles.actionButton, { borderColor }]}
              onPress={handleClear}
            >
              <IconSymbol name="arrow.counterclockwise" size={20} color={textColor} />
              <ThemedText>Limpiar</ThemedText>
            </Pressable>
            
            {/* Botón temporal para simular firma (quitar en producción) */}
            {Platform.OS === 'web' && !tempSignature && (
              <Pressable 
                style={[styles.actionButton, { backgroundColor: accentColor }]}
                onPress={simulateSignature}
              >
                <IconSymbol name="pencil" size={20} color="#FFFFFF" />
                <ThemedText style={{ color: '#FFFFFF' }}>Simular firma</ThemedText>
              </Pressable>
            )}
          </View>

          <ThemedText style={styles.legalText}>
            Al firmar, el cliente confirma que el servicio ha sido realizado 
            satisfactoriamente y acepta las condiciones del mismo.
          </ThemedText>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  signedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  signedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  signatureButton: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  signatureButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  signatureHint: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  signaturePreview: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  signatureImage: {
    width: '100%',
    height: 80,
  },
  signerName: {
    fontSize: 14,
    fontWeight: '500',
  },
  signatureDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  removeText: {
    fontSize: 12,
    color: '#DC2626',
  },
  modalContainer: {
    flex: 1,
    padding: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  modalButton: {
    padding: Spacing.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cancelText: {
    color: '#DC2626',
  },
  saveText: {
    fontWeight: '600',
  },
  signatureArea: {
    flex: 1,
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    marginVertical: Spacing.md,
    overflow: 'hidden',
  },
  signaturePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  placeholderText: {
    fontSize: 18,
  },
  tempSignatureImage: {
    width: '100%',
    height: '100%',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  legalText: {
    fontSize: 11,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
});
