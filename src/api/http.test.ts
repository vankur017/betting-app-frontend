import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from './http';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('unwraps the success envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, { success: true, data: [{ id: 'crash' }] })),
    );
    await expect(apiRequest('/api/games')).resolves.toEqual([{ id: 'crash' }]);
  });

  it('sends the idempotency key and a JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, { success: true, data: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/api/games/crash/start', {
      method: 'POST',
      body: { stake: 100 },
      idempotencyKey: 'key-12345',
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.get('Idempotency-Key')).toBe('key-12345');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(init.body).toBe('{"stake":100}');
  });

  it('maps the error envelope to ApiError', async () => {
    const message = 'Stake must be between 10 and 100000 minor units.';
    const details = { field: 'stake', minStake: 10, maxStake: 100000 };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(400, {
          success: false,
          error: { code: 'STAKE_OUT_OF_RANGE', message, details },
        }),
      ),
    );
    await expect(apiRequest('/api/x')).rejects.toMatchObject({
      status: 400,
      code: 'STAKE_OUT_OF_RANGE',
      message,
      details,
      fieldErrors: { stake: message },
    });
  });

  it('hides server error text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(500, {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'TypeError at crash.service.js:12' },
        }),
      ),
    );
    const error = await apiRequest('/api/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).not.toContain('crash.service.js');
  });

  it('rejects a success response without the envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { balance: 5 })));
    await expect(apiRequest('/api/wallet')).rejects.toMatchObject({ code: 'UNEXPECTED_RESPONSE' });
  });

  it('reports network failures with status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(apiRequest('/api/x')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('returns undefined for 204 responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(apiRequest('/api/x', { method: 'POST' })).resolves.toBeUndefined();
  });
});
