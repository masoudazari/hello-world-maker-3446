import { Link } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { brand } from "@/config/brand";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Boxes className="size-4" />
            </span>
            <span className="font-bold">{brand.name}</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{brand.description}</p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold">پلتفرم</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/products" className="hover:text-foreground">محصولات</Link></li>
            <li><Link to="/suppliers" className="hover:text-foreground">تأمین‌کنندگان</Link></li>
            <li><Link to="/purchase-requests" className="hover:text-foreground">درخواست‌های خرید</Link></li>
            <li><Link to="/categories" className="hover:text-foreground">دسته‌بندی‌ها</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold">درباره ما</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground">درباره {brand.name}</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">تماس با ما</Link></li>
            <li><Link to="/terms" className="hover:text-foreground">قوانین و مقررات</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground">حریم خصوصی</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold">شروع کنید</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/register" className="hover:text-foreground">ثبت‌نام خریدار</Link></li>
            <li><Link to="/register" className="hover:text-foreground">ثبت‌نام تأمین‌کننده</Link></li>
            <li><Link to="/buyer/requests/new" className="hover:text-foreground">ثبت درخواست خرید</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70 py-4 text-center text-xs text-muted-foreground">
        © {brand.name} — نسخه آزمایشی MVP
      </div>
    </footer>
  );
}
