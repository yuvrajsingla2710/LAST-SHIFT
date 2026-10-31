import crypto from 'node:crypto';
import { classifyEmailDeterministic, parseRawEmlContent } from './engine';
import { ParsedEmailItem } from './types';

// Ephemeral fallback key generated once per server process if TOKEN_ENCRYPTION_KEY is not configured
const EPHEMERAL_FALLBACK_KEY = crypto.randomBytes(32);

/**
 * Resolves a 32-byte key buffer from an environment hex/base64/passphrase string
 * or uses the per-process ephemeral key.
 */
export function resolveAes256Key(rawEnvKey?: string): Buffer {
  const cleaned = (rawEnvKey || process.env.TOKEN_ENCRYPTION_KEY || '').trim();
  if (!cleaned || /^0+$/.test(cleaned) || cleaned === 'YOUR_TOKEN_ENCRYPTION_KEY') {
    return EPHEMERAL_FALLBACK_KEY;
  }
  if (/^[0-9a-fA-F]{64}$/.test(cleaned)) {
    return Buffer.from(cleaned, 'hex');
  }
  return crypto.createHash('sha256').update(cleaned, 'utf8').digest();
}

export interface EncryptedTokenRecord {
  cipherTextB64: string;
  ivB64: string;
  authTagB64: string;
  algorithm: 'aes-256-gcm';
  encryptedAtIso: string;
}

/**
 * Encrypts sensitive OAuth tokens at rest using authenticated AES-256-GCM.
 */
export function encryptTokenAes256Gcm(
  plainToken: string,
  explicitKeyHex?: string
): EncryptedTokenRecord {
  if (!plainToken) {
    throw new Error('Cannot encrypt empty token.');
  }
  const key = resolveAes256Key(explicitKeyHex);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainToken, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    cipherTextB64: encrypted.toString('base64'),
    ivB64: iv.toString('base64'),
    authTagB64: authTag.toString('base64'),
    algorithm: 'aes-256-gcm',
    encryptedAtIso: new Date().toISOString(),
  };
}

/**
 * Decrypts an AES-256-GCM encrypted token record and verifies its authentication tag.
 */
export function decryptTokenAes256Gcm(
  record: EncryptedTokenRecord,
  explicitKeyHex?: string
): string {
  const key = resolveAes256Key(explicitKeyHex);
  const iv = Buffer.from(record.ivB64, 'base64');
  const authTag = Buffer.from(record.authTagB64, 'base64');
  const encrypted = Buffer.from(record.cipherTextB64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Generates an HMAC-signed CSRF state token with expiration.
 */
export function createCsrfStateToken(secret?: string, ttlMs = 10 * 60 * 1000): string {
  const signingSecret = secret || process.env.SESSION_SECRET || EPHEMERAL_FALLBACK_KEY.toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + ttlMs;
  const payload = `${nonce}.${expiresAt}`;
  const sig = crypto.createHmac('sha256', signingSecret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

/**
 * Validates an HMAC-signed CSRF state token using timingSafeEqual.
 */
export function verifyCsrfStateToken(token: string, secret?: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [nonce, expiresStr, providedSig] = parts;
  const expiresAt = Number(expiresStr);
  if (!nonce || Number.isNaN(expiresAt) || Date.now() > expiresAt) {
    return false;
  }

  const signingSecret = secret || process.env.SESSION_SECRET || EPHEMERAL_FALLBACK_KEY.toString('hex');
  const payload = `${nonce}.${expiresStr}`;
  const expectedSig = crypto.createHmac('sha256', signingSecret).update(payload).digest('hex');

  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Generates a PKCE code_verifier and S256 code_challenge pair.
 */
export function generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

/**
 * Decodes base64url strings returned by the Gmail API.
 */
export function decodeBase64UrlText(data?: string): string {
  if (!data) return '';
  try {
    return Buffer.from(data, 'base64url').toString('utf8');
  } catch {
    return '';
  }
}

export interface GmailApiMessageResource {
  id: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: {
    mimeType?: string;
    headers?: Array<{ name?: string; value?: string }>;
    body?: { data?: string };
    parts?: Array<{
      mimeType?: string;
      body?: { data?: string };
      parts?: Array<{ mimeType?: string; body?: { data?: string } }>;
    }>;
  };
}

/**
 * Converts a real Gmail API message resource (`users.messages.get`) into a
 * classified `ParsedEmailItem` without storing or logging sensitive content.
 */
export function parseGmailApiMessageToParsedEmail(
  msg: GmailApiMessageResource,
  patternRecLevel = 1
): ParsedEmailItem {
  const headersMap: Record<string, string> = {};
  for (const h of msg.payload?.headers || []) {
    if (h.name && h.value) {
      headersMap[h.name.toLowerCase()] = h.value;
    }
  }

  // Extract plain text body from payload or nested MIME parts
  let bodyText = decodeBase64UrlText(msg.payload?.body?.data);
  if (!bodyText && msg.payload?.parts) {
    for (const part of msg.payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        bodyText = decodeBase64UrlText(part.body.data);
        break;
      }
      if (part.parts) {
        for (const sub of part.parts) {
          if (sub.mimeType === 'text/plain' && sub.body?.data) {
            bodyText = decodeBase64UrlText(sub.body.data);
            break;
          }
        }
      }
    }
  }

  if (!bodyText) {
    bodyText = msg.snippet || '(No plain-text body preview available)';
  }

  const syntheticEml = [
    `From: ${headersMap['from'] || 'Unknown Sender <unknown@gmail.com>'}`,
    `To: ${headersMap['to'] || 'me@gmail.com'}`,
    `Subject: ${headersMap['subject'] || '(No Subject)'}`,
    `Date: ${headersMap['date'] || new Date(Number(msg.internalDate) || Date.now()).toUTCString()}`,
    headersMap['list-unsubscribe'] ? `List-Unsubscribe: ${headersMap['list-unsubscribe']}` : '',
    '',
    bodyText,
  ]
    .filter((line) => line !== undefined)
    .join('\n');

  const parsedBase = parseRawEmlContent(syntheticEml, `gmail_${msg.id}.eml`, false);
  parsedBase.id = `gmail_${msg.id}`;
  return classifyEmailDeterministic(parsedBase, patternRecLevel);
}
