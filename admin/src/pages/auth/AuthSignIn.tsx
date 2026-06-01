import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group";
import { Mail, ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";
import PasswordInput from "../../components/shared/PasswordInput";
import { useAuthStore } from "../../stores/authStore";
import type { SignInForm } from "../../types/auth";
import { getDefaultAdminRoute } from "../../utils/adminRoutes";

export default function AuthSignIn() {
    const {
        login,
        isLoading,
        isLoadingUserInfo,
        user,
        hasPermission,
        hasAnyPermission,
        isOtpRequired,
        otpEmail,
        isOtpSuccess,
        verifyOtp,
        resendOtp,
        clearSession,
    } = useAuthStore();
    const navigate = useNavigate();
    const [rememberEmail, setRememberEmail] = useState(false);
    const [otpCode, setOtpCode] = useState("");

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
        if (user) {
            navigate(
                getDefaultAdminRoute({ user, hasPermission, hasAnyPermission }),
                { replace: true },
            );
        }
    }, [user, navigate, hasPermission, hasAnyPermission]);

    const onSubmit = async (data: SignInForm) => {
        try {
            // Handle email remembering
            if (rememberEmail) {
                localStorage.setItem("rememberedEmail", data.email);
            } else {
                localStorage.removeItem("rememberedEmail");
            }

            await login(data);

            // Si la cuenta es admin, el login queda pendiente de verificación OTP.
            if (useAuthStore.getState().isOtpRequired) {
                toast.success("Te enviamos un código de verificación a tu correo");
            } else {
                toast.success("¡Inicio de sesión exitoso!");
            }
        } catch (err: any) {
            toast.error(err.message || "Error al iniciar sesión");
        }
    };

    const onVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otpCode.length !== 6) {
            toast.error("Ingresa el código de 6 dígitos");
            return;
        }
        try {
            await verifyOtp(otpCode);
            toast.success("¡Verificación exitosa!");
        } catch (err: any) {
            setOtpCode("");
            toast.error(err.message || "Código inválido o expirado");
        }
    };

    const onResend = async () => {
        try {
            await resendOtp();
            toast.success("Código reenviado a tu correo");
        } catch (err: any) {
            toast.error(err.message || "No se pudo reenviar el código");
        }
    };

    const onCancelOtp = () => {
        setOtpCode("");
        clearSession();
    };

    // ====== Paso 2: verificación OTP (solo administradores) ======
    if (isOtpRequired) {
        return (
            <>
                <div className="flex flex-col space-y-2 text-center">
                    <div className="mx-auto mb-1 flex size-12 items-center justify-center rounded-full bg-primary/10">
                        <ShieldCheck className="size-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Verificación en dos pasos
                    </h1>
                    <p className="text-sm text-muted-foreground mb-2">
                        Ingresa el código de 6 dígitos que enviamos a{" "}
                        <span className="font-medium text-foreground">
                            {otpEmail || "tu correo"}
                        </span>
                    </p>
                </div>

                <form onSubmit={onVerifyOtp} className="flex flex-col w-full gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="otp">Código de verificación</Label>
                        <InputGroup>
                            <InputGroupAddon>
                                <ShieldCheck className="opacity-50" />
                            </InputGroupAddon>
                            <InputGroupInput
                                id="otp"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                autoFocus
                                maxLength={6}
                                placeholder="123456"
                                className="tracking-[0.5em] text-center text-lg font-semibold"
                                value={otpCode}
                                onChange={(e) =>
                                    setOtpCode(
                                        e.target.value.replace(/\D/g, "").slice(0, 6),
                                    )
                                }
                            />
                        </InputGroup>
                    </div>

                    <Button
                        type="submit"
                        size="lg"
                        className="w-full"
                        disabled={isLoading || isLoadingUserInfo || otpCode.length !== 6}
                    >
                        {isOtpSuccess ? (
                            <>
                                <CheckCircle2 className="size-4" />
                                <span>Verificado</span>
                            </>
                        ) : isLoading || isLoadingUserInfo ? (
                            <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                        ) : (
                            <span>Verificar código</span>
                        )}
                    </Button>

                    <div className="flex items-center justify-between text-sm">
                        <button
                            type="button"
                            onClick={onCancelOtp}
                            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="size-3.5" /> Volver
                        </button>
                        <button
                            type="button"
                            onClick={onResend}
                            disabled={isLoading}
                            className="font-medium text-primary hover:underline disabled:opacity-50"
                        >
                            Reenviar código
                        </button>
                    </div>
                </form>
            </>
        );
    }

    // ====== Paso 1: credenciales ======
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
        </>
    );
}
