import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const setupSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  mobile: z.string().trim().max(20).optional(),
  role: z.enum(["buyer", "supplier"]),
  companyName: z.string().trim().max(160).optional(),
  city: z.string().trim().min(1).max(60).default("تهران"),
});

export const setupAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => setupSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    await supabaseAdmin
      .from("profiles")
      .upsert(
        { id: userId, full_name: data.fullName, mobile: data.mobile ?? null },
        { onConflict: "id" },
      );

    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingRole) {
      // Admin can never be self-assigned.
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: data.role });
    }

    if (data.role === "supplier") {
      const { data: existingSupplier } = await supabaseAdmin
        .from("suppliers")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!existingSupplier) {
        await supabaseAdmin.from("suppliers").insert({
          user_id: userId,
          company_name: data.companyName || data.fullName || "تأمین‌کننده",
          city: data.city,
        });
      }
    }

    return { ok: true as const };
  });
