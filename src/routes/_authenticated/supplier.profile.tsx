import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PanelShell } from "@/components/layout/PanelShell";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { accountQueryKey, useAccount } from "@/lib/auth";
import { BUSINESS_TYPES, CITIES } from "@/lib/constants";
import { slugify } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/supplier/profile")({
  head: () => ({
    meta: [
      { title: "پروفایل فروشگاه | عمده‌یار" },
      { name: "description", content: "ویرایش اطلاعات فروشگاه، شهر، نوع کسب‌وکار و معرفی تأمین‌کننده." },
      { property: "og:title", content: "پروفایل فروشگاه" },
      { property: "og:description", content: "اطلاعات فروشگاه خود را کامل کنید تا اعتماد خریداران بیشتر شود." },
    ],
  }),
  component: SupplierProfile,
});

function SupplierProfile() {
  const { data: account } = useAccount();
  const queryClient = useQueryClient();
  const userId = account?.userId ?? null;

  const { data: supplier } = useQuery({
    queryKey: ["supplier-profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("id, company_name, business_type, city, address, phone, description, logo_url, founded_year, verification_status, official_invoice")
        .eq("user_id", userId!)
        .maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({
    company_name: "",
    business_type: "wholesaler",
    city: "تهران",
    address: "",
    phone: "",
    description: "",
    logo_url: "",
    founded_year: "",
  });

  useEffect(() => {
    if (!supplier) return;
    setForm({
      company_name: supplier.company_name ?? "",
      business_type: supplier.business_type ?? "wholesaler",
      city: supplier.city ?? "تهران",
      address: supplier.address ?? "",
      phone: supplier.phone ?? "",
      description: supplier.description ?? "",
      logo_url: supplier.logo_url ?? "",
      founded_year: supplier.founded_year ? String(supplier.founded_year) : "",
    });
  }, [supplier]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("ابتدا وارد شوید.");
      if (!form.company_name.trim()) throw new Error("نام فروشگاه الزامی است.");
      const payload = {
        company_name: form.company_name.trim(),
        business_type: form.business_type,
        city: form.city,
        address: form.address || null,
        phone: form.phone || null,
        description: form.description || null,
        logo_url: form.logo_url || null,
        founded_year: form.founded_year ? Number(form.founded_year) : null,
      };
      if (supplier?.id) {
        const { error } = await supabase.from("suppliers").update(payload).eq("id", supplier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert({
          ...payload,
          user_id: userId,
          slug: `${slugify(form.company_name)}-${Math.random().toString(36).slice(2, 6)}`,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("اطلاعات فروشگاه ذخیره شد.");
      void queryClient.invalidateQueries({ queryKey: ["supplier-profile"] });
      void queryClient.invalidateQueries({ queryKey: accountQueryKey });
    },
    onError: (error: Error) => toast.error(error.message || "ذخیره اطلاعات ناموفق بود."),
  });

  return (
    <PanelShell
      role="supplier"
      title="پروفایل فروشگاه"
      subtitle="این اطلاعات در صفحه عمومی فروشگاه شما نمایش داده می‌شود."
      action={supplier ? <StatusBadge kind="verification" value={supplier.verification_status} /> : null}
    >
      <form
        className="grid max-w-3xl gap-4 rounded-2xl border border-border bg-card p-6 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="md:col-span-2">
          <Label className="mb-2 block text-xs">نام فروشگاه / شرکت</Label>
          <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
        </div>
        <div>
          <Label className="mb-2 block text-xs">نوع کسب‌وکار</Label>
          <Select value={form.business_type} onValueChange={(v) => setForm({ ...form, business_type: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BUSINESS_TYPES.map((b) => (
                <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-2 block text-xs">شهر</Label>
          <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CITIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-2 block text-xs">تلفن</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" />
        </div>
        <div>
          <Label className="mb-2 block text-xs">سال تأسیس</Label>
          <Input type="number" value={form.founded_year} onChange={(e) => setForm({ ...form, founded_year: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Label className="mb-2 block text-xs">آدرس</Label>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Label className="mb-2 block text-xs">آدرس لوگو</Label>
          <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://" dir="ltr" />
        </div>
        <div className="md:col-span-2">
          <Label className="mb-2 block text-xs">معرفی فروشگاه</Label>
          <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "در حال ذخیره…" : "ذخیره اطلاعات"}
          </Button>
        </div>
      </form>
    </PanelShell>
  );
}
