import { useEffect, useState } from "react";
import { Plus, Star, Loader2, Warehouse, SearchX } from "lucide-react";
import toast from "react-hot-toast";
import { useLocationStore } from "../../../stores/locationStore";
import type { Location } from "../../../types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import SearchBar from "../../../components/common/SearchBar";
import EmptyState from "../../../components/common/EmptyState";
import FormField from "../../../components/common/FormField";
import ArchivedToggle from "../../../components/common/ArchivedToggle";
import {
  ActionIconButton,
  EditAction,
  ArchiveAction,
  RestoreAction,
} from "../../../components/common/RowActions";
import { useFormErrors } from "../../../hooks/useFormErrors";
import { toastUndo } from "../../../lib/toastUndo";

interface FormState {
  name: string;
  address: string;
  phone: string;
  is_default: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  address: "",
  phone: "",
  is_default: false,
};

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

function LocationsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36 rounded" />
          <Skeleton className="h-4 w-56 rounded" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
      <Card className="rounded-xl p-0">
        <CardContent className="p-0">
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex-1"><Skeleton className="h-4 w-40 rounded" /></div>
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
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

export default function LocationsIndex() {
  const {
    locations,
    pagination,
    isLoading,
    fetchLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    restoreLocation,
  } = useLocationStore();

  const [firstLoad, setFirstLoad] = useState(true);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Location | null>(null);
  const { errors, validate, clearError, clearAll } = useFormErrors<"name">();

  useEffect(() => {
    fetchLocations(1, pagination.per_page, search, showArchived)
      .catch((e) => toast.error(e.message || "Error al cargar ubicaciones"))
      .finally(() => setFirstLoad(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, showArchived]);

  const openCreate = () => {
    setEditing(null);
    clearAll();
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (location: Location) => {
    setEditing(location);
    clearAll();
    setForm({
      name: location.name,
      address: location.address ?? "",
      phone: location.phone ?? "",
      is_default: location.is_default,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!validate({ name: !form.name.trim() ? "El nombre es requerido" : null })) return;
    setSaving(true);
    try {
      if (editing) {
        await updateLocation(editing.id, form);
        toast.success("Ubicación actualizada correctamente");
      } else {
        await createLocation(form);
        toast.success("Ubicación creada correctamente");
      }
      setModalOpen(false);
    } catch (e) {
      toast.error(errorMessage(e, "Error al guardar la ubicación"));
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (location: Location) => {
    try {
      await updateLocation(location.id, {
        name: location.name,
        address: location.address ?? "",
        phone: location.phone ?? "",
        is_default: true,
      });
      toast.success(`${location.name} es ahora la ubicación principal`);
    } catch (e) {
      toast.error(errorMessage(e, "Error al cambiar la ubicación principal"));
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const target = toDelete;
    setToDelete(null);
    try {
      await deleteLocation(target.id);
      toastUndo(`${target.name} archivada`, async () => {
        await restoreLocation(target.id);
        toast.success("Ubicación restaurada");
      });
    } catch (e) {
      toast.error(errorMessage(e, "Error al archivar la ubicación"));
    }
  };

  const handleRestore = async (location: Location) => {
    try {
      await restoreLocation(location.id);
      toast.success("Ubicación restaurada");
    } catch (e) {
      toast.error(errorMessage(e, "Error al restaurar la ubicación"));
    }
  };

  if (isLoading && firstLoad) return <LocationsSkeleton />;

  const isSearching = search.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ubicaciones</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona tus tiendas y almacenes. El stock, ventas y compras se rastrean por ubicación.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" /> Nueva Ubicación
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ArchivedToggle checked={showArchived} onChange={setShowArchived} />
        <SearchBar
          placeholder="Buscar por nombre..."
          value={search}
          onSearch={setSearch}
          className="max-w-sm"
        />
      </div>

      {!isLoading && locations.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {pagination.total_count} {pagination.total_count === 1 ? "ubicación" : "ubicaciones"}
          {showArchived && " archivadas"}
        </p>
      )}

      <Card className="p-0 rounded-xl">
        <CardContent className="p-0">
          {!isLoading && locations.length === 0 ? (
            isSearching ? (
              <EmptyState
                variant="no-results"
                icon={SearchX}
                title="Sin resultados"
                description="No encontramos ubicaciones que coincidan con tu búsqueda."
                action={{ label: "Limpiar búsqueda", onClick: () => setSearch("") }}
              />
            ) : showArchived ? (
              <EmptyState
                variant="no-results"
                icon={Warehouse}
                title="No hay ubicaciones archivadas"
                description="Las ubicaciones que archives aparecerán aquí."
              />
            ) : (
              <EmptyState
                icon={Warehouse}
                title="Aún no tienes ubicaciones"
                description="Registra tus tiendas y almacenes para controlar el stock por sucursal."
                action={{ label: "Nueva ubicación", onClick: openCreate, icon: Plus }}
              />
            )
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Stock total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((l, idx) => (
                  <TableRow key={l.id} className={!l.active ? "opacity-60" : undefined}>
                    <TableCell className="text-center text-sm text-muted-foreground tabular-nums">
                      {(pagination.current_page - 1) * pagination.per_page + idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {l.name}
                        {l.is_default && (
                          <Badge variant="secondary" className="gap-1">
                            <Star className="h-3 w-3" /> Principal
                          </Badge>
                        )}
                        {!l.active && (
                          <Badge variant="secondary" className="bg-muted text-muted-foreground">Archivada</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{l.address || "—"}</TableCell>
                    <TableCell>{l.phone || "—"}</TableCell>
                    <TableCell>{l.stock_total ?? 0}</TableCell>
                    <TableCell className="text-right">
                      {!l.active ? (
                        <RestoreAction onClick={() => handleRestore(l)} />
                      ) : (
                        <>
                          {!l.is_default && (
                            <ActionIconButton
                              icon={Star}
                              label="Marcar como principal"
                              onClick={() => handleSetDefault(l)}
                            />
                          )}
                          <EditAction onClick={() => openEdit(l)} />
                          <ArchiveAction
                            onClick={() => setToDelete(l)}
                            disabled={l.is_default}
                            disabledLabel="No puedes archivar la ubicación principal"
                          />
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

      {/* Create / Edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Ubicación" : "Nueva Ubicación"}</DialogTitle>
            <DialogDescription>
              {editing ? "Actualiza los datos de la ubicación" : "Registra una tienda o almacén"}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="space-y-4 py-2"
          >
            <FormField label="Nombre" htmlFor="name" required error={errors.name}>
              <Input
                id="name"
                name="name"
                autoFocus
                aria-invalid={!!errors.name}
                value={form.name}
                onChange={(e) => { setForm({ ...form, name: e.target.value }); clearError("name"); }}
                placeholder="Ej. Tienda Centro, Bodega Norte"
              />
            </FormField>
            <FormField label="Dirección" htmlFor="address">
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Calle principal y referencia"
              />
            </FormField>
            <FormField label="Teléfono" htmlFor="phone">
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="09XXXXXXXX"
              />
            </FormField>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.is_default}
                onCheckedChange={(v) => setForm({ ...form, is_default: v === true })}
              />
              Marcar como ubicación principal (predeterminada para nuevas ventas)
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear ubicación"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Archive confirmation */}
      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archivar ubicación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas archivar {toDelete?.name}? No se eliminará: quedará inactiva para
              conservar el historial de stock y ventas. Podrás deshacer esta acción.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Archivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
