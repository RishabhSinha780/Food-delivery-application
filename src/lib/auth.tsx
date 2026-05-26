import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "customer" | "owner" | "delivery" | "admin";

const ROLE_USER_IDS: Record<AppRole, string> = {
  owner: "e7c2a6c9-16c7-4538-b1c3-316e1a032616", // Rishabh Sinha (owns Dominos)
  delivery: "d4dc6921-fa3f-47a8-8186-590e8549c01f", // Delivery User
  admin: "fd72b478-6eae-4b94-9468-47bc9b3ce192", // First User / Admin
  customer: "7f2344ce-61e3-4e1b-9290-88da70669077", // Test customer
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  setMockRole: (role: AppRole | null) => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [mockRole, setMockRoleState] = useState<AppRole | null>(
    localStorage.getItem("mock_role") as AppRole | null
  );
  const [mockUserId, setMockUserId] = useState<string | null>(
    localStorage.getItem("mock_user_id")
  );

  const setMockRole = async (role: AppRole | null) => {
    if (role) {
      localStorage.setItem("mock_role", role);
      setMockRoleState(role);
      const uid = ROLE_USER_IDS[role];
      localStorage.setItem("mock_user_id", uid);
      setMockUserId(uid);
    } else {
      localStorage.removeItem("mock_role");
      localStorage.removeItem("mock_user_id");
      setMockRoleState(null);
      setMockUserId(null);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mockParam = params.get("mock") as AppRole | null;
    if (mockParam && ["customer", "owner", "delivery", "admin"].includes(mockParam)) {
      setMockRole(mockParam);
    }
  }, []);

  useEffect(() => {
    if (mockRole && mockUserId) {
      const mockUser: User = {
        id: mockUserId,
        aud: "authenticated",
        role: "authenticated",
        email: `mock_${mockRole}@example.com`,
        user_metadata: { display_name: `Mock ${mockRole.charAt(0).toUpperCase() + mockRole.slice(1)}` },
        app_metadata: {},
        created_at: new Date().toISOString(),
      };
      setSession({
        access_token: "mock",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock",
        user: mockUser,
      });
      setRoles([mockRole]);
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (localStorage.getItem("mock_role")) return;
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadRoles(s.user.id), 0);
      } else {
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (localStorage.getItem("mock_role")) return;
      setSession(s);
      if (s?.user) loadRoles(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [mockRole, mockUserId]);

  async function loadRoles(uid: string) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles((data ?? []).map((r) => r.role as AppRole));
  }

  const signOut = async () => {
    if (mockRole) {
      await setMockRole(null);
    }
    await supabase.auth.signOut();
  };

  const user = session?.user ?? null;

  return (
    <Ctx.Provider value={{ user, session, roles, loading, signOut, setMockRole }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be inside AuthProvider");
  return v;
};
