import { useEffect, useState } from "react";
import { Plus, Loader2, Tag, FolderTree, type LucideIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useInventoryStore } from "../../../stores/inventoryStore";
import { Skeleton } from "@/components/ui/skeleton";
import type { Brand, Category } from "../../../types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import EmptyState from "../../../components/common/EmptyState";
import FormField from "../../../components/common/FormField";
import { EditAction, ArchiveAction, RestoreAction } from "../../../components/common/RowActions";
import { useFormErrors } from "../../../hooks/useFormErrors";
import { toastUndo } from "../../../lib/toastUndo";

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

interface CatalogItem {
  id: number;
  name: string;
  description?: string | null;
  active: boolean;
  products_count?: number;
  parent_id?: number | null;
  parent_name?: string | null;
}

interface FormState {
  name: string;
  description: string;
  parent_id?: string;
}

const EMPTY_FORM: FormState = { name: "", description: "", parent_id: "" };

// Sección genérica de catálogo (sirve para Marcas y Categorías)
function CatalogSection({
  label,
  labelPlural,
  emptyIcon,
  items,
  onCreate,
  onUpdate,
  onArchive,
  onRestore,
  parentOptions,
}: {
  label: string;
  labelPlural: string;
  emptyIcon: LucideIcon;
  items: CatalogItem[];
  onCreate: (data: FormState) => Promise<void>;
  onUpdate: (id: number, data: FormState) => Promise<void>;
  onArchive: (id: number) => Promise<void>;
  onRestore: (id: number) => Promise<void>;
  /** Si se provee, habilita el campo "Categoría padre" (subcategorías). */
  parentOptions?: { id: number; name: string }[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toArchive, setToArchive] = useState<CatalogItem | null>(null);
  const { errors, validate, clearError, clearAll } = useFormErrors<"name">();

  const openCreate = () => {
    setEditing(null);
    clearAll();
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (item: CatalogItem) => {
    setEditing(item);
    clearAll();
    setForm({
      name: item.name,
      description: item.description ?? "",
      parent_id: item.parent_id ? String(item.parent_id) : "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!validate({ name: !form.name.trim() ? "El nombre es requerido" : null })) return;
    setSaving(true);
    try {
      if (editing) await onUpdate(editing.id, form);
      else await onCreate(form);
      toast.success(`${label} ${editing ? "actualizada" : "creada"} correctamente`);
      setModalOpen(false);
    } catch (e) {
      toast.error(errorMessage(e, `Error al guardar la ${label.toLowerCase()}`));
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!toArchive) return;
    const target = toArchive;
    setToArchive(null);
    try {
      await onArchive(target.id);
      toastUndo(`${label} "${target.name}" archivada`, async () => {
        await onRestore(target.id);
        toast.success(`${label} restaurada`);
      });
    } catch (e) {
      toast.error(errorMessage(e, `Error al archivar la ${label.toLowerCase()}`));
    }
  };

  const handleRestore = async (item: CatalogItem) => {
    try {
      await onRestore(item.id);
      toast.success(`${label} restaurada`);
    } catch (e) {
      toast.error(errorMessage(e, `Error al restaurar la ${label.toLowerCase()}`));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Nueva {label}
        </Button>
      </div>

      <Card className="rounded-xl p-0">
        <CardContent className="p-0">
          {items.length === 0 ? (
            <EmptyState
              icon={emptyIcon}
              title={`Aún no hay ${labelPlural.toLowerCase()}`}
              description={`Crea tu primera ${label.toLowerCase()} para organizar tu inventario.`}
              action={{ label: `Nueva ${label.toLowerCase()}`, onClick: openCreate, icon: Plus }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Nombre</TableHead>
                  {parentOptions && <TableHead>Categoría padre</TableHead>}
                  <TableHead>Descripción</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={item.id} className={!item.active ? "opacity-60" : undefined}>
                    <TableCell className="text-center text-sm text-muted-foreground tabular-nums">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.parent_name && <span className="text-muted-foreground">{item.parent_name} › </span>}
                      {item.name}
                    </TableCell>
                    {parentOptions && (
                      <TableCell className="text-muted-foreground">{item.parent_name || "—"}</TableCell>
                    )}
                    <TableCell className="text-muted-foreground">{item.description || "—"}</TableCell>
                    <TableCell>{item.products_count ?? 0}</TableCell>
                    <TableCell>
                      {item.active ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">Activa</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">Archivada</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.active ? (
                        <>
                          <EditAction onClick={() => openEdit(item)} />
                          <ArchiveAction onClick={() => setToArchive(item)} />
                        </>
                      ) : (
                        <RestoreAction onClick={() => handleRestore(item)} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal crear/editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${label}` : `Nueva ${label}`}</DialogTitle>
            <DialogDescription>Datos del catálogo</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="space-y-4 py-2"
          >
            <FormField label="Nombre" htmlFor="c-name" required error={errors.name}>
              <Input
                id="c-name"
                name="name"
                autoFocus
                aria-invalid={!!errors.name}
                value={form.name}
                onChange={(e) => { setForm({ ...form, name: e.target.value }); clearError("name"); }}
              />
            </FormField>
            {parentOptions && (
              <FormField
                label="Categoría padre"
                htmlFor="c-parent"
                hint="Selecciona una categoría padre para crear una subcategoría."
              >
                <select
                  id="c-parent"
                  value={form.parent_id ?? ""}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Ninguna (categoría principal)</option>
                  {parentOptions
                    .filter((p) => p.id !== editing?.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
              </FormField>
            )}
            <FormField label="Descripción" htmlFor="c-desc">
              <Textarea id="c-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmación archivar */}
      <AlertDialog open={!!toArchive} onOpenChange={(o) => !o && setToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archivar {label.toLowerCase()}</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas archivar {toArchive?.name}? Quedará inactiva pero no se eliminará. Podrás deshacer esta acción.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>Archivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <Card className="rounded-xl p-0">
        <CardContent className="p-0">
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex-1"><Skeleton className="h-4 w-28 rounded" /></div>
                <div className="flex-1"><Skeleton className="h-4 w-40 rounded" /></div>
                <Skeleton className="h-4 w-8 rounded" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <div className="flex gap-1">
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

export default function BrandsIndex() {
  const {
    brands,
    categories,
    isLoading,
    fetchBrands,
    fetchCategories,
    createBrand,
    updateBrand,
    deleteBrand,
    restoreBrand,
    createCategory,
    updateCategory,
    deleteCategory,
    restoreCategory,
  } = useInventoryStore();

  const [firstLoad, setFirstLoad] = useState(true);

  useEffect(() => {
    Promise.all([fetchBrands(), fetchCategories()]).finally(() => setFirstLoad(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading && firstLoad) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <CatalogSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marcas y Categorías</h1>
        <p className="text-sm text-muted-foreground">
          Administra el catálogo de marcas y categorías de tus productos
        </p>
      </div>

      <Tabs defaultValue="brands">
        <TabsList>
          <TabsTrigger value="brands">Marcas</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
        </TabsList>
        <TabsContent value="brands" className="mt-4">
          <CatalogSection
            label="Marca"
            labelPlural="Marcas"
            emptyIcon={Tag}
            items={brands as Brand[]}
            onCreate={(d) => createBrand(d)}
            onUpdate={(id, d) => updateBrand(id, d)}
            onArchive={(id) => deleteBrand(id)}
            onRestore={(id) => restoreBrand(id)}
          />
        </TabsContent>
        <TabsContent value="categories" className="mt-4">
          <CatalogSection
            label="Categoría"
            labelPlural="Categorías"
            emptyIcon={FolderTree}
            items={categories as Category[]}
            parentOptions={(categories as Category[])
              .filter((c) => !c.parent_id)
              .map((c) => ({ id: c.id, name: c.name }))}
            onCreate={(d) =>
              createCategory({ ...d, parent_id: d.parent_id ? Number(d.parent_id) : null })
            }
            onUpdate={(id, d) =>
              updateCategory(id, { ...d, parent_id: d.parent_id ? Number(d.parent_id) : null })
            }
            onArchive={(id) => deleteCategory(id)}
            onRestore={(id) => restoreCategory(id)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
