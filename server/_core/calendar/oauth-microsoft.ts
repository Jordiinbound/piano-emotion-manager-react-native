/**
 * Microsoft Graph (Outlook Calendar) OAuth Manager
 */

import { ConfidentialClientApplication } from '@azure/msal-node';
import { encrypt, decrypt } from './encryption.js';
import type { OAuthTokens } from './types';

const MICROSOFT_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID || process.env.MICROSOFT_CALENDAR_CLIENT_ID || '';
const MICROSOFT_CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET || process.env.MICROSOFT_CALENDAR_CLIENT_SECRET || '';
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || process.env.MICROSOFT_CALENDAR_REDIRECT_URI || 'http://localhost:3000/api/calendar/microsoft/callback';
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID || 'common'; // 'common' for multi-tenant

// Scopes required for calendar access
const SCOPES = [
  'Calendars.ReadWrite', // Full calendar access
  'offline_access', // Get refresh token
  'User.Read', // Basic user info
];

/**
 * Create MSAL client application
 */
function createMsalClient(): ConfidentialClientApplication {
  return new ConfidentialClientApplication({
    auth: {
      clientId: MICROSOFT_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}`,
      clientSecret: MICROSOFT_CLIENT_SECRET,
    },
  });
}

/**
 * Generate authorization URL for user to grant access
 * @param state - Optional state parameter for CSRF protection
 * @returns Authorization URL
 */
export async function getAuthorizationUrl(state?: string): Promise<string> {
  const msalClient = createMsalClient();
  
  const authCodeUrlParameters = {
    scopes: SCOPES,
    redirectUri: MICROSOFT_REDIRECT_URI,
    state: state || undefined,
  };
  
  try {
    return await msalClient.getAuthCodeUrl(authCodeUrlParameters);
  } catch (error) {
    console.error('❌ Error generating auth URL:', error);
    throw new Error('Failed to generate authorization URL');
  }
}

/**
 * Exchange authorization code for tokens
 * @param code - Authorization code from callback
 * @returns OAuth tokens (encrypted)
 */
export async function exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
  const msalClient = createMsalClient();
  
  const tokenRequest = {
    code,
    scopes: SCOPES,
    redirectUri: MICROSOFT_REDIRECT_URI,
  };
  
  try {
    const response = await msalClient.acquireTokenByCode(tokenRequest);
    
    if (!response || !response.accessToken) {
      throw new Error('Missing access_token in response');
    }
    
    // Microsoft Graph tokens typically expire in 1 hour
    const expiresAt = response.expiresOn || new Date(Date.now() + 3600 * 1000);
    
    // Note: MSAL handles refresh tokens internally, but we need to store the account
    const account = response.account;
    if (!account) {
      throw new Error('Missing account in response');
    }
    
    // Store account info as "refresh token" (MSAL will use it to refresh)
    const refreshTokenData = JSON.stringify({
      homeAccountId: account.homeAccountId,
      environment: account.environment,
      tenantId: account.tenantId,
      username: account.username,
    });
    
    return {
      accessToken: encrypt(response.accessToken),
      refreshToken: encrypt(refreshTokenData),
      expiresAt,
      scope: response.scopes?.join(' '),
    };
  } catch (error) {
    console.error('❌ Error exchanging code for tokens:', error);
    throw new Error('Failed to exchange authorization code');
  }
}

/**
 * Refresh access token using account info
 * @param encryptedRefreshToken - Encrypted account info
 * @returns New OAuth tokens (encrypted)
 */
export async function refreshAccessToken(encryptedRefreshToken: string): Promise<OAuthTokens> {
  const msalClient = createMsalClient();
  
  try {
    const accountDataStr = decrypt(encryptedRefreshToken);
    const accountData = JSON.parse(accountDataStr);
    
    const silentRequest = {
      scopes: SCOPES,
      account: accountData,
    };
    
    const response = await msalClient.acquireTokenSilent(silentRequest);
    
    if (!response || !response.accessToken) {
      throw new Error('Missing access_token in refresh response');
    }
    
    const expiresAt = response.expiresOn || new Date(Date.now() + 3600 * 1000);
    
    return {
      accessToken: encrypt(response.accessToken),
      refreshToken: encryptedRefreshToken, // Keep same account info
      expiresAt,
      scope: response.scopes?.join(' '),
    };
  } catch (error) {
    console.error('❌ Error refreshing access token:', error);
    throw new Error('Failed to refresh access token');
  }
}

/**
 * Get decrypted access token
 * @param encryptedAccessToken - Encrypted access token
 * @returns Decrypted access token
 */
export function getAccessToken(encryptedAccessToken: string): string {
  return decrypt(encryptedAccessToken);
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
 * Revoke access (disconnect)
 * Note: Microsoft doesn't provide a direct token revocation endpoint like Google.
 * The user needs to revoke access through their Microsoft account settings.
 * We'll just clear the local tokens.
 * @param encryptedAccessToken - Encrypted access token
 */
export async function revokeToken(encryptedAccessToken: string): Promise<void> {
  // Microsoft Graph doesn't have a direct revocation endpoint
  // Tokens will expire naturally, or user can revoke from account settings
  console.log('ℹ️  Microsoft tokens cleared. User should revoke access from account settings if needed.');
}
