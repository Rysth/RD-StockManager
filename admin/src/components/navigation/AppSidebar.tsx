import { NavLink, useLocation } from "react-router-dom";
import { useEffect } from "react";
import {
  Home,
  Users,
  Settings,
  SlidersHorizontal,
  LogOut,
  ChevronsUpDown,
  Package2,
  PackagePlus,
  ShoppingBag,
  ShoppingCart,
  Users2,
  Tags,
  Warehouse,
  Truck,
  Receipt,
  BarChart3,
  FileText,
  FileSignature,
  ArrowRightLeft,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useBusinessStore } from "../../stores/businessStore";
import type { User } from "../../types/auth";
import logo from "../../assets/logo.svg";

interface StorePermissions {
  canViewInventory: boolean;
  canManageProducts: boolean;
  canManageCustomers: boolean;
  canManageSales: boolean;
  canManageQuotations: boolean;
  canViewReports: boolean;
  canManageLocations: boolean;
  canViewPurchases: boolean;
  canViewExpenses: boolean;
  canManageInvoicing: boolean;
}

interface AppSidebarProps {
  user: User;
  canManageUsers: boolean;
  storePermissions: StorePermissions;
  setLogoutModalOpen: (open: boolean) => void;
}

interface NavItemConfig {
  label: string;
  to: string;
  icon: LucideIcon;
  active: boolean;
  visible: boolean;
}

const getInitials = (fullname: string): string => {
  if (!fullname) return "U";
  const names = fullname.trim().split(" ");
  if (names.length >= 2) {
    return `${names[0][0]}${names[1][0]}`.toUpperCase();
  }
  return names[0].substring(0, 2).toUpperCase();
};

const activeMenuClasses =
  "transition-colors rounded-md data-[active=true]:bg-sidebar-foreground/10 data-[active=true]:font-medium data-[active=true]:text-sidebar-foreground";

export default function AppSidebar({
  user,
  canManageUsers,
  storePermissions,
  setLogoutModalOpen,
}: AppSidebarProps) {
  const {
    canViewInventory,
    canManageProducts,
    canManageCustomers,
    canManageSales,
    canManageQuotations,
    canViewReports,
    canManageLocations,
    canViewPurchases,
    canViewExpenses,
    canManageInvoicing,
  } = storePermissions;
  const isBusinessEmployee = user.roles?.includes("business_employee");

  const { fetchPublicBusiness, publicBusiness } = useBusinessStore();
  const location = useLocation();

  const isActiveRoute = (to: string, end?: boolean) => {
    if (end) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await fetchPublicBusiness();
      } catch {
        // silent fail
      }
    };
    load();
  }, [fetchPublicBusiness]);

  const dashboardItems: NavItemConfig[] = [
    {
      label: "Dashboard",
      to: "/dashboard",
      icon: Home,
      active: isActiveRoute("/dashboard", true),
      visible: !isBusinessEmployee,
    },
  ].filter((i) => i.visible);

  const catalogItems: NavItemConfig[] = [
    {
      label: "Contactos",
      to: "/dashboard/customers",
      icon: Users2,
      active: isActiveRoute("/dashboard/customers"),
      visible: canManageCustomers && !isBusinessEmployee,
    },
    {
      label: "Marcas y Categorías",
      to: "/dashboard/brands",
      icon: Tags,
      active: isActiveRoute("/dashboard/brands"),
      visible: canManageProducts && !isBusinessEmployee,
    },
    {
      label: "Inventario",
      to: "/dashboard/products",
      icon: Package2,
      active: isActiveRoute("/dashboard/products"),
      visible: canViewInventory,
    },
    {
      label: "Ubicaciones",
      to: "/dashboard/locations",
      icon: Warehouse,
      active: isActiveRoute("/dashboard/locations"),
      visible: canManageLocations && !isBusinessEmployee,
    },
  ].filter((i) => i.visible);

  const operationsItems: NavItemConfig[] = [
    {
      label: "Ingreso de Mercadería",
      to: "/dashboard/purchase-entry",
      icon: PackagePlus,
      active: isActiveRoute("/dashboard/purchase-entry"),
      visible: canViewPurchases && !isBusinessEmployee,
    },
    {
      label: "Compras",
      to: "/dashboard/purchases",
      icon: Truck,
      active: isActiveRoute("/dashboard/purchases"),
      visible: canViewPurchases && !isBusinessEmployee,
    },
    {
      label: "Transferencias",
      to: "/dashboard/transfers",
      icon: ArrowRightLeft,
      active: isActiveRoute("/dashboard/transfers"),
      visible: canViewPurchases,
    },
    {
      label: "Punto de Venta",
      to: "/dashboard/pos",
      icon: ShoppingBag,
      active: isActiveRoute("/dashboard/pos"),
      visible: canManageSales,
    },
    {
      label: "Ventas",
      to: "/dashboard/sales",
      icon: ShoppingCart,
      active: isActiveRoute("/dashboard/sales"),
      visible: canManageSales,
    },
  ].filter((i) => i.visible);

  const adminItems: NavItemConfig[] = [
    {
      label: "Cotizaciones",
      to: "/dashboard/quotations",
      icon: FileSignature,
      active: isActiveRoute("/dashboard/quotations"),
      visible: canManageQuotations,
    },
    {
      label: "Facturas",
      to: "/dashboard/invoices",
      icon: FileText,
      active: isActiveRoute("/dashboard/invoices"),
      visible: canManageInvoicing && !isBusinessEmployee,
    },
    {
      label: "Gastos",
      to: "/dashboard/expenses",
      icon: Receipt,
      active: isActiveRoute("/dashboard/expenses"),
      visible: canViewExpenses && !isBusinessEmployee,
    },
    {
      label: "Informes",
      to: "/dashboard/reports",
      icon: BarChart3,
      active: isActiveRoute("/dashboard/reports"),
      visible: canViewReports && !isBusinessEmployee,
    },
  ].filter((i) => i.visible);

  const settingsItems: NavItemConfig[] = [
    {
      label: "Configuración",
      to: "/dashboard/settings",
      icon: SlidersHorizontal,
      active: isActiveRoute("/dashboard/settings"),
      visible: !isBusinessEmployee,
    },
    {
      label: "Usuarios",
      to: "/dashboard/users",
      icon: Users,
      active: isActiveRoute("/dashboard/users"),
      visible: canManageUsers && !isBusinessEmployee,
    },
  ].filter((i) => i.visible);

  const groups = [catalogItems, operationsItems, adminItems, settingsItems];

  const renderItems = (items: NavItemConfig[]) =>
    items.map((item) => {
      const Icon = item.icon;
      return (
        <SidebarMenuItem key={item.to}>
          <SidebarMenuButton
            asChild
            tooltip={item.label}
            isActive={item.active}
            className={activeMenuClasses}
          >
            <NavLink to={item.to}>
              <Icon />
              <span>{item.label}</span>
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to="/dashboard">
                <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-sidebar-primary/15 ring-1 ring-sidebar-primary/30">
                  {publicBusiness?.logo_url ? (
                    <img
                      src={publicBusiness.logo_url}
                      alt={`Logo ${publicBusiness?.name || "MicroBiz"}`}
                      className="size-5 object-contain"
                    />
                  ) : (
                    <img src={logo} alt="Logo" className="size-5" />
                  )}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {publicBusiness?.name || "MicroBiz"}
                  </span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    Dashboard
                  </span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderItems(dashboardItems)}

              {groups.map((group, index) => {
                if (group.length === 0) return null;
                const prevGroupsHaveItems = [
                  dashboardItems,
                  ...groups.slice(0, index),
                ].some((g) => g.length > 0);
                return (
                  <div key={index}>
                    {prevGroupsHaveItems && <SidebarSeparator className="my-1" />}
                    {renderItems(group)}
                  </div>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="rounded-md transition-colors data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg ring-1 ring-sidebar-border">
                    <AvatarFallback className="rounded-lg bg-sidebar-primary/20 text-sidebar-primary-foreground">
                      {getInitials(user.fullname)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user.fullname}
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      @{user.username}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="right"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">
                        {getInitials(user.fullname)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user.fullname}
                      </span>
                      <span className="truncate text-xs">{user.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setLogoutModalOpen(true)}
                  className="flex items-center gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="size-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
