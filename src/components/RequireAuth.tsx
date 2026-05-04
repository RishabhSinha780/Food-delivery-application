import { Navigate, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/lib/auth";

export default function RequireAuth({ children, role }: { children: React.ReactNode; role?: AppRole }) {
  const { user, roles, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="min-h-[60vh] grid place-items-center label-mono">Loading…</div>;
  if (!user) return <Navigate to="/auth" state={{ from: loc.pathname }} replace />;
  if (role && !roles.includes(role) && !roles.includes("admin")) {
    return <div className="max-w-xl mx-auto p-12 text-center">
      <h1 className="text-3xl font-bold mb-2">Access denied</h1>
      <p className="text-muted-foreground">You need the <b>{role}</b> role to view this page.</p>
    </div>;
  }
  return <>{children}</>;
}
