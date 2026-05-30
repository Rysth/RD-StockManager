import { useEffect } from "react";
import { useAuthStore } from "../../stores/authStore";
import { useDashboardStore } from "../../stores/dashboardStore";
import { Skeleton } from "@/components/ui/skeleton";
import { WelcomeBanner } from "./components/WelcomeBanner";
import { StatsCards } from "./components/StatsCards";
import { ChartsTrendRow } from "./components/ChartsTrendRow";
import { ChartsDistributionRow } from "./components/ChartsDistributionRow";
import { RecentUsersTable } from "./components/RecentUsersTable";

// ── Helpers ───────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("es");
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Justo ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days}d`;
}

// ── Skeleton Loader ──────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {["skel-users", "skel-verified", "skel-rate", "skel-today"].map(
          (id) => (
            <Skeleton key={id} className="h-36 rounded-xl" />
          ),
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuthStore();
  const {
    stats,
    rolesDistribution,
    accountStatuses,
    registrationTrend,
    recentUsers,
    isLoading,
    error,
    fetchDashboard,
  } = useDashboardStore();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (isLoading && !stats) return <DashboardSkeleton />;

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-destructive text-lg font-semibold">
          Error al cargar el dashboard
        </div>
        <p className="text-muted-foreground text-sm">{error}</p>
        <button
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          onClick={fetchDashboard}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!stats) return null;

  // Prepare chart data
  const trendChartData = registrationTrend.map((t) => ({
    date: t.date,
    Total: t.total,
    Verificados: t.verified,
  }));

  const roleChartData = rolesDistribution.map((r) => ({
    name: r.name,
    value: r.count,
  }));

  const statusChartData = accountStatuses.map((s) => ({
    name: s.label,
    value: s.count,
  }));

  const growthPositive = stats.growth_percentage >= 0;

  return (
    <div className="space-y-6">
      <WelcomeBanner fullname={user?.fullname} />

      <StatsCards stats={stats} formatNumber={formatNumber} />

      <ChartsTrendRow
        trendChartData={trendChartData}
        growthPositive={growthPositive}
        growthPercentage={stats.growth_percentage}
      />

      <ChartsDistributionRow
        roleChartData={roleChartData}
        statusChartData={statusChartData}
        accountStatuses={accountStatuses}
        totalUsers={stats.total_users}
        totalRoles={stats.total_roles}
      />

      <RecentUsersTable
        recentUsers={recentUsers}
        usersThisMonth={stats.users_this_month}
        timeAgo={timeAgo}
      />
    </div>
  );
}
