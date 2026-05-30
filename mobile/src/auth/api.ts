import { NativeModules } from 'react-native';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown>;
};

type LoginResponse = {
  otp_required?: boolean;
  otp_token?: string;
  email?: string;
  message?: string;
};

type OtpResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

const DEFAULT_API_PORT = process.env.EXPO_PUBLIC_API_PORT || '3001';
const REQUEST_TIMEOUT_MS = 8000;

function isTunnelHost(host: string) {
  return host.includes('exp.direct') || host.includes('expo.dev');
}

function isLocalNetworkHost(host: string) {
  if (host === 'localhost' || host === '127.0.0.1') return true;

  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;

  const match172 = host.match(/^172\.(\d+)\./);
  if (match172) {
    const secondOctet = Number(match172[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
}

function inferApiBaseUrl() {
  const scriptURL = NativeModules?.SourceCode?.scriptURL as string | undefined;
  if (!scriptURL) return null;

  try {
    const parsed = new URL(scriptURL);
    const host = parsed.hostname;
    if (!host) return null;

    if (isTunnelHost(host)) {
      return null;
    }

    if (!isLocalNetworkHost(host)) {
      return null;
    }

    return `http://${host}:${DEFAULT_API_PORT}`;
  } catch {
    return null;
  }
}

export function getApiBaseUrl() {
  const explicitUrl = process.env.EXPO_PUBLIC_API_URL;
  if (explicitUrl) {
    return explicitUrl;
  }

  return inferApiBaseUrl() || `http://localhost:${DEFAULT_API_PORT}`;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;

  let response: Response;
  const baseUrl = getApiBaseUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(
        `Timeout conectando a API (${baseUrl}). Verifica que la IP sea accesible desde el telefono.`,
      );
    }

    throw new Error(
      `Sin conexion con la API (${baseUrl}). Si usas Expo tunnel, crea mobile/.env con EXPO_PUBLIC_API_URL=http://TU_IP_LAN:3001 y reinicia Metro con --clear.`,
    );
  } finally {
    clearTimeout(timeout);
  }

  const raw = await response.text();
  let payload: any = null;

  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = raw;
  }

  if (!response.ok) {
    const message =
      payload?.error ||
      payload?.message ||
      (typeof payload === 'string' && payload.trim()) ||
      `Error HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export const authApi = {
  getApiBaseUrl,
  me: () => request<{ user: any }>('/api/v1/me'),
  login: (email: string, password: string) =>
    request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  verifyOtp: (otpToken: string, code: string) =>
    request<OtpResponse>('/api/v1/auth/verify-otp', {
      method: 'POST',
      body: { otp_token: otpToken, code },
    }),
  resendOtp: (otpToken: string) =>
    request<OtpResponse>('/api/v1/auth/send-otp', {
      method: 'POST',
      body: { otp_token: otpToken },
    }),
  register: (data: {
    email: string;
    password: string;
    fullname: string;
    username: string;
  }) => request('/api/v1/auth/register', { method: 'POST', body: data }),
  resendVerification: (email: string) =>
    request('/api/v1/auth/verify-account-resend', {
      method: 'POST',
      body: { email },
    }),
  verifyEmail: (token: string) =>
    request('/api/v1/auth/verify-account', {
      method: 'POST',
      body: { token },
    }),
  requestPasswordReset: (email: string) =>
    request('/api/v1/auth/request-password-reset', {
      method: 'POST',
      body: { email },
    }),
  resetPassword: (token: string, password: string) =>
    request('/api/v1/auth/reset-password', {
      method: 'POST',
      body: { token, password },
    }),
};
