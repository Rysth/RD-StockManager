import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Eye, PackageCheck, Ban, DollarSign, ImageIcon, X, Banknote, ArrowLeftRight } from "lucide-react";
import toast from "react-hot-toast";
import { usePurchaseStore } from "../../../stores/purchaseStore";
import { useInventoryStore } from "../../../stores/inventoryStore";
import { useCustomerStore } from "../../../stores/customerStore";
import { useLocationStore } from "../../../stores/locationStore";
import type {
  Purchase,
  PurchaseStatus,
  PaymentStatus,
  PurchaseItemInput,
  Product,
} from "../../../types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import Pagination from "../../../components/common/Pagination";
import SearchBar from "../../../components/common/SearchBar";

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n || 0);

const STATUS_LABEL: Record<PurchaseStatus, string> = {
  draft: "Borrador",
  received: "Recibida",
  cancelled: "Cancelada",
};

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  due: "Por pagar",
  partial: "Parcial",
  paid: "Pagada",
};

const statusVariant = (s: PurchaseStatus) =>
  s === "received" ? "default" : s === "cancelled" ? "destructive" : "secondary";
const paymentVariant = (s: PaymentStatus) =>
  s === "paid" ? "default" : s === "partial" ? "secondary" : "destructive";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

interface CartLine extends PurchaseItemInput {
  label: string;
  sku: string;
}

const errorMessage = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback;

export default function PurchasesIndex() {
  const {
    purchases,
    pagination,
    isLoading,
    isSubmitting,
    selectedPurchase,
    fetchPurchases,
    fetchPurchase,
    clearSelectedPurchase,
    createPurchase,
    updatePurchaseStatus,
    updatePurchasePayment,
    deletePurchase,
    createPayment,
  } = usePurchaseStore();
  const {
    products,
    categories,
    brands,
    fetchProducts,
    fetchCategories,
    fetchBrands,
    createProduct,
  } = useInventoryStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { locations, fetchLocations } = useLocationStore();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [toCancel, setToCancel] = useState<Purchase | null>(null);
  const [toReceive, setToReceive] = useState<Purchase | null>(null);
  const [paymentPurchase, setPaymentPurchase] = useState<Purchase | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer">("cash");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentPreview, setPaymentPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // form
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [paid, setPaid] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [reference, setReference] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);

  // Creación rápida de producto desde la compra
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickForm, setQuickForm] = useState({
    name: "",
    category_id: "",
    brand_id: "",
    base_price: "",
    cost: "",
    size: "",
    color: "",
  });

  useEffect(() => {
    fetchPurchases(1, pagination.per_page, { search }).catch((e) =>
      toast.error(e.message || "Error al cargar compras"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    fetchProducts(1, 200).catch(() => {});
    fetchCustomers(1, 100, "").catch(() => {});
    fetchLocations().catch(() => {});
    fetchCategories().catch(() => {});
    fetchBrands().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suppliers = customers.filter((c) => c.is_supplier);

  // flat list of variants for the combobox
  const variantOptions = useMemo(() => {
    const opts: { id: number; label: string; sku: string; cost: number }[] = [];
    (products as Product[]).forEach((p) => {
      p.variants.forEach((v) => {
        const attrs = [v.size, v.color].filter(Boolean).join(" / ");
        opts.push({
          id: v.id,
          label: `${p.name}${attrs ? ` (${attrs})` : ""}`,
          sku: v.sku,
          cost: p.cost,
        });
      });
    });
    return opts;
  }, [products]);

  const comboboxOptions = useMemo(
    () =>
      variantOptions.map((o) => ({
        value: String(o.id),
        label: o.label,
        description: o.sku,
        keywords: o.sku,
      })),
    [variantOptions],
  );

  const categoryOptions = useMemo(() => {
    const byParent = new Map<number | null, (typeof categories)[number][]>();
    categories.forEach((category) => {
      const parentId = category.parent_id ?? null;
      byParent.set(parentId, [...(byParent.get(parentId) ?? []), category]);
    });

    const options: { id: number; name: string }[] = [];
    const addOptions = (parentId: number | null, prefix = "") => {
      (byParent.get(parentId) ?? []).forEach((category) => {
        options.push({ id: category.id, name: `${prefix}${category.name}` });
        addOptions(category.id, `${prefix}-- `);
      });
    };

    addOptions(null);
    return options;
  }, [categories]);

  const subtotal = cart.reduce((s, l) => s + l.quantity * l.unit_cost, 0);
  const total = subtotal - Number(discount || 0) + Number(tax || 0);

  const resetForm = () => {
    setSupplierId("");
    setLocationId("");
    setDiscount("0");
    setTax("0");
    setPaid("0");
    setDueDate("");
    setReference("");
    setCart([]);
  };

  const openCreate = () => {
    resetForm();
    const def = locations.find((l) => l.is_default);
    setLocationId(def ? String(def.id) : locations[0] ? String(locations[0].id) : "");
    setModalOpen(true);
  };

  const addVariantById = (idStr: string) => {
    const opt = variantOptions.find((o) => o.id === Number(idStr));
    if (!opt) return;
    if (cart.some((l) => l.product_variant_id === opt.id)) {
      toast.error("Esa variante ya está en la compra");
      return;
    }
    setCart((prev) => [
      ...prev,
      { product_variant_id: opt.id, quantity: 1, unit_cost: opt.cost || 0, label: opt.label, sku: opt.sku },
    ]);
  };

  const resetQuickForm = () =>
    setQuickForm({ name: "", category_id: "", brand_id: "", base_price: "", cost: "", size: "", color: "" });

  const handleQuickCreate = async () => {
    if (!quickForm.name.trim()) return toast.error("El nombre es requerido");
    if (!quickForm.category_id) return toast.error("Selecciona una categoría");
    setQuickSaving(true);
    try {
      const saved = await createProduct({
        name: quickForm.name,
        brand_id: quickForm.brand_id ? Number(quickForm.brand_id) : null,
        base_price: Number(quickForm.base_price) || 0,
        cost: Number(quickForm.cost) || 0,
        wholesale_price: null,
        wholesale_min_quantity: 3,
        description: "",
        active: true,
        category_id: Number(quickForm.category_id),
        product_variants_attributes: [
          { size: quickForm.size, color: quickForm.color, stock: 0 },
        ],
      });
      await fetchProducts(1, 200);
      const newVariant = saved.variants?.[0];
      if (newVariant) {
        const attrs = [newVariant.size, newVariant.color].filter(Boolean).join(" / ");
        setCart((prev) => [
          ...prev,
          {
            product_variant_id: newVariant.id,
            quantity: 1,
            unit_cost: Number(quickForm.cost) || 0,
            label: `${saved.name}${attrs ? ` (${attrs})` : ""}`,
            sku: newVariant.sku,
          },
        ]);
      }
      toast.success("Producto creado y agregado a la compra");
      setQuickOpen(false);
      resetQuickForm();
    } catch (e) {
      toast.error(errorMessage(e, "Error al crear el producto"));
    } finally {
      setQuickSaving(false);
    }
  };

  const updateLine = (id: number, field: "quantity" | "unit_cost", value: number) => {
    setCart(cart.map((l) => (l.product_variant_id === id ? { ...l, [field]: value } : l)));
  };

  const removeLine = (id: number) =>
    setCart(cart.filter((l) => l.product_variant_id !== id));

  const handleSubmit = async (status: PurchaseStatus) => {
    if (cart.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }
    try {
      await createPurchase({
        customer_id: supplierId ? Number(supplierId) : null,
        location_id: locationId ? Number(locationId) : null,
        status,
        discount: Number(discount || 0),
        tax: Number(tax || 0),
        paid_amount: Number(paid || 0),
        due_date: dueDate || null,
        reference: reference || null,
        items: cart.map((l) => ({
          product_variant_id: l.product_variant_id,
          quantity: l.quantity,
          unit_cost: l.unit_cost,
        })),
      });
      toast.success(status === "received" ? "Compra recibida (stock actualizado)" : "Compra guardada como borrador");
      setModalOpen(false);
    } catch (e) {
      toast.error(errorMessage(e, "Error al registrar la compra"));
    }
  };

  const openDetail = async (p: Purchase) => {
    setDetailOpen(true);
    await fetchPurchase(p.id);
  };

  const openPayment = (purchase: Purchase) => {
    setPaymentPurchase(purchase);
    setPaymentAmount("");
    setPaymentMethod("cash");
    setPaymentProof(null);
    setPaymentPreview(null);
  };

  const handlePayment = async () => {
    if (!paymentPurchase) return;
    const balance = paymentPurchase.balance_due;
    const amount = Math.min(Number(paymentAmount || 0), balance);
    if (amount <= 0) return toast.error("Ingresa un monto mayor a cero");
    if (amount > balance) return toast.error(`El monto no puede exceder el saldo pendiente de ${money(balance)}`);

    try {
      await createPayment(paymentPurchase.id, amount, paymentMethod, paymentProof);
      toast.success("Pago registrado correctamente");
      setPaymentPurchase(null);
      setPaymentAmount("");
      setPaymentMethod("cash");
      setPaymentProof(null);
      setPaymentPreview(null);
    } catch (e) {
      toast.error(errorMessage(e, "Error al registrar el pago"));
    }
  };

  const handleReceiveConfirm = async () => {
    if (!toReceive) return;
    try {
      await updatePurchaseStatus(toReceive.id, "received");
      toast.success("Compra recibida, stock actualizado");
      setToReceive(null);
    } catch (e) {
      toast.error(errorMessage(e, "Error al recibir la compra"));
    }
  };

  const handlePaymentProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("La imagen debe ser menor a 2MB");
        return;
      }
      setPaymentProof(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPaymentPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCancel = async () => {
    if (!toCancel) return;
    try {
      await deletePurchase(toCancel.id);
      toast.success("Compra cancelada");
      setToCancel(null);
    } catch (e) {
      toast.error(errorMessage(e, "Error al cancelar la compra"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compras</h1>
          <p className="text-sm text-muted-foreground">
            Registra compras a proveedores e ingresa mercancía al inventario
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" /> Nueva Compra
        </Button>
      </div>

      <SearchBar
        placeholder="Buscar por proveedor..."
        value={search}
        onSearch={setSearch}
        className="max-w-sm"
      />

      <Card className="p-0 rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">Cargando compras...</TableCell>
                </TableRow>
              ) : purchases.length ? (
                purchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.purchase_date
                        ? new Date(p.purchase_date).toLocaleDateString("es-EC")
                        : "—"}
                    </TableCell>
                    <TableCell className="font-medium">{p.supplier_name || "Sin proveedor"}</TableCell>
                    <TableCell>{p.location_name || "—"}</TableCell>
                    <TableCell>{money(p.total)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(p.status)}>{STATUS_LABEL[p.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={paymentVariant(p.payment_status)}>{PAYMENT_LABEL[p.payment_status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(p)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {p.status === "draft" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" title="Recibir" onClick={() => setToReceive(p)}>
                          <PackageCheck className="h-4 w-4" />
                        </Button>
                      )}
                      {p.status !== "cancelled" && p.payment_status !== "paid" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" title="Registrar pago" onClick={() => openPayment(p)}>
                          <DollarSign className="h-4 w-4" />
                        </Button>
                      )}
                      {p.status !== "cancelled" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Cancelar" onClick={() => setToCancel(p)}>
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No se encontraron compras.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Pagination
        currentPage={pagination.current_page - 1}
        pageCount={pagination.total_pages}
        totalCount={pagination.total_count}
        perPage={pagination.per_page}
        onPageChange={({ selected }) => fetchPurchases(selected + 1, pagination.per_page, { search })}
      />

      {/* New purchase modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Nueva Compra</DialogTitle>
            <DialogDescription>Registra una compra a un proveedor</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <select className={selectClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  <option value="">Sin proveedor</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              {locations.length > 1 && (
                <div className="space-y-2">
                  <Label>Ubicación destino</Label>
                  <select className={selectClass} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* add product */}
            <div className="space-y-2">
              <Label>Agregar producto</Label>
              <Combobox
                options={comboboxOptions}
                onSelect={addVariantById}
                placeholder="Busca un producto o variante..."
                searchPlaceholder="Nombre, talla, color o SKU..."
                emptyText="No se encontró ese producto."
                actionLabel="Crear producto nuevo"
                onAction={() => setQuickOpen(true)}
              />
            </div>

            {cart.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-20">Cant.</TableHead>
                      <TableHead className="w-28">Costo U.</TableHead>
                      <TableHead className="w-24">Subtotal</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((l) => (
                      <TableRow key={l.product_variant_id}>
                        <TableCell className="text-sm">{l.label}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={l.quantity}
                            onChange={(e) => updateLine(l.product_variant_id, "quantity", Math.max(1, Number(e.target.value)))}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={l.unit_cost}
                            onChange={(e) => updateLine(l.product_variant_id, "unit_cost", Number(e.target.value))}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="text-sm">{money(l.quantity * l.unit_cost)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeLine(l.product_variant_id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Descuento</Label>
                <Input type="number" min={0} step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Impuesto (IVA)</Label>
                <Input type="number" min={0} step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Pagado</Label>
                <Input type="number" min={0} step="0.01" value={paid} onChange={(e) => setPaid(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de vencimiento</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Referencia / Factura</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="N° factura" />
              </div>
            </div>

            <div className="flex justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Subtotal: {money(subtotal)}</span>
              <span className="font-semibold">Total: {money(total)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={() => handleSubmit("draft")} disabled={isSubmitting}>
              Guardar compra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail drawer */}
      <Sheet
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) clearSelectedPurchase();
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Detalle de compra #{selectedPurchase?.id}</SheetTitle>
            <SheetDescription>
              {selectedPurchase?.supplier_name || "Sin proveedor"} ·{" "}
              {selectedPurchase?.location_name || "—"}
            </SheetDescription>
          </SheetHeader>
          {selectedPurchase ? (
            <div className="space-y-3 px-4 pb-6 text-sm">
              <div className="flex gap-2">
                <Badge variant={statusVariant(selectedPurchase.status)}>{STATUS_LABEL[selectedPurchase.status]}</Badge>
                <Badge variant={paymentVariant(selectedPurchase.payment_status)}>{PAYMENT_LABEL[selectedPurchase.payment_status]}</Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cant.</TableHead>
                    <TableHead>Costo</TableHead>
                    <TableHead>Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPurchase.items?.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.product_name}{[it.size, it.color].filter(Boolean).length ? ` (${[it.size, it.color].filter(Boolean).join(" / ")})` : ""}</TableCell>
                      <TableCell>{it.quantity}</TableCell>
                      <TableCell>{money(it.unit_cost)}</TableCell>
                      <TableCell>{money(it.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="space-y-1 border-t pt-2">
                <div className="flex justify-between"><span>Subtotal</span><span>{money(selectedPurchase.subtotal)}</span></div>
                <div className="flex justify-between"><span>Descuento</span><span>-{money(selectedPurchase.discount)}</span></div>
                <div className="flex justify-between"><span>Impuesto</span><span>{money(selectedPurchase.tax)}</span></div>
                <div className="flex justify-between font-semibold"><span>Total</span><span>{money(selectedPurchase.total)}</span></div>
                <div className="flex justify-between"><span>Pagado</span><span>{money(selectedPurchase.paid_amount)}</span></div>
                <div className="flex justify-between text-destructive"><span>Saldo</span><span>{money(selectedPurchase.balance_due)}</span></div>
              </div>

              {selectedPurchase.payments && selectedPurchase.payments.length > 0 && (
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Historial de pagos
                  </p>
                  {selectedPurchase.payments.map((pm) => (
                    <div key={pm.id} className="flex items-start justify-between border-b pb-2 last:border-0 last:pb-0">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{money(pm.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {pm.payment_method === "cash" ? "Efectivo" : "Transferencia"} · {new Date(pm.created_at).toLocaleString("es-EC")}
                        </p>
                      </div>
                      {pm.proof_image_url && (
                        <a
                          href={pm.proof_image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0"
                        >
                          <img
                            src={pm.proof_image_url}
                            alt="Comprobante"
                            className="h-10 w-10 rounded-md border object-cover"
                          />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selectedPurchase.status !== "cancelled" && selectedPurchase.payment_status !== "paid" && (
                <Button className="w-full" size="sm" onClick={() => openPayment(selectedPurchase)}>
                  <DollarSign className="mr-2 h-4 w-4" /> Registrar pago
                </Button>
              )}
            </div>
          ) : (
            <p className="px-4 text-sm text-muted-foreground">Cargando...</p>
          )}
        </SheetContent>
      </Sheet>

      {/* Quick product creation */}
      <Dialog
        open={quickOpen}
        onOpenChange={(o) => {
          setQuickOpen(o);
          if (!o) resetQuickForm();
        }}
      >
        <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Crear producto nuevo</DialogTitle>
            <DialogDescription>
              Crea el producto y una variante; se agregará automáticamente a la compra (el stock entra al recibir).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={quickForm.name}
                onChange={(e) => setQuickForm({ ...quickForm, name: e.target.value })}
                placeholder="Ej. Gorra New Era 9FORTY"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <select
                  className={selectClass}
                  value={quickForm.category_id}
                  onChange={(e) => setQuickForm({ ...quickForm, category_id: e.target.value })}
                >
                  <option value="">Selecciona...</option>
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Marca</Label>
                <select
                  className={selectClass}
                  value={quickForm.brand_id}
                  onChange={(e) => setQuickForm({ ...quickForm, brand_id: e.target.value })}
                >
                  <option value="">Sin marca</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Precio de venta</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={quickForm.base_price}
                  onChange={(e) => setQuickForm({ ...quickForm, base_price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Costo</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={quickForm.cost}
                  onChange={(e) => setQuickForm({ ...quickForm, cost: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Talla / Variante</Label>
                <Input
                  value={quickForm.size}
                  onChange={(e) => setQuickForm({ ...quickForm, size: e.target.value })}
                  placeholder="Ej. M (opcional)"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  value={quickForm.color}
                  onChange={(e) => setQuickForm({ ...quickForm, color: e.target.value })}
                  placeholder="Ej. Negro (opcional)"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickOpen(false)}>Cancelar</Button>
            <Button onClick={handleQuickCreate} disabled={quickSaving}>
              {quickSaving ? "Creando..." : "Crear y agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Register payment */}
      <Dialog open={!!paymentPurchase} onOpenChange={(open) => !open && setPaymentPurchase(null)}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
            <DialogDescription>
              {paymentPurchase?.supplier_name || "Sin proveedor"} · Saldo pendiente {money(paymentPurchase?.balance_due ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Monto del abono</Label>
              <Input
                type="number"
                min={0}
                max={paymentPurchase?.balance_due ?? undefined}
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Método de pago</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={`flex items-center justify-center gap-2 rounded-md border py-2 text-sm font-medium transition-colors ${
                    paymentMethod === "cash"
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <Banknote className="h-4 w-4" /> Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("transfer")}
                  className={`flex items-center justify-center gap-2 rounded-md border py-2 text-sm font-medium transition-colors ${
                    paymentMethod === "transfer"
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <ArrowLeftRight className="h-4 w-4" /> Transferencia
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Comprobante (opcional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePaymentProofChange}
                className="hidden"
              />
              {paymentPreview ? (
                <div className="relative inline-block">
                  <img
                    src={paymentPreview}
                    alt="Preview"
                    className="h-24 w-24 rounded-md border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentProof(null);
                      setPaymentPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="mr-1 h-4 w-4" /> Subir foto
                </Button>
              )}
            </div>

            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              Pagado actual: {money(paymentPurchase?.paid_amount ?? 0)} · Total: {money(paymentPurchase?.total ?? 0)}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentPurchase(null)}>Cancelar</Button>
            <Button onClick={handlePayment} disabled={isSubmitting}>Registrar pago</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive confirmation */}
      <AlertDialog open={!!toReceive} onOpenChange={(open) => !open && setToReceive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recibir compra</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmás que la mercancía ha llegado? Se sumará el stock de los productos al inventario en la ubicación seleccionada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReceiveConfirm}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Sí, recibir mercancía
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel confirmation */}
      <AlertDialog open={!!toCancel} onOpenChange={(open) => !open && setToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar compra</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas cancelar esta compra? Si ya estaba recibida, se restará el stock ingresado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>Cancelar compra</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
