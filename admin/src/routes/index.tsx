import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import Dashboard from "../pages/dashboard/Dashboard";
import UsersIndex from "../pages/dashboard/users/UsersIndex";
import BusinessSettings from "../pages/dashboard/business/BusinessSettings";
import ProductsIndex from "../pages/dashboard/products/ProductsIndex";
import CustomersIndex from "../pages/dashboard/customers/CustomersIndex";
import SalesIndex from "../pages/dashboard/sales/SalesIndex";
import ReportsIndex from "../pages/dashboard/reports/ReportsIndex";
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
        path: "reports",
        element: (
          <ProtectedRoute requiredPermission={Permissions.VIEW_REPORTS}>
            <ReportsIndex />
          </ProtectedRoute>
        ),
      },
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
