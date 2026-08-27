import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Isolated per-(request, supplier) negotiation chat.
 * Deliberately separate from the general /messages inbox: this always
 * scopes strictly to one purchase_request + one supplier, so a buyer
 * negotiating with supplier A never sees anything from supplier B and
 * vice versa (enforced again at the DB layer via RLS on
 * request_conversations / request_messages).
 */
export function RequestOfferChat({
  requestId,
  supplierId,
  currentUserId,
}: {
  requestId: string;
  supplierId: string;
  currentUserId: string;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const conversationQuery = useQuery({
    queryKey: ["request-conversation", requestId, supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_conversations")
        .select("id")
        .eq("request_id", requestId)
        .eq("supplier_id", supplierId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const conversationId = conversationQuery.data?.id ?? null;

  const messagesQuery = useQuery({
    queryKey: ["request-messages", conversationId],
    enabled: Boolean(conversationId),
    refetchInterval: 8000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_messages")
        .select("id, sender_id, message, created_at")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQuery.data?.length]);

  const send = useMutation({
    mutationFn: async () => {
      if (!conversationId) throw new Error("این گفتگو هنوز آماده نیست.");
      if (!draft.trim()) return;
      const { error } = await supabase.from("request_messages").insert({
        conversation_id: conversationId,
        request_id: requestId,
        sender_id: currentUserId,
        message: draft.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft("");
      void queryClient.invalidateQueries({ queryKey: ["request-messages", conversationId] });
    },
    onError: (error: Error) => toast.error(error.message || "ارسال پیام ناموفق بود."),
  });

  if (conversationQuery.isLoading) {
    return <p className="p-3 text-xs text-muted-foreground">در حال بارگذاری گفتگو…</p>;
  }
  if (!conversationId) {
    return <p className="p-3 text-xs text-muted-foreground">گفتگو پس از ثبت پیشنهاد فعال می‌شود.</p>;
  }

  return (
    <div className="rounded-xl border border-border bg-secondary/20">
      <div className="max-h-64 space-y-2 overflow-y-auto p-3">
        {(messagesQuery.data ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">هنوز پیامی رد و بدل نشده. مذاکره را همین‌جا شروع کنید.</p>
        ) : (
          messagesQuery.data!.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                m.sender_id === currentUserId ? "mr-auto bg-primary text-primary-foreground" : "bg-card border border-border",
              )}
            >
              <p className="leading-6 whitespace-pre-wrap">{m.message}</p>
              <p className="mt-1 text-[10px] opacity-70">{timeAgo(m.created_at)}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-end gap-2 border-t border-border p-2">
        <Textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="پیام خود را بنویسید…"
          className="min-h-9 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send.mutate();
            }
          }}
        />
        <Button size="icon" onClick={() => send.mutate()} disabled={send.isPending || !draft.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
