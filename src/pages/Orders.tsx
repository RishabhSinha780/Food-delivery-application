import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Order = { id: string; status: string; total: number; created_at: string; restaurant_id: string };

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<(Order & { restaurant_name?: string })[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("orders").select("*").eq("customer_id", user.id).order("created_at", { ascending: false });
      const list = (data ?? []) as Order[];
      const ids = Array.from(new Set(list.map((o) => o.restaurant_id)));
      const { data: rest } = await supabase.from("restaurants").select("id, name").in("id", ids);
      const map = new Map(rest?.map((r) => [r.id, r.name]) || []);
      setOrders(list.map((o) => ({ ...o, restaurant_name: map.get(o.restaurant_id) })));
    })();
  }, [user]);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <p className="label-mono mb-3">(history)</p>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-8">Your orders</h1>
        {orders.length === 0 ? (
          <div className="card-flat p-12 text-center text-muted-foreground">No orders yet.</div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Link key={o.id} to={`/track/${o.id}`} className="card-flat p-5 flex justify-between items-center hover:border-primary/60 transition-colors">
                <div>
                  <div className="font-bold">{o.restaurant_name || "Restaurant"}</div>
                  <div className="mono text-xs text-muted-foreground">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="mono">${Number(o.total).toFixed(2)}</div>
                  <div className="mono text-xs uppercase tracking-wider text-primary">{o.status.replace(/_/g, " ")}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
