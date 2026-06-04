import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useTransferStore } from "../../../stores/transferStore";
import { useLocationStore } from "../../../stores/locationStore";
import { useInventoryStore } from "../../../stores/inventoryStore";
import { useAuthStore } from "../../../stores/authStore";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TransferLine {
  product_variant_id: string;
  quantity: string;
}

interface CreateTransferModalProps {
  open: boolean;
  onClose: () => void;
}

const emptyLine = (): TransferLine => ({ product_variant_id: "", quantity: "1" });

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n);

export default function CreateTransferModal({ open, onClose }: CreateTransferModalProps) {
  const { createTransfer, isSubmitting } = useTransferStore();
  const { locations } = useLocationStore();
  const { products } = useInventoryStore();
  const { user } = useAuthStore();

  const restrictedToBranch = !!user?.restricted_to_location && !!user?.location_id;

  const [fromLocationId, setFromLocationId] = useState(() =>
    restrictedToBranch && user?.location_id ? String(user.location_id) : ""
  );
  const [toLocationId, setToLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<TransferLine[]>([emptyLine()]);

  const variantOptions = useMemo(() =>
    products
      .filter((p) => p.product_type !== "service")
      .flatMap((p) =>
        p.variants.map((v) => ({
          value: String(v.id),
          label: `${p.name}${[v.size, v.color].filter(Boolean).length ? ` (${[v.size, v.color].filter(Boolean).join(" / ")})` : ""}`,
          description: v.sku,
          keywords: v.sku,
        }))
      ),
    [products]
  );

  const toLocationOptions = locations.filter((l) => String(l.id) !== fromLocationId);

  const reset = () => {
    setFromLocationId(restrictedToBranch && user?.location_id ? String(user.location_id) : "");
    setToLocationId("");
    setNotes("");
    setLines([emptyLine()]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!fromLocationId) return toast.error("Selecciona la bodega de origen");
    if (!toLocationId) return toast.error("Selecciona la bodega de destino");
    if (fromLocationId === toLocationId) return toast.error("El origen y destino deben ser distintos");

    const validLines = lines.filter((l) => l.product_variant_id && Number(l.quantity) > 0);
    if (!validLines.length) return toast.error("Agrega al menos un producto");

    const uniqueIds = new Set(validLines.map((l) => l.product_variant_id));
    if (uniqueIds.size !== validLines.length) return toast.error("No repitas el mismo producto");

    try {
      await createTransfer({
        from_location_id: Number(fromLocationId),
        to_location_id: Number(toLocationId),
        notes: notes.trim() || null,
        items: validLines.map((l) => ({
          product_variant_id: Number(l.product_variant_id),
          quantity: Number(l.quantity),
        })),
      });
      toast.success("Transferencia creada correctamente");
      handleClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al crear la transferencia");
    }
  };

  const fromName = locations.find((l) => String(l.id) === fromLocationId)?.name;
  const toName = locations.find((l) => String(l.id) === toLocationId)?.name;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nueva Transferencia</DialogTitle>
          <DialogDescription>
            Mueve stock de una bodega a otra. El destino confirmará la recepción.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Locations */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bodega origen *</Label>
              {restrictedToBranch ? (
                <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                  {user?.location_name || "Asignada"}
                </div>
              ) : (
                <select
                  value={fromLocationId}
                  onChange={(e) => {
                    setFromLocationId(e.target.value);
                    if (e.target.value === toLocationId) setToLocationId("");
                  }}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecciona...</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Bodega destino *</Label>
              <select
                value={toLocationId}
                onChange={(e) => setToLocationId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                disabled={!fromLocationId}
              >
                <option value="">Selecciona...</option>
                {toLocationOptions.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Productos a transferir *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLines((prev) => [...prev, emptyLine()])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Agregar
              </Button>
            </div>

            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-[1fr_80px_36px] items-start gap-2">
                <Combobox
                  options={variantOptions}
                  value={line.product_variant_id}
                  onSelect={(val) =>
                    setLines((prev) =>
                      prev.map((l, i) => (i === index ? { ...l, product_variant_id: val } : l))
                    )
                  }
                  placeholder="Busca un producto..."
                  searchPlaceholder="Nombre o SKU..."
                  emptyText="No se encontraron variantes"
                />
                <Input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l, i) => (i === index ? { ...l, quantity: e.target.value } : l))
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive"
                  onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                  disabled={lines.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo de la transferencia, instrucciones..."
              rows={2}
            />
          </div>

          {/* Summary */}
          {fromLocationId && toLocationId && lines.some((l) => l.product_variant_id) && (
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Resumen</p>
              <p>{fromName} → {toName}</p>
              {lines
                .filter((l) => l.product_variant_id && Number(l.quantity) > 0)
                .map((l, i) => {
                  const opt = variantOptions.find((o) => o.value === l.product_variant_id);
                  return (
                    <p key={i} className="mt-0.5">
                      • {opt?.label} × {l.quantity}
                    </p>
                  );
                })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creando..." : "Crear transferencia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
