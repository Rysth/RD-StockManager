import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  useQuotationStore,
  type Quotation,
  type QuotationStatus,
  type QuotationItemInput,
} from "../../../stores/quotationStore";
import { useCustomerStore } from "../../../stores/customerStore";
import { useInventoryStore } from "../../../stores/inventoryStore";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n || 0);

const STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  accepted: "Aceptada",
  rejected: "Rechazada",
  expired: "Expirada",
};

interface FormItem {
  product_variant_id: number | null;
  description: string;
  quantity: string;
  unit_price: string;
}

interface VariantMeta {
  description: string;
  price: number;
}

const emptyItem = (): FormItem => ({
  product_variant_id: null,
  description: "",
  quantity: "1",
  unit_price: "0",
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: Quotation | null;
  onSaved: () => void;
}

export default function QuotationFormDialog({ open, onOpenChange, quotation, onSaved }: Props) {
  const { createQuotation, updateQuotation, isSubmitting } = useQuotationStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { products, fetchProducts } = useInventoryStore();

  const [customerId, setCustomerId] = useState<number | null>(null);
  const [status, setStatus] = useState<QuotationStatus>("draft");
  const [taxRate, setTaxRate] = useState("15");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<FormItem[]>([emptyItem()]);

  // Cargar catálogos al abrir.
  useEffect(() => {
    if (!open) return;
    fetchCustomers(1, 100, "", "customer").catch(() => undefined);
    fetchProducts(1, 100, {}).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Poblar el formulario al editar / limpiar al crear.
  useEffect(() => {
    if (!open) return;
    if (quotation) {
      setCustomerId(quotation.customer_id ?? null);
      setStatus(quotation.status);
      setTaxRate(String(quotation.tax_rate ?? 15));
      setValidUntil(quotation.valid_until ? quotation.valid_until.slice(0, 10) : "");
      setNotes(quotation.notes ?? "");
      setItems(
        (quotation.quotation_items ?? []).map((it) => ({
          product_variant_id: it.product_variant_id ?? null,
          description: it.description,
          quantity: String(it.quantity),
          unit_price: String(it.unit_price),
        })),
      );
    } else {
      setCustomerId(null);
      setStatus("draft");
      setTaxRate("15");
      setValidUntil("");
      setNotes("");
      setItems([emptyItem()]);
    }
  }, [open, quotation]);

  const customerOptions: ComboboxOption[] = useMemo(
    () =>
      customers.map((c) => ({
        value: String(c.id),
        label: c.name,
        description: c.phone || c.email || c.id_number || "",
      })),
    [customers],
  );

  // Aplana las variantes de todos los productos para el selector opcional de inventario.
  const { variantOptions, variantMeta } = useMemo(() => {
    const options: ComboboxOption[] = [];
    const meta: Record<number, VariantMeta> = {};
    products.forEach((p) => {
      p.variants.forEach((v) => {
        const isService = p.product_type === "service";
        const label = [p.name, v.size, v.color].filter(Boolean).join(" ");
        options.push({
          value: String(v.id),
          label,
          description: `SKU ${v.sku} · ${money(Number(p.base_price))} · ${
            isService ? "servicio sin stock" : `stock ${v.stock}`
          }`,
          keywords: `${v.sku} ${isService ? "servicio service" : ""}`,
        });
        meta[v.id] = { description: label, price: Number(p.base_price) };
      });
    });
    return { variantOptions: options, variantMeta: meta };
  }, [products]);

  const updateItem = (index: number, patch: Partial<FormItem>) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const onSelectVariant = (index: number, value: string) => {
    const id = Number(value);
    const m = variantMeta[id];
    updateItem(index, {
      product_variant_id: id,
      description: m?.description || items[index].description,
      unit_price: m ? String(m.price) : items[index].unit_price,
    });
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (acc, it) => acc + Number(it.quantity || 0) * Number(it.unit_price || 0),
      0,
    );
    const tax = (subtotal * Number(taxRate || 0)) / 100;
    return { subtotal, tax, total: subtotal + tax };
  }, [items, taxRate]);

  const handleSubmit = async () => {
    const cleanItems: QuotationItemInput[] = items
      .filter((it) => it.description.trim() && Number(it.quantity) > 0)
      .map((it) => ({
        product_variant_id: it.product_variant_id,
        description: it.description.trim(),
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price || 0),
      }));

    if (cleanItems.length === 0) {
      toast.error("Agrega al menos un ítem con descripción y cantidad");
      return;
    }

    const payload = {
      customer_id: customerId,
      status,
      tax_rate: Number(taxRate || 0),
      valid_until: validUntil || null,
      notes: notes || null,
      items: cleanItems,
    };

    try {
      if (quotation) {
        await updateQuotation(quotation.id, payload);
        toast.success("Cotización actualizada");
      } else {
        await createQuotation(payload);
        toast.success("Cotización creada");
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar la cotización");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{quotation ? `Editar ${quotation.quotation_number}` : "Nueva cotización"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Combobox
                options={customerOptions}
                value={customerId ? String(customerId) : undefined}
                onSelect={(v) => setCustomerId(v ? Number(v) : null)}
                placeholder="Selecciona un cliente (opcional)"
                searchPlaceholder="Buscar cliente..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as QuotationStatus)}
              >
                {(Object.keys(STATUS_LABELS) as QuotationStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Válida hasta</Label>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>IVA (%)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Ítems</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setItems((p) => [...p, emptyItem()])}>
                <Plus className="size-4" /> Agregar línea
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((it, index) => (
                <div key={index} className="rounded-lg border p-3">
                  <div className="mb-2">
                    <Combobox
                      options={variantOptions}
                      value={it.product_variant_id ? String(it.product_variant_id) : undefined}
                      onSelect={(v) => onSelectVariant(index, v)}
                      placeholder="Vincular producto de inventario (opcional)"
                      searchPlaceholder="Buscar producto / SKU..."
                    />
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-12 sm:col-span-6">
                      <Input
                        placeholder="Descripción del ítem o servicio"
                        value={it.description}
                        onChange={(e) => updateItem(index, { description: e.target.value })}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Cant."
                        value={it.quantity}
                        onChange={(e) => updateItem(index, { quantity: e.target.value })}
                      />
                    </div>
                    <div className="col-span-5 sm:col-span-3">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="P. unitario"
                        value={it.unit_price}
                        onChange={(e) => updateItem(index, { unit_price: e.target.value })}
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-1 flex items-center justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        title="Quitar línea"
                        onClick={() => setItems((p) => p.filter((_, i) => i !== index))}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-1 text-right text-xs text-muted-foreground">
                    Total línea: {money(Number(it.quantity || 0) * Number(it.unit_price || 0))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea
              placeholder="Notas adicionales para el cliente (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Totales */}
          <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{money(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IVA ({taxRate || 0}%)</span>
              <span className="font-medium">{money(totals.tax)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 text-base font-bold">
              <span>Total</span>
              <span>{money(totals.total)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : quotation ? "Guardar cambios" : "Crear cotización"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
