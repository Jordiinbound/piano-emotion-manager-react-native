/**
 * Google Calendar OAuth Manager
 */

import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { encrypt, decrypt } from './encryption.js';
import type { OAuthTokens } from './types';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_CALENDAR_REDIRECT_URI || 'http://localhost:3000/api/calendar/google/callback';

// Scopes required for calendar access
const SCOPES = [
  'https://www.googleapis.com/auth/calendar', // Full calendar access
  'https://www.googleapis.com/auth/calendar.events', // Events access
];

/**
 * Create OAuth2 client
 */
export function createOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate authorization URL for user to grant access
 * @param state - Optional state parameter for CSRF protection
 * @returns Authorization URL
 */
export function getAuthorizationUrl(state?: string): string {
  const oauth2Client = createOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh token
    scope: SCOPES,
    prompt: 'consent', // Force consent screen to get refresh token
    state: state || undefined,
  });
}

/**
 * Exchange authorization code for tokens
 * @param code - Authorization code from callback
 * @returns OAuth tokens (encrypted)
 */
export async function exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
  const oauth2Client = createOAuth2Client();
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Missing access_token or refresh_token');
    }
    
    const expiresAt = tokens.expiry_date 
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // Default 1 hour
    
    return {
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      expiresAt,
      scope: tokens.scope,
    };
  } catch (error) {
    console.error('❌ Error exchanging code for tokens:', error);
    throw new Error('Failed to exchange authorization code');
  }
}

/**
 * Refresh access token using refresh token
 * @param encryptedRefreshToken - Encrypted refresh token
 * @returns New OAuth tokens (encrypted)
 */
export async function refreshAccessToken(encryptedRefreshToken: string): Promise<OAuthTokens> {
  const oauth2Client = createOAuth2Client();
  
  try {
    const refreshToken = decrypt(encryptedRefreshToken);
    
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (!credentials.access_token) {
      throw new Error('Missing access_token in refresh response');
    }
    
    const expiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000);
    
    return {
      accessToken: encrypt(credentials.access_token),
      refreshToken: encryptedRefreshToken, // Keep same refresh token
      expiresAt,
      scope: credentials.scope,
    };
  } catch (error) {
    console.error('❌ Error refreshing access token:', error);
    throw new Error('Failed to refresh access token');
  }
}

/**
 * Get authenticated OAuth2 client
 * @param encryptedAccessToken - Encrypted access token
 * @param encryptedRefreshToken - Encrypted refresh token
 * @returns Authenticated OAuth2 client
 */
export function getAuthenticatedClient(
  encryptedAccessToken: string,
  encryptedRefreshToken: string
): OAuth2Client {
  const oauth2Client = createOAuth2Client();
  
  oauth2Client.setCredentials({
    access_token: decrypt(encryptedAccessToken),
    refresh_token: decrypt(encryptedRefreshToken),
  });
  
  return oauth2Client;
}

/**
 * Check if access token is expired or about to expire
 * @param expiresAt - Expiration date
 * @param bufferMinutes - Buffer time in minutes (default: 5)
 * @returns True if token is expired or about to expire
 */
export function isTokenExpired(expiresAt: Date | null, bufferMinutes: number = 5): boolean {
  if (!expiresAt) return true;
  
  const now = Date.now();
  const expiryTime = expiresAt.getTime();
  const bufferTime = bufferMinutes * 60 * 1000;
  
  return now >= (expiryTime - bufferTime);
}

/**
 * Revoke access token (disconnect)
 * @param encryptedAccessToken - Encrypted access token
 */
export async function revokeToken(encryptedAccessToken: string): Promise<void> {
  const oauth2Client = createOAuth2Client();
  
  try {
    const accessToken = decrypt(encryptedAccessToken);
    await oauth2Client.revokeToken(accessToken);
  } catch (error) {
    console.error('❌ Error revoking token:', error);
    // Don't throw error, as token might already be invalid
  }
}
