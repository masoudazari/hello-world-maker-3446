import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "buyer" | "supplier";

export type AccountState = {
  session: Session | null;
  userId: string | null;
  role: AppRole | null;
  profile: { id: string; full_name: string; mobile: string | null; avatar_url: string | null } | null;
  supplierId: string | null;
};

export const accountQueryKey = ["account"] as const;

async function fetchAccount(): Promise<AccountState> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session ?? null;
  if (!session) {
    return { session: null, userId: null, role: null, profile: null, supplierId: null };
  }
  const userId = session.user.id;
  const [{ data: roleRow }, { data: profile }, { data: supplierRow }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
    supabase.from("profiles").select("id, full_name, mobile, avatar_url").eq("id", userId).maybeSingle(),
    supabase.from("suppliers").select("id").eq("user_id", userId).maybeSingle(),
  ]);
  return {
    session,
    userId,
    role: (roleRow?.role as AppRole | undefined) ?? null,
    profile: profile ?? null,
    supplierId: supplierRow?.id ?? null,
  };
}

export function useAccount() {
  return useQuery({
    queryKey: accountQueryKey,
    queryFn: fetchAccount,
    staleTime: 30_000,
  });
}

export function homeForRole(role: AppRole | null | undefined): string {
  if (role === "admin") return "/admin";
  if (role === "supplier") return "/supplier/dashboard";
  return "/buyer/dashboard";
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };
}
