/**
 * Inventory Router
 * Gestión de inventario con integración de servicios, lotes y alertas de stock
 * Soporte completo para organizaciones con sharing configurable
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc.js";
import * as db from "../db.js";
import { inventory } from "../../drizzle/schema.js";
import { eq, and, or, ilike, asc, desc, count, sql } from "drizzle-orm";
import { 
  filterByPartnerAndOrganization,
  filterByPartner,
  addOrganizationToInsert,
  validateWritePermission
} from "../utils/multi-tenant.js";
import { withOrganizationContext } from "../middleware/organization-context.js";

// ============================================================================
// ESQUEMAS DE VALIDACIÓN
// ============================================================================

/**
 * Categorías de inventario
 */
const inventoryCategorySchema = z.enum([
  "strings",        // Cuerdas
  "hammers",        // Martillos
  "dampers",        // Apagadores
  "keys",           // Teclas
  "action_parts",   // Piezas del mecanismo
  "pedals",         // Pedales
  "tuning_pins",    // Clavijas
  "felts",          // Fieltros
  "tools",          // Herramientas
  "chemicals",      // Productos químicos
  "wood",           // Madera
  "hardware",       // Tornillería
  "electronics",    // Electrónica (para pianos digitales)
  "consumables",    // Consumibles
  "other",          // Otros
]);

/**
 * Unidades de medida
 */
const unitSchema = z.enum([
  "units",    // Unidades
  "meters",   // Metros
  "kg",       // Kilogramos
  "grams",    // Gramos
  "liters",   // Litros
  "ml",       // Mililitros
  "sets",     // Juegos/Sets
  "pairs",    // Pares
  "boxes",    // Cajas
  "rolls",    // Rollos
]);

/**
 * Esquema de movimiento de stock
 */
const stockMovementSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["in", "out", "adjustment", "return", "transfer"]),
  quantity: z.number(),
  reason: z.string().max(500).optional(),
  serviceId: z.number().optional(), // Referencia al servicio si aplica
  supplierId: z.string().optional(),
  lotNumber: z.string().optional(),
  date: z.string().or(z.date()).default(() => new Date().toISOString()),
  cost: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * Esquema de lote
 */
const lotSchema = z.object({
  id: z.string(),
  lotNumber: z.string().min(1).max(100),
  quantity: z.number().min(0),
  purchaseDate: z.string().or(z.date()),
  expirationDate: z.string().or(z.date()).optional(),
  costPerUnit: z.number().min(0),
  supplier: z.string().max(255).optional(),
  invoiceNumber: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Esquema de proveedor
 */
const supplierSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  contactName: z.string().max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  website: z.string().url().optional(),
  notes: z.string().max(1000).optional(),
  isPreferred: z.boolean().default(false),
});

/**
 * Esquema de paginación
 */
const paginationSchema = z.object({
  limit: z.number().int().min(1).max(10000).default(30),
  cursor: z.number().optional(),
  sortBy: z.enum(["name", "category", "quantity", "minStock", "costPerUnit", "updatedAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  search: z.string().optional(),
  category: inventoryCategorySchema.optional(),
  lowStock: z.boolean().optional(),
  outOfStock: z.boolean().optional(),
});

/**
 * Esquema base de item de inventario
 */
const inventoryItemBaseSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(255),
  sku: z.string().max(50).optional(), // Código de referencia
  barcode: z.string().max(100).optional(), // Código de barras
  category: inventoryCategorySchema,
  description: z.string().max(1000).optional().nullable(),
  quantity: z.number().min(0).default(0),
  unit: unitSchema.default("units"),
  minStock: z.number().min(0).default(0), // Stock mínimo para alertas
  maxStock: z.number().min(0).optional(), // Stock máximo recomendado
  reorderPoint: z.number().min(0).optional(), // Punto de reorden
  reorderQuantity: z.number().min(0).optional(), // Cantidad a pedir
  costPerUnit: z.number().min(0).default(0),
  sellingPrice: z.number().min(0).optional(), // Precio de venta
  supplier: z.string().max(255).optional().nullable(),
  supplierPartNumber: z.string().max(100).optional(), // Referencia del proveedor
  location: z.string().max(255).optional(), // Ubicación en almacén
  photo: z.string().url().optional(),
  notes: z.string().max(2000).optional().nullable(),
  // Campos para trazabilidad
  trackLots: z.boolean().default(false), // Seguimiento por lotes
  trackExpiration: z.boolean().default(false), // Seguimiento de caducidad
  lots: z.array(lotSchema).optional(),
  // Historial de movimientos
  movements: z.array(stockMovementSchema).optional(),
  // Compatibilidad con pianos
  compatibleBrands: z.array(z.string()).optional(),
  compatibleModels: z.array(z.string()).optional(),
});

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Calcula el valor total del inventario
 */
function calculateInventoryValue(items: Array<{ quantity: string | number; costPerUnit: string | number | null }>): number {
  return items.reduce((total, item) => {
    const qty = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
    const cost = item.costPerUnit ? (typeof item.costPerUnit === 'string' ? parseFloat(item.costPerUnit) : item.costPerUnit) : 0;
    return total + (qty * cost);
  }, 0);
}

/**
 * Genera número de lote automático
 */
function generateLotNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LOT-${year}${month}${day}-${random}`;
}

// ============================================================================
// PROCEDURE CON CONTEXTO DE ORGANIZACIÓN
// ============================================================================

const orgProcedure = protectedProcedure.use(withOrganizationContext);

// ============================================================================
// ROUTER
// ============================================================================

export const inventoryRouter = router({
  /**
   * Lista de inventario con paginación y filtros
   */
  list: protectedProcedure
    .input(paginationSchema.optional())
    .query(async ({ ctx, input }) => {
      const { 
        limit = 30, 
        cursor, 
        sortBy = "name", 
        sortOrder = "asc", 
        search, 
        category, 
        lowStock, 
        outOfStock 
      } = input || {};
      
      const database = await db.getDb();
      if (!database) return { items: [], total: 0, stats: null };

      // Construir condiciones WHERE con filtrado por organización
      const whereClauses = [
        filterByPartner(inventory.partnerId, ctx.partnerId),
      ];
      
      if (search) {
        whereClauses.push(
          or(
            ilike(inventory.name, `%${search}%`),
            ilike(inventory.description, `%${search}%`),
            ilike(inventory.supplier, `%${search}%`)
          )!
        );
      }
      
      if (category) {
        whereClauses.push(eq(inventory.category, category));
      }
      
      // Los filtros de lowStock y outOfStock se aplicarán después de la query
      // porque requieren comparaciones con valores calculados

      // Construir ORDER BY
      const sortColumn = inventory[sortBy as keyof typeof inventory] || inventory.name;
      const orderByClause = sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

      // Consulta principal con paginación
      const offset = cursor || 0;
      let items = await database
        .select()
        .from(inventory)
        .where(and(...whereClauses))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Aplicar filtros de stock después de la query
      if (lowStock) {
        items = items.filter(item => {
          const qty = parseFloat(item.quantity);
          const min = parseFloat(item.minStock);
          return qty > 0 && qty <= min;
        });
      }
      
      if (outOfStock) {
        items = items.filter(item => parseFloat(item.quantity) === 0);
      }

      // Contar total
      const [{ total }] = await database
        .select({ total: count() })
        .from(inventory)
        .where(and(...whereClauses));

      // Calcular estadísticas con agregaciones SQL (optimizado)
      const [statsResult] = await database
        .select({
          totalItems: count(),
          totalValue: sql<number>`COALESCE(SUM(CAST(${inventory.quantity} AS DECIMAL(10,2)) * CAST(${inventory.costPerUnit} AS DECIMAL(10,2))), 0)`,
          lowStockCount: sql<number>`SUM(CASE WHEN CAST(${inventory.quantity} AS DECIMAL(10,2)) > 0 AND CAST(${inventory.quantity} AS DECIMAL(10,2)) <= CAST(${inventory.minStock} AS DECIMAL(10,2)) THEN 1 ELSE 0 END)`,
          outOfStockCount: sql<number>`SUM(CASE WHEN CAST(${inventory.quantity} AS DECIMAL(10,2)) = 0 THEN 1 ELSE 0 END)`,
        })
        .from(inventory)
        .where(filterByPartner(inventory.partnerId, ctx.partnerId));

      const stats = {
        totalItems: Number(statsResult.totalItems),
        totalValue: Number(statsResult.totalValue),
        lowStockCount: Number(statsResult.lowStockCount),
        outOfStockCount: Number(statsResult.outOfStockCount),
      };

      let nextCursor: number | undefined = undefined;
      if (items.length === limit) {
        nextCursor = offset + limit;
      }

      return { items, nextCursor, total, stats };
    }),
  
  /**
   * Lista completa sin paginación (para selects)
   */
  listAll: orgProcedure.query(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) return [];
    
    return database
      .select()
      .from(inventory)
      .where(
        filterByPartner(inventory.partnerId, ctx.partnerId),
      )
      .orderBy(asc(inventory.name));
  }),
  
  /**
   * Obtener item por ID
   */
  get: orgProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      const [item] = await database
        .select()
        .from(inventory)
        .where(
          and(
            filterByPartner(inventory.partnerId, ctx.partnerId),
            eq(inventory.id, input.id
          )
          )
        );

      if (!item) throw new Error("Item de inventario no encontrado");
      return item;
    }),
  
  /**
   * Crear nuevo item de inventario
   */
  create: orgProcedure
    .input(inventoryItemBaseSchema)
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Preparar datos con partnerId, odId y organizationId
      const itemData = addOrganizationToInsert(
        {
          name: input.name,
          category: input.category,
          description: input.description,
          quantity: input.quantity.toString(),
          unit: input.unit,
          minStock: input.minStock.toString(),
          costPerUnit: input.costPerUnit.toString(),
          supplier: input.supplier,
        },
        ctx.orgContext,
        "inventory"
      );
      
      const result = await database.insert(inventory).values(itemData);
      return result[0].insertId;
    }),
  
  /**
   * Actualizar item de inventario
   */
  update: orgProcedure
    .input(z.object({
      id: z.number(),
    }).merge(inventoryItemBaseSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Obtener el item para verificar permisos
      const [existingItem] = await database
        .select()
        .from(inventory)
        .where(
          and(
            filterByPartner(inventory.partnerId, ctx.partnerId),
            eq(inventory.id, input.id
          )
          )
        );

      if (!existingItem) {
        throw new Error("Item de inventario no encontrado");
      }

      // Validar permisos de escritura
      validateWritePermission(ctx.orgContext, "inventory", existingItem.odId);

      const { id, ...data } = input;
      
      // Preparar datos para actualización
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.quantity !== undefined) updateData.quantity = data.quantity.toString();
      if (data.unit !== undefined) updateData.unit = data.unit;
      if (data.minStock !== undefined) updateData.minStock = data.minStock.toString();
      if (data.costPerUnit !== undefined) updateData.costPerUnit = data.costPerUnit.toString();
      if (data.supplier !== undefined) updateData.supplier = data.supplier;

      await database
        .update(inventory)
        .set(updateData)
        .where(eq(inventory.id, id));
      
      return { success: true };
    }),
  
  /**
   * Eliminar item de inventario
   */
  delete: orgProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Obtener el item para verificar permisos
      const [existingItem] = await database
        .select()
        .from(inventory)
        .where(
          and(
            filterByPartner(inventory.partnerId, ctx.partnerId),
            eq(inventory.id, input.id
          )
          )
        );

      if (!existingItem) {
        throw new Error("Item de inventario no encontrado");
      }

      // Validar permisos de escritura
      validateWritePermission(ctx.orgContext, "inventory", existingItem.odId);

      await database.delete(inventory).where(eq(inventory.id, input.id));
      
      return { success: true };
    }),
  
  /**
   * Obtener items con stock bajo
   */
  getLowStock: orgProcedure.query(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) return [];

    const items = await database
      .select()
      .from(inventory)
      .where(
        filterByPartner(inventory.partnerId, ctx.partnerId),
      );

    return items.filter(item => {
      const qty = parseFloat(item.quantity);
      const min = parseFloat(item.minStock);
      return qty > 0 && qty <= min;
    });
  }),
  
  /**
   * Obtener items sin stock
   */
  getOutOfStock: orgProcedure.query(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) return [];

    const items = await database
      .select()
      .from(inventory)
      .where(
        filterByPartner(inventory.partnerId, ctx.partnerId),
      );

    return items.filter(item => parseFloat(item.quantity) === 0);
  }),
  
  /**
   * Obtener estadísticas de inventario
   */
  getStats: orgProcedure.query(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) return null;

    const items = await database
      .select()
      .from(inventory)
      .where(
        filterByPartner(inventory.partnerId, ctx.partnerId),
      );

    const totalValue = calculateInventoryValue(items);
    const lowStockCount = items.filter(item => {
      const qty = parseFloat(item.quantity);
      const min = parseFloat(item.minStock);
      return qty > 0 && qty <= min;
    }).length;
    const outOfStockCount = items.filter(item => parseFloat(item.quantity) === 0).length;

    // Estadísticas por categoría
    const byCategory: Record<string, number> = {};
    items.forEach(item => {
      byCategory[item.category] = (byCategory[item.category] || 0) + 1;
    });

    return {
      totalItems: items.length,
      totalValue,
      lowStockCount,
      outOfStockCount,
      byCategory,
    };
  }),
});
