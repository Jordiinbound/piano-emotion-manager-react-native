/**
 * Página de Configuración (Icono Header)
 * Piano Emotion Manager
 * 
 * Redirige a la pantalla unificada de configuración
 */

import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function SettingsIndexScreen() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir inmediatamente a la pantalla unificada
    router.replace('/settings-unified');
  }, []);

  return null;
}
