import { createFileRoute } from "@tanstack/react-router";
import { PublicShell, PageHeader } from "@/components/layout/PublicShell";
import { brand } from "@/config/brand";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "حریم خصوصی | عمده‌یار" },
      { name: "description", content: "نحوه جمع‌آوری، استفاده و نگهداری اطلاعات کاربران در پلتفرم عمده‌یار." },
      { property: "og:title", content: "سیاست حریم خصوصی عمده‌یار" },
      { property: "og:description", content: "اطلاعات شما چگونه محافظت می‌شود." },
    ],
  }),
  component: PrivacyPage,
});

const SECTIONS = [
  {
    title: "اطلاعاتی که جمع‌آوری می‌کنیم",
    body: "نام، ایمیل، شماره تماس، شهر و اطلاعات کسب‌وکار که هنگام ثبت‌نام یا تکمیل پروفایل وارد می‌کنید، به‌همراه محتوای درخواست‌ها و پیشنهادها.",
  },
  {
    title: "نحوه استفاده",
    body: `${brand.name} از این اطلاعات برای تطبیق درخواست خریداران با تأمین‌کنندگان مرتبط، ارسال اعلان‌ها و بهبود کیفیت سرویس استفاده می‌کند.`,
  },
  {
    title: "اشتراک‌گذاری",
    body: "اطلاعات تماس شما تنها در چارچوب یک معامله فعال و برای طرف مقابل قابل مشاهده است و به اشخاص ثالث فروخته نمی‌شود.",
  },
  {
    title: "امنیت داده",
    body: "دسترسی به داده‌ها با سیاست‌های امنیتی سطح ردیف در پایگاه داده محدود شده و هر کاربر تنها به داده‌های مجاز خود دسترسی دارد.",
  },
  {
    title: "حقوق کاربر",
    body: "می‌توانید اطلاعات پروفایل خود را ویرایش کنید یا برای حذف حساب با پشتیبانی تماس بگیرید.",
  },
];

function PrivacyPage() {
  return (
    <PublicShell>
      <PageHeader title="حریم خصوصی" subtitle="متعهد به حفاظت از داده‌های کسب‌وکار شما هستیم." />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-base font-bold">{s.title}</h2>
            <p className="mt-2 text-sm leading-8 text-muted-foreground">{s.body}</p>
          </section>
        ))}
      </div>
    </PublicShell>
  );
}
