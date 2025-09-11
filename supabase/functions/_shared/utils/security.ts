// Security utilities for phone verification
export const ALLOWED_ORIGINS = new Set([
  'https://journalbytext.com',
  'http://localhost:5173',
]);

export function corsHeadersFor(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  if (!ALLOWED_ORIGINS.has(origin)) {
    return null; // caller should return 403
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
  };
}

export function okCorsPreflight(req: Request, cors: Record<string, string>) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }
  return null;
}

// Cryptography helpers
export async function sha256ToHex(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function randomTokenBase64Url(bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  // base64url encode
  const b64 = btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return b64;
}