import type { LucideIcon } from "lucide-react";
import { Pencil, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ActionIconButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Texto alternativo del tooltip cuando está deshabilitado. */
  disabledLabel?: string;
  destructive?: boolean;
}

/** Botón ícono con Tooltip. Base para las acciones de fila. */
export function ActionIconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  disabledLabel,
  destructive,
}: ActionIconButtonProps) {
  const tooltipText = disabled && disabledLabel ? disabledLabel : label;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* span permite mostrar tooltip incluso con el botón deshabilitado */}
        <span className="inline-flex">
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${destructive ? "text-destructive hover:text-destructive" : ""}`}
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}

export function EditAction({ onClick }: { onClick: () => void }) {
  return <ActionIconButton icon={Pencil} label="Editar" onClick={onClick} />;
}

export function ArchiveAction({
  onClick,
  disabled,
  disabledLabel,
}: {
  onClick: () => void;
  disabled?: boolean;
  disabledLabel?: string;
}) {
  return (
    <ActionIconButton
      icon={Archive}
      label="Archivar"
      onClick={onClick}
      disabled={disabled}
      disabledLabel={disabledLabel}
      destructive
    />
  );
}

export function RestoreAction({ onClick }: { onClick: () => void }) {
  return (
    <ActionIconButton icon={ArchiveRestore} label="Restaurar" onClick={onClick} />
  );
}
