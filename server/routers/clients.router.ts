/**
 * Clients Router
 * Gestión de clientes con validación mejorada, paginación optimizada
 * y soporte para organizaciones con sharing configurable
 */
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc.js";
import * as db from "../db.js";
import { clients, users, pianos } from "../../drizzle/schema.js";
import { getDb } from "../db.js";
import { eq, and, or, ilike, isNotNull, asc, desc, count, sql } from "drizzle-orm";
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

const phoneRegex = /^(\+?\d{1,4}[-.\s]?)?(\(?\d{1,4}\)?[-.\s]?)?[\d\s.-]{6,14}$/;

const phoneSchema = z.string()
  .regex(phoneRegex, "Formato de teléfono no válido")
  .or(z.literal(""))
  .optional()
  .nullable()
  .transform(val => val === "" ? null : val);

const addressSchema = z.object({
  street: z.string().max(255).optional().nullable(),
  number: z.string().max(20).optional().nullable(),
  floor: z.string().max(50).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
}).optional().nullable();

const taxIdRegex = /^([A-Z]\d{8}|\d{8}[A-Z]|[A-Z]\d{7}[A-Z])$/i;

const taxIdSchema = z.string()
  .regex(taxIdRegex, "NIF/CIF no válido")
  .or(z.literal(""))
  .optional()
  .nullable()
  .transform(val => val === "" ? null : val?.toUpperCase());

const clientTypeSchema = z.enum([
  "particular",
  "individual",
  "student", 
  "professional",
  "music_school",
  "conservatory",
  "concert_hall"
]).default("particular")
  .transform(val => val === "individual" ? "particular" : val);

const clientBaseSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(255),
  email: z.string().email("Email no válido").optional().nullable(),
  phone: phoneSchema,
  address: z.string().optional().nullable(),
  addressStructured: addressSchema,
  clientType: clientTypeSchema.optional(),
  notes: z.string().max(5000).optional().nullable(),
  taxId: taxIdSchema,
  region: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  routeGroup: z.string().max(50).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

// ============================================================================
// PROCEDURE CON CONTEXTO DE ORGANIZACIÓN
// ============================================================================

// Usar protectedProcedure para asegurar que el contexto se completa correctamente
const orgProcedure = protectedProcedure.use(withOrganizationContext);

/**
 * Obtener el partnerId del usuario actual
 * Si no hay usuario autenticado, devolver null
 */
async function getUserPartnerId(userId: string | undefined): Promise<number | null> {
  if (!userId) {
    console.log('[getUserPartnerId] No userId provided');
    return null;
  }

  try {
    const database = await getDb();
    if (!database) {
      console.log('[getUserPartnerId] Database not available');
      return null;
    }

    console.log('[getUserPartnerId] Looking for user with openId:', userId);
    const result = await database.select().from(users).where(eq(users.openId, userId)).limit(1);
    const user = result.length > 0 ? result[0] : null;

    if (user) {
      console.log('[getUserPartnerId] User found, partnerId:', user.partnerId);
      return user.partnerId as number | null;
    }

    console.log('[getUserPartnerId] User not found');
    return null;
  } catch (error) {
    console.error('[getUserPartnerId] Error getting user partnerId:', error);
    return null;
  }
}

// ============================================================================
// ROUTER
// ============================================================================

export const clientsRouter = router({
  list: protectedProcedure
     .input(
        z.object({
          limit: z.number().min(1).max(5000).default(30),
          cursor: z.number().optional(),
          search: z.string().optional(),
          region: z.string().optional(),
          routeGroup: z.string().optional(),
          sortBy: z.string().default("name"),
          sortOrder: z.enum(["asc", "desc"]).default("asc"),
        })
      )
     .query(withCache(
      async ({ ctx, input }) => {
      const { limit, cursor, search, region, routeGroup, sortBy, sortOrder } = input;
      const database = await getDb();
      if (!database) return { items: [], total: 0 };

      // Usar el partnerId del contexto (ya está disponible desde la autenticación)
      const partnerId = ctx.partnerId;
      
      console.log('[clients.list] ===== INICIO CONSULTA =====');
      console.log('[clients.list] ctx.user:', ctx.user);
      console.log('[clients.list] ctx.partnerId:', ctx.partnerId, 'type:', typeof ctx.partnerId);
      console.log('[clients.list] userId:', ctx.user?.id, 'partnerId:', partnerId);

      // Si no hay partnerId, devolver lista vacía (usuario no autenticado)
      if (!partnerId) {
        console.log('[clients.list] NO partnerId available, returning empty list');
        return { items: [], total: 0 };
      }
      console.log('[clients.list] partnerId disponible:', partnerId);
      
      // Filtrar solo por partnerId (sin filtro por odId)
      const whereClauses = [
        filterByPartner(clients.partnerId, partnerId)
      ];
      
      if (search) {
        whereClauses.push(
          or(
            ilike(clients.name, `%${search}%`),
            ilike(clients.email, `%${search}%`),
            ilike(clients.phone, `%${search}%`),
            ilike(clients.city, `%${search}%`)
          )!
        );
      }
      
      if (region) whereClauses.push(eq(clients.region, region));
      if (routeGroup) whereClauses.push(eq(clients.routeGroup, routeGroup));

      const sortColumn = clients[sortBy as keyof typeof clients] || clients.name;
      const orderByClause = sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

      const offset = cursor || 0;
      
      // DEBUG: Log the WHERE clause (v2 with LEFT JOIN for pianoCount)
      console.log('[clients.list] WHERE clauses count:', whereClauses.length);
      console.log('[clients.list] Offset:', offset, 'Limit:', limit);
      console.log('[clients.list] Using partnerId:', partnerId, 'for filter');
      
      try {
        // Obtener clientes con conteo de pianos usando LEFT JOIN
        const items = await withQueue(() => database
          .select({
            ...clients,
            pianoCount: sql<number>`COALESCE(COUNT(DISTINCT ${pianos.id}), 0)`,
          })
          .from(clients)
          .leftJoin(pianos, eq(pianos.clientId, clients.id))
          .where(and(...whereClauses))
          .groupBy(clients.id)
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset));

        console.log('[clients.list] Query returned:', items.length, 'items');
        console.log('[clients.list] First item pianoCount:', items[0]?.pianoCount);
        
        const [{ total }] = await withQueue(() => database
          .select({ total: count() })
          .from(clients)
          .where(and(...whereClauses)));
        
        console.log('[clients.list] Total count:', total);

        let nextCursor: number | undefined = undefined;
        if (items.length === limit) {
          nextCursor = offset + limit;
        }

        return { items, nextCursor, total };
      } catch (error) {
        console.error('[clients.list] ERROR executing query:', error);
        console.error('[clients.list] Error message:', error instanceof Error ? error.message : 'Unknown error');
        console.error('[clients.list] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        throw error;
      }
    },
    { ttl: 900, prefix: 'clients-v2', includeUser: true, procedurePath: 'clients.list' }
  )),
  
  listAll: orgProcedure.query(withCache(
    async ({ ctx }) => {
    const database = await getDb();
    if (!database) return [];
    
    return database
      .select()
      .from(clients)
      .where(
        filterByPartnerAndOrganization(
          clients,
          ctx.partnerId,
          ctx.orgContext,
          "clients"
        )
      );
  },
  { ttl: 900, prefix: 'clients', includeUser: true, procedurePath: 'clients.listAll' }
)),
  
  getById: orgProcedure
    .input(z.object({ id: z.number() }))
    .query(withCache(
      async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const [client] = await database
        .select()
        .from(clients)
        .where(
          filterByPartnerAndOrganization(
            clients,
            ctx.partnerId,
            ctx.orgContext,
            "clients",
            eq(clients.id, input.id)
          )
        );

      if (!client) throw new Error("Cliente no encontrado");
      return client;
    },
    { ttl: 900, prefix: 'clients', includeUser: true, procedurePath: 'clients.getById' }
  )),
  
  create: orgProcedure
    .input(clientBaseSchema)
    .mutation(async ({ ctx, input }) => {
      let address = input.address;
      if (!address && input.addressStructured) {
        const addr = input.addressStructured;
        const parts = [];
        if (addr.street) {
          let line = addr.street;
          if (addr.number) line += ` ${addr.number}`;
          if (addr.floor) line += `, ${addr.floor}`;
          parts.push(line);
        }
        if (addr.postalCode || addr.city) {
          parts.push([addr.postalCode, addr.city].filter(Boolean).join(" "));
        }
        if (addr.province) parts.push(addr.province);
        if (addr.country) parts.push(addr.country);
        address = parts.join(", ");
      }
      
      // TEMPORAL: Solo asignar partnerId (sistema multi-tenant desactivado)
      const clientData = {
        ...input,
        address,
        partnerId: ctx.partnerId,
      };
      
      const result = await getDb().createClient(clientData);
      
      // Invalidar caché
      await invalidateUserCache(ctx.user.id);
      await invalidatePath('clients');
      
      return result;
    }),
  
  update: orgProcedure
    .input(z.object({
      id: z.number(),
    }).merge(clientBaseSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Primero obtener el cliente para verificar permisos
      const [existingClient] = await database
        .select()
        .from(clients)
        .where(
          filterByPartnerAndOrganization(
            clients,
            ctx.partnerId,
            ctx.orgContext,
            "clients",
            eq(clients.id, input.id)
          )
        );

      if (!existingClient) {
        throw new Error("Cliente no encontrado");
      }

      // Validar permisos de escritura
      validateWritePermission(ctx.orgContext, "clients", existingClient.odId);

      const { id, addressStructured, ...data } = input;
      let updateData = { ...data };
      
      if (addressStructured && !data.address) {
        const addr = addressStructured;
        const parts = [];
        if (addr.street) {
          let line = addr.street;
          if (addr.number) line += ` ${addr.number}`;
          if (addr.floor) line += `, ${addr.floor}`;
          parts.push(line);
        }
        if (addr.postalCode || addr.city) {
          parts.push([addr.postalCode, addr.city].filter(Boolean).join(" "));
        }
        if (addr.province) parts.push(addr.province);
        if (addr.country) parts.push(addr.country);
        updateData.address = parts.join(", ");
      }
      
      // Actualizar usando el odId del cliente original (no del usuario actual)
      const result = await getDb().updateClient(existingClient.odId, id, updateData);
      
      // Invalidar caché
      await invalidateUserCache(ctx.user.id);
      await invalidatePath('clients');
      
      return result;
    }),
  
  delete: orgProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Primero obtener el cliente para verificar permisos
      const [existingClient] = await database
        .select()
        .from(clients)
        .where(
          filterByPartnerAndOrganization(
            clients,
            ctx.partnerId,
            ctx.orgContext,
            "clients",
            eq(clients.id, input.id)
          )
        );

      if (!existingClient) {
        throw new Error("Cliente no encontrado");
      }

      // Validar permisos de escritura (delete requiere los mismos permisos que write)
      validateWritePermission(ctx.orgContext, "clients", existingClient.odId);

      // Eliminar usando el odId del cliente original
      const result = await getDb().deleteClient(existingClient.odId, input.id);
      
      // Invalidar caché
      await invalidateUserCache(ctx.user.id);
      await invalidatePath('clients');
      
      return result;
    }),
  
  getRegions: orgProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database) return [];

    const regionsQuery = await database
      .selectDistinct({ region: clients.region })
      .from(clients)
      .where(
        and(
          filterByPartnerAndOrganization(
            clients,
            ctx.partnerId,
            ctx.orgContext,
            "clients"
          ),
          isNotNull(clients.region)
        )
      );
    
    return regionsQuery.map(r => r.region!).sort();
  }),
  
  getRouteGroups: orgProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database) return [];

    const groupsQuery = await database
      .selectDistinct({ routeGroup: clients.routeGroup })
      .from(clients)
      .where(
        and(
          filterByPartnerAndOrganization(
            clients,
            ctx.partnerId,
            ctx.orgContext,
            "clients"
          ),
          isNotNull(clients.routeGroup)
        )
      );
    
    return groupsQuery.map(g => g.routeGroup!).sort();
  }),
  
  findDuplicates: orgProcedure
    .input(z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      excludeId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) return [];

      const whereClauses = [
        filterByPartnerAndOrganization(
          clients,
          ctx.partnerId,
          ctx.orgContext,
          "clients"
        )
      ];
      
      if (input.excludeId) whereClauses.push(sql`${clients.id} != ${input.excludeId}`);
      if (input.email) whereClauses.push(ilike(clients.email, input.email));
      if (input.name) whereClauses.push(ilike(clients.name, `%${input.name}%`));

      return database
        .select()
        .from(clients)
        .where(and(...whereClauses))
        .limit(10);
    }),
  
  getStats: orgProcedure.query(async ({ ctx }) => {
    console.log('[getStats] partnerId:', ctx.partnerId, 'orgContext:', ctx.orgContext);
    const database = await getDb();
    if (!database) return { total: 0, active: 0, vip: 0, withPianos: 0 };

    const { pianos } = await import("../../drizzle/schema.js");

    // Total de clientes
    const [{ total }] = await database
      .select({ total: count() })
      .from(clients)
      .where(
        filterByPartnerAndOrganization(
          clients,
          ctx.partnerId,
          ctx.orgContext,
          "clients"
        )
      );

    // Por ahora, activos = total (no existe columna status)
    const active = total;

    // Por ahora, VIP = 0 (no existe columna isVIP)
    const vip = 0;

    // Clientes con pianos (DISTINCT clientId en tabla pianos)
    const [{ withPianos }] = await database
      .select({ withPianos: sql<number>`COUNT(DISTINCT ${pianos.clientId})` })
      .from(pianos)
      .where(
        and(
          filterByPartnerAndOrganization(
            pianos,
            ctx.partnerId,
            ctx.orgContext,
            "pianos"
          ),
          isNotNull(pianos.clientId)
        )
      );

    const result = {
      total: Number(total),
      active: Number(active),
      vip: Number(vip),
      withPianos: Number(withPianos)
    };
    console.log('[getStats] result:', result);
    return result;
  }),
});
