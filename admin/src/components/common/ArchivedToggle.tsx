import { Archive } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface ArchivedToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

/** Toggle "Ver archivados" consistente entre las páginas de catálogo. */
export default function ArchivedToggle({
  checked,
  onChange,
  className,
}: ArchivedToggleProps) {
  return (
    <label
      className={`flex cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground ${className ?? ""}`}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
      />
      <Archive className="h-3.5 w-3.5" />
      Ver archivados
    </label>
  );
}
