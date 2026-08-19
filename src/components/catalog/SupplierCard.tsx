import { Link } from "@tanstack/react-router";
import { BadgeCheck, Building2, MapPin, Star } from "lucide-react";
import { fa, faNumber } from "@/lib/format";
import { BUSINESS_TYPES, labelOf } from "@/lib/constants";

export type SupplierCardData = {
  id: string;
  company_name: string;
  city: string | null;
  business_type: string | null;
  verification_status: string | null;
  rating: number | null;
  deals_count?: number | null;
  founded_year?: number | null;
  logo_url?: string | null;
};

export function SupplierCard({ supplier }: { supplier: SupplierCardData }) {
  return (
    <Link
      to="/suppliers/$id"
      params={{ id: supplier.id }}
      className="flex gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary text-muted-foreground">
        {supplier.logo_url ? (
          <img src={supplier.logo_url} alt={supplier.company_name} className="size-full object-cover" loading="lazy" />
        ) : (
          <Building2 className="size-6" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <h3 className="truncate text-sm font-bold">{supplier.company_name}</h3>
          {supplier.verification_status === "verified" && <BadgeCheck className="size-4 shrink-0 text-primary" />}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {labelOf(BUSINESS_TYPES, supplier.business_type)}
          {supplier.founded_year ? ` · از سال ${fa(supplier.founded_year)}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {supplier.city && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {supplier.city}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Star className="size-3.5 fill-accent text-accent" />
            {fa((supplier.rating ?? 0).toFixed(1))}
          </span>
          {typeof supplier.deals_count === "number" && <span>{faNumber(supplier.deals_count)} معامله</span>}
        </div>
      </div>
    </Link>
  );
}
