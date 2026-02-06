/**
 * Página de prueba para debugging de categorías
 */
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useInventoryCategories } from '@/hooks/data/use-inventory-categories';
import { useEffect } from 'react';

export default function TestCategoriesScreen() {
  const { categories, isLoading, error } = useInventoryCategories();

  useEffect(() => {
    console.log('[TestCategories] Mount');
    console.log('[TestCategories] isLoading:', isLoading);
    console.log('[TestCategories] error:', error);
    console.log('[TestCategories] categories:', categories);
  }, [isLoading, error, categories]);

  return (
    <ThemedView style={{ flex: 1, padding: 20 }}>
      <ThemedText style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Test Categorías
      </ThemedText>

      {isLoading && (
        <View style={{ padding: 20 }}>
          <ActivityIndicator size="large" />
          <Text>Cargando categorías...</Text>
        </View>
      )}

      {error && (
        <View style={{ padding: 20, backgroundColor: '#ffebee', borderRadius: 8 }}>
          <Text style={{ color: '#c62828', fontWeight: 'bold' }}>Error:</Text>
          <Text style={{ color: '#c62828' }}>{JSON.stringify(error, null, 2)}</Text>
        </View>
      )}

      {!isLoading && !error && (
        <ScrollView>
          <Text style={{ marginBottom: 10, fontWeight: 'bold' }}>
            Total categorías: {categories.length}
          </Text>
          {categories.map((cat: any) => (
            <View
              key={cat.id}
              style={{
                padding: 15,
                marginBottom: 10,
                backgroundColor: '#f5f5f5',
                borderRadius: 8,
              }}
            >
              <Text style={{ fontWeight: 'bold' }}>{cat.label}</Text>
              <Text style={{ fontSize: 12, color: '#666' }}>Key: {cat.key}</Text>
              <Text style={{ fontSize: 12, color: '#666' }}>Icon: {cat.icon}</Text>
              <Text style={{ fontSize: 12, color: '#666' }}>Order: {cat.displayOrder}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}
