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

interface ReportState {
  purchaseReport: PurchaseReport | null;
  taxReport: TaxReport | null;
  contactReport: ContactReportRow[] | null;
  expenseReport: ExpenseReport | null;
  cashRegisterReport: CashRegisterReport | null;
  salesRepReport: SalesRepRow[] | null;
  isLoading: boolean;
  error: string | null;

  fetchPurchaseReport: () => Promise<void>;
  fetchTaxReport: () => Promise<void>;
  fetchContactReport: () => Promise<void>;
  fetchExpenseReport: () => Promise<void>;
  fetchCashRegisterReport: () => Promise<void>;
  fetchSalesRepReport: () => Promise<void>;
}

export const useReportStore = create<ReportState>((set) => ({
  purchaseReport: null,
  taxReport: null,
  contactReport: null,
  expenseReport: null,
  cashRegisterReport: null,
  salesRepReport: null,
  isLoading: false,
  error: null,

  fetchPurchaseReport: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/api/v1/reports/purchases");
      set({ purchaseReport: data as PurchaseReport, isLoading: false });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener el reporte de compras"), isLoading: false });
    }
  },

  fetchTaxReport: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/api/v1/reports/taxes");
      set({ taxReport: data as TaxReport, isLoading: false });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener el reporte fiscal"), isLoading: false });
    }
  },

  fetchContactReport: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/api/v1/reports/contacts");
      set({ contactReport: data.contacts as ContactReportRow[], isLoading: false });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener el reporte de contactos"), isLoading: false });
    }
  },

  fetchExpenseReport: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/api/v1/reports/expenses");
      set({ expenseReport: data as ExpenseReport, isLoading: false });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener el reporte de gastos"), isLoading: false });
    }
  },

  fetchCashRegisterReport: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/api/v1/reports/cash_register");
      set({ cashRegisterReport: data as CashRegisterReport, isLoading: false });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener el reporte de caja"), isLoading: false });
    }
  },

  fetchSalesRepReport: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/api/v1/reports/sales_reps");
      set({ salesRepReport: data.sales_reps as SalesRepRow[], isLoading: false });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener el reporte de vendedores"), isLoading: false });
    }
  },
}));
