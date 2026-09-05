import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { persianDbError } from "@/lib/error-messages";
import { cn } from "@/lib/utils";

const CRITERIA = [
  { key: "quality_score", label: "کیفیت کالا" },
  { key: "accuracy_score", label: "مطابقت با سفارش" },
  { key: "price_score", label: "قیمت" },
  { key: "delivery_score", label: "زمان تحویل" },
  { key: "communication_score", label: "پاسخگویی" },
] as const;

type ScoreKey = (typeof CRITERIA)[number]["key"];

export function ReviewDialog({
  orderId,
  buyerId,
  supplierId,
  supplierName,
}: {
  orderId: string;
  buyerId: string;
  supplierId: string;
  supplierName: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [scores, setScores] = useState<Record<ScoreKey, number>>({
    quality_score: 5,
    accuracy_score: 5,
    price_score: 5,
    delivery_score: 5,
    communication_score: 5,
  });
  const [comment, setComment] = useState("");

  const overall =
    CRITERIA.reduce((sum, c) => sum + scores[c.key], 0) / CRITERIA.length;

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reviews").insert({
        order_id: orderId,
        buyer_id: buyerId,
        supplier_id: supplierId,
        ...scores,
        overall_score: Math.round(overall * 100) / 100,
        comment: comment.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("امتیاز شما ثبت شد. ممنون از بازخوردتان!");
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["buyer-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["buyer-order-reviews"] });
    },
    onError: (error: Error) => toast.error(persianDbError(error, "ثبت نظر ناموفق بود.")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">ثبت امتیاز</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>امتیاز به «{supplierName}»</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          {CRITERIA.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-3">
              <span className="text-sm">{c.label}</span>
              <div className="flex flex-row-reverse items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${c.label} ${n}`}
                    onClick={() => setScores((s) => ({ ...s, [c.key]: n }))}
                  >
                    <Star
                      className={cn(
                        "size-5",
                        n <= scores[c.key] ? "fill-accent text-accent" : "text-muted-foreground",
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div>
            <Label className="mb-2 block text-xs">توضیح (اختیاری)</Label>
            <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="items-center justify-between gap-3 sm:justify-between">
          <span className="text-sm text-muted-foreground">امتیاز کلی: {overall.toFixed(1)}</span>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "در حال ثبت…" : "ثبت امتیاز"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
