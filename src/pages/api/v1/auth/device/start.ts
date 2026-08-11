import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { startDeviceFlow } from '../../../../../lib/github';
import { json } from '../../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async () => {
  const data = await startDeviceFlow(env.GITHUB_OAUTH_CLIENT_ID);

  return json({
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    interval: data.interval,
  });
};
