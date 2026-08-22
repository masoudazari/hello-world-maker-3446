import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { PanelShell } from "@/components/layout/PanelShell";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "اعلان‌ها | عمده‌یار" },
      { name: "description", content: "اعلان‌های مربوط به درخواست‌ها، پیشنهادها و سفارش‌های شما." },
      { property: "og:title", content: "اعلان‌های عمده‌یار" },
      { property: "og:description", content: "از پیشنهادهای جدید و تغییر وضعیت سفارش‌ها باخبر شوید." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data: account } = useAccount();
  const queryClient = useQueryClient();
  const userId = account?.userId ?? null;
  const role = account?.role === "supplier" ? "supplier" : account?.role === "admin" ? "admin" : "buyer";

  const { data: items = [] } = useQuery({
    queryKey: ["notifications", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, type, is_read, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <PanelShell
      role={role}
      title="اعلان‌ها"
      subtitle="رویدادهای مهم حساب شما"
      action={
        items.some((i) => !i.is_read) ? (
          <Button variant="outline" size="sm" onClick={() => markAll.mutate()}>
            علامت‌گذاری همه به‌عنوان خوانده‌شده
          </Button>
        ) : null
      }
    >
      {items.length === 0 ? (
        <EmptyState title="اعلانی ندارید" description="با ثبت درخواست یا دریافت پیشنهاد، اینجا اطلاع‌رسانی می‌شود." />
      ) : (
        <div className="grid gap-2">
          {items.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 rounded-2xl border border-border p-4 ${n.is_read ? "bg-card" : "bg-primary/5"}`}
            >
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                <Bell className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{n.title}</p>
                {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
