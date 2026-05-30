import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import PasswordInput from "../../../components/shared/PasswordInput";
import { useUserStore } from "../../../stores/userStore";
import { useAuthStore } from "../../../stores/authStore";

// ── Types ────────────────────────────────────────────────────

interface UserFormData {
  fullname: string;
  username: string;
  email: string;
  identification?: string;
  phone_number?: string;
  password?: string;
  passwordConfirmation?: string;
}

interface UsersCreateProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Constants ────────────────────────────────────────────────

const ALL_ROLES = [
  { value: "user", label: "Usuario", description: "Acceso básico al sistema" },
  {
    value: "manager",
    label: "Gerente",
    description: "Puede gestionar usuarios y configuración",
  },
  {
    value: "admin",
    label: "Administrador",
    description: "Acceso completo al sistema",
  },
];

// ── Component ────────────────────────────────────────────────

export default function UsersCreate({ isOpen, onClose }: UsersCreateProps) {
  const { isLoading: storeLoading, createUser } = useUserStore();
  const { hasRole } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["user"]);

  const isAdmin = hasRole("admin");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<UserFormData>();

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setSelectedRoles(["user"]);
    }
  }, [isOpen, reset]);

  const handleRoleToggle = (role: string, checked: boolean) => {
    if (role === "user" && !checked) {
      toast.error("El rol de usuario es obligatorio y no puede ser removido");
      return;
    }
    if ((role === "admin" || role === "manager") && checked && !isAdmin) {
      toast.error("Solo los administradores pueden asignar este rol");
      return;
    }
    setSelectedRoles((prev) =>
      checked ? [...prev, role] : prev.filter((r) => r !== role),
    );
  };

  const onSubmit = async (data: UserFormData) => {
    if (selectedRoles.length === 0) {
      toast.error("Debes seleccionar al menos un rol");
      return;
    }
    setIsLoading(true);
    try {
      await createUser({ ...data, roles: selectedRoles });
      toast.success(
        data.password
          ? "Usuario creado correctamente. Se ha enviado un correo de bienvenida."
          : "Usuario creado. Se ha enviado un correo para establecer su contraseña.",
      );
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Error al crear usuario");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Usuario</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullname">Nombre Completo</Label>
              <Input
                id="fullname"
                placeholder="Juan Pérez"
                {...register("fullname", {
                  required: "Nombre completo es requerido",
                  minLength: { value: 3, message: "Mínimo 3 caracteres" },
                })}
              />
              {errors.fullname && (
                <p className="text-sm text-destructive">
                  {errors.fullname.message}
                </p>
              )}
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Nombre de Usuario</Label>
              <Input
                id="username"
                placeholder="juanperez"
                {...register("username", {
                  required: "Nombre de usuario es requerido",
                  pattern: {
                    value: /^[a-z0-9_]+$/i,
                    message: "Solo letras, números y guiones bajos",
                  },
                  minLength: { value: 3, message: "Mínimo 3 caracteres" },
                })}
              />
              {errors.username && (
                <p className="text-sm text-destructive">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Identification */}
            <div className="space-y-2">
              <Label htmlFor="identification">Identificación (Cédula)</Label>
              <Input
                id="identification"
                placeholder="12345678"
                {...register("identification", {
                  pattern: {
                    value: /^\d{10,13}$/,
                    message: "Debe contener entre 10-13 dígitos numéricos",
                  },
                })}
              />
              {errors.identification && (
                <p className="text-sm text-destructive">
                  {errors.identification.message}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone_number">Número de Teléfono</Label>
              <Input
                id="phone_number"
                placeholder="04121234567"
                {...register("phone_number", {
                  pattern: {
                    value: /^\d*$/,
                    message: "Solo se permiten números",
                  },
                })}
              />
              {errors.phone_number && (
                <p className="text-sm text-destructive">
                  {errors.phone_number.message}
                </p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@ejemplo.com"
              autoComplete="email"
              {...register("email", {
                required: "Correo electrónico es requerido",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Correo electrónico inválido",
                },
              })}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Roles */}
          <div className="space-y-3">
            <Label>Roles del Usuario</Label>
            <p className="text-sm text-muted-foreground">
              Selecciona uno o más roles. El rol de "Usuario" es obligatorio.
            </p>
            <div className="space-y-3 rounded-lg border p-4">
              {ALL_ROLES.map((role) => {
                const isChecked = selectedRoles.includes(role.value);
                const isDisabled =
                  role.value === "user" ||
                  ((role.value === "admin" || role.value === "manager") &&
                    !isAdmin);
                return (
                  <div key={role.value} className="flex items-start space-x-3">
                    <Checkbox
                      id={`role-${role.value}`}
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleRoleToggle(role.value, checked === true)
                      }
                      disabled={isDisabled}
                    />
                    <div className="flex-1 space-y-1">
                      <label
                        htmlFor={`role-${role.value}`}
                        className={`text-sm font-medium leading-none ${
                          isDisabled
                            ? "cursor-not-allowed opacity-70"
                            : "cursor-pointer"
                        }`}
                      >
                        {role.label}
                        {role.value === "user" && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Obligatorio)
                          </span>
                        )}
                        {(role.value === "admin" ||
                          role.value === "manager") &&
                          !isAdmin && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (Solo Administradores)
                            </span>
                          )}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {role.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Password (optional) */}
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña (Opcional)</Label>
            <PasswordInput
              register={register("password", {
                minLength: { value: 8, message: "Mínimo 8 caracteres" },
              })}
              placeholder="••••••••••••"
              name="password"
              autoComplete="new-password"
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Si no se proporciona, el usuario deberá usar "Olvidé mi
              contraseña"
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passwordConfirmation">Confirmar Contraseña</Label>
            <PasswordInput
              register={register("passwordConfirmation", {
                validate: (value) => {
                  const password = watch("password");
                  if (password && !value)
                    return "La confirmación de contraseña es requerida";
                  if (password && value !== password)
                    return "Las contraseñas no coinciden";
                  return true;
                },
              })}
              placeholder="••••••••••••"
              name="passwordConfirmation"
              autoComplete="new-password"
            />
            {errors.passwordConfirmation && (
              <p className="text-sm text-destructive">
                {errors.passwordConfirmation.message}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || storeLoading}>
              {(isLoading || storeLoading) && (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              Crear Usuario
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
