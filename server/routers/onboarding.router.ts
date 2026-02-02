/**
 * Onboarding Router
 * Sistema de registro y configuración inicial de nuevos partners
 */
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc.js";
import { getDb } from "../db.js";
import { partners, partnerSettings, partnerUsers, users, serviceTypes as serviceTypesTable, serviceTasks as serviceTasksTable, alertSettings } from "../../drizzle/schema.js";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ============================================================================
// ESQUEMAS DE VALIDACIÓN
// ============================================================================

/**
 * Schema para verificar disponibilidad de slug
 */
const checkSlugSchema = z.object({
  slug: z.string()
    .min(2, "El slug debe tener al menos 2 caracteres")
    .max(50, "El slug no puede tener más de 50 caracteres")
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
});

/**
 * Schema para verificar disponibilidad de email
 */
const checkEmailSchema = z.object({
  email: z.string().email("Email no válido").max(320),
});

/**
 * Schema para el paso 1: Información básica del partner
 */
const step1Schema = z.object({
  slug: z.string()
    .min(2, "El slug debe tener al menos 2 caracteres")
    .max(50, "El slug no puede tener más de 50 caracteres")
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  name: z.string()
    .min(1, "El nombre es obligatorio")
    .max(255, "El nombre no puede tener más de 255 caracteres"),
  email: z.string()
    .email("Email no válido")
    .max(320, "El email no puede tener más de 320 caracteres"),
  supportEmail: z.string()
    .email("Email no válido")
    .max(320)
    .optional()
    .nullable(),
  supportPhone: z.string()
    .max(50)
    .optional()
    .nullable(),
});

/**
 * Schema para el paso 2: Datos Fiscales
 */
const step2Schema = z.object({
  legalName: z.string()
    .min(1, "La razón social es obligatoria")
    .max(255),
  businessName: z.string()
    .max(255)
    .optional()
    .nullable(),
  taxId: z.string()
    .min(1, "El NIF/CIF es obligatorio")
    .max(20),
  address: z.object({
    street: z.string().min(1).max(255),
    postalCode: z.string().regex(/^\d{5}$/),
    city: z.string().min(1).max(100),
    province: z.string().min(1).max(100),
  }),
  iban: z.string()
    .max(34)
    .optional()
    .nullable(),
  bankName: z.string()
    .max(255)
    .optional()
    .nullable(),
});

/**
 * Schema para el paso 3: Modo de Negocio
 */
const step3Schema = z.object({
  businessMode: z.enum(["individual", "team"]),
});

/**
 * Schema para el paso 4: Cliente de Correo
 */
const step4Schema = z.object({
  emailClientPreference: z.enum(["gmail", "outlook", "default"]).default("gmail"),
});

/**
 * Schema para el paso 5: Servicios y Tareas
 */
const step5Schema = z.object({
  serviceTypes: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1).max(255),
      price: z.number().positive(),
      duration: z.number().positive(),
      tasks: z.array(
        z.object({
          id: z.string(),
          description: z.string().min(1).max(500),
          completed: z.boolean().default(false),
        })
      ).min(1),
    })
  ),
});

/**
 * Schema para el paso 6: Alertas
 */
const step6Schema = z.object({
  alerts: z.object({
    pianoTuning: z.boolean().default(true),
    pianoRegulation: z.boolean().default(true),
    pianoMaintenance: z.boolean().default(true),
    quotesPending: z.boolean().default(true),
    quotesExpiring: z.boolean().default(true),
    invoicesPending: z.boolean().default(true),
    invoicesOverdue: z.boolean().default(true),
    upcomingAppointments: z.boolean().default(true),
    unconfirmedAppointments: z.boolean().default(true),
  }),
  alertFrequency: z.enum(["realtime", "daily", "weekly"]).default("realtime"),
});

/**
 * Schema para el paso 7: Notificaciones y Calendario
 */
const step7Schema = z.object({
  pushNotifications: z.boolean().default(true),
  emailNotifications: z.boolean().default(true),
  calendarSync: z.enum(["none", "google", "outlook"]).default("none"),
});

/**
 * Schema para el paso 8: Personalización (Branding)
 */
const step8Schema = z.object({
  brandName: z.string()
    .max(255, "El nombre de marca no puede tener más de 255 caracteres")
    .optional()
    .nullable(),
  logo: z.string()
    .optional()
    .nullable(),
  primaryColor: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color hex válido requerido (#RRGGBB)")
    .default("#3b82f6"),
  secondaryColor: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color hex válido requerido (#RRGGBB)")
    .default("#10b981"),
});



/**
 * Schema completo para registro de partner (8 pasos)
 */
const completeRegistrationSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema)
  .merge(step5Schema)
  .merge(step6Schema)
  .merge(step7Schema)
  .merge(step8Schema)
  .extend({
    // Información del usuario administrador
    adminUserName: z.string()
      .min(1, "El nombre del administrador es obligatorio")
      .max(255),
    adminUserEmail: z.string()
      .email("Email no válido")
      .max(320),
  });

// ============================================================================
// ROUTER
// ============================================================================

export const onboardingRouter = router({
  /**
   * Verificar disponibilidad de slug
   * Endpoint público para validación en tiempo real
   */
  checkSlugAvailability: publicProcedure
    .input(checkSlugSchema)
    .query(async ({ input }) => {
      const database = await (await getDb())!.getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const [existing] = await database
        .select({ id: partners.id })
        .from(partners)
        .where(eq(partners.slug, input.slug))
        .limit(1);

      return {
        available: !existing,
        slug: input.slug,
      };
    }),

  /**
   * Verificar disponibilidad de email
   * Endpoint público para validación en tiempo real
   */
  checkEmailAvailability: publicProcedure
    .input(checkEmailSchema)
    .query(async ({ input }) => {
      const database = await (await getDb())!.getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const [existingPartner] = await database
        .select({ id: partners.id })
        .from(partners)
        .where(eq(partners.email, input.email))
        .limit(1);

      const [existingUser] = await database
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      return {
        available: !existingPartner && !existingUser,
        email: input.email,
      };
    }),

  /**
   * Generar sugerencias de slug basadas en el nombre
   */
  suggestSlug: publicProcedure
    .input(z.object({ name: z.string().min(1).max(255) }))
    .query(async ({ input }) => {
      const database = await (await getDb())!.getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Generar slug base desde el nombre
      const baseSlug = input.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remover acentos
        .replace(/[^a-z0-9]+/g, "-") // Reemplazar caracteres especiales con guiones
        .replace(/^-+|-+$/g, "") // Remover guiones al inicio y final
        .substring(0, 50); // Limitar longitud

      const suggestions: string[] = [];

      // Verificar disponibilidad del slug base
      const [existing] = await database
        .select({ id: partners.id })
        .from(partners)
        .where(eq(partners.slug, baseSlug))
        .limit(1);

      // Si está disponible, agregarlo como primera opción
      if (!existing) {
        suggestions.push(baseSlug);
      }

      // Generar alternativas con números
      for (let i = 1; i <= 5; i++) {
        const altSlug = `${baseSlug}-${i}`;
        const [altExisting] = await database
          .select({ id: partners.id })
          .from(partners)
          .where(eq(partners.slug, altSlug))
          .limit(1);

        if (!altExisting) {
          suggestions.push(altSlug);
        }

        // Si ya tenemos 5 sugerencias, parar
        if (suggestions.length >= 5) break;
      }

      return {
        suggestions,
        baseSlug,
      };
    }),

  /**
   * Validar paso 1: Información básica
   */
  validateStep1: publicProcedure
    .input(step1Schema)
    .mutation(async ({ input }) => {
      const database = await (await getDb())!.getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Verificar slug único
      const [existingSlug] = await database
        .select({ id: partners.id })
        .from(partners)
        .where(eq(partners.slug, input.slug))
        .limit(1);

      if (existingSlug) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El slug ya está en uso",
        });
      }

      // Verificar email único
      const [existingEmail] = await database
        .select({ id: partners.id })
        .from(partners)
        .where(eq(partners.email, input.email))
        .limit(1);

      if (existingEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El email ya está en uso",
        });
      }

      return {
        valid: true,
        data: input,
      };
    }),

  /**
   * Validar paso 2: Datos Fiscales
   */
  validateStep2: publicProcedure
    .input(step2Schema)
    .mutation(async ({ input }) => {
      // Validaciones adicionales si es necesario
      return {
        valid: true,
        data: input,
      };
    }),

  /**
   * Validar paso 3: Modo de Negocio
   */
  validateStep3: publicProcedure
    .input(step3Schema)
    .mutation(async ({ input }) => {
      return {
        valid: true,
        data: input,
      };
    }),

  /**
   * Validar paso 4: Cliente de Correo
   */
  validateStep4: publicProcedure
    .input(step4Schema)
    .mutation(async ({ input }) => {
      return {
        valid: true,
        data: input,
      };
    }),

  /**
   * Validar paso 5: Servicios y Tareas
   */
  validateStep5: publicProcedure
    .input(step5Schema)
    .mutation(async ({ input }) => {
      // Validar que haya al menos un servicio
      if (input.serviceTypes.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Debe configurar al menos un servicio",
        });
      }
      return {
        valid: true,
        data: input,
      };
    }),

  /**
   * Validar paso 6: Alertas
   */
  validateStep6: publicProcedure
    .input(step6Schema)
    .mutation(async ({ input }) => {
      return {
        valid: true,
        data: input,
      };
    }),

  /**
   * Validar paso 7: Notificaciones y Calendario
   */
  validateStep7: publicProcedure
    .input(step7Schema)
    .mutation(async ({ input }) => {
      return {
        valid: true,
        data: input,
      };
    }),

  /**
   * Validar paso 8: Personalización (Branding)
   */
  validateStep8: publicProcedure
    .input(step8Schema)
    .mutation(async ({ input }) => {
      return {
        valid: true,
        data: input,
      };
    }),

  /**
   * Registro completo de nuevo partner
   * Este endpoint crea el partner, sus settings y el usuario administrador
   */
  completeRegistration: publicProcedure
    .input(completeRegistrationSchema)
    .mutation(async ({ input }) => {
      const database = await (await getDb())!.getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Extraer datos por sección (8 pasos)
      const {
        // Step 1: Información Básica
        slug,
        name,
        email,
        supportEmail,
        supportPhone,
        // Step 2: Datos Fiscales
        legalName,
        businessName,
        taxId,
        address,
        iban,
        bankName,
        // Step 3: Modo de Negocio
        businessMode,
        // Step 4: Cliente de Correo
        emailClientPreference,
        // Step 5: Servicios y Tareas
        serviceTypes,
        // Step 6: Alertas
        alerts,
        alertFrequency,
        // Step 7: Notificaciones y Calendario
        pushNotifications,
        emailNotifications,
        calendarSync,
        // Step 8: Personalización (Branding)
        brandName,
        logo,
        primaryColor,
        secondaryColor,
        // Usuario administrador
        adminUserName,
        adminUserEmail,
      } = input;

      // Verificaciones finales
      const [existingSlug] = await database
        .select({ id: partners.id })
        .from(partners)
        .where(eq(partners.slug, slug))
        .limit(1);

      if (existingSlug) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El slug ya está en uso",
        });
      }

      const [existingEmail] = await database
        .select({ id: partners.id })
        .from(partners)
        .where(eq(partners.email, email))
        .limit(1);

      if (existingEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El email del partner ya está en uso",
        });
      }

      // Iniciar transacción (simulada con múltiples inserts)
      try {
        // 1. Crear partner
        const partnerResult = await database.insert(partners).values({
          // Step 1: Información Básica
          slug,
          name,
          email,
          supportEmail,
          supportPhone,
          // Step 2: Datos Fiscales
          legalName,
          businessName,
          taxId,
          addressStreet: address?.street,
          addressPostalCode: address?.postalCode,
          addressCity: address?.city,
          addressProvince: address?.province,
          iban,
          bankName,
          // Step 3: Modo de Negocio
          businessMode,
          // Step 4: Cliente de Correo
          emailClientPreference,
          // Step 8: Personalización (Branding)
          brandName,
          logo,
          primaryColor,
          secondaryColor,
          // Legacy fields
          allowMultipleSuppliers: false,
          status: "active",
        });

        const partnerId = partnerResult[0].insertId;

        // 2. Crear settings del partner
        await database.insert(partnerSettings).values({
          partnerId,
          // Legacy fields
          ecommerceEnabled: false,
          autoOrderEnabled: false,
          autoOrderThreshold: 5,
          notificationEmail: email,
          maxUsers: null,
          maxOrganizations: null,
          // Step 6: Alertas
          alertPianoTuning: alerts?.pianoTuning ? 1 : 0,
          alertPianoRegulation: alerts?.pianoRegulation ? 1 : 0,
          alertPianoMaintenance: alerts?.pianoMaintenance ? 1 : 0,
          alertQuotesPending: alerts?.quotesPending ? 1 : 0,
          alertQuotesExpiring: alerts?.quotesExpiring ? 1 : 0,
          alertInvoicesPending: alerts?.invoicesPending ? 1 : 0,
          alertInvoicesOverdue: alerts?.invoicesOverdue ? 1 : 0,
          alertUpcomingAppointments: alerts?.upcomingAppointments ? 1 : 0,
          alertUnconfirmedAppointments: alerts?.unconfirmedAppointments ? 1 : 0,
          alertFrequency,
          // Step 7: Notificaciones y Calendario
          pushNotifications: pushNotifications ? 1 : 0,
          emailNotifications: emailNotifications ? 1 : 0,
          calendarSync,
        });

        // 3. Verificar si el usuario administrador ya existe
        const [existingUser] = await database
          .select()
          .from(users)
          .where(eq(users.email, adminUserEmail))
          .limit(1);

        let adminUserId: number;

        if (existingUser) {
          // Usuario ya existe, usar su ID
          // NO modificamos su partnerId porque podría pertenecer a otro partner
          // La relación multi-partner se maneja en partner_users
          adminUserId = existingUser.id;
          
          // Verificar si ya está asociado a este partner
          const [existingPartnerUser] = await database
            .select()
            .from(partnerUsers)
            .where(
              and(
                eq(partnerUsers.partnerId, partnerId),
                eq(partnerUsers.userId, adminUserId)
              )
            )
            .limit(1);
          
          if (existingPartnerUser) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Este usuario ya está asociado a este partner",
            });
          }
        } else {
          // Crear nuevo usuario
          // Nota: En producción, esto debería integrarse con Clerk
          const userResult = await database.insert(users).values({
            openId: `temp-${Date.now()}-${Math.random()}`, // Temporal, se actualizará con Clerk
            name: adminUserName,
            email: adminUserEmail,
            loginMethod: "clerk",
            role: "admin",
            partnerId, // Este es su partner principal
          });

          adminUserId = userResult[0].insertId;
        }

        // 4. Crear relación en partner_users
        await database.insert(partnerUsers).values({
          partnerId,
          userId: adminUserId,
          role: "owner",
          canManageBranding: true,
          canManagePricing: true,
          canManageUsers: true,
          canViewAnalytics: true,
        });

        // 5. Crear tipos de servicios y sus tareas (Step 5)
        if (serviceTypes && serviceTypes.length > 0) {
          for (const serviceType of serviceTypes) {
            // Insertar tipo de servicio
            const serviceTypeResult = await database.insert(serviceTypesTable).values({
              partnerId,
              name: serviceType.name,
              price: serviceType.price.toString(),
              duration: serviceType.duration,
              isActive: 1,
            });

            const serviceTypeId = serviceTypeResult[0].insertId;

            // Insertar tareas del servicio
            if (serviceType.tasks && serviceType.tasks.length > 0) {
              for (let i = 0; i < serviceType.tasks.length; i++) {
                await database.insert(serviceTasksTable).values({
                  serviceTypeId,
                  description: serviceType.tasks[i].description,
                  orderIndex: i,
                });
              }
            }
          }
        }

        // 6. Crear configuración de alertas con valores por defecto
        await database.insert(alertSettings).values({
          userId: adminUserId,
          partnerId,
          // Los valores por defecto se toman del schema
          // tuningPendingDays: 180,
          // tuningUrgentDays: 270,
          // regulationPendingDays: 730,
          // regulationUrgentDays: 1095,
          // etc.
          emailNotificationsEnabled: emailNotifications ? 1 : 0,
          pushNotificationsEnabled: pushNotifications ? 1 : 0,
          weeklyDigestEnabled: 1,
          weeklyDigestDay: 1,
          hasSeenAdvancedConfigTip: 0, // Se mostrará el banner en el dashboard
        });

        return {
          success: true,
          partnerId,
          userId: adminUserId,
          slug,
          message: "Partner registrado exitosamente",
        };
      } catch (error) {
        console.error("[Onboarding] Error during registration:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al registrar el partner. Por favor, intente nuevamente.",
        });
      }
    }),

  /**
   * Obtener estado del onboarding del usuario actual
   * Verifica si el usuario ya completó el onboarding
   */
  getOnboardingStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const database = await getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      if (!ctx.partnerId) {
        return {
          completed: false,
          hasPartner: false,
        };
      }

      // Verificar que el partner existe y está activo
      const [partner] = await database
        .select()
        .from(partners)
        .where(eq(partners.id, ctx.partnerId))
        .limit(1);

      if (!partner) {
        return {
          completed: false,
          hasPartner: false,
        };
      }

      // Verificar que el usuario es parte del partner
      const [partnerUser] = await database
        .select()
        .from(partnerUsers)
        .where(
          and(
            eq(partnerUsers.partnerId, ctx.partnerId),
            eq(partnerUsers.userId, ctx.user.id)
          )
        )
        .limit(1);

      return {
        completed: true,
        hasPartner: true,
        isPartnerUser: !!partnerUser,
        partnerStatus: partner.status,
        partnerName: partner.name,
        partnerSlug: partner.slug,
      };
    }),

  /**
   * Reenviar invitación de onboarding
   * Para usuarios que no completaron el proceso
   */
  resendInvitation: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      // Aquí se implementaría el envío de email
      // Por ahora solo retornamos éxito
      
      console.log(`[Onboarding] Resending invitation to ${input.email}`);
      
      return {
        success: true,
        message: "Invitación reenviada exitosamente",
      };
    }),
});
