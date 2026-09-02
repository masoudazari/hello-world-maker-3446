import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { PanelShell } from "@/components/layout/PanelShell";
import { EmptyState } from "@/components/common/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth";
import { faDate, faNumber, toman } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/supplier/customers")({
  head: () => ({
    meta: [
      { title: "مشتریان و سابقه خرید | عمده‌یار" },
      { name: "description", content: "جستجوی مشتریان، مشاهده سابقه کامل خرید و خروجی اکسل." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SupplierCustomers,
});

type OrderRow = {
  id: string;
  invoice_number: number;
  created_at: string;
  quantity: number;
  total_amount: number;
  discount_amount: number;
  unit_price_snapshot: number;
  unit_snapshot: string | null;
  product_name_snapshot: string | null;
  buyer_name_snapshot: string | null;
  buyer_phone_snapshot: string | null;
  status: string;
};

type FilterableRow = {
  buyer_name_snapshot?: string | null;
  buyer_phone_snapshot?: string | null;
  product_name_snapshot?: string | null;
  invoice_number?: number | null;
};

function matchesFilter(row: FilterableRow, q: string) {
  if (!q.trim()) return true;
  const needle = q.trim().toLowerCase();
  return (
    (row.buyer_name_snapshot ?? "").toLowerCase().includes(needle) ||
    (row.buyer_phone_snapshot ?? "").includes(needle) ||
    (row.product_name_snapshot ?? "").toLowerCase().includes(needle) ||
    String(row.invoice_number).includes(needle)
  );
}

function SupplierCustomers() {
  const { data: account } = useAccount();
  const supplierId = account?.supplierId ?? null;
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["supplier-customer-orders", supplierId],
    enabled: Boolean(supplierId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, invoice_number, created_at, quantity, total_amount, discount_amount, unit_price_snapshot, unit_snapshot, product_name_snapshot, buyer_name_snapshot, buyer_phone_snapshot, status, buyer_id",
        )
        .eq("supplier_id", supplierId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as (OrderRow & { buyer_id: string })[];
    },
  });

  const filtered = useMemo(() => {
    return orders.filter((row) => {
      if (!matchesFilter(row, query)) return false;
      if (fromDate && new Date(row.created_at) < new Date(fromDate)) return false;
      if (toDate && new Date(row.created_at) > new Date(`${toDate}T23:59:59`)) return false;
      if (selectedCustomer && row.buyer_id !== selectedCustomer) return false;
      return true;
    });
  }, [orders, query, fromDate, toDate, selectedCustomer]);

  const customers = useMemo(() => {
    const map = new Map<
      string,
      { buyer_id: string; name: string; phone: string; orders: number; total: number; first: string; last: string }
    >();
    for (const row of orders) {
      const key = row.buyer_id;
      const existing = map.get(key);
      if (existing) {
        existing.orders += 1;
        existing.total += row.total_amount;
        if (row.created_at < existing.first) existing.first = row.created_at;
        if (row.created_at > existing.last) existing.last = row.created_at;
      } else {
        map.set(key, {
          buyer_id: key,
          name: row.buyer_name_snapshot ?? "بدون نام",
          phone: row.buyer_phone_snapshot ?? "—",
          orders: 1,
          total: row.total_amount,
          first: row.created_at,
          last: row.created_at,
        });
      }
    }
    return Array.from(map.values())
      .filter((c) => (query.trim() ? matchesFilter({ ...c, buyer_name_snapshot: c.name, buyer_phone_snapshot: c.phone, product_name_snapshot: "", invoice_number: 0 } as OrderRow, query) : true))
      .sort((a, b) => b.total - a.total);
  }, [orders, query]);

  function exportInvoicesToExcel(rows: OrderRow[], filename: string) {
    const sheetData = rows.map((r) => ({
      "شماره فاکتور": r.invoice_number,
      تاریخ: faDate(r.created_at),
      مشتری: r.buyer_name_snapshot ?? "",
      "تلفن مشتری": r.buyer_phone_snapshot ?? "",
      محصول: r.product_name_snapshot ?? "",
      تعداد: r.quantity,
      واحد: r.unit_snapshot ?? "",
      "قیمت واحد": r.unit_price_snapshot,
      تخفیف: r.discount_amount,
      "مبلغ نهایی": r.total_amount,
      وضعیت: r.status,
    }));
    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "فاکتورها");
    XLSX.writeFile(workbook, filename);
  }

  function exportCustomerSummaryToExcel() {
    const sheetData = customers.map((c) => ({
      نام: c.name,
      تلفن: c.phone,
      "تعداد سفارش": c.orders,
      "مجموع خرید": c.total,
      "اولین خرید": faDate(c.first),
      "آخرین خرید": faDate(c.last),
    }));
    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "خلاصه مشتریان");
    XLSX.writeFile(workbook, "خلاصه-مشتریان.xlsx");
  }

  const selectedCustomerName = selectedCustomer
    ? customers.find((c) => c.buyer_id === selectedCustomer)?.name
    : null;

  return (
    <PanelShell role="supplier" title="مشتریان و سابقه خرید" subtitle="جستجوی مشتریان، مشاهده فاکتورها و خروجی اکسل">
      {!supplierId ? (
        <EmptyState title="ابتدا پروفایل فروشگاه را تکمیل کنید" />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block text-xs text-muted-foreground">جستجو (نام، تلفن، محصول، شماره فاکتور)</label>
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="مثلاً: علی" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">از تاریخ</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">تا تاریخ</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <Button variant="outline" onClick={() => exportInvoicesToExcel(filtered, "خروجی-فروش.xlsx")}>
              خروجی Excel (نتایج فعلی)
            </Button>
            <Button variant="outline" onClick={exportCustomerSummaryToExcel}>
              خروجی خلاصه مشتریان
            </Button>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
          ) : customers.length === 0 ? (
            <EmptyState title="هنوز سفارشی ثبت نشده است" />
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>مشتری</TableHead>
                      <TableHead>تلفن</TableHead>
                      <TableHead>تعداد سفارش</TableHead>
                      <TableHead>مجموع خرید</TableHead>
                      <TableHead>اولین خرید</TableHead>
                      <TableHead>آخرین خرید</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((c) => (
                      <TableRow key={c.buyer_id} className={selectedCustomer === c.buyer_id ? "bg-secondary/50" : ""}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell dir="ltr" className="text-right">{c.phone}</TableCell>
                        <TableCell>{faNumber(c.orders)}</TableCell>
                        <TableCell>{toman(c.total)}</TableCell>
                        <TableCell>{faDate(c.first)}</TableCell>
                        <TableCell>{faDate(c.last)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCustomer(selectedCustomer === c.buyer_id ? null : c.buyer_id)}
                          >
                            {selectedCustomer === c.buyer_id ? "بستن سوابق" : "مشاهده سوابق"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedCustomer && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-semibold">سوابق خرید {selectedCustomerName}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        exportInvoicesToExcel(
                          filtered.filter((r) => r.id && orders.find((o) => o.id === r.id)),
                          `سوابق-${selectedCustomerName ?? "مشتری"}.xlsx`,
                        )
                      }
                    >
                      خروجی Excel این مشتری
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>فاکتور</TableHead>
                        <TableHead>تاریخ</TableHead>
                        <TableHead>محصول</TableHead>
                        <TableHead>تعداد</TableHead>
                        <TableHead>قیمت واحد</TableHead>
                        <TableHead>تخفیف</TableHead>
                        <TableHead>مبلغ نهایی</TableHead>
                        <TableHead>وضعیت</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered
                        .filter((r) => (r as OrderRow & { buyer_id?: string }).buyer_id === selectedCustomer)
                        .map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>#{faNumber(r.invoice_number)}</TableCell>
                            <TableCell>{faDate(r.created_at)}</TableCell>
                            <TableCell>{r.product_name_snapshot}</TableCell>
                            <TableCell>
                              {faNumber(r.quantity)} {r.unit_snapshot}
                            </TableCell>
                            <TableCell>{toman(r.unit_price_snapshot)}</TableCell>
                            <TableCell>{toman(r.discount_amount)}</TableCell>
                            <TableCell className="font-medium">{toman(r.total_amount)}</TableCell>
                            <TableCell>{r.status}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </PanelShell>
  );
}
