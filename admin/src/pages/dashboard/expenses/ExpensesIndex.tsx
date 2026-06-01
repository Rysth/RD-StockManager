import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Tag, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { useExpenseStore } from "../../../stores/expenseStore";
import { useLocationStore } from "../../../stores/locationStore";
import type { Expense, ExpenseInput, PaymentMethod } from "../../../types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import Pagination from "../../../components/common/Pagination";

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n || 0);

const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

const PAYMENT_LABEL: Record<PaymentMethod, string> = { cash: "Efectivo", transfer: "Transferencia" };

interface FormState {
  expense_category_id: string;
  location_id: string;
  amount: string;
  expense_date: string;
  description: string;
  payment_method: PaymentMethod;
  reference: string;
  employee_id: string;
}

const todayInput = () => new Date().toISOString().slice(0, 10);

const EMPTY_FORM: FormState = {
  expense_category_id: "",
  location_id: "",
  amount: "",
  expense_date: todayInput(),
  description: "",
  payment_method: "cash",
  reference: "",
  employee_id: "",
};

const errorMessage = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback;

export default function ExpensesIndex() {
  const {
    expenses,
    categories,
    employees,
    pagination,
    isLoading,
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    fetchCategories,
    createCategory,
    fetchEmployees,
    checkSalaryStatus,
  } = useExpenseStore();
  const { locations, fetchLocations } = useLocationStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [toDelete, setToDelete] = useState<Expense | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [salaryWarning, setSalaryWarning] = useState(false);

  useEffect(() => {
    fetchCategories().catch(() => {});
    fetchLocations().catch(() => {});
    fetchEmployees().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedCategory = categories.find((c) => String(c.id) === form.expense_category_id);
  const isPayroll = selectedCategory?.is_payroll ?? false;

  // Verifica si ya existe un sueldo para ese empleado en el mes seleccionado.
  useEffect(() => {
    if (!modalOpen || !isPayroll || !form.employee_id || !form.expense_date) {
      setSalaryWarning(false);
      return;
    }
    let active = true;
    checkSalaryStatus(Number(form.employee_id), form.expense_date).then((exists) => {
      if (active) setSalaryWarning(exists);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, isPayroll, form.employee_id, form.expense_date]);

  useEffect(() => {
    fetchExpenses(1, pagination.per_page, {
      expense_category_id: categoryFilter ? Number(categoryFilter) : "",
      location_id: locationFilter ? Number(locationFilter) : "",
    }).catch((e) => toast.error(e.message || "Error al cargar gastos"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, locationFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({
      expense_category_id: e.expense_category_id ? String(e.expense_category_id) : "",
      location_id: e.location_id ? String(e.location_id) : "",
      amount: String(e.amount),
      expense_date: e.expense_date ? e.expense_date.slice(0, 10) : todayInput(),
      description: e.description ?? "",
      payment_method: e.payment_method,
      reference: e.reference ?? "",
      employee_id: e.employee_id ? String(e.employee_id) : "",
    });
    setModalOpen(true);
  };

  const buildPayload = (): ExpenseInput => ({
    expense_category_id: form.expense_category_id ? Number(form.expense_category_id) : null,
    location_id: form.location_id ? Number(form.location_id) : null,
    amount: Number(form.amount),
    expense_date: form.expense_date || null,
    description: form.description || null,
    payment_method: form.payment_method,
    reference: form.reference || null,
    employee_id: isPayroll && form.employee_id ? Number(form.employee_id) : null,
  });

  const handleSubmit = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }
    if (isPayroll && !form.employee_id) {
      toast.error("Selecciona el empleado al que se le pagó el sueldo");
      return;
    }
    try {
      if (editing) {
        await updateExpense(editing.id, buildPayload());
        toast.success("Gasto actualizado");
      } else {
        await createExpense(buildPayload());
        toast.success("Gasto registrado");
      }
      setModalOpen(false);
    } catch (e) {
      toast.error(errorMessage(e, "Error al guardar el gasto"));
    }
  };

  const handleCreateCategory = async () => {
    if (!newCat.trim()) return;
    try {
      await createCategory({ name: newCat.trim() });
      toast.success("Categoría creada");
      setNewCat("");
      setCatModalOpen(false);
    } catch (e) {
      toast.error(errorMessage(e, "Error al crear la categoría"));
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteExpense(toDelete.id);
      toast.success("Gasto eliminado");
      setToDelete(null);
    } catch (e) {
      toast.error(errorMessage(e, "Error al eliminar el gasto"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gastos</h1>
          <p className="text-sm text-muted-foreground">Registra y categoriza los gastos del negocio</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCatModalOpen(true)}>
            <Tag className="w-4 h-4 mr-2" /> Categorías
          </Button>
          <Button onClick={openCreate} size="sm">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Gasto
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select className={selectClass} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className={selectClass} value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
          <option value="">Todas las ubicaciones</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      <Card className="p-0 rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">Cargando gastos...</TableCell>
                </TableRow>
              ) : expenses.length ? (
                expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.expense_date ? new Date(e.expense_date).toLocaleDateString("es-EC") : "—"}</TableCell>
                    <TableCell>{e.category_name || "Sin categoría"}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {e.employee_name ? (
                        <span>
                          <span className="text-xs text-muted-foreground">Sueldo: </span>
                          {e.employee_name}
                        </span>
                      ) : (
                        e.description || "—"
                      )}
                    </TableCell>
                    <TableCell>{e.location_name || "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{PAYMENT_LABEL[e.payment_method]}</Badge></TableCell>
                    <TableCell className="font-medium">{money(e.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(e)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No se encontraron gastos.
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
          fetchExpenses(selected + 1, pagination.per_page, {
            expense_category_id: categoryFilter ? Number(categoryFilter) : "",
            location_id: locationFilter ? Number(locationFilter) : "",
          })
        }
      />

      {/* Create / Edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Gasto" : "Nuevo Gasto"}</DialogTitle>
            <DialogDescription>{editing ? "Actualiza el gasto" : "Registra un nuevo gasto"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto</Label>
                <Input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <select className={selectClass} value={form.expense_category_id} onChange={(e) => setForm({ ...form, expense_category_id: e.target.value })}>
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Ubicación</Label>
                <select className={selectClass} value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })}>
                  <option value="">General</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {isPayroll && (
              <div className="space-y-2">
                <Label>Empleado (sueldo)</Label>
                <select className={selectClass} value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
                  <option value="">Selecciona un empleado...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.fullname}</option>
                  ))}
                </select>
                {salaryWarning && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Ya existe un sueldo registrado para este empleado en el mes seleccionado.
                      Puedes registrarlo igual si es necesario (p. ej. un segundo pago).
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <select className={selectClass} value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value as PaymentMethod })}>
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalle del gasto" />
            </div>
            <div className="space-y-2">
              <Label>Referencia</Label>
              <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="N° comprobante" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isLoading}>{editing ? "Guardar" : "Registrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category management modal */}
      <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Categorías de gasto</DialogTitle>
            <DialogDescription>Crea categorías para clasificar tus gastos</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex gap-2">
              <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nueva categoría" />
              <Button onClick={handleCreateCategory}>Crear</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Badge key={c.id} variant="secondary">{c.name}</Badge>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar gasto</AlertDialogTitle>
            <AlertDialogDescription>¿Seguro que deseas eliminar este gasto? Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
