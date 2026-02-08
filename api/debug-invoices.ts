import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../drizzle/db.js';
import { invoices } from '../../drizzle/schema.js';
import { desc } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  if (!db) throw new Error("Database connection failed");
    if (!db) {
      return res.status(500).json({ error: 'Database connection failed' });
    }
    
    // Obtener todas las facturas
    const allInvoices = await db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(10);
    
    // Contar total
    const count = allInvoices.length;
    
    return res.status(200).json({
      success: true,
      count,
      invoices: allInvoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.clientName,
        total: inv.total,
        date: inv.date,
        status: inv.status,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
}
