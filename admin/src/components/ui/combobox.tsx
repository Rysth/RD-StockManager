import * as React from "react";
import { Check, ChevronsUpDown, Search, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string; // texto secundario (p.ej. SKU)
  keywords?: string; // texto extra para búsqueda
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Etiqueta de la acción al final de la lista (p.ej. "Crear producto"). */
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
  className?: string;
}

export function Combobox({
  options,
  value,
  onSelect,
  placeholder = "Selecciona...",
  searchPlaceholder = "Buscar...",
  emptyText = "Sin resultados.",
  actionLabel,
  onAction,
  disabled,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [highlight, setHighlight] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      `${o.label} ${o.description ?? ""} ${o.keywords ?? ""}`.toLowerCase().includes(q),
    );
  }, [options, query]);

  React.useEffect(() => {
    setHighlight(0);
  }, [query]);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      // Enfoca el input al abrir
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const choose = (val: string) => {
    onSelect(val);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) choose(opt.value);
      else if (onAction) {
        onAction();
        setOpen(false);
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", !selected && "text-muted-foreground", className)}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] min-w-[18rem] p-0"
        align="start"
      >
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder}
            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length ? (
            filtered.map((opt, i) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => choose(opt.value)}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                  i === highlight ? "bg-accent text-accent-foreground" : "",
                )}
              >
                <Check
                  className={cn("h-4 w-4 shrink-0", opt.value === value ? "opacity-100" : "opacity-0")}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{opt.label}</span>
                  {opt.description && (
                    <span className="block truncate text-xs text-muted-foreground">{opt.description}</span>
                  )}
                </span>
              </button>
            ))
          ) : (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
          )}
        </div>
        {actionLabel && onAction && (
          <div className="border-t p-1">
            <button
              type="button"
              onClick={() => {
                onAction();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-primary hover:bg-accent"
            >
              <Plus className="h-4 w-4" /> {actionLabel}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
