import toast from "react-hot-toast";
import { Undo2, CheckCircle2 } from "lucide-react";

/**
 * Muestra un toast de confirmación con un botón "Deshacer".
 * Se usa tras acciones reversibles como archivar.
 *
 * @param message  Texto principal (ej. "Contacto archivado").
 * @param onUndo   Callback a ejecutar si el usuario pulsa "Deshacer".
 * @param duration Milisegundos antes de auto-cerrar (default 6000).
 */
export function toastUndo(
  message: string,
  onUndo: () => void | Promise<void>,
  duration = 6000,
) {
  toast.custom(
    (t) => (
      <div
        className={`pointer-events-auto flex items-center gap-3 rounded-lg border border-border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-lg transition-all ${
          t.visible ? "animate-in fade-in-0 slide-in-from-bottom-2" : "animate-out fade-out-0"
        }`}
      >
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
        <span className="font-medium">{message}</span>
        <button
          type="button"
          onClick={async () => {
            toast.dismiss(t.id);
            await onUndo();
          }}
          className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
        >
          <Undo2 className="h-3.5 w-3.5" />
          Deshacer
        </button>
      </div>
    ),
    { duration },
  );
}
