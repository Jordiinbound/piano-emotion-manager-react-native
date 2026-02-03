import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";

/**
 * tRPC React client for type-safe API calls.
 *
  * IMPORTANT (tRPC v11): The `transformer` must be inside httpLink,
 * NOT at the root createClient level. This ensures client and server
 * use the same serialization format (superjson).
 * 
 * NOTE: Using httpLink instead of httpBatchLink to avoid batching issues
 * that were causing 400 errors in production..
 */
export const trpc = createTRPCReact<AppRouter>();

// Global token getter function that will be set by ClerkTokenProvider
let globalGetToken: (() => Promise<string | null>) | null = null;

/**
 * Set the global token getter function.
 * This should be called by ClerkTokenProvider when it mounts.
 */
export function setGlobalTokenGetter(getToken: () => Promise<string | null>) {
  globalGetToken = getToken;
  console.log('[tRPC] Global token getter set');
}

/**
 * Creates the tRPC client with proper configuration.
 * Call this once in your app's root layout.
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        // tRPC v11: transformer MUST be inside httpBatchLink, not at root
        transformer: superjson,
        // Pass Clerk token in Authorization header
        headers: async () => {
          try {
            let token: string | null = null;
            
            // Use the global token getter if available
            if (globalGetToken) {
              token = await globalGetToken();
            }
            
            if (token) {
              console.log('[tRPC headers] Token obtained:', `${token.substring(0, 50)}...`);
              return {
                authorization: `Bearer ${token}`,
              };
            } else {
              console.warn('[tRPC headers] No token available');
              return {};
            }
          } catch (e) {
            console.error('[tRPC headers] Error getting Clerk token:', e);
            return {};
          }
        },
      }),
    ],
  });
}
