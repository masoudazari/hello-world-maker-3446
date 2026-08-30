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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth";
import { CITIES, UNITS } from "@/lib/constants";
import { faNumber, slugify, toman } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/supplier/products")({
  head: () => ({
    meta: [
      { title: "محصولات من | عمده‌یار" },
      { name: "description", content: "افزودن و مدیریت محصولات عمده فروشگاه شما." },
      { property: "og:title", content: "مدیریت محصولات عمده" },
      { property: "og:description", content: "کالاهای خود را با قیمت و حداقل سفارش ثبت کنید." },
    ],
  }),
  component: SupplierProducts,
});

function SupplierProducts() {
  const { data: account } = useAccount();
  const supplierId = account?.supplierId ?? null;

  const { data: products = [] } = useQuery({
    queryKey: ["supplier-products", supplierId],
    enabled: Boolean(supplierId),
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, base_price, unit, minimum_order, stock, status, city")
        .eq("supplier_id", supplierId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: marketStats = [] } = useQuery({
    queryKey: ["product-market-stats", supplierId],
    enabled: Boolean(supplierId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_market_stats")
        .select("product_id, sample_count, market_min, market_avg, market_max, includes_mock_data")
        .eq("supplier_id", supplierId!);
      if (error) throw error;
      return data ?? [];
    },
  });
  const marketByProduct = new Map(marketStats.map((m) => [m.product_id, m]));

  return (
    <PanelShell
      role="supplier"
      title="محصولات من"
      subtitle="محصولات پس از ثبت بلافاصله در فهرست عمومی نمایش داده می‌شوند."
      action={supplierId ? <ProductDialog supplierId={supplierId} /> : null}
    >
      {!supplierId ? (
        <EmptyState title="ابتدا پروفایل فروشگاه را تکمیل کنید" />
      ) : products.length === 0 ? (
        <EmptyState title="محصولی ثبت نشده" description="اولین کالای عمده خود را اضافه کنید." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-right text-sm">
            <thead className="bg-secondary/50 text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">نام کالا</th>
                <th className="p-3 font-medium">قیمت پایه</th>
                <th className="p-3 font-medium">حداقل سفارش</th>
                <th className="p-3 font-medium">موجودی</th>
                <th className="p-3 font-medium">شهر</th>
                <th className="p-3 font-medium">وضعیت</th>
                <th className="p-3 font-medium">وضعیت بازار</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => {
                const stat = marketByProduct.get(p.id);
                return (
                <tr key={p.id}>
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3">{toman(p.base_price)}</td>
                  <td className="p-3">{faNumber(p.minimum_order)} {p.unit}</td>
                  <td className="p-3">{faNumber(p.stock)}</td>
                  <td className="p-3">{p.city}</td>
                  <td className="p-3"><StatusBadge kind="product" value={p.status} /></td>
                  <td className="p-3 text-xs">
                    {!stat || Number(stat.sample_count) === 0 ? (
                      <span className="text-muted-foreground">داده کافی نیست</span>
                    ) : (
                      <span
                        className={
                          p.base_price < Number(stat.market_avg) * 0.9
                            ? "text-emerald-600"
                            : p.base_price > Number(stat.market_avg) * 1.1
                              ? "text-red-500"
                              : "text-muted-foreground"
                        }
                      >
                        {p.base_price < Number(stat.market_avg) * 0.9
                          ? "رقابتی"
                          : p.base_price > Number(stat.market_avg) * 1.1
                            ? "بالاتر از بازار"
                            : "نزدیک به بازار"}{" "}
                        (میانگین بازار: {toman(Number(stat.market_avg))}
                        {stat.includes_mock_data ? "، شامل داده Mock" : ""})
                      </span>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PanelShell>
  );
}

function ProductDialog({ supplierId }: { supplierId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category_id: "",
    brand: "",
    unit: "عدد",
    minimum_order: "1",
    stock: "0",
    city: "تهران",
    base_price: "",
    description: "",
    image_url: "",
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-flat"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("sort_order");
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("نام کالا الزامی است.");
      const { error } = await supabase.from("products").insert({
        supplier_id: supplierId,
        category_id: form.category_id || null,
        name: form.name.trim(),
        slug: `${slugify(form.name)}-${Math.random().toString(36).slice(2, 7)}`,
        brand: form.brand || null,
        unit: form.unit,
        minimum_order: Number(form.minimum_order) || 1,
        stock: Number(form.stock) || 0,
        city: form.city,
        base_price: Number(form.base_price) || 0,
        description: form.description || null,
        image_url: form.image_url || null,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("محصول ثبت شد و در انتظار تأیید است.");
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["supplier-products"] });
    },
    onError: (error: Error) => toast.error(error.message || "ثبت محصول ناموفق بود."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>افزودن محصول</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>افزودن محصول جدید</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="mb-2 block text-xs">نام کالا</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label className="mb-2 block text-xs">دسته‌بندی</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block text-xs">برند</Label>
            <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </div>
          <div>
            <Label className="mb-2 block text-xs">قیمت پایه (تومان)</Label>
            <Input type="number" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} />
          </div>
          <div>
            <Label className="mb-2 block text-xs">واحد</Label>
            <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block text-xs">حداقل سفارش</Label>
            <Input type="number" value={form.minimum_order} onChange={(e) => setForm({ ...form, minimum_order: e.target.value })} />
          </div>
          <div>
            <Label className="mb-2 block text-xs">موجودی</Label>
            <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
          <div>
            <Label className="mb-2 block text-xs">شهر</Label>
            <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CITIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block text-xs">آدرس تصویر</Label>
            <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://" dir="ltr" />
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-2 block text-xs">توضیحات</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "در حال ثبت…" : "ثبت محصول"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
