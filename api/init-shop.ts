import { getDb } from '../../drizzle/db.js';
import { shops, shopTierConfig, shopRolePermissions } from '../../drizzle/shop-schema.js';
import { distributorWooCommerceConfig } from '../../drizzle/distributor-schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: any, res: any) {
  try {
    const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  if (!db) throw new Error("Database connection failed");
    if (!db) {
      return res.status(500).json({ success: false, error: 'Database connection failed' });
    }
    
    // Verificar si ya existe
    const existing = await db.select().from(shops).where(eq(shops.type, 'platform')).limit(1);
    
    if (existing.length > 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'Shop already exists',
        shop: existing[0]
      });
    }
    
    // Crear tienda
    const shopResult = await db.insert(shops).values({
      organizationId: 1,
      name: 'Piano Emotion Store',
      description: 'Tienda oficial de Piano Emotion con productos para técnicos de piano',
      type: 'platform',
      url: 'https://www.pianoemotion.es',
      apiEndpoint: 'https://www.pianoemotion.es/wp-json/wc/v3',
      apiKey: 'ck_0cd38c91977da2780ac80336e061deaf7017bf82',
      apiSecret: 'cs_9a38dbea370759adf4e0e8c432b0b524d365a824',
      currency: 'EUR',
      active: true,
      approvalThreshold: 500.00,
    });
    
    const shopId = Number((shopResult as any)[0]?.insertId || shopResult);
    
    // Crear tiers
    await db.insert(shopTierConfig).values([
      {
        shopId,
        tierName: 'Basic',
        tierLevel: 1,
        description: 'Tier básico sin requisitos',
        minimumPurchaseAmount: '0',
        purchasePeriodDays: 365,
        discountPercentage: '0',
        freeShipping: false,
        prioritySupport: false,
        isActive: true,
      },
      {
        shopId,
        tierName: 'Professional',
        tierLevel: 2,
        description: 'Tier profesional con descuentos',
        minimumPurchaseAmount: '2000',
        purchasePeriodDays: 365,
        discountPercentage: '5',
        freeShipping: false,
        prioritySupport: false,
        isActive: true,
      },
      {
        shopId,
        tierName: 'Premium',
        tierLevel: 3,
        description: 'Tier premium con máximos beneficios',
        minimumPurchaseAmount: '5000',
        purchasePeriodDays: 365,
        discountPercentage: '10',
        freeShipping: true,
        prioritySupport: true,
        isActive: true,
      },
    ]);
    
    // Crear roles
    await db.insert(shopRolePermissions).values([
      {
        shopId,
        role: 'owner',
        canView: true,
        canOrder: true,
        canApprove: true,
        maxOrderAmount: null,
      },
      {
        shopId,
        role: 'admin',
        canView: true,
        canOrder: true,
        canApprove: true,
        maxOrderAmount: null,
      },
      {
        shopId,
        role: 'manager',
        canView: true,
        canOrder: true,
        canApprove: true,
        maxOrderAmount: '1000',
      },
      {
        shopId,
        role: 'technician',
        canView: true,
        canOrder: true,
        canApprove: false,
        maxOrderAmount: '500',
      },
    ]);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Shop initialized successfully',
      shopId 
    });
    
  } catch (error: any) {
    console.error('Error initializing shop:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
