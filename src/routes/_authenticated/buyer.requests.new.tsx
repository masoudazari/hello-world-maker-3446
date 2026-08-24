import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PanelShell } from "@/components/layout/PanelShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth";
import { CITIES, QUALITY_LEVELS, TIMEFRAMES, UNITS } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/buyer/requests/new")({
  validateSearch: (search: Record<string, unknown>): { need?: string | undefined } =>
    cleanSearch<{ need?: string | undefined }>({ need: (search["need"] as string) || undefined }),
  head: () => ({
    meta: [
      { title: "ثبت درخواست خرید کافه و رستوران | عمده‌یار" },
      { name: "description", content: "نیاز کافه یا رستوران خود را ثبت کنید تا تأمین‌کنندگان پیشنهاد قیمت بدهند." },
      { property: "og:title", content: "ثبت درخواست خرید عمده" },
      { property: "og:description", content: "یک بار ثبت کنید، چند پیشنهاد قیمت بگیرید." },
    ],
  }),
  component: NewRequestPage,
});

function NewRequestPage() {
  const { data: account } = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { need } = Route.useSearch();
  const parsed = parseNeed(need ?? "");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [form, setForm] = useState({
    product_name: parsed.productName,
    category_id: "",
    quantity: parsed.quantity ? String(parsed.quantity) : "",
    unit: parsed.unit ?? "عدد",
    quality: "any",
    delivery_city: "تهران",
    required_date: "flexible",
    min_price: "",
    max_price: "",
    description: "",
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
      if (!account?.userId) throw new Error("ابتدا وارد حساب کاربری شوید.");
      if (!form.product_name.trim()) throw new Error("نام کالا الزامی است.");
      const quantity = Number(form.quantity);
      if (!quantity || quantity <= 0) throw new Error("مقدار مورد نیاز را وارد کنید.");

      const { data, error } = await supabase
        .from("purchase_requests")
        .insert({
          buyer_id: account.userId,
          product_name: form.product_name.trim(),
          category_id: form.category_id || null,
          quantity,
          unit: form.unit,
          quality: form.quality,
          delivery_city: form.delivery_city,
          required_date: form.required_date,
          min_price: form.min_price ? Number(form.min_price) : null,
          max_price: form.max_price ? Number(form.max_price) : null,
          description: form.description.trim() || null,
          status: "matching",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("درخواست شما ثبت شد و برای تأمین‌کنندگان ارسال می‌شود.");
      void queryClient.invalidateQueries({ queryKey: ["buyer-requests"] });
      void navigate({ to: "/buyer/requests/$id", params: { id: data.id } });
    },
    onError: (error: Error) => toast.error(error.message || "ثبت درخواست ناموفق بود."),
  });

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <PanelShell role="buyer" title="ثبت درخواست خرید" subtitle="هرچه دقیق‌تر بنویسید، پیشنهادها دقیق‌تر می‌شود.">
      <form
        className="grid max-w-3xl gap-4 rounded-2xl border border-border bg-card p-6 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <Field label="نام کالا" className="md:col-span-2">
          <Input value={form.product_name} onChange={(e) => set("product_name")(e.target.value)} placeholder="مثلاً پارچه کتان ترک" />
        </Field>

        <Field label="دسته‌بندی">
          <Select value={form.category_id} onValueChange={set("category_id")}>
            <SelectTrigger className="w-full"><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="کیفیت مورد نظر">
          <Options value={form.quality} onChange={set("quality")} options={QUALITY_LEVELS} />
        </Field>

        <Field label="مقدار">
          <Input type="number" value={form.quantity} onChange={(e) => set("quantity")(e.target.value)} placeholder="۱۰۰" />
        </Field>

        <Field label="واحد">
          <Options value={form.unit} onChange={set("unit")} options={UNITS} />
        </Field>

        <Field label="شهر تحویل">
          <Options value={form.delivery_city} onChange={set("delivery_city")} options={CITIES.map((c) => ({ value: c, label: c }))} />
        </Field>

        <Field label="زمان نیاز">
          <Options value={form.required_date} onChange={set("required_date")} options={TIMEFRAMES} />
        </Field>

        <Field label="حداقل بودجه (تومان)">
          <Input type="number" value={form.min_price} onChange={(e) => set("min_price")(e.target.value)} />
        </Field>

        <Field label="حداکثر بودجه (تومان)">
          <Input type="number" value={form.max_price} onChange={(e) => set("max_price")(e.target.value)} />
        </Field>

        <Field label="توضیحات" className="md:col-span-2">
          <Textarea
            rows={4}
            value={form.description}
            onChange={(e) => set("description")(e.target.value)}
            placeholder="مشخصات فنی، بسته‌بندی، شرایط پرداخت و هر نکته مهم دیگر"
          />
        </Field>

        <div className="md:col-span-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "در حال ثبت…" : "ثبت درخواست"}
          </Button>
        </div>
      </form>
    </PanelShell>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="mb-2 block text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Options({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
