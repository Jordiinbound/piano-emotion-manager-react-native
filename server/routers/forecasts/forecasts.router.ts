/**
 * Router de Previsiones
 * Piano Emotion Manager
 * 
 * Endpoints para analíticas predictivas
 */

import { router, protectedProcedure, publicProcedure } from '../../_core/trpc.js';
import { z } from 'zod';
import ForecastService from '../../services/analytics/forecast.service.js';
import { getDb } from '../../db.js';

// Lazy initialization of forecast service
let forecastService: ForecastService | null = null;

async function getForecastService() {
  if (!forecastService) {
    const db = await getDb();
    forecastService = new ForecastService(db);
  }
  return forecastService;
}

export const forecastsRouter = router({
  /**
   * Obtiene previsión de ingresos para los próximos meses
   */
  getRevenue: protectedProcedure
    .input(z.object({
      months: z.number().min(1).max(12).default(3),
    }))
    .query(async ({ ctx, input }) => {
      console.log('[forecasts.getRevenue] ctx.partnerId:', ctx.partnerId, 'type:', typeof ctx.partnerId);
      console.log('[forecasts.getRevenue] ctx.user:', ctx.user ? { id: ctx.user.id, email: ctx.user.email } : null);
      const service = await getForecastService();
      const forecasts = await service.forecastRevenue(
        ctx.partnerId,
        input.months
      );
      console.log('[forecasts.getRevenue] forecasts result:', forecasts);
      return forecasts;
    }),

  /**
   * Obtiene clientes en riesgo de pérdida (churn)
   */
  getChurnRisk: protectedProcedure
    .query(async ({ ctx }) => {
      console.log('[forecasts.getChurnRisk] ctx.partnerId:', ctx.partnerId, 'type:', typeof ctx.partnerId);
      const service = await getForecastService();
      const risks = await service.forecastClientChurn(ctx.partnerId);
      console.log('[forecasts.getChurnRisk] risks result:', risks);
      return risks;
    }),

  /**
   * Obtiene previsión de necesidades de mantenimiento
   */
  getMaintenance: protectedProcedure
    .query(async ({ ctx }) => {
      const service = await getForecastService();
      const forecasts = await service.forecastMaintenance(ctx.partnerId);
      return forecasts;
    }),

  /**
   * Obtiene previsión de carga de trabajo
   */
  getWorkload: protectedProcedure
    .input(z.object({
      weeks: z.number().min(1).max(12).default(4),
    }))
    .query(async ({ ctx, input }) => {
      const service = await getForecastService();
      const forecasts = await service.forecastWorkload(
        ctx.partnerId,
        input.weeks
      );
      return forecasts;
    }),

  /**
   * Obtiene previsión de demanda de inventario
   */
  getInventoryDemand: protectedProcedure
    .query(async ({ ctx }) => {
      const service = await getForecastService();
      const forecasts = await service.forecastInventoryDemand(ctx.partnerId);
      return forecasts;
    }),

  /**
   * Obtiene resumen completo de todas las previsiones
   */
  getSummary: protectedProcedure
    .query(async ({ ctx }) => {
      const service = await getForecastService();
      const summary = await service.getForecastsSummary(ctx.partnerId);
      return summary;
    }),

  /**
   * DEBUG: Muestra el contexto completo
   */
  debugContext: protectedProcedure
    .query(async ({ ctx }) => {
      return {
        hasUser: !!ctx.user,
        userId: ctx.user?.id,
        userEmail: ctx.user?.email,
        userName: ctx.user?.name,
        partnerId: ctx.partnerId,
        partnerIdType: typeof ctx.partnerId,
        language: ctx.language,
        userObject: ctx.user ? {
          id: ctx.user.id,
          email: ctx.user.email,
          name: ctx.user.name,
          openId: ctx.user.openId,
          role: ctx.user.role,
        } : null,
      };
    }),

  /**
   * DEBUG: Verifica datos históricos de servicios
   * Actualizado: 2026-02-04 - Fix ctx.partnerId
   */
  debugHistoricalData: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      
      // Query 1: Total de servicios
      const totalResult = await db.execute(
        'SELECT COUNT(*) as total FROM services WHERE partnerId = ?',
        [ctx.partnerId]
      );
      
      // Query 2: Servicios por mes (últimos 12 meses)
      const monthlyResult = await db.execute(`
        SELECT 
          DATE_FORMAT(date, '%Y-%m-01') as month,
          COALESCE(SUM(cost), 0) as total,
          COUNT(*) as service_count
        FROM services
        WHERE partnerId = ?
          AND date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(date, '%Y-%m-01')
        ORDER BY month
      `, [ctx.partnerId]);
      
      // Query 3: Rango de fechas
      const dateRangeResult = await db.execute(`
        SELECT 
          MIN(date) as first_service,
          MAX(date) as last_service,
          TIMESTAMPDIFF(MONTH, MIN(date), MAX(date)) as months_of_data
        FROM services
        WHERE partnerId = ?
      `, [ctx.partnerId]);
      
      return {
        partnerId: ctx.partnerId,
        totalServices: totalResult.rows?.[0],
        monthlyData: monthlyResult.rows,
        dateRange: dateRangeResult.rows?.[0],
      };
    }),

  /**
   * DEBUG: Verificar datos de clientes con email y teléfono
   */
  debugClientData: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      
      const result = await db.execute(`
        SELECT 
          id,
          name,
          email,
          phone,
          createdAt
        FROM clients
        WHERE partnerId = ?
        ORDER BY name
        LIMIT 20
      `, [ctx.partnerId]);
      
      return {
        partnerId: ctx.partnerId,
        clients: result.rows,
        totalClients: result.rows?.length || 0,
      };
    }),

  /**
   * DEBUG: Poblar email y teléfono para clientes que no los tengan
   */
  populateClientContacts: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      
      // Obtener clientes sin email o teléfono
      const clientsResult = await db.execute(`
        SELECT id, name, email, phone
        FROM clients
        WHERE partnerId = ?
          AND (email IS NULL OR email = '' OR phone IS NULL OR phone = '')
      `, [ctx.partnerId]);
      
      const updates = [];
      
      for (const client of clientsResult.rows || []) {
        const clientData = client as any;
        const needsEmail = !clientData.email || clientData.email === '';
        const needsPhone = !clientData.phone || clientData.phone === '';
        
        if (needsEmail || needsPhone) {
          // Generar email y teléfono basados en el nombre del cliente
          const sanitizedName = clientData.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
            .replace(/[^a-z0-9\s]/g, '') // Eliminar caracteres especiales
            .replace(/\s+/g, ''); // Eliminar espacios
          
          const newEmail = needsEmail ? `${sanitizedName}@example.com` : clientData.email;
          const newPhone = needsPhone ? `+34 ${Math.floor(600000000 + Math.random() * 99999999)}` : clientData.phone;
          
          await db.execute(`
            UPDATE clients
            SET email = ?, phone = ?
            WHERE id = ?
          `, [newEmail, newPhone, clientData.id]);
          
          updates.push({
            id: clientData.id,
            name: clientData.name,
            oldEmail: clientData.email,
            newEmail,
            oldPhone: clientData.phone,
            newPhone,
          });
        }
      }
      
      return {
        partnerId: ctx.partnerId,
        totalUpdated: updates.length,
        updates,
      };
    }),

  /**
   * DEBUG: Crear movimientos de inventario del último año
   */
  populateInventoryMovements: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      
      // Obtener todos los items de inventario
      const inventoryResult = await db.execute(`
        SELECT id, name, quantity
        FROM inventory
        WHERE partnerId = ?
      `, [ctx.partnerId]);
      
      const movements = [];
      const now = new Date();
      
      // Crear movimientos de salida (type='out') para los últimos 12 meses
      for (const item of inventoryResult.rows || []) {
        const itemData = item as any;
        
        // Generar entre 5-15 movimientos por item en el último año
        const numMovements = Math.floor(5 + Math.random() * 10);
        
        for (let i = 0; i < numMovements; i++) {
          // Fecha aleatoria en los últimos 12 meses
          const daysAgo = Math.floor(Math.random() * 365);
          const movementDate = new Date(now);
          movementDate.setDate(movementDate.getDate() - daysAgo);
          
          // Cantidad aleatoria entre 1 y 10
          const quantity = Math.floor(1 + Math.random() * 10);
          
          await db.execute(`
            INSERT INTO inventory_movements (inventoryId, type, quantity, createdAt, updatedAt)
            VALUES (?, 'out', ?, ?, ?)
          `, [itemData.id, quantity, movementDate, movementDate]);
          
          movements.push({
            inventoryId: itemData.id,
            itemName: itemData.name,
            quantity,
            date: movementDate.toISOString(),
          });
        }
      }
      
      return {
        partnerId: ctx.partnerId,
        totalItems: inventoryResult.rows?.length || 0,
        totalMovements: movements.length,
        movements: movements.slice(0, 20), // Mostrar solo los primeros 20
      };
    }),

  /**
   * TEMP PUBLIC: Poblar contactos de clientes (SIN AUTENTICACIÓN)
   */
  tempPopulateContacts: publicProcedure
    .input(z.object({ partnerId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      const clientsResult = await db.execute(`
        SELECT id, name, email, phone
        FROM clients
        WHERE partnerId = ?
          AND (email IS NULL OR email = '' OR phone IS NULL OR phone = '')
      `, [input.partnerId]);
      
      const updates = [];
      
      for (const client of clientsResult.rows || []) {
        const clientData = client as any;
        const needsEmail = !clientData.email || clientData.email === '';
        const needsPhone = !clientData.phone || clientData.phone === '';
        
        if (needsEmail || needsPhone) {
          const sanitizedName = clientData.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '');
          
          const newEmail = needsEmail ? `${sanitizedName}@example.com` : clientData.email;
          const newPhone = needsPhone ? `+34 ${Math.floor(600000000 + Math.random() * 99999999)}` : clientData.phone;
          
          await db.execute(`
            UPDATE clients
            SET email = ?, phone = ?
            WHERE id = ?
          `, [newEmail, newPhone, clientData.id]);
          
          updates.push({
            id: clientData.id,
            name: clientData.name,
            newEmail,
            newPhone,
          });
        }
      }
      
      return {
        success: true,
        totalUpdated: updates.length,
        updates: updates.slice(0, 10),
      };
    }),

  /**
   * TEMP PUBLIC: Crear movimientos de inventario (SIN AUTENTICACIÓN)
   */
  tempPopulateMovements: publicProcedure
    .input(z.object({ partnerId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      const inventoryResult = await db.execute(`
        SELECT id, name, quantity
        FROM inventory
        WHERE partnerId = ?
      `, [input.partnerId]);
      
      const movements = [];
      const now = new Date();
      
      for (const item of inventoryResult.rows || []) {
        const itemData = item as any;
        const numMovements = Math.floor(5 + Math.random() * 10);
        
        for (let i = 0; i < numMovements; i++) {
          const daysAgo = Math.floor(Math.random() * 365);
          const movementDate = new Date(now);
          movementDate.setDate(movementDate.getDate() - daysAgo);
          const quantity = Math.floor(1 + Math.random() * 10);
          
          await db.execute(`
            INSERT INTO inventory_movements (inventoryId, type, quantity, createdAt, updatedAt)
            VALUES (?, 'out', ?, ?, ?)
          `, [itemData.id, quantity, movementDate, movementDate]);
          
          movements.push({
            inventoryId: itemData.id,
            itemName: itemData.name,
            quantity,
          });
        }
      }
      
      return {
        success: true,
        totalItems: inventoryResult.rows?.length || 0,
        totalMovements: movements.length,
      };
    }),
});
