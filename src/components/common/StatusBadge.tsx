import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  labelOf,
  OFFER_STATUSES,
  ORDER_STATUSES,
  PRODUCT_STATUSES,
  REQUEST_STATUSES,
  VERIFICATION_STATUSES,
} from "@/lib/constants";

type Kind = "request" | "offer" | "order" | "product" | "verification";

const MAP: Record<Kind, { options: typeof REQUEST_STATUSES; tone: Record<string, string> }> = {
  request: {
    options: REQUEST_STATUSES,
    tone: {
      pending: "bg-secondary text-secondary-foreground",
      matching: "bg-primary/10 text-primary",
      offers_received: "bg-accent/25 text-accent-foreground",
      buyer_reviewing: "bg-accent/25 text-accent-foreground",
      accepted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      closed: "bg-muted text-muted-foreground",
    },
  },
  offer: {
    options: OFFER_STATUSES,
    tone: {
      pending: "bg-accent/25 text-accent-foreground",
      accepted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      rejected: "bg-destructive/15 text-destructive",
    },
  },
  order: {
    options: ORDER_STATUSES,
    tone: {
      pending_payment: "bg-accent/25 text-accent-foreground",
      processing: "bg-primary/10 text-primary",
      shipped: "bg-primary/15 text-primary",
      completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      cancelled: "bg-destructive/15 text-destructive",
    },
  },
  product: {
    options: PRODUCT_STATUSES,
    tone: {
      pending_review: "bg-accent/25 text-accent-foreground",
      active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      rejected: "bg-destructive/15 text-destructive",
      disabled: "bg-muted text-muted-foreground",
    },
  },
  verification: {
    options: VERIFICATION_STATUSES,
    tone: {
      pending: "bg-accent/25 text-accent-foreground",
      verified: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      rejected: "bg-destructive/15 text-destructive",
      suspended: "bg-destructive/15 text-destructive",
    },
  },
};

export function StatusBadge({
  kind,
  value,
  className,
}: {
  kind: Kind;
  value: string | null | undefined;
  className?: string;
}) {
  const conf = MAP[kind];
  const tone = (value && conf.tone[value]) || "bg-secondary text-secondary-foreground";
  return (
    <Badge variant="secondary" className={cn("border-0 font-medium", tone, className)}>
      {labelOf(conf.options, value)}
    </Badge>
  );
}
