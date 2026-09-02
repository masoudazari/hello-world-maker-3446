import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Repeat, Sparkles } from "lucide-react";
import { PanelShell } from "@/components/layout/PanelShell";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth";
import { faNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/buyer/reorder")({
  head: () => ({
    meta: [
      { title: "سفارش مجدد | عمده‌یار" },
      { name: "description", content: "بر اساس عادت خرید شما، آنچه معمولاً سفارش می‌دهید را دوباره ثبت کنید." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BuyerReorder,
});

type EditableItem = {
  key: string;
  productName: string;
  brand?: string | null;
  unit: string;
  quantity: number;
  meta: string; // helper line, e.g. "هر ۲۰ روز یک‌بار" or "تخفیف ویژه"
  selected: boolean;
};

function BuyerReorder() {
  const { data: account } = useAccount();
  const userId = account?.userId ?? null;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"usual" | "suggested">("usual");
  const [items, setItems] = useState<Record<string, EditableItem>>({});

  const { data: patterns = [], isLoading: loadingPatterns } = useQuery({
    queryKey: ["buyer-reorder-patterns", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buyer_reorder_patterns")
        .select("product_name, unit, order_count, typical_quantity, avg_interval_days, last_ordered_at")
        .eq("buyer_id", userId!)
        .order("order_count", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: suggestions = [], isLoading: loadingSuggestions } = useQuery({
    queryKey: ["promoted-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promoted_listings")
        .select("id, title, brand, suggested_quantity, unit, note")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const usualItems: EditableItem[] = useMemo(
    () =>
      patterns.map((p) => ({
        key: `usual:${p.product_name}`,
        productName: p.product_name ?? "",
        unit: p.unit ?? "عدد",
        quantity: Number(p.typical_quantity),
        meta: p.avg_interval_days
          ? `معمولاً هر ${faNumber(p.avg_interval_days)} روز · ${faNumber(p.order_count)} سفارش قبلی`
          : `${faNumber(p.order_count)} سفارش قبلی`,
        selected: true,
      })),
    [patterns],
  );

  const suggestedItems: EditableItem[] = useMemo(
    () =>
      suggestions.map((s) => ({
        key: `sugg:${s.id}`,
        productName: s.title,
        brand: s.brand,
        unit: s.unit ?? "عدد",
        quantity: Number(s.suggested_quantity ?? 1),
        meta: s.note ?? "پیشنهاد عمده‌یار",
        selected: false,
      })),
    [suggestions],
  );

  const visibleItems = mode === "usual" ? usualItems : suggestedItems;

  function currentItem(base: EditableItem): EditableItem {
    return items[base.key] ?? base;
  }

  function updateItem(base: EditableItem, patch: Partial<EditableItem>) {
    setItems((prev) => ({ ...prev, [base.key]: { ...currentItem(base), ...patch } }));
  }

  const submit = useMutation({
    mutationFn: async () => {
      const selected = visibleItems.map(currentItem).filter((i) => i.selected && i.quantity > 0);
      if (selected.length === 0) throw new Error("حداقل یک کالا را انتخاب کنید.");
      const rows = selected.map((i) => ({
        buyer_id: userId,
        product_name: i.brand ? `${i.productName} (${i.brand})` : i.productName,
        quantity: i.quantity,
        unit: i.unit,
        description: mode === "usual" ? "ثبت خودکار از سفارش مجدد بر اساس خرید قبلی" : "ثبت از پیشنهادهای عمده‌یار",
      }));
      const { error } = await supabase.from("purchase_requests").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      toast.success(`${faNumber(count)} درخواست خرید جدید ثبت شد.`);
      void queryClient.invalidateQueries({ queryKey: ["buyer-dashboard"] });
      void navigate({ to: "/buyer/requests" });
    },
    onError: (error: Error) => toast.error(error.message || "ثبت درخواست ناموفق بود."),
  });

  const isLoading = mode === "usual" ? loadingPatterns : loadingSuggestions;

  return (
    <PanelShell
      role="buyer"
      title="سفارش مجدد"
      subtitle="بر اساس سابقه خرید شما یا پیشنهادهای عمده‌یار، به‌سرعت درخواست خرید جدید ثبت کنید."
    >
      <Tabs value={mode} onValueChange={(v) => setMode(v as "usual" | "suggested")}>
        <TabsList>
          <TabsTrigger value="usual">
            <Repeat className="ml-2 h-4 w-4" /> خرید معمول من
          </TabsTrigger>
          <TabsTrigger value="suggested">
            <Sparkles className="ml-2 h-4 w-4" /> پیشنهادهای عمده‌یار
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>
        ) : visibleItems.length === 0 ? (
          <EmptyState
            title={mode === "usual" ? "هنوز الگوی خرید تکراری شناسایی نشده" : "در حال حاضر پیشنهادی فعال نیست"}
            description={mode === "usual" ? "پس از چند سفارش مشابه، این بخش به‌طور خودکار تکمیل می‌شود." : undefined}
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>نوع کالا</TableHead>
                  {mode === "suggested" && <TableHead>برند</TableHead>}
                  <TableHead>تعداد</TableHead>
                  <TableHead>واحد</TableHead>
                  <TableHead>{mode === "usual" ? "بازه خرید" : "توضیح پیشنهاد"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleItems.map((base) => {
                  const item = currentItem(base);
                  return (
                    <TableRow key={base.key}>
                      <TableCell>
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={(v) => updateItem(base, { selected: Boolean(v) })}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      {mode === "suggested" && <TableCell>{item.brand || "—"}</TableCell>}
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          className="w-24"
                          value={item.quantity}
                          onChange={(e) => updateItem(base, { quantity: Number(e.target.value) || 0 })}
                        />
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.meta}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex justify-end p-4">
              <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
                {submit.isPending ? "در حال ثبت…" : "ثبت درخواست خرید برای اقلام انتخاب‌شده"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </PanelShell>
  );
}
