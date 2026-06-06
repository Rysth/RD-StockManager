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
      className="group relative flex h-[180px] flex-col overflow-hidden rounded-xl border bg-card text-left transition-all hover:border-primary hover:shadow-md sm:h-[190px]"
    >
      <div className="relative h-24 w-full shrink-0 overflow-hidden bg-muted sm:h-28">
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className="h-full w-full bg-white object-contain p-1.5"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
            {icon ?? <ImageIcon className="h-8 w-8" />}
          </div>
        )}
        <Badge
          variant="secondary"
          className="absolute left-1 top-1 bg-background/85 text-foreground backdrop-blur-sm text-[9px] px-1.5 py-0"
        >
          {badge}
        </Badge>
        {inCartCount > 0 && (
          <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {inCartCount}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2">
        <p className="line-clamp-2 text-xs font-medium leading-tight">{name}</p>
        {brand && <p className="truncate text-[10px] text-muted-foreground">{brand}</p>}
        <p className="mt-auto pt-0.5 text-xs font-semibold text-primary">
          {price}
          {priceSuffix && (
            <span className="ml-1 text-[9px] font-normal text-muted-foreground">
              {priceSuffix}
            </span>
          )}
        </p>
      </div>
    </button>
  );
}
