/**
 * Router de Tienda
 * Piano Emotion Manager
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../../trpc.js';
import { shopOrders } from '../../../drizzle/shop-schema.js';
import { createShopService } from '../../services/shop/index.js';
import { getDb } from "../../db.js";
import { 
  shopProducts, 
  shopStockAlerts,
  shopTierConfig,
  shopPurchaseTracking
} from '../../../drizzle/shop-schema.js';
import { distributorWooCommerceConfig } from '../../../drizzle/distributor-schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { WooCommerceProductsService } from '../../services/shop/woocommerce-products.service.js';
import { WordPressBlogService } from '../../services/shop/wordpress-blog.service.js';
import { StockMonitoringService } from '../../services/shop/stock-monitoring.service.js';

// ============================================================================
// Input Schemas
// ============================================================================

const shopInputSchema = z.object({
  name: z.string(),
  type: z.enum(['distributor', 'external']),
  description: z.string().optional(),
  url: z.string().optional(),
  apiEndpoint: z.string().optional(),
  apiKey: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  requiresApproval: z.boolean().optional(),
  approvalThreshold: z.number().optional(),
  logoUrl: z.string().optional(),
  color: z.string().optional(),
});

const shippingAddressSchema = z.object({
  name: z.string(),
  street: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  phone: z.string().optional(),
});

const permissionSchema = z.object({
  role: z.string(),
  canView: z.boolean(),
  canOrder: z.boolean(),
  canApprove: z.boolean(),
  maxOrderAmount: z.number().optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Obtiene el rol de organización del usuario
 */
async function getUserOrganizationRole(userId: number, partnerId: number | null): Promise<string> {
  try {
    console.log('[getUserOrganizationRole] START - userId:', userId, 'partnerId:', partnerId);
    
    // Si no hay partnerId, usar 'owner' como fallback
    if (!partnerId) {
      console.log('[getUserOrganizationRole] No partnerId, returning owner');
      return 'owner';
    }
    
    const database = await getDb();
    console.log('[getUserOrganizationRole] Database obtained');
    
    const { organizationMembers } = await import('../../../drizzle/schema.js');
    
    const [member] = await database
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, partnerId)
        )
      )
      .limit(1);
    
    const role = member?.organizationRole || 'owner';
    console.log('[getUserOrganizationRole] Role found:', role);
    return role;
  } catch (error) {
    console.error('[getUserOrganizationRole] ERROR:', error);
    // Fallback seguro en caso de error
    return 'owner';
  }
}

// ============================================================================
// Router
// ============================================================================

export const shopRouter = router({
  // ============================================================================
  // Shops
  // ============================================================================

  /**
   * Obtiene tiendas accesibles
   */
  getShops: protectedProcedure.query(async ({ ctx }) => {
    try {
      console.log('[getShops] START');
      console.log('[getShops] ctx.user:', JSON.stringify(ctx.user));
      console.log('[getShops] partnerId:', ctx.user.partnerId);
      console.log('[getShops] userId:', ctx.user.id);
      
      const orgRole = await getUserOrganizationRole(ctx.user.id, ctx.user.partnerId);
      console.log('[getShops] orgRole obtained:', orgRole);
      
      const service = createShopService(ctx.user.partnerId, ctx.user.id, orgRole);
      console.log('[getShops] service created');
      
      const shops = await service.getAccessibleShops();
      console.log('[getShops] shops found:', shops?.length || 0);
      console.log('[getShops] shops:', JSON.stringify(shops));
      
      return shops;
    } catch (error) {
      console.error('[getShops] ERROR:', error);
      throw error;
    }
  }),

  /**
   * Crea una tienda (admin only)
   */
  createShop: protectedProcedure
    .input(shopInputSchema)
    .mutation(async ({ ctx, input }) => {
      const orgRole = await getUserOrganizationRole(ctx.user.id, ctx.user.partnerId);
      const service = createShopService(ctx.user.partnerId, ctx.user.id, orgRole);
      return service.createShop(input);
    }),

  /**
   * Actualiza permisos de tienda (admin only)
   */
  updatePermissions: protectedProcedure
    .input(z.object({
      shopId: z.number(),
      permissions: z.array(permissionSchema),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgRole = await getUserOrganizationRole(ctx.user.id, ctx.user.partnerId);
      const service = createShopService(ctx.user.partnerId, ctx.user.id, orgRole);
      await service.updateShopPermissions(input.shopId, input.permissions);
      return { success: true };
    }),

  /**
   * Verifica acceso a tienda
   */
  checkAccess: protectedProcedure
    .input(z.object({ shopId: z.number() }))
    .query(async ({ ctx, input }) => {
      const orgRole = await getUserOrganizationRole(ctx.user.id, ctx.user.partnerId);
      const service = createShopService(ctx.user.partnerId, ctx.user.id, orgRole);
      return service.checkShopAccess(input.shopId);
    }),

  // ============================================================================
  // Products
  // ============================================================================

  /**
   * Obtiene productos de una tienda
   */
  getProducts: protectedProcedure
    .input(z.object({
      shopId: z.number(),
      category: z.string().optional(),
      search: z.string().optional(),
      page: z.number().optional(),
      pageSize: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const orgRole = await getUserOrganizationRole(ctx.user.id, ctx.user.partnerId);
      const service = createShopService(ctx.user.partnerId, ctx.user.id, orgRole);
      return service.getProducts(input.shopId, {
        category: input.category,
        search: input.search,
        page: input.page,
        pageSize: input.pageSize,
      });
    }),

  // ============================================================================
  // Cart
  // ============================================================================

  /**
   * Obtiene contenido del carrito
   */
  getCart: protectedProcedure
    .input(z.object({ shopId: z.number() }))
    .query(async ({ ctx, input }) => {
      const orgRole = await getUserOrganizationRole(ctx.user.id, ctx.user.partnerId);
      const service = createShopService(ctx.user.partnerId, ctx.user.id, orgRole);
      return service.getCartContents(input.shopId);
    }),

  /**
   * Añade producto al carrito
   */
  addToCart: protectedProcedure
    .input(z.object({
      shopId: z.number(),
      productId: z.number(),
      quantity: z.number().optional().default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgRole = await getUserOrganizationRole(ctx.user.id, ctx.user.partnerId);
      const service = createShopService(ctx.user.partnerId, ctx.user.id, orgRole);
      await service.addToCart(input.shopId, input.productId, input.quantity);
      return { success: true };
    }),

  // ============================================================================
  // Orders
  // ============================================================================

  /**
   * Crea pedido desde carrito (en estado draft)
   */
  createOrder: protectedProcedure
    .input(z.object({
      shopId: z.number(),
      shippingAddress: shippingAddressSchema,
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgRole = await getUserOrganizationRole(ctx.user.id, ctx.user.partnerId);
      const service = createShopService(ctx.user.partnerId, ctx.user.id, orgRole);
      return service.createOrderFromCart(input.shopId, input.shippingAddress, input.notes);
    }),

  /**
   * Confirmar pedido (técnico confirma antes de hacerse efectivo)
   */
  confirmOrder: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const orgRole = await getUserOrganizationRole(ctx.user.id, ctx.user.partnerId);
      const service = createShopService(ctx.user.partnerId, ctx.user.id, orgRole);
      return service.confirmOrder(input.orderId);
    }),

  /**
   * Obtiene pedidos
   */
  getOrders: protectedProcedure
    .input(z.object({
      status: z.enum(['draft', 'pending', 'approved', 'ordered', 'shipped', 'delivered', 'cancelled']).optional(),
      shopId: z.number().optional(),
      page: z.number().optional(),
      pageSize: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const orgRole = await getUserOrganizationRole(ctx.user.id, ctx.user.partnerId);
      const service = createShopService(ctx.user.partnerId, ctx.user.id, orgRole);
      return service.getOrders(input);
    }),

  /**
   * Obtiene pedidos pendientes de aprobación
   */
  getPendingApprovals: protectedProcedure.query(async ({ ctx }) => {
    const orgRole = await getUserOrganizationRole(ctx.user.id, ctx.user.partnerId);
      const service = createShopService(ctx.user.partnerId, ctx.user.id, orgRole);
    return service.getPendingApprovals();
  }),

  /**
   * Obtiene pedidos en estado draft (pendientes de confirmación del técnico)
   */
  getDraftOrders: protectedProcedure.query(async ({ ctx }) => {
    const database = await getDb();
      if (!database) {
        throw new Error('Database not available');
      }
    const orders = await db
      .select()
      .from(shopOrders)
      .where(
        and(
          eq(shopOrders.organizationId, ctx.user.partnerId),
          eq(shopOrders.createdBy, ctx.user.id),
          eq(shopOrders.status, 'draft')
        )
      )
      .orderBy(desc(shopOrders.createdAt));
    
    return orders;
  }),

  /**
   * Aprueba un pedido
   */
  approveOrder: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const orgRole = await getUserOrganizationRole(ctx.user.id, ctx.user.partnerId);
      const service = createShopService(ctx.user.partnerId, ctx.user.id, orgRole);
      await service.approveOrder(input.orderId);
      return { success: true };
    }),

  /**
   * Rechaza un pedido
   */
  rejectOrder: protectedProcedure
    .input(z.object({
      orderId: z.number(),
      reason: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgRole = await getUserOrganizationRole(ctx.user.id, ctx.user.partnerId);
      const service = createShopService(ctx.user.partnerId, ctx.user.id, orgRole);
      await service.rejectOrder(input.orderId, input.reason);
      return { success: true };
    }),

  /**
   * Cancela un pedido en estado draft
   */
  cancelDraftOrder: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verificar que el pedido existe y está en draft
      const database = await getDb();
      if (!database) {
        throw new Error('Database not available');
      }
      const [order] = await db
        .select()
        .from(shopOrders)
        .where(
          and(
            eq(shopOrders.id, input.orderId),
            eq(shopOrders.organizationId, ctx.user.partnerId),
            eq(shopOrders.createdBy, ctx.user.id),
            eq(shopOrders.status, 'draft')
          )
        )
        .limit(1);
      
      if (!order) {
        throw new Error('Pedido no encontrado o no se puede cancelar');
      }
      
      // Cancelar pedido
      await db
        .update(shopOrders)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(shopOrders.id, input.orderId));
      
      return { success: true };
    }),

  /**
   * Verifica si puede hacer pedido
   */
  canPlaceOrder: protectedProcedure
    .input(z.object({
      shopId: z.number(),
      total: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const orgRole = await getUserOrganizationRole(ctx.user.id, ctx.user.partnerId);
      const service = createShopService(ctx.user.partnerId, ctx.user.id, orgRole);
      return service.canPlaceOrder(input.shopId, input.total);
    }),

  // ============================================================================
  // WooCommerce Integration
  // ============================================================================

  /**
   * Sincronizar productos desde WooCommerce
   */
  syncProducts: protectedProcedure
    .input(z.object({ shopId: z.number() }))
    .mutation(async ({ input }) => {
      // Obtener configuración de WooCommerce
      const database = await getDb();
      if (!database) {
        throw new Error('Database not available');
      }
      const [wooConfig] = await db
        .select()
        .from(distributorWooCommerceConfig)
        .limit(1);
      
      if (!wooConfig || !wooConfig.consumerKey || !wooConfig.consumerSecret) {
        throw new Error('Credenciales de WooCommerce no configuradas');
      }
      
      const wooService = new WooCommerceProductsService(
        wooConfig.url,
        wooConfig.consumerKey,
        wooConfig.consumerSecret
      );
      
      const products = await wooService.getProducts({ per_page: 100 });
      
      let syncedCount = 0;
      for (const product of products) {
        const database = await getDb();
      if (!database) {
        throw new Error('Database not available');
      }
        const [existing] = await db
          .select()
          .from(shopProducts)
          .where(
            and(
              eq(shopProducts.shopId, input.shopId),
              eq(shopProducts.externalId, product.externalId)
            )
          )
          .limit(1);
        
        if (existing) {
          await db
            .update(shopProducts)
            .set({
              name: product.name,
              description: product.description,
              category: product.category,
              price: product.price.toString(),
              inStock: product.inStock,
              stockQuantity: product.stockQuantity,
              imageUrl: product.imageUrl,
              images: JSON.stringify(product.images),
              lastSyncAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(shopProducts.id, existing.id));
        } else {
          await db
            .insert(shopProducts)
            .values({
              shopId: input.shopId,
              externalId: product.externalId,
              sku: product.sku,
              name: product.name,
              description: product.description,
              category: product.category,
              price: product.price.toString(),
              currency: product.currency,
              inStock: product.inStock,
              stockQuantity: product.stockQuantity,
              imageUrl: product.imageUrl,
              images: JSON.stringify(product.images),
              lastSyncAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            });
        }
        syncedCount++;
      }
      
      return { success: true, syncedCount, totalProducts: products.length };
    }),

  // ============================================================================
  // Stock Monitoring
  // ============================================================================

  /**
   * Verificar stock de inventario y generar alertas
   */
  checkInventoryStock: protectedProcedure.mutation(async ({ ctx }) => {
    const stockService = new StockMonitoringService();
    const alerts = await stockService.checkAllInventory(ctx.user.partnerId);
    return alerts;
  }),

  /**
   * Obtener alertas de stock activas
   */
  getStockAlerts: protectedProcedure.query(async ({ ctx }) => {
    const database = await getDb();
      if (!database) {
        throw new Error('Database not available');
      }
    const alerts = await db
      .select()
      .from(shopStockAlerts)
      .where(
        and(
          eq(shopStockAlerts.organizationId, ctx.user.partnerId),
          eq(shopStockAlerts.isResolved, false)
        )
      )
      .orderBy(desc(shopStockAlerts.createdAt));
    
    return alerts;
  }),

  /**
   * Resolver alerta de stock
   */
  resolveAlert: protectedProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ input }) => {
      const stockService = new StockMonitoringService();
      await stockService.resolveAlert(input.alertId);
      return { success: true };
    }),

  /**
   * Vincular producto de tienda con item de inventario
   */
  linkProductToInventory: protectedProcedure
    .input(z.object({
      shopProductId: z.number(),
      inventoryId: z.number(),
      lowStockThreshold: z.number(),
      reorderQuantity: z.number(),
      autoReorderEnabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const stockService = new StockMonitoringService();
      await stockService.linkProductToInventory(
        input.shopProductId,
        input.inventoryId,
        {
          lowStockThreshold: input.lowStockThreshold,
          reorderQuantity: input.reorderQuantity,
          autoReorderEnabled: input.autoReorderEnabled,
        }
      );
      return { success: true };
    }),

  // ============================================================================
  // Tiers & Purchase Tracking
  // ============================================================================

  /**
   * Obtener tier actual del usuario
   */
  getCurrentTier: protectedProcedure.query(async ({ ctx }) => {
    const database = await getDb();
      if (!database) {
        throw new Error('Database not available');
      }
    const [tracking] = await db
      .select()
      .from(shopPurchaseTracking)
      .where(eq(shopPurchaseTracking.organizationId, ctx.user.partnerId))
      .limit(1);
    
    if (!tracking || !tracking.currentTierId) {
      return null;
    }
    
    const [tier] = await db
      .select()
      .from(shopTierConfig)
      .where(eq(shopTierConfig.id, tracking.currentTierId))
      .limit(1);
    
    return tier;
  }),

  /**
   * Obtener progreso hacia siguiente tier
   */
  getTierProgress: protectedProcedure.query(async ({ ctx }) => {
    const database = await getDb();
      if (!database) {
        throw new Error('Database not available');
      }
    const [tracking] = await database
      .select()
      .from(shopPurchaseTracking)
      .where(eq(shopPurchaseTracking.organizationId, ctx.user.partnerId))
      .limit(1);
    
    return tracking || null;
  }),

  // ============================================================================
  // Blog Integration
  // ============================================================================

  /**
   * Obtener posts del blog
   */
  getBlogPosts: protectedProcedure
    .input(z.object({ 
      limit: z.number().optional(),
      categoryId: z.string().optional()
    }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) {
        throw new Error('Database not available');
      }
      const [wooConfig] = await database
        .select()
        .from(distributorWooCommerceConfig)
        .limit(1);
      
      if (!wooConfig) {
        return [];
      }
      
      const blogService = new WordPressBlogService(wooConfig.url);
      const posts = await blogService.getPosts({
        per_page: input.limit || 5,
        categories: input.categoryId,
        orderby: 'date',
        order: 'desc',
      });
      
      return posts;
    }),

  /**
   * Buscar posts del blog
   */
  searchBlogPosts: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) {
        throw new Error('Database not available');
      }
      const [wooConfig] = await database
        .select()
        .from(distributorWooCommerceConfig)
        .limit(1);
      
      if (!wooConfig) {
        return [];
      }
      
      const blogService = new WordPressBlogService(wooConfig.url);
      const posts = await blogService.searchPosts(input.query);
      
      return posts;
    }),

  /**
   * Obtener categorías del blog
   */
  getBlogCategories: protectedProcedure
    .query(async () => {
      const database = await getDb();
      if (!database) {
        throw new Error('Database not available');
      }
      const [wooConfig] = await database
        .select()
        .from(distributorWooCommerceConfig)
        .limit(1);
      
      if (!wooConfig) {
        return [];
      }
      
      const blogService = new WordPressBlogService(wooConfig.url);
      const categories = await blogService.getCategories();
      
      return categories;
    }),
});

export type ShopRouter = typeof shopRouter;
