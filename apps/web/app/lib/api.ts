const configuredUrl =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const origin = configuredUrl.replace(/\/+$/, '');
export const API_BASE_URL = origin.endsWith('/api/v1')
  ? origin
  : `${origin}/api/v1`;

export interface ApiErrorBody {
  code?: string;
  message?: string | string[];
  rpcResultCode?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string,
    public readonly rpcResultCode?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...init?.headers,
      },
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(
      0,
      'API_UNAVAILABLE',
      'No se pudo conectar con el backend.',
    );
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (body ?? {}) as ApiErrorBody;
    const message = Array.isArray(error.message)
      ? error.message.join(' ')
      : (error.message ?? 'La solicitud no pudo completarse.');
    throw new ApiError(
      response.status,
      error.code,
      message,
      error.rpcResultCode,
    );
  }
  return body as T;
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'API_UNAVAILABLE') {
      return `${error.message} Revisa NEXT_PUBLIC_API_URL.`;
    }
    return error.message;
  }
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}
