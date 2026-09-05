import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { PanelShell } from "@/components/layout/PanelShell";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth";
import {
  labelOf,
  PAYMENT_TERM_OPTIONS,
  paymentTermLabel,
  QUALITY_LEVELS,
  TIMEFRAMES,
  withSurcharge,
} from "@/lib/constants";
import { faNumber, timeAgo, toman } from "@/lib/format";
import { matchesQuery } from "@/lib/bilingual-search";

export const Route = createFileRoute("/_authenticated/supplier/requests")({
  head: () => ({
    meta: [
      { title: "فرصت‌های فروش عمده | عمده‌یار" },
      { name: "description", content: "درخواست‌های باز خریداران عمده و ثبت پیشنهاد قیمت." },
      { property: "og:title", content: "فرصت‌های فروش عمده" },
      { property: "og:description", content: "به درخواست خریداران قیمت بدهید و مشتری جدید بگیرید." },
    ],
  }),
  component: SupplierRequests,
});

type RequestRow = {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  quality: string;
  delivery_city: string;
  required_date: string;
  description: string | null;
  offers_count: number;
  created_at: string;
  category_id: string | null;
};

function SupplierRequests() {
  const { data: account } = useAccount();
  const supplierId = account?.supplierId ?? null;
  const [search, setSearch] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);

  const { data: myCategoryIds = [] } = useQuery({
    queryKey: ["supplier-category-ids", supplierId],
    enabled: Boolean(supplierId),
    queryFn: async () => {
      const { data } = await supabase.from("products").select("category_id").eq("supplier_id", supplierId!);
      return Array.from(new Set((data ?? []).map((p) => p.category_id).filter(Boolean))) as string[];
    },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["supplier-opportunities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("purchase_requests")
        .select(
          "id, product_name, quantity, unit, quality, delivery_city, required_date, description, offers_count, created_at, category_id",
        )
        .in("status", ["pending", "matching", "offers_received", "buyer_reviewing"])
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as RequestRow[];
    },
  });

  const visibleRequests = useMemo(() => {
    return requests.filter((r) => {
      // Only requests matching the supplier's own product categories are
      // shown by default — a soda wholesaler shouldn't have to wade
      // through requests for construction materials. Suppliers with no
      // products yet, or who explicitly ask to see everything, get the
      // unfiltered list.
      const categoryMatches =
        showAllCategories || myCategoryIds.length === 0 || (r.category_id && myCategoryIds.includes(r.category_id));
      if (!categoryMatches) return false;
      if (!search.trim()) return true;
      return matchesQuery(r.product_name, search) || matchesQuery(r.description, search);
    });
  }, [requests, myCategoryIds, showAllCategories, search]);

  const { data: myOfferIds = [] } = useQuery({
    queryKey: ["supplier-offer-ids", supplierId],
    enabled: Boolean(supplierId),
    queryFn: async () => {
      const { data } = await supabase.from("supplier_offers").select("request_id").eq("supplier_id", supplierId!);
      return (data ?? []).map((o) => o.request_id);
    },
  });

  return (
    <PanelShell role="supplier" title="فرصت‌های فروش" subtitle="درخواست‌های باز خریداران عمده">
      {!supplierId && (
        <div className="mb-4 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm">
          برای ارسال پیشنهاد ابتدا پروفایل فروشگاه خود را در بخش «پروفایل فروشگاه» تکمیل کنید.
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو (فارسی یا انگلیسی)، مثلاً: پپسی یا pepsi"
            className="pr-9"
          />
        </div>
        {myCategoryIds.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setShowAllCategories((v) => !v)}>
            {showAllCategories ? "فقط دسته‌های مرتبط با من" : "نمایش همه دسته‌بندی‌ها"}
          </Button>
        )}
      </div>
      {visibleRequests.length === 0 ? (
        <EmptyState title="درخواستی مطابق این فیلتر پیدا نشد" />
      ) : (
        <div className="grid gap-3">
          {visibleRequests.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{r.product_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {faNumber(Number(r.quantity))} {r.unit} · {labelOf(QUALITY_LEVELS, r.quality)} · تحویل در {r.delivery_city} ·{" "}
                    {labelOf(TIMEFRAMES, r.required_date)} · {timeAgo(r.created_at)}
                  </p>
                </div>
                <span className="rounded-lg bg-secondary px-2 py-1 text-xs">{faNumber(r.offers_count)} پیشنهاد</span>
              </div>
              {r.description && <p className="mt-3 text-sm leading-7 text-muted-foreground">{r.description}</p>}
              <div className="mt-4 border-t border-border pt-4">
                {myOfferIds.includes(r.id) ? (
                  <span className="text-xs text-muted-foreground">پیشنهاد شما برای این درخواست ثبت شده است.</span>
                ) : (
                  <OfferDialog request={r} supplierId={supplierId} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

function OfferDialog({ request, supplierId }: { request: RequestRow; supplierId: string | null }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    unit_price: "",
    available_quantity: String(request.quantity),
    preparation_time: "",
    shipping_time: "",
    shipping_cost: "",
    payment_term_code: "cash",
    payment_surcharge_percent: "0",
    description: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!supplierId) throw new Error("ابتدا پروفایل فروشگاه را تکمیل کنید.");
      const unitPrice = Number(form.unit_price);
      if (!unitPrice || unitPrice <= 0) throw new Error("قیمت واحد را وارد کنید.");
      const quantity = Number(form.available_quantity) || Number(request.quantity);
      const surcharge = Number(form.payment_surcharge_percent) || 0;
      const { error } = await supabase.from("supplier_offers").insert({
        request_id: request.id,
        supplier_id: supplierId,
        unit_price: unitPrice,
        total_price: withSurcharge(unitPrice * quantity, surcharge),
        available_quantity: quantity,
        preparation_time: form.preparation_time || null,
        shipping_time: form.shipping_time || null,
        shipping_cost: form.shipping_cost ? Number(form.shipping_cost) : 0,
        payment_term_code: form.payment_term_code,
        payment_surcharge_percent: surcharge,
        payment_terms: paymentTermLabel(form.payment_term_code),
        description: form.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("پیشنهاد شما برای خریدار ارسال شد.");
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["supplier-opportunities"] });
      void queryClient.invalidateQueries({ queryKey: ["supplier-offer-ids"] });
      void queryClient.invalidateQueries({ queryKey: ["supplier-offers"] });
    },
    onError: (error: Error) => toast.error(error.message || "ثبت پیشنهاد ناموفق بود."),
  });

  const baseTotal = (Number(form.unit_price) || 0) * (Number(form.available_quantity) || 0);
  const total = withSurcharge(baseTotal, Number(form.payment_surcharge_percent) || 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={!supplierId}>ثبت پیشنهاد قیمت</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>پیشنهاد قیمت برای «{request.product_name}»</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="mb-2 block text-xs">قیمت واحد (تومان)</Label>
            <Input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
          </div>
          <div>
            <Label className="mb-2 block text-xs">موجودی قابل تأمین</Label>
            <Input type="number" value={form.available_quantity} onChange={(e) => setForm({ ...form, available_quantity: e.target.value })} />
          </div>
          <div>
            <Label className="mb-2 block text-xs">زمان آماده‌سازی</Label>
            <Input value={form.preparation_time} onChange={(e) => setForm({ ...form, preparation_time: e.target.value })} placeholder="۳ روز کاری" />
          </div>
          <div>
            <Label className="mb-2 block text-xs">زمان ارسال</Label>
            <Input value={form.shipping_time} onChange={(e) => setForm({ ...form, shipping_time: e.target.value })} placeholder="۲ روز" />
          </div>
          <div>
            <Label className="mb-2 block text-xs">هزینه حمل (تومان)</Label>
            <Input type="number" value={form.shipping_cost} onChange={(e) => setForm({ ...form, shipping_cost: e.target.value })} />
          </div>
          <div>
            <Label className="mb-2 block text-xs">شرایط پرداخت</Label>
            <Select
              value={form.payment_term_code}
              onValueChange={(v) => {
                const option = PAYMENT_TERM_OPTIONS.find((o) => o.value === v);
                setForm({
                  ...form,
                  payment_term_code: v,
                  payment_surcharge_percent: String(option?.defaultSurcharge ?? 0),
                });
              }}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_TERM_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block text-xs">درصد اضافه‌بها برای این شرایط</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={form.payment_surcharge_percent}
              onChange={(e) => setForm({ ...form, payment_surcharge_percent: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-2 block text-xs">توضیحات</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter className="items-center justify-between gap-3 sm:justify-between">
          <span className="text-sm text-muted-foreground">
            مبلغ کل: {toman(total)}
            {total !== baseTotal ? ` (پایه ${toman(baseTotal)} + اضافه‌بهای پرداخت)` : ""}
          </span>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "در حال ارسال…" : "ارسال پیشنهاد"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
