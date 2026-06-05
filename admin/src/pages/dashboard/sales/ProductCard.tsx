import type { ReactNode } from "react";
import { ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  name: string;
  brand?: string | null;
  thumb?: string;
  icon?: ReactNode;
  badge: string;
  price: string;
  priceSuffix?: string;
  inCartCount: number;
  onClick: () => void;
}

export default function ProductCard({
  name,
  brand,
  thumb,
  icon,
  badge,
  price,
  priceSuffix,
  inCartCount,
  onClick,
}: ProductCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex h-[260px] flex-col overflow-hidden rounded-xl border bg-card text-left transition-all hover:border-primary hover:shadow-md sm:h-[270px]"
    >
      <div className="relative h-36 w-full shrink-0 overflow-hidden bg-muted sm:h-40">
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className="h-full w-full bg-white object-contain p-2"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
            {icon ?? <ImageIcon className="h-10 w-10" />}
          </div>
        )}
        <Badge
          variant="secondary"
          className="absolute left-1.5 top-1.5 bg-background/85 text-foreground backdrop-blur-sm text-[10px]"
        >
          {badge}
        </Badge>
        {inCartCount > 0 && (
          <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
            {inCartCount}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2.5">
        <p className="line-clamp-2 text-sm font-medium leading-tight">{name}</p>
        {brand && <p className="truncate text-[11px] text-muted-foreground">{brand}</p>}
        <p className="mt-auto pt-1 font-semibold text-primary">
          {price}
          {priceSuffix && (
            <span className="ml-1 text-[10px] font-normal text-muted-foreground">
              {priceSuffix}
            </span>
          )}
        </p>
      </div>
    </button>
  );
}
