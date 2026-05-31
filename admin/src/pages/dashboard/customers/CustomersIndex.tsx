import { useEffect, useState } from "react";
import { Plus, Pencil, Archive } from "lucide-react";
import toast from "react-hot-toast";
import { useCustomerStore, type ContactRole } from "../../../stores/customerStore";
import type { Customer } from "../../../types/inventory";
import { ECUADOR_CITIES, COUNTRIES, ID_TYPES } from "../../../lib/locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import Pagination from "../../../components/common/Pagination";
import SearchBar from "../../../components/common/SearchBar";
import { Skeleton } from "@/components/ui/skeleton";

interface FormState {
  name: string;
  id_type: string;
  id_number: string;
  phone: string;
  email: string;
  country: string;
  city: string;
  address: string;
  is_customer: boolean;
  is_supplier: boolean;
  credit_limit: string;
  payment_term_days: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  id_type: "",
  id_number: "",
  phone: "",
  email: "",
  country: "Ecuador",
  city: "",
  address: "",
  is_customer: true,
  is_supplier: false,
  credit_limit: "0",
  payment_term_days: "",
};

const ID_TYPE_LABEL: Record<string, string> = {
  cedula: "Cédula",
  pasaporte: "Pasaporte",
  ruc: "RUC",
};

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n || 0);

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

function CustomersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28 rounded" />
          <Skeleton className="h-4 w-52 rounded" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <Skeleton className="h-9 w-64 rounded-md" />
      <Card className="rounded-xl p-0">
        <CardContent className="p-0">
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex-1"><Skeleton className="h-4 w-32 rounded" /></div>
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
                <div className="flex gap-1 ml-auto">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CustomersIndex() {
  const {
    customers,
    pagination,
    isLoading,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  } = useCustomerStore();

  const [firstLoad, setFirstLoad] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<ContactRole>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [toDelete, setToDelete] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers(1, pagination.per_page, search, role)
      .catch((e) => toast.error(e.message || "Error al cargar contactos"))
      .finally(() => setFirstLoad(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, role]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      is_customer: role !== "supplier",
      is_supplier: role === "supplier",
    });
    setModalOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setForm({
      name: customer.name,
      id_type: customer.id_type ?? "",
      id_number: customer.id_number ?? "",
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      country: customer.country ?? "Ecuador",
      city: customer.city ?? "",
      address: customer.address ?? "",
      is_customer: customer.is_customer ?? true,
      is_supplier: customer.is_supplier ?? false,
      credit_limit: String(customer.credit_limit ?? 0),
      payment_term_days: customer.payment_term_days != null ? String(customer.payment_term_days) : "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    if (!form.is_customer && !form.is_supplier) {
      toast.error("El contacto debe ser cliente, proveedor o ambos");
      return;
    }
    const payload = {
      name: form.name,
      id_type: form.id_type,
      id_number: form.id_number,
      phone: form.phone,
      email: form.email,
      country: form.country,
      city: form.city,
      address: form.address,
      is_customer: form.is_customer,
      is_supplier: form.is_supplier,
      credit_limit: Number(form.credit_limit || 0),
      payment_term_days: form.payment_term_days ? Number(form.payment_term_days) : null,
    };
    try {
      if (editing) {
        await updateCustomer(editing.id, payload);
        toast.success("Contacto actualizado correctamente");
      } else {
        await createCustomer(payload);
        toast.success("Contacto creado correctamente");
      }
      setModalOpen(false);
    } catch (e) {
      toast.error(errorMessage(e, "Error al guardar el contacto"));
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteCustomer(toDelete.id);
      toast.success("Contacto archivado correctamente");
      setToDelete(null);
    } catch (e) {
      toast.error(errorMessage(e, "Error al archivar el contacto"));
    }
  };

  if (isLoading && firstLoad) return <CustomersSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contactos</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona tus clientes y proveedores
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Contacto
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Tabs value={role || "all"} onValueChange={(v) => setRole(v === "all" ? "" : (v as ContactRole))}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="customer">Clientes</TabsTrigger>
            <TabsTrigger value="supplier">Proveedores</TabsTrigger>
          </TabsList>
        </Tabs>
        <SearchBar
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onSearch={setSearch}
          className="max-w-sm"
        />
      </div>

      <Card className="p-0 rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Por cobrar</TableHead>
                <TableHead>Por pagar</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Cargando contactos...
                  </TableCell>
                </TableRow>
              ) : customers.length ? (
                customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {c.is_customer && <Badge variant="secondary">Cliente</Badge>}
                        {c.is_supplier && <Badge variant="outline">Proveedor</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.id_number ? (
                        <span>
                          <span className="text-xs text-muted-foreground">
                            {c.id_type ? `${ID_TYPE_LABEL[c.id_type]} ` : ""}
                          </span>
                          {c.id_number}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{c.phone || "—"}</TableCell>
                    <TableCell className={c.receivable ? "text-foreground" : "text-muted-foreground"}>
                      {money(c.receivable ?? 0)}
                    </TableCell>
                    <TableCell className={c.payable ? "text-destructive" : "text-muted-foreground"}>
                      {money(c.payable ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setToDelete(c)}
                        title="Archivar"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No se encontraron contactos.
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
        onPageChange={({ selected }) =>
          fetchCustomers(selected + 1, pagination.per_page, search, role)
        }
      />

      {/* Create / Edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Contacto" : "Nuevo Contacto"}</DialogTitle>
            <DialogDescription>
              {editing ? "Actualiza los datos del contacto" : "Registra un nuevo cliente o proveedor"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.is_customer}
                  onCheckedChange={(v) => setForm({ ...form, is_customer: !!v })}
                />
                Cliente
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.is_supplier}
                  onCheckedChange={(v) => setForm({ ...form, is_supplier: !!v })}
                />
                Proveedor
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nombre completo o razón social"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="id_type">Tipo de documento</Label>
                <select
                  id="id_type"
                  value={form.id_type}
                  onChange={(e) => setForm({ ...form, id_type: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Sin documento</option>
                  {ID_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="id_number">Número</Label>
                <Input
                  id="id_number"
                  value={form.id_number}
                  onChange={(e) => setForm({ ...form, id_number: e.target.value })}
                  placeholder="0102030405"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="09XXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <select
                  id="country"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className={selectClass}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <select
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Selecciona...</option>
                  {ECUADOR_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Calle principal y referencia"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {editing ? "Guardar cambios" : "Crear contacto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive confirmation */}
      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archivar contacto</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas archivar a {toDelete?.name}? No se eliminará: quedará inactivo
              para conservar el historial de sus transacciones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
