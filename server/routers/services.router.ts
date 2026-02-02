/**
 * Services Router (OPTIMIZED)
 * Gestión de servicios con paginación en DB, eager loading
 * y soporte para organizaciones con sharing configurable
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc.js";
import * as db from "../db.js";
import { services, clients, pianos } from "../../drizzle/schema.js";
import { eq, and, or, gte, lte, asc, desc, count, sql, ilike } from "drizzle-orm";
import { 
  filterByPartner, 
  filterByPartnerAnd,
  filterByPartnerAndOrganization,
  addOrganizationToInsert,
  validateWritePermission
} from "../utils/multi-tenant.js";
import { withOrganizationContext } from "../middleware/organization-context.js";
import { withCache, invalidatePath, invalidateUserCache } from "../lib/cache.middleware.js";
import { withQueue } from "../lib/queue.js";

// ============================================================================
// ESQUEMAS DE VALIDACIÓN
// ============================================================================

const predefinedServiceTypes = [
  "tuning", "repair", "regulation", "maintenance_basic", "maintenance_complete",
  "maintenance_premium", "inspection", "restoration", "transport", "appraisal",
  "voicing", "cleaning", "other",
] as const;

const serviceTypeSchema = z.enum(predefinedServiceTypes);
const serviceStatusSchema = z.enum(["scheduled", "in_progress", "completed", "cancelled", "pending_payment", "pending_signature"]);

const taskSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(255),
  completed: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
  duration: z.number().int().min(0).optional(),
  order: z.number().int().min(0).optional(),
});

const materialUsedSchema = z.object({
  materialId: z.number().int().positive(),
  materialName: z.string().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0).optional(),
  totalPrice: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

const photoSchema = z.object({
  url: z.string().url(),
  caption: z.string().max(255).optional(),
  type: z.enum(["before", "after", "during", "issue", "other"]).optional(),
  timestamp: z.string().optional(),
});

const signatureSchema = z.object({
  data: z.string(),
  signedAt: z.string(),
  signerName: z.string().max(255).optional(),
  signerRole: z.enum(["client", "technician", "witness"]).default("client"),
  deviceInfo: z.string().max(500).optional(),
});

const serviceEnvironmentSchema = z.object({
  humidity: z.number().min(0).max(100).optional(),
  temperature: z.number().min(-20).max(50).optional(),
  notes: z.string().max(500).optional(),
});

const serviceBaseSchema = z.object({
  pianoId: z.number().int().positive(),
  clientId: z.number().int().positive(),
  serviceType: serviceTypeSchema,
  date: z.string().or(z.date()),
  cost: z.number().min(0).optional().nullable(),
  duration: z.number().int().min(0).optional().nullable(),
  tasks: z.array(taskSchema).max(50).optional(),
  notes: z.string().max(5000).optional().nullable(),
  technicianNotes: z.string().max(5000).optional().nullable(),
  materialsUsed: z.array(materialUsedSchema).max(100).optional(),
  photosBefore: z.array(photoSchema).max(20).optional(),
  photosAfter: z.array(photoSchema).max(20).optional(),
  clientSignature: signatureSchema.optional().nullable(),
  technicianSignature: signatureSchema.optional().nullable(),
  environment: serviceEnvironmentSchema.optional().nullable(),
  status: serviceStatusSchema.default("scheduled"),
  invoiceId: z.number().int().positive().optional().nullable(),
  appointmentId: z.number().int().positive().optional().nullable(),
});

const paginationSchema = z.object({
  limit: z.number().int().min(1).max(5000).default(30),
  cursor: z.number().optional(),
  sortBy: z.enum(["date", "cost", "serviceType", "createdAt"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  serviceType: serviceTypeSchema.optional(),
  status: serviceStatusSchema.optional(),
  clientId: z.number().optional(),
  pianoId: z.number().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  hasPendingSignature: z.boolean().optional(),
});

// ============================================================================
// PROCEDURE CON CONTEXTO DE ORGANIZACIÓN
// ============================================================================

// TEMPORAL: Sistema multi-tenant desactivado para diagnóstico
// const orgProcedure = protectedProcedure.use(withOrganizationContext);
const orgProcedure = protectedProcedure;

// ============================================================================
// ROUTER
// ============================================================================

export const servicesRouter = router({
  list: protectedProcedure
    .input(paginationSchema.optional())
    .query(withCache(
      async ({ ctx, input }) => {
      const { limit = 30, cursor, sortBy = "date", sortOrder = "desc", search, serviceType, status, clientId, pianoId, dateFrom, dateTo } = input || {};
      const database = await db.getDb();
      if (!database) return { items: [], total: 0 };

      console.log('[services.list] ===== INICIO CONSULTA =====');
      console.log('[services.list] ctx.partnerId:', ctx.partnerId, 'type:', typeof ctx.partnerId);
      console.log('[services.list] ctx.user.email:', ctx.user.email);

      // Filtro por partnerId
      const whereClauses = [
        filterByPartner(services.partnerId, ctx.partnerId)
      ];
      
      console.log('[services.list] WHERE clauses count:', whereClauses.length);
      
      if (search) {
        whereClauses.push(or(ilike(services.notes, `%${search}%`), ilike(services.technicianNotes, `%${search}%`))!);
      }
      if (serviceType) whereClauses.push(eq(services.serviceType, serviceType));
      if (status) whereClauses.push(eq(/* services.status */ services.id, status));
      if (clientId) whereClauses.push(eq(services.clientId, clientId));
      if (pianoId) whereClauses.push(eq(services.pianoId, pianoId));
      if (dateFrom) whereClauses.push(gte(services.date, new Date(dateFrom).toISOString()));
      if (dateTo) whereClauses.push(lte(services.date, new Date(dateTo).toISOString()));

      const sortColumn = services[sortBy as keyof typeof services] || services.date;
      const orderByClause = sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

      const offset = cursor || 0;
      console.log('[services.list] About to execute query...');
      
      let items;
      try {
        items = await withQueue(() => database
        .select({
          id: services.id,
          odId: services.odId,
          pianoId: services.pianoId,
          clientId: services.clientId,
          serviceType: services.serviceType,
          date: services.date,
          cost: services.cost,
          duration: services.duration,
          tasks: services.tasks,
          notes: services.notes,
          technicianNotes: services.technicianNotes,
          materialsUsed: services.materialsUsed,
          photosBefore: services.photosBefore,
          photosAfter: services.photosAfter,
          clientSignature: services.clientSignature,
          humidity: services.humidity,
          temperature: services.temperature,
          createdAt: services.createdAt,
          updatedAt: services.updatedAt,
          clientName: clients.name,
          clientEmail: clients.email,
          clientPhone: clients.phone,
          clientAddress: clients.address,
          pianoBrand: pianos.brand,
          pianoModel: pianos.model,
          pianoSerialNumber: pianos.serialNumber,
        })
        .from(services)
        .leftJoin(clients, eq(services.clientId, clients.id))
        .leftJoin(pianos, eq(services.pianoId, pianos.id))
        .where(and(...whereClauses))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset));
        
        console.log('[services.list] Query successful, items count:', items.length);
      } catch (error: any) {
        console.error('[services.list] ERROR executing query:', error);
        console.error('[services.list] Error message:', error.message);
        console.error('[services.list] Error stack:', error.stack);
        throw error;
      }

      const [{ total }] = await withQueue(() => database
        .select({ total: count() })
        .from(services)
        .where(and(...whereClauses)));

      const [{ totalRevenue }] = await withQueue(() => database
        .select({ totalRevenue: sql<number>`COALESCE(SUM(${services.cost}), 0)` })
        .from(services)
        .where(and(...whereClauses)));

      let nextCursor: number | undefined = undefined;
      if (items.length === limit) {
        nextCursor = offset + limit;
      }

      return { items, nextCursor, total, stats: { total, totalRevenue: Number(totalRevenue) || 0 } };
    },
    { ttl: 900, prefix: 'services', includeUser: true, procedurePath: 'services.list' }
  )),
  
  get: orgProcedure
    .input(z.object({ id: z.number() }))
    .query(withCache(
      async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) return undefined;

      const [result] = await database
        .select({
          id: services.id,
          odId: services.odId,
          pianoId: services.pianoId,
          clientId: services.clientId,
          serviceType: services.serviceType,
          date: services.date,
          cost: services.cost,
          duration: services.duration,
          tasks: services.tasks,
          notes: services.notes,
          technicianNotes: services.technicianNotes,
          materialsUsed: services.materialsUsed,
          photosBefore: services.photosBefore,
          photosAfter: services.photosAfter,
          clientSignature: services.clientSignature,
          technicianSignature: /* services.technicianSignature */ services.id,
          humidity: services.humidity,
          temperature: services.temperature,
          invoiceId: /* services.invoiceId */ services.id,
          appointmentId: /* services.appointmentId */ services.id,
          createdAt: services.createdAt,
          updatedAt: services.updatedAt,
          clientName: clients.name,
          clientEmail: clients.email,
          clientPhone: clients.phone,
          clientAddress: clients.address,
          pianoBrand: pianos.brand,
          pianoModel: pianos.model,
          pianoSerialNumber: pianos.serialNumber,
          pianoCategory: pianos.category,
        })
        .from(services)
        .leftJoin(clients, eq(services.clientId, clients.id))
        .leftJoin(pianos, eq(services.pianoId, pianos.id))
        .where(
          filterByPartnerAndOrganization(
            services,
            ctx.partnerId,
            ctx.orgContext,
            "services",
            eq(services.id, input.id)
          )
        );

      return result;
    },
    { ttl: 900, prefix: 'services', includeUser: true, procedurePath: 'services.getById' }
  )),

  byPiano: orgProcedure
    .input(z.object({ pianoId: z.number() }))
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) return [];

      return database
        .select()
        .from(services)
        .where(
          filterByPartnerAndOrganization(
            services,
            ctx.partnerId,
            ctx.orgContext,
            "services",
            eq(services.pianoId, input.pianoId)
          )
        )
        .orderBy(desc(services.date));
    }),

  byClient: orgProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) return [];

      return database
        .select()
        .from(services)
        .where(
          filterByPartnerAndOrganization(
            services,
            ctx.partnerId,
            ctx.orgContext,
            "services",
            eq(services.clientId, input.clientId)
          )
        )
        .orderBy(desc(services.date));
    }),

  create: orgProcedure
    .input(serviceBaseSchema)
    .mutation(async ({ ctx, input }) => {
      const serviceData = addOrganizationToInsert(
        input,
        ctx.orgContext,
        "services"
      );
      
      const result = await db.getDb().createService(serviceData);
      await invalidateUserCache(ctx.user.id);
      await invalidatePath('services');
      return result;
    }),

  update: orgProcedure
    .input(z.object({
      id: z.number(),
    }).merge(serviceBaseSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Obtener el servicio para verificar permisos
      const [existingService] = await database
        .select()
        .from(services)
        .where(
          filterByPartnerAndOrganization(
            services,
            ctx.partnerId,
            ctx.orgContext,
            "services",
            eq(services.id, input.id)
          )
        );

      if (!existingService) {
        throw new Error("Servicio no encontrado");
      }

      // Validar permisos de escritura
      validateWritePermission(ctx.orgContext, "services", existingService.odId);

      const { id, ...data } = input;
      const result = await db.getDb().updateService(existingService.odId, id, data);
      await invalidateUserCache(ctx.user.id);
      await invalidatePath('services');
      return result;
    }),

  delete: orgProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Obtener el servicio para verificar permisos
      const [existingService] = await database
        .select()
        .from(services)
        .where(
          filterByPartnerAndOrganization(
            services,
            ctx.partnerId,
            ctx.orgContext,
            "services",
            eq(services.id, input.id)
          )
        );

      if (!existingService) {
        throw new Error("Servicio no encontrado");
      }

      // Validar permisos de escritura
      validateWritePermission(ctx.orgContext, "services", existingService.odId);

      const result = await db.getDb().deleteService(existingService.odId, input.id);
      await invalidateUserCache(ctx.user.id);
      await invalidatePath('services');
      return result;
    }),

  getStats: orgProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) return { total: 0, totalRevenue: 0, byType: [], byStatus: [] };

      // Filtro por partnerId
      const whereClauses = [
        filterByPartner(services.partnerId, ctx.partnerId)
      ];

      if (input?.dateFrom) whereClauses.push(gte(services.date, new Date(input.dateFrom).toISOString()));
      if (input?.dateTo) whereClauses.push(lte(services.date, new Date(input.dateTo).toISOString()));

      const [{ total, totalRevenue }] = await database
        .select({
          total: count(),
          totalRevenue: sql<number>`COALESCE(SUM(${services.cost}), 0)`,
        })
        .from(services)
        .where(and(...whereClauses));

      const byType = await database
        .select({
          serviceType: services.serviceType,
          count: count(),
          totalRevenue: sql<number>`COALESCE(SUM(${services.cost}), 0)`,
        })
        .from(services)
        .where(and(...whereClauses))
        .groupBy(services.serviceType);

      const byStatus = await database
        .select({
          count: count(),
        })
        .from(services)
        .where(and(...whereClauses))
        // .groupBy(/* services.status */ services.id) - COMMENTED: status field does not exist;

      return {
        total,
        totalRevenue: Number(totalRevenue) || 0,
        byType: byType.map(t => ({
          ...t,
          totalRevenue: Number(t.totalRevenue) || 0,
        })),
        byStatus,
      };
    }),
});
