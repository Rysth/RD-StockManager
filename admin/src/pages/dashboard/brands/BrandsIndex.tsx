import { useEffect, useState } from "react";
import { Plus, Pencil, Archive } from "lucide-react";
import toast from "react-hot-toast";
import { useInventoryStore } from "../../../stores/inventoryStore";
import { Skeleton } from "@/components/ui/skeleton";
import type { Brand, Category } from "../../../types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

interface CatalogItem {
  id: number;
  name: string;
  description?: string | null;
  active: boolean;
  products_count?: number;
}

interface FormState {
  name: string;
  description: string;
  active: boolean;
}

const EMPTY_FORM: FormState = { name: "", description: "", active: true };

// Sección genérica de catálogo (sirve para Marcas y Categorías)
function CatalogSection({
  label,
  labelPlural,
  items,
  onCreate,
  onUpdate,
  onArchive,
}: {
  label: string;
  labelPlural: string;
  items: CatalogItem[];
  onCreate: (data: FormState) => Promise<void>;
  onUpdate: (id: number, data: FormState) => Promise<void>;
  onArchive: (id: number) => Promise<void>;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toArchive, setToArchive] = useState<CatalogItem | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (item: CatalogItem) => {
    setEditing(item);
    setForm({ name: item.name, description: item.description ?? "", active: item.active });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error("El nombre es requerido");
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
    try {
      await onArchive(toArchive.id);
      toast.success(`${label} archivada`);
      setToArchive(null);
    } catch (e) {
      toast.error(errorMessage(e, `Error al archivar la ${label.toLowerCase()}`));
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length ? (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
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
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {item.active && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToArchive(item)} title="Archivar">
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No hay {labelPlural.toLowerCase()} registradas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal crear/editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${label}` : `Nueva ${label}`}</DialogTitle>
            <DialogDescription>Datos del catálogo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="c-name">Nombre</Label>
              <Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-desc">Descripción</Label>
              <Textarea id="c-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Activa
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación archivar */}
      <AlertDialog open={!!toArchive} onOpenChange={(o) => !o && setToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archivar {label.toLowerCase()}</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas archivar {toArchive?.name}? Quedará inactiva pero no se eliminará.
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
    createCategory,
    updateCategory,
    deleteCategory,
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
            items={brands as Brand[]}
            onCreate={(d) => createBrand(d)}
            onUpdate={(id, d) => updateBrand(id, d)}
            onArchive={(id) => deleteBrand(id)}
          />
        </TabsContent>
        <TabsContent value="categories" className="mt-4">
          <CatalogSection
            label="Categoría"
            labelPlural="Categorías"
            items={categories as Category[]}
            onCreate={(d) => createCategory(d)}
            onUpdate={(id, d) => updateCategory(id, d)}
            onArchive={(id) => deleteCategory(id)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
