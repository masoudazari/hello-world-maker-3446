import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { CheckCircle2, CircleDollarSign, Download, Printer } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PanelShell } from "@/components/layout/PanelShell";
import { EmptyState } from "@/components/common/EmptyState";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth";
import { PAYMENT_TERM_OPTIONS, paymentTermDueDate, paymentTermLabel } from "@/lib/constants";
import { matchesQuery } from "@/lib/bilingual-search";
import { faDate, faNumber, toman } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/supplier/accounting")({
  head: () => ({
    meta: [
      { title: "حسابداری | عمده‌یار" },
      { name: "description", content: "خلاصه فروش، ریز فاکتورها و وضعیت تسویه‌حساب مشتریان." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SupplierAccounting,
});

type OrderRow = {
  id: string;
  invoice_number: number;
  created_at: string;
  total_amount: number;
  buyer_name_snapshot: string | null;
  payment_term_code: string | null;
  is_paid: boolean;
  status: string;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function downloadWorkbook(workbook: XLSX.WorkBook, filename: string) {
  const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SupplierAccounting() {
  const { data: account } = useAccount();
  const supplierId = account?.supplierId ?? null;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"summary" | "sales" | "settlement">("summary");
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [termFilter, setTermFilter] = useState<string>("all");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["supplier-accounting-orders", supplierId],
    enabled: Boolean(supplierId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, invoice_number, created_at, total_amount, buyer_name_snapshot, payment_term_code, is_paid, status")
        .eq("supplier_id", supplierId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrderRow[];
    },
  });

  const markPaid = useMutation({
    mutationFn: async ({ id, paid }: { id: string; paid: boolean }) => {
      const { error } = await supabase.rpc("mark_order_paid", { _order_id: id, _paid: paid });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("وضعیت پرداخت به‌روزرسانی شد.");
      void queryClient.invalidateQueries({ queryKey: ["supplier-accounting-orders", supplierId] });
    },
    onError: (err: Error) => toast.error(err.message || "به‌روزرسانی ناموفق بود."),
  });

  const summary = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    function bucket(since: Date) {
      const rows = orders.filter((o) => new Date(o.created_at) >= since);
      const paid = rows.filter((o) => o.is_paid);
      const unpaid = rows.filter((o) => !o.is_paid);
      return {
        paidCount: paid.length,
        paidTotal: paid.reduce((s, o) => s + o.total_amount, 0),
        unpaidCount: unpaid.length,
        unpaidTotal: unpaid.reduce((s, o) => s + o.total_amount, 0),
      };
    }
    return { today: bucket(todayStart), week: bucket(weekStart), month: bucket(monthStart) };
  }, [orders]);

  const filteredSales = useMemo(() => {
    return orders.filter((o) => {
      if (search.trim() && !matchesQuery(o.buyer_name_snapshot, search) && !String(o.invoice_number).includes(search)) {
        return false;
      }
      if (paymentFilter === "paid" && !o.is_paid) return false;
      if (paymentFilter === "unpaid" && o.is_paid) return false;
      if (termFilter !== "all" && o.payment_term_code !== termFilter) return false;
      return true;
    });
  }, [orders, search, paymentFilter, termFilter]);

  const [printOrder, setPrintOrder] = useState<OrderRow | null>(null);

  const salesTrend = useMemo(() => {
    const days = 14;
    const buckets: { date: string; فروش: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = startOfDay(new Date());
      day.setDate(day.getDate() - i);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const total = orders
        .filter((o) => {
          const d = new Date(o.created_at);
          return d >= day && d < nextDay;
        })
        .reduce((s, o) => s + o.total_amount, 0);
      buckets.push({ date: faDate(day.toISOString()), فروش: total });
    }
    return buckets;
  }, [orders]);

  const byPaymentTerm = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      const key = paymentTermLabel(o.payment_term_code) || "نامشخص";
      map.set(key, (map.get(key) ?? 0) + o.total_amount);
    }
    return Array.from(map.entries()).map(([name, مبلغ]) => ({ name, مبلغ }));
  }, [orders]);

  const settlementRows = useMemo(() => {
    return orders
      .filter((o) => !o.is_paid)
      .map((o) => ({ ...o, dueDate: paymentTermDueDate(o.created_at, o.payment_term_code) }))
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });
  }, [orders]);

  function exportSalesToExcel() {
    if (filteredSales.length === 0) {
      toast.error("داده‌ای برای خروجی گرفتن وجود ندارد.");
      return;
    }
    try {
      const sheetData = filteredSales.map((o) => ({
        "شماره فاکتور": o.invoice_number,
        تاریخ: faDate(o.created_at),
        مشتری: o.buyer_name_snapshot ?? "",
        "شرایط پرداخت": paymentTermLabel(o.payment_term_code),
        مبلغ: o.total_amount,
        "وضعیت پرداخت": o.is_paid ? "پرداخت‌شده" : "معوق",
      }));
      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "ریز فروش");
      downloadWorkbook(workbook, "ریز-فروش-حسابداری.xlsx");
      toast.success("فایل اکسل آماده شد.");
    } catch (err) {
      console.error(err);
      toast.error("ساخت فایل اکسل ناموفق بود.");
    }
  }

  return (
    <PanelShell role="supplier" title="حسابداری" subtitle="خلاصه فروش، ریز فاکتورها و تسویه‌حساب مشتریان">
      {!supplierId ? (
        <EmptyState title="ابتدا پروفایل فروشگاه را تکمیل کنید" />
      ) : (
        <>
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="summary">خلاصه</TabsTrigger>
              <TabsTrigger value="sales">ریز فروش</TabsTrigger>
              <TabsTrigger value="settlement">تسویه‌حساب</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">در حال بارگذاری…</p>
          ) : orders.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="هنوز سفارشی ثبت نشده است" />
            </div>
          ) : (
            <div className="mt-6">
              {tab === "summary" && (
                <div className="grid gap-4 sm:grid-cols-3">
                  {([
                    ["امروز", summary.today],
                    ["۷ روز اخیر", summary.week],
                    ["۳۰ روز اخیر", summary.month],
                  ] as const).map(([label, b]) => (
                    <div key={label} className="rounded-2xl border border-border bg-card p-5">
                      <p className="mb-3 text-sm font-bold">{label}</p>
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm">
                          {faNumber(b.paidCount)} پرداخت‌شده · {toman(b.paidTotal)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-amber-600">
                        <CircleDollarSign className="h-4 w-4" />
                        <span className="text-sm">
                          {faNumber(b.unpaidCount)} معوق · {toman(b.unpaidTotal)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "summary" && (
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="mb-3 text-sm font-bold">مرور فروش (۱۴ روز اخیر)</p>
                    <div className="h-56 w-full" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={salesTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" fontSize={10} />
                          <YAxis fontSize={11} width={60} />
                          <Tooltip formatter={(v: number) => toman(v)} />
                          <Line type="monotone" dataKey="فروش" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="mb-3 text-sm font-bold">فروش به تفکیک شرایط پرداخت</p>
                    <div className="h-56 w-full" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={byPaymentTerm}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" fontSize={10} />
                          <YAxis fontSize={11} width={60} />
                          <Tooltip formatter={(v: number) => toman(v)} />
                          <Bar dataKey="مبلغ" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {tab === "sales" && (
                <>
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="جستجو مشتری یا شماره فاکتور"
                      className="max-w-xs"
                    />
                    <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                        <SelectItem value="paid">پرداخت‌شده</SelectItem>
                        <SelectItem value="unpaid">معوق</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={termFilter} onValueChange={setTermFilter}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">همه شرایط پرداخت</SelectItem>
                        {PAYMENT_TERM_OPTIONS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={exportSalesToExcel} className="mr-auto">
                      <Download className="ml-2 h-4 w-4" /> خروجی Excel
                    </Button>
                  </div>
                  <div className="rounded-2xl border border-border bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>فاکتور</TableHead>
                          <TableHead>تاریخ</TableHead>
                          <TableHead>مشتری</TableHead>
                          <TableHead>شرایط پرداخت</TableHead>
                          <TableHead>مبلغ</TableHead>
                          <TableHead>وضعیت</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSales.map((o) => (
                          <TableRow key={o.id}>
                            <TableCell>#{faNumber(o.invoice_number)}</TableCell>
                            <TableCell>{faDate(o.created_at)}</TableCell>
                            <TableCell>{o.buyer_name_snapshot ?? "—"}</TableCell>
                            <TableCell>{paymentTermLabel(o.payment_term_code)}</TableCell>
                            <TableCell className="font-medium">{toman(o.total_amount)}</TableCell>
                            <TableCell>
                              <span className={o.is_paid ? "text-emerald-600" : "text-amber-600"}>
                                {o.is_paid ? "پرداخت‌شده" : "معوق"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => setPrintOrder(o)}>
                                <Printer className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {tab === "settlement" && (
                <>
                  {settlementRows.length === 0 ? (
                    <EmptyState title="هیچ مبلغ معوقی وجود ندارد" description="همه فاکتورها تسویه شده‌اند." />
                  ) : (
                    <div className="rounded-2xl border border-border bg-card">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>فاکتور</TableHead>
                            <TableHead>مشتری</TableHead>
                            <TableHead>شرایط پرداخت</TableHead>
                            <TableHead>سررسید</TableHead>
                            <TableHead>مبلغ</TableHead>
                            <TableHead />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {settlementRows.map((o) => {
                            const overdue = o.dueDate ? o.dueDate.getTime() < Date.now() : false;
                            return (
                              <TableRow key={o.id}>
                                <TableCell>#{faNumber(o.invoice_number)}</TableCell>
                                <TableCell>{o.buyer_name_snapshot ?? "—"}</TableCell>
                                <TableCell>{paymentTermLabel(o.payment_term_code)}</TableCell>
                                <TableCell className={overdue ? "font-medium text-red-500" : ""}>
                                  {o.dueDate ? faDate(o.dueDate.toISOString()) : "—"}
                                  {overdue && " (سررسید گذشته)"}
                                </TableCell>
                                <TableCell className="font-medium">{toman(o.total_amount)}</TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={markPaid.isPending}
                                    onClick={() => markPaid.mutate({ id: o.id, paid: true })}
                                  >
                                    ثبت تسویه
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      <Dialog open={Boolean(printOrder)} onOpenChange={(v) => !v && setPrintOrder(null)}>
        <DialogContent className="max-w-sm print:max-w-full print:shadow-none">
          <DialogHeader>
            <DialogTitle>فاکتور #{printOrder ? faNumber(printOrder.invoice_number) : ""}</DialogTitle>
          </DialogHeader>
          {printOrder && (
            <div className="space-y-2 text-sm" id="invoice-print-area">
              <div className="flex justify-between"><span className="text-muted-foreground">تاریخ</span><span>{faDate(printOrder.created_at)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">مشتری</span><span>{printOrder.buyer_name_snapshot ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">شرایط پرداخت</span><span>{paymentTermLabel(printOrder.payment_term_code)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">وضعیت</span><span>{printOrder.is_paid ? "پرداخت‌شده" : "معوق"}</span></div>
              <div className="mt-3 flex justify-between border-t border-border pt-3 text-base font-bold">
                <span>مبلغ کل</span><span>{toman(printOrder.total_amount)}</span>
              </div>
              <Button className="mt-4 w-full print:hidden" onClick={() => window.print()}>
                <Printer className="ml-2 h-4 w-4" /> چاپ
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PanelShell>
  );
}
