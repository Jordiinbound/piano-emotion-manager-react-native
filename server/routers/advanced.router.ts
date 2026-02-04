/**
 * Advanced Router
 * Funcionalidades avanzadas (Team, CRM, Reports, Accounting, Shop, Calendar, Predictions, Chat)
 */
import { z } from "zod";
import { getClients } from "../db.js";
import { getServices } from "../db.js";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc.js";
import { getUserByClerkId } from "../db.js";
import { storageRouter } from "./storage/index.js";
import PredictionService from "../services/analytics/prediction.service.js";
import { getDb } from "../db.js";
import { predictionsRouter } from "./predictions/predictions.router.js";

// Funciones auxiliares para el chat
function generateSuggestions(message: string): string[] {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('cliente') || lowerMessage.includes('añadir')) {
    return ['Ver todos los clientes', 'Importar clientes', 'Tipos de cliente'];
  }
  if (lowerMessage.includes('factura') || lowerMessage.includes('cobrar')) {
    return ['Ver facturas pendientes', 'Crear presupuesto', 'Enviar recordatorio'];
  }
  if (lowerMessage.includes('cita') || lowerMessage.includes('servicio')) {
    return ['Ver calendario', 'Servicios pendientes', 'Historial de servicios'];
  }
  if (lowerMessage.includes('piano') || lowerMessage.includes('afinación')) {
    return ['Consejos de afinación', 'Mantenimiento preventivo', 'Problemas comunes'];
  }
  
  return ['Programar cita', 'Ver clientes', 'Crear factura', 'Ver reportes'];
}

function getFallbackResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('cita') || lowerMessage.includes('programar')) {
    return 'Para programar una cita, ve al Calendario desde el menú principal y pulsa el botón + para crear una nueva. Selecciona el cliente, piano, fecha y tipo de servicio.';
  }
  if (lowerMessage.includes('factura')) {
    return 'Para crear una factura, ve a Facturas desde el menú principal y pulsa el botón +. Selecciona el cliente, añade los servicios y guarda o envía directamente.';
  }
  if (lowerMessage.includes('cliente')) {
    return 'Para gestionar clientes, ve a Clientes desde el menú principal. Puedes añadir nuevos clientes, ver su historial y gestionar sus pianos.';
  }
  
  return 'Puedo ayudarte con la gestión de clientes, programación de citas, facturación y más. ¿Sobre qué tema necesitas ayuda?';
}

export const advancedRouter = router({
  // Team / Organization
  team: router({
    getMyOrganization: protectedProcedure.query(async () => null),
    createOrganization: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        taxId: z.string().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ input }) => ({ id: 1, ...input })),
    listMembers: protectedProcedure.query(async () => []),
    inviteMember: protectedProcedure
      .input(z.object({
        email: z.string().email(),
        role: z.enum(["admin", "manager", "senior_tech", "technician", "apprentice", "receptionist", "accountant", "viewer"]),
      }))
      .mutation(async () => ({ success: true, invitationId: "inv_123" })),
  }),

  // CRM
  crm: router({
    getClientProfile: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async () => null),
    getInteractions: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async () => []),
    getSegments: protectedProcedure.query(async () => []),
    getCampaigns: protectedProcedure.query(async () => []),
  }),

  // Reports
  reports: router({
    getDashboardMetrics: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async () => ({
        totalRevenue: 0,
        totalServices: 0,
        newClients: 0,
        avgServiceValue: 0,
        revenueByMonth: [],
        servicesByType: [],
        topClients: [],
      })),
  }),

  // Accounting
  accounting: router({
    getFinancialSummary: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().optional(),
      }))
      .query(async () => ({
        income: 0,
        expenses: 0,
        profit: 0,
        pendingInvoices: 0,
        taxDue: 0,
      })),
    getExpenses: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        category: z.string().optional(),
      }))
      .query(async () => []),
  }),

  // Shop
  shop: router({
    getStores: protectedProcedure.query(async () => []),
    getProducts: protectedProcedure
      .input(z.object({ storeId: z.number() }))
      .query(async () => []),
    getOrders: protectedProcedure
      .input(z.object({
        status: z.enum(["pending_approval", "approved", "processing", "shipped", "delivered", "cancelled"]).optional(),
      }))
      .query(async () => []),
  }),

  // Calendar Advanced
  calendarAdvanced: router({
    syncWithGoogle: protectedProcedure
      .input(z.object({ calendarId: z.string() }))
      .mutation(async () => ({ success: true, syncedEvents: 0 })),
    syncWithOutlook: protectedProcedure
      .input(z.object({ calendarId: z.string() }))
      .mutation(async () => ({ success: true, syncedEvents: 0 })),
    getAvailability: protectedProcedure
      .input(z.object({
        date: z.string(),
        technicianId: z.string().optional(),
      }))
      .query(async () => []),
  }),

  // Predictions - Analíticas predictivas locales (sin coste de API)
  // TEMPORALMENTE DESHABILITADO - Queries SQL con errores de nomenclatura
  /* predictions: router({
    getSummary: protectedProcedure.query(async ({ ctx }) => {
      console.log('[DEBUG] getSummary called for partnerId:', ctx.user.partnerId);
      try {
        const db = await getDb();
        console.log('[DEBUG] Database instance obtained');
        const service = new PredictionService(db);
        console.log('[DEBUG] PredictionService instantiated');
        const summary = await service.getPredictionsSummary(ctx.user.partnerId.toString());
        console.log('[DEBUG] Summary received:', JSON.stringify(summary, null, 2));
        return summary;
      } catch (error) {
        console.error('[Predictions] Error getting summary:', error);
        // Retornar datos vacíos en caso de error
        return {
          revenue: {
            predictions: [],
            trend: 'stable' as const,
            nextMonthValue: 0,
          },
          clientChurn: {
            atRiskCount: 0,
            highRiskCount: 0,
            topRiskClients: [],
          },
          maintenance: {
            upcomingCount: 0,
            thisMonth: 0,
            predictions: [],
          },
          workload: {
            predictions: [],
            busiestWeek: null,
          },
          inventory: {
            urgentItems: 0,
            predictions: [],
          },
          generatedAt: new Date(),
        };
      }
    }),

    getRevenue: protectedProcedure
      .input(z.object({
        months: z.number().min(1).max(12).optional().default(3),
      }))
      .query(async ({ input }) => {
        const predictions = [];
        const now = new Date();
        
        for (let i = 1; i <= input.months; i++) {
          const targetMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
          predictions.push({
            type: 'revenue' as const,
            period: targetMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
            value: 0,
            confidence: 0,
            trend: 'stable' as const,
            factors: ['Datos insuficientes para predicción'],
            recommendations: ['Registra más servicios para obtener predicciones precisas'],
          });
        }
        return predictions;
      }),

    getChurnRisk: protectedProcedure.query(async () => []),

    getMaintenance: protectedProcedure.query(async () => []),

    getWorkload: protectedProcedure
      .input(z.object({
        weeks: z.number().min(1).max(12).optional().default(4),
      }))
      .query(async ({ input }) => {
        const predictions = [];
        const now = new Date();
        
        for (let w = 0; w < input.weeks; w++) {
          const weekStart = new Date(now.getTime() + w * 7 * 24 * 60 * 60 * 1000);
          predictions.push({
            week: `Semana del ${weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`,
            scheduledAppointments: 0,
            estimatedTotal: 0,
            busyDays: [],
            recommendation: 'Sin datos suficientes',
          });
        }
        return predictions;
      }),

    getInventoryDemand: protectedProcedure.query(async () => []),
  }), */

  // Chat con IA usando Gemini
  chat: router({
    sendMessage: protectedProcedure
      .input(z.object({
        message: z.string().min(1).max(2000),
        context: z.object({
          clientCount: z.number().optional(),
          pendingServices: z.number().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          // ✅ VERIFICAR LÍMITES DE SUSCRIPCIÓN
          const { requireAIFeature, recordAIUsage } = await import('../_core/subscription-middleware.js');
          const { usage, limit } = await requireAIFeature(ctx.user.id, 'chat');
          
          const { pianoAssistantChat } = await import('../_core/gemini.js');
          
          const clients = await getClients(ctx.user.id);
          const services = await getServices(ctx.user.id);
          const pendingServices = services.filter(s => s.status === 'scheduled').length;
          
          const response = await pianoAssistantChat(input.message, {
            userName: ctx.user.name || undefined,
            clientCount: clients.length,
            pendingServices,
          }, ctx.language);
          
          // ✅ REGISTRAR USO
          await recordAIUsage(ctx.user.id, 'chat', response?.tokensUsed || 0 || 0);
          
          return {
            success: true,
            response: (response as any).text || response || response,
            suggestions: generateSuggestions(input.message),
            usage: {
              current: usage + 1,
              limit,
              remaining: limit - usage - 1,
            },
          };
        } catch (error) {
          // Si es un error de límites, lanzarlo
          if (error instanceof Error && error.message.includes('límite')) {
            throw error;
          }
          
          return {
            success: false,
            response: getFallbackResponse(input.message),
            suggestions: ['Programar cita', 'Ver clientes', 'Crear factura'],
          };
        }
      }),

    checkAvailability: protectedProcedure.query(async () => {
      try {
        const { checkGeminiAvailability } = await import('../_core/gemini.js');
        const available = await checkGeminiAvailability();
        return { available, provider: 'gemini' };
      } catch {
        return { available: false, provider: 'none' };
      }
    }),
  }),

  // Cloud Storage
  storage: storageRouter,

  // Stripe Subscriptions
  subscription: router({
    createCheckout: protectedProcedure
      .input(z.object({
        plan: z.enum(['PROFESSIONAL', 'PREMIUM_IA']),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        console.log('[createCheckout DEBUG] ctx.user:', JSON.stringify(ctx.user, null, 2));
        console.log('[createCheckout DEBUG] input:', JSON.stringify(input, null, 2));
        try {
          const { createCheckoutSession, STRIPE_PRICES } = await import('../_core/stripe.js');
          
          const priceId = input.plan === 'PREMIUM_IA' 
            ? STRIPE_PRICES.PREMIUM_IA 
            : STRIPE_PRICES.PROFESSIONAL;
          
          const session = await createCheckoutSession({
            priceId,
            userId: ctx.user.id,
            userEmail: ctx.user.email || '',
            successUrl: input.successUrl,
            cancelUrl: input.cancelUrl,
          });
          
          return session;
        } catch (error) {
          console.error('[createCheckout] Error:', error);
          throw new Error(`No se pudo crear la sesión de pago: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }),

    getCurrentPlan: protectedProcedure.query(async ({ ctx }) => {
      console.log('[getCurrentPlan] ctx.user:', { id: ctx.user.id, clerkId: ctx.user.clerkId, email: ctx.user.email });
      const user = await getUserByClerkId(ctx.user.clerkId);
      console.log('[getCurrentPlan] user found:', { id: (user as any)?.id, clerkId: (user as any)?.clerkId, subscriptionPlan: (user as any)?.subscriptionPlan });
      return {
        plan: (user as Record<string, unknown>)?.subscriptionPlan || 'FREE',
        status: (user as Record<string, unknown>)?.subscriptionStatus || 'inactive',
        expiresAt: (user as Record<string, unknown>)?.subscriptionExpiresAt || null,
      };
    }),

    createPortal: protectedProcedure
      .input(z.object({
        returnUrl: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const { createPortalSession } = await import('../_core/stripe.js');
          const user = await getUserByClerkId(ctx.user.clerkId);
          
          if (!(user as Record<string, unknown>)?.stripeCustomerId) {
            throw new Error('No tienes una suscripción activa');
          }
          
          const session = await createPortalSession({
            customerId: (user as Record<string, unknown>).stripeCustomerId as string,
            returnUrl: input.returnUrl,
          });
          
          return session;
        } catch (error) {
          console.error('[createPortal] Error:', error);
          throw new Error(`No se pudo acceder al portal de suscripción: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }),

    getPlans: publicProcedure.query(() => {
      console.log('[DEBUG] getPlans endpoint called');
      return [
        {
          id: 'FREE',
          name: 'Plan Gratuito',
          price: 0,
          currency: 'EUR',
          interval: 'year',
          limits: {
            clients: 100,
            pianos: 200,
            servicesPerMonth: 100,
            invoicesPerMonth: 100,
            storage: '500 MB',
          },
          features: [
            'Hasta 100 clientes',
            'Hasta 200 pianos',
            'Hasta 100 servicios/mes',
            'Hasta 100 facturas/mes',
            'Calendario completo',
            'Inventario básico',
            'Recordatorios',
            'Contratos',
            'Mapa de clientes',
            'Rutas',
            'Importar/Exportar',
            '500 MB almacenamiento',
          ],
        },
        {
          id: 'PROFESSIONAL',
          name: 'Plan Pro',
          price: 30,
          currency: 'EUR',
          interval: 'year',
          priceId: 'price_1SiNNrDpmJIxYFlvPsgsL3iX',
          limits: {
            clients: -1,
            pianos: -1,
            servicesPerMonth: -1,
            invoicesPerMonth: -1,
            storage: '2 GB',
          },
          features: [
            'Todo lo del Plan Gratuito',
            'Clientes ilimitados',
            'Pianos ilimitados',
            'Servicios ilimitados',
            'Facturas ilimitadas',
            'Comunicaciones (WhatsApp, Email)',
            'Marketing y campañas',
            'CRM avanzado',
            'Equipos (multi-técnico)',
            'Contabilidad',
            'Analytics avanzados',
            'Portal de clientes',
            'Automatizaciones básicas',
            'Sync Google/Outlook',
            'Pasarelas de pago',
            '2 GB almacenamiento',
            'Soporte prioritario por email',
          ],
        },
        {
          id: 'PREMIUM_IA',
          name: 'Plan Premium',
          price: 50,
          currency: 'EUR',
          interval: 'year',
          priceId: 'price_1SiMu2DpmJIxYFlv3ZHbLKBg',
          limits: {
            clients: -1,
            pianos: -1,
            servicesPerMonth: -1,
            invoicesPerMonth: -1,
            storage: '5 GB',
          },
          features: [
            'Todo lo del Plan Pro',
            'Asistente de chat con IA (Gemini)',
            'Predicciones con IA',
            'Generación automática de emails',
            'Informes de servicio con IA',
            'Análisis de riesgo de clientes',
            'Sugerencias de precios inteligentes',
            'Workflows avanzados',
            'Marca blanca (tienda exclusiva)',
            'API personalizada',
            '5 GB almacenamiento',
            'Soporte prioritario por email',
          ],
        },
      ];
    }),
  }),
});
