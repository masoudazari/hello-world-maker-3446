import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { PublicShell, PageHeader } from "@/components/layout/PublicShell";
import { brand } from "@/config/brand";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تماس با عمده‌یار | پشتیبانی خریداران و تأمین‌کنندگان" },
      { name: "description", content: "راه‌های ارتباط با تیم پشتیبانی عمده‌یار برای خریداران عمده و تأمین‌کنندگان." },
      { property: "og:title", content: "تماس با عمده‌یار" },
      { property: "og:description", content: "سوال یا پیشنهادی دارید؟ با پشتیبانی عمده‌یار در ارتباط باشید." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const items = [
    { icon: Mail, label: "ایمیل پشتیبانی", value: brand.supportEmail },
    { icon: Phone, label: "تلفن", value: brand.supportPhone },
    { icon: MessageSquare, label: "پیام‌رسان داخلی", value: "پس از ورود، از پنل کاربری با طرف مقابل گفتگو کنید." },
  ];
  return (
    <PublicShell>
      <PageHeader title="تماس با ما" subtitle="تیم پشتیبانی در روزهای کاری پاسخ‌گوی شماست." />
      <div className="mx-auto grid max-w-4xl gap-4 px-4 py-10 md:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-card p-6">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <item.icon className="size-5" />
            </span>
            <h2 className="mt-4 text-sm font-bold">{item.label}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground" dir="auto">{item.value}</p>
          </div>
        ))}
      </div>
    </PublicShell>
  );
}
