/**
 * Google Calendar OAuth - Initiation Route
 * Genera la URL de autorización de Google y redirige al usuario
 */

import { getAuthorizationUrl } from '../server/_core/calendar/oauth-google.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Validar que las variables de entorno estén configuradas
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('❌ Missing Google OAuth credentials');
      return res.status(503).json({
        error: 'Google Calendar integration not configured',
        message: 'Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel environment variables',
      });
    }

    // Generar URL de autorización de Google
    console.log('[OAuth] About to call getAuthorizationUrl for userId:', userId);
    const authUrl = getAuthorizationUrl(userId);
    console.log('[OAuth] Successfully generated auth URL:', authUrl.substring(0, 50) + '...');

    // Redirigir al usuario a Google para autorización
    console.log('[OAuth] 🚀 Redirecting to Google OAuth...');
    res.redirect(302, authUrl);
  } catch (error) {
    console.error('Error generating Google auth URL:', error);
    
    res.status(500).json({
      error: 'Failed to generate authorization URL',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
