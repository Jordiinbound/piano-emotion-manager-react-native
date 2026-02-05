/**
 * Página Principal de Configuración (Drawer)
 * Piano Emotion Manager
 * 
 * Redirige a la pantalla unificada de configuración
 */

import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir inmediatamente a la pantalla unificada
    router.replace('/(drawer)/settings-unified');
  }, []);

  return null;
}
