import { create } from "zustand";
import api from "../utils/api";
import type { Expense, ExpenseCategory, ExpenseInput, Employee, Pagination } from "../types/inventory";

interface ExpenseFilters {
  search?: string;
  expense_category_id?: number | "";
  location_id?: number | "";
}

const DEFAULT_PAGINATION: Pagination = {
  current_page: 1,
  total_pages: 1,
  total_count: 0,
  per_page: 12,
};

type ApiError = {
  response?: {
    status?: number;
    data?: { errors?: string[]; message?: string };
  };
};

function toMessage(error: unknown, fallback: string): string {
  const response = (error as ApiError).response;

  if (response?.status === 429)
    return "Demasiadas solicitudes. Por favor, espera un momento antes de intentar nuevamente.";
  if (response?.status === 403) return "No tienes permisos para realizar esta acción.";
  if (response?.data?.errors?.length) return response.data.errors.join(", ");
  if (response?.data?.message) return response.data.message;
  if (!response) return "Sin conexión. Verifica tu conexión a internet.";
  return fallback;
}

interface ExpenseCategoryInput {
  name: string;
  active?: boolean;
}

interface ExpenseState {
  expenses: Expense[];
  categories: ExpenseCategory[];
  employees: Employee[];
  pagination: Pagination;
  isLoading: boolean;
  error: string | null;
  currentFilters: ExpenseFilters;

  fetchExpenses: (page?: number, perPage?: number, filters?: ExpenseFilters) => Promise<void>;
  createExpense: (data: ExpenseInput) => Promise<void>;
  updateExpense: (id: number, data: ExpenseInput) => Promise<void>;
  deleteExpense: (id: number) => Promise<void>;
  fetchCategories: () => Promise<void>;
  createCategory: (data: ExpenseCategoryInput) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
  fetchEmployees: () => Promise<void>;
  checkSalaryStatus: (employeeId: number, date: string) => Promise<boolean>;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  categories: [],
  employees: [],
  pagination: DEFAULT_PAGINATION,
  isLoading: false,
  error: null,
  currentFilters: {},

  fetchExpenses: async (page = 1, perPage = 12, filters = {}) => {
    set({ isLoading: true, error: null, currentFilters: filters });
    try {
      const params: Record<string, string | number> = { page, per_page: perPage };
      if (filters.search) params.search = filters.search;
      if (filters.expense_category_id) params.expense_category_id = filters.expense_category_id;
      if (filters.location_id) params.location_id = filters.location_id;
      const response = await api.get("/api/v1/expenses", { params });
      set({
        expenses: response.data.expenses,
        pagination: response.data.pagination,
        isLoading: false,
      });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener los gastos"), isLoading: false });
      throw error;
    }
  },

  createExpense: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/api/v1/expenses", { expense: data });
      const { pagination, currentFilters } = get();
      await get().fetchExpenses(pagination.current_page, pagination.per_page, currentFilters);
    } catch (error) {
      const msg = toMessage(error, "Error al registrar el gasto");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  updateExpense: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await api.put(`/api/v1/expenses/${id}`, { expense: data });
      const { pagination, currentFilters } = get();
      await get().fetchExpenses(pagination.current_page, pagination.per_page, currentFilters);
    } catch (error) {
      const msg = toMessage(error, "Error al actualizar el gasto");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  deleteExpense: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/api/v1/expenses/${id}`);
      const { pagination, currentFilters, expenses } = get();
      const page =
        expenses.length === 1 && pagination.current_page > 1
          ? pagination.current_page - 1
          : pagination.current_page;
      await get().fetchExpenses(page, pagination.per_page, currentFilters);
    } catch (error) {
      const msg = toMessage(error, "Error al eliminar el gasto");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  fetchCategories: async () => {
    try {
      const response = await api.get("/api/v1/expense_categories");
      set({ categories: response.data.expense_categories });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener las categorías de gasto") });
    }
  },

  createCategory: async (data) => {
    try {
      await api.post("/api/v1/expense_categories", { expense_category: data });
      await get().fetchCategories();
    } catch (error) {
      const msg = toMessage(error, "Error al crear la categoría");
      set({ error: msg });
      throw new Error(msg);
    }
  },

  deleteCategory: async (id) => {
    try {
      await api.delete(`/api/v1/expense_categories/${id}`);
      await get().fetchCategories();
    } catch (error) {
      const msg = toMessage(error, "Error al archivar la categoría");
      set({ error: msg });
      throw new Error(msg);
    }
  },

  fetchEmployees: async () => {
    try {
      const response = await api.get("/api/v1/expenses/employees");
      set({ employees: response.data.employees });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener los empleados") });
    }
  },

  checkSalaryStatus: async (employeeId, date) => {
    try {
      const response = await api.get("/api/v1/expenses/salary_status", {
        params: { employee_id: employeeId, date },
      });
      return Boolean(response.data.exists);
    } catch {
      return false;
    }
  },
}));
