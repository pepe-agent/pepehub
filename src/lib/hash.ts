async function digestHex(algorithm: 'SHA-256' | 'SHA-1', data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest(algorithm, data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(data: ArrayBuffer): Promise<string> {
  return digestHex('SHA-256', data);
}

// sha1 é legado (o protocolo do npm ainda espera dist.shasum nesse formato),
// nunca usado pra integridade de verdade no resto do PepeHub, isso é
// sha256, tanto no header X-PepeHub-Sha256 quanto no dist.integrity SRI.
export async function sha1Hex(data: ArrayBuffer): Promise<string> {
  return digestHex('SHA-1', data);
}

// SRI (Subresource Integrity) a partir de um digest já em hex: converte pra
// base64, formato "sha256-<base64>" que dist.integrity do npm espera.
export function sriFromHex(algorithm: 'sha256' | 'sha1', hex: string): string {
  const bytes = new Uint8Array(hex.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16)));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `${algorithm}-${btoa(binary)}`;
}
