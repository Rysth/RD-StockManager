import { create } from "zustand";
import api from "../utils/api";
import type {
  PurchaseReport,
  TaxReport,
  ContactReportRow,
  ExpenseReport,
  CashRegisterReport,
  SalesRepRow,
} from "../types/inventory";

type ApiError = {
  response?: {
    status?: number;
    data?: { errors?: string[]; message?: string };
  };
};

function toMessage(error: unknown, fallback: string): string {
  const response = (error as ApiError).response;
  if (response?.status === 403) return "No tienes permisos para realizar esta acción.";
  if (response?.data?.message) return response.data.message;
  if (!response) return "Sin conexión. Verifica tu conexión a internet.";
  return fallback;
}

export interface ReportFilters {
  locationId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
}

// Convierte los filtros a query params para la API (omite los vacíos).
function toParams(filters: ReportFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.locationId) params.location_id = String(filters.locationId);
  if (filters.startDate) params.start_date = filters.startDate;
  if (filters.endDate) params.end_date = filters.endDate;
  return params;
}

interface ReportState {
  purchaseReport: PurchaseReport | null;
  taxReport: TaxReport | null;
  contactReport: ContactReportRow[] | null;
  expenseReport: ExpenseReport | null;
  cashRegisterReport: CashRegisterReport | null;
  salesRepReport: SalesRepRow[] | null;
  filters: ReportFilters;
  isLoading: boolean;
  error: string | null;

  setFilters: (filters: Partial<ReportFilters>) => void;
  fetchAll: () => Promise<void>;
  fetchPurchaseReport: () => Promise<void>;
  fetchTaxReport: () => Promise<void>;
  fetchContactReport: () => Promise<void>;
  fetchExpenseReport: () => Promise<void>;
  fetchCashRegisterReport: () => Promise<void>;
  fetchSalesRepReport: () => Promise<void>;
}

export const useReportStore = create<ReportState>((set, get) => ({
  purchaseReport: null,
  taxReport: null,
  contactReport: null,
  expenseReport: null,
  cashRegisterReport: null,
  salesRepReport: null,
  filters: { locationId: null, startDate: null, endDate: null },
  isLoading: false,
  error: null,

  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),

  fetchAll: async () => {
    await Promise.all([
      get().fetchPurchaseReport(),
      get().fetchTaxReport(),
      get().fetchContactReport(),
      get().fetchExpenseReport(),
      get().fetchCashRegisterReport(),
      get().fetchSalesRepReport(),
    ]);
  },

  fetchPurchaseReport: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/api/v1/reports/purchases", { params: toParams(get().filters) });
      set({ purchaseReport: data as PurchaseReport, isLoading: false });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener el reporte de compras"), isLoading: false });
    }
  },

  fetchTaxReport: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/api/v1/reports/taxes", { params: toParams(get().filters) });
      set({ taxReport: data as TaxReport, isLoading: false });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener el reporte fiscal"), isLoading: false });
    }
  },

  fetchContactReport: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/api/v1/reports/contacts", { params: toParams(get().filters) });
      set({ contactReport: data.contacts as ContactReportRow[], isLoading: false });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener el reporte de contactos"), isLoading: false });
    }
  },

  fetchExpenseReport: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/api/v1/reports/expenses", { params: toParams(get().filters) });
      set({ expenseReport: data as ExpenseReport, isLoading: false });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener el reporte de gastos"), isLoading: false });
    }
  },

  fetchCashRegisterReport: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/api/v1/reports/cash_register", { params: toParams(get().filters) });
      set({ cashRegisterReport: data as CashRegisterReport, isLoading: false });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener el reporte de caja"), isLoading: false });
    }
  },

  fetchSalesRepReport: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/api/v1/reports/sales_reps", { params: toParams(get().filters) });
      set({ salesRepReport: data.sales_reps as SalesRepRow[], isLoading: false });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener el reporte de vendedores"), isLoading: false });
    }
  },
}));
