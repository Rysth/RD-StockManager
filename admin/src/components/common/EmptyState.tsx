import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Acción primaria opcional (ej. "Nuevo contacto"). */
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  /** "empty" = aún no hay registros · "no-results" = sin coincidencias de búsqueda. */
  variant?: "empty" | "no-results";
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "empty",
}: EmptyStateProps) {
  const ActionIcon = action?.icon;
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full ${
          variant === "no-results"
            ? "bg-muted text-muted-foreground"
            : "bg-primary/10 text-primary"
        }`}
      >
        <Icon className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold">{title}</h3>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Button onClick={action.onClick} size="sm" className="mt-1">
          {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}
