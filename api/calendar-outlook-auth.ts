/**
 * Outlook Calendar OAuth - Initiation Route
 * Genera la URL de autorización de Microsoft y redirige al usuario
 */

import { getAuthorizationUrl } from '../server/_core/calendar/oauth-microsoft.js';

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
    const clientId = process.env.MICROSOFT_CLIENT_ID || process.env.OUTLOOK_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET || process.env.OUTLOOK_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('❌ Missing Microsoft OAuth credentials');
      return new Response(
        JSON.stringify({
          error: 'Outlook Calendar integration not configured',
          message: 'Please configure MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in Vercel environment variables',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Generar URL de autorización de Microsoft
    const authUrl = await getAuthorizationUrl(userId);

    // Redirigir al usuario a Microsoft para autorización
    return Response.redirect(authUrl, 302);
  } catch (error) {
    console.error('Error generating Microsoft auth URL:', error);
    
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
