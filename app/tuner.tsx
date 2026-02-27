/**
 * Página del Afinador de Pianos
 * Piano Emotion Manager
 * 
 * Ruta: /tuner
 * Accesible desde Herramientas Avanzadas y desde el drawer
 */

import React from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import TunerScreen from '@/components/tuner/TunerScreen';

export default function TunerPage() {
  const router = useRouter();
  const background = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const border = useThemeColor({}, 'border');
  
  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      {/* Header de navegación */}
      <View style={[styles.header, { borderBottomColor: border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="arrow-back" size={22} color={textColor} />
        </Pressable>
        <View style={styles.headerCenter}>
          <ThemedText style={[styles.headerTitle, { color: textColor }]}>
            Afinador
          </ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: '#6b7280' }]}>
            Piano Emotion Tuner Pro
          </ThemedText>
        </View>
        <View style={{ width: 40 }} />
      </View>
      
      {/* Contenido del afinador */}
      {Platform.OS === 'web' ? (
        <TunerScreen />
      ) : (
        <View style={styles.nativeMessage}>
          <Ionicons name="globe-outline" size={48} color="#6b7280" />
          <ThemedText style={[styles.nativeText, { color: textColor }]}>
            Afinador disponible en la versión web
          </ThemedText>
          <ThemedText style={[styles.nativeDesc, { color: '#6b7280' }]}>
            El afinador de pianos utiliza la Web Audio API del navegador para capturar y analizar audio en tiempo real. Abre la aplicación en un navegador web para usar esta función.
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    ...Platform.select({
      web: {
        paddingTop: 12,
      },
      default: {
        paddingTop: 50,
      },
    }),
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    fontFamily: 'Arkhip',
    lineHeight: 24,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 16,
  },
  nativeMessage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  nativeText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 24,
    textAlign: 'center',
  },
  nativeDesc: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
});
