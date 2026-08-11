export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
}

export function errorResponse(status: number, error: string, message: string): Response {
  return json({ error, message }, { status });
}
