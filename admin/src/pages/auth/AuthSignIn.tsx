import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group";
import { Mail } from "lucide-react";
import PasswordInput from "../../components/shared/PasswordInput";
import OtpInput from "../../components/auth/OtpInput";
import { useAuthStore } from "../../stores/authStore";
import type { SignInForm } from "../../types/auth";
import { getDefaultAdminRoute } from "../../utils/adminRoutes";

export default function AuthSignIn() {
    const {
        login,
        isLoading,
        isLoadingUserInfo,
        user,
        isOtpRequired,
        otpEmail,
        verifyOtp,
        resendOtp,
        error,
        setOtpRequired,
        isOtpSuccess,
        hasPermission,
        hasAnyPermission,
    } = useAuthStore();
    const navigate = useNavigate();
    const [rememberEmail, setRememberEmail] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<SignInForm>();

    // Load saved email on component mount
    useEffect(() => {
        const savedEmail = localStorage.getItem("rememberedEmail");
        if (savedEmail) {
            setValue("email", savedEmail);
            setRememberEmail(true);
        }
    }, [setValue]);

    // Redirect authenticated users to the first route they can actually use
    useEffect(() => {
        if (user && !isOtpRequired) {
            navigate(
                getDefaultAdminRoute({ user, hasPermission, hasAnyPermission }),
                { replace: true },
            );
        }
    }, [user, navigate, isOtpRequired, hasPermission, hasAnyPermission]);

    // Cleanup OTP state when component unmounts or user navigates away
    useEffect(() => {
        return () => {
            // Only cleanup if user is not authenticated (abandoned flow)
            if (isOtpRequired && !user) {
                setOtpRequired(false);
            }
        };
    }, [isOtpRequired, user, setOtpRequired]);

    const onSubmit = async (data: SignInForm) => {
        try {
            // Handle email remembering
            if (rememberEmail) {
                localStorage.setItem("rememberedEmail", data.email);
            } else {
                localStorage.removeItem("rememberedEmail");
            }

            await login(data);

            // Only show success message if OTP is not required
            if (!isOtpRequired) {
                toast.success("¡Inicio de sesión exitoso!");
            }
            // The redirect will be handled by the useEffect hook above
            // No need to navigate here
        } catch (err: any) {
            // The auth store already handles specific error messages and throws them
            // We just need to show the error message from the thrown error
            toast.error(err.message || "Error al iniciar sesión");
        }
    };

    // OTP verification handler with comprehensive error handling and recovery
    const handleOtpVerify = async (code: string) => {
        try {
            await verifyOtp(code);
            // Success toast will be shown after the success state is displayed
            setTimeout(() => {
                toast.success("¡Verificación exitosa! Redirigiendo...", {
                    duration: 2000,
                    icon: "✅",
                });
            }, 300);
            // Navigation will be handled by the useEffect hook that watches for user changes
        } catch (err: any) {
            // Specific error handling based on error type
            const errorType = err.type || "unknown";
            const errorDetails = err.details || {};

            switch (errorType) {
                case "expired_code":
                    toast.error("El código ha expirado. Solicita uno nuevo.", {
                        duration: 5000,
                        icon: "⏰",
                    });
                    break;

                case "account_locked":
                    const lockedUntil = errorDetails.lockedUntil
                        ? new Date(errorDetails.lockedUntil)
                        : null;

                    const lockedMessage = lockedUntil
                        ? `Cuenta bloqueada hasta las ${lockedUntil.toLocaleTimeString(
                              "es-ES",
                              {
                                  hour: "2-digit",
                                  minute: "2-digit",
                              },
                          )}.`
                        : "Cuenta bloqueada por múltiples intentos fallidos.";

                    toast.error(lockedMessage, {
                        duration: 8000,
                        icon: "🔒",
                    });

                    // Show additional information about lockout notification
                    setTimeout(() => {
                        toast(
                            (t) => (
                                <div className="flex flex-col max-w-sm gap-2">
                                    <div className="flex items-start gap-2">
                                        <span className="text-2xl">📧</span>
                                        <div className="flex-1">
                                            <p className="mb-1 text-sm font-semibold">
                                                Notificación enviada
                                            </p>
                                            <p className="text-xs text-gray-600">
                                                Hemos enviado un correo con
                                                instrucciones de desbloqueo a tu
                                                dirección de email.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            toast.dismiss(t.id);
                                            handleBackToLogin();
                                        }}
                                        className="px-3 py-2 text-sm text-white transition-colors bg-blue-600 rounded hover:bg-blue-700"
                                    >
                                        Volver al inicio de sesión
                                    </button>
                                </div>
                            ),
                            { duration: 12000 },
                        );
                    }, 2000);
                    break;

                case "invalid_code":
                case "invalid_or_expired":
                    const remainingAttempts = errorDetails.remainingAttempts;
                    const attemptMessage = remainingAttempts
                        ? `Código incorrecto. Te quedan ${remainingAttempts} intentos.`
                        : "Código incorrecto. Verifica e intenta nuevamente.";

                    toast.error(attemptMessage, {
                        duration: 4000,
                        icon: "❌",
                    });
                    break;

                case "invalid_format":
                    toast.error("El código debe ser de 6 dígitos numéricos.", {
                        duration: 3000,
                        icon: "⚠️",
                    });
                    break;

                case "network_error":
                    toast.error(
                        "Error de conexión. Verifica tu internet e intenta nuevamente.",
                        {
                            duration: 5000,
                            icon: "📡",
                        },
                    );

                    // Offer retry option for network errors
                    setTimeout(() => {
                        toast(
                            (t) => (
                                <div className="flex flex-col gap-2">
                                    <span className="font-semibold">
                                        ¿Deseas reintentar?
                                    </span>
                                    <button
                                        onClick={() => {
                                            toast.dismiss(t.id);
                                            // The user can re-enter the code
                                        }}
                                        className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                                    >
                                        Reintentar verificación
                                    </button>
                                </div>
                            ),
                            { duration: 8000 },
                        );
                    }, 1500);
                    break;

                case "server_error":
                    toast.error(
                        "Error del servidor. Intenta nuevamente en unos momentos.",
                        {
                            duration: 5000,
                            icon: "🔧",
                        },
                    );
                    break;

                case "session_expired":
                    toast.error(
                        "Tu sesión ha expirado. Inicia sesión nuevamente.",
                        {
                            duration: 5000,
                            icon: "⏱️",
                        },
                    );

                    // Automatically restart authentication
                    setTimeout(() => {
                        handleBackToLogin();
                    }, 2000);
                    break;

                default:
                    toast.error(err.message || "Error al verificar el código", {
                        duration: 4000,
                    });
            }
        }
    };

    // OTP resend handler with comprehensive error handling and user feedback
    const handleOtpResend = async () => {
        try {
            await resendOtp();
            toast.success("Nuevo código enviado a tu correo electrónico", {
                duration: 4000,
                icon: "📧",
            });
        } catch (err: any) {
            // Specific error handling for resend scenarios
            const errorType = err.type || "unknown";
            const errorDetails = err.details || {};

            switch (errorType) {
                case "rate_limited":
                    const retryAfter = errorDetails.retryAfter;
                    const waitMessage = retryAfter
                        ? `Debes esperar ${retryAfter} segundos antes de solicitar otro código.`
                        : "Debes esperar antes de solicitar otro código.";

                    toast.error(waitMessage, {
                        duration: 4000,
                        icon: "⏳",
                    });
                    break;

                case "account_locked":
                    const lockedMessage = errorDetails.lockedUntil
                        ? `Cuenta bloqueada. No puedes solicitar códigos hasta ${new Date(
                              errorDetails.lockedUntil,
                          ).toLocaleTimeString("es-ES", {
                              hour: "2-digit",
                              minute: "2-digit",
                          })}.`
                        : "Cuenta bloqueada. No puedes solicitar códigos nuevos.";

                    toast.error(lockedMessage, {
                        duration: 6000,
                        icon: "🔒",
                    });
                    break;

                case "session_expired":
                    toast.error(
                        "Tu sesión ha expirado. Inicia sesión nuevamente.",
                        {
                            duration: 5000,
                            icon: "⏱️",
                        },
                    );

                    // Automatically restart authentication
                    setTimeout(() => {
                        handleBackToLogin();
                    }, 2000);
                    break;

                case "network_error":
                    toast.error(
                        "Error de conexión. Verifica tu internet e intenta nuevamente.",
                        {
                            duration: 5000,
                            icon: "📡",
                        },
                    );

                    // Offer retry option for network errors
                    setTimeout(() => {
                        toast(
                            (t) => (
                                <div className="flex flex-col gap-2">
                                    <span className="font-semibold">
                                        ¿Deseas reintentar?
                                    </span>
                                    <button
                                        onClick={() => {
                                            toast.dismiss(t.id);
                                            handleOtpResend();
                                        }}
                                        className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                                    >
                                        Reintentar envío
                                    </button>
                                </div>
                            ),
                            { duration: 8000 },
                        );
                    }, 1500);
                    break;

                case "server_error":
                    toast.error(
                        "Error del servidor. Intenta nuevamente en unos momentos.",
                        {
                            duration: 5000,
                            icon: "🔧",
                        },
                    );
                    break;

                default:
                    toast.error(
                        err.message || "No se pudo reenviar el código",
                        {
                            duration: 4000,
                        },
                    );
            }
        }
    };

    // Handle back navigation from OTP form with proper cleanup
    const handleBackToLogin = () => {
        setOtpRequired(false);
        // Clear any existing errors
        // Note: The auth store should handle error clearing when OTP state changes
    };

    // Render OTP form when required
    if (isOtpRequired && otpEmail) {
        return (
            <>
                <OtpInput
                    onSubmit={handleOtpVerify}
                    onResend={handleOtpResend}
                    isLoading={isLoading || isLoadingUserInfo}
                    error={error}
                    email={otpEmail}
                    isSuccess={isOtpSuccess}
                />

                {/* Back to login option - disabled during loading */}
                <div className="flex items-center justify-center gap-1 mt-0 text-sm text-center">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleBackToLogin}
                        disabled={isLoading || isLoadingUserInfo}
                        className="text-slate-600 hover:text-slate-800 disabled:opacity-50"
                    >
                        <i className="mr-1 bx bx-arrow-back" />
                        Volver al inicio de sesión
                    </Button>
                </div>

                {/* Loading indicator for user info fetch */}
                {isLoadingUserInfo && (
                    <div className="flex items-center justify-center gap-2 mt-4 text-sm text-slate-600">
                        <div className="w-4 h-4 border-2 rounded-full border-slate-300 border-t-blue-600 animate-spin"></div>
                        Completando autenticación...
                    </div>
                )}
            </>
        );
    }

    return (
        <>
            <div className="flex flex-col space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Inicia sesión
                </h1>
                <p className="text-sm text-muted-foreground mb-4">
                    Ingresa tu correo electrónico para acceder a tu cuenta
                </p>
            </div>

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col w-full gap-4"
            >
                <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <InputGroup>
                        <InputGroupAddon>
                            <Mail className="opacity-50" />
                        </InputGroupAddon>
                        <InputGroupInput
                            id="email"
                            type="email"
                            placeholder="usuario@dominio.com"
                            autoComplete="email"
                            {...register("email", {
                                required: true,
                                pattern: {
                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                    message: "Correo electrónico inválido",
                                },
                            })}
                        />
                    </InputGroup>
                    {errors.email && (
                        <span className="text-sm font-bold text-red-600">
                            {errors.email.message || "Requerido"}
                        </span>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <PasswordInput
                        register={register("password", {
                            required: true,
                        })}
                        placeholder="••••••••••••"
                        name="password"
                        autoComplete="current-password"
                    />
                    {errors.password && (
                        <span className="text-sm font-bold text-red-600">
                            {errors.password.message || "Requerido"}
                        </span>
                    )}
                </div>

                {/* Remember Email Checkbox */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="remember"
                            checked={rememberEmail}
                            onCheckedChange={(checked) =>
                                setRememberEmail(checked === true)
                            }
                        />
                        <Label htmlFor="remember" className="text-sm">
                            Recordar correo electrónico
                        </Label>
                    </div>
                    <Link
                        to="/auth/forgot-password"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                        ¿Olvidaste tu contraseña?
                    </Link>
                </div>

                <div className="mt-2">
                    <Button
                        type="submit"
                        size="lg"
                        className="w-full"
                        disabled={isLoading || isLoadingUserInfo}
                    >
                        {isLoading || isLoadingUserInfo ? (
                            <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                        ) : (
                            <i className="bx bx-log-in"></i>
                        )}
                        <span>
                            {isLoading
                                ? "Iniciando sesión..."
                                : isLoadingUserInfo
                                  ? "Cargando información..."
                                  : "Iniciar Sesión"}
                        </span>
                    </Button>
                </div>
            </form>

            <div className="space-y-4">
                <div className="flex flex-col gap-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-sm mt-4">
                        <p className="text-neutral-500 ">
                            ¿No tienes una cuenta?
                        </p>
                        <Link
                            to="/auth/signup"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                            Crear una cuenta
                        </Link>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-sm">
                        <Link
                            to="/auth/confirm"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                            ¿No recibiste las instrucciones de confirmación?
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
