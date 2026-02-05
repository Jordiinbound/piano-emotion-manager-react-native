/**
 * Seed Data Button Component
 * Botón temporal para insertar datos de prueba
 */
import { useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

export function SeedDataButton() {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSeed = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      
      const response = await fetch('/api/seed-test-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al insertar datos');
      }

      const result = await response.json();
      
      // Invalidar queries para recargar datos
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      await queryClient.invalidateQueries({ queryKey: ['pianos'] });
      await queryClient.invalidateQueries({ queryKey: ['services'] });

      Alert.alert(
        '✅ Datos insertados',
        `Se crearon:\n• ${result.data.clientsCreated} clientes\n• ${result.data.pianosCreated} pianos\n• ${result.data.servicesCreated} servicios\n\n¡Las alertas deberían aparecer ahora!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error seeding data:', error);
      Alert.alert(
        '❌ Error',
        error instanceof Error ? error.message : 'Error al insertar datos',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleSeed}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.buttonText}>🧪 Insertar Datos de Prueba</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 4,
    alignItems: 'center',
    margin: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
