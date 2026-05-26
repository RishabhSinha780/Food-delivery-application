import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bike, MapPin, Package } from "lucide-react";

type Delivery = { id: string; order_id: string; partner_id: string | null; status: string; eta_minutes: number | null };
type Order = { id: string; address_line: string; city: string; total: number; restaurant_id: string; status: string };

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [available, setAvailable] = useState<(Delivery & { order: Order; restaurant_name?: string })[]>([]);
  const [mine, setMine] = useState<(Delivery & { order: Order; restaurant_name?: string })[]>([]);

  const load = async () => {
    if (!user) return;
    const isMock = localStorage.getItem("mock_role") !== null;
    if (isMock) {
      const allDels = JSON.parse(localStorage.getItem("mock_all_deliveries") || "[]") as Delivery[];
      
      const enrich = (rows: Delivery[]) => {
        const mockRests = JSON.parse(localStorage.getItem("mock_restaurants") || "[]") as any[];
        const restMap = new Map(mockRests.map((r) => [r.id, r.name]));

        const allOrders: Order[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("mock_orders_")) {
            const orders = JSON.parse(localStorage.getItem(key) || "[]") as Order[];
            allOrders.push(...orders);
          }
        }
        const orderMap = new Map(allOrders.map((o) => [o.id, o]));
        return rows.map((d) => {
          const ord = orderMap.get(d.order_id);
          return {
            ...d,
            order: ord as Order,
            restaurant_name: ord ? (restMap.get(ord.restaurant_id) || "Dominos") : "Dominos"
          };
        }).filter((d) => d.order);
      };

      const avail = allDels.filter((d) => d.partner_id === null);
      const ours = allDels.filter((d) => d.partner_id === user.id);

      setAvailable(enrich(avail));
      setMine(enrich(ours));
      return;
    }

    const { data: avail } = await supabase.from("deliveries").select("*").is("partner_id", null);
    const { data: ours } = await supabase.from("deliveries").select("*").eq("partner_id", user.id);
    const enrich = async (rows: Delivery[]) => {
      if (!rows.length) return [];
      const ids = rows.map((r) => r.order_id);
      const { data: orders } = await supabase.from("orders").select("*").in("id", ids);
      const restIds = Array.from(new Set((orders ?? []).map((o) => o.restaurant_id)));
      const { data: rests } = await supabase.from("restaurants").select("id, name").in("id", restIds);
      const restMap = new Map(rests?.map((r) => [r.id, r.name]) || []);
      const orderMap = new Map((orders ?? []).map((o) => [o.id, o]));
      return rows.map((d) => ({ ...d, order: orderMap.get(d.order_id) as Order, restaurant_name: restMap.get(orderMap.get(d.order_id)?.restaurant_id || "") }));
    };
    setAvailable((await enrich((avail ?? []) as Delivery[])).filter((d) => d.order));
    setMine((await enrich((ours ?? []) as Delivery[])).filter((d) => d.order));
  };

  useEffect(() => { load(); }, [user]);
  useEffect(() => {
    const isMock = localStorage.getItem("mock_role") !== null;
    if (isMock) {
      const interval = setInterval(load, 2000);
      return () => clearInterval(interval);
    }
    const ch = supabase.channel("delivery-feed").on("postgres_changes", { event: "*", schema: "public", table: "deliveries" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const accept = async (d: Delivery) => {
    if (!user) return;
    const isMock = localStorage.getItem("mock_role") !== null;
    if (isMock) {
      const allDels = JSON.parse(localStorage.getItem("mock_all_deliveries") || "[]") as Delivery[];
      const idx = allDels.findIndex((item) => item.id === d.id);
      if (idx !== -1) {
        allDels[idx].partner_id = user.id;
        allDels[idx].status = "assigned";
        localStorage.setItem("mock_all_deliveries", JSON.stringify(allDels));
      }
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("mock_orders_") || key.startsWith("mock_customer_orders_"))) {
          const orders = JSON.parse(localStorage.getItem(key) || "[]") as any[];
          const oIdx = orders.findIndex((o) => o.id === d.order_id);
          if (oIdx !== -1) {
            orders[oIdx].status = "assigned";
            localStorage.setItem(key, JSON.stringify(orders));
          }
        }
      }

      const mockDeliveryKey = `mock_delivery_${d.order_id}`;
      const mockDel = JSON.parse(localStorage.getItem(mockDeliveryKey) || "{}");
      mockDel.partner_id = user.id;
      mockDel.status = "assigned";
      localStorage.setItem(mockDeliveryKey, JSON.stringify(mockDel));

      toast.success("Delivery accepted");
      load();
      return;
    }

    const { error } = await supabase.from("deliveries").update({ partner_id: user.id, status: "assigned" }).eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Delivery accepted");
    load();
  };

  const updateStatus = async (d: Delivery & { order: Order }, status: "picked_up" | "on_the_way" | "delivered") => {
    const isMock = localStorage.getItem("mock_role") !== null;
    if (isMock) {
      const allDels = JSON.parse(localStorage.getItem("mock_all_deliveries") || "[]") as Delivery[];
      const idx = allDels.findIndex((item) => item.id === d.id);
      if (idx !== -1) {
        allDels[idx].status = status;
        localStorage.setItem("mock_all_deliveries", JSON.stringify(allDels));
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("mock_orders_") || key.startsWith("mock_customer_orders_"))) {
          const orders = JSON.parse(localStorage.getItem(key) || "[]") as any[];
          const oIdx = orders.findIndex((o) => o.id === d.order_id);
          if (oIdx !== -1) {
            orders[oIdx].status = status;
            localStorage.setItem(key, JSON.stringify(orders));
          }
        }
      }

      const mockDeliveryKey = `mock_delivery_${d.order_id}`;
      const mockDel = JSON.parse(localStorage.getItem(mockDeliveryKey) || "{}");
      mockDel.status = status;
      localStorage.setItem(mockDeliveryKey, JSON.stringify(mockDel));

      toast.success(`Status → ${status}`);
      load();
      return;
    }

    await supabase.from("deliveries").update({ status }).eq("id", d.id);
    await supabase.from("orders").update({ status }).eq("id", d.order_id);
    toast.success(`Status → ${status}`);
    load();
  };

  const shareLocation = async (d: Delivery) => {
    if (!navigator.geolocation) return toast.error("Geolocation not available");
    const isMock = localStorage.getItem("mock_role") !== null;
    if (isMock) {
      toast.success("Location shared (Mock)");
      return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await supabase.from("deliveries").update({ current_lat: pos.coords.latitude, current_lng: pos.coords.longitude }).eq("id", d.id);
      toast.success("Location shared");
    }, () => toast.error("Permission denied"));
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-12">
        {user && (
          <div className="mb-6 bg-primary-soft border border-primary/20 text-foreground px-4 py-3 rounded-2xl inline-flex items-center gap-2 text-sm font-medium animate-slide-in">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0" />
            Welcome, {user.user_metadata?.display_name || user.email?.split("@")[0]}!
          </div>
        )}
        <p className="label-mono mb-3">(delivery partner)</p>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-8">On the road.</h1>

        <h2 className="text-xl font-bold mb-4">Active deliveries</h2>
        {mine.length === 0 && <div className="card-flat p-8 text-center text-muted-foreground mb-10">No active deliveries.</div>}
        <div className="space-y-3 mb-12">
          {mine.map((d) => (
            <div key={d.id} className="card-flat p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-bold">{d.restaurant_name}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" /> {d.order.address_line}, {d.order.city}</div>
                </div>
                <div className="mono text-xs uppercase tracking-wider text-primary">{d.status.replace(/_/g, " ")}</div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {d.status === "assigned" && <Button size="sm" className="rounded-full" onClick={() => updateStatus(d, "picked_up")}>Mark picked up</Button>}
                {d.status === "picked_up" && <Button size="sm" className="rounded-full" onClick={() => updateStatus(d, "on_the_way")}>On the way</Button>}
                {d.status === "on_the_way" && <Button size="sm" className="rounded-full bg-primary text-primary-foreground" onClick={() => updateStatus(d, "delivered")}>Delivered</Button>}
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => shareLocation(d)}><MapPin className="h-3 w-3 mr-1" /> Share location</Button>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold mb-4">Available pickups <span className="label-mono">{available.length}</span></h2>
        <div className="space-y-3">
          {available.length === 0 && <div className="card-flat p-8 text-center text-muted-foreground">Nothing available right now.</div>}
          {available.map((d) => (
            <div key={d.id} className="card-flat p-5 flex justify-between items-center">
              <div>
                <div className="font-bold flex items-center gap-2"><Package className="h-4 w-4" /> {d.restaurant_name}</div>
                <div className="text-sm text-muted-foreground mt-1">→ {d.order.address_line}, {d.order.city}</div>
                <div className="mono text-xs text-muted-foreground mt-1 font-semibold">{formatPrice(d.order.total)}</div>
              </div>
              <Button onClick={() => accept(d)} className="rounded-full bg-foreground text-background hover:bg-foreground/90"><Bike className="h-4 w-4 mr-1" /> Accept</Button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
