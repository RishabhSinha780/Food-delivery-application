import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Users, ShoppingBag, DollarSign, Store } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";

type Order = { id: string; status: string; total: number; created_at: string };
type Restaurant = { id: string; name: string; cuisine: string; rating: number };
type Profile = { id: string; display_name: string | null };

export default function AdminDashboard() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<{ user_id: string; role: string }[]>([]);

  useEffect(() => {
    supabase.from("orders").select("*").order("created_at", { ascending: false }).then(({ data }) => setOrders((data ?? []) as Order[]));
    supabase.from("restaurants").select("*").then(({ data }) => setRestaurants((data ?? []) as Restaurant[]));
    supabase.from("profiles").select("id, display_name").then(({ data }) => setProfiles((data ?? []) as Profile[]));
    supabase.from("user_roles").select("user_id, role").then(({ data }) => setRoles(data ?? []));
  }, []);

  const revenue = orders.filter((o) => o.status === "delivered").reduce((s, o) => s + Number(o.total), 0);
  const usersCount = profiles.length;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-12">
        {user && (
          <div className="mb-6 bg-primary-soft border border-primary/20 text-foreground px-4 py-3 rounded-2xl inline-flex items-center gap-2 text-sm font-medium animate-slide-in">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0" />
            Welcome, Admin {user.user_metadata?.display_name || user.email?.split("@")[0]}!
          </div>
        )}
        <p className="label-mono mb-3">(admin)</p>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-8">Operations.</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Stat icon={<DollarSign className="h-4 w-4" />} label="Revenue" value={formatPrice(revenue)} />
          <Stat icon={<ShoppingBag className="h-4 w-4" />} label="Orders" value={String(orders.length)} />
          <Stat icon={<Store className="h-4 w-4" />} label="Restaurants" value={String(restaurants.length)} />
          <Stat icon={<Users className="h-4 w-4" />} label="Users" value={String(usersCount)} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Section title="Recent orders">
            <div className="space-y-2">
              {orders.slice(0, 10).map((o) => (
                <div key={o.id} className="grid grid-cols-[1fr_1.5fr_1fr] items-center text-sm py-2 border-b border-border last:border-0">
                  <span className="mono text-xs">#{o.id.slice(0, 8)}</span>
                  <span className="mono text-xs uppercase text-primary text-center truncate">{o.status.replace(/_/g, " ")}</span>
                  <span className="mono font-semibold text-right">{formatPrice(o.total)}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Restaurants">
            <div className="space-y-2">
              {restaurants.map((r) => (
                <div key={r.id} className="grid grid-cols-[2fr_1.5fr_1fr] items-center text-sm py-2 border-b border-border last:border-0">
                  <span className="font-semibold truncate">{r.name}</span>
                  <span className="text-xs text-muted-foreground text-center truncate">{r.cuisine}</span>
                  <span className="mono text-xs text-right">★ {Number(r.rating).toFixed(1)}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Users & roles">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {profiles.map((p) => {
                const userRoles = roles.filter((r) => r.user_id === p.id).map((r) => r.role);
                return (
                  <div key={p.id} className="flex justify-between items-center text-sm py-2 border-b border-border last:border-0">
                    <span className="font-semibold">{p.display_name || "—"}</span>
                    <span className="mono text-xs text-muted-foreground">{userRoles.join(", ") || "customer"}</span>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Status breakdown">
            <div className="space-y-2">
              {Object.entries(orders.reduce((acc: Record<string, number>, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {})).map(([s, n]) => (
                <div key={s} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
                  <span className="mono text-xs uppercase tracking-wider">{s.replace(/_/g, " ")}</span>
                  <span className="mono">{n}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </Layout>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card-flat p-5">
      <div className="label-mono mb-2 flex items-center gap-1">{icon} {label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-flat p-6">
      <h3 className="font-bold mb-4">{title}</h3>
      {children}
    </div>
  );
}
