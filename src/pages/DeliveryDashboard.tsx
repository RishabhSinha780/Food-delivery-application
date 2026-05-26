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
type RestaurantSummary = { id: string; name: string; cuisine: string };

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  
  const [relationship, setRelationship] = useState<any | null>(null);
  const [allRestaurants, setAllRestaurants] = useState<RestaurantSummary[]>([]);
  const [selectedRestId, setSelectedRestId] = useState<string>("");
  const [loadingRel, setLoadingRel] = useState<boolean>(true);
  
  const [available, setAvailable] = useState<(Delivery & { order: Order; restaurant_name?: string })[]>([]);
  const [mine, setMine] = useState<(Delivery & { order: Order; restaurant_name?: string })[]>([]);

  const loadRelationshipAndRestaurants = async () => {
    if (!user) return;
    const isMock = localStorage.getItem("mock_role") !== null;
    
    if (isMock) {
      // Load mock relationships
      const mockRels = JSON.parse(localStorage.getItem("mock_delivery_relationships") || "[]");
      const rel = mockRels.find((r: any) => r.delivery_id === user.id) || null;
      setRelationship(rel);
      
      const mockRests = JSON.parse(localStorage.getItem("mock_restaurants") || "[]") as RestaurantSummary[];
      setAllRestaurants(mockRests);
      setLoadingRel(false);
      return;
    }

    try {
      setLoadingRel(true);
      // Fetch relationship
      const { data: rel } = await supabase
        .from("delivery_relationships")
        .select("*")
        .eq("delivery_id", user.id)
        .maybeSingle();
      
      setRelationship(rel);

      // Fetch all restaurants
      const { data: rests } = await supabase
        .from("restaurants")
        .select("id, name, cuisine")
        .order("name", { ascending: true });
      
      setAllRestaurants((rests ?? []) as RestaurantSummary[]);
    } catch (err) {
      console.error("Error loading onboarding credentials:", err);
    } finally {
      setLoadingRel(false);
    }
  };

  const requestAccess = async () => {
    if (!user || !selectedRestId) return;
    const isMock = localStorage.getItem("mock_role") !== null;
    
    if (isMock) {
      const mockRels = JSON.parse(localStorage.getItem("mock_delivery_relationships") || "[]");
      const existingIdx = mockRels.findIndex((r: any) => r.delivery_id === user.id);
      
      const selectedRest = allRestaurants.find(r => r.id === selectedRestId);
      const newRel = {
        id: `rel-${Math.random().toString(36).substr(2, 9)}`,
        delivery_id: user.id,
        delivery_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "Delivery Partner",
        restaurant_id: selectedRestId,
        restaurant_name: selectedRest?.name || "Kitchen",
        status: "pending"
      };

      if (existingIdx !== -1) {
        mockRels[existingIdx] = newRel;
      } else {
        mockRels.push(newRel);
      }
      localStorage.setItem("mock_delivery_relationships", JSON.stringify(mockRels));
      toast.success("Request sent to kitchen owner (mock)");
      await loadRelationshipAndRestaurants();
      return;
    }

    try {
      const { error } = await supabase.from("delivery_relationships").insert({
        delivery_id: user.id,
        restaurant_id: selectedRestId,
        status: "pending"
      });
      if (error) throw error;
      toast.success("Request sent to kitchen owner!");
      await loadRelationshipAndRestaurants();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request");
    }
  };

  const cancelRequest = async () => {
    if (!user) return;
    const isMock = localStorage.getItem("mock_role") !== null;
    
    if (isMock) {
      const mockRels = JSON.parse(localStorage.getItem("mock_delivery_relationships") || "[]");
      const filtered = mockRels.filter((r: any) => r.delivery_id !== user.id);
      localStorage.setItem("mock_delivery_relationships", JSON.stringify(filtered));
      toast.success("Request cancelled");
      await loadRelationshipAndRestaurants();
      return;
    }

    try {
      const { error } = await supabase
        .from("delivery_relationships")
        .delete()
        .eq("delivery_id", user.id);
      if (error) throw error;
      toast.success("Request cancelled");
      await loadRelationshipAndRestaurants();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel request");
    }
  };

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

      // Filter available by the approved restaurant
      const mockRels = JSON.parse(localStorage.getItem("mock_delivery_relationships") || "[]");
      const currentRel = mockRels.find((r: any) => r.delivery_id === user.id);
      const approvedRestId = currentRel?.status === "approved" ? currentRel.restaurant_id : null;

      const enrichedAvail = enrich(avail);
      const filteredAvail = approvedRestId 
        ? enrichedAvail.filter(d => d.order && d.order.restaurant_id === approvedRestId)
        : [];

      setAvailable(filteredAvail);
      setMine(enrich(ours));
      return;
    }

    // Live Supabase path
    try {
      // 1. Fetch current approved relationship
      const { data: rel } = await supabase
        .from("delivery_relationships")
        .select("restaurant_id, status")
        .eq("delivery_id", user.id)
        .maybeSingle();

      if (!rel || rel.status !== "approved") {
        setAvailable([]);
        setMine([]);
        return;
      }

      // 2. Fetch deliveries
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

      const enrichedAvail = (await enrich((avail ?? []) as Delivery[])).filter((d) => d.order);
      
      // Filter available deliveries to only show those belonging to the approved restaurant
      const filteredAvail = enrichedAvail.filter(d => d.order && d.order.restaurant_id === rel.restaurant_id);

      setAvailable(filteredAvail);
      setMine((await enrich((ours ?? []) as Delivery[])).filter((d) => d.order));
    } catch (err) {
      console.error("Error loading deliveries:", err);
    }
  };

  useEffect(() => { 
    loadRelationshipAndRestaurants();
  }, [user]);

  useEffect(() => {
    if (relationship?.status === "approved") {
      load();
    }
  }, [relationship]);

  useEffect(() => {
    if (!relationship || relationship.status !== "approved") return;
    
    const isMock = localStorage.getItem("mock_role") !== null;
    if (isMock) {
      const interval = setInterval(load, 2000);
      return () => clearInterval(interval);
    }
    const ch = supabase.channel("delivery-feed").on("postgres_changes", { event: "*", schema: "public", table: "deliveries" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [relationship, user]);

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

  if (loadingRel) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-6 py-12 flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <Bike className="h-10 w-10 text-muted-foreground animate-bounce" />
            <p className="text-sm font-mono text-muted-foreground">Checking credentials...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!relationship || relationship.status !== "approved") {
    const pendingRest = allRestaurants.find(r => r.id === relationship?.restaurant_id);
    
    return (
      <Layout>
        <div className="max-w-xl mx-auto px-6 py-16 animate-slide-in">
          <p className="label-mono mb-3">(delivery onboarding)</p>
          <h1 className="text-4xl font-extrabold tracking-tighter mb-4">Partner setup.</h1>
          <p className="text-muted-foreground mb-8">Before you hit the road, connect with a kitchen to coordinate deliveries.</p>
          
          {relationship?.status === "pending" ? (
            <div className="card-flat p-8 text-center space-y-4 border-yellow-500/20 bg-yellow-500/5">
              <span className="w-3 h-3 rounded-full bg-yellow-500 animate-ping inline-block" />
              <h3 className="text-xl font-bold tracking-tight mt-2">Waiting for approval</h3>
              <p className="text-sm text-muted-foreground">
                Your request to join <span className="font-semibold text-foreground">{pendingRest?.name || "the kitchen"}</span> is pending approval from the kitchen owner.
              </p>
              <div className="pt-4 flex justify-center gap-3">
                <Button variant="outline" size="sm" className="rounded-full text-destructive hover:bg-destructive/10" onClick={cancelRequest}>
                  Cancel Request
                </Button>
              </div>
            </div>
          ) : (
            <div className="card-flat p-6 space-y-6">
              {relationship?.status === "rejected" && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive font-medium mb-4">
                  Your previous request to join {pendingRest?.name || "the kitchen"} was rejected. Please select another kitchen.
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Select a Kitchen</label>
                <select 
                  value={selectedRestId} 
                  onChange={(e) => setSelectedRestId(e.target.value)}
                  className="w-full flex h-12 rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">-- Choose kitchen to work with --</option>
                  {allRestaurants.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.cuisine})</option>
                  ))}
                </select>
              </div>
              
              <Button 
                onClick={requestAccess} 
                disabled={!selectedRestId} 
                className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-bold rounded-xl"
              >
                Submit Request to Kitchen Owner
              </Button>
            </div>
          )}
        </div>
      </Layout>
    );
  }

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
