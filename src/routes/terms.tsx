import { createFileRoute } from "@tanstack/react-router";
import { PublicShell, PageHeader } from "@/components/layout/PublicShell";
import { brand } from "@/config/brand";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "قوانین و مقررات | عمده‌یار" },
      { name: "description", content: "شرایط استفاده از پلتفرم عمده‌یار برای خریداران عمده و تأمین‌کنندگان." },
      { property: "og:title", content: "قوانین و مقررات عمده‌یار" },
      { property: "og:description", content: "قواعد ثبت درخواست، ارسال پیشنهاد قیمت و معاملات در عمده‌یار." },
    ],
  }),
  component: TermsPage,
});

const SECTIONS = [
  {
    title: "۱. پذیرش شرایط",
    body: `با ثبت‌نام در ${brand.name} می‌پذیرید که اطلاعات واقعی و به‌روز ارائه دهید و مسئولیت فعالیت حساب کاربری خود را بپذیرید.`,
  },
  {
    title: "۲. نقش پلتفرم",
    body: `${brand.name} بستری برای اتصال خریدار و تأمین‌کننده است. مسئولیت کیفیت کالا، زمان تحویل و شرایط پرداخت بر عهده طرفین معامله است.`,
  },
  {
    title: "۳. درخواست خرید و پیشنهاد قیمت",
    body: "درخواست‌ها باید مربوط به خرید عمده و واقعی باشند. ارسال درخواست یا پیشنهاد ساختگی موجب تعلیق حساب می‌شود.",
  },
  {
    title: "۴. احراز هویت تأمین‌کنندگان",
    body: "مدارک ثبتی تأمین‌کنندگان بررسی می‌شود؛ اما تأیید هویت به معنای تضمین کیفیت کالا نیست.",
  },
  {
    title: "۵. امتیازدهی و نظرات",
    body: "نظرات باید بر پایه معامله واقعی باشد. نظرات توهین‌آمیز یا تبلیغاتی حذف می‌شود.",
  },
  {
    title: "۶. تغییر شرایط",
    body: "این قوانین ممکن است به‌روزرسانی شود و نسخه جدید از زمان انتشار در همین صفحه معتبر است.",
  },
];

function TermsPage() {
  return (
    <PublicShell>
      <PageHeader title="قوانین و مقررات" subtitle="لطفاً پیش از استفاده از پلتفرم این موارد را مطالعه کنید." />
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
