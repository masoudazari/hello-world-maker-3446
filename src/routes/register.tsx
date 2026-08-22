import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Boxes, Building2, Loader2, ShoppingCart } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brand } from "@/config/brand";
import { CITIES } from "@/lib/constants";
import { accountQueryKey, homeForRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "ثبت‌نام خریدار و تأمین‌کننده | عمده‌یار" },
      { name: "description", content: "رایگان ثبت‌نام کنید: خریداران درخواست خرید ثبت می‌کنند و تأمین‌کنندگان پیشنهاد قیمت می‌دهند." },
      { property: "og:title", content: "ثبت‌نام در عمده‌یار" },
      { property: "og:description", content: "به بازار عمده‌فروشی B2B ایران بپیوندید." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [role, setRole] = useState<"buyer" | "supplier">("buyer");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [mobile, setMobile] = useState("");
  const [city, setCity] = useState("تهران");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (signUpError) {
      setLoading(false);
      toast.error("ثبت‌نام انجام نشد", { description: signUpError.message });
      return;
    }
    const { error: rpcError } = await supabase.rpc("setup_account", {
      _full_name: fullName,
      _mobile: mobile || undefined,
      _role: role,
      _company_name: companyName || undefined,
      _city: city,
    });
    setLoading(false);
    if (rpcError) {
      toast.error("تکمیل حساب انجام نشد", { description: rpcError.message });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: accountQueryKey });
    toast.success("حساب شما ساخته شد");
    navigate({ to: homeForRole(role), replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 shadow-sm">
        <Link to="/" className="flex items-center justify-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Boxes className="size-5" />
          </span>
          <span className="text-lg font-extrabold">{brand.name}</span>
        </Link>
        <h1 className="mt-6 text-center text-xl font-extrabold">ساخت حساب کاربری</h1>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            { value: "buyer" as const, label: "خریدار عمده", icon: ShoppingCart, hint: "ثبت درخواست و دریافت پیشنهاد" },
            { value: "supplier" as const, label: "تأمین‌کننده", icon: Building2, hint: "عرضه کالا و ارسال پیشنهاد" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRole(option.value)}
              className={cn(
                "rounded-2xl border p-4 text-start transition-colors",
                role === option.value ? "border-primary bg-primary/5" : "border-border hover:bg-secondary",
              )}
            >
              <option.icon className={cn("size-5", role === option.value ? "text-primary" : "text-muted-foreground")} />
              <p className="mt-2 text-sm font-bold">{option.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{option.hint}</p>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="fullName" className="mb-2 block">نام و نام خانوادگی</Label>
            <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          {role === "supplier" && (
            <div>
              <Label htmlFor="company" className="mb-2 block">نام شرکت / برند</Label>
              <Input id="company" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="mobile" className="mb-2 block">شماره موبایل</Label>
              <Input id="mobile" dir="ltr" placeholder="09xxxxxxxxx" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 block">شهر</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="email" className="mb-2 block">ایمیل</Label>
            <Input id="email" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password" className="mb-2 block">رمز عبور</Label>
            <Input
              id="password"
              type="password"
              dir="ltr"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            ثبت‌نام
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          حساب دارید؟{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            وارد شوید
          </Link>
        </p>
      </div>
    </div>
  );
}
