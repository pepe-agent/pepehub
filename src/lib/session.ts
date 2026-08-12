const SESSION_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 dias

export const SESSION_COOKIE_NAME = 'pepehub_session';
export const OAUTH_STATE_COOKIE_NAME = 'pepehub_oauth_state';

export interface SessionPayload {
  ownerId: number;
  githubId: number;
  handle: string;
  exp: number; // unix seconds
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function createSessionToken(
  payload: Omit<SessionPayload, 'exp'>,
  secret: string,
): Promise<string> {
  const full: SessionPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(full));
  const payloadPart = toBase64Url(payloadBytes);
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadPart));
  const signaturePart = toBase64Url(new Uint8Array(signature));
  return `${payloadPart}.${signaturePart}`;
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<SessionPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadPart, signaturePart] = parts;

  const key = await hmacKey(secret);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    fromBase64Url(signaturePart) as BufferSource,
    new TextEncoder().encode(payloadPart),
  );
  if (!valid) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadPart))) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function cookieHeader(name: string, value: string, maxAgeSeconds: number): string {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export function sessionCookie(token: string): string {
  return cookieHeader(SESSION_COOKIE_NAME, token, SESSION_TTL_SECONDS);
}

export function clearCookie(name: string): string {
  return cookieHeader(name, '', 0);
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return null;
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization');
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

export async function requireSession(
  request: Request,
  secret: string,
): Promise<SessionPayload | null> {
  const token = bearerToken(request);
  if (!token) return null;
  return verifySessionToken(token, secret);
}

// Pra rotas de mutação chamadas tanto pela CLI (Bearer) quanto por um
// formulário do próprio site (cookie). O cookie só vale quando o
// Sec-Fetch-Site do navegador confirma 'same-origin', já que checkOrigin
// está desligado globalmente (astro.config.mjs) e isso é a defesa contra
// CSRF. Não usar como fallback genérico em toda rota /api/v1/*, só nas que
// realmente precisam de um formulário no navegador.
export async function resolveMutationSession(
  request: Request,
  secret: string,
): Promise<SessionPayload | null> {
  const token = bearerToken(request);
  if (token) return verifySessionToken(token, secret);
  if (request.headers.get('Sec-Fetch-Site') === 'same-origin') {
    const cookieToken = readCookie(request, SESSION_COOKIE_NAME);
    if (cookieToken) return verifySessionToken(cookieToken, secret);
  }
  return null;
}
