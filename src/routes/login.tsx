import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Boxes, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brand } from "@/config/brand";
import { accountQueryKey, homeForRole, type AppRole } from "@/lib/auth";
import { persianAuthError } from "@/lib/error-messages";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "ورود به حساب | عمده‌یار" },
      { name: "description", content: "وارد حساب کاربری عمده‌یار شوید و درخواست‌ها، پیشنهادها و سفارش‌های خود را مدیریت کنید." },
      { property: "og:title", content: "ورود به حساب | عمده‌یار" },
      { property: "og:description", content: "ورود خریداران و تأمین‌کنندگان به پنل عمده‌یار." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function afterLogin() {
    await queryClient.invalidateQueries({ queryKey: accountQueryKey });
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    let role: AppRole | null = null;
    if (userId) {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
      role = (data?.role as AppRole | undefined) ?? null;
    }
    navigate({ to: homeForRole(role), replace: true });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("ورود ناموفق بود", { description: persianAuthError(error, "ایمیل یا رمز عبور صحیح نیست.") });
      return;
    }
    toast.success("خوش آمدید!");
    await afterLogin();
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("ورود با گوگل انجام نشد");
      return;
    }
    if (result.redirected) return;
    await afterLogin();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
        <Link to="/" className="flex items-center justify-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Boxes className="size-5" />
          </span>
          <span className="text-lg font-extrabold">{brand.name}</span>
        </Link>
        <h1 className="mt-6 text-center text-xl font-extrabold">ورود به حساب کاربری</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          برای مدیریت درخواست‌ها و پیشنهادها وارد شوید.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email" className="mb-2 block">ایمیل</Label>
            <Input id="email" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password" className="mb-2 block">رمز عبور</Label>
            <Input id="password" type="password" dir="ltr" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            ورود
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          یا
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full" size="lg" onClick={handleGoogle}>
          ورود با گوگل
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          حساب کاربری ندارید؟{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            ثبت‌نام کنید
          </Link>
        </p>
      </div>
    </div>
  );
}
