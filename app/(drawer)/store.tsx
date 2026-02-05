/**
 * Página Principal de Tienda
 * Piano Emotion Manager
 */
import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet } from 'react-native';
import { useHeader } from '@/contexts/HeaderContext';
import { useLanguage } from '@/contexts/language-context';
import { ShopViewElegant } from '@/components/shop';

export default function StoreScreen() {
  const { setHeaderConfig } = useHeader();
  const { t, isLoading } = useLanguage();

  // Configurar header cuando las traducciones estén listas
  useFocusEffect(
    React.useCallback(() => {
      if (!isLoading) {
        setHeaderConfig({
          title: t('shop.title'),
          subtitle: t('shop.subtitle'),
          showLogo: true,
          showBackButton: false,
        });
      }
    }, [setHeaderConfig, t, isLoading])
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
