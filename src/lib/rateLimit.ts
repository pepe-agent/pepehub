export type RateLimitCategory = 'read' | 'write';
export type RateLimitIdentity = 'anon' | 'auth';

export interface RateLimitConfig {
  binding: 'RATE_LIMIT_READ_ANON' | 'RATE_LIMIT_READ_AUTH' | 'RATE_LIMIT_WRITE_ANON' | 'RATE_LIMIT_WRITE_AUTH';
  limit: number;
}

// Valores batem com wrangler.toml, mantidos aqui só pra montar os headers
// RateLimit-*, já que o binding em si não expõe o limite configurado.
const RATE_LIMIT_CONFIG: Record<`${RateLimitCategory}:${RateLimitIdentity}`, RateLimitConfig> = {
  'read:anon': { binding: 'RATE_LIMIT_READ_ANON', limit: 600 },
  'read:auth': { binding: 'RATE_LIMIT_READ_AUTH', limit: 3000 },
  'write:anon': { binding: 'RATE_LIMIT_WRITE_ANON', limit: 60 },
  'write:auth': { binding: 'RATE_LIMIT_WRITE_AUTH', limit: 600 },
};

export function rateLimitConfigFor(category: RateLimitCategory, identity: RateLimitIdentity): RateLimitConfig {
  return RATE_LIMIT_CONFIG[`${category}:${identity}`];
}

export function categoryForMethod(method: string): RateLimitCategory {
  return method === 'GET' || method === 'HEAD' ? 'read' : 'write';
}

// O binding nativo de rate limit da Cloudflare só retorna { success }, sem
// contagem restante nem horário de reset exato (ver design.md e a decisão
// registrada no proposal de v2 sobre esse gap). RateLimit-Remaining por isso
// é binário (0 ou o limite cheio) e RateLimit-Reset é sempre o início da
// próxima janela de 60s por relógio de parede, não o reset exato daquela
// chave.
export function rateLimitHeaders(config: RateLimitConfig, success: boolean): Record<string, string> {
  const resetEpochSeconds = Math.ceil(Date.now() / 60_000) * 60;
  return {
    'RateLimit-Limit': String(config.limit),
    'RateLimit-Remaining': String(success ? config.limit : 0),
    'RateLimit-Reset': String(resetEpochSeconds),
  };
}
