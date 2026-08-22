import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PanelShell } from "@/components/layout/PanelShell";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BUSINESS_TYPES, labelOf } from "@/lib/constants";
import { faDate, faNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/suppliers")({
  head: () => ({
    meta: [
      { title: "مدیریت تأمین‌کنندگان | عمده‌یار" },
      { name: "description", content: "بررسی و تأیید احراز هویت تأمین‌کنندگان پلتفرم." },
      { property: "og:title", content: "مدیریت تأمین‌کنندگان" },
      { property: "og:description", content: "تأیید، رد یا تعلیق تأمین‌کنندگان." },
    ],
  }),
  component: AdminSuppliers,
});

function AdminSuppliers() {
  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ["admin-suppliers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("id, company_name, business_type, city, phone, verification_status, supplier_score, created_at")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("suppliers").update({ verification_status: status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("وضعیت تأمین‌کننده به‌روزرسانی شد.");
      void queryClient.invalidateQueries({ queryKey: ["admin-suppliers"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (error: Error) => toast.error(error.message || "به‌روزرسانی ناموفق بود."),
  });

  return (
    <PanelShell role="admin" title="تأمین‌کنندگان" subtitle={`${faNumber(suppliers.length)} تأمین‌کننده ثبت‌شده`}>
      {suppliers.length === 0 ? (
        <EmptyState title="تأمین‌کننده‌ای ثبت نشده است" />
      ) : (
        <div className="grid gap-3">
          {suppliers.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
              <div>
                <p className="font-semibold">{s.company_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {labelOf(BUSINESS_TYPES, s.business_type)} · {s.city} · امتیاز {faNumber(s.supplier_score)} · {faDate(s.created_at)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge kind="verification" value={s.verification_status} />
                <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: s.id, status: "verified" })}>
                  تأیید
                </Button>
                <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: s.id, status: "rejected" })}>
                  رد
                </Button>
                <Button size="sm" variant="ghost" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: s.id, status: "suspended" })}>
                  تعلیق
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
