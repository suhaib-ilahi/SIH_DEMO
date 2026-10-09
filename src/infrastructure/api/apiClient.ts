import { ApiError } from './apiErrors';

export class ApiClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string) { this.baseUrl = baseUrl.replace(/\/+$/, ''); }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${path.replace(/^\/+/, '')}`, {
      ...init,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init.headers },
    });
    const text = await response.text();
    let body: unknown = undefined;
    if (text) { try { body = JSON.parse(text); } catch { body = text; } }
    if (!response.ok) throw new ApiError(response.status, `API request failed with HTTP ${response.status}.`, body);
    return body as T;
  }
}
