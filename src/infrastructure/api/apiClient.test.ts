import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';

describe('ApiClient', () => {
  afterEach(() => vi.restoreAllMocks());

  it('joins the configured base URL and parses JSON responses', async () => {
    const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    const result = await new ApiClient('http://localhost:8000/api/v1/').request<{ ok: boolean }>('/cases');
    expect(result).toEqual({ ok: true });
    expect(request).toHaveBeenCalledWith('http://localhost:8000/api/v1/cases', expect.objectContaining({ headers: expect.any(Object) }));
  });

  it('raises a typed error for non-success responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"message":"bad"}', { status: 400 }));
    await expect(new ApiClient('http://localhost:8000').request('/cases')).rejects.toMatchObject({ name: 'ApiError', status: 400 });
  });
});
