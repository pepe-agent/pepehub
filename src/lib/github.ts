export interface DeviceStartResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export async function startDeviceFlow(clientId: string): Promise<DeviceStartResponse> {
  const response = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'pepehub',
    },
    body: JSON.stringify({ client_id: clientId, scope: 'read:user' }),
  });
  if (!response.ok) {
    throw new Error(`GitHub device/code respondeu ${response.status}`);
  }
  return response.json();
}

export type DevicePollResult =
  | { status: 'success'; accessToken: string }
  | { status: 'pending' }
  | { status: 'expired' }
  | { status: 'denied' };

export async function pollDeviceFlow(
  clientId: string,
  clientSecret: string,
  deviceCode: string,
): Promise<DevicePollResult> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'pepehub',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  });

  const data = (await response.json()) as {
    access_token?: string;
    error?: string;
  };

  if (data.access_token) {
    return { status: 'success', accessToken: data.access_token };
  }

  switch (data.error) {
    case 'authorization_pending':
    case 'slow_down':
      return { status: 'pending' };
    case 'expired_token':
      return { status: 'expired' };
    case 'access_denied':
      return { status: 'denied' };
    default:
      throw new Error(`GitHub access_token respondeu erro inesperado: ${data.error ?? response.status}`);
  }
}

export interface GithubUser {
  id: number;
  login: string;
  name: string | null;
}

export async function fetchGithubUser(accessToken: string): Promise<GithubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'pepehub',
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub /user respondeu ${response.status}`);
  }
  const data = (await response.json()) as { id: number; login: string; name: string | null };
  return { id: data.id, login: data.login, name: data.name };
}
