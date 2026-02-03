/**
 * Invoices Router
 * Gestión de facturas con validación mejorada, paginación
 * y soporte completo para organizaciones con sharing configurable
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc.js";
import * as db from "../db.js";
import { invoices } from "../../drizzle/schema.js";
import { eq, and, or, gte, lte, ilike, asc, desc, count, sql } from "drizzle-orm";
import { 
  filterByPartnerAndOrganization,
  filterByPartner,
  addOrganizationToInsert,
  validateWritePermission
} from "../utils/multi-tenant.js";
import { withOrganizationContext } from "../middleware/organization-context.js";
import { withCache, invalidatePath, invalidateUserCache } from "../lib/cache.middleware.js";

// ============================================================================
// ESQUEMAS DE VALIDACIÓN
// ============================================================================

/**
 * Estados de factura
 */
const invoiceStatusSchema = z.enum(["draft", "sent", "paid", "cancelled", "overdue"]);

/**
 * Esquema de línea de factura
 */
const invoiceItemSchema = z.object({
  description: z.string().min(1, "La descripción es obligatoria").max(500),
  quantity: z.number().positive("La cantidad debe ser mayor que 0"),
  unitPrice: z.number().min(0, "El precio no puede ser negativo"),
  taxRate: z.number().min(0).max(100).default(21), // IVA por defecto 21%
  discount: z.number().min(0).max(100).default(0), // Descuento en porcentaje
  total: z.number().min(0),
});

/**
 * Esquema de información de negocio
 */
const businessInfoSchema = z.object({
  name: z.string().min(1).max(255),
  taxId: z.string().max(50),
  address: z.string().max(500),
  city: z.string().max(100),
  postalCode: z.string().max(20),
  phone: z.string().max(50),
  email: z.string().email(),
  bankAccount: z.string().max(50).optional(),
  logo: z.string().url().optional(),
}).optional();

/**
 * Esquema de paginación para facturas
 */
const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(30),
  cursor: z.number().optional(),
  sortBy: z.enum(["invoiceNumber", "date", "dueDate", "total", "status", "clientName"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: invoiceStatusSchema.optional(),
  clientId: z.number().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
}).passthrough(); // Ignorar parámetros desconocidos (como 'direction' de React Query)

console.log('[invoices.router] Schema actualizado con direction opcional - v2');

/**
 * Esquema base de factura
 */
const invoiceBaseSchema = z.object({
  invoiceNumber: z.string().min(1, "El número de factura es obligatorio").max(50),
  clientId: z.number().int().positive(),
  clientName: z.string().min(1).max(255),
  clientEmail: z.string().email().optional().nullable(),
  clientAddress: z.string().max(500).optional().nullable(),
  clientTaxId: z.string().max(50).optional().nullable(), // NIF/CIF del cliente
  date: z.string().or(z.date()),
  dueDate: z.string().or(z.date()).optional().nullable(),
  status: invoiceStatusSchema.default("draft"),
  items: z.array(invoiceItemSchema).min(1, "Debe haber al menos una línea"),
  subtotal: z.number().min(0),
  taxAmount: z.number().min(0),
  total: z.number().min(0),
  discount: z.number().min(0).default(0), // Descuento global
  discountType: z.enum(["percentage", "fixed"]).default("percentage"),
  notes: z.string().max(2000).optional().nullable(),
  internalNotes: z.string().max(2000).optional().nullable(), // Notas internas (no visibles en factura)
  paymentTerms: z.string().max(500).optional().nullable(),
  paymentMethod: z.enum(["cash", "transfer", "card", "check", "other"]).optional().nullable(),
  businessInfo: businessInfoSchema,
  // Campos para retenciones (IRPF)
  retentionRate: z.number().min(0).max(100).default(0),
  retentionAmount: z.number().min(0).default(0),
  // Referencia a presupuesto si se convirtió
  quoteId: z.number().optional().nullable(),
  // Referencia a servicio si se generó desde un servicio
  serviceId: z.number().optional().nullable(),
});

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Marca facturas como vencidas si la fecha de vencimiento ha pasado
 */
function markOverdueInvoices(invoicesList: any[]): any[] {
  const now = new Date();
  return invoicesList.map(inv => {
    if (inv.status === 'sent' && inv.dueDate && new Date(inv.dueDate) < now) {
      return { ...inv, status: 'overdue' as const };
    }
    return inv;
  });
}

/**
 * Calcula estadísticas de facturas
 */
function calculateInvoiceStats(invoicesList: any[]) {
  const total = invoicesList.length;
  const totalAmount = invoicesList.reduce((sum, inv) => {
    const amount = typeof inv.total === 'string' ? parseFloat(inv.total) : inv.total;
    return sum + (amount || 0);
  }, 0);
  
  const paid = invoicesList.filter(inv => inv.status === 'paid').length;
  const paidAmount = invoicesList
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => {
      const amount = typeof inv.total === 'string' ? parseFloat(inv.total) : inv.total;
      return sum + (amount || 0);
    }, 0);
  
  const pending = invoicesList.filter(inv => inv.status === 'sent' || inv.status === 'overdue').length;
  const pendingAmount = invoicesList
    .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum, inv) => {
      const amount = typeof inv.total === 'string' ? parseFloat(inv.total) : inv.total;
      return sum + (amount || 0);
    }, 0);
  
  const overdue = invoicesList.filter(inv => inv.status === 'overdue').length;
  const overdueAmount = invoicesList
    .filter(inv => inv.status === 'overdue')
    .reduce((sum, inv) => {
      const amount = typeof inv.total === 'string' ? parseFloat(inv.total) : inv.total;
      return sum + (amount || 0);
    }, 0);

  return {
    total,
    totalAmount,
    paid,
    paidAmount,
    pending,
    pendingAmount,
    overdue,
    overdueAmount,
  };
}

// ============================================================================
// PROCEDURE CON CONTEXTO DE ORGANIZACIÓN
// ============================================================================

const orgProcedure = protectedProcedure.use(withOrganizationContext);

// ============================================================================
// ROUTER
// ============================================================================

export const invoicesRouter = router({
  /**
   * Lista de facturas con paginación y filtros
   */
  list: orgProcedure
    .input(paginationSchema.optional())
    .query(async ({ ctx, input }) => {
      // TEMPORAL: Caché desactivado para debug
      console.log('[invoices.list] 🔍 Procedimiento ejecutado');
      console.log('[invoices.list] 📥 Input recibido:', JSON.stringify(input));
      console.log('[invoices.list] 👤 Usuario:', { partnerId: ctx.partnerId, userId: ctx.userId });
      const { 
        limit = 30, 
        cursor, 
        sortBy = "date", 
        sortOrder = "desc", 
        search, 
        status, 
        clientId, 
        dateFrom, 
        dateTo 
      } = input || {};
      
      const database = await db.getDb();
      if (!database) return { items: [], total: 0, stats: null };

      // Construir condiciones WHERE con filtrado por organización
      const whereClauses = [
        filterByPartner(invoices.partnerId, ctx.partnerId)
      ];
      
      if (search) {
        whereClauses.push(
          or(
            ilike(invoices.invoiceNumber, `%${search}%`),
            ilike(invoices.clientName, `%${search}%`)
          )!
        );
      }
      
      if (status) {
        whereClauses.push(eq(invoices.status, status));
      }
      
      if (clientId) {
        whereClauses.push(eq(invoices.clientId, clientId));
      }
      
      if (dateFrom) {
        whereClauses.push(gte(invoices.date, new Date(dateFrom).toISOString()));
      }
      
      if (dateTo) {
        whereClauses.push(lte(invoices.date, new Date(dateTo).toISOString()));
      }

      // Construir ORDER BY
      const sortColumn = invoices[sortBy as keyof typeof invoices] || invoices.date;
      const orderByClause = sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

      // Consulta principal con paginación
      const offset = cursor || 0;
      console.error('[invoices.list] 🔎 Ejecutando query con filtros:', JSON.stringify({ dateFrom, dateTo, status, clientId, search, partnerId: ctx.partnerId, organizationId: ctx.organizationId }));
      console.error('[invoices.list] 📋 Total whereClauses:', whereClauses.length);
      let items = await database
        .select()
        .from(invoices)
        .where(and(...whereClauses))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);
      console.error('[invoices.list] ✅ Query completada. Facturas encontradas:', items.length);
      if (items.length > 0) {
        console.error('[invoices.list] 📄 Primera factura:', JSON.stringify({ id: items[0].id, date: items[0].date, status: items[0].status, invoiceNumber: items[0].invoiceNumber }));
      }

      // Marcar facturas vencidas
      items = markOverdueInvoices(items);

      // Contar total
      const [{ total }] = await database
        .select({ total: count() })
        .from(invoices)
        .where(and(...whereClauses));

      // Calcular estadísticas
      const allInvoices = await database
        .select()
        .from(invoices)
        .where(
          filterByPartner(invoices.partnerId, ctx.partnerId),
        );

      const markedInvoices = markOverdueInvoices(allInvoices);
      const stats = calculateInvoiceStats(markedInvoices);

      let nextCursor: number | undefined = undefined;
      if (items.length === limit) {
        nextCursor = offset + limit;
      }

      console.error('[invoices.list] 📤 Retornando:', JSON.stringify({ itemsCount: items.length, total, nextCursor }));
      return { items, nextCursor, total, stats };
    }),
  
  /**
   * Lista completa sin paginación (para selects)
   */
  listAll: orgProcedure.query(withCache(
    async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) return [];
    
    const items = await database
      .select()
      .from(invoices)
      .where(
        filterByPartner(invoices.partnerId, ctx.partnerId),
      )
      .orderBy(desc(invoices.date));

    return markOverdueInvoices(items);
  },
  { ttl: 300, prefix: 'invoices', includeUser: true, procedurePath: 'invoices.listAll' }
)),
  
  /**
   * Obtener factura por ID
   */
  get: orgProcedure
    .input(z.object({ id: z.number() }))
    .query(withCache(
      async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      const [invoice] = await database
        .select()
        .from(invoices)
        .where(
          and(
            filterByPartner(invoices.partnerId, ctx.partnerId),
            eq(invoices.id, input.id
          )
          )
        );

      if (!invoice) throw new Error("Factura no encontrada");
      
      // Marcar como vencida si corresponde
      const [markedInvoice] = markOverdueInvoices([invoice]);
      return markedInvoice;
    },
    { ttl: 300, prefix: 'invoices', includeUser: true, procedurePath: 'invoices.getById' }
  )),
  
  /**
   * Obtener factura por número
   */
  getByNumber: orgProcedure
    .input(z.object({ invoiceNumber: z.string() }))
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      const [invoice] = await database
        .select()
        .from(invoices)
        .where(
          and(
            filterByPartner(invoices.partnerId, ctx.partnerId),
            eq(invoices.invoiceNumber, input.invoiceNumber
          )
          )
        );

      if (!invoice) return null;
      
      const [markedInvoice] = markOverdueInvoices([invoice]);
      return markedInvoice;
    }),
  
  /**
   * Obtener facturas por cliente
   */
  getByClient: orgProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) return [];

      const items = await database
        .select()
        .from(invoices)
        .where(
          and(
            filterByPartner(invoices.partnerId, ctx.partnerId),
            eq(invoices.clientId, input.clientId
          )
          )
        )
        .orderBy(desc(invoices.date));

      return markOverdueInvoices(items);
    }),
  
  /**
   * Crear nueva factura
   */
  create: orgProcedure
    .input(invoiceBaseSchema)
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Preparar datos con partnerId, odId y organizationId
      const invoiceData = addOrganizationToInsert(
        {
          invoiceNumber: input.invoiceNumber,
          clientId: input.clientId,
          clientName: input.clientName,
          clientEmail: input.clientEmail,
          clientAddress: input.clientAddress,
          date: new Date(input.date).toISOString(),
          dueDate: input.dueDate ? new Date(input.dueDate).toISOString() : null,
          status: input.status as any,
          items: input.items,
          subtotal: input.subtotal.toString(),
          taxAmount: input.taxAmount.toString(),
          total: input.total.toString(),
          notes: input.notes,
          businessInfo: input.businessInfo,
        },
        ctx.orgContext,
        "invoices"
      );
      
      const result = await database.insert(invoices).values(invoiceData);
      
      await invalidateUserCache(ctx.user.id);
      await invalidatePath('invoices');
      
      return result[0].insertId;
    }),
  
  /**
   * Actualizar factura
   */
  update: orgProcedure
    .input(z.object({
      id: z.number(),
    }).merge(invoiceBaseSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Obtener la factura para verificar permisos
      const [existingInvoice] = await database
        .select()
        .from(invoices)
        .where(
          and(
            filterByPartner(invoices.partnerId, ctx.partnerId),
            eq(invoices.id, input.id
          )
          )
        );

      if (!existingInvoice) {
        throw new Error("Factura no encontrada");
      }

      // Validar permisos de escritura
      validateWritePermission(ctx.orgContext, "invoices", existingInvoice.odId);

      const { id, ...data } = input;
      
      // Preparar datos para actualización
      const updateData: any = {};
      if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
      if (data.clientId !== undefined) updateData.clientId = data.clientId;
      if (data.clientName !== undefined) updateData.clientName = data.clientName;
      if (data.clientEmail !== undefined) updateData.clientEmail = data.clientEmail;
      if (data.clientAddress !== undefined) updateData.clientAddress = data.clientAddress;
      if (data.date !== undefined) updateData.date = new Date(data.date).toISOString();
      if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate).toISOString() : null;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.items !== undefined) updateData.items = data.items;
      if (data.subtotal !== undefined) updateData.subtotal = data.subtotal.toString();
      if (data.taxAmount !== undefined) updateData.taxAmount = data.taxAmount.toString();
      if (data.total !== undefined) updateData.total = data.total.toString();
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.businessInfo !== undefined) updateData.businessInfo = data.businessInfo;

      await database
        .update(invoices)
        .set(updateData)
        .where(eq(invoices.id, id));
      
      await invalidateUserCache(ctx.user.id);
      await invalidatePath('invoices');
      
      return { success: true };
    }),
  
  /**
   * Eliminar factura
   */
  delete: orgProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Obtener la factura para verificar permisos
      const [existingInvoice] = await database
        .select()
        .from(invoices)
        .where(
          and(
            filterByPartner(invoices.partnerId, ctx.partnerId),
            eq(invoices.id, input.id
          )
          )
        );

      if (!existingInvoice) {
        throw new Error("Factura no encontrada");
      }

      // Validar permisos de escritura
      validateWritePermission(ctx.orgContext, "invoices", existingInvoice.odId);

      await database.delete(invoices).where(eq(invoices.id, input.id));
      
      await invalidateUserCache(ctx.user.id);
      await invalidatePath('invoices');
      
      return { success: true };
    }),
  
  /**
   * Cambiar estado de factura
   */
  updateStatus: orgProcedure
    .input(z.object({
      id: z.number(),
      status: invoiceStatusSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Obtener la factura para verificar permisos
      const [existingInvoice] = await database
        .select()
        .from(invoices)
        .where(
          and(
            filterByPartner(invoices.partnerId, ctx.partnerId),
            eq(invoices.id, input.id
          )
          )
        );

      if (!existingInvoice) {
        throw new Error("Factura no encontrada");
      }

      // Validar permisos de escritura
      validateWritePermission(ctx.orgContext, "invoices", existingInvoice.odId);

      await database
        .update(invoices)
        .set({ status: input.status as any })
        .where(eq(invoices.id, input.id));
      
      await invalidateUserCache(ctx.user.id);
      await invalidatePath('invoices');
      
      return { success: true };
    }),
  
  /**
   * Obtener estadísticas de facturas
   */
  getStats: orgProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) return null;

      const whereClauses = [
        filterByPartner(invoices.partnerId, ctx.partnerId),
      ];

      if (input?.dateFrom) {
        whereClauses.push(gte(invoices.date, new Date(input.dateFrom).toISOString()));
      }

      if (input?.dateTo) {
        whereClauses.push(lte(invoices.date, new Date(input.dateTo).toISOString()));
      }

      const items = await database
        .select()
        .from(invoices)
        .where(and(...whereClauses));

      const markedInvoices = markOverdueInvoices(items);
      return calculateInvoiceStats(markedInvoices);
    }),
  
  /**
   * Generar siguiente número de factura
   */
  getNextInvoiceNumber: orgProcedure.query(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) return "INV-0001";

    const allInvoices = await database
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(
        filterByPartner(invoices.partnerId, ctx.partnerId),
      )
      .orderBy(desc(invoices.createdAt));

    if (allInvoices.length === 0) {
      return "INV-0001";
    }

    // Extraer el número más alto
    const numbers = allInvoices
      .map(inv => {
        const match = inv.invoiceNumber.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n));

    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = maxNumber + 1;

    return `INV-${String(nextNumber).padStart(4, '0')}`;
  }),
});
