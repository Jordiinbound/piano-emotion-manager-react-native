import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  onClear?: () => void;
  width?: number;
  height?: number;
  initialSignature?: string;
}

export function SignaturePad({ 
  onSave, 
  onClear, 
  width = 300, 
  height = 200,
  initialSignature 
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!initialSignature);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (initialSignature) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
          };
          img.src = initialSignature;
        }
      }
    }
  }, [width, height, initialSignature]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (coords) {
      setIsDrawing(true);
      lastPoint.current = coords;
      setHasSignature(true);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !canvasRef.current || !lastPoint.current) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      lastPoint.current = coords;
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPoint.current = null;
  };

  const clearSignature = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
      }
    }
    setHasSignature(false);
    onClear?.();
  };

  const saveSignature = () => {
    if (canvasRef.current && hasSignature) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.notSupported}>
          La firma digital está disponible en la versión web
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>Firma del Cliente</ThemedText>
      
      <View style={[styles.canvasContainer, { width, height }]}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{
            border: '2px solid #ccc',
            borderRadius: 4,
            touchAction: 'none',
            cursor: 'crosshair',
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </View>

      <ThemedText style={styles.hint}>
        Firme con el dedo o el ratón en el recuadro
      </ThemedText>

      <View style={styles.buttonContainer}>
        <Pressable 
          style={[styles.button, styles.clearButton]} 
          onPress={clearSignature}
        >
          <ThemedText style={styles.buttonText}>Borrar</ThemedText>
        </Pressable>
        
        <Pressable 
          style={[styles.button, styles.saveButton, !hasSignature && styles.buttonDisabled]} 
          onPress={saveSignature}
          disabled={!hasSignature}
        >
          <ThemedText style={[styles.buttonText, styles.saveButtonText]}>
            Guardar Firma
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

interface SignatureDisplayProps {
  signature: string;
  width?: number;
  height?: number;
}

export function SignatureDisplay({ signature, width = 200, height = 100 }: SignatureDisplayProps) {
  if (!signature) return null;

  if (Platform.OS === 'web') {
    return (
      <View style={styles.signatureDisplay}>
        <ThemedText style={styles.signatureLabel}>Firma del cliente:</ThemedText>
        <img 
          src={signature} 
          alt="Firma del cliente"
          style={{ 
            width, 
            height, 
            objectFit: 'contain',
            border: '1px solid #ddd',
            borderRadius: 4,
            backgroundColor: '#fff'
          }} 
        />
      </View>
    );
  }

  return (
    <View style={styles.signatureDisplay}>
      <ThemedText style={styles.signatureLabel}>Firma registrada ✓</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
  },
  title: {
    marginBottom: 12,
  },
  canvasContainer: {
    backgroundColor: '#fff',
    borderRadius: 4,
    overflow: 'hidden',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    minWidth: 100,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#2D5A27',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
  },
  notSupported: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
  signatureDisplay: {
    marginTop: 16,
    alignItems: 'center',
  },
  signatureLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
});
