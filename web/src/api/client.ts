export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

export async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('xray_auth_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem('xray_auth_token');
    // If not on login page, redirect to login
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }

  let data: any;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => null);
  }

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || `HTTP error ${res.status}: ${res.statusText}`;
    throw new ApiError(errorMsg, res.status, data);
  }

  return data;
}

export const api = {
  get: <T = any>(url: string, options?: RequestInit) =>
    request<T>(url, { ...options, method: 'GET' }),
  post: <T = any>(url: string, body?: any, options?: RequestInit) =>
    request<T>(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T = any>(url: string, body?: any, options?: RequestInit) =>
    request<T>(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T = any>(url: string, options?: RequestInit) =>
    request<T>(url, { ...options, method: 'DELETE' }),
};
