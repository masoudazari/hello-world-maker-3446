import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell, PageHeader } from "@/components/layout/PublicShell";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "درباره عمده‌یار | بازار B2B عمده‌فروشی" },
      { name: "description", content: "عمده‌یار پلی میان خریداران عمده و تولیدکنندگان و تأمین‌کنندگان ایرانی است؛ استعلام قیمت شفاف و سریع." },
      { property: "og:title", content: "درباره عمده‌یار" },
      { property: "og:description", content: "مأموریت ما شفاف‌سازی و تسریع خرید عمده در ایران است." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PublicShell>
      <PageHeader title={`درباره ${brand.name}`} subtitle={brand.tagline} />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 text-sm leading-8 text-muted-foreground">
        <p>
          {brand.name} یک بازار آنلاین B2B است که خریداران عمده را مستقیم به تولیدکنندگان، واردکنندگان،
          توزیع‌کنندگان و عمده‌فروشان معتبر متصل می‌کند. خریدار به‌جای جست‌وجوی پراکنده، یک بار نیاز خود را ثبت
          می‌کند و پیشنهادهای قیمت را در یک صفحه مقایسه می‌کند.
        </p>
        <div>
          <h2 className="text-base font-bold text-foreground">مأموریت ما</h2>
          <p className="mt-2">
            کاهش زمان و هزینه تأمین کالا برای کسب‌وکارهای ایرانی از طریق شفافیت قیمت، احراز هویت تأمین‌کنندگان و
            سیستم امتیازدهی مبتنی بر معاملات واقعی.
          </p>
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">برای خریداران</h2>
          <p className="mt-2">
            ثبت رایگان درخواست خرید، دریافت چند پیشنهاد قیمت، بررسی سابقه و امتیاز تأمین‌کننده و مذاکره مستقیم در
            پیام‌رسان داخلی.
          </p>
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">برای تأمین‌کنندگان</h2>
          <p className="mt-2">
            دسترسی به جریان مداوم درخواست‌های خرید مرتبط با دسته‌بندی شما، ثبت محصول با قیمت پلکانی و ساخت اعتبار
            قابل اتکا در بازار.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 pt-4">
          <Button asChild><Link to="/register">شروع رایگان</Link></Button>
          <Button variant="outline" asChild><Link to="/contact">تماس با ما</Link></Button>
        </div>
      </div>
    </PublicShell>
  );
}
