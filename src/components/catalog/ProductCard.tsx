import { Link } from "@tanstack/react-router";
import { BadgeCheck, MapPin, Package } from "lucide-react";
import { fa, faNumber, toman } from "@/lib/format";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  base_price: number | null;
  unit: string | null;
  minimum_order: number | null;
  city: string | null;
  image_url: string | null;
  stock?: number | null;
  suppliers?: { company_name: string; verification_status?: string | null } | null;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link
      to="/products/$slug"
      params={{ slug: product.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-4/3 overflow-hidden bg-secondary">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Package className="size-8" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-bold leading-6">{product.name}</h3>
        {product.suppliers && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {product.suppliers.verification_status === "verified" && (
              <BadgeCheck className="size-3.5 text-primary" />
            )}
            {product.suppliers.company_name}
          </p>
        )}
        <div className="mt-auto space-y-1 pt-2">
          <p className="text-base font-extrabold text-primary">{toman(product.base_price)}</p>
          <p className="text-xs text-muted-foreground">
            حداقل سفارش: {faNumber(product.minimum_order ?? 0)} {product.unit ?? ""}
          </p>
          {product.city && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              {product.city}
            </p>
          )}
          {typeof product.stock === "number" && (
            <p className="text-xs text-muted-foreground">
              موجودی: {product.stock > 0 ? fa(faNumber(product.stock)) : "ناموجود"}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
