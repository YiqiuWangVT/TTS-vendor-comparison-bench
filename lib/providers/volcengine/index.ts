/**
 * VolcEngine TTS Provider Modules
 * Complete TypeScript implementation of the Python WebSocket protocol
 */

// Legacy auth format types for backward compatibility
export type AuthFormat = 'bearer' | 'hmac_sha256' | 'hmac_sha256_v2'

// New WebSocket implementation
export * from './protocol';
export * from './websocket-client';

// Import for internal use
import { VolcEngineWebSocketClient } from './websocket-client';

// Re-export commonly used types and functions
export {
  VolcEngineMessage,
  MsgType,
  EventType,
  MsgTypeFlagBits,
  VersionBits,
  HeaderSizeBits,
  SerializationBits,
  CompressionBits,
  createFullClientRequest,
  createStartConnection,
  createFinishConnection,
  createStartSession,
  createFinishSession,
  createCancelSession,
  createTaskRequest,
  type MessageOptions,
} from './protocol';

export {
  VolcEngineWebSocketClient,
  getCluster,
  type VolcEngineTTSOptions,
} from './websocket-client';

// Legacy functions for backward compatibility
export function getConfigFromEnv() {
  return {
    appId: process.env.VOLCENGINE_APP_ID || undefined,
    accessToken: process.env.VOLCENGINE_ACCESS_TOKEN || undefined,
    secretKey: process.env.VOLCENGINE_SECRET_KEY || undefined,
    authFormat: (process.env.VOLCENGINE_AUTH_FORMAT as AuthFormat) || 'bearer',
  }
}

/**
 * Build authorization header for Volcengine-like services.
 * - bearer: "Bearer {token}"
 * - hmac_sha256: "Signature {sig};t={ts};appid={appid}" (sig = hex hmac(secret_key, canon))
 * Where canon = `${appid}${token}${ts}`
 *
 * NOTE: HMAC requires Node's crypto. To avoid accidentally bundling crypto into
 * client-side code, this module exposes an async HMAC builder which dynamically
 * imports Node's `crypto` at runtime. For simple bearer tokens callers can use
 * the synchronous `formatBearerOrSigned`.
 */
export async function buildAuthorizationHeaderAsync(
  authFormat: AuthFormat,
  appId: string,
  token: string,
  secretKey?: string,
): Promise<string> {
  const rawToken = token || ''
  if (authFormat === 'bearer') {
    return `Bearer ${rawToken}`
  }

  // HMAC formats require a secret key
  const ts = Math.floor(Date.now() / 1000).toString()
  const canon = `${appId}${rawToken}${ts}`
  const key = (secretKey || '')

  // Dynamic import to keep this module safe for client-side analysis
  // (crypto is a Node built-in and should not be bundled for browsers).
  const crypto = await import('crypto')
  const h = crypto.createHmac('sha256', key).update(canon, 'utf8').digest('hex')
  return `Signature ${h};t=${ts};appid=${appId}`
}

// _secretKey is intentionally unused in the synchronous path; HMAC is only
// supported via the async helpers that dynamically import Node's crypto.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function formatBearerOrSigned(authFormat: AuthFormat, appId?: string, token?: string, _secretKey?: string) {
  if (!token) return ''
  if (!appId) return authFormat === 'bearer' ? `Bearer ${token}` : ''
  // For HMAC we cannot synchronously compute without Node crypto; return an
  // empty string so callers must opt-in to the async variant if needed.
  if (authFormat !== 'bearer') return ''
  return `Bearer ${token}`
}

export async function formatBearerOrSignedAsync(authFormat: AuthFormat, appId?: string, token?: string, secretKey?: string) {
  if (!token) return ''
  if (!appId) return authFormat === 'bearer' ? `Bearer ${token}` : ''
  return await buildAuthorizationHeaderAsync(authFormat, appId, token, secretKey)
}

// New high-level convenience function that replaces the Python binary.py script
export async function synthesizeWithVolcEngine(options: {
  appId: string;
  accessToken: string;
  secretKey?: string;
  voiceType: string;
  text: string;
  encoding?: 'wav' | 'mp3' | 'ogg';
  cluster?: string;
  endpoint?: string;
  timeout?: number;
  authFormat?: 'bearer_space' | 'bearer_semicolon' | 'hmac_sha256';
}): Promise<Buffer> {
  return await VolcEngineWebSocketClient.synthesize(options);
}
