/**
 * Página Principal de Tienda
 * Piano Emotion Manager
 */
import React, { useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet } from 'react-native';
import { ShopViewElegant } from '@/components/shop';
import { useHeader } from '@/contexts/HeaderContext';

export default function StoreScreen() {
  const { setHeaderConfig } = useHeader();

  // Configurar header con valores directos
  useFocusEffect(
    React.useCallback(() => {
      setHeaderConfig({
        title: 'Piano Emotion Store',
        subtitle: 'Accesorios, componentes, materiales y productos para la reparación, restauración, mantenimiento y afinación de pianos acústicos',
        showLogo: true,
        showBackButton: false,
      });
    }, [setHeaderConfig])
  );

  return (
    <View style={styles.container}>
      <ShopViewElegant />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
});
