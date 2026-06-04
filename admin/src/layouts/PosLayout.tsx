import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useEffect, useState } from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import LogoutModal from "../components/shared/LogoutModal";
import AppSidebar from "../components/navigation/AppSidebar";
import { Permissions } from "../types/auth";
import { getDefaultAdminRoute } from "../utils/adminRoutes";

export default function PosLayout() {
  const { user, hasPermission, hasAnyPermission } = useAuthStore();
  const location = useLocation();
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add("dashboard-theme");
    return () => {
      document.body.classList.remove("dashboard-theme");
    };
  }, []);

  const hasAccess = hasAnyPermission(
    Permissions.VIEW_DASHBOARD,
    Permissions.VIEW_USERS,
    Permissions.VIEW_BUSINESS,
    Permissions.EDIT_PROFILE,
    Permissions.VIEW_INVENTORY,
    Permissions.MANAGE_CUSTOMERS,
    Permissions.MANAGE_SALES,
    Permissions.VIEW_REPORTS,
  );
  const canManageUsers = hasPermission(Permissions.VIEW_USERS);
  const storePermissions = {
    canViewInventory: hasPermission(Permissions.VIEW_INVENTORY),
    canManageProducts: hasPermission(Permissions.MANAGE_PRODUCTS),
    canManageCustomers: hasPermission(Permissions.MANAGE_CUSTOMERS),
    canManageSales: hasPermission(Permissions.MANAGE_SALES),
    canManageQuotations: hasPermission(Permissions.MANAGE_QUOTATIONS),
    canViewReports: hasPermission(Permissions.VIEW_REPORTS),
    canManageLocations: hasPermission(Permissions.MANAGE_LOCATIONS),
    canViewPurchases: hasPermission(Permissions.VIEW_PURCHASES),
    canViewExpenses: hasPermission(Permissions.VIEW_EXPENSES),
    canManageInvoicing: hasPermission(Permissions.MANAGE_INVOICING),
  };
  const defaultRoute = getDefaultAdminRoute({
    user,
    hasPermission,
    hasAnyPermission,
  });

  const isPos = location.pathname.startsWith("/dashboard/pos");
  const breadcrumbPage = isPos ? "Punto de Venta" : "Ingreso de Mercadería";

  if (!user) return <Navigate to="/auth/signin" />;
  if (!hasAccess) return <Navigate to={defaultRoute} replace />;

  return (
    <div className="dashboard-theme h-svh overflow-hidden">
      <SidebarProvider className="h-full">
        <AppSidebar
          user={user}
          canManageUsers={canManageUsers}
          storePermissions={storePermissions}
          setLogoutModalOpen={setLogoutModalOpen}
        />
        <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border/50 bg-card/85 px-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70 md:h-16 md:px-6">
            <SidebarTrigger className="-ml-1 size-9 md:size-8" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <span className="truncate text-base font-semibold md:hidden">
              {breadcrumbPage}
            </span>
            <Breadcrumb className="hidden md:flex">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Tienda</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{breadcrumbPage}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          {/* Full-height container — POS pages manage their own internal scroll */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <Outlet />
          </div>
        </SidebarInset>
        <LogoutModal
          isOpen={logoutModalOpen}
          onClose={() => setLogoutModalOpen(false)}
        />
      </SidebarProvider>
    </div>
  );
}
