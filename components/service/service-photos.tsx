/**
 * Service Photos Component
 * Componente para capturar y mostrar fotos antes/después de un servicio
 */
import { useState, useCallback } from 'react';
import { View, Image, StyleSheet, Pressable, ScrollView, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing, BorderRadius } from '@/constants/theme';

interface Photo {
  uri: string;
  type: 'before' | 'after';
  timestamp: Date;
  caption?: string;
}

interface ServicePhotosProps {
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
}

export function ServicePhotos({
  photos,
  onPhotosChange,
  maxPhotos = 10,
  disabled = false,
}: ServicePhotosProps) {
  const [selectedType, setSelectedType] = useState<'before' | 'after'>('before');
  
  const backgroundColor = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'accent');
  const textColor = useThemeColor({}, 'text');

  const beforePhotos = photos.filter(p => p.type === 'before');
  const afterPhotos = photos.filter(p => p.type === 'after');

  const requestPermissions = useCallback(async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
        Alert.alert(
          'Permisos necesarios',
          'Se necesitan permisos de cámara y galería para añadir fotos.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  }, []);

  const takePhoto = useCallback(async () => {
    if (disabled || photos.length >= maxPhotos) return;
    
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newPhoto: Photo = {
          uri: result.assets[0].uri,
          type: selectedType,
          timestamp: new Date(),
        };
        onPhotosChange([...photos, newPhoto]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  }, [disabled, photos, maxPhotos, selectedType, requestPermissions, onPhotosChange]);

  const pickFromGallery = useCallback(async () => {
    if (disabled || photos.length >= maxPhotos) return;
    
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: maxPhotos - photos.length,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newPhotos: Photo[] = result.assets.map(asset => ({
          uri: asset.uri,
          type: selectedType,
          timestamp: new Date(),
        }));
        onPhotosChange([...photos, ...newPhotos]);
      }
    } catch (error) {
      console.error('Error picking photos:', error);
      Alert.alert('Error', 'No se pudieron seleccionar las fotos');
    }
  }, [disabled, photos, maxPhotos, selectedType, requestPermissions, onPhotosChange]);

  const removePhoto = useCallback((index: number) => {
    Alert.alert(
      'Eliminar foto',
      '¿Estás seguro de que quieres eliminar esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const newPhotos = photos.filter((_, i) => i !== index);
            onPhotosChange(newPhotos);
          },
        },
      ]
    );
  }, [photos, onPhotosChange]);

  const showPhotoOptions = useCallback(() => {
    if (Platform.OS === 'web') {
      pickFromGallery();
      return;
    }

    Alert.alert(
      'Añadir foto',
      'Selecciona una opción',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Tomar foto', onPress: takePhoto },
        { text: 'Elegir de galería', onPress: pickFromGallery },
      ]
    );
  }, [takePhoto, pickFromGallery]);

  const renderPhotoGrid = (photoList: Photo[], type: 'before' | 'after') => {
    const title = type === 'before' ? 'Antes' : 'Después';
    const icon = type === 'before' ? 'clock.arrow.circlepath' : 'checkmark.circle';
    const color = type === 'before' ? '#F59E0B' : '#10B981';

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <IconSymbol name={icon} size={18} color={color} />
          <ThemedText style={[styles.sectionTitle, { color }]}>{title}</ThemedText>
          <ThemedText style={styles.photoCount}>({photoList.length})</ThemedText>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
          <View style={styles.photoRow}>
            {photoList.map((photo, index) => {
              const globalIndex = photos.indexOf(photo);
              return (
                <View key={index} style={[styles.photoContainer, { borderColor }]}>
                  <Image source={{ uri: photo.uri }} style={styles.photo} />
                  {!disabled && (
                    <Pressable
                      style={styles.removeButton}
                      onPress={() => removePhoto(globalIndex)}
                    >
                      <IconSymbol name="xmark.circle.fill" size={24} color="#DC2626" />
                    </Pressable>
                  )}
                </View>
              );
            })}
            
            {!disabled && photoList.length < 5 && (
              <Pressable
                style={[styles.addPhotoButton, { borderColor, backgroundColor }]}
                onPress={() => {
                  setSelectedType(type);
                  showPhotoOptions();
                }}
              >
                <IconSymbol name="camera.fill" size={24} color={accentColor} />
                <ThemedText style={[styles.addPhotoText, { color: accentColor }]}>
                  Añadir
                </ThemedText>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconSymbol name="photo.on.rectangle" size={20} color={textColor} />
        <ThemedText style={styles.title}>Fotos del servicio</ThemedText>
        <ThemedText style={styles.subtitle}>
          {photos.length}/{maxPhotos}
        </ThemedText>
      </View>

      {renderPhotoGrid(beforePhotos, 'before')}
      {renderPhotoGrid(afterPhotos, 'after')}

      {photos.length === 0 && (
        <View style={[styles.emptyState, { backgroundColor, borderColor }]}>
          <IconSymbol name="photo.stack" size={40} color={borderColor} />
          <ThemedText style={styles.emptyText}>
            Añade fotos antes y después del servicio
          </ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Las fotos ayudan a documentar el trabajo realizado
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.6,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  photoCount: {
    fontSize: 12,
    opacity: 0.6,
  },
  photoScroll: {
    marginHorizontal: -Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  photoRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 4,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
  },
});
