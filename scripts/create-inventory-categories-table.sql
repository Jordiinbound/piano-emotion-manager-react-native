-- Script para crear tabla inventory_categories en producción
-- Piano Emotion Manager
-- Ejecutar manualmente en la base de datos de producción

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS inventory_categories (
  id SERIAL PRIMARY KEY,
  key VARCHAR(50) NOT NULL,
  label VARCHAR(100) NOT NULL,
  icon VARCHAR(50) NOT NULL DEFAULT 'doc.text.fill',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  organization_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Crear índices
CREATE UNIQUE INDEX IF NOT EXISTS inventory_categories_key_idx 
  ON inventory_categories(key, organization_id);

CREATE INDEX IF NOT EXISTS inventory_categories_order_idx 
  ON inventory_categories(display_order);

-- Insertar categorías del sistema (solo si no existen)
INSERT INTO inventory_categories (key, label, icon, display_order, is_active, is_system, organization_id)
VALUES
  ('strings', 'Cuerdas', 'music.note', 1, true, true, NULL),
  ('hammers', 'Macillos', 'hammer.fill', 2, true, true, NULL),
  ('felts', 'Fieltros', 'square.fill', 3, true, true, NULL),
  ('pins', 'Clavijas', 'pin.fill', 4, true, true, NULL),
  ('keys', 'Teclas y partes', 'keyboard', 5, true, true, NULL),
  ('pedals', 'Pedales y mecanismo', 'gearshape.fill', 6, true, true, NULL),
  ('hardware', 'Herrajes y tornillería', 'wrench.and.screwdriver.fill', 7, true, true, NULL),
  ('chemicals', 'Productos químicos', 'flask.fill', 8, true, true, NULL),
  ('tools', 'Herramientas', 'wrench.fill', 9, true, true, NULL),
  ('other', 'Otros', 'ellipsis.circle.fill', 10, true, true, NULL)
ON CONFLICT (key, organization_id) DO NOTHING;

-- Verificar que se crearon correctamente
SELECT COUNT(*) as total_categories FROM inventory_categories WHERE is_system = true;
