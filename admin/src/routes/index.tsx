import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import PosLayout from "../layouts/PosLayout";
import Dashboard from "../pages/dashboard/Dashboard";
import UsersIndex from "../pages/dashboard/users/UsersIndex";
import BusinessSettings from "../pages/dashboard/business/BusinessSettings";
import ProductsIndex from "../pages/dashboard/products/ProductsIndex";
import CustomersIndex from "../pages/dashboard/customers/CustomersIndex";
import SalesIndex from "../pages/dashboard/sales/SalesIndex";
import SalesPosIndex from "../pages/dashboard/sales/SalesPosIndex";
import PurchaseEntryIndex from "../pages/dashboard/purchases/PurchaseEntryIndex";
import QuotationsIndex from "../pages/dashboard/quotations/QuotationsIndex";
import BrandsIndex from "../pages/dashboard/brands/BrandsIndex";
import LocationsIndex from "../pages/dashboard/locations/LocationsIndex";
import PurchasesIndex from "../pages/dashboard/purchases/PurchasesIndex";
import TransfersIndex from "../pages/dashboard/transfers/TransfersIndex";
import TransferPosIndex from "../pages/dashboard/transfers/TransferPosIndex";
import ExpensesIndex from "../pages/dashboard/expenses/ExpensesIndex";
import InvoicesIndex from "../pages/dashboard/invoices/InvoicesIndex";
import AdvancedReportsIndex from "../pages/dashboard/reports/AdvancedReportsIndex";
import AuthSignIn from "../pages/auth/AuthSignIn";
import AuthSignUp from "../pages/auth/AuthSignUp";
import AuthConfirm from "../pages/auth/AuthConfirm";
import AuthForgotPassword from "../pages/auth/AuthForgotPassword";
import AuthResetPassword from "../pages/auth/AuthResetPassword";
import AuthVerifyEmail from "../pages/auth/AuthVerifyEmail";
import ProtectedRoute from "../components/routing/ProtectedRoute";
import NotFound from "../pages/errors/NotFound";
import ErrorBoundary from "../components/errors/ErrorBoundary";
import { Permissions } from "../types/auth";
import { useAuthStore } from "../stores/authStore";
import { getDefaultAdminRoute } from "../utils/adminRoutes";

function RootIndexRedirect() {
  const { user, hasPermission, hasAnyPermission } = useAuthStore();

  return (
    <Navigate
      to={getDefaultAdminRoute({ user, hasPermission, hasAnyPermission })}
      replace
    />
  );
}

// Exportar la variable router para que pueda ser importada directamente
export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootIndexRedirect />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "auth",
    element: <AuthLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { path: "signin", element: <AuthSignIn /> },
      { path: "signup", element: <AuthSignUp /> },
      { path: "confirm", element: <AuthConfirm /> },
      { path: "verify-email", element: <AuthVerifyEmail /> },
      { path: "forgot-password", element: <AuthForgotPassword /> },
      { path: "reset-password", element: <AuthResetPassword /> },
      { path: "reset-password/:token", element: <AuthResetPassword /> },
    ],
  },
  {
    path: "identity",
    element: <AuthLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { path: "email_verification", element: <AuthVerifyEmail /> },
      { path: "reset_password", element: <AuthResetPassword /> },
    ],
  },
  {
    path: "dashboard",
    element: <PosLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        path: "pos",
        element: (
          <ProtectedRoute requiredPermission={Permissions.MANAGE_SALES}>
            <SalesPosIndex />
          </ProtectedRoute>
        ),
      },
      {
        path: "purchase-entry",
        element: (
          <ProtectedRoute requiredPermission={Permissions.VIEW_PURCHASES}>
            <PurchaseEntryIndex />
          </ProtectedRoute>
        ),
      },
      {
        path: "transfer-pos",
        element: (
          <ProtectedRoute requiredPermission={Permissions.VIEW_PURCHASES}>
            <TransferPosIndex />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "dashboard",
    element: <DashboardLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <Dashboard /> },
      {
        path: "users",
        element: (
          <ProtectedRoute requiredPermission={Permissions.VIEW_USERS}>
            <UsersIndex />
          </ProtectedRoute>
        ),
      },
      {
        path: "settings",
        element: (
          <ProtectedRoute
            requiredPermission={[
              Permissions.EDIT_PROFILE,
              Permissions.VIEW_BUSINESS,
            ]}
          >
            <BusinessSettings />
          </ProtectedRoute>
        ),
      },
      {
        path: "products",
        element: (
          <ProtectedRoute requiredPermission={Permissions.VIEW_INVENTORY}>
            <ProductsIndex />
          </ProtectedRoute>
        ),
      },
      {
        path: "customers",
        element: (
          <ProtectedRoute requiredPermission={Permissions.MANAGE_CUSTOMERS}>
            <CustomersIndex />
          </ProtectedRoute>
        ),
      },
      {
        path: "sales",
        element: (
          <ProtectedRoute requiredPermission={Permissions.MANAGE_SALES}>
            <SalesIndex />
          </ProtectedRoute>
        ),
      },
      {
        path: "quotations",
        element: (
          <ProtectedRoute requiredPermission={Permissions.MANAGE_QUOTATIONS}>
            <QuotationsIndex />
          </ProtectedRoute>
        ),
      },
      {
        path: "brands",
        element: (
          <ProtectedRoute requiredPermission={Permissions.MANAGE_PRODUCTS}>
            <BrandsIndex />
          </ProtectedRoute>
        ),
      },
      {
        path: "locations",
        element: (
          <ProtectedRoute requiredPermission={Permissions.MANAGE_LOCATIONS}>
            <LocationsIndex />
          </ProtectedRoute>
        ),
      },
      {
        path: "purchases",
        element: (
          <ProtectedRoute requiredPermission={Permissions.VIEW_PURCHASES}>
            <PurchasesIndex />
          </ProtectedRoute>
        ),
      },
      {
        path: "transfers",
        element: (
          <ProtectedRoute requiredPermission={Permissions.VIEW_PURCHASES}>
            <TransfersIndex />
          </ProtectedRoute>
        ),
      },
      {
        path: "expenses",
        element: (
          <ProtectedRoute requiredPermission={Permissions.VIEW_EXPENSES}>
            <ExpensesIndex />
          </ProtectedRoute>
        ),
      },
      {
        path: "invoices",
        element: (
          <ProtectedRoute requiredPermission={Permissions.MANAGE_INVOICING}>
            <InvoicesIndex />
          </ProtectedRoute>
        ),
      },
      {
        path: "reports",
        element: (
          <ProtectedRoute requiredPermission={Permissions.VIEW_REPORTS}>
            <AdvancedReportsIndex />
          </ProtectedRoute>
        ),
      },
      // El home (/dashboard) muestra los Reportes de ventas (ver Dashboard.tsx)
      // Add more dashboard routes here
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}
