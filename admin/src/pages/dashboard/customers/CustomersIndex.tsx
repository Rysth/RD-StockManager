import { useEffect, useState } from "react";
import { Plus, Loader2, Users2, SearchX } from "lucide-react";
import toast from "react-hot-toast";
import { useCustomerStore, type ContactRole } from "../../../stores/customerStore";
import type { Customer } from "../../../types/inventory";
import { ECUADOR_CITIES, COUNTRIES, ID_TYPES } from "../../../lib/locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import Pagination from "../../../components/common/Pagination";
import SearchBar from "../../../components/common/SearchBar";
import EmptyState from "../../../components/common/EmptyState";
import FormField from "../../../components/common/FormField";
import ArchivedToggle from "../../../components/common/ArchivedToggle";
import { EditAction, ArchiveAction, RestoreAction } from "../../../components/common/RowActions";
import { useFormErrors } from "../../../hooks/useFormErrors";
import { toastUndo } from "../../../lib/toastUndo";
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
  id_type: "cedula",
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
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm aria-[invalid=true]:border-destructive";

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const validateIdNumber = (idType: string, idNumber: string) => {
  const value = idNumber.trim();
  if (!idType) return "El tipo de documento es requerido";
  if (!value) return "El número de documento es requerido";
  if (idType === "cedula" && !/^\d{10}$/.test(value)) return "La cédula debe tener 10 dígitos";
  if (idType === "ruc" && !/^\d{13}$/.test(value)) return "El RUC debe tener 13 dígitos";
  if (idType === "pasaporte" && (value.length < 5 || value.length > 20)) {
    return "El pasaporte debe tener entre 5 y 20 caracteres";
  }
  return null;
};

type FieldKey = "name" | "roles" | "id_number" | "email";

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
    restoreCustomer,
  } = useCustomerStore();

  const [firstLoad, setFirstLoad] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<ContactRole>("");
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Customer | null>(null);
  const { errors, validate, clearError, clearAll } = useFormErrors<FieldKey>();

  useEffect(() => {
    fetchCustomers(1, pagination.per_page, search, role, showArchived)
      .catch((e) => toast.error(e.message || "Error al cargar contactos"))
      .finally(() => setFirstLoad(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, role, showArchived]);

  const openCreate = () => {
    setEditing(null);
    clearAll();
    setForm({
      ...EMPTY_FORM,
      is_customer: role !== "supplier",
      is_supplier: role === "supplier",
    });
    setModalOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    clearAll();
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
    const ok = validate({
      name: !form.name.trim() ? "El nombre es requerido" : null,
      roles: !form.is_customer && !form.is_supplier ? "Selecciona al menos un rol (cliente o proveedor)" : null,
      id_number: validateIdNumber(form.id_type, form.id_number),
      email: form.email.trim() && !isEmail(form.email.trim()) ? "Correo electrónico inválido" : null,
    });
    if (!ok) return;

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
    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const target = toDelete;
    setToDelete(null);
    try {
      await deleteCustomer(target.id);
      toastUndo(`${target.name} archivado`, async () => {
        await restoreCustomer(target.id);
        toast.success("Contacto restaurado");
      });
    } catch (e) {
      toast.error(errorMessage(e, "Error al archivar el contacto"));
    }
  };

  const handleRestore = async (customer: Customer) => {
    try {
      await restoreCustomer(customer.id);
      toast.success("Contacto restaurado");
    } catch (e) {
      toast.error(errorMessage(e, "Error al restaurar el contacto"));
    }
  };

  if (isLoading && firstLoad) return <CustomersSkeleton />;

  const isSearching = search.trim().length > 0;

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
        <div className="flex flex-wrap items-center gap-3">
          <ArchivedToggle checked={showArchived} onChange={setShowArchived} />
          <SearchBar
            placeholder="Buscar por nombre o teléfono..."
            value={search}
            onSearch={setSearch}
            className="max-w-sm"
          />
        </div>
      </div>

      {!isLoading && customers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {pagination.total_count} {pagination.total_count === 1 ? "contacto" : "contactos"}
          {showArchived && " archivados"}
        </p>
      )}

      <Card className="p-0 rounded-xl">
        <CardContent className="p-0">
          {!isLoading && customers.length === 0 ? (
            isSearching ? (
              <EmptyState
                variant="no-results"
                icon={SearchX}
                title="Sin resultados"
                description="No encontramos contactos que coincidan con tu búsqueda."
                action={{ label: "Limpiar búsqueda", onClick: () => setSearch("") }}
              />
            ) : showArchived ? (
              <EmptyState
                variant="no-results"
                icon={Users2}
                title="No hay contactos archivados"
                description="Los contactos que archives aparecerán aquí."
              />
            ) : (
              <EmptyState
                icon={Users2}
                title="Aún no tienes contactos"
                description="Registra a tus clientes y proveedores para llevar su historial de ventas y compras."
                action={{ label: "Nuevo contacto", onClick: openCreate, icon: Plus }}
              />
            )
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Código</TableHead>
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
                {customers.map((c, idx) => (
                  <TableRow key={c.id} className={c.active === false ? "opacity-60" : undefined}>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {c.name}
                        {c.active === false && (
                          <Badge variant="secondary" className="bg-muted text-muted-foreground">Archivado</Badge>
                        )}
                      </div>
                    </TableCell>
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
                      {c.active === false ? (
                        <RestoreAction onClick={() => handleRestore(c)} />
                      ) : (
                        <>
                          <EditAction onClick={() => openEdit(c)} />
                          <ArchiveAction onClick={() => setToDelete(c)} />
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {customers.length > 0 && (
        <Pagination
          currentPage={pagination.current_page - 1}
          pageCount={pagination.total_pages}
          totalCount={pagination.total_count}
          perPage={pagination.per_page}
          onPageChange={({ selected }) =>
            fetchCustomers(selected + 1, pagination.per_page, search, role, showArchived)
          }
        />
      )}

      {/* Create / Edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Contacto" : "Nuevo Contacto"}</DialogTitle>
            <DialogDescription>
              {editing ? "Actualiza los datos del contacto" : "Registra un nuevo cliente o proveedor"}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="space-y-5 py-2"
          >
            {/* Rol */}
            <div className="space-y-1.5">
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.is_customer}
                    onCheckedChange={(v) => { setForm({ ...form, is_customer: !!v }); clearError("roles"); }}
                  />
                  Cliente
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.is_supplier}
                    onCheckedChange={(v) => { setForm({ ...form, is_supplier: !!v }); clearError("roles"); }}
                  />
                  Proveedor
                </label>
              </div>
              {errors.roles && <p className="text-xs font-medium text-destructive">{errors.roles}</p>}
            </div>

            {/* Identidad */}
            <FormField label="Nombre" htmlFor="name" required error={errors.name}>
              <Input
                id="name"
                name="name"
                autoFocus
                aria-invalid={!!errors.name}
                value={form.name}
                onChange={(e) => { setForm({ ...form, name: e.target.value }); clearError("name"); }}
                placeholder="Nombre completo o razón social"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Tipo de documento" htmlFor="id_type" required>
                <select
                  id="id_type"
                  value={form.id_type}
                  onChange={(e) => { setForm({ ...form, id_type: e.target.value }); clearError("id_number"); }}
                  className={selectClass}
                >
                  {ID_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Número" htmlFor="id_number" required error={errors.id_number}>
                <Input
                  id="id_number"
                  name="id_number"
                  aria-invalid={!!errors.id_number}
                  value={form.id_number}
                  onChange={(e) => { setForm({ ...form, id_number: e.target.value }); clearError("id_number"); }}
                  inputMode={form.id_type === "pasaporte" ? "text" : "numeric"}
                  maxLength={form.id_type === "ruc" ? 13 : form.id_type === "cedula" ? 10 : 20}
                  placeholder="0102030405"
                />
              </FormField>
            </div>

            {/* Contacto */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Teléfono" htmlFor="phone">
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="09XXXXXXXX"
                />
              </FormField>
              <FormField label="Email" htmlFor="email" error={errors.email}>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  aria-invalid={!!errors.email}
                  value={form.email}
                  onChange={(e) => { setForm({ ...form, email: e.target.value }); clearError("email"); }}
                  placeholder="correo@ejemplo.com"
                />
              </FormField>
            </div>

            {/* Ubicación */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="País" htmlFor="country">
                <select
                  id="country"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className={selectClass}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Ciudad" htmlFor="city">
                <Combobox
                  options={ECUADOR_CITIES.map((c) => ({ value: c, label: c }))}
                  value={form.city}
                  onSelect={(v) => setForm({ ...form, city: v })}
                  placeholder="Selecciona..."
                  searchPlaceholder="Buscar ciudad..."
                />
              </FormField>
            </div>

            <FormField label="Dirección" htmlFor="address">
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Calle principal y referencia"
              />
            </FormField>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear contacto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Archive confirmation */}
      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archivar contacto</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas archivar a {toDelete?.name}? No se eliminará: quedará inactivo
              para conservar el historial de sus transacciones. Podrás deshacer esta acción.
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
