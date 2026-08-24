import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PanelShell } from "@/components/layout/PanelShell";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth";
import { ORDER_STATUSES } from "@/lib/constants";
import { faDate, faNumber, toman } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/supplier/orders")({
  head: () => ({
    meta: [
      { title: "سفارش‌های فروش | عمده‌یار" },
      { name: "description", content: "پیگیری و به‌روزرسانی وضعیت سفارش‌های دریافتی از کافه‌ها و رستوران‌ها." },
      { property: "og:title", content: "سفارش‌های فروش عمده" },
      { property: "og:description", content: "وضعیت آماده‌سازی و ارسال سفارش‌ها را مدیریت کنید." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SupplierOrders,
});

function SupplierOrders() {
  const { data: account } = useAccount();
  const supplierId = account?.supplierId ?? null;
  const queryClient = useQueryClient();

  const { data: orders = [] } = useQuery({
    queryKey: ["supplier-orders", supplierId],
    enabled: Boolean(supplierId),
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, quantity, total_amount, status, created_at, purchase_requests(product_name, unit, delivery_city)")
        .eq("supplier_id", supplierId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("وضعیت سفارش به‌روزرسانی شد.");
      void queryClient.invalidateQueries({ queryKey: ["supplier-orders", supplierId] });
    },
    onError: (error: Error) => toast.error(error.message || "به‌روزرسانی ناموفق بود."),
  });

  return (
    <PanelShell role="supplier" title="سفارش‌های فروش" subtitle="سفارش‌های نهایی‌شده و وضعیت آماده‌سازی آن‌ها">
      {!supplierId ? (
        <EmptyState title="ابتدا پروفایل فروشگاه را تکمیل کنید" />
      ) : orders.length === 0 ? (
        <EmptyState title="هنوز سفارشی ندارید" description="پس از پذیرش پیشنهاد قیمت توسط خریدار، سفارش اینجا نمایش داده می‌شود." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-secondary/50 text-xs text-muted-foreground">
              <tr>
                <th className="p-3 text-start font-medium">کالا</th>
                <th className="p-3 text-start font-medium">مقدار</th>
                <th className="p-3 text-start font-medium">مبلغ</th>
                <th className="p-3 text-start font-medium">تاریخ</th>
                <th className="p-3 text-start font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="p-3">
                    <p className="font-semibold">{o.purchase_requests?.product_name ?? "—"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{o.purchase_requests?.delivery_city ?? ""}</p>
                  </td>
                  <td className="p-3">
                    {faNumber(Number(o.quantity))} {o.purchase_requests?.unit ?? ""}
                  </td>
                  <td className="p-3 font-bold text-primary">{toman(o.total_amount)}</td>
                  <td className="p-3 text-xs text-muted-foreground">{faDate(o.created_at)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge kind="order" value={o.status} />
                      <Select value={o.status} onValueChange={(status) => updateStatus.mutate({ id: o.id, status })}>
                        <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelShell>
  );
}
