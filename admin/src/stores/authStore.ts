import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, SignUpForm, SignInForm, PermissionKey } from "../types/auth";
import api, { clearToken } from "../utils/api";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isLoadingUserInfo: boolean;
  error: string | null;
  isOtpRequired: boolean;
  otpEmail: string | null;
  otpToken: string | null;
  isOtpSuccess: boolean;
  register: (data: SignUpForm) => Promise<void>;
  login: (data: SignInForm) => Promise<void>;
  logout: () => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  verifyEmail: (key: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (
    key: string,
    password: string,
    passwordConfirmation: string
  ) => Promise<void>;
  clearSession: () => void;
  fetchUserInfo: () => Promise<User>;
  updateUser: (user: User) => void;
  setOtpRequired: (required: boolean, email?: string) => void;
  verifyOtp: (code: string) => Promise<void>;
  resendOtp: () => Promise<void>;
  validateSession: () => Promise<void>;
  hasPermission: (key: PermissionKey) => boolean;
  hasAnyPermission: (...keys: PermissionKey[]) => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isLoadingUserInfo: false,
      error: null,
      isOtpRequired: false,
      otpEmail: null,
      otpToken: null,
      isOtpSuccess: false,

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await api.post("/api/v1/auth/register", {
            email: data.email,
            password: data.password,
            fullname: data.fullName,
            username: data.username,
          });
          set({ user: null, isLoading: false });
        } catch (error: any) {
          let errorMessage = "Error al registrar la cuenta";

          if (error.response?.status === 422) {
            // Handle validation errors from Rodauth
            const responseText = error.response?.data || "";

            if (typeof responseText === "string") {
              if (
                responseText.includes(
                  "Ya existe una cuenta con este correo electrónico"
                )
              ) {
                errorMessage =
                  "Ya existe una cuenta con este correo electrónico";
              } else if (
                responseText.includes("Este nombre de usuario ya está en uso")
              ) {
                errorMessage = "Este nombre de usuario ya está en uso";
              } else if (
                responseText.includes("Las contraseñas no coinciden")
              ) {
                errorMessage = "Las contraseñas no coinciden";
              } else if (
                responseText.includes("La contraseña debe tener al menos")
              ) {
                errorMessage = "La contraseña debe tener al menos 8 caracteres";
              } else if (
                responseText.includes("El nombre completo es requerido")
              ) {
                errorMessage = "El nombre completo es requerido";
              } else if (
                responseText.includes("El nombre de usuario es requerido")
              ) {
                errorMessage = "El nombre de usuario es requerido";
              } else if (
                responseText.includes(
                  "Solo se permiten letras, números y guiones bajos"
                )
              ) {
                errorMessage =
                  "El nombre de usuario solo puede contener letras, números y guiones bajos";
              } else if (
                responseText.includes("Formato de correo electrónico inválido")
              ) {
                errorMessage = "El formato del correo electrónico no es válido";
              } else if (responseText.includes("email")) {
                errorMessage =
                  "Problema con el correo electrónico proporcionado";
              } else if (responseText.includes("username")) {
                errorMessage =
                  "Problema con el nombre de usuario proporcionado";
              } else if (responseText.includes("password")) {
                errorMessage = "Problema con la contraseña proporcionada";
              } else if (responseText.includes("fullname")) {
                errorMessage = "El nombre completo es requerido";
              }
            }
          } else if (error.response?.status === 429) {
            errorMessage =
              "Demasiados intentos de registro. Por favor, espera un momento antes de intentar nuevamente.";
          } else if (error.response?.status >= 500) {
            errorMessage =
              "Error del servidor. Intenta nuevamente en unos momentos";
          } else if (!error.response) {
            errorMessage = "Sin conexión. Verifica tu conexión a internet";
          }

          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      login: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post(
            "/api/v1/auth/login",
            {
              email: data.email,
              password: data.password,
            },
            { withCredentials: true }
          );

          // Check if OTP is required (partial authentication)
          if (response.data?.otp_required) {
            set({
              isLoading: false,
              isOtpRequired: true,
              otpEmail: data.email,
              otpToken: response.data?.otp_token || null,
            });
            return;
          }

          // Fetch user info after successful login
          const fetchedUser = await get().fetchUserInfo();

          if (!fetchedUser) {
            throw new Error("No se pudo obtener la información del usuario");
          }

          set({ isLoading: false });
        } catch (error: any) {
          let errorMessage = "Error al iniciar sesión";

          const backendMessage =
            error.response?.data?.error || error.response?.data?.message;

          const translateLoginMessage = (message: string) => {
            const translations: Record<string, string> = {
              "There was an error logging you in":
                "Hubo un error al iniciar sesión. Verifica tus credenciales.",
              "There was an error logging in":
                "Hubo un error al iniciar sesión. Verifica tus credenciales.",
              "Invalid credentials":
                "Credenciales incorrectas. Verifica tu correo electrónico y contraseña.",
              "Invalid user credentials":
                "Credenciales incorrectas. Verifica tu correo electrónico y contraseña.",
              "User not found": "Usuario no encontrado.",
              "Account not verified":
                "Tu cuenta no está verificada. Revisa tu correo electrónico.",
              "Email is required": "El correo electrónico es requerido.",
              "Password is required": "La contraseña es requerida.",
            };

            return translations[message] || message;
          };

          if (backendMessage) {
            errorMessage = translateLoginMessage(backendMessage);
          }

          const fieldError = error.response?.data?.["field-error"];
          if (Array.isArray(fieldError) && fieldError[1]) {
            errorMessage = fieldError[1];
          }

          if (error.response?.status === 401) {
            // 401 means invalid credentials (email/password combination)
            errorMessage = translateLoginMessage(
              backendMessage ||
                "Credenciales incorrectas. Verifica que tu correo electrónico y contraseña sean correctos"
            );
          } else if (error.response?.status === 403) {
            // 403 means account exists but is not verified
            errorMessage =
              "Tu cuenta no está verificada. Revisa tu correo electrónico y activa tu cuenta.";
          } else if (error.response?.status === 422) {
            const responseText = error.response?.data || "";
            if (typeof responseText === "string") {
              if (responseText.includes("email")) {
                errorMessage = "El formato del correo electrónico no es válido";
              } else if (responseText.includes("password")) {
                errorMessage = "La contraseña es requerida";
              }
            } else if (Array.isArray(responseText?.errors)) {
              const formattedErrors = responseText.errors
                .map((err) =>
                  typeof err === "string"
                    ? translateLoginMessage(err)
                    : err?.message || err?.error || null
                )
                .filter(Boolean);
              if (formattedErrors.length) {
                errorMessage = formattedErrors.join(", ");
              }
            }
          } else if (error.response?.status === 429) {
            errorMessage =
              "Demasiados intentos de inicio de sesión. Por favor, espera un momento antes de intentar nuevamente.";
          } else if (error.response?.status === 400) {
            const responseText = error.response?.data;
            if (typeof responseText === "string") {
              errorMessage = translateLoginMessage(responseText);
            } else if (Array.isArray(responseText?.errors)) {
              const formattedErrors = responseText.errors
                .map((err) => {
                  const msg =
                    typeof err === "string"
                      ? translateLoginMessage(err)
                      : err?.message || err?.error || null;
                  // Translate common English messages to Spanish
                  if (msg) {
                    const translations: Record<string, string> = {
                      "Invalid user credentials":
                        "Credenciales incorrectas. Verifica tu correo electrónico y contraseña.",
                      "Invalid credentials":
                        "Credenciales incorrectas. Verifica tu correo electrónico y contraseña.",
                      "User not found": "Usuario no encontrado.",
                      "Account not verified":
                        "Tu cuenta no está verificada. Revisa tu correo electrónico.",
                      "Email is required": "El correo electrónico es requerido.",
                      "Password is required": "La contraseña es requerida.",
                    };
                    return translations[msg] || msg;
                  }
                  return null;
                })
                .filter(Boolean);
              if (formattedErrors.length) {
                errorMessage = formattedErrors.join(", ");
              }
            } else if (responseText?.errors?.message) {
              errorMessage = responseText.errors.message;
            }
          } else if (error.response?.status >= 500) {
            errorMessage =
              "Error del servidor. Intenta nuevamente en unos momentos";
          } else if (!error.response) {
            errorMessage = "Sin conexión. Verifica tu conexión a internet";
          }

          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      fetchUserInfo: async () => {
        set({ isLoadingUserInfo: true });
        try {
          // Since Rodauth doesn't have a built-in user info endpoint,
          // we'll create a simple one in our Rails app
          const response = await api.get("/api/v1/me", {
            withCredentials: true,
          });

          const fetchedUser = response.data?.user;
          set({ user: fetchedUser, isLoadingUserInfo: false });

          if (!fetchedUser) {
            throw new Error("No user info returned");
          }

          return fetchedUser;
        } catch (error: any) {
          console.error("Failed to fetch user info:", error);
          set({ user: null, isLoadingUserInfo: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          set({
            user: null,
            isLoading: false,
            isOtpRequired: false,
            otpEmail: null,
            otpToken: null,
            isOtpSuccess: false,
          });
          clearToken();
        } catch (error: any) {
          set({ error: "Logout failed", isLoading: false });
          throw error;
        }
      },

      // New: resend verification email
      resendVerification: async (email) => {
        try {
          await api.post(
            "/api/v1/auth/verify-account-resend",
            { email },
            { withCredentials: true }
          );
        } catch (error: any) {
          // Prefer backend error text; fall back to specific status handling
          const backendMessage =
            error.response?.data?.error || error.response?.data?.message;

          if (backendMessage) {
            throw new Error(backendMessage);
          }

          if (error.response?.status === 429) {
            throw new Error(
              "Se ha enviado un correo recientemente. Por favor, espera antes de solicitar otro."
            );
          }
          if (error.response?.status === 401) {
            throw new Error("Esta cuenta ya está verificada o no existe.");
          }

          throw new Error("No se pudo reenviar el correo de verificación");
        }
      },

      // New: verify email with token
      verifyEmail: async (key) => {
        try {
          await api.post(
            "/api/v1/auth/verify-account",
            { token: key },
            {
              withCredentials: true,
              headers: { Accept: "application/json" },
            }
          );
        } catch (error: any) {
          throw new Error("Token inválido o ya utilizado");
        }
      },

      // New: request password reset
      requestPasswordReset: async (email) => {
        try {
          await api.post(
            "/api/v1/auth/request-password-reset",
            { email },
            { withCredentials: true }
          );
        } catch (error: any) {
          const backendMessage =
            error.response?.data?.error || error.response?.data?.message;

          if (backendMessage) {
            throw new Error(backendMessage);
          }

          if (error.response?.status === 429) {
            throw new Error(
              "Demasiadas solicitudes de restablecimiento. Por favor, espera un momento antes de intentar nuevamente."
            );
          }

          throw new Error("No se pudo solicitar el restablecimiento");
        }
      },

      // New: reset password with token
      resetPassword: async (key, password, _passwordConfirmation) => {
        try {
          await api.post(
            "/api/v1/auth/reset-password",
            {
              token: key,
              password,
            },
            { withCredentials: true }
          );
        } catch (error: any) {
          if (error.response?.status === 401) {
            throw new Error("El enlace es inválido o ha expirado");
          }
          if (error.response?.status === 422) {
            throw new Error(
              "Las contraseñas no coinciden o no cumplen los requisitos"
            );
          }
          throw new Error("Error al restablecer la contraseña");
        }
      },

      clearSession: () => {
        set({
          user: null,
          isLoading: false,
          error: null,
          isOtpRequired: false,
          otpEmail: null,
          otpToken: null,
          isOtpSuccess: false,
        });
        clearToken();
      },

      updateUser: (user) => {
        set({ user });
      },

      setOtpRequired: (required, email) => {
        set({
          isOtpRequired: required,
          otpEmail: email || null,
          isOtpSuccess: false,
        });
      },

      verifyOtp: async (code) => {
        set({ isLoading: true, error: null });

        const otpToken = get().otpToken;
        if (!otpToken) {
          set({
            error: "Sesión OTP inválida. Por favor, inicia sesión nuevamente.",
            isLoading: false,
          });
          throw new Error("Sesión OTP inválida");
        }

        // Retry mechanism for network failures
        const maxRetries = 2;
        let lastError: any = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            const response = await api.post(
              "/api/v1/auth/verify-otp",
              {
                otp_token: otpToken,
                code: code,
              },
              { withCredentials: true }
            );

            // Check for success response
            if (response.data.success) {
              // Store the access token
              if (response.data.token) {
                localStorage.setItem("access_token", response.data.token);
              }
              // Store the refresh token so the interceptor can silently renew sessions
              if (response.data.refresh_token) {
                localStorage.setItem("refresh_token", response.data.refresh_token);
              }

              // Set success state first
              set({ isOtpSuccess: true, error: null });

              // Add a small delay for better UX
              await new Promise((resolve) => setTimeout(resolve, 1200));

              // Refresh user info from backend to ensure roles/redirects are accurate
              const fetchedUser = await get().fetchUserInfo();

              set({
                user: fetchedUser,
                isLoading: false,
                isOtpRequired: false,
                otpEmail: null,
                otpToken: null,
                error: null,
                isOtpSuccess: false,
              });
              return; // Success, exit function
            }
          } catch (error: any) {
            lastError = error;

            // Don't retry for client errors (4xx) - only for network/server errors
            if (error.response?.status && error.response.status < 500) {
              break; // Exit retry loop for client errors
            }

            // Wait before retrying (exponential backoff)
            if (attempt < maxRetries - 1) {
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * (attempt + 1))
              );
            }
          }
        }

        // Handle the error after all retries
        const error = lastError;
        let errorMessage = "Código inválido o expirado";

        if (error.response?.data?.error) {
          // Use Spanish error message from backend
          errorMessage = error.response.data.error;
        } else if (error.response?.status === 429) {
          errorMessage =
            "Demasiados intentos de verificación. Por favor, espera un momento antes de intentar nuevamente.";
        } else if (error.response?.status === 422) {
          errorMessage = "Código inválido o expirado";
        } else if (error.response?.status === 401) {
          errorMessage =
            "Sesión expirada. Por favor, inicia sesión nuevamente.";
        } else if (error.response?.status === 400) {
          errorMessage = error.response?.data?.error || "Código es requerido";
        } else if (error.response?.status >= 500) {
          errorMessage =
            "Error del servidor. Intenta nuevamente en unos momentos.";
        } else if (!error.response) {
          errorMessage =
            "Sin conexión. Verifica tu conexión a internet y vuelve a intentar.";
        }

        set({
          error: errorMessage,
          isLoading: false,
          isOtpSuccess: false,
        });

        throw new Error(errorMessage);
      },

      resendOtp: async () => {
        set({ isLoading: true, error: null });

        const otpToken = get().otpToken;
        if (!otpToken) {
          set({
            error: "Sesión OTP inválida. Por favor, inicia sesión nuevamente.",
            isLoading: false,
          });
          throw new Error("Sesión OTP inválida");
        }

        // Retry mechanism for network failures
        const maxRetries = 2;
        let lastError: any = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            const response = await api.post(
              "/api/v1/auth/send-otp",
              {
                otp_token: otpToken,
              },
              { withCredentials: true }
            );

            // Check for success response
            if (response.data.success) {
              set({ isLoading: false, error: null });
              return; // Success, exit function
            }
          } catch (error: any) {
            lastError = error;

            // Don't retry for client errors (4xx) - only for network/server errors
            if (error.response?.status && error.response.status < 500) {
              break; // Exit retry loop for client errors
            }

            // Wait before retrying (exponential backoff)
            if (attempt < maxRetries - 1) {
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * (attempt + 1))
              );
            }
          }
        }

        // Handle the error after all retries
        const error = lastError;
        let errorMessage = "No se pudo reenviar el código";

        if (error.response?.data?.error) {
          // Use Spanish error message from backend
          errorMessage = error.response.data.error;
        } else if (error.response?.data?.message) {
          // Use Spanish message from backend
          errorMessage = error.response.data.message;
        } else if (error.response?.status === 429) {
          errorMessage =
            "Demasiadas solicitudes de código OTP. Por favor, espera un momento antes de intentar nuevamente.";
        } else if (error.response?.status === 401) {
          errorMessage =
            "Sesión expirada. Por favor, inicia sesión nuevamente.";
        } else if (error.response?.status === 404) {
          errorMessage = "Usuario no encontrado";
        } else if (error.response?.status >= 500) {
          errorMessage =
            "Error del servidor. Intenta nuevamente en unos momentos.";
        } else if (!error.response) {
          errorMessage =
            "Sin conexión. Verifica tu conexión a internet y vuelve a intentar.";
        }

        set({ error: errorMessage, isLoading: false });

        throw new Error(errorMessage);
      },

      validateSession: async () => {
        const currentUser = get().user;

        if (!currentUser) {
          return;
        }

        try {
          await get().fetchUserInfo();
        } catch (_error) {
          set({
            user: null,
            isOtpRequired: false,
            otpEmail: null,
            otpToken: null,
            isOtpSuccess: false,
            error: null,
          });
          clearToken();
        }
      },

      hasPermission: (key: PermissionKey) => {
        const user = get().user;
        return user?.permissions?.includes(key) ?? false;
      },

      hasAnyPermission: (...keys: PermissionKey[]) => {
        const user = get().user;
        if (!user?.permissions) return false;
        return keys.some((key) => user.permissions.includes(key));
      },

      hasRole: (role: string) => {
        const user = get().user;
        return user?.roles?.includes(role) ?? false;
      },
    }),
    {
      name: "auth-storage",
      partialize: (state: AuthState) => ({
        user: state.user,
      }),
    }
  )
);
