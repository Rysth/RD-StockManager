import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "../stores/authStore";
import { useBusinessStore } from "../stores/businessStore";
import logo from "../assets/rysth_logo.png";
import { getDefaultAdminRoute } from "../utils/adminRoutes";
import { BarChart3, PackageCheck, ReceiptText, Warehouse } from "lucide-react";

export default function AuthLayout() {
  const { user, hasPermission, hasAnyPermission } = useAuthStore();
  const location = useLocation();
  const { publicBusiness, fetchPublicBusiness } = useBusinessStore();
  const businessName = publicBusiness?.name || "StockManager";
  const businessLogo = publicBusiness?.logo_url || null;
  const defaultRoute = getDefaultAdminRoute({
    user,
    hasPermission,
    hasAnyPermission,
  });

  useEffect(() => {
    if (!publicBusiness) {
      fetchPublicBusiness().catch(() => {});
    }
  }, [publicBusiness, fetchPublicBusiness]);

  useEffect(() => {
    document.body.classList.add("auth-theme");

    return () => {
      document.body.classList.remove("auth-theme");
    };
  }, []);

  const allowedWhileAuthenticated = [
    "/auth/reset-password",
    "/auth/verify-email",
    "/identity/email_verification",
  ];

  const isAllowed = allowedWhileAuthenticated.some((path) =>
    location.pathname.startsWith(path),
  );

  if (user && !isAllowed) {
    return <Navigate to={defaultRoute} replace />;
  }

  return (
    <div className="auth-theme grid w-full min-h-screen lg:overflow-y-hidden lg:grid-cols-2">
      {/* Left Side - Forms */}
      <div className="relative flex items-center justify-center bg-background p-8 sm:p-12 lg:p-8">
        {/* Subtle background decoration */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-primary/[0.03] blur-3xl" />

        <div className="relative z-10 mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[380px] md:w-[420px] lg:w-[450px]">
          {/* Mobile Logo */}
          <div className="mb-8 flex justify-center lg:hidden animate-fade-in-up">
            <Link
              to="/auth/signin"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                {businessLogo ? (
                  <img
                    src={businessLogo}
                    alt={`Logo ${businessName}`}
                    className="h-6 w-6 object-contain"
                  />
                ) : (
                  <img
                    src={logo}
                    alt="Logo"
                    className="h-6 w-6 brightness-0 invert"
                  />
                )}
              </div>
              <span className="text-xl font-bold">{businessName}</span>
            </Link>
          </div>

          {/* Form content with entrance animation */}
          <div className="animate-fade-in-up-delay-1">
            <Outlet />
          </div>

          <div className="mt-6 animate-fade-in-up-delay-2 text-center text-sm text-muted-foreground lg:hidden">
            Creado por{" "}
            <a
              href="https://rysthdesign.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary transition-colors hover:underline underline-offset-4"
            >
              RysthDesign
            </a>
          </div>
        </div>
      </div>

      {/* Right Side - Branding & Visuals */}
      <div className="relative hidden h-screen flex-col overflow-hidden p-8 text-white lg:flex">
        {/* Base background */}
        <div className="absolute inset-0 bg-[oklch(0.14_0.06_265)]" />
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.13_0.07_265)] via-[oklch(0.18_0.05_270)] to-[oklch(0.14_0.06_265)]" />

        {/* Dot grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Animated gradient blobs */}
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-teal-500/20 blur-3xl animate-float" />
        <div className="absolute right-0 top-1/2 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl animate-float-delay" />
        <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl animate-float-slow" />

        {/* Pulse ring decoration */}
        <div className="absolute right-20 top-1/4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border border-white/10 animate-pulse-ring" />
          </div>
        </div>

        {/* Header - Logo */}
        <div className="relative z-20 flex items-center justify-end text-lg font-medium">
          <Link
            to="/auth/signin"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <div className="flex items-center justify-center rounded-xl bg-white/10 p-2 backdrop-blur-sm">
              {businessLogo ? (
                <img
                  src={businessLogo}
                  alt={`Logo ${businessName}`}
                  className="h-5 w-5 object-contain"
                />
              ) : (
                <img src={logo} alt="Logo" className="h-5 w-5" />
              )}
            </div>
            <span className="font-semibold tracking-tight">{businessName}</span>
          </Link>
        </div>

        {/* Center content */}
        <div className="relative z-20 flex flex-1 flex-col items-end justify-center gap-5">
          {/* Tagline */}
          <div className="max-w-md space-y-2 text-right">
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-white/95">
              Controla inventario, ventas y facturacion de forma{" "}
              <span className="bg-gradient-to-r from-teal-300 to-emerald-300 bg-clip-text text-transparent">
                profesional
              </span>
            </h2>
            <p className="text-sm leading-relaxed text-white/50">
              StockManager by RysthDesign centraliza POS, compras, gastos, reportes y facturacion electronica SRI.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="grid max-w-md grid-cols-2 gap-2.5">
            {[
              {
                icon: PackageCheck,
                title: "Inventario",
                desc: "Stock por sucursal y variantes",
              },
              { icon: Warehouse, title: "Operacion", desc: "POS, compras y gastos" },
              {
                icon: ReceiptText,
                title: "SRI",
                desc: "XML autorizado y RIDE",
              },
              { icon: BarChart3, title: "Reportes", desc: "Caja, impuestos y ventas" },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 backdrop-blur-sm transition-all duration-300 hover:border-white/10 hover:bg-white/[0.06]"
              >
                <div className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400/20 to-emerald-400/20">
                  <feature.icon className="h-3.5 w-3.5 text-teal-300/80" />
                </div>
                <p className="text-sm font-semibold text-white/90">
                  {feature.title}
                </p>
                <p className="mt-0 text-[11px] leading-relaxed text-white/40">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-20 flex justify-end">
          <div className="mb-3 h-px w-full bg-gradient-to-l from-transparent via-white/10 to-transparent" />
          <p className="text-sm text-white/30 text-right">
            Creado por{" "}
            <a
              href="https://rysthdesign.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-white/60 transition-colors hover:text-white/90 hover:underline underline-offset-4"
            >
              RysthDesign
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
