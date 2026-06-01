import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import PasswordInput from "../../../components/shared/PasswordInput";
import { User, useUserStore } from "../../../stores/userStore";
import { useAuthStore } from "../../../stores/authStore";
import { useLocationStore } from "../../../stores/locationStore";

// ── Types ────────────────────────────────────────────────────

interface EditFormData {
  fullname: string;
  username: string;
  email: string;
  identification?: string;
  phone_number?: string;
  location_id?: string;
}

interface PasswordFormData {
  password: string;
  password_confirmation: string;
}

interface UsersUpdateProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

// ── Constants ────────────────────────────────────────────────

const ALL_ROLES = [
  {
    value: "business_employee",
    label: "Empleado",
    description: "Ventas, clientes y ver inventario",
  },
  {
    value: "business_owner",
    label: "Dueño del negocio",
    description: "Acceso total excepto gestión de usuarios",
  },
  {
    value: "admin",
    label: "Administrador",
    description: "Acceso completo al sistema",
  },
];

// ── General Tab ──────────────────────────────────────────────

function GeneralTab({ user, onClose }: { user: User; onClose: () => void }) {
  const { isLoading: storeLoading, updateUser } = useUserStore();
  const { user: currentUser, hasRole } = useAuthStore();
  const { locations, fetchLocations } = useLocationStore();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([
    "business_employee",
  ]);

  const isAdmin = hasRole("admin");
  const isManager = hasRole("business_owner");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFormData>();

  useEffect(() => {
    fetchLocations().catch(() => {});
  }, [fetchLocations]);

  useEffect(() => {
    reset({
      fullname: user.fullname,
      username: user.username,
      email: user.email,
      identification: user.identification || "",
      phone_number: user.phone_number || "",
      location_id: user.location_id ? String(user.location_id) : "",
    });
    const userRoles =
      user.roles.length > 0 ? user.roles : ["business_employee"];
    setSelectedRoles(userRoles);
  }, [user, reset]);

  const handleRoleToggle = (role: string, checked: boolean) => {
    if ((role === "admin" || role === "business_owner") && checked && !isAdmin) {
      toast.error("Solo los administradores pueden asignar este rol");
      return;
    }
    if (role === "business_owner" && !checked && isManager && !isAdmin) {
      toast.error("Solo los administradores pueden quitar el rol de dueño");
      return;
    }
    if (user.id === currentUser?.id && isManager && !isAdmin) {
      toast.error("No puedes modificar tus propios roles");
      return;
    }
    setSelectedRoles((prev) =>
      checked ? [...prev, role] : prev.filter((r) => r !== role),
    );
  };

  const isRoleDisabled = (role: string) => {
    if ((role === "admin" || role === "business_owner") && !isAdmin) return true;
    return false;
  };

  const onSubmit = async (data: EditFormData) => {
    setIsLoading(true);
    try {
      const updateData: any = {
        ...data,
        location_id: data.location_id ? Number(data.location_id) : null,
      };
      const currentRoles = [...user.roles].sort();
      const newRoles = [...selectedRoles].sort();
      if (JSON.stringify(currentRoles) !== JSON.stringify(newRoles)) {
        updateData.roles = selectedRoles;
      }
      await updateUser(user.id, updateData);
      toast.success("Usuario actualizado correctamente");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar usuario");
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
          El rol de "Usuario" es obligatorio.
        </p>
        <div className="space-y-3 rounded-lg border p-4">
          {ALL_ROLES.map((role) => {
            const isChecked = selectedRoles.includes(role.value);
            const isDisabled = isRoleDisabled(role.value);
            return (
              <div key={role.value} className="flex items-start space-x-3">
                <Checkbox
                  id={`edit-role-${role.value}`}
                  checked={isChecked}
                  onCheckedChange={(checked) =>
                    handleRoleToggle(role.value, checked === true)
                  }
                  disabled={isDisabled}
                />
                <div className="flex-1 space-y-1">
                  <label
                    htmlFor={`edit-role-${role.value}`}
                    className={`text-sm font-medium leading-none ${
                      isDisabled
                        ? "cursor-not-allowed opacity-70"
                        : "cursor-pointer"
                    }`}
                  >
                    {role.label}
                    {(role.value === "admin" ||
                      role.value === "business_owner") &&
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

      {/* Sucursal asignada */}
      <div className="space-y-2">
        <Label htmlFor="edit-location_id">Sucursal asignada</Label>
        <select
          id="edit-location_id"
          {...register("location_id")}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Sin restricción (todas)</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Si asignas una sucursal, los empleados solo podrán registrar ventas desde ella.
        </p>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || storeLoading}>
          {(isLoading || storeLoading) && (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          Guardar Cambios
        </Button>
      </div>
    </form>
  );
}

// ── Password Tab ─────────────────────────────────────────────

function PasswordTab({ user, onClose }: { user: User; onClose: () => void }) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PasswordFormData>({
    defaultValues: { password: "", password_confirmation: "" },
  });

  const onSubmit = async (data: PasswordFormData) => {
    setIsLoading(true);
    try {
      await useUserStore
        .getState()
        .updateUserPassword(user.id, data.password, data.password_confirmation);
      toast.success(
        `Contraseña de ${user.fullname} actualizada correctamente`,
      );
      reset();
      onClose();
    } catch (error: any) {
      const msg =
        error.response?.status === 422
          ? "Las contraseñas no coinciden o no cumplen los requisitos"
          : error.response?.data?.error || "Error al actualizar la contraseña";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="p-4 bg-muted/50 border rounded-md">
        <p className="text-sm text-muted-foreground">
          La nueva contraseña será aplicada inmediatamente. El usuario deberá
          usarla en su próximo inicio de sesión.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Nueva Contraseña</Label>
        <PasswordInput
          register={register("password", {
            required: "La contraseña es requerida",
            minLength: { value: 8, message: "Mínimo 8 caracteres" },
          })}
          placeholder="••••••••••••"
          name="password"
          autoComplete="new-password"
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password_confirmation">Confirmar Contraseña</Label>
        <PasswordInput
          register={register("password_confirmation", {
            required: "La confirmación de contraseña es requerida",
            validate: (value) =>
              value === watch("password") || "Las contraseñas no coinciden",
          })}
          placeholder="••••••••••••"
          name="password_confirmation"
          autoComplete="new-password"
        />
        {errors.password_confirmation && (
          <p className="text-sm text-destructive">
            {errors.password_confirmation.message}
          </p>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          Actualizar Contraseña
        </Button>
      </div>
    </form>
  );
}

// ── Main Component ───────────────────────────────────────────

export default function UsersUpdate({
  isOpen,
  onClose,
  user,
}: UsersUpdateProps) {
  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
          <DialogDescription>
            {user.fullname} — @{user.username}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general">
          <TabsList className="w-full">
            <TabsTrigger value="general" className="flex-1">
              General
            </TabsTrigger>
            <TabsTrigger value="password" className="flex-1">
              Contraseña
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="pt-4">
            <GeneralTab user={user} onClose={onClose} />
          </TabsContent>

          <TabsContent value="password" className="pt-4">
            <PasswordTab user={user} onClose={onClose} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
