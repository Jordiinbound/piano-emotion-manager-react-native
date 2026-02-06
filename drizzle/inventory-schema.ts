/**
 * Esquema de Base de Datos para Gestión de Inventario
 * Piano Emotion Manager
 * 
 * Este módulo define las tablas necesarias para gestionar:
 * - Catálogo de productos (piezas de repuesto, herramientas, consumibles)
 * - Multi-almacén (almacén central, vehículos de técnicos)
 * - Movimientos de stock (entradas, salidas, transferencias)
 * - Proveedores y órdenes de compra
 * - Alertas de stock bajo
 * - Valoración de inventario (FIFO/Precio medio)
 */

import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
  json,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// Enums
// ============================================================================

/** Tipo de producto */
export const productTypeEnum = pgEnum('product_type', [
  'spare_part',      // Pieza de repuesto (cuerdas, martillos, fieltros)
  'tool',            // Herramienta (llaves, destornilladores)
  'consumable',      // Consumible (lubricantes, limpiadores)
  'accessory',       // Accesorio (banquetas, fundas, metrónomos)
  'other',           // Otros
]);

/** Categoría de producto para pianos */
export const productCategoryEnum = pgEnum('product_category', [
  // Cuerdas y relacionados
  'strings',              // Cuerdas
  'tuning_pins',          // Clavijas de afinación
  'pin_blocks',           // Clavijeros
  
  // Mecanismo (acción)
  'hammers',              // Martillos
  'dampers',              // Apagadores
  'keys',                 // Teclas
  'action_parts',         // Piezas de mecanismo
  'springs',              // Muelles y resortes
  
  // Fieltros y telas
  'felts',                // Fieltros
  'cloths',               // Telas y paños
  'leather',              // Cueros
  
  // Estructura
  'soundboard',           // Tabla armónica
  'bridges',              // Puentes
  'pedals',               // Pedales
  'cabinet_parts',        // Piezas de mueble
  
  // Herramientas
  'tuning_tools',         // Herramientas de afinación
  'regulation_tools',     // Herramientas de regulación
  'voicing_tools',        // Herramientas de entonación
  'general_tools',        // Herramientas generales
  
  // Consumibles
  'lubricants',           // Lubricantes
  'cleaners',             // Limpiadores
  'adhesives',            // Adhesivos y colas
  'polishes',             // Pulimentos
  
  // Otros
  'accessories',          // Accesorios
  'other',                // Otros
]);

/** Tipo de almacén */
export const warehouseTypeEnum = pgEnum('warehouse_type', [
  'central',         // Almacén central de la empresa
  'vehicle',         // Stock en vehículo de técnico
  'workshop',        // Taller
  'consignment',     // En consignación (cliente)
]);

/** Tipo de movimiento de stock */
export const stockMovementTypeEnum = pgEnum('stock_movement_type', [
  'purchase',        // Compra a proveedor
  'sale',            // Venta/uso en servicio
  'transfer_in',     // Transferencia entrante
  'transfer_out',    // Transferencia saliente
  'adjustment_in',   // Ajuste positivo (inventario)
  'adjustment_out',  // Ajuste negativo (inventario)
  'return_supplier', // Devolución a proveedor
  'return_customer', // Devolución de cliente
  'damaged',         // Producto dañado
  'expired',         // Producto caducado
]);

/** Estado de orden de compra */
export const purchaseOrderStatusEnum = pgEnum('purchase_order_status', [
  'draft',           // Borrador
  'pending',         // Pendiente de aprobación
  'approved',        // Aprobada
  'ordered',         // Pedido realizado
  'partial',         // Parcialmente recibido
  'received',        // Recibido completo
  'cancelled',       // Cancelada
]);

/** Método de valoración de inventario */
export const valuationMethodEnum = pgEnum('valuation_method', [
  'fifo',            // First In, First Out
  'lifo',            // Last In, First Out
  'average',         // Precio medio ponderado
  'specific',        // Identificación específica
]);

// ============================================================================
// Tablas Principales
// ============================================================================

/**
 * Tabla de Productos
 * Catálogo de todos los productos disponibles
 */
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  
  // Identificación
  sku: varchar('sku', { length: 50 }).notNull(),
  barcode: varchar('barcode', { length: 50 }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Clasificación
  type: productTypeEnum('type').notNull().default('spare_part'),
  category: productCategoryEnum('category').notNull().default('other'),
  brand: varchar('brand', { length: 100 }),
  model: varchar('model', { length: 100 }),
  
  // Precios
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }).notNull().default('0'),
  salePrice: decimal('sale_price', { precision: 10, scale: 2 }).notNull().default('0'),
  currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('21'),
  
  // Stock
  minStock: integer('min_stock').notNull().default(0),
  maxStock: integer('max_stock'),
  reorderPoint: integer('reorder_point').notNull().default(5),
  reorderQuantity: integer('reorder_quantity').notNull().default(10),
  
  // Unidades
  unitOfMeasure: varchar('unit_of_measure', { length: 20 }).notNull().default('unit'),
  unitsPerPackage: integer('units_per_package').notNull().default(1),
  
  // Dimensiones y peso (para envíos)
  weight: decimal('weight', { precision: 10, scale: 3 }),  // kg
  length: decimal('length', { precision: 10, scale: 2 }),  // cm
  width: decimal('width', { precision: 10, scale: 2 }),    // cm
  height: decimal('height', { precision: 10, scale: 2 }),  // cm
  
  // Proveedor principal
  primarySupplierId: integer('primary_supplier_id'),
  supplierSku: varchar('supplier_sku', { length: 50 }),
  leadTimeDays: integer('lead_time_days'),
  
  // Imágenes y documentos
  imageUrl: text('image_url'),
  thumbnailUrl: text('thumbnail_url'),
  documentUrls: json('document_urls').$type<string[]>(),
  
  // Compatibilidad con pianos
  compatibleBrands: json('compatible_brands').$type<string[]>(),
  compatibleModels: json('compatible_models').$type<string[]>(),
  
  // Notas y metadatos
  notes: text('notes'),
  tags: json('tags').$type<string[]>(),
  customFields: json('custom_fields').$type<Record<string, unknown>>(),
  
  // Estado
  isActive: boolean('is_active').notNull().default(true),
  isSerialTracked: boolean('is_serial_tracked').notNull().default(false),
  isBatchTracked: boolean('is_batch_tracked').notNull().default(false),
  
  // Multi-tenant
  organizationId: integer('organization_id'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  skuIdx: uniqueIndex('products_sku_idx').on(table.sku, table.organizationId),
  barcodeIdx: index('products_barcode_idx').on(table.barcode),
  categoryIdx: index('products_category_idx').on(table.category),
  nameIdx: index('products_name_idx').on(table.name),
}));

/**
 * Tabla de Almacenes
 * Ubicaciones donde se almacena el stock
 */
export const warehouses = pgTable('warehouses', {
  id: serial('id').primaryKey(),
  
  // Identificación
  code: varchar('code', { length: 20 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  type: warehouseTypeEnum('type').notNull().default('central'),
  
  // Ubicación
  address: text('address'),
  city: varchar('city', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 2 }).notNull().default('ES'),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  
  // Responsable (para vehículos, el técnico asignado)
  responsibleUserId: integer('responsible_user_id'),
  
  // Configuración
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  allowNegativeStock: boolean('allow_negative_stock').notNull().default(false),
  
  // Valoración
  valuationMethod: valuationMethodEnum('valuation_method').notNull().default('average'),
  
  // Multi-tenant
  organizationId: integer('organization_id'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  codeIdx: uniqueIndex('warehouses_code_idx').on(table.code, table.organizationId),
  typeIdx: index('warehouses_type_idx').on(table.type),
}));

/**
 * Tabla de Stock por Almacén
 * Cantidad de cada producto en cada almacén
 */
export const warehouseStock = pgTable('warehouse_stock', {
  id: serial('id').primaryKey(),
  
  // Referencias
  productId: integer('product_id').notNull(),
  warehouseId: integer('warehouse_id').notNull(),
  
  // Cantidades
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull().default('0'),
  reservedQuantity: decimal('reserved_quantity', { precision: 10, scale: 2 }).notNull().default('0'),
  availableQuantity: decimal('available_quantity', { precision: 10, scale: 2 }).notNull().default('0'),
  
  // Valoración
  totalCost: decimal('total_cost', { precision: 12, scale: 2 }).notNull().default('0'),
  averageCost: decimal('average_cost', { precision: 10, scale: 2 }).notNull().default('0'),
  
  // Ubicación dentro del almacén
  location: varchar('location', { length: 50 }),  // Ej: "A-1-3" (Pasillo A, Estante 1, Nivel 3)
  
  // Última actividad
  lastMovementAt: timestamp('last_movement_at'),
  lastCountAt: timestamp('last_count_at'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  productWarehouseIdx: uniqueIndex('warehouse_stock_product_warehouse_idx').on(table.productId, table.warehouseId),
  quantityIdx: index('warehouse_stock_quantity_idx').on(table.quantity),
}));

/**
 * Tabla de Movimientos de Stock
 * Historial de todas las entradas y salidas
 */
export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  
  // Referencias
  productId: integer('product_id').notNull(),
  warehouseId: integer('warehouse_id').notNull(),
  
  // Tipo y cantidad
  type: stockMovementTypeEnum('type').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  
  // Costes
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }),
  totalCost: decimal('total_cost', { precision: 12, scale: 2 }),
  
  // Stock resultante
  stockBefore: decimal('stock_before', { precision: 10, scale: 2 }).notNull(),
  stockAfter: decimal('stock_after', { precision: 10, scale: 2 }).notNull(),
  
  // Referencias externas
  referenceType: varchar('reference_type', { length: 50 }),  // 'service', 'purchase_order', 'transfer', etc.
  referenceId: integer('reference_id'),
  
  // Para transferencias
  relatedWarehouseId: integer('related_warehouse_id'),
  relatedMovementId: integer('related_movement_id'),
  
  // Lote y serie (si aplica)
  batchNumber: varchar('batch_number', { length: 50 }),
  serialNumber: varchar('serial_number', { length: 100 }),
  expirationDate: timestamp('expiration_date'),
  
  // Notas
  notes: text('notes'),
  
  // Usuario que realizó el movimiento
  userId: integer('user_id'),
  
  // Multi-tenant
  organizationId: integer('organization_id'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  productIdx: index('stock_movements_product_idx').on(table.productId),
  warehouseIdx: index('stock_movements_warehouse_idx').on(table.warehouseId),
  typeIdx: index('stock_movements_type_idx').on(table.type),
  dateIdx: index('stock_movements_date_idx').on(table.createdAt),
  referenceIdx: index('stock_movements_reference_idx').on(table.referenceType, table.referenceId),
}));

/**
 * Tabla de Proveedores
 */
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  
  // Identificación
  code: varchar('code', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  tradeName: varchar('trade_name', { length: 255 }),
  taxId: varchar('tax_id', { length: 50 }),
  
  // Contacto
  contactName: varchar('contact_name', { length: 100 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  website: varchar('website', { length: 255 }),
  
  // Dirección
  address: text('address'),
  city: varchar('city', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 2 }).notNull().default('ES'),
  
  // Condiciones comerciales
  paymentTermsDays: integer('payment_terms_days').notNull().default(30),
  currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
  discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }),
  minOrderAmount: decimal('min_order_amount', { precision: 10, scale: 2 }),
  freeShippingAmount: decimal('free_shipping_amount', { precision: 10, scale: 2 }),
  
  // Datos bancarios
  bankName: varchar('bank_name', { length: 100 }),
  bankAccount: varchar('bank_account', { length: 50 }),
  bankIban: varchar('bank_iban', { length: 50 }),
  bankSwift: varchar('bank_swift', { length: 20 }),
  
  // Categorías de productos que suministra
  productCategories: json('product_categories').$type<string[]>(),
  
  // Notas
  notes: text('notes'),
  
  // Estado
  isActive: boolean('is_active').notNull().default(true),
  rating: integer('rating'),  // 1-5 estrellas
  
  // Multi-tenant
  organizationId: integer('organization_id'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  codeIdx: uniqueIndex('suppliers_code_idx').on(table.code, table.organizationId),
  nameIdx: index('suppliers_name_idx').on(table.name),
}));

/**
 * Tabla de Productos por Proveedor
 * Relación muchos a muchos con precios específicos
 */
export const supplierProducts = pgTable('supplier_products', {
  id: serial('id').primaryKey(),
  
  // Referencias
  supplierId: integer('supplier_id').notNull(),
  productId: integer('product_id').notNull(),
  
  // Datos del proveedor
  supplierSku: varchar('supplier_sku', { length: 50 }),
  supplierProductName: varchar('supplier_product_name', { length: 255 }),
  
  // Precios
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
  
  // Cantidades
  minOrderQuantity: integer('min_order_quantity').notNull().default(1),
  packSize: integer('pack_size').notNull().default(1),
  
  // Tiempos
  leadTimeDays: integer('lead_time_days'),
  
  // Estado
  isPreferred: boolean('is_preferred').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  supplierProductIdx: uniqueIndex('supplier_products_idx').on(table.supplierId, table.productId),
}));

/**
 * Tabla de Órdenes de Compra
 */
export const purchaseOrders = pgTable('purchase_orders', {
  id: serial('id').primaryKey(),
  
  // Identificación
  orderNumber: varchar('order_number', { length: 50 }).notNull(),
  
  // Proveedor
  supplierId: integer('supplier_id').notNull(),
  
  // Estado
  status: purchaseOrderStatusEnum('status').notNull().default('draft'),
  
  // Fechas
  orderDate: timestamp('order_date'),
  expectedDeliveryDate: timestamp('expected_delivery_date'),
  actualDeliveryDate: timestamp('actual_delivery_date'),
  
  // Almacén destino
  warehouseId: integer('warehouse_id').notNull(),
  
  // Totales
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  shippingCost: decimal('shipping_cost', { precision: 10, scale: 2 }).notNull().default('0'),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
  
  // Notas
  notes: text('notes'),
  internalNotes: text('internal_notes'),
  
  // Usuario
  createdByUserId: integer('created_by_user_id'),
  approvedByUserId: integer('approved_by_user_id'),
  
  // Multi-tenant
  organizationId: integer('organization_id'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orderNumberIdx: uniqueIndex('purchase_orders_number_idx').on(table.orderNumber, table.organizationId),
  supplierIdx: index('purchase_orders_supplier_idx').on(table.supplierId),
  statusIdx: index('purchase_orders_status_idx').on(table.status),
}));

/**
 * Tabla de Líneas de Orden de Compra
 */
export const purchaseOrderLines = pgTable('purchase_order_lines', {
  id: serial('id').primaryKey(),
  
  // Referencias
  purchaseOrderId: integer('purchase_order_id').notNull(),
  productId: integer('product_id').notNull(),
  
  // Cantidades
  orderedQuantity: decimal('ordered_quantity', { precision: 10, scale: 2 }).notNull(),
  receivedQuantity: decimal('received_quantity', { precision: 10, scale: 2 }).notNull().default('0'),
  
  // Precios
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('21'),
  discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }).notNull().default('0'),
  lineTotal: decimal('line_total', { precision: 12, scale: 2 }).notNull(),
  
  // Notas
  notes: text('notes'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orderIdx: index('purchase_order_lines_order_idx').on(table.purchaseOrderId),
}));

/**
 * Tabla de Alertas de Stock
 */
export const stockAlerts = pgTable('stock_alerts', {
  id: serial('id').primaryKey(),
  
  // Referencias
  productId: integer('product_id').notNull(),
  warehouseId: integer('warehouse_id'),
  
  // Tipo de alerta
  alertType: varchar('alert_type', { length: 50 }).notNull(),  // 'low_stock', 'out_of_stock', 'expiring', 'overstock'
  
  // Detalles
  currentQuantity: decimal('current_quantity', { precision: 10, scale: 2 }).notNull(),
  thresholdQuantity: decimal('threshold_quantity', { precision: 10, scale: 2 }),
  message: text('message'),
  
  // Estado
  isRead: boolean('is_read').notNull().default(false),
  isResolved: boolean('is_resolved').notNull().default(false),
  resolvedAt: timestamp('resolved_at'),
  resolvedByUserId: integer('resolved_by_user_id'),
  
  // Multi-tenant
  organizationId: integer('organization_id'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  productIdx: index('stock_alerts_product_idx').on(table.productId),
  typeIdx: index('stock_alerts_type_idx').on(table.alertType),
  unresolvedIdx: index('stock_alerts_unresolved_idx').on(table.isResolved),
}));

/**
 * Tabla de Inventarios Físicos
 * Para conteos de inventario
 */
export const inventoryCounts = pgTable('inventory_counts', {
  id: serial('id').primaryKey(),
  
  // Identificación
  countNumber: varchar('count_number', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }),
  
  // Alcance
  warehouseId: integer('warehouse_id').notNull(),
  countType: varchar('count_type', { length: 20 }).notNull().default('full'),  // 'full', 'partial', 'cycle'
  
  // Estado
  status: varchar('status', { length: 20 }).notNull().default('draft'),  // 'draft', 'in_progress', 'completed', 'cancelled'
  
  // Fechas
  plannedDate: timestamp('planned_date'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  
  // Resumen
  totalProducts: integer('total_products').notNull().default(0),
  countedProducts: integer('counted_products').notNull().default(0),
  discrepancyCount: integer('discrepancy_count').notNull().default(0),
  totalDiscrepancyValue: decimal('total_discrepancy_value', { precision: 12, scale: 2 }),
  
  // Notas
  notes: text('notes'),
  
  // Usuario
  createdByUserId: integer('created_by_user_id'),
  
  // Multi-tenant
  organizationId: integer('organization_id'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  countNumberIdx: uniqueIndex('inventory_counts_number_idx').on(table.countNumber, table.organizationId),
  warehouseIdx: index('inventory_counts_warehouse_idx').on(table.warehouseId),
}));

/**
 * Tabla de Líneas de Inventario Físico
 */
export const inventoryCountLines = pgTable('inventory_count_lines', {
  id: serial('id').primaryKey(),
  
  // Referencias
  inventoryCountId: integer('inventory_count_id').notNull(),
  productId: integer('product_id').notNull(),
  
  // Cantidades
  systemQuantity: decimal('system_quantity', { precision: 10, scale: 2 }).notNull(),
  countedQuantity: decimal('counted_quantity', { precision: 10, scale: 2 }),
  discrepancy: decimal('discrepancy', { precision: 10, scale: 2 }),
  
  // Valoración de discrepancia
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }),
  discrepancyValue: decimal('discrepancy_value', { precision: 12, scale: 2 }),
  
  // Estado
  isCounted: boolean('is_counted').notNull().default(false),
  isAdjusted: boolean('is_adjusted').notNull().default(false),
  
  // Notas
  notes: text('notes'),
  
  // Usuario que contó
  countedByUserId: integer('counted_by_user_id'),
  countedAt: timestamp('counted_at'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  countIdx: index('inventory_count_lines_count_idx').on(table.inventoryCountId),
  productIdx: index('inventory_count_lines_product_idx').on(table.productId),
}));

/**
 * Tabla de Uso de Productos en Servicios
 * Vincula productos usados con servicios realizados
 */
export const serviceProductUsage = pgTable('service_product_usage', {
  id: serial('id').primaryKey(),
  
  // Referencias
  serviceId: integer('service_id').notNull(),  // Referencia a la tabla de servicios
  productId: integer('product_id').notNull(),
  warehouseId: integer('warehouse_id').notNull(),
  stockMovementId: integer('stock_movement_id'),
  
  // Cantidades y precios
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }).notNull().default('0'),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull(),
  lineTotal: decimal('line_total', { precision: 12, scale: 2 }).notNull(),
  
  // Facturación
  isInvoiced: boolean('is_invoiced').notNull().default(false),
  invoiceId: integer('invoice_id'),
  invoiceLineId: integer('invoice_line_id'),
  
  // Notas
  notes: text('notes'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  serviceIdx: index('service_product_usage_service_idx').on(table.serviceId),
  productIdx: index('service_product_usage_product_idx').on(table.productId),
}));

// ============================================================================
// Relaciones
// ============================================================================

export const productsRelations = relations(products, ({ one, many }) => ({
  primarySupplier: one(suppliers, {
    fields: [products.primarySupplierId],
    references: [suppliers.id],
  }),
  warehouseStock: many(warehouseStock),
  stockMovements: many(stockMovements),
  supplierProducts: many(supplierProducts),
  stockAlerts: many(stockAlerts),
  serviceUsage: many(serviceProductUsage),
}));

export const warehousesRelations = relations(warehouses, ({ many }) => ({
  stock: many(warehouseStock),
  movements: many(stockMovements),
  purchaseOrders: many(purchaseOrders),
  inventoryCounts: many(inventoryCounts),
}));

export const warehouseStockRelations = relations(warehouseStock, ({ one }) => ({
  product: one(products, {
    fields: [warehouseStock.productId],
    references: [products.id],
  }),
  warehouse: one(warehouses, {
    fields: [warehouseStock.warehouseId],
    references: [warehouses.id],
  }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
  warehouse: one(warehouses, {
    fields: [stockMovements.warehouseId],
    references: [warehouses.id],
  }),
  relatedWarehouse: one(warehouses, {
    fields: [stockMovements.relatedWarehouseId],
    references: [warehouses.id],
  }),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(supplierProducts),
  purchaseOrders: many(purchaseOrders),
}));

export const supplierProductsRelations = relations(supplierProducts, ({ one }) => ({
  supplier: one(suppliers, {
    fields: [supplierProducts.supplierId],
    references: [suppliers.id],
  }),
  product: one(products, {
    fields: [supplierProducts.productId],
    references: [products.id],
  }),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [purchaseOrders.supplierId],
    references: [suppliers.id],
  }),
  warehouse: one(warehouses, {
    fields: [purchaseOrders.warehouseId],
    references: [warehouses.id],
  }),
  lines: many(purchaseOrderLines),
}));

export const purchaseOrderLinesRelations = relations(purchaseOrderLines, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderLines.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  product: one(products, {
    fields: [purchaseOrderLines.productId],
    references: [products.id],
  }),
}));

export const stockAlertsRelations = relations(stockAlerts, ({ one }) => ({
  product: one(products, {
    fields: [stockAlerts.productId],
    references: [products.id],
  }),
  warehouse: one(warehouses, {
    fields: [stockAlerts.warehouseId],
    references: [warehouses.id],
  }),
}));

export const inventoryCountsRelations = relations(inventoryCounts, ({ one, many }) => ({
  warehouse: one(warehouses, {
    fields: [inventoryCounts.warehouseId],
    references: [warehouses.id],
  }),
  lines: many(inventoryCountLines),
}));

export const inventoryCountLinesRelations = relations(inventoryCountLines, ({ one }) => ({
  inventoryCount: one(inventoryCounts, {
    fields: [inventoryCountLines.inventoryCountId],
    references: [inventoryCounts.id],
  }),
  product: one(products, {
    fields: [inventoryCountLines.productId],
    references: [products.id],
  }),
}));

export const serviceProductUsageRelations = relations(serviceProductUsage, ({ one }) => ({
  product: one(products, {
    fields: [serviceProductUsage.productId],
    references: [products.id],
  }),
  warehouse: one(warehouses, {
    fields: [serviceProductUsage.warehouseId],
    references: [warehouses.id],
  }),
  stockMovement: one(stockMovements, {
    fields: [serviceProductUsage.stockMovementId],
    references: [stockMovements.id],
  }),
}));

// ============================================================================
// Tabla de Categorías Configurables
// ============================================================================

/**
 * Tabla de Categorías de Inventario Configurables
 * Permite a los usuarios definir sus propias categorías personalizadas
 */
export const inventoryCategories = pgTable('inventory_categories', {
  id: serial('id').primaryKey(),
  
  // Identificación
  key: varchar('key', { length: 50 }).notNull().unique(), // e.g., 'strings', 'hammers'
  label: varchar('label', { length: 100 }).notNull(), // e.g., 'Cuerdas', 'Macillos'
  icon: varchar('icon', { length: 50 }).notNull().default('doc.text.fill'), // SF Symbol name
  
  // Orden de visualización
  displayOrder: integer('display_order').notNull().default(0),
  
  // Estado
  isActive: boolean('is_active').notNull().default(true),
  isSystem: boolean('is_system').notNull().default(false), // true para categorías predefinidas
  
  // Multi-tenant
  organizationId: integer('organization_id'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  keyIdx: uniqueIndex('inventory_categories_key_idx').on(table.key, table.organizationId),
  orderIdx: index('inventory_categories_order_idx').on(table.displayOrder),
}));

/**
 * Relaciones de categorías de inventario
 */
export const inventoryCategoriesRelations = relations(inventoryCategories, ({ many }) => ({
  // Aquí se pueden añadir relaciones con productos si es necesario
}));
