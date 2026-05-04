import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Edit, DollarSign, ShoppingBag } from "lucide-react";

type Restaurant = { id: string; name: string; cuisine: string; description: string | null; image_url: string | null; price_for_two: number; delivery_minutes: number };
type MenuItem = { id: string; restaurant_id: string; name: string; description: string | null; price: number; image_url: string | null; category: string | null; is_available: boolean };
type Order = { id: string; status: string; total: number; created_at: string; address_line: string };

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("restaurants").select("*").eq("owner_id", user.id);
    const list = (data ?? []) as Restaurant[];
    setRestaurants(list);
    if (list.length && !selected) setSelected(list[0]);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!selected) return;
    supabase.from("menu_items").select("*").eq("restaurant_id", selected.id).then(({ data }) => setMenu((data ?? []) as MenuItem[]));
    supabase.from("orders").select("*").eq("restaurant_id", selected.id).order("created_at", { ascending: false }).then(({ data }) => setOrders((data ?? []) as Order[]));
    const ch = supabase.channel(`owner-${selected.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${selected.id}` }, () => {
        supabase.from("orders").select("*").eq("restaurant_id", selected.id).order("created_at", { ascending: false }).then(({ data }) => setOrders((data ?? []) as Order[]));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selected]);

  const revenue = orders.filter((o) => o.status === "delivered").reduce((s, o) => s + Number(o.total), 0);
  const pending = orders.filter((o) => ["pending", "accepted", "preparing", "ready"].includes(o.status)).length;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <p className="label-mono mb-3">(owner dashboard)</p>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-8">Your kitchen.</h1>

        {restaurants.length === 0 ? (
          <CreateRestaurant onCreated={load} />
        ) : (
          <>
            <div className="flex gap-2 mb-8 overflow-x-auto">
              {restaurants.map((r) => (
                <button key={r.id} onClick={() => setSelected(r)} className={`chip whitespace-nowrap ${selected?.id === r.id ? "bg-foreground text-background border-foreground" : ""}`}>{r.name}</button>
              ))}
              <button onClick={() => setSelected(null)} className="chip whitespace-nowrap"><Plus className="h-3 w-3 mr-1" /> New</button>
            </div>

            {!selected ? <CreateRestaurant onCreated={load} /> : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <Stat label="Revenue (delivered)" value={`$${revenue.toFixed(2)}`} icon={<DollarSign className="h-4 w-4" />} />
                  <Stat label="Total orders" value={String(orders.length)} icon={<ShoppingBag className="h-4 w-4" />} />
                  <Stat label="Open orders" value={String(pending)} />
                </div>

                <Tabs defaultValue="orders">
                  <TabsList className="mb-6 rounded-full bg-muted p-1">
                    <TabsTrigger value="orders" className="rounded-full">Orders</TabsTrigger>
                    <TabsTrigger value="menu" className="rounded-full">Menu</TabsTrigger>
                  </TabsList>

                  <TabsContent value="orders">
                    <OrdersList orders={orders} onChange={async (id, status) => {
                      await supabase.from("orders").update({ status }).eq("id", id);
                      toast.success(`Order → ${status}`);
                    }} />
                  </TabsContent>

                  <TabsContent value="menu">
                    <MenuEditor restaurantId={selected.id} menu={menu} onChange={() => supabase.from("menu_items").select("*").eq("restaurant_id", selected.id).then(({ data }) => setMenu((data ?? []) as MenuItem[]))} />
                  </TabsContent>
                </Tabs>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="card-flat p-5">
      <div className="label-mono mb-2 flex items-center gap-1">{icon}{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

function CreateRestaurant({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [f, setF] = useState({ name: "", cuisine: "", description: "", image_url: "", price_for_two: 25, delivery_minutes: 30 });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("restaurants").insert({ ...f, owner_id: user.id });
    if (error) toast.error(error.message); else { toast.success("Restaurant created"); onCreated(); }
  };
  return (
    <form onSubmit={submit} className="card-flat p-6 max-w-2xl space-y-4">
      <h3 className="text-xl font-bold">Set up your restaurant</h3>
      <div><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>
      <div><Label>Cuisine</Label><Input value={f.cuisine} onChange={(e) => setF({ ...f, cuisine: e.target.value })} placeholder="Italian, Mexican..." required /></div>
      <div><Label>Description</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div><Label>Hero image URL</Label><Input value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} placeholder="https://..." /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Price for two ($)</Label><Input type="number" value={f.price_for_two} onChange={(e) => setF({ ...f, price_for_two: Number(e.target.value) })} /></div>
        <div><Label>Delivery time (min)</Label><Input type="number" value={f.delivery_minutes} onChange={(e) => setF({ ...f, delivery_minutes: Number(e.target.value) })} /></div>
      </div>
      <Button type="submit" className="rounded-full bg-foreground text-background hover:bg-foreground/90">Create</Button>
    </form>
  );
}

const NEXT: Record<string, string | null> = { pending: "accepted", accepted: "preparing", preparing: "ready", ready: "picked_up", picked_up: "on_the_way", on_the_way: "delivered", delivered: null };

function OrdersList({ orders, onChange }: { orders: Order[]; onChange: (id: string, status: string) => void }) {
  if (!orders.length) return <div className="card-flat p-12 text-center text-muted-foreground">No orders yet.</div>;
  return (
    <div className="space-y-3">
      {orders.map((o) => {
        const next = NEXT[o.status];
        return (
          <div key={o.id} className="card-flat p-5 flex items-center justify-between gap-4">
            <div>
              <div className="font-bold">#{o.id.slice(0, 8)}</div>
              <div className="text-sm text-muted-foreground">{o.address_line}</div>
              <div className="mono text-xs text-muted-foreground mt-1">{new Date(o.created_at).toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="mono">${Number(o.total).toFixed(2)}</div>
              <div className="mono text-xs uppercase tracking-wider text-primary mb-2">{o.status.replace(/_/g, " ")}</div>
              <div className="flex gap-2 justify-end">
                {o.status === "pending" && (
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => onChange(o.id, "rejected")}>Reject</Button>
                )}
                {next && <Button size="sm" className="rounded-full bg-foreground text-background hover:bg-foreground/90" onClick={() => onChange(o.id, next)}>→ {next.replace(/_/g, " ")}</Button>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MenuEditor({ restaurantId, menu, onChange }: { restaurantId: string; menu: MenuItem[]; onChange: () => void }) {
  const [editing, setEditing] = useState<Partial<MenuItem> | null>(null);

  const save = async () => {
    if (!editing?.name || editing.price == null) { toast.error("Name and price required"); return; }
    const payload = { restaurant_id: restaurantId, name: editing.name, description: editing.description ?? null, price: editing.price, image_url: editing.image_url ?? null, category: editing.category ?? null, is_available: editing.is_available ?? true };
    const { error } = editing.id
      ? await supabase.from("menu_items").update(payload).eq("id", editing.id)
      : await supabase.from("menu_items").insert(payload);
    if (error) toast.error(error.message); else { toast.success("Saved"); setEditing(null); onChange(); }
  };
  const remove = async (id: string) => { await supabase.from("menu_items").delete().eq("id", id); onChange(); };

  return (
    <div>
      <Button onClick={() => setEditing({ is_available: true })} className="mb-4 rounded-full bg-foreground text-background hover:bg-foreground/90"><Plus className="h-4 w-4 mr-1" /> Add item</Button>
      {editing && (
        <div className="card-flat p-6 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><Label>Category</Label><Input value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="Mains, Sides..." /></div>
          </div>
          <div><Label>Description</Label><Textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Price ($)</Label><Input type="number" step="0.01" value={editing.price ?? ""} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></div>
            <div><Label>Image URL</Label><Input value={editing.image_url || ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} /></div>
          </div>
          <div className="flex items-center gap-2"><Switch checked={editing.is_available ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_available: v })} /><Label>Available</Label></div>
          <div className="flex gap-2"><Button onClick={save} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">Save</Button><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>
        </div>
      )}
      <div className="space-y-2">
        {menu.map((m) => (
          <div key={m.id} className="card-flat p-4 flex items-center gap-4">
            <div className="bg-muted h-14 w-14 rounded-lg overflow-hidden flex-shrink-0">{m.image_url && <img src={m.image_url} className="w-full h-full object-cover" />}</div>
            <div className="flex-1">
              <div className="font-semibold">{m.name} {!m.is_available && <span className="text-xs text-destructive">(unavailable)</span>}</div>
              <div className="text-sm text-muted-foreground">{m.category} · ${Number(m.price)}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setEditing(m)}><Edit className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
