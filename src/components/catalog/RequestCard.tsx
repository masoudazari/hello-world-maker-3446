import { Link } from "@tanstack/react-router";
import { CalendarClock, MapPin, MessageSquareQuote } from "lucide-react";
import { faNumber, timeAgo } from "@/lib/format";
import { StatusBadge } from "@/components/common/StatusBadge";

export type RequestCardData = {
  id: string;
  product_name: string;
  quantity: number | null;
  unit: string | null;
  delivery_city: string | null;
  offers_count?: number | null;
  created_at: string | null;
  status?: string | null;
  description?: string | null;
  categories?: { name: string } | null;
};

export function RequestCard({ request }: { request: RequestCardData }) {
  return (
    <Link
      to="/purchase-requests/$id"
      params={{ id: request.id }}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold leading-6">{request.product_name}</h3>
        {request.status && <StatusBadge kind="request" value={request.status} />}
      </div>
      {request.description && (
        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{request.description}</p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {faNumber(request.quantity ?? 0)} {request.unit ?? ""}
        </span>
        {request.delivery_city && (
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" />
            {request.delivery_city}
          </span>
        )}
        <span className="flex items-center gap-1">
          <MessageSquareQuote className="size-3.5" />
          {faNumber(request.offers_count ?? 0)} پیشنهاد
        </span>
        <span className="flex items-center gap-1">
          <CalendarClock className="size-3.5" />
          {timeAgo(request.created_at)}
        </span>
      </div>
    </Link>
  );
}
