import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { Permissions } from "../../types/auth";
import ReportsIndex from "./reports/ReportsIndex";

// El panel principal (home) ahora son los Reportes de ventas.
// Los usuarios sin permiso de reportes (p. ej. business_employee) se redirigen
// a la pantalla de ventas, que sí pueden usar.
export default function Dashboard() {
  const { hasPermission } = useAuthStore();

  if (!hasPermission(Permissions.VIEW_REPORTS)) {
    return <Navigate to="/dashboard/sales" replace />;
  }

  return <ReportsIndex />;
}
