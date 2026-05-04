import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Check, Clock, Truck, Package, ChefHat, Bike, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type Order = { id: string; status: string; total: number; subtotal: number; delivery_fee: number; address_line: string; city: string; payment_method: string; restaurant_id: string; created_at: string };
type Item = { name: string; price: number; qty: number };
type Delivery = { partner_id: string | null; status: string; eta_minutes: number | null; current_lat: number | null; current_lng: number | null };

const STAGES = [
  { key: "pending", label: "Placed", icon: Check },
  { key: "accepted", label: "Accepted", icon: ChefHat },
  { key: "preparing", label: "Preparing", icon: ChefHat },
  { key: "ready", label: "Ready", icon: Package },
  { key: "picked_up", label: "Picked up", icon: Bike },
  { key: "on_the_way", label: "On the way", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Check },
];

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [restName, setRestName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: o } = await supabase.from("orders").select("*").eq("id", id).single();
      setOrder(o as Order);
      if (o) {
        const { data: r } = await supabase.from("restaurants").select("name").eq("id", o.restaurant_id).single();
        setRestName(r?.name || "");
      }
      const { data: it } = await supabase.from("order_items").select("name, price, qty").eq("order_id", id);
      setItems((it ?? []) as Item[]);
      const { data: d } = await supabase.from("deliveries").select("*").eq("order_id", id).maybeSingle();
      setDelivery(d as Delivery | null);
    };
    load();

    const ch = supabase.channel(`order-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, (p) => setOrder(p.new as Order))
      .on("postgres_changes", { event: "*", schema: "public", table: "deliveries", filter: `order_id=eq.${id}` }, (p) => setDelivery(p.new as Delivery))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  async function submitReview() {
    if (!order || !user) return;
    const { error } = await supabase.from("reviews").insert({
      customer_id: user.id, restaurant_id: order.restaurant_id,
      delivery_partner_id: delivery?.partner_id || null,
      rating, comment: comment || null,
    });
    if (error) toast.error(error.message); else toast.success("Thanks for the review");
    setComment("");
  }

  if (!order) return <Layout><div className="p-12 label-mono">Loading…</div></Layout>;
  const stageIdx = STAGES.findIndex((s) => s.key === order.status);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <p className="label-mono mb-3">(order #{order.id.slice(0, 8)})</p>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-2">Tracking your meal.</h1>
        <p className="text-muted-foreground mb-8">From <b className="text-foreground">{restName}</b></p>

        {order.status === "cancelled" || order.status === "rejected" ? (
          <div className="card-flat p-6 mb-8 border-destructive/50">
            <div className="font-bold text-destructive mb-1">Order {order.status}</div>
            <p className="text-sm text-muted-foreground">This order won't be delivered.</p>
          </div>
        ) : (
          <div className="card-flat p-6 mb-8">
            <div className="grid grid-cols-7 gap-2">
              {STAGES.map((s, idx) => {
                const Icon = s.icon;
                const active = idx <= stageIdx;
                return (
                  <div key={s.key} className="text-center">
                    <div className={`mx-auto h-10 w-10 rounded-full grid place-items-center mb-2 transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className={`mono text-[10px] uppercase tracking-wider ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</div>
                  </div>
                );
              })}
            </div>
            {delivery?.eta_minutes && order.status !== "delivered" && (
              <div className="mt-6 pt-6 border-t border-border flex items-center justify-between mono text-sm">
                <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" /> ETA: {delivery.eta_minutes} min</span>
                {delivery.partner_id && <span className="text-muted-foreground">Partner assigned</span>}
              </div>
            )}
          </div>
        )}

        {/* Mock map */}
        <div className="card-flat p-0 overflow-hidden mb-8">
          <div className="aspect-[16/7] bg-gradient-to-br from-primary-soft via-muted to-primary-soft relative">
            <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
            <div className="absolute top-1/3 left-1/4 flex flex-col items-center"><div className="bg-foreground text-background rounded-full p-2"><ChefHat className="h-4 w-4" /></div><span className="mono text-[10px] mt-1">RESTAURANT</span></div>
            <div className="absolute bottom-1/4 right-1/4 flex flex-col items-center"><div className="bg-primary text-primary-foreground rounded-full p-2"><MapPin className="h-4 w-4" /></div><span className="mono text-[10px] mt-1">YOU</span></div>
            {(order.status === "picked_up" || order.status === "on_the_way") && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-pulse"><div className="bg-card border-2 border-primary text-primary rounded-full p-2"><Bike className="h-4 w-4" /></div><span className="mono text-[10px] mt-1">RIDER</span></div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="card-flat p-6">
            <h3 className="font-bold mb-3">Items</h3>
            <div className="space-y-2 mono text-sm">
              {items.map((i, idx) => <div key={idx} className="flex justify-between"><span className="text-muted-foreground">{i.qty}× {i.name}</span><span>${(i.price * i.qty).toFixed(2)}</span></div>)}
              <div className="flex justify-between font-bold text-base font-sans pt-2 border-t border-border"><span>Total</span><span>${Number(order.total).toFixed(2)}</span></div>
            </div>
          </div>
          <div className="card-flat p-6">
            <h3 className="font-bold mb-3">Delivery</h3>
            <p className="text-sm">{order.address_line}</p>
            <p className="text-sm text-muted-foreground">{order.city}</p>
            <p className="mono text-xs uppercase mt-3 text-muted-foreground">Payment: {order.payment_method}</p>
          </div>
        </div>

        {order.status === "delivered" && (
          <div className="card-flat p-6 mt-8">
            <h3 className="font-bold mb-3">Rate your experience</h3>
            <div className="flex gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)}>
                  <Star className={`h-7 w-7 ${n <= rating ? "fill-primary text-primary" : "text-muted"}`} />
                </button>
              ))}
            </div>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional comment..." rows={3} />
            <Button onClick={submitReview} className="mt-3 rounded-full bg-foreground text-background hover:bg-foreground/90">Submit review</Button>
          </div>
        )}

        <div className="mt-8 text-center"><Link to="/" className="label-mono hover:text-foreground">← Back to restaurants</Link></div>
      </div>
    </Layout>
  );
}
