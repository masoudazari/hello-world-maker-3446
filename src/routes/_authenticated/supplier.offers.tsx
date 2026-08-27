import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PanelShell } from "@/components/layout/PanelShell";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RequestOfferChat } from "@/components/rfq/RequestOfferChat";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth";
import { faDate, faNumber, toman } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/supplier/offers")({
  head: () => ({
    meta: [
      { title: "پیشنهادهای من | عمده‌یار" },
      { name: "description", content: "وضعیت پیشنهادهای قیمت ارسال‌شده به خریداران عمده." },
      { property: "og:title", content: "پیشنهادهای قیمت من" },
      { property: "og:description", content: "پیگیری پذیرش یا رد پیشنهادهای ارسالی و مذاکره با خریدار." },
    ],
  }),
  component: SupplierOffers,
});

type OfferRow = {
  id: string;
  request_id: string;
  unit_price: number;
  total_price: number;
  available_quantity: number;
  shipping_cost: number;
  payment_terms: string | null;
  preparation_time: string | null;
  shipping_time: string | null;
  description: string | null;
  status: string;
  created_at: string;
  purchase_requests: { product_name: string; unit: string; delivery_city: string } | null;
};

function SupplierOffers() {
  const { data: account } = useAccount();
  const supplierId = account?.supplierId ?? null;
  const [openChatId, setOpenChatId] = useState<string | null>(null);

  const { data: offers = [] } = useQuery({
    queryKey: ["supplier-offers", supplierId],
    enabled: Boolean(supplierId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_offers")
        .select(
          "id, request_id, unit_price, total_price, available_quantity, shipping_cost, payment_terms, preparation_time, shipping_time, description, status, created_at, purchase_requests(product_name, unit, delivery_city)",
        )
        .eq("supplier_id", supplierId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OfferRow[];
    },
  });

  return (
    <PanelShell role="supplier" title="پیشنهادهای من" subtitle="همه پیشنهادهای قیمتی که ارسال کرده‌اید">
      {offers.length === 0 ? (
        <EmptyState title="پیشنهادی ثبت نشده" description="از بخش فرصت‌های فروش، اولین پیشنهاد خود را ارسال کنید." />
      ) : (
        <div className="grid gap-3">
          {offers.map((o) => (
            <div key={o.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{o.purchase_requests?.product_name ?? "—"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    تحویل در {o.purchase_requests?.delivery_city ?? "—"} · {faDate(o.created_at)}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-lg font-extrabold text-primary">{toman(o.unit_price)}</p>
                  <p className="text-xs text-muted-foreground">قیمت واحد</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-4">
                <span>مبلغ کل: {toman(o.total_price)}</span>
                <span>موجودی: {faNumber(o.available_quantity)} {o.purchase_requests?.unit}</span>
                <span>هزینه حمل: {toman(o.shipping_cost)}</span>
                <span>شرایط پرداخت: {o.payment_terms || "—"}</span>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <StatusBadge kind="offer" value={o.status} />
                <div className="flex items-center gap-2">
                  {o.status === "pending" && <EditOfferDialog offer={o} />}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpenChatId(openChatId === o.id ? null : o.id)}
                  >
                    {openChatId === o.id ? "بستن مذاکره" : "مذاکره با خریدار"}
                  </Button>
                </div>
              </div>

              {openChatId === o.id && supplierId && account?.userId && (
                <div className="mt-4">
                  <RequestOfferChat requestId={o.request_id} supplierId={supplierId} currentUserId={account.userId} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

function EditOfferDialog({ offer }: { offer: OfferRow }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    unit_price: String(offer.unit_price),
    available_quantity: String(offer.available_quantity),
    shipping_cost: String(offer.shipping_cost),
    payment_terms: offer.payment_terms ?? "",
    description: offer.description ?? "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const unitPrice = Number(form.unit_price);
      const quantity = Number(form.available_quantity);
      if (!unitPrice || unitPrice <= 0) throw new Error("قیمت واحد نامعتبر است.");
      const { error } = await supabase
        .from("supplier_offers")
        .update({
          unit_price: unitPrice,
          total_price: unitPrice * quantity,
          available_quantity: quantity,
          shipping_cost: Number(form.shipping_cost) || 0,
          payment_terms: form.payment_terms || null,
          description: form.description || null,
        })
        .eq("id", offer.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("پیشنهاد به‌روزرسانی شد. نسخه جدید در تاریخچه ثبت شد.");
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["supplier-offers"] });
    },
    onError: (error: Error) => toast.error(error.message || "ویرایش پیشنهاد ناموفق بود."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          اصلاح پیشنهاد
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>اصلاح پیشنهاد برای «{offer.purchase_requests?.product_name}»</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="mb-2 block text-xs">قیمت واحد (تومان)</Label>
            <Input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
          </div>
          <div>
            <Label className="mb-2 block text-xs">موجودی قابل تأمین</Label>
            <Input
              type="number"
              value={form.available_quantity}
              onChange={(e) => setForm({ ...form, available_quantity: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-2 block text-xs">هزینه حمل (تومان)</Label>
            <Input type="number" value={form.shipping_cost} onChange={(e) => setForm({ ...form, shipping_cost: e.target.value })} />
          </div>
          <div>
            <Label className="mb-2 block text-xs">شرایط پرداخت</Label>
            <Input value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-2 block text-xs">توضیحات</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          نسخه قبلی این پیشنهاد در تاریخچه نگه‌داری می‌شود و روی فاکتورهای قبلی اثری ندارد.
        </p>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "در حال ذخیره…" : "ذخیره اصلاحات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
