import { useEffect, useState } from "react";
import { Plus, Pencil, Archive } from "lucide-react";
import toast from "react-hot-toast";
import { useCustomerStore } from "../../../stores/customerStore";
import type { Customer } from "../../../types/inventory";
import { ECUADOR_CITIES, COUNTRIES, ID_TYPES } from "../../../lib/locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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

interface FormState {
  name: string;
  id_type: string;
  id_number: string;
  phone: string;
  country: string;
  city: string;
  address: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  id_type: "",
  id_number: "",
  phone: "",
  country: "Ecuador",
  city: "",
  address: "",
};

const ID_TYPE_LABEL: Record<string, string> = {
  cedula: "Cédula",
  pasaporte: "Pasaporte",
  ruc: "RUC",
};

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

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

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [toDelete, setToDelete] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers(1, pagination.per_page, search).catch((e) =>
      toast.error(e.message || "Error al cargar clientes"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setForm({
      name: customer.name,
      id_type: customer.id_type ?? "",
      id_number: customer.id_number ?? "",
      phone: customer.phone ?? "",
      country: customer.country ?? "Ecuador",
      city: customer.city ?? "",
      address: customer.address ?? "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    try {
      if (editing) {
        await updateCustomer(editing.id, form);
        toast.success("Cliente actualizado correctamente");
      } else {
        await createCustomer(form);
        toast.success("Cliente creado correctamente");
      }
      setModalOpen(false);
    } catch (e) {
      toast.error(errorMessage(e, "Error al guardar el cliente"));
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteCustomer(toDelete.id);
      toast.success("Cliente archivado correctamente");
      setToDelete(null);
    } catch (e) {
      toast.error(errorMessage(e, "Error al archivar el cliente"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona la información de tus clientes
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Cliente
        </Button>
      </div>

      <SearchBar
        placeholder="Buscar por nombre o teléfono..."
        value={search}
        onSearch={setSearch}
        className="max-w-sm"
      />

      <Card className="p-0 rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Ventas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Cargando clientes...
                  </TableCell>
                </TableRow>
              ) : customers.length ? (
                customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
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
                    <TableCell>
                      {c.city || "—"}
                      {c.country && c.country !== "Ecuador" ? (
                        <span className="text-xs text-muted-foreground"> · {c.country}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>{c.sales_count ?? 0}</TableCell>
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
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No se encontraron clientes.
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
          fetchCustomers(selected + 1, pagination.per_page, search)
        }
      />

      {/* Create / Edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
            <DialogDescription>
              {editing ? "Actualiza los datos del cliente" : "Registra un nuevo cliente"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nombre completo"
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

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="09XXXXXXXX"
              />
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
              {editing ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive confirmation */}
      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archivar cliente</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas archivar a {toDelete?.name}? No se eliminará: quedará inactivo
              para conservar el historial de sus ventas.
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
