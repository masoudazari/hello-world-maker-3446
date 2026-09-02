import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PanelShell } from "@/components/layout/PanelShell";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth";
import { faDate, toman } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/reference-prices")({
  head: () => ({
    meta: [
      { title: "قیمت‌های مرجع | عمده‌یار" },
      { name: "description", content: "مدیریت قیمت‌های تقریبی مرجع برای کالاهای پرتکرار." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminReferencePrices,
});

type RefPrice = {
  id: string;
  product_name: string;
  brand: string | null;
  unit: string;
  approx_price: number;
  price_range_min: number | null;
  price_range_max: number | null;
  note: string | null;
  updated_at: string;
};

const emptyForm = {
  product_name: "",
  brand: "",
  unit: "عدد",
  approx_price: "",
  price_range_min: "",
  price_range_max: "",
  note: "",
};

function AdminReferencePrices() {
  const { data: account } = useAccount();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<RefPrice | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: rows = [] } = useQuery({
    queryKey: ["admin-reference-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reference_prices")
        .select("id, product_name, brand, unit, approx_price, price_range_min, price_range_max, note, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RefPrice[];
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(row: RefPrice) {
    setEditing(row);
    setForm({
      product_name: row.product_name,
      brand: row.brand ?? "",
      unit: row.unit,
      approx_price: String(row.approx_price),
      price_range_min: row.price_range_min ? String(row.price_range_min) : "",
      price_range_max: row.price_range_max ? String(row.price_range_max) : "",
      note: row.note ?? "",
    });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.product_name.trim()) throw new Error("نام کالا الزامی است.");
      if (!form.approx_price || Number(form.approx_price) <= 0) throw new Error("قیمت تقریبی نامعتبر است.");
      const payload = {
        product_name: form.product_name.trim(),
        brand: form.brand.trim() || null,
        unit: form.unit || "عدد",
        approx_price: Number(form.approx_price),
        price_range_min: form.price_range_min ? Number(form.price_range_min) : null,
        price_range_max: form.price_range_max ? Number(form.price_range_max) : null,
        note: form.note.trim() || null,
        updated_by: account?.userId ?? null,
      };
      const { error } = editing
        ? await supabase.from("reference_prices").update(payload).eq("id", editing.id)
        : await supabase.from("reference_prices").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editing ? "قیمت مرجع به‌روزرسانی شد." : "قیمت مرجع جدید ثبت شد.");
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-reference-prices"] });
    },
    onError: (err: Error) => toast.error(err.message || "ثبت ناموفق بود."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reference_prices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("حذف شد.");
      void queryClient.invalidateQueries({ queryKey: ["admin-reference-prices"] });
    },
  });

  return (
    <PanelShell
      role="admin"
      title="قیمت‌های مرجع"
      subtitle="قیمت تقریبی کالاهای پرتکرار که به‌عنوان پیش‌فرض/مرجع در سایت نمایش داده می‌شود. این عدد تخمینی است، نه قیمت لحظه‌ای بازار."
      action={
        <Button onClick={openCreate}>
          <Plus className="ml-2 h-4 w-4" /> قیمت مرجع جدید
        </Button>
      }
    >
      {rows.length === 0 ? (
        <EmptyState title="هنوز قیمت مرجعی ثبت نشده" />
      ) : (
        <div className="rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>کالا</TableHead>
                <TableHead>برند</TableHead>
                <TableHead>قیمت تقریبی</TableHead>
                <TableHead>بازه</TableHead>
                <TableHead>آخرین به‌روزرسانی</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.product_name}</TableCell>
                  <TableCell>{r.brand || "—"}</TableCell>
                  <TableCell>
                    {toman(r.approx_price)} / {r.unit}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.price_range_min && r.price_range_max
                      ? `${toman(r.price_range_min)} تا ${toman(r.price_range_max)}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{faDate(r.updated_at)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش قیمت مرجع" : "قیمت مرجع جدید"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="mb-2 block text-xs">نام کالا</Label>
              <Input
                value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                placeholder="مثلاً: نوشابه قوطی 330cc"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-2 block text-xs">برند</Label>
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="کوکاکولا" />
              </div>
              <div>
                <Label className="mb-2 block text-xs">واحد</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="mb-2 block text-xs">قیمت تقریبی (تومان)</Label>
              <Input
                type="number"
                value={form.approx_price}
                onChange={(e) => setForm({ ...form, approx_price: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-2 block text-xs">کف بازه (اختیاری)</Label>
                <Input
                  type="number"
                  value={form.price_range_min}
                  onChange={(e) => setForm({ ...form, price_range_min: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-2 block text-xs">سقف بازه (اختیاری)</Label>
                <Input
                  type="number"
                  value={form.price_range_max}
                  onChange={(e) => setForm({ ...form, price_range_max: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="mb-2 block text-xs">یادداشت</Label>
              <Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "در حال ذخیره…" : "ذخیره"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PanelShell>
  );
}
