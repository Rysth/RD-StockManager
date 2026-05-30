import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ShoppingCart, Search } from "lucide-react";
import toast from "react-hot-toast";
import { useSaleStore } from "../../../stores/saleStore";
import { useInventoryStore } from "../../../stores/inventoryStore";
import { useCustomerStore } from "../../../stores/customerStore";
import type { SaleStatus } from "../../../types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Pagination from "../../../components/common/Pagination";

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n);

const STATUS_META: Record<SaleStatus, { label: string; className: string }> = {
  completed: { label: "Completada", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  pending: { label: "Pendiente", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  cancelled: { label: "Cancelada", className: "bg-red-100 text-red-800 hover:bg-red-100" },
};

interface CartItem {
  product_variant_id: number;
  label: string;
  sku: string;
  unit_price: number;
  quantity: number;
  max: number;
}

function SalesList() {
  const { sales, pagination, isLoading, fetchSales, updateSaleStatus } = useSaleStore();
  const [status, setStatus] = useState<SaleStatus | "">("");

  useEffect(() => {
    fetchSales(1, pagination.per_page, { status }).catch((e) =>
      toast.error(e.message || "Error al cargar ventas"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const cancel = async (id: number) => {
    try {
      await updateSaleStatus(id, "cancelled");
      toast.success("Venta cancelada — stock restaurado");
    } catch (e: any) {
      toast.error(e.message || "Error al cancelar la venta");
    }
  };

  return (
    <div className="space-y-4">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as SaleStatus | "")}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">Todos los estados</option>
        <option value="completed">Completadas</option>
        <option value="pending">Pendientes</option>
        <option value="cancelled">Canceladas</option>
      </select>

      <Card className="p-0 rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">Cargando ventas...</TableCell>
                </TableRow>
              ) : sales.length ? (
                sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      {s.sold_at ? new Date(s.sold_at).toLocaleDateString("es-EC") : "—"}
                    </TableCell>
                    <TableCell>{s.customer_name || "Consumidor final"}</TableCell>
                    <TableCell>{s.seller || "—"}</TableCell>
                    <TableCell>{s.items_count}</TableCell>
                    <TableCell className="font-medium">{money(s.total)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_META[s.status].className}>
                        {STATUS_META[s.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {s.status !== "cancelled" && (
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => cancel(s.id)}>
                          Cancelar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No hay ventas registradas.
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
        onPageChange={({ selected }) => fetchSales(selected + 1, pagination.per_page, { status })}
      />
    </div>
  );
}

function NewSale({ onComplete }: { onComplete: () => void }) {
  const { products, fetchProducts } = useInventoryStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { createSale, isSubmitting } = useSaleStore();

  const [customerId, setCustomerId] = useState<string>("");
  const [variantQuery, setVariantQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    fetchProducts(1, 100, {});
    fetchCustomers(1, 100, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Variantes con stock disponible, aplanadas, filtradas por búsqueda
  const variantResults = useMemo(() => {
    const q = variantQuery.trim().toLowerCase();
    const rows: { id: number; label: string; sku: string; price: number; stock: number }[] = [];
    products.forEach((p) => {
      p.variants.forEach((v) => {
        if (v.stock <= 0) return;
        const label = `${p.name} — ${v.size || ""}/${v.color || ""}`;
        if (q && !`${label} ${v.sku} ${p.brand ?? ""}`.toLowerCase().includes(q)) return;
        rows.push({ id: v.id, label, sku: v.sku, price: p.base_price, stock: v.stock });
      });
    });
    return rows.slice(0, 8);
  }, [products, variantQuery]);

  const addToCart = (v: { id: number; label: string; sku: string; price: number; stock: number }) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_variant_id === v.id);
      if (existing) {
        if (existing.quantity >= existing.max) {
          toast.error("No hay más stock disponible");
          return prev;
        }
        return prev.map((i) =>
          i.product_variant_id === v.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        { product_variant_id: v.id, label: v.label, sku: v.sku, unit_price: v.price, quantity: 1, max: v.stock },
      ];
    });
  };

  const setQuantity = (id: number, qty: number) =>
    setCart((prev) =>
      prev.map((i) =>
        i.product_variant_id === id
          ? { ...i, quantity: Math.max(1, Math.min(qty, i.max)) }
          : i,
      ),
    );

  const removeItem = (id: number) =>
    setCart((prev) => prev.filter((i) => i.product_variant_id !== id));

  const total = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const complete = async () => {
    if (cart.length === 0) return toast.error("Agrega al menos un producto");
    try {
      await createSale({
        customer_id: customerId ? Number(customerId) : null,
        status: "completed",
        items: cart.map((i) => ({
          product_variant_id: i.product_variant_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
      });
      toast.success("Venta completada correctamente");
      setCart([]);
      setCustomerId("");
      setVariantQuery("");
      onComplete();
    } catch (e: any) {
      toast.error(e.message || "Error al completar la venta");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Selección */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Cliente (opcional)</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Consumidor final</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.city ? `(${c.city})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Buscar producto</label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Nombre, marca o SKU..."
              value={variantQuery}
              onChange={(e) => setVariantQuery(e.target.value)}
            />
          </div>
          <div className="rounded-lg border divide-y">
            {variantResults.length ? (
              variantResults.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => addToCart(v)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50"
                >
                  <span>
                    <span className="font-medium">{v.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{v.sku}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">{v.stock}</Badge>
                    <span>{money(v.price)}</span>
                    <Plus className="h-4 w-4" />
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                Sin resultados con stock disponible.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Carrito */}
      <Card className="rounded-xl">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2 font-medium">
            <ShoppingCart className="h-4 w-4" /> Carrito
          </div>
          {cart.length ? (
            <div className="space-y-2">
              {cart.map((i) => (
                <div key={i.product_variant_id} className="flex items-center gap-2 text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{i.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {money(i.unit_price)} c/u · stock {i.max}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={i.max}
                    value={i.quantity}
                    onChange={(e) => setQuantity(i.product_variant_id, Number(e.target.value))}
                    className="w-16"
                  />
                  <span className="w-20 text-right font-medium">
                    {money(i.unit_price * i.quantity)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeItem(i.product_variant_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Agrega productos desde el buscador.
            </p>
          )}

          <div className="flex items-center justify-between border-t pt-3 text-lg font-bold">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>

          <Button className="w-full" disabled={isSubmitting || cart.length === 0} onClick={complete}>
            {isSubmitting ? "Procesando..." : "Completar Venta"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SalesIndex() {
  const [tab, setTab] = useState("list");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ventas</h1>
        <p className="text-sm text-muted-foreground">Registra y consulta tus ventas</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="list">Lista de ventas</TabsTrigger>
          <TabsTrigger value="new">Nueva venta</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4">
          <SalesList />
        </TabsContent>
        <TabsContent value="new" className="mt-4">
          <NewSale onComplete={() => setTab("list")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
