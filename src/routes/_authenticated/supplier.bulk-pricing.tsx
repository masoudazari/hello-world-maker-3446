import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PanelShell } from "@/components/layout/PanelShell";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth";
import { faNumber, toman } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/supplier/bulk-pricing")({
  head: () => ({
    meta: [
      { title: "مدیریت قیمت گروهی | عمده‌یار" },
      { name: "description", content: "تغییر همزمان قیمت چند محصول با پیش‌نمایش قبل از اعمال." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BulkPricing,
});

type Mode = "percent_increase" | "percent_decrease" | "fixed_increase" | "fixed_decrease" | "set_price";

const MODE_LABELS: Record<Mode, string> = {
  percent_increase: "افزایش درصدی",
  percent_decrease: "کاهش درصدی",
  fixed_increase: "افزایش مبلغ ثابت",
  fixed_decrease: "کاهش مبلغ ثابت",
  set_price: "تعیین قیمت مستقیم",
};

function computeNewPrice(oldPrice: number, mode: Mode, value: number): number {
  switch (mode) {
    case "percent_increase":
      return Math.max(0, Math.round(oldPrice * (1 + value / 100)));
    case "percent_decrease":
      return Math.max(0, Math.round(oldPrice * (1 - value / 100)));
    case "fixed_increase":
      return Math.max(0, oldPrice + Math.round(value));
    case "fixed_decrease":
      return Math.max(0, oldPrice - Math.round(value));
    case "set_price":
      return Math.max(0, Math.round(value));
  }
}

function BulkPricing() {
  const { data: account } = useAccount();
  const supplierId = account?.supplierId ?? null;
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>("percent_increase");
  const [value, setValue] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["supplier-products-bulk", supplierId],
    enabled: Boolean(supplierId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, base_price, unit")
        .eq("supplier_id", supplierId!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const numericValue = Number(value) || 0;

  const preview = useMemo(
    () =>
      products
        .filter((p) => selected.has(p.id))
        .map((p) => ({
          ...p,
          newPrice: computeNewPrice(p.base_price, mode, numericValue),
        })),
    [products, selected, mode, numericValue],
  );

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(products.map((p) => p.id)) : new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (selected.size === 0) throw new Error("حداقل یک محصول را انتخاب کنید.");
      if (numericValue <= 0 && mode !== "set_price") throw new Error("مقدار تغییر باید بزرگ‌تر از صفر باشد.");
      const { error } = await supabase.rpc("bulk_update_product_prices", {
        _product_ids: Array.from(selected),
        _mode: mode,
        _value: numericValue,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`قیمت ${faNumber(selected.size)} محصول با موفقیت به‌روزرسانی شد.`);
      setSelected(new Set());
      setValue("");
      void queryClient.invalidateQueries({ queryKey: ["supplier-products-bulk", supplierId] });
      void queryClient.invalidateQueries({ queryKey: ["supplier-products", supplierId] });
    },
    onError: (error: Error) => toast.error(error.message || "به‌روزرسانی قیمت ناموفق بود."),
  });

  return (
    <PanelShell
      role="supplier"
      title="مدیریت قیمت گروهی"
      subtitle="چند محصول را انتخاب کنید، نوع تغییر قیمت را مشخص کنید و پیش از اعمال، پیش‌نمایش را بررسی کنید."
    >
      {!supplierId ? (
        <EmptyState title="ابتدا پروفایل فروشگاه را تکمیل کنید" />
      ) : products.length === 0 ? (
        <EmptyState title="محصولی برای قیمت‌گذاری وجود ندارد" />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border p-3 text-sm">
              <Checkbox
                checked={selected.size === products.length && products.length > 0}
                onCheckedChange={(v) => toggleAll(Boolean(v))}
              />
              <span>انتخاب همه ({faNumber(products.length)} محصول)</span>
              <span className="mr-auto text-muted-foreground">{faNumber(selected.size)} انتخاب‌شده</span>
            </div>
            <div className="max-h-80 divide-y divide-border overflow-y-auto">
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-3 p-3 text-sm hover:bg-secondary/40">
                  <Checkbox checked={selected.has(p.id)} onCheckedChange={(v) => toggleOne(p.id, Boolean(v))} />
                  <span className="flex-1">{p.name}</span>
                  <span className="text-muted-foreground">{toman(p.base_price)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 font-semibold">نوع تغییر قیمت</p>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
                <label key={m} className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm">
                  <RadioGroupItem value={m} />
                  {MODE_LABELS[m]}
                </label>
              ))}
            </RadioGroup>
            <div className="mt-4 max-w-xs">
              <Label className="mb-2 block text-xs">
                {mode === "set_price" ? "قیمت جدید (تومان)" : mode.startsWith("percent") ? "درصد تغییر" : "مبلغ تغییر (تومان)"}
              </Label>
              <Input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
          </div>

          {preview.length > 0 && (
            <div className="rounded-2xl border border-border bg-card">
              <div className="border-b border-border p-3 font-semibold">پیش‌نمایش تغییرات</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>محصول</TableHead>
                    <TableHead>قیمت فعلی</TableHead>
                    <TableHead>تغییر</TableHead>
                    <TableHead>قیمت جدید</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{toman(p.base_price)}</TableCell>
                      <TableCell className={p.newPrice >= p.base_price ? "text-emerald-600" : "text-red-500"}>
                        {p.newPrice >= p.base_price ? "+" : ""}
                        {faNumber(p.newPrice - p.base_price)}
                      </TableCell>
                      <TableCell className="font-semibold">{toman(p.newPrice)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-end p-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={applyMutation.isPending}>اعمال تغییرات روی {faNumber(preview.length)} محصول</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>تأیید تغییر قیمت گروهی</AlertDialogTitle>
                      <AlertDialogDescription>
                        قیمت {faNumber(preview.length)} محصول تغییر می‌کند. این تغییر روی فاکتورهای قبلی اثری ندارد و در
                        تاریخچه قیمت هر محصول ثبت می‌شود. آیا مطمئن هستید؟
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>انصراف</AlertDialogCancel>
                      <AlertDialogAction onClick={() => applyMutation.mutate()}>تأیید و اعمال</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </div>
      )}
    </PanelShell>
  );
}
