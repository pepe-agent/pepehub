import { describe, expect, it } from 'vitest';
import { createSessionToken, verifySessionToken } from '../src/lib/session';

const SECRET = 'a-test-secret';

describe('session tokens', () => {
  it('assina e verifica um token válido', async () => {
    const token = await createSessionToken({ ownerId: 1, githubId: 42, handle: 'alice' }, SECRET);
    const payload = await verifySessionToken(token, SECRET);
    expect(payload).toMatchObject({ ownerId: 1, githubId: 42, handle: 'alice' });
  });

  it('rejeita um token assinado com outro segredo', async () => {
    const token = await createSessionToken({ ownerId: 1, githubId: 42, handle: 'alice' }, SECRET);
    const payload = await verifySessionToken(token, 'outro-segredo');
    expect(payload).toBeNull();
  });

  it('rejeita um token adulterado', async () => {
    const token = await createSessionToken({ ownerId: 1, githubId: 42, handle: 'alice' }, SECRET);
    const [payloadPart, signaturePart] = token.split('.');
    const tampered = `${payloadPart}x.${signaturePart}`;
    expect(await verifySessionToken(tampered, SECRET)).toBeNull();
  });

  it('rejeita um token malformado', async () => {
    expect(await verifySessionToken('not-a-token', SECRET)).toBeNull();
  });
});
