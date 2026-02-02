/**
 * Pianos Router
 * Gestión de pianos con validación mejorada, paginación optimizada
 * y soporte para organizaciones con sharing configurable
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc.js";
import * as db from "../db.js";
import { pianos } from "../../drizzle/schema.js";
import { eq, and, or, ilike, isNotNull, asc, desc, count, sql, lte, gte } from "drizzle-orm";
import { 
  filterByPartner, 
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

const pianoCategorySchema = z.enum(["vertical", "grand"]);
const pianoConditionSchema = z.enum(["excellent", "good", "fair", "poor", "needs_repair", "unknown"]);

const environmentSchema = z.object({
  humidity: z.number().min(0).max(100).optional().nullable(),
  temperature: z.number().min(-20).max(50).optional().nullable(),
  hasHumidityControl: z.boolean().optional(),
  hasClimateControl: z.boolean().optional(),
  sunExposure: z.enum(["none", "indirect", "direct"]).optional(),
  nearHeatSource: z.boolean().optional(),
}).optional().nullable();

const accessoriesSchema = z.object({
  bench: z.boolean().optional(),
  benchType: z.string().optional(),
  lamp: z.boolean().optional(),
  cover: z.boolean().optional(),
  metronome: z.boolean().optional(),
  humidifier: z.boolean().optional(),
  other: z.array(z.string()).optional(),
}).optional().nullable();

const paginationSchema = z.object({
  limit: z.number().int().min(1).max(5000).default(30),
  cursor: z.number().optional(),
  sortBy: z.enum(["brand", "model", "year", "createdAt", "updatedAt"]).default("brand"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  search: z.string().optional(),
  category: pianoCategorySchema.optional(),
  brand: z.string().optional(),
  condition: pianoConditionSchema.optional(),
  clientId: z.number().optional(),
  yearFrom: z.number().optional(),
  yearTo: z.number().optional(),
});

const pianoBaseSchema = z.object({
  clientId: z.number().int().positive(),
  brand: z.string().min(1, "La marca es obligatoria").max(100),
  model: z.string().max(100).optional().nullable(),
  serialNumber: z.string().max(100).optional().nullable(),
  year: z.number().int().min(1700).max(new Date().getFullYear() + 1).optional().nullable(),
  category: pianoCategorySchema,
  pianoType: z.string().min(1).max(50),
  condition: pianoConditionSchema.default("unknown"),
  location: z.string().max(500).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  photos: z.array(z.string().url()).max(20).optional(),
  color: z.string().max(50).optional().nullable(),
  finish: z.enum(["polished", "satin", "matte", "other"]).optional().nullable(),
  size: z.number().positive().optional().nullable(),
  keys: z.number().int().min(44).max(97).default(88).optional(),
  pedals: z.number().int().min(1).max(4).default(3).optional(),
  environment: environmentSchema,
  accessories: accessoriesSchema,
});

const KNOWN_BRANDS = [
  "Steinway & Sons", "Bösendorfer", "Fazioli", "Bechstein", "Blüthner",
  "Yamaha", "Kawai", "Schimmel", "Grotrian", "Steingraeber",
  "Mason & Hamlin", "Baldwin", "Petrof", "Estonia", "Shigeru Kawai",
  "Boston", "Essex", "Samick", "Young Chang", "Seiler",
  "Sauter", "Förster", "Feurich", "Haessler", "Rönisch",
  "Pleyel", "Érard", "Gaveau", "Chickering", "Knabe",
  "Weber", "Wurlitzer", "Kemble", "Knight", "Welmar",
  "Broadwood", "Brinsmead", "Challen", "Danemann", "Zender",
  "Pearl River", "Hailun", "Ritmuller", "Perzina", "Wendl & Lung",
];

// ============================================================================
// PROCEDURE CON CONTEXTO DE ORGANIZACIÓN
// ============================================================================

const orgProcedure = protectedProcedure.use(withOrganizationContext);

// ============================================================================
// ROUTER
// ============================================================================

export const pianosRouter = router({
  list: protectedProcedure
    .input(paginationSchema.optional())
    .query(withCache(
      async ({ ctx, input }) => {
      const { limit = 30, cursor, sortBy = "brand", sortOrder = "asc", search, category, brand, condition, clientId, yearFrom, yearTo } = input || {};
      const database = await db.getDb();
      if (!database) return { items: [], total: 0 };

      console.log('[PIANOS DEBUG] ctx.partnerId:', ctx.partnerId);
      console.log('[PIANOS DEBUG] ctx.user.email:', ctx.user.email);
      
      const whereClauses = [
        filterByPartner(pianos.partnerId, ctx.partnerId),
        eq(pianos.odId, ctx.user.email)
      ];
      
      console.log('[PIANOS DEBUG] whereClauses length:', whereClauses.length);
      
      if (search) {
        whereClauses.push(
          or(
            ilike(pianos.brand, `%${search}%`),
            ilike(pianos.model, `%${search}%`),
            ilike(pianos.serialNumber, `%${search}%`)
          )!
        );
      }
      if (category) whereClauses.push(eq(pianos.category, category));
      if (brand) whereClauses.push(ilike(pianos.brand, brand));
      if (condition) whereClauses.push(eq(pianos.condition, condition));
      if (clientId) whereClauses.push(eq(pianos.clientId, clientId));
      if (yearFrom) whereClauses.push(gte(pianos.year, yearFrom));
      if (yearTo) whereClauses.push(lte(pianos.year, yearTo));

      const sortColumn = pianos[sortBy as keyof typeof pianos] || pianos.brand;
      const orderByClause = sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

      const offset = cursor || 0;
      const items = await withQueue(() => database
        .select()
        .from(pianos)
        .where(and(...whereClauses))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset));

      const [{ total }] = await withQueue(() => database
        .select({ total: count() })
        .from(pianos)
        .where(and(...whereClauses)));

      let nextCursor: number | undefined = undefined;
      if (items.length === limit) {
        nextCursor = offset + limit;
      }

      return { items, nextCursor, total };
    },
    { ttl: 900, prefix: 'pianos', includeUser: true, procedurePath: 'pianos.list' }
  )),
  
  listAll: orgProcedure.query(withCache(
    async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) return [];
    
    return database
      .select()
      .from(pianos)
      .where(
        filterByPartnerAndOrganization(
          pianos,
          ctx.partnerId,
          ctx.orgContext,
          "pianos"
        )
      );
  },
  { ttl: 900, prefix: 'pianos', includeUser: true, procedurePath: 'pianos.listAll' }
)),
  
  get: orgProcedure
    .input(z.object({ id: z.number() }))
    .query(withCache(
      async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      const [piano] = await database
        .select()
        .from(pianos)
        .where(
          filterByPartnerAndOrganization(
            pianos,
            ctx.partnerId,
            ctx.orgContext,
            "pianos",
            eq(pianos.id, input.id)
          )
        );

      if (!piano) throw new Error("Piano no encontrado");
      return piano;
    },
    { ttl: 900, prefix: 'pianos', includeUser: true, procedurePath: 'pianos.getById' }
  )),
  
  byClient: orgProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) return [];

      return database
        .select()
        .from(pianos)
        .where(
          filterByPartnerAndOrganization(
            pianos,
            ctx.partnerId,
            ctx.orgContext,
            "pianos",
            eq(pianos.clientId, input.clientId)
          )
        );
    }),
  
  create: orgProcedure
    .input(pianoBaseSchema)
    .mutation(async ({ ctx, input }) => {
      const pianoData = addOrganizationToInsert(
        input,
        ctx.orgContext,
        "pianos"
      );
      
      const result = await db.getDb().createPiano(pianoData);
      
      // Invalidar caché
      await invalidateUserCache(ctx.user.id);
      await invalidatePath('pianos');
      
      return result;
    }),
  
  update: orgProcedure
    .input(z.object({
      id: z.number(),
    }).merge(pianoBaseSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Obtener el piano para verificar permisos
      const [existingPiano] = await database
        .select()
        .from(pianos)
        .where(
          filterByPartnerAndOrganization(
            pianos,
            ctx.partnerId,
            ctx.orgContext,
            "pianos",
            eq(pianos.id, input.id)
          )
        );

      if (!existingPiano) {
        throw new Error("Piano no encontrado");
      }

      // Validar permisos de escritura
      validateWritePermission(ctx.orgContext, "pianos", existingPiano.odId);

      const { id, ...data } = input;
      const result = await db.getDb().updatePiano(existingPiano.odId, id, data);
      
      // Invalidar caché
      await invalidateUserCache(ctx.user.id);
      await invalidatePath('pianos');
      
      return result;
    }),
  
  delete: orgProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Obtener el piano para verificar permisos
      const [existingPiano] = await database
        .select()
        .from(pianos)
        .where(
          filterByPartnerAndOrganization(
            pianos,
            ctx.partnerId,
            ctx.orgContext,
            "pianos",
            eq(pianos.id, input.id)
          )
        );

      if (!existingPiano) {
        throw new Error("Piano no encontrado");
      }

      // Validar permisos de escritura
      validateWritePermission(ctx.orgContext, "pianos", existingPiano.odId);

      const result = await db.getDb().deletePiano(existingPiano.odId, input.id);
      
      // Invalidar caché
      await invalidateUserCache(ctx.user.id);
      await invalidatePath('pianos');
      
      return result;
    }),
  
  getBrands: orgProcedure.query(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) return KNOWN_BRANDS.sort();

    const brandsQuery = await database
      .selectDistinct({ brand: pianos.brand })
      .from(pianos)
      .where(
        filterByPartnerAndOrganization(
          pianos,
          ctx.partnerId,
          ctx.orgContext,
          "pianos"
        )
      );
    
    const userBrands = brandsQuery.map(b => b.brand);
    return [...new Set([...userBrands, ...KNOWN_BRANDS])].sort();
  }),
  
  getNeedingService: orgProcedure
    .input(z.object({
      daysAhead: z.number().int().min(0).max(365).default(30),
    }).optional())
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) return [];

      const daysAhead = input?.daysAhead || 30;
      
      const allPianos = await database
        .select()
        .from(pianos)
        .where(
          filterByPartnerAndOrganization(
            pianos,
            ctx.partnerId,
            ctx.orgContext,
            "pianos"
          )
        );
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
      
      return allPianos
        .filter(p => {
          if (!p.nextServiceDate) return false;
          return new Date(p.nextServiceDate) <= cutoffDate;
        })
        .sort((a, b) => {
          const aDate = a.nextServiceDate ? new Date(a.nextServiceDate) : new Date(0);
          const bDate = b.nextServiceDate ? new Date(b.nextServiceDate) : new Date(0);
          return aDate.getTime() - bDate.getTime();
        });
    }),
  
  getServiceHistory: orgProcedure
    .input(z.object({ pianoId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Esta función necesita actualización en getDb().ts también
      // Por ahora, mantener la funcionalidad básica
      const services = await db.getDb().getServicesByPiano(ctx.user.email, input.pianoId);
      return services.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }),
  
  updateEnvironment: orgProcedure
    .input(z.object({
      id: z.number(),
      environment: environmentSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Obtener el piano para verificar permisos
      const [existingPiano] = await database
        .select()
        .from(pianos)
        .where(
          filterByPartnerAndOrganization(
            pianos,
            ctx.partnerId,
            ctx.orgContext,
            "pianos",
            eq(pianos.id, input.id)
          )
        );

      if (!existingPiano) {
        throw new Error("Piano no encontrado");
      }

      // Validar permisos de escritura
      validateWritePermission(ctx.orgContext, "pianos", existingPiano.odId);

      return getDb().updatePiano(existingPiano.odId, input.id, { environment: input.environment });
    }),
  
  logEnvironmentReading: orgProcedure
    .input(z.object({
      pianoId: z.number(),
      humidity: z.number().min(0).max(100),
      temperature: z.number().min(-20).max(50),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Obtener el piano para verificar permisos
      const [piano] = await database
        .select()
        .from(pianos)
        .where(
          filterByPartnerAndOrganization(
            pianos,
            ctx.partnerId,
            ctx.orgContext,
            "pianos",
            eq(pianos.id, input.pianoId)
          )
        );

      if (!piano) throw new Error("Piano no encontrado");

      // Validar permisos de escritura
      validateWritePermission(ctx.orgContext, "pianos", piano.odId);
      
      const environment = {
        ...(piano.environment || {}),
        humidity: input.humidity,
        temperature: input.temperature,
        lastReading: new Date().toISOString(),
      };
      
      return getDb().updatePiano(piano.odId, input.pianoId, { environment });
    }),

  // Obtener estadísticas de pianos
  getStats: protectedProcedure
    .query(withCache(
      async ({ ctx }) => {
        const database = await db.getDb();
        if (!database) return { total: 0, vertical: 0, grand: 0 };

        const whereClauses = [
          filterByPartner(pianos.partnerId, ctx.partnerId),
          eq(pianos.odId, ctx.user.email)
        ];

        // Total de pianos
        const [totalResult] = await database
          .select({ count: count() })
          .from(pianos)
          .where(and(...whereClauses));

        // Pianos por categoría
        const [verticalResult] = await database
          .select({ count: count() })
          .from(pianos)
          .where(and(...whereClauses, eq(pianos.category, 'vertical')));

        const [grandResult] = await database
          .select({ count: count() })
          .from(pianos)
          .where(and(...whereClauses, eq(pianos.category, 'grand')));

        return {
          total: totalResult?.count || 0,
          vertical: verticalResult?.count || 0,
          grand: grandResult?.count || 0,
        };
      },
      { ttl: 5 * 60, keyPrefix: 'pianos:stats' }
    )),
});
