#!/bin/bash

# Script para cambiar todos los borderRadius a 4px en archivos TypeScript/JavaScript

echo "Cambiando todos los borderRadius a 4px..."

# Buscar y reemplazar borderRadius con valores numéricos
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) \
  ! -path "./node_modules/*" \
  ! -path "./.expo/*" \
  ! -path "./dist/*" \
  ! -path "./_archived/*" \
  -exec sed -i 's/borderRadius: [0-9]\+/borderRadius: 4/g' {} \;

echo "✅ Cambio completado. Todos los borderRadius ahora son 4px"
echo "Archivos modificados:"
git diff --name-only | head -20
