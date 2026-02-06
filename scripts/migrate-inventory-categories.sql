-- Migración segura: Crear tabla inventory_categories si no existe
-- Piano Emotion Manager

CREATE TABLE IF NOT EXISTS `inventory_categories` (
  `id` int AUTO_INCREMENT NOT NULL,
  `key` varchar(50) NOT NULL,
  `label` varchar(100) NOT NULL,
  `icon` varchar(50) NOT NULL DEFAULT 'doc.text.fill',
  `display_order` int NOT NULL DEFAULT 0,
  `is_active` boolean NOT NULL DEFAULT true,
  `is_system` boolean NOT NULL DEFAULT false,
  `organization_id` int,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `inventory_categories_id` PRIMARY KEY(`id`),
  UNIQUE KEY `inventory_categories_key_idx` (`key`, `organization_id`)
);

CREATE INDEX IF NOT EXISTS `inventory_categories_order_idx` ON `inventory_categories` (`display_order`);

-- Insertar categorías predefinidas del sistema
INSERT INTO `inventory_categories` (`key`, `label`, `icon`, `display_order`, `is_active`, `is_system`, `organization_id`)
VALUES
  ('strings', 'Cuerdas', 'music.note', 1, true, true, NULL),
  ('hammers', 'Macillos', 'wrench.fill', 2, true, true, NULL),
  ('felts', 'Fieltros', 'doc.text.fill', 3, true, true, NULL),
  ('pins', 'Clavijas', 'wrench.fill', 4, true, true, NULL),
  ('keys', 'Teclas y partes', 'pianokeys', 5, true, true, NULL),
  ('pedals', 'Pedales y mecanismo', 'gearshape.fill', 6, true, true, NULL),
  ('hardware', 'Herrajes y tornillería', 'wrench.fill', 7, true, true, NULL),
  ('chemicals', 'Productos químicos', 'doc.text.fill', 8, true, true, NULL),
  ('tools', 'Herramientas', 'wrench.fill', 9, true, true, NULL),
  ('other', 'Otros', 'doc.text.fill', 10, true, true, NULL)
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `icon` = VALUES(`icon`),
  `display_order` = VALUES(`display_order`),
  `updated_at` = CURRENT_TIMESTAMP;
