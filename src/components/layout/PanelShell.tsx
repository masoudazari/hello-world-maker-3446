import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  Boxes,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { useAccount, useSignOut, type AppRole } from "@/lib/auth";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

const NAV: Record<AppRole, NavItem[]> = {
  buyer: [
    { to: "/buyer/dashboard", label: "داشبورد", icon: LayoutDashboard },
    { to: "/buyer/requests", label: "درخواست‌های من", icon: ClipboardList },
    { to: "/buyer/orders", label: "سفارش‌ها", icon: ShoppingBag },
    { to: "/notifications", label: "اعلان‌ها", icon: Bell },
  ],
  supplier: [
    { to: "/supplier/dashboard", label: "داشبورد", icon: LayoutDashboard },
    { to: "/supplier/requests", label: "فرصت‌های فروش", icon: ClipboardList },
    { to: "/supplier/offers", label: "پیشنهادهای من", icon: FileText },
    { to: "/supplier/products", label: "محصولات", icon: Package },
    { to: "/supplier/profile", label: "پروفایل فروشگاه", icon: Store },
    { to: "/notifications", label: "اعلان‌ها", icon: Bell },
  ],
  admin: [
    { to: "/admin", label: "داشبورد مدیریت", icon: LayoutDashboard },
    { to: "/admin/suppliers", label: "تأمین‌کنندگان", icon: ShieldCheck },
    { to: "/admin/products", label: "محصولات", icon: Boxes },
    { to: "/admin/requests", label: "درخواست‌ها", icon: Users },
  ],
};

export function PanelShell({
  role,
  title,
  subtitle,
  action,
  children,
}: {
  role: AppRole;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { data: account } = useAccount();
  const signOut = useSignOut();

  return (
    <div className="min-h-screen bg-secondary/20">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
        <aside className="h-fit w-full shrink-0 rounded-2xl border border-border bg-card p-4 lg:sticky lg:top-6 lg:w-64">
          <Link to="/" className="mb-4 flex items-center gap-2 px-2 text-base font-extrabold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">ع</span>
            {brand.name}
          </Link>
          <p className="px-2 pb-3 text-xs text-muted-foreground">
            {account?.profile?.full_name || "کاربر"}
          </p>
          <nav className="flex flex-col gap-1">
            {NAV[role].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/admin" }}
                activeProps={{ className: "bg-primary/10 text-primary" }}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <Button variant="ghost" className="mt-3 w-full justify-start gap-2 text-sm" onClick={() => void signOut()}>
            <LogOut className="size-4" />
            خروج
          </Button>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-extrabold md:text-2xl">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {action}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
