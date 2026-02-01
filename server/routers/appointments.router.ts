/**
 * Appointments Router
 * Gestión de citas con paginación, eager loading, recurrencia y detección de conflictos
 * Soporte completo para organizaciones con sharing configurable
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc.js";
import * as db from "../db.js";
import { appointments, clients, pianos } from "../../drizzle/schema.js";
import { eq, and, gte, lte, asc, desc, count } from "drizzle-orm";
import { 
  filterByPartnerAndOrganization,
  filterByPartner,
  addOrganizationToInsert,
  validateWritePermission
} from "../utils/multi-tenant.js";
import { withOrganizationContext } from "../middleware/organization-context.js";
import { withCache, invalidatePath, invalidateUserCache } from "../lib/cache.middleware.js";
import { withQueue } from "../lib/queue.js";

// ============================================================================
// ESQUEMAS DE VALIDACIÓN
// ============================================================================

/**
 * Estados de cita (según schema de DB)
 */
const appointmentStatusSchema = z.enum([
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
]);

/**
 * Tipos de servicio
 */
const serviceTypeSchema = z.enum([
  "tuning",
  "repair",
  "regulation",
  "maintenance_basic",
  "maintenance_complete",
  "maintenance_premium",
  "inspection",
  "restoration",
  "transport",
  "appraisal",
  "voicing",
  "cleaning",
  "other",
]);

/**
 * Esquema de recordatorio
 */
const reminderSchema = z.object({
  type: z.enum(["email", "sms", "whatsapp", "push"]),
  minutesBefore: z.number().int().min(0).max(10080), // Máximo 1 semana
  sent: z.boolean().default(false),
  sentAt: z.string().optional().nullable(),
});

/**
 * Esquema de recurrencia
 */
const recurrenceSchema = z.object({
  type: z.enum(["daily", "weekly", "biweekly", "monthly", "yearly"]),
  interval: z.number().int().min(1).max(12).default(1),
  endDate: z.string().optional().nullable(),
  occurrences: z.number().int().min(1).max(52).optional().nullable(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional().nullable(),
}).optional().nullable();

/**
 * Esquema de paginación
 */
const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(30),
  cursor: z.number().optional(),
  sortBy: z.enum(["date", "status", "clientId", "createdAt"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: appointmentStatusSchema.optional(),
  serviceType: serviceTypeSchema.optional(),
  clientId: z.number().optional(),
  technicianId: z.string().optional(),
});

/**
 * Esquema de vista de calendario
 */
const calendarViewSchema = z.object({
  view: z.enum(["day", "week", "month"]).default("month"),
  date: z.string(),
  technicianId: z.string().optional(),
  status: appointmentStatusSchema.optional(),
  serviceType: serviceTypeSchema.optional(),
  clientId: z.number().optional(),
});

/**
 * Esquema base de cita
 */
const appointmentBaseSchema = z.object({
  clientId: z.number().int().positive(),
  pianoId: z.number().int().positive().optional().nullable(),
  title: z.string().min(1, "El título es obligatorio").max(255),
  date: z.string().or(z.date()),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  duration: z.number().int().min(15).max(480).default(60), // 15 min a 8 horas
  serviceType: serviceTypeSchema.optional().nullable(),
  status: appointmentStatusSchema.default("scheduled"),
  notes: z.string().max(2000).optional().nullable(),
  internalNotes: z.string().max(2000).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  reminders: z.array(reminderSchema).max(5).optional().nullable(),
  recurrence: recurrenceSchema,
  technicianId: z.string().optional().nullable(),
  technicianName: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  estimatedPrice: z.number().min(0).optional().nullable(),
});

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Calcula el rango de fechas para una vista de calendario
 */
function getDateRange(view: "day" | "week" | "month", centerDate: Date): { start: Date; end: Date } {
  const start = new Date(centerDate);
  const end = new Date(centerDate);
  
  switch (view) {
    case "day":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "week":
      // Lunes como primer día de la semana
      const dayOfWeek = start.getDay();
      const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
  }
  
  return { start, end };
}

/**
 * Detecta conflictos de horario entre citas
 */
function detectConflicts(
  existingAppointments: Array<{ id?: number; date: Date | string; duration: number; technicianId?: string | null }>,
  newAppointment: { id?: number; date: Date | string; duration: number; technicianId?: string | null }
): Array<{ id: number; overlap: number }> {
  const conflicts: Array<{ id: number; overlap: number }> = [];
  
  const newStart = new Date(newAppointment.date).getTime();
  const newEnd = newStart + (newAppointment.duration || 60) * 60 * 1000;
  
  for (const apt of existingAppointments) {
    // No comparar consigo misma
    if (apt.id && newAppointment.id && apt.id === newAppointment.id) continue;
    
    // Solo comparar si es el mismo técnico (o si no hay técnico asignado)
    if (newAppointment.technicianId && apt.technicianId && 
        newAppointment.technicianId !== apt.technicianId) continue;
    
    const aptStart = new Date(apt.date).getTime();
    const aptEnd = aptStart + (apt.duration || 60) * 60 * 1000;
    
    // Calcular solapamiento
    const overlapStart = Math.max(newStart, aptStart);
    const overlapEnd = Math.min(newEnd, aptEnd);
    const overlap = overlapEnd - overlapStart;
    
    if (overlap > 0 && apt.id) {
      conflicts.push({
        id: apt.id,
        overlap: Math.round(overlap / 60000), // Minutos
      });
    }
  }
  
  return conflicts;
}

/**
 * Genera citas recurrentes basadas en la configuración de recurrencia
 */
function generateRecurringAppointments(
  baseAppointment: z.infer<typeof appointmentBaseSchema>,
  maxOccurrences: number = 52
): Array<Omit<z.infer<typeof appointmentBaseSchema>, 'recurrence'> & { date: Date }> {
  if (!baseAppointment.recurrence) {
    return [{
      ...baseAppointment,
      date: new Date(baseAppointment.date),
      recurrence: undefined,
    }];
  }
  
  const { type, interval, endDate, occurrences, daysOfWeek } = baseAppointment.recurrence;
  const appointments: Array<Omit<z.infer<typeof appointmentBaseSchema>, 'recurrence'> & { date: Date }> = [];
  const baseDate = new Date(baseAppointment.date);
  const maxDate = endDate ? new Date(endDate) : new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000);
  const maxCount = occurrences || maxOccurrences;
  
  let currentDate = new Date(baseDate);
  let count = 0;
  
  while (currentDate <= maxDate && count < maxCount) {
    // Para recurrencia semanal con días específicos
    if (type === "weekly" && daysOfWeek && daysOfWeek.length > 0) {
      const currentDay = currentDate.getDay();
      if (daysOfWeek.includes(currentDay)) {
        appointments.push({
          ...baseAppointment,
          date: new Date(currentDate),
          recurrence: undefined,
        });
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
      // Saltar a la siguiente semana si ya pasamos todos los días
      if (currentDate.getDay() === 1) {
        currentDate.setDate(currentDate.getDate() + (interval - 1) * 7);
      }
    } else {
      // Para otros tipos de recurrencia
      appointments.push({
        ...baseAppointment,
        date: new Date(currentDate),
        recurrence: undefined,
      });
      count++;
      
      switch (type) {
        case "daily":
          currentDate.setDate(currentDate.getDate() + interval);
          break;
        case "weekly":
          currentDate.setDate(currentDate.getDate() + 7 * interval);
          break;
        case "biweekly":
          currentDate.setDate(currentDate.getDate() + 14 * interval);
          break;
        case "monthly":
          currentDate.setMonth(currentDate.getMonth() + interval);
          break;
        case "yearly":
          currentDate.setFullYear(currentDate.getFullYear() + interval);
          break;
      }
    }
  }
  
  return appointments;
}

/**
 * Calcula estadísticas de citas
 */
function calculateAppointmentStats(appointmentsList: any[]) {
  const total = appointmentsList.length;
  const scheduled = appointmentsList.filter(a => a.status === "scheduled").length;
  const confirmed = appointmentsList.filter(a => a.status === "confirmed").length;
  const completed = appointmentsList.filter(a => a.status === "completed").length;
  const cancelled = appointmentsList.filter(a => a.status === "cancelled").length;
  
  const now = new Date();
  const upcoming = appointmentsList.filter(a => 
    new Date(a.date) > now && 
    (a.status === "scheduled" || a.status === "confirmed")
  ).length;
  
  const byServiceType: Record<string, number> = {};
  serviceTypeSchema.options.forEach(type => {
    byServiceType[type] = appointmentsList.filter(a => a.serviceType === type).length;
  });

  return {
    total,
    scheduled,
    confirmed,
    completed,
    cancelled,
    upcoming,
    byServiceType,
  };
}

// ============================================================================
// PROCEDURE CON CONTEXTO DE ORGANIZACIÓN
// ============================================================================

const orgProcedure = protectedProcedure.use(withOrganizationContext);

// ============================================================================
// ROUTER
// ============================================================================

export const appointmentsRouter = router({
  /**
   * Lista de citas con paginación y eager loading
   */
  list: orgProcedure
    .input(paginationSchema.optional())
    .query(withCache(
      async ({ ctx, input }) => {
      const { 
        limit = 30, 
        cursor, 
        sortBy = "date", 
        sortOrder = "asc",
        dateFrom,
        dateTo,
        status,
        serviceType,
        clientId,
        technicianId
      } = input || {};
      
      const database = await db.getDb();
      if (!database) return { items: [], total: 0, stats: null, nextCursor: undefined };

      // DEBUG: Log partnerId
      console.log('🔍 [appointments.list] ctx.partnerId:', ctx.partnerId, 'type:', typeof ctx.partnerId);
      console.log('🔍 [appointments.list] ctx.user:', ctx.user ? { id: ctx.user.id, email: ctx.user.email, partnerId: ctx.user.partnerId } : null);
      
      // DEBUG: Log SQL query details
      console.log('🔍 [appointments.list] WHERE clause will filter by partnerId:', ctx.partnerId);

      // Construir condiciones WHERE con filtrado por organización
      const whereClauses = [
        filterByPartner(appointments.partnerId, ctx.partnerId),
      ];
      
      if (dateFrom) {
        whereClauses.push(gte(appointments.date, new Date(dateFrom).toISOString()));
      }
      
      if (dateTo) {
        whereClauses.push(lte(appointments.date, new Date(dateTo).toISOString()));
      }
      
      if (status) {
        whereClauses.push(eq(appointments.status, status));
      }
      
      if (serviceType) {
        whereClauses.push(eq(appointments.serviceType, serviceType));
      }
      
      if (clientId) {
        whereClauses.push(eq(appointments.clientId, clientId));
      }

      // Construir ORDER BY
      const sortColumn = appointments[sortBy as keyof typeof appointments] || appointments.date;
      const orderByClause = sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

      // Consulta principal con paginación y eager loading
      const offset = cursor || 0;
      
      console.log('🔍 [appointments.list] About to execute query with whereClauses:', whereClauses.length);
      
      const items = await withQueue(() => database
        .select({
          // Campos de appointment
          id: appointments.id,
          odId: appointments.odId,
          partnerId: appointments.partnerId,
          organizationId: appointments.organizationId,
          clientId: appointments.clientId,
          pianoId: appointments.pianoId,
          title: appointments.title,
          date: appointments.date,
          duration: appointments.duration,
          serviceType: appointments.serviceType,
          status: appointments.status,
          notes: appointments.notes,
          address: appointments.address,
          createdAt: appointments.createdAt,
          updatedAt: appointments.updatedAt,
          // Campos de cliente (eager loaded)
          clientName: clients.name,
          clientEmail: clients.email,
          clientPhone: clients.phone,
          // Campos de piano (eager loaded)
          pianoBrand: pianos.brand,
          pianoModel: pianos.model,
        })
        .from(appointments)
        .leftJoin(clients, eq(appointments.clientId, clients.id))
        .leftJoin(pianos, eq(appointments.pianoId, pianos.id))
        .where(and(...whereClauses))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset));

      // Contar total
      const [{ total }] = await withQueue(() => database
        .select({ total: count() })
        .from(appointments)
        .where(and(...whereClauses)));

      // Calcular estadísticas
      const allAppointments = await withQueue(() => database
        .select()
        .from(appointments)
        .where(
          filterByPartner(appointments.partnerId, ctx.partnerId),
        ));

      const stats = calculateAppointmentStats(allAppointments);
      
      console.log('🔍 [appointments.list] RESULTS - items.length:', items.length, 'total:', total, 'stats.total:', stats.total);
      console.log('🔍 [appointments.list] First 3 items:', items.slice(0, 3).map(i => ({ id: i.id, partnerId: i.partnerId, date: i.date })));

      let nextCursor: number | undefined = undefined;
      if (items.length === limit) {
        nextCursor = offset + limit;
      }

      return { items, nextCursor, total, stats };
    },
    { ttl: 300, prefix: 'appointments', includeUser: true, procedurePath: 'appointments.list' }
  )),
  
  /**
   * Lista completa sin paginación (para selects)
   */
  listAll: orgProcedure.query(withCache(
    async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) return [];
    
    const items = await database
      .select()
      .from(appointments)
      .where(
        filterByPartner(appointments.partnerId, ctx.partnerId),
      )
      .orderBy(asc(appointments.date));
    
    return items;
  },
  { ttl: 300, prefix: 'appointments', includeUser: true, procedurePath: 'appointments.listAll' }
)),
  
  /**
   * Vista de calendario optimizada con eager loading
   */
  calendarView: orgProcedure
    .input(calendarViewSchema)
    .query(async ({ ctx, input }) => {
      const centerDate = new Date(input.date);
      const { start, end } = getDateRange(input.view, centerDate);
      
      const database = await db.getDb();
      if (!database) {
        return {
          view: input.view,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          appointments: [],
          byDay: {},
          totalCount: 0,
        };
      }

      // Construir condiciones WHERE
      const whereClauses = [
        filterByPartner(appointments.partnerId, ctx.partnerId),
        gte(appointments.date, start),
        lte(appointments.date, end),
      ];
      
      if (input.status) {
        whereClauses.push(eq(appointments.status, input.status));
      }
      
      if (input.serviceType) {
        whereClauses.push(eq(appointments.serviceType, input.serviceType));
      }
      
      if (input.clientId) {
        whereClauses.push(eq(appointments.clientId, input.clientId));
      }

      // Eager loading: cargar citas con cliente y piano
      const items = await database
        .select({
          id: appointments.id,
          odId: appointments.odId,
          clientId: appointments.clientId,
          pianoId: appointments.pianoId,
          title: appointments.title,
          date: appointments.date,
          duration: appointments.duration,
          serviceType: appointments.serviceType,
          status: appointments.status,
          notes: appointments.notes,
          address: appointments.address,
          createdAt: appointments.createdAt,
          updatedAt: appointments.updatedAt,
          clientName: clients.name,
          clientEmail: clients.email,
          pianoBrand: pianos.brand,
          pianoModel: pianos.model,
        })
        .from(appointments)
        .leftJoin(clients, eq(appointments.clientId, clients.id))
        .leftJoin(pianos, eq(appointments.pianoId, pianos.id))
        .where(and(...whereClauses))
        .orderBy(asc(appointments.date));

      // Agrupar por día
      const byDay: Record<string, typeof items> = {};
      for (const apt of items) {
        const dayKey = new Date(apt.date).toISOString().split("T")[0];
        if (!byDay[dayKey]) byDay[dayKey] = [];
        byDay[dayKey].push(apt);
      }
      
      return {
        view: input.view,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        appointments: items,
        byDay,
        totalCount: items.length,
      };
    }),
  
  /**
   * Obtener cita por ID con eager loading
   */
  get: orgProcedure
    .input(z.object({ id: z.number() }))
    .query(withCache(
      async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      const [result] = await database
        .select({
          id: appointments.id,
          odId: appointments.odId,
          partnerId: appointments.partnerId,
          organizationId: appointments.organizationId,
          clientId: appointments.clientId,
          pianoId: appointments.pianoId,
          title: appointments.title,
          date: appointments.date,
          duration: appointments.duration,
          serviceType: appointments.serviceType,
          status: appointments.status,
          notes: appointments.notes,
          address: appointments.address,
          createdAt: appointments.createdAt,
          updatedAt: appointments.updatedAt,
          clientName: clients.name,
          clientEmail: clients.email,
          clientPhone: clients.phone,
          clientAddress: clients.address,
          pianoBrand: pianos.brand,
          pianoModel: pianos.model,
          pianoSerialNumber: pianos.serialNumber,
        })
        .from(appointments)
        .leftJoin(clients, eq(appointments.clientId, clients.id))
        .leftJoin(pianos, eq(appointments.pianoId, pianos.id))
        .where(
          and(
            filterByPartner(appointments.partnerId, ctx.partnerId),
            eq(appointments.id, input.id
          )
          )
        );

      if (!result) throw new Error("Cita no encontrada");
      
      return result;
    },
    { ttl: 300, prefix: 'appointments', includeUser: true, procedurePath: 'appointments.getById' }
  )),
  
  /**
   * Obtener citas de un cliente
   */
  byClient: orgProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) return [];

      const items = await database
        .select()
        .from(appointments)
        .where(
          and(
            filterByPartner(appointments.partnerId, ctx.partnerId),
            eq(appointments.clientId, input.clientId
          )
          )
        )
        .orderBy(desc(appointments.date));

      return items;
    }),
  
  /**
   * Obtener citas de un piano
   */
  byPiano: orgProcedure
    .input(z.object({ pianoId: z.number() }))
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) return [];

      const items = await database
        .select()
        .from(appointments)
        .where(
          and(
            filterByPartner(appointments.partnerId, ctx.partnerId),
            eq(appointments.pianoId, input.pianoId
          )
          )
        )
        .orderBy(desc(appointments.date));

      return items;
    }),
  
  /**
   * Obtener próximas citas
   */
  getUpcoming: orgProcedure
    .input(z.object({
      daysAhead: z.number().int().min(1).max(90).default(7),
    }).optional())
    .query(async ({ ctx, input }) => {
      const daysAhead = input?.daysAhead || 7;
      const database = await db.getDb();
      if (!database) return [];

      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const items = await database
        .select({
          id: appointments.id,
          title: appointments.title,
          date: appointments.date,
          duration: appointments.duration,
          status: appointments.status,
          serviceType: appointments.serviceType,
          clientName: clients.name,
          pianoBrand: pianos.brand,
        })
        .from(appointments)
        .leftJoin(clients, eq(appointments.clientId, clients.id))
        .leftJoin(pianos, eq(appointments.pianoId, pianos.id))
        .where(and(
          filterByPartner(appointments.partnerId, ctx.partnerId),
          gte(appointments.date, now),
          lte(appointments.date, futureDate)
        ))
        .orderBy(asc(appointments.date))
        .limit(20);

      return items;
    }),
  
  /**
   * Obtener citas de hoy
   */
  getToday: orgProcedure.query(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const items = await database
      .select({
        id: appointments.id,
        title: appointments.title,
        date: appointments.date,
        duration: appointments.duration,
        status: appointments.status,
        serviceType: appointments.serviceType,
        clientName: clients.name,
        pianoBrand: pianos.brand,
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(pianos, eq(appointments.pianoId, pianos.id))
      .where(and(
        filterByPartner(appointments.partnerId, ctx.partnerId),
        gte(appointments.date, today),
        lte(appointments.date, tomorrow)
      ))
      .orderBy(asc(appointments.date));

    return items;
  }),
  
  /**
   * Detectar conflictos de horario para una cita
   */
  checkConflicts: orgProcedure
    .input(z.object({
      id: z.number().optional(),
      date: z.string().or(z.date()),
      duration: z.number().int().min(15).max(480),
      technicianId: z.string().optional().nullable(),
    }))
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) return [];

      // Obtener todas las citas del mismo día
      const targetDate = new Date(input.date);
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);

      const existingAppointments = await database
        .select({
          id: appointments.id,
          date: appointments.date,
          duration: appointments.duration,
        })
        .from(appointments)
        .where(and(
          filterByPartner(appointments.partnerId, ctx.partnerId),
          gte(appointments.date, dayStart),
          lte(appointments.date, dayEnd)
        ));

      const conflicts = detectConflicts(existingAppointments, {
        id: input.id,
        date: input.date,
        duration: input.duration,
        technicianId: input.technicianId,
      });

      return conflicts;
    }),
  
  /**
   * Crear nueva cita (con soporte de recurrencia)
   */
  create: orgProcedure
    .input(appointmentBaseSchema)
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Generar citas (una o múltiples si hay recurrencia)
      const appointmentsToCreate = generateRecurringAppointments(input);
      
      // Detectar conflictos
      const existingAppointments = await database
        .select({
          id: appointments.id,
          date: appointments.date,
          duration: appointments.duration,
        })
        .from(appointments)
        .where(
          filterByPartner(appointments.partnerId, ctx.partnerId),
        );

      const conflicts = detectConflicts(existingAppointments, {
        date: input.date,
        duration: input.duration,
        technicianId: input.technicianId,
      });

      // Crear las citas
      const createdIds: number[] = [];
      for (const apt of appointmentsToCreate) {
        const appointmentData = addOrganizationToInsert(
          {
            clientId: apt.clientId,
            pianoId: apt.pianoId,
            title: apt.title,
            date: apt.date instanceof Date ? apt.date.toISOString() : new Date(apt.date).toISOString(),
            duration: apt.duration,
            serviceType: apt.serviceType,
            status: apt.status,
            notes: apt.notes,
            address: apt.address,
          },
          ctx.orgContext,
          "appointments"
        );
        
        const result = await database.insert(appointments).values(appointmentData);
        createdIds.push(result[0].insertId);
      }

      if (input.recurrence) {
        return {
          ids: createdIds,
          conflicts,
          isRecurring: true,
          count: createdIds.length,
        };
      }

      const result = {
        id: createdIds[0],
        conflicts,
        isRecurring: false,
      };
      
      await invalidateUserCache(ctx.user.id);
      await invalidatePath('appointments');
      
      return result;
    }),
  
  /**
   * Actualizar cita existente
   */
  update: orgProcedure
    .input(z.object({
      id: z.number(),
    }).merge(appointmentBaseSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Obtener la cita para verificar permisos
      const [existingAppointment] = await database
        .select()
        .from(appointments)
        .where(
          and(
            filterByPartner(appointments.partnerId, ctx.partnerId),
            eq(appointments.id, input.id
          )
          )
        );

      if (!existingAppointment) {
        throw new Error("Cita no encontrada");
      }

      // Validar permisos de escritura
      validateWritePermission(ctx.orgContext, "appointments", existingAppointment.odId);

      const { id, ...data } = input;
      
      // Detectar conflictos si se actualiza la fecha o duración
      let conflicts: Array<{ id: number; overlap: number }> = [];
      if (data.date || data.duration) {
        const existingAppointments = await database
          .select({
            id: appointments.id,
            date: appointments.date,
            duration: appointments.duration,
          })
          .from(appointments)
          .where(
            filterByPartner(appointments.partnerId, ctx.partnerId),
          );

        conflicts = detectConflicts(existingAppointments, {
          id,
          date: data.date || existingAppointment.date,
          duration: data.duration || existingAppointment.duration,
          technicianId: data.technicianId !== undefined ? data.technicianId : null,
        });
      }
      
      // Preparar datos para actualización
      const updateData: any = {};
      if (data.clientId !== undefined) updateData.clientId = data.clientId;
      if (data.pianoId !== undefined) updateData.pianoId = data.pianoId;
      if (data.title !== undefined) updateData.title = data.title;
      if (data.date !== undefined) updateData.date = new Date(data.date);
      if (data.duration !== undefined) updateData.duration = data.duration;
      if (data.serviceType !== undefined) updateData.serviceType = data.serviceType;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.address !== undefined) updateData.address = data.address;

      await database
        .update(appointments)
        .set(updateData)
        .where(eq(appointments.id, id));
      
      await invalidateUserCache(ctx.user.id);
      await invalidatePath('appointments');
      
      return { success: true, conflicts };
    }),
  
  /**
   * Cambiar estado de una cita
   */
  updateStatus: orgProcedure
    .input(z.object({
      id: z.number(),
      status: appointmentStatusSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Obtener la cita para verificar permisos
      const [existingAppointment] = await database
        .select()
        .from(appointments)
        .where(
          and(
            filterByPartner(appointments.partnerId, ctx.partnerId),
            eq(appointments.id, input.id
          )
          )
        );

      if (!existingAppointment) {
        throw new Error("Cita no encontrada");
      }

      // Validar permisos de escritura
      validateWritePermission(ctx.orgContext, "appointments", existingAppointment.odId);

      await database
        .update(appointments)
        .set({ status: input.status })
        .where(eq(appointments.id, input.id));
      
      await invalidateUserCache(ctx.user.id);
      await invalidatePath('appointments');
      
      return { success: true };
    }),
  
  /**
   * Eliminar cita
   */
  delete: orgProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Obtener la cita para verificar permisos
      const [existingAppointment] = await database
        .select()
        .from(appointments)
        .where(
          and(
            filterByPartner(appointments.partnerId, ctx.partnerId),
            eq(appointments.id, input.id
          )
          )
        );

      if (!existingAppointment) {
        throw new Error("Cita no encontrada");
      }

      // Validar permisos de escritura
      validateWritePermission(ctx.orgContext, "appointments", existingAppointment.odId);

      await database.delete(appointments).where(eq(appointments.id, input.id));
      
      await invalidateUserCache(ctx.user.id);
      await invalidatePath('appointments');
      
      return { success: true };
    }),
  
  /**
   * Obtener estadísticas de citas
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
        filterByPartner(appointments.partnerId, ctx.partnerId),
      ];

      if (input?.dateFrom) {
        whereClauses.push(gte(appointments.date, new Date(input.dateFrom).toISOString()));
      }

      if (input?.dateTo) {
        whereClauses.push(lte(appointments.date, new Date(input.dateTo).toISOString()));
      }

      const items = await database
        .select()
        .from(appointments)
        .where(and(...whereClauses));

      return calculateAppointmentStats(items);
    }),
});
