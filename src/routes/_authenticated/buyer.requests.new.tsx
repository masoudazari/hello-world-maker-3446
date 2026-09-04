import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PanelShell } from "@/components/layout/PanelShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth";
import { CITIES, QUALITY_LEVELS, TIMEFRAMES, UNITS } from "@/lib/constants";
import { parseNeed } from "@/lib/parse-need";
import { cleanSearch } from "@/lib/search";
import { getSearchVariants } from "@/lib/bilingual-search";
import { toman } from "@/lib/format";
import { CaptchaField, type CaptchaState } from "@/components/common/CaptchaField";
import { verifyCaptcha } from "@/lib/captcha.functions";
import { useServerFn } from "@tanstack/react-start";
import { persianDbError } from "@/lib/error-messages";

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

type ItemRow = {
  key: string;
  product_name: string;
  category_id: string;
  quantity: string;
  unit: string;
};

function newItem(product_name = "", quantity = "", unit = "عدد"): ItemRow {
  return { key: crypto.randomUUID(), product_name, category_id: "", quantity, unit };
}

function NewRequestPage() {
  const { data: account } = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { need } = Route.useSearch();
  const parsed = parseNeed(need ?? "");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const checkCaptcha = useServerFn(verifyCaptcha);
  const [captcha, setCaptcha] = useState<CaptchaState>({ token: "", answer: "" });

  const [items, setItems] = useState<ItemRow[]>([
    newItem(parsed.productName, parsed.quantity ? String(parsed.quantity) : "", parsed.unit ?? "عدد"),
  ]);

  const [shared, setShared] = useState({
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

  function updateItem(key: string, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addItem() {
    setItems((rows) => [...rows, newItem()]);
  }
  function removeItem(key: string) {
    setItems((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== key) : rows));
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!account?.userId) throw new Error("ابتدا وارد حساب کاربری شوید.");
      const validItems = items.filter((i) => i.product_name.trim() && Number(i.quantity) > 0);
      if (validItems.length === 0) throw new Error("حداقل یک قلم کالا با نام و مقدار معتبر وارد کنید.");

      // Human check — together with the per-buyer limits enforced in the
      // database this keeps bulk fake RFQs (and supplier-contact scraping)
      // out of the fan-out pipeline.
      if (!captcha.answer.trim()) throw new Error("لطفاً به سؤال تأیید انسان بودن پاسخ دهید.");
      const check = await checkCaptcha({ data: { token: captcha.token, answer: captcha.answer.trim() } });
      if (!check.ok) throw new Error("پاسخ تأیید انسان بودن درست نیست.");


      const batch_id = validItems.length > 1 ? crypto.randomUUID() : null;

      const rows = validItems.map((i) => ({
        buyer_id: account.userId,
        batch_id,
        product_name: i.product_name.trim(),
        category_id: i.category_id || null,
        quantity: Number(i.quantity),
        unit: i.unit,
        quality: shared.quality,
        delivery_city: shared.delivery_city,
        required_date: shared.required_date,
        min_price: shared.min_price ? Number(shared.min_price) : null,
        max_price: shared.max_price ? Number(shared.max_price) : null,
        description: shared.description.trim() || null,
        status: "matching",
      }));

      const { data, error } = await supabase.from("purchase_requests").insert(rows).select("id");
      if (error) throw error;
      return { ids: data.map((d) => d.id), batch_id };
    },
    onSuccess: ({ ids, batch_id }) => {
      toast.success(
        ids.length > 1
          ? `${ids.length} درخواست خرید ثبت شد و برای تأمین‌کنندگان مرتبط ارسال می‌شود.`
          : "درخواست شما ثبت شد و برای تأمین‌کنندگان ارسال می‌شود.",
      );
      void queryClient.invalidateQueries({ queryKey: ["buyer-requests"] });
      if (batch_id) {
        void navigate({ to: "/buyer/requests" });
      } else {
        void navigate({ to: "/buyer/requests/$id", params: { id: ids[0] } });
      }
    },
    onError: (error: Error) => toast.error(persianDbError(error, "ثبت درخواست ناموفق بود.")),
  });

  const set = (key: keyof typeof shared) => (value: string) => setShared((f) => ({ ...f, [key]: value }));

  return (
    <PanelShell
      role="buyer"
      title="ثبت درخواست خرید"
      subtitle="می‌توانید چند قلم کالای مختلف را در یک سفارش با هم ثبت کنید — مثلاً نوشابه، قهوه و دلستر با هم."
    >
      <form
        className="grid max-w-3xl gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="grid gap-3">
          {items.map((item, idx) => (
            <ItemRowFields
              key={item.key}
              item={item}
              index={idx}
              canRemove={items.length > 1}
              onChange={(patch) => updateItem(item.key, patch)}
              onRemove={() => removeItem(item.key)}
            />
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="w-fit">
            <Plus className="ml-2 h-4 w-4" /> افزودن قلم دیگر
          </Button>
        </div>

        <div className="grid gap-4 rounded-2xl border border-border bg-card p-6 md:grid-cols-2">
          <Field label="شهر تحویل">
            <Options value={shared.delivery_city} onChange={set("delivery_city")} options={CITIES.map((c) => ({ value: c, label: c }))} />
          </Field>

          <Field label="زمان نیاز">
            <Options value={shared.required_date} onChange={set("required_date")} options={TIMEFRAMES} />
          </Field>

          <div className="md:col-span-2">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-sm font-medium text-primary hover:underline"
            >
              {showAdvanced ? "بستن گزینه‌های بیشتر" : "گزینه‌های بیشتر (کیفیت، بودجه، توضیحات)"}
            </button>
          </div>

          {showAdvanced && (
            <>
              <Field label="کیفیت مورد نظر">
                <Options value={shared.quality} onChange={set("quality")} options={QUALITY_LEVELS} />
              </Field>

              <Field label="حداقل بودجه (تومان)">
                <Input type="number" value={shared.min_price} onChange={(e) => set("min_price")(e.target.value)} />
              </Field>

              <Field label="حداکثر بودجه (تومان)">
                <Input type="number" value={shared.max_price} onChange={(e) => set("max_price")(e.target.value)} />
              </Field>

              <Field label="توضیحات (برای همه اقلام)" className="md:col-span-2">
                <Textarea
                  rows={4}
                  value={shared.description}
                  onChange={(e) => set("description")(e.target.value)}
                  placeholder="بسته‌بندی، برند مورد نظر، شرایط پرداخت و هر نکته مهم دیگر"
                />
              </Field>
            </>
          )}

          <div className="md:col-span-2">
            <CaptchaField value={captcha} onChange={setCaptcha} />
            <p className="mt-2 text-xs text-muted-foreground">
              برای جلوگیری از درخواست‌های ساختگی، حداکثر ۵ درخواست در ساعت و ۲۰ درخواست در شبانه‌روز قابل ثبت است.
            </p>
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "در حال ثبت…" : items.length > 1 ? `ثبت ${items.length} درخواست خرید` : "ثبت درخواست"}
            </Button>
          </div>
        </div>
      </form>
    </PanelShell>
  );
}

function ItemRowFields({
  item,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  item: ItemRow;
  index: number;
  canRemove: boolean;
  onChange: (patch: Partial<ItemRow>) => void;
  onRemove: () => void;
}) {
  const { data: categories = [] } = useQuery({
    queryKey: ["categories-flat"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("sort_order");
      return data ?? [];
    },
  });

  const referenceQuery = item.product_name.trim();
  const { data: siteReference } = useQuery({
    queryKey: ["own-site-reference-price", referenceQuery],
    enabled: referenceQuery.length >= 3,
    queryFn: async () => {
      const variants = getSearchVariants(referenceQuery);
      if (variants.length === 0) return null;
      const orClauses = variants.flatMap((term) => [`name.ilike.%${term}%`, `brand.ilike.%${term}%`]);
      const { data } = await supabase
        .from("products")
        .select("base_price, unit, suppliers(company_name)")
        .eq("status", "active")
        .or(orClauses.join(","))
        .order("base_price", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">قلم {index + 1}</span>
        {canRemove && (
          <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <Label className="mb-2 block text-xs">نام کالا</Label>
          <Input
            value={item.product_name}
            onChange={(e) => onChange({ product_name: e.target.value })}
            placeholder="مثلاً کوکاکولا قوطی ۳۳۰ میلی‌لیتر"
          />
          {siteReference && (
            <p className="mt-1 text-xs text-muted-foreground">
              قیمت مرجع در عمده‌یار: {toman(siteReference.base_price)} / {siteReference.unit}
              {siteReference.suppliers?.company_name ? ` (${siteReference.suppliers.company_name})` : ""}
            </p>
          )}
        </div>
        <div>
          <Label className="mb-2 block text-xs">مقدار</Label>
          <Input type="number" value={item.quantity} onChange={(e) => onChange({ quantity: e.target.value })} placeholder="۳۰" />
        </div>
        <div>
          <Label className="mb-2 block text-xs">واحد</Label>
          <Select value={item.unit} onValueChange={(v) => onChange({ unit: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => (
                <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-4">
          <Label className="mb-2 block text-xs">دسته‌بندی (اختیاری)</Label>
          <Select value={item.category_id} onValueChange={(v) => onChange({ category_id: v })}>
            <SelectTrigger className="w-full"><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
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
