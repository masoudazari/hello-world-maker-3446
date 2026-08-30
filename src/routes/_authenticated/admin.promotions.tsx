import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PanelShell } from "@/components/layout/PanelShell";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin/promotions")({
  head: () => ({
    meta: [
      { title: "پیشنهادهای تبلیغاتی | عمده‌یار" },
      { name: "description", content: "مدیریت محصولات و برندهای پیشنهادی نمایش‌داده‌شده به خریداران." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPromotions,
});

type Listing = {
  id: string;
  title: string;
  brand: string | null;
  suggested_quantity: number | null;
  unit: string | null;
  note: string | null;
  is_active: boolean;
};

function AdminPromotions() {
  const { data: account } = useAccount();
  const queryClient = useQueryClient();

  const { data: listings = [] } = useQuery({
    queryKey: ["admin-promoted-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promoted_listings")
        .select("id, title, brand, suggested_quantity, unit, note, is_active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Listing[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("promoted_listings").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-promoted-listings"] }),
  });

  return (
    <PanelShell
      role="admin"
      title="پیشنهادهای تبلیغاتی"
      subtitle="این موارد در بخش «پیشنهادهای عمده‌یار» صفحه سفارش مجدد خریداران نمایش داده می‌شود."
      action={<CreateListingDialog createdBy={account?.userId ?? null} />}
    >
      {listings.length === 0 ? (
        <EmptyState title="هنوز پیشنهادی ثبت نشده" />
      ) : (
        <div className="rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عنوان</TableHead>
                <TableHead>برند</TableHead>
                <TableHead>تعداد پیشنهادی</TableHead>
                <TableHead>توضیح</TableHead>
                <TableHead>فعال</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.title}</TableCell>
                  <TableCell>{l.brand || "—"}</TableCell>
                  <TableCell>
                    {l.suggested_quantity ?? "—"} {l.unit}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.note || "—"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={l.is_active}
                      onCheckedChange={(v) => toggleActive.mutate({ id: l.id, is_active: v })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PanelShell>
  );
}

function CreateListingDialog({ createdBy }: { createdBy: string | null }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", brand: "", suggested_quantity: "", unit: "عدد", note: "" });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("عنوان الزامی است.");
      const { error } = await supabase.from("promoted_listings").insert({
        title: form.title.trim(),
        brand: form.brand.trim() || null,
        suggested_quantity: form.suggested_quantity ? Number(form.suggested_quantity) : null,
        unit: form.unit || "عدد",
        note: form.note.trim() || null,
        created_by: createdBy,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("پیشنهاد جدید اضافه شد.");
      setOpen(false);
      setForm({ title: "", brand: "", suggested_quantity: "", unit: "عدد", note: "" });
      void queryClient.invalidateQueries({ queryKey: ["admin-promoted-listings"] });
    },
    onError: (error: Error) => toast.error(error.message || "افزودن پیشنهاد ناموفق بود."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="ml-2 h-4 w-4" /> پیشنهاد جدید
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>افزودن پیشنهاد تبلیغاتی</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label className="mb-2 block text-xs">عنوان محصول</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-2 block text-xs">برند</Label>
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div>
              <Label className="mb-2 block text-xs">تعداد پیشنهادی</Label>
              <Input
                type="number"
                value={form.suggested_quantity}
                onChange={(e) => setForm({ ...form, suggested_quantity: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label className="mb-2 block text-xs">توضیح (مثلاً تخفیف ویژه)</Label>
            <Textarea rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "در حال ذخیره…" : "ذخیره"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
