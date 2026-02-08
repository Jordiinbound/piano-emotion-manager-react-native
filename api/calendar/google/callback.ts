/**
 * Google Calendar OAuth Callback
 * Maneja la respuesta de Google después de la autorización
 */

import { exchangeCodeForTokens } from '../../../server/_core/calendar/oauth-google';
import { getDb } from '../../../server/db';
import { calendarConnections } from '../../../drizzle/calendar-schema';
import { eq, and } from 'drizzle-orm';

export default async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // userId
    const error = url.searchParams.get('error');

    // Si el usuario canceló la autorización
    if (error) {
      console.log('❌ User cancelled Google Calendar authorization:', error);
      return Response.redirect(
        `${process.env.APP_URL || 'https://www.pianoemotion.com'}/settings/calendar-settings?error=cancelled`,
        302
      );
    }

    // Validar parámetros
    if (!code || !state) {
      console.error('❌ Missing code or state parameter');
      return Response.redirect(
        `${process.env.APP_URL || 'https://www.pianoemotion.com'}/settings/calendar-settings?error=invalid_params`,
        302
      );
    }

    const userId = parseInt(state, 10);
    if (isNaN(userId)) {
      console.error('❌ Invalid userId in state parameter');
      return Response.redirect(
        `${process.env.APP_URL || 'https://www.pianoemotion.com'}/settings/calendar-settings?error=invalid_user`,
        302
      );
    }

    console.log('✅ Received Google Calendar callback for userId:', userId);

    // Intercambiar código por tokens (esto puede tardar unos segundos)
    const tokens = await exchangeCodeForTokens(code);
    console.log('✅ Tokens exchanged successfully');

    // Guardar tokens en la base de datos
    const db = await getDb();
    
    // Verificar si ya existe una conexión para este usuario
    const existing = await db
      .select()
      .from(calendarConnections)
      .where(
        and(
          eq(calendarConnections.userId, userId),
          eq(calendarConnections.provider, 'google')
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Actualizar conexión existente
      await db
        .update(calendarConnections)
        .set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt.toISOString(),
          isActive: true,
          lastSyncAt: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(calendarConnections.id, existing[0].id));
      
      console.log('✅ Updated existing Google Calendar connection');
    } else {
      // Crear nueva conexión
      await db.insert(calendarConnections).values({
        userId,
        provider: 'google',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt.toISOString(),
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      console.log('✅ Created new Google Calendar connection');
    }

    // Redirigir al usuario de vuelta a la configuración con éxito
    return Response.redirect(
      `${process.env.APP_URL || 'https://www.pianoemotion.com'}/settings/calendar-settings?success=google`,
      302
    );
  } catch (error) {
    console.error('❌ Error in Google Calendar callback:', error);
    
    // Redirigir con error
    return Response.redirect(
      `${process.env.APP_URL || 'https://www.pianoemotion.com'}/settings/calendar-settings?error=callback_failed`,
      302
    );
  }
}
