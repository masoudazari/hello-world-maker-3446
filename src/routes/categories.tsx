import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Layers } from "lucide-react";
import { listCategories } from "@/lib/catalog.functions";
import { PublicShell, PageHeader } from "@/components/layout/PublicShell";

const categoriesQuery = queryOptions({ queryKey: ["categories"], queryFn: () => listCategories() });

export const Route = createFileRoute("/categories")({
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(categoriesQuery);
  },
  head: () => ({
    meta: [
      { title: "دسته‌بندی کالاهای عمده | عمده‌یار" },
      { name: "description", content: "همه دسته‌بندی‌های کالاهای عمده؛ از مواد غذایی و پوشاک تا مصالح ساختمانی و لوازم خانگی." },
      { property: "og:title", content: "دسته‌بندی کالاهای عمده | عمده‌یار" },
      { property: "og:description", content: "دسته مورد نظر خود را انتخاب کنید و تأمین‌کنندگان آن را ببینید." },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data } = useSuspenseQuery(categoriesQuery);
  return (
    <PublicShell>
      <PageHeader title="دسته‌بندی‌ها" subtitle="کالاهای عمده را بر اساس صنعت و دسته مرور کنید." />
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((c) => (
          <Link
            key={c.id}
            to="/products"
            search={{ category: c.slug }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layers className="size-5" />
            </span>
            <span className="font-bold">{c.name}</span>
          </Link>
        ))}
      </div>
    </PublicShell>
  );
}
