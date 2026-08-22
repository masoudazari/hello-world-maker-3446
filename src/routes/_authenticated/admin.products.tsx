import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PanelShell } from "@/components/layout/PanelShell";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { faNumber, toman } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => ({
    meta: [
      { title: "مدیریت محصولات | عمده‌یار" },
      { name: "description", content: "تأیید یا رد محصولات ثبت‌شده توسط تأمین‌کنندگان." },
      { property: "og:title", content: "مدیریت محصولات" },
      { property: "og:description", content: "کنترل کیفیت محصولات پیش از انتشار عمومی." },
    ],
  }),
  component: AdminProducts,
});

function AdminProducts() {
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, base_price, unit, minimum_order, city, status, suppliers(company_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("products").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("وضعیت محصول به‌روزرسانی شد.");
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (error: Error) => toast.error(error.message || "به‌روزرسانی ناموفق بود."),
  });

  return (
    <PanelShell role="admin" title="محصولات" subtitle={`${faNumber(products.length)} محصول`}>
      {products.length === 0 ? (
        <EmptyState title="محصولی ثبت نشده است" />
      ) : (
        <div className="grid gap-3">
          {products.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.suppliers?.company_name ?? "—"} · {p.city} · {toman(p.base_price)} · حداقل {faNumber(p.minimum_order)} {p.unit}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge kind="product" value={p.status} />
                <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: p.id, status: "active" })}>
                  تأیید
                </Button>
                <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: p.id, status: "rejected" })}>
                  رد
                </Button>
                <Button size="sm" variant="ghost" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: p.id, status: "disabled" })}>
                  غیرفعال
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
