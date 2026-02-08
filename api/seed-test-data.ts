import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyClerkSession } from '../server/_core/clerk.js';
import { getDb } from '../server/db.js';
import { clients, pianos, services } from '../../drizzle/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify user is authenticated using Clerk
    const clerkUser = await verifyClerkSession(req);
    if (!clerkUser) {
      return res.status(401).json({ error: 'Unauthorized - Not authenticated' });
    }

    if (!clerkUser.user) {
      return res.status(401).json({ error: 'Unauthorized - User data not available' });
    }

    const userId = clerkUser.user.id;
    const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  if (!db) throw new Error("Database connection failed");
    if (!db) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    // Insert test clients
    const client1Result = await db.insert(clients).values({
      odId: `client_${Date.now()}_1`,
      name: 'María García',
      email: 'maria.garcia@example.com',
      phone: '+34 612 345 678',
      address: 'Calle Mayor 15, Madrid',
      partnerId: 1,
    });
    const client1Id = Number(client1Result[0].insertId);

    const client2Result = await db.insert(clients).values({
      odId: `client_${Date.now()}_2`,
      name: 'Juan Martínez',
      email: 'juan.martinez@example.com',
      phone: '+34 623 456 789',
      address: 'Avenida Diagonal 123, Barcelona',
      partnerId: 1,
    });
    const client2Id = Number(client2Result[0].insertId);

    // Insert test pianos
    const piano1Result = await db.insert(pianos).values({
      odId: `piano_${Date.now()}_1`,
      brand: 'Yamaha',
      model: 'U1',
      serialNumber: 'Y123456',
      year: 2015,
      category: 'vertical',
      pianoType: 'Upright',
      clientId: client1Id,
      partnerId: 1,
    });
    const piano1Id = Number(piano1Result[0].insertId);

    const piano2Result = await db.insert(pianos).values({
      odId: `piano_${Date.now()}_2`,
      brand: 'Kawai',
      model: 'K-300',
      serialNumber: 'K789012',
      year: 2018,
      category: 'vertical',
      pianoType: 'Upright',
      clientId: client2Id,
      partnerId: 1,
    });
    const piano2Id = Number(piano2Result[0].insertId);

    // Insert test services - one URGENT and one PENDING
    // Urgent: last service was 14 months ago
    const urgentDate = new Date();
    urgentDate.setMonth(urgentDate.getMonth() - 14);
    
    await db.insert(services).values({
      odId: `service_${Date.now()}_1`,
      pianoId: piano1Id,
      clientId: client1Id,
      serviceType: 'tuning',
      date: urgentDate.toISOString(),
      notes: 'Afinación realizada hace 14 meses - URGENTE',
      cost: '80.00',
      partnerId: 1,
    });

    // Pending: last service was 11 months ago
    const pendingDate = new Date();
    pendingDate.setMonth(pendingDate.getMonth() - 11);
    
    await db.insert(services).values({
      odId: `service_${Date.now()}_2`,
      pianoId: piano2Id,
      clientId: client2Id,
      serviceType: 'tuning',
      date: pendingDate.toISOString(),
      notes: 'Afinación realizada hace 11 meses - PENDIENTE',
      cost: '85.00',
      partnerId: 1,
    });

    return res.status(200).json({
      success: true,
      message: 'Test data inserted successfully',
      data: {
        userId: userId,
        clientsCreated: 2,
        pianosCreated: 2,
        servicesCreated: 2,
        alerts: {
          urgent: 1,
          pending: 1,
        }
      }
    });
  } catch (error) {
    console.error('Error seeding test data:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
