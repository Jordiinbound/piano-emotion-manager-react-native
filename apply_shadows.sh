#!/bin/bash

# Script para aplicar sombras elegantes a todos los estilos de la aplicación

# Buscar todos los archivos TypeScript/JavaScript con estilos
find . -type f \( -name "*.tsx" -o -name "*.ts" \) ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" | while read file; do
  # Buscar estilos que tengan borderRadius y backgroundColor pero no shadowColor
  # Aplicar sombras a cards, containers, buttons, etc.
  
  # Para cards y containers (con backgroundColor)
  perl -i -pe '
    # Si encontramos un estilo con backgroundColor y borderRadius pero sin shadowColor
    if (/backgroundColor:/ && !$shadow_added) {
      $in_style = 1;
    }
    if ($in_style && /borderRadius:/ && !/shadowColor/) {
      # Marcar que necesitamos agregar sombra
      $needs_shadow = 1;
    }
    if ($in_style && /},?\s*$/ && $needs_shadow) {
      # Agregar sombras antes del cierre
      s/},?$/,\n    shadowColor: '\''#000'\'',\n    shadowOffset: { width: 0, height: 2 },\n    shadowOpacity: 0.1,\n    shadowRadius: 8,\n    elevation: 4,\n  },/;
      $needs_shadow = 0;
      $in_style = 0;
      $shadow_added = 1;
    }
  ' "$file"
done

echo "Sombras aplicadas a todos los archivos"
