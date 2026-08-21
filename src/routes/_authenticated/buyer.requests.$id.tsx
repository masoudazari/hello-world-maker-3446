import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PanelShell } from "@/components/layout/PanelShell";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth";
import { labelOf, QUALITY_LEVELS, TIMEFRAMES } from "@/lib/constants";
import { faDate, faNumber, toman } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/buyer/requests/$id")({
  head: () => ({
    meta: [
      { title: "پیشنهادهای دریافتی | عمده‌یار" },
      { name: "description", content: "مقایسه پیشنهادهای قیمت تأمین‌کنندگان برای درخواست خرید عمده." },
      { property: "og:title", content: "پیشنهادهای دریافتی" },
      { property: "og:description", content: "بهترین پیشنهاد قیمت را انتخاب و سفارش را نهایی کنید." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BuyerRequestDetail,
});

function BuyerRequestDetail() {
  const { id } = useParams({ from: "/_authenticated/buyer/requests/$id" });
  const { data: account } = useAccount();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["buyer-request", id],
    queryFn: async () => {
      const [request, offers] = await Promise.all([
        supabase
          .from("purchase_requests")
          .select("id, product_name, quantity, unit, quality, delivery_city, required_date, min_price, max_price, description, status, offers_count, created_at")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("supplier_offers")
          .select(
            "id, unit_price, total_price, available_quantity, preparation_time, shipping_time, shipping_cost, payment_terms, description, status, created_at, suppliers(id, company_name, city, rating, verification_status)",
          )
          .eq("request_id", id)
          .order("unit_price", { ascending: true }),
      ]);
      return { request: request.data, offers: offers.data ?? [] };
    },
  });

  const accept = useMutation({
    mutationFn: async (offer: { id: string; supplier: string; total: number; quantity: number }) => {
      if (!account?.userId) throw new Error("ابتدا وارد شوید.");
      const { error: orderError } = await supabase.from("orders").insert({
        buyer_id: account.userId,
        supplier_id: offer.supplier,
        request_id: id,
        offer_id: offer.id,
        quantity: offer.quantity,
        total_amount: offer.total,
        status: "pending_payment",
      });
      if (orderError) throw orderError;
      await supabase.from("supplier_offers").update({ status: "accepted" }).eq("id", offer.id);
      await supabase.from("supplier_offers").update({ status: "rejected" }).eq("request_id", id).neq("id", offer.id);
      await supabase.from("purchase_requests").update({ status: "accepted" }).eq("id", id);
    },
    onSuccess: () => {
      toast.success("پیشنهاد پذیرفته شد و سفارش ایجاد گردید.");
      void queryClient.invalidateQueries({ queryKey: ["buyer-request", id] });
      void queryClient.invalidateQueries({ queryKey: ["buyer-dashboard"] });
    },
    onError: (error: Error) => toast.error(error.message || "ثبت سفارش ناموفق بود."),
  });

  const request = data?.request;

  return (
    <PanelShell
      role="buyer"
      title={request?.product_name ?? "درخواست خرید"}
      subtitle={request ? `${faNumber(Number(request.quantity))} ${request.unit} · تحویل در ${request.delivery_city}` : undefined}
      action={request ? <StatusBadge kind="request" value={request.status} /> : null}
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>
      ) : !request ? (
        <EmptyState title="درخواست پیدا نشد" />
      ) : (
        <>
          <div className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="کیفیت" value={labelOf(QUALITY_LEVELS, request.quality)} />
            <Info label="زمان نیاز" value={labelOf(TIMEFRAMES, request.required_date)} />
            <Info
              label="بودجه"
              value={request.min_price || request.max_price ? `${toman(request.min_price)} تا ${toman(request.max_price)}` : "توافقی"}
            />
            <Info label="تاریخ ثبت" value={faDate(request.created_at)} />
            {request.description && (
              <p className="text-sm leading-7 text-muted-foreground sm:col-span-2 lg:col-span-4">{request.description}</p>
            )}
          </div>

          <h2 className="mt-8 mb-3 text-sm font-bold">پیشنهادهای دریافتی ({faNumber(data?.offers.length ?? 0)})</h2>
          {(data?.offers.length ?? 0) === 0 ? (
            <EmptyState
              title="هنوز پیشنهادی ثبت نشده"
              description="به‌محض ارسال پیشنهاد توسط تأمین‌کنندگان، همین‌جا نمایش داده می‌شود."
            />
          ) : (
            <div className="grid gap-3">
              {data!.offers.map((offer) => (
                <div key={offer.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{offer.suppliers?.company_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {offer.suppliers?.city} · امتیاز {faNumber(Number(offer.suppliers?.rating ?? 0))}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-extrabold text-primary">{toman(offer.unit_price)}</p>
                      <p className="text-xs text-muted-foreground">قیمت واحد</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-4">
                    <span>موجودی: {faNumber(Number(offer.available_quantity))} {request.unit}</span>
                    <span>آماده‌سازی: {offer.preparation_time || "—"}</span>
                    <span>ارسال: {offer.shipping_time || "—"}</span>
                    <span>شرایط پرداخت: {offer.payment_terms || "—"}</span>
                  </div>
                  {offer.description && <p className="mt-3 text-sm leading-7">{offer.description}</p>}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <span className="text-sm">
                      مبلغ کل: <strong>{toman(offer.total_price || offer.unit_price * Number(request.quantity))}</strong>
                      {offer.shipping_cost ? ` + ${toman(offer.shipping_cost)} حمل` : ""}
                    </span>
                    <div className="flex items-center gap-2">
                      <StatusBadge kind="offer" value={offer.status} />
                      {offer.status === "pending" && request.status !== "accepted" && (
                        <Button
                          size="sm"
                          disabled={accept.isPending}
                          onClick={() =>
                            accept.mutate({
                              id: offer.id,
                              supplier: offer.suppliers!.id,
                              total: offer.total_price || offer.unit_price * Number(request.quantity),
                              quantity: Number(request.quantity),
                            })
                          }
                        >
                          پذیرش پیشنهاد
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </PanelShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
