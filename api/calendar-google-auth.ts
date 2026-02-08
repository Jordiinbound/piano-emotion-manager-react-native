/**
 * Google Calendar OAuth - Initiation Route
 * Genera la URL de autorización de Google y redirige al usuario
 */

import { getAuthorizationUrl } from '../server/_core/calendar/oauth-google.js';

export default async function handler(request: any) {
  try {
    // Parse URL correctly - request.url might be relative or absolute
    const url = new URL(request.url, `https://${request.headers.host || 'localhost'}`);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validar que las variables de entorno estén configuradas
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('❌ Missing Google OAuth credentials');
      return new Response(
        JSON.stringify({
          error: 'Google Calendar integration not configured',
          message: 'Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel environment variables',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Generar URL de autorización de Google
    console.log('[OAuth] About to call getAuthorizationUrl for userId:', userId);
    const authUrl = getAuthorizationUrl(userId);
    console.log('[OAuth] Successfully generated auth URL:', authUrl.substring(0, 50) + '...');

    // Redirigir al usuario a Google para autorización
    return new Response(null, {
      status: 302,
      headers: {
        'Location': authUrl,
      },
    });
  } catch (error) {
    console.error('Error generating Google auth URL:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to generate authorization URL',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
