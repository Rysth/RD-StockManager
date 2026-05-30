import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { authApi } from './api';
import type { SignInForm, SignUpForm, User } from './types';

type AuthContextType = {
  user: User | null;
  isBooting: boolean;
  isLoading: boolean;
  error: string | null;
  otpEmail: string | null;
  isOtpRequired: boolean;
  apiBaseUrl: string;
  signIn: (data: SignInForm) => Promise<{ otpRequired: boolean }>;
  verifyOtp: (code: string) => Promise<void>;
  resendOtp: () => Promise<void>;
  signUp: (data: SignUpForm) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string, passwordConfirmation: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  cancelOtp: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isOtpRequired, setIsOtpRequired] = useState(false);
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [otpToken, setOtpToken] = useState<string | null>(null);

  const apiBaseUrl = authApi.getApiBaseUrl();

  const bootstrap = useCallback(async () => {
    try {
      const response = await authApi.me();
      setUser(response.user ?? null);
    } catch (err: any) {
      setUser(null);
      setError(err?.message || 'No se pudo validar la sesion inicial');
    } finally {
      setIsBooting(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const signIn = useCallback(async (data: SignInForm) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.login(data.email, data.password);

      if (response?.otp_required) {
        setIsOtpRequired(true);
        setOtpEmail(response.email || data.email);
        setOtpToken(response.otp_token || null);
        return { otpRequired: true };
      }

      const me = await authApi.me();
      setUser(me.user ?? null);
      return { otpRequired: false };
    } catch (err: any) {
      const message = err?.message || 'Error al iniciar sesion';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyOtp = useCallback(async (code: string) => {
    if (!otpToken) {
      throw new Error('Sesion OTP invalida. Inicia sesion nuevamente.');
    }

    setIsLoading(true);
    setError(null);

    try {
      await authApi.verifyOtp(otpToken, code);
      const me = await authApi.me();
      setUser(me.user ?? null);
      setIsOtpRequired(false);
      setOtpEmail(null);
      setOtpToken(null);
    } catch (err: any) {
      const message = err?.message || 'Codigo OTP invalido o expirado';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [otpToken]);

  const resendOtp = useCallback(async () => {
    if (!otpToken) {
      throw new Error('Sesion OTP invalida. Inicia sesion nuevamente.');
    }

    setIsLoading(true);
    setError(null);

    try {
      await authApi.resendOtp(otpToken);
    } catch (err: any) {
      const message = err?.message || 'No se pudo reenviar el codigo OTP';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [otpToken]);

  const signUp = useCallback(async (data: SignUpForm) => {
    setIsLoading(true);
    setError(null);

    try {
      await authApi.register({
        email: data.email,
        password: data.password,
        fullname: data.fullName,
        username: data.username,
      });
    } catch (err: any) {
      const message = err?.message || 'Error al crear la cuenta';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await authApi.resendVerification(email);
    } catch (err: any) {
      const message = err?.message || 'No se pudo reenviar la verificacion';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyEmail = useCallback(async (token: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await authApi.verifyEmail(token);
    } catch (err: any) {
      const message = err?.message || 'Token invalido o expirado';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await authApi.requestPasswordReset(email);
    } catch (err: any) {
      const message = err?.message || 'No se pudo solicitar restablecimiento';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(
    async (token: string, password: string, passwordConfirmation: string) => {
      if (password !== passwordConfirmation) {
        throw new Error('Las contrasenas no coinciden');
      }

      setIsLoading(true);
      setError(null);

      try {
        await authApi.resetPassword(token, password);
      } catch (err: any) {
        const message = err?.message || 'No se pudo restablecer la contrasena';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    setUser(null);
    setError(null);
    setIsOtpRequired(false);
    setOtpEmail(null);
    setOtpToken(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const cancelOtp = useCallback(() => {
    setIsOtpRequired(false);
    setOtpEmail(null);
    setOtpToken(null);
    setError(null);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isBooting,
      isLoading,
      error,
      otpEmail,
      isOtpRequired,
      apiBaseUrl,
      signIn,
      verifyOtp,
      resendOtp,
      signUp,
      resendVerification,
      verifyEmail,
      requestPasswordReset,
      resetPassword,
      logout,
      clearError,
      cancelOtp,
    }),
    [
      user,
      isBooting,
      isLoading,
      error,
      otpEmail,
      isOtpRequired,
      apiBaseUrl,
      signIn,
      verifyOtp,
      resendOtp,
      signUp,
      resendVerification,
      verifyEmail,
      requestPasswordReset,
      resetPassword,
      logout,
      clearError,
      cancelOtp,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
