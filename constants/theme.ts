/**
 * Piano Tech Manager - Theme Configuration
 * Paleta inspirada en pianos acústicos: tonos oscuros elegantes con acentos dorados
 */

import { Platform } from "react-native";

// Colores principales
const primaryDark = "#1A1A2E"; // Azul oscuro profundo (teclas negras)
const accent = "#e07a5f"; // Terracota (diseño profesional moderno)
const success = "#10B981"; // Verde para estados positivos
const warning = "#F59E0B"; // Ámbar para alertas
const error = "#EF4444"; // Rojo para errores

export const Colors = {
  light: {
    // Fondos
    background: "#FAFAFA",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    
    // Texto
    text: "#1A1A2E",
    textSecondary: "#6B7280",
    textDisabled: "#9CA3AF",
    
    // Colores de acento
    tint: primaryDark,
    accent: accent,
    
    // Iconos
    icon: "#6B7280",
    tabIconDefault: "#9CA3AF",
    tabIconSelected: primaryDark,
    
    // Estados
    success: success,
    warning: warning,
    error: error,
    
    // Bordes y separadores
    border: "#E5E7EB",
    separator: "#F3F4F6",
    
    // Cards
    cardBackground: "#FFFFFF",
    cardBorder: "#E5E7EB",
  },
  dark: {
    // Fondos
    background: "#0F0F1A",
    surface: "#1A1A2E",
    surfaceElevated: "#252542",
    
    // Texto
    text: "#ECEDEE",
    textSecondary: "#9BA1A6",
    textDisabled: "#6B7280",
    
    // Colores de acento
    tint: "#FFFFFF",
    accent: accent,
    
    // Iconos
    icon: "#9BA1A6",
    tabIconDefault: "#6B7280",
    tabIconSelected: "#FFFFFF",
    
    // Estados
    success: success,
    warning: warning,
    error: error,
    
    // Bordes y separadores
    border: "#374151",
    separator: "#1F2937",
    
    // Cards
    cardBackground: "#1A1A2E",
    cardBorder: "#374151",
  },
};

// Espaciado basado en grid de 8pt
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Radio de bordes
export const BorderRadius = {
  sm: 4,
  md: 4,
  lg: 4,
  xl: 4,
  full: 9999,
};

// Tamaños de fuente
export const FontSizes = {
  caption: 12,
  bodySmall: 14,
  body: 16,
  subtitle: 18,
  title: 24,
  titleLarge: 32,
};

// Line heights
export const LineHeights = {
  caption: 16,
  bodySmall: 20,
  body: 24,
  subtitle: 26,
  title: 32,
  titleLarge: 40,
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Sombras elegantes
export const Shadows = {
  // Sombra sutil para inputs y elementos pequeños
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  // Sombra media para cards y botones
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  // Sombra profunda para modales y elementos flotantes
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  // Sombra extra profunda para elementos destacados
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};
