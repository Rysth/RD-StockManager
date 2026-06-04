import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useMemo } from "react";
import {
  Home,
  Users,
  Settings,
  SlidersHorizontal,
  LogOut,
  ChevronsUpDown,
  ChevronRight,
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
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

interface NavSectionConfig {
  label: string;
  icon: LucideIcon;
  items: NavItemConfig[];
}

// Helper function to get user initials
const getInitials = (fullname: string): string => {
  if (!fullname) return "U";

  const names = fullname.trim().split(" ");
  if (names.length >= 2) {
    return `${names[0][0]}${names[1][0]}`.toUpperCase();
  }
  return names[0].substring(0, 2).toUpperCase();
};

// Active-state classes shared by nav menu buttons
const activeMenuClasses =
  "relative transition-colors data-[active=true]:bg-sidebar-primary/15 data-[active=true]:font-medium data-[active=true]:text-sidebar-primary-foreground data-[active=true]:before:absolute data-[active=true]:before:bottom-1.5 data-[active=true]:before:left-0 data-[active=true]:before:top-1.5 data-[active=true]:before:w-1 data-[active=true]:before:rounded-r-full data-[active=true]:before:bg-sidebar-primary";

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

  const showStoreGroup =
    canViewInventory ||
    canManageProducts ||
    canManageCustomers ||
    canManageSales ||
    canManageQuotations ||
    canViewReports ||
    canManageLocations ||
    canViewPurchases ||
    canViewExpenses ||
    canManageInvoicing;
  // Fetch business data so we can show logo + name (cached in store)
  const { fetchPublicBusiness, publicBusiness } = useBusinessStore();
  const { isMobile, state } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";

  // Helper function to check if a menu item is active
  const isActiveRoute = (to: string, end?: boolean) => {
    if (end) {
      return location.pathname === to;
    }
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

  const isSettingsSectionActive = useMemo(
    () =>
      location.pathname.startsWith("/dashboard/settings") ||
      location.pathname.startsWith("/dashboard/users"),
    [location.pathname],
  );
  const isPurchaseEntryActive = location.pathname.startsWith(
    "/dashboard/purchase-entry",
  );
  const isPosActive = location.pathname.startsWith("/dashboard/pos");
  const storeSections: NavSectionConfig[] = [
    {
      label: "Catálogo",
      icon: Package2,
      items: [
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
      ],
    },
    {
      label: "Operaciones",
      icon: ShoppingBag,
      items: [
        {
          label: "Ingreso de Mercadería",
          to: "/dashboard/purchase-entry",
          icon: PackagePlus,
          active: isPurchaseEntryActive,
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
          label: "Punto de Venta",
          to: "/dashboard/pos",
          icon: ShoppingBag,
          active: isPosActive,
          visible: canManageSales,
        },
        {
          label: "Ventas",
          to: "/dashboard/sales",
          icon: ShoppingCart,
          active: isActiveRoute("/dashboard/sales"),
          visible: canManageSales,
        },
      ],
    },
    {
      label: "Administración",
      icon: BarChart3,
      items: [
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
      ],
    },
  ]
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.visible),
    }))
    .filter((section) => section.items.length > 0);

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
        {!isBusinessEmployee && (
          <SidebarGroup>
            <SidebarGroupLabel>Navegación</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Dashboard"
                    isActive={isActiveRoute("/dashboard", true)}
                    className={activeMenuClasses}
                  >
                    <NavLink to="/dashboard" end>
                      <Home />
                      <span>Dashboard</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* When collapsed: dropdown menu so sub-items remain accessible */}
                {isCollapsed ? (
                  <SidebarMenuItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                          tooltip="Configuración"
                          className={activeMenuClasses}
                          isActive={isSettingsSectionActive}
                        >
                          <Settings />
                          <span>Configuración</span>
                          <ChevronRight className="ml-auto size-4" />
                        </SidebarMenuButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side="right"
                        align="start"
                        sideOffset={4}
                        className="min-w-48 rounded-lg"
                      >
                        <DropdownMenuLabel>Configuración</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <NavLink
                            to="/dashboard/settings"
                            className="flex items-center gap-2"
                          >
                            <SlidersHorizontal className="size-4" />
                            General
                          </NavLink>
                        </DropdownMenuItem>
                        {canManageUsers ? (
                          <DropdownMenuItem asChild>
                            <NavLink
                              to="/dashboard/users"
                              className="flex items-center gap-2"
                            >
                              <Users className="size-4" />
                              Usuarios
                            </NavLink>
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                ) : (
                  /* When expanded: collapsible with smooth animation */
                  <Collapsible
                    asChild
                    defaultOpen={isSettingsSectionActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip="Configuración"
                          className={activeMenuClasses}
                          isActive={isSettingsSectionActive}
                        >
                          <Settings />
                          <span>Configuración</span>
                          <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActiveRoute("/dashboard/settings")}
                            >
                              <NavLink to="/dashboard/settings">
                                <SlidersHorizontal />
                                <span>General</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          {canManageUsers ? (
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isActiveRoute("/dashboard/users")}
                              >
                                <NavLink to="/dashboard/users">
                                  <Users />
                                  <span>Usuarios</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ) : null}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {showStoreGroup && (
          <SidebarGroup>
            <SidebarGroupLabel>Tienda</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {storeSections.map((section) => {
                  const sectionActive = section.items.some((item) => item.active);
                  const SectionIcon = section.icon;

                  return isCollapsed ? (
                    <SidebarMenuItem key={section.label}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuButton
                            tooltip={section.label}
                            className={activeMenuClasses}
                            isActive={sectionActive}
                          >
                            <SectionIcon />
                            <span>{section.label}</span>
                            <ChevronRight className="ml-auto size-4" />
                          </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          side="right"
                          align="start"
                          sideOffset={4}
                          className="min-w-56 rounded-lg"
                        >
                          <DropdownMenuLabel>{section.label}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {section.items.map((item) => {
                            const ItemIcon = item.icon;
                            return (
                              <DropdownMenuItem key={item.to} asChild>
                                <NavLink
                                  to={item.to}
                                  className="flex items-center gap-2"
                                >
                                  <ItemIcon className="size-4" />
                                  {item.label}
                                </NavLink>
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuItem>
                  ) : (
                    <Collapsible
                      key={section.label}
                      asChild
                      defaultOpen={sectionActive}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={section.label}
                            className={activeMenuClasses}
                            isActive={sectionActive}
                          >
                            <SectionIcon />
                            <span>{section.label}</span>
                            <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {section.items.map((item) => {
                              const ItemIcon = item.icon;
                              return (
                                <SidebarMenuSubItem key={item.to}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={item.active}
                                  >
                                    <NavLink to={item.to}>
                                      <ItemIcon />
                                      <span>{item.label}</span>
                                    </NavLink>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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
                side={isMobile ? "bottom" : "right"}
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
