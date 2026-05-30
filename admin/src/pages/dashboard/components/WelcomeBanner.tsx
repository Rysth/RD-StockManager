import { Card, CardContent } from "@/components/ui/card";
import { Clock, LayoutDashboard } from "lucide-react";

interface WelcomeBannerProps {
  fullname: string | undefined;
}

export function WelcomeBanner({ fullname }: WelcomeBannerProps) {
  return (
    <Card className="overflow-hidden border-none bg-gradient-to-br from-primary via-primary/90 to-primary/75 text-primary-foreground shadow-md">
      <CardContent className="py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="hidden rounded-xl bg-white/15 p-2.5 backdrop-blur-sm sm:block">
              <LayoutDashboard className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Bienvenido, {fullname ?? "Usuario"}
              </h1>
              <p className="mt-1 text-sm text-primary-foreground/80">
                Aquí tienes un resumen general del sistema
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-primary-foreground/80 backdrop-blur-sm">
            <Clock className="size-4" />
            Última actualización: ahora
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
