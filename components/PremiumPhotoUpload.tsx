/**
 * Premium Photo Upload Component
 * Piano Emotion Manager
 * 
 * A photo upload component that integrates with the subscription system.
 * Shows disabled state for users without storage access.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { useThemeColor } from '@/hooks/use-theme-color';

interface PremiumPhotoUploadProps {
  /** Current photo URI */
  photo?: string;
  /** Callback when photo changes */
  onPhotoChange: (uri: string | null) => void;
  /** Whether the component is in edit mode */
  isEditing?: boolean;
  /** Placeholder text when no photo */
  placeholder?: string;
  /** Aspect ratio for image picker */
  aspectRatio?: [number, number];
  /** Image quality (0-1) */
  quality?: number;
}

export function PremiumPhotoUpload({
  photo,
  onPhotoChange,
  isEditing = true,
  placeholder = 'Añadir foto',
  aspectRatio = [4, 3],
  quality = 0.8,
}: PremiumPhotoUploadProps) {
  const { hasFeature, checkFeatureAccess } = useSubscriptionContext();
  const hasStorageAccess = hasFeature('image_storage');
  
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accent = useThemeColor({}, 'accent');

  const pickImage = async (useCamera: boolean) => {
    // Check subscription access first
    if (!checkFeatureAccess('image_storage')) {
      return;
    }

    try {
      let result;
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permiso denegado', 'Necesitas permitir el acceso a la cámara');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: 'images',
          allowsEditing: true,
          aspect: aspectRatio,
          quality,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permiso denegado', 'Necesitas permitir el acceso a la galería');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          allowsEditing: true,
          aspect: aspectRatio,
          quality,
        });
      }
      if (!result.canceled && result.assets[0]) {
        onPhotoChange(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const showImageOptions = () => {
    // Check subscription access first
    if (!checkFeatureAccess('image_storage')) {
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancelar', 'Tomar foto', 'Elegir de galería', ...(photo ? ['Eliminar foto'] : [])],
          destructiveButtonIndex: photo ? 3 : undefined,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickImage(true);
          else if (buttonIndex === 2) pickImage(false);
          else if (buttonIndex === 3 && photo) onPhotoChange(null);
        }
      );
    } else {
      Alert.alert(
        'Foto',
        'Selecciona una opción',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Tomar foto', onPress: () => pickImage(true) },
          { text: 'Elegir de galería', onPress: () => pickImage(false) },
          ...(photo ? [{ text: 'Eliminar foto', style: 'destructive' as const, onPress: () => onPhotoChange(null) }] : []),
        ]
      );
    }
  };

  // Render with photo
  if (photo) {
    return (
      <Pressable 
        onPress={isEditing ? showImageOptions : undefined} 
        style={[
          styles.photoContainer,
          !hasStorageAccess && styles.disabled,
        ]}
      >
        <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
        {isEditing && (
          <View style={styles.photoOverlay}>
            <Ionicons name="camera" size={24} color="#FFFFFF" />
            <Text style={styles.photoOverlayText}>Cambiar foto</Text>
          </View>
        )}
        {!hasStorageAccess && (
          <View style={styles.lockOverlay}>
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={14} color="#fff" />
              <Text style={styles.lockText}>PRO</Text>
            </View>
          </View>
        )}
      </Pressable>
    );
  }

  // Render add photo button
  if (isEditing) {
    return (
      <Pressable
        onPress={showImageOptions}
        style={[
          styles.addPhotoButton, 
          { borderColor, backgroundColor: cardBg },
          !hasStorageAccess && styles.disabled,
        ]}
      >
        <Ionicons 
          name="camera" 
          size={32} 
          color={hasStorageAccess ? textSecondary : '#9ca3af'} 
        />
        <Text style={[
          styles.addPhotoText, 
          { color: hasStorageAccess ? textSecondary : '#9ca3af' }
        ]}>
          {placeholder}
        </Text>
        {!hasStorageAccess && (
          <View style={styles.proBadge}>
            <Ionicons name="lock-closed" size={12} color="#fff" />
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
        )}
      </Pressable>
    );
  }

  // Not editing and no photo
  return (
    <Text style={{ color: textSecondary }}>Sin foto</Text>
  );
}

const styles = StyleSheet.create({
  photoContainer: {
    position: 'relative',
    borderRadius: 4,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 4,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoOverlayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  addPhotoButton: {
    height: 120,
    borderRadius: 4,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    position: 'relative',
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },
  lockOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  lockText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  proBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  proBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default PremiumPhotoUpload;
