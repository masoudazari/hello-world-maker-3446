import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Boxes, Menu, Search, X, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { useAccount, useSignOut, homeForRole } from "@/lib/auth";

const NAV = [
  { to: "/products", label: "محصولات" },
  { to: "/suppliers", label: "تأمین‌کنندگان" },
  { to: "/purchase-requests", label: "درخواست‌های خرید" },
  { to: "/categories", label: "دسته‌بندی‌ها" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { data: account } = useAccount();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const isAuthed = Boolean(account?.session);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Boxes className="size-5" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">{brand.name}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto hidden items-center gap-2 md:flex">
          {isAuthed ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: homeForRole(account?.role ?? null) })}>
                <LayoutDashboard className="size-4" />
                پنل کاربری
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="size-4" />
                خروج
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">ورود</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/register">ثبت‌نام</Link>
              </Button>
            </>
          )}
          <Button size="sm" asChild>
            <Link to="/buyer/requests/new">
              <Search className="size-4" />
              ثبت درخواست خرید
            </Link>
          </Button>
        </div>

        <button
          type="button"
          aria-label="منو"
          className="ms-auto inline-flex size-10 items-center justify-center rounded-lg border border-border md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Button asChild>
                <Link to="/buyer/requests/new" onClick={() => setOpen(false)}>
                  ثبت درخواست خرید
                </Link>
              </Button>
              {isAuthed ? (
                <Button variant="outline" onClick={() => { setOpen(false); void signOut(); }}>
                  خروج از حساب
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" asChild>
                    <Link to="/login" onClick={() => setOpen(false)}>ورود</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/register" onClick={() => setOpen(false)}>ثبت‌نام</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
