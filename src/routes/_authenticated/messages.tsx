import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { PanelShell } from "@/components/layout/PanelShell";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAccount, type AppRole } from "@/lib/auth";
import { faNumber, timeAgo, toman } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({
    meta: [
      { title: "گفتگو با تأمین‌کننده | عمده‌یار" },
      { name: "description", content: "هماهنگی مستقیم خریدار و تأمین‌کننده درباره سفارش‌های ثبت‌شده." },
      { property: "og:title", content: "پیام‌رسان عمده‌یار" },
      { property: "og:description", content: "درباره قیمت، ارسال و شرایط پرداخت مستقیم گفتگو کنید." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MessagesPage,
});

type Thread = {
  orderId: string;
  counterpartId: string;
  counterpartName: string;
  subject: string;
  total: number;
  createdAt: string | null;
};

function MessagesPage() {
  const { data: account } = useAccount();
  const role: AppRole = account?.role ?? "buyer";
  const userId = account?.userId ?? null;
  const supplierId = account?.supplierId ?? null;
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: threads = [] } = useQuery({
    queryKey: ["message-threads", userId, role, supplierId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Thread[]> => {
      const base = supabase
        .from("orders")
        .select("id, buyer_id, total_amount, created_at, suppliers(id, company_name, user_id), purchase_requests(product_name)")
        .order("created_at", { ascending: false });
      const { data } = role === "supplier" && supplierId
        ? await base.eq("supplier_id", supplierId)
        : await base.eq("buyer_id", userId!);
      const rows = data ?? [];

      let buyerNames: Record<string, string> = {};
      if (role === "supplier") {
        const ids = [...new Set(rows.map((r) => r.buyer_id))];
        if (ids.length) {
          const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);
          buyerNames = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));
        }
      }

      return rows.map((r) => ({
        orderId: r.id,
        counterpartId: role === "supplier" ? r.buyer_id : (r.suppliers?.user_id ?? ""),
        counterpartName:
          role === "supplier" ? (buyerNames[r.buyer_id] ?? "خریدار") : (r.suppliers?.company_name ?? "تأمین‌کننده"),
        subject: r.purchase_requests?.product_name ?? "سفارش",
        total: r.total_amount ?? 0,
        createdAt: r.created_at,
      }));
    },
  });

  const active = useMemo(
    () => threads.find((t) => t.orderId === activeId) ?? threads[0] ?? null,
    [threads, activeId],
  );

  return (
    <PanelShell role={role} title="گفتگوها" subtitle="برای هر سفارش می‌توانید مستقیم با طرف مقابل هماهنگ کنید.">
      {threads.length === 0 ? (
        <EmptyState
          title="هنوز گفتگویی ندارید"
          description="پس از نهایی‌شدن اولین سفارش، گفتگو با طرف مقابل اینجا فعال می‌شود."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="h-fit divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {threads.map((t) => (
              <button
                key={t.orderId}
                type="button"
                onClick={() => setActiveId(t.orderId)}
                className={cn(
                  "w-full p-4 text-start transition hover:bg-secondary/50",
                  active?.orderId === t.orderId && "bg-primary/5",
                )}
              >
                <p className="text-sm font-semibold">{t.counterpartName}</p>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{t.subject}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {toman(t.total)} · {timeAgo(t.createdAt)}
                </p>
              </button>
            ))}
          </div>
          {active && userId && <Conversation key={active.orderId} thread={active} userId={userId} />}
        </div>
      )}
    </PanelShell>
  );
}

function Conversation({ thread, userId }: { thread: Thread; userId: string }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", thread.orderId],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, message, created_at")
        .eq("order_id", thread.orderId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const send = useMutation({
    mutationFn: async () => {
      const body = text.trim();
      if (!body) throw new Error("متن پیام خالی است.");
      if (!thread.counterpartId) throw new Error("طرف مقابل هنوز حساب کاربری فعال ندارد.");
      const { error } = await supabase.from("messages").insert({
        sender_id: userId,
        receiver_id: thread.counterpartId,
        order_id: thread.orderId,
        message: body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      void queryClient.invalidateQueries({ queryKey: ["messages", thread.orderId] });
    },
    onError: (error: Error) => toast.error(error.message || "ارسال پیام ناموفق بود."),
  });

  return (
    <div className="flex min-h-[420px] flex-col rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <p className="text-sm font-bold">{thread.counterpartName}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {thread.subject} · مبلغ سفارش {toman(thread.total)}
        </p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">گفتگو را شما شروع کنید.</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === userId;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-start" : "justify-end")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-6",
                    mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                  )}
                >
                  {m.message}
                  <span className={cn("mt-1 block text-[11px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {timeAgo(m.created_at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      <form
        className="flex items-end gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send.mutate();
        }}
      >
        <Textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="پیام خود را بنویسید…"
          className="min-h-11 resize-none"
        />
        <Button type="submit" size="icon" disabled={send.isPending} aria-label="ارسال پیام">
          <Send className="size-4" />
        </Button>
      </form>
      <p className="px-4 pb-3 text-[11px] text-muted-foreground">
        {faNumber(messages.length)} پیام در این گفتگو
      </p>
    </div>
  );
}
