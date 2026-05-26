import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Edit, DollarSign, ShoppingBag, History, ArrowLeft } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

type Restaurant = { id: string; name: string; cuisine: string; description: string | null; image_url: string | null; price_for_two: number; delivery_minutes: number };
type MenuItem = { id: string; restaurant_id: string; name: string; description: string | null; price: number; image_url: string | null; category: string | null; is_available: boolean };
type Order = { id: string; status: string; total: number; created_at: string; address_line: string; customer_id: string };

export default function OwnerDashboard() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [itemStats, setItemStats] = useState<Record<string, number>>({});
  const [orderItemsMap, setOrderItemsMap] = useState<Record<string, { name: string; qty: number; price: number }[]>>({});
  const [customerProfiles, setCustomerProfiles] = useState<Record<string, { display_name: string; phone?: string }>>({});
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [partnerProfiles, setPartnerProfiles] = useState<Record<string, { display_name: string }>>({});
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);

  const getMockRestaurants = (): Restaurant[] => {
    const data = localStorage.getItem("mock_restaurants");
    if (data) return JSON.parse(data);
    const initial = [
      {
        id: "dominos-mock-id",
        name: "Dominos",
        cuisine: "Pizza",
        description: "Legendary pizzas cooked in 30 minutes.",
        image_url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
        price_for_two: 25,
        delivery_minutes: 30,
        owner_id: "e7c2a6c9-16c7-4538-b1c3-316e1a032616"
      }
    ];
    localStorage.setItem("mock_restaurants", JSON.stringify(initial));
    return initial;
  };

  const getMockMenu = (restaurantId: string): MenuItem[] => {
    const data = localStorage.getItem(`mock_menu_${restaurantId}`);
    if (data) return JSON.parse(data);
    const initial = [
      {
        id: "menu-1",
        restaurant_id: restaurantId,
        name: "Pepperoni Pizza",
        description: "Double pepperoni, double cheese, classic crust.",
        price: 14.99,
        image_url: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600",
        category: "Pizza",
        is_available: true
      },
      {
        id: "menu-2",
        restaurant_id: restaurantId,
        name: "Garlic Breadsticks",
        description: "Baked fresh with garlic butter and herbs.",
        price: 5.99,
        image_url: "https://images.unsplash.com/photo-1544982503-9f984c14501a?w=600",
        category: "Sides",
        is_available: true
      }
    ];
    localStorage.setItem(`mock_menu_${restaurantId}`, JSON.stringify(initial));
    return initial;
  };

  const getMockOrders = (restaurantId: string): Order[] => {
    const data = localStorage.getItem(`mock_orders_${restaurantId}`);
    if (data) return JSON.parse(data);
    const initial = [
      {
        id: "order-1",
        status: "pending",
        total: 20.98,
        created_at: new Date().toISOString(),
        address_line: "123 Main St",
        customer_id: "customer-1"
      },
      {
        id: "order-2",
        status: "delivered",
        total: 14.99,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        address_line: "456 Oak Ave",
        customer_id: "customer-2"
      }
    ];
    localStorage.setItem(`mock_orders_${restaurantId}`, JSON.stringify(initial));
    return initial;
  };

  const load = async (selectNewId?: string) => {
    if (!user) return;
    const isMock = localStorage.getItem("mock_role") !== null;
    if (isMock) {
      const list = getMockRestaurants();
      setRestaurants(list);
      if (selectNewId) {
        const found = list.find(r => r.id === selectNewId);
        if (found) setSelected(found);
      } else if (list.length && !selected) {
        setSelected(list[0]);
      }
      return;
    }

    try {
      const { data } = await supabase.from("restaurants").select("*").eq("owner_id", user.id);
      const list = (data ?? []) as Restaurant[];
      setRestaurants(list);
      if (selectNewId) {
        const found = list.find(r => r.id === selectNewId);
        if (found) setSelected(found);
      } else if (list.length && !selected) {
        setSelected(list[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadDetails = async () => {
    if (!selected) return;
    const isMock = localStorage.getItem("mock_role") !== null;
    if (isMock) {
      const menuData = getMockMenu(selected.id);
      setMenu(menuData);
      const ordersData = getMockOrders(selected.id);
      setOrders(ordersData);
      
      const statsMap: Record<string, number> = {};
      statsMap["menu-1"] = 3;
      statsMap["menu-2"] = 1;
      setItemStats(statsMap);

      // Seed mock order items if needed
      const mockOrderItemsKey1 = "mock_order_items_order-1";
      if (!localStorage.getItem(mockOrderItemsKey1)) {
        localStorage.setItem(mockOrderItemsKey1, JSON.stringify([{ name: "Pepperoni Pizza", qty: 1, price: 14.99 }, { name: "Garlic Breadsticks", qty: 1, price: 5.99 }]));
      }
      const mockOrderItemsKey2 = "mock_order_items_order-2";
      if (!localStorage.getItem(mockOrderItemsKey2)) {
        localStorage.setItem(mockOrderItemsKey2, JSON.stringify([{ name: "Pepperoni Pizza", qty: 1, price: 14.99 }]));
      }

      const itemsMap: Record<string, { name: string; qty: number; price: number }[]> = {};
      ordersData.forEach(o => {
        const oItems = JSON.parse(localStorage.getItem(`mock_order_items_${o.id}`) || "[]");
        itemsMap[o.id] = oItems;
      });
      setOrderItemsMap(itemsMap);

      setCustomerProfiles({
        "customer-1": { display_name: "Rishabh Sinha", phone: "9876543210" },
        "customer-2": { display_name: "John Doe" }
      });
      setDeliveries([
        { id: "del-1", order_id: "order-2", partner_id: "delivery-1", status: "delivered" }
      ]);
      setPartnerProfiles({
        "delivery-1": { display_name: "Ravi Kumar" }
      });
      return;
    }

    try {
      const { data: menuData } = await supabase.from("menu_items").select("*").eq("restaurant_id", selected.id);
      setMenu((menuData ?? []) as MenuItem[]);

      const { data: ordersData } = await supabase.from("orders").select("*").eq("restaurant_id", selected.id).order("created_at", { ascending: false });
      const oList = (ordersData ?? []) as Order[];
      setOrders(oList);

      if (oList.length > 0) {
        const orderIds = oList.map(o => o.id);
        const { data: oItems } = await supabase.from("order_items").select("order_id, menu_item_id, name, qty, price").in("order_id", orderIds);
        const statsMap: Record<string, number> = {};
        const itemsMap: Record<string, { name: string; qty: number; price: number }[]> = {};
        oItems?.forEach(item => {
          if (item.menu_item_id) {
            statsMap[item.menu_item_id] = (statsMap[item.menu_item_id] || 0) + (item.qty || 1);
          }
          if (!itemsMap[item.order_id]) {
            itemsMap[item.order_id] = [];
          }
          itemsMap[item.order_id].push({ name: item.name, qty: item.qty, price: item.price });
        });
        setItemStats(statsMap);
        setOrderItemsMap(itemsMap);

        const customerIds = Array.from(new Set(oList.map(o => o.customer_id)));
        const { data: cProfiles } = await supabase.from("profiles").select("id, display_name, phone").in("id", customerIds);
        const cMap: Record<string, { display_name: string; phone?: string }> = {};
        cProfiles?.forEach(p => {
          cMap[p.id] = { display_name: p.display_name || "Guest", phone: p.phone };
        });
        setCustomerProfiles(cMap);

        const { data: dData } = await supabase.from("deliveries").select("*").in("order_id", orderIds);
        const dList = dData ?? [];
        setDeliveries(dList);

        const partnerIds = Array.from(new Set(dList.filter(d => d.partner_id).map(d => d.partner_id)));
        if (partnerIds.length > 0) {
          const { data: pProfiles } = await supabase.from("profiles").select("id, display_name").in("id", partnerIds);
          const pMap: Record<string, { display_name: string }> = {};
          pProfiles?.forEach(p => {
            pMap[p.id] = { display_name: p.display_name || "Delivery Partner" };
          });
          setPartnerProfiles(pMap);
        } else {
          setPartnerProfiles({});
        }
      } else {
        setItemStats({});
        setOrderItemsMap({});
        setCustomerProfiles({});
        setDeliveries([]);
        setPartnerProfiles({});
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    loadDetails();
    if (!selected) return;
    const isMock = localStorage.getItem("mock_role") !== null;
    if (isMock) return;

    const ch = supabase.channel(`owner-${selected.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${selected.id}` }, () => {
        loadDetails();
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selected]);

  const revenue = orders.filter((o) => o.status === "delivered").reduce((s, o) => s + Number(o.total), 0);
  const pending = orders.filter((o) => ["pending", "accepted", "preparing", "ready"].includes(o.status)).length;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-12">
        {user && (
          <div className="mb-6 bg-primary-soft border border-primary/20 text-foreground px-4 py-3 rounded-2xl inline-flex items-center gap-2 text-sm font-medium animate-slide-in">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0" />
            Welcome, {user.user_metadata?.display_name || user.email?.split("@")[0]}!
          </div>
        )}
        <p className="label-mono mb-3">(owner dashboard)</p>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-8">Your kitchen.</h1>

        {restaurants.length === 0 ? (
          <CreateRestaurant onCreated={(newId) => load(newId)} />
        ) : (
          <>
            <div className="flex gap-2 mb-8 overflow-x-auto">
               {restaurants.map((r) => (
                <button key={r.id} onClick={() => setSelected(r)} className={`chip whitespace-nowrap ${selected?.id === r.id ? "bg-foreground text-background border-foreground" : ""}`}>{r.name}</button>
              ))}
              <button onClick={() => setSelected(null)} className="chip whitespace-nowrap"><Plus className="h-3 w-3 mr-1" /> New</button>
            </div>

            {!selected ? <CreateRestaurant onCreated={(newId) => load(newId)} /> : (
              <>
                {/* Selected Restaurant Hero Banner */}
                <div className="relative h-64 w-full rounded-2xl overflow-hidden mb-8 border border-border shadow-md animate-slide-in">
                  {selected.image_url ? (
                    <img src={selected.image_url} alt={selected.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground font-mono">No Image Uploaded</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent flex items-end p-6 justify-between gap-4">
                    <div>
                      <p className="label-mono text-primary font-bold">({selected.cuisine})</p>
                      <h2 className="text-3xl font-extrabold tracking-tighter text-foreground mt-1">{selected.name}</h2>
                      {selected.description && <p className="text-sm text-muted-foreground mt-2 max-w-xl line-clamp-2">{selected.description}</p>}
                    </div>
                    <Button onClick={() => setEditingRestaurant(selected)} className="rounded-full bg-foreground text-background hover:bg-foreground/90 flex items-center gap-1.5 shrink-0 shadow-lg">
                      <Edit className="h-4 w-4" /> Edit Kitchen
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  <Stat label="Revenue (delivered)" value={formatPrice(revenue)} icon={<DollarSign className="h-4 w-4" />} />
                  <Stat label="Total orders" value={String(orders.length)} icon={<ShoppingBag className="h-4 w-4" />} />
                  <Stat label="Open orders" value={String(pending)} />
                </div>

                <Tabs defaultValue="orders">
                  <TabsList className="mb-6 rounded-full bg-muted p-1">
                    <TabsTrigger value="orders" className="rounded-full">Orders</TabsTrigger>
                    <TabsTrigger value="menu" className="rounded-full">Menu</TabsTrigger>
                    <TabsTrigger value="history" className="rounded-full">History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="orders">
                    <OrdersList orders={orders} orderItemsMap={orderItemsMap} onChange={async (id, status) => {
                      const ok = window.confirm(`Are you sure you want to change order status to ${status}, or did you click by mistake?`);
                      if (!ok) return;
                      const isMock = localStorage.getItem("mock_role") !== null;
                      if (isMock) {
                        const mockOrds = JSON.parse(localStorage.getItem(`mock_orders_${selected.id}`) || "[]") as Order[];
                        const index = mockOrds.findIndex(o => o.id === id);
                        if (index !== -1) {
                          mockOrds[index].status = status;
                          localStorage.setItem(`mock_orders_${selected.id}`, JSON.stringify(mockOrds));
                        }
                        toast.success(`Order → ${status}`);
                        loadDetails();
                        return;
                      }
                      await supabase.from("orders").update({ status: status as "accepted" }).eq("id", id);
                      toast.success(`Order → ${status}`);
                      loadDetails();
                    }} />
                  </TabsContent>

                  <TabsContent value="menu">
                    <MenuEditor restaurantId={selected.id} menu={menu} statsMap={itemStats} onChange={loadDetails} />
                  </TabsContent>

                  <TabsContent value="history">
                    <HistoryTab orders={orders} deliveries={deliveries} customerProfiles={customerProfiles} partnerProfiles={partnerProfiles} formatPrice={formatPrice} />
                  </TabsContent>
                </Tabs>
              </>
            )}
          </>
        )}
      </div>

      {/* Edit Restaurant Dialog */}
      <Dialog open={editingRestaurant !== null} onOpenChange={(open) => { if (!open) setEditingRestaurant(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Restaurant Details</DialogTitle>
          </DialogHeader>
          {editingRestaurant && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              const isMock = localStorage.getItem("mock_role") !== null;
              if (isMock) {
                const mockRests = JSON.parse(localStorage.getItem("mock_restaurants") || "[]") as Restaurant[];
                const index = mockRests.findIndex(r => r.id === editingRestaurant.id);
                if (index !== -1) {
                  const updated = {
                    ...mockRests[index],
                    name: editingRestaurant.name,
                    cuisine: editingRestaurant.cuisine,
                    description: editingRestaurant.description,
                    image_url: editingRestaurant.image_url,
                    price_for_two: editingRestaurant.price_for_two,
                    delivery_minutes: editingRestaurant.delivery_minutes,
                  };
                  mockRests[index] = updated;
                  localStorage.setItem("mock_restaurants", JSON.stringify(mockRests));
                  setSelected(updated);
                }
                toast.success("Restaurant updated successfully");
                setEditingRestaurant(null);
                load(editingRestaurant.id);
                return;
              }

              const { error } = await supabase.from("restaurants").update({
                name: editingRestaurant.name,
                cuisine: editingRestaurant.cuisine,
                description: editingRestaurant.description,
                image_url: editingRestaurant.image_url,
                price_for_two: editingRestaurant.price_for_two,
                delivery_minutes: editingRestaurant.delivery_minutes,
              }).eq("id", editingRestaurant.id);
              if (error) {
                toast.error(error.message);
              } else {
                toast.success("Restaurant updated successfully");
                setEditingRestaurant(null);
                load(selected?.id);
                const { data } = await supabase.from("restaurants").select("*").eq("id", selected!.id).single();
                if (data) setSelected(data as Restaurant);
              }
            }} className="space-y-4 pt-2">
              <div><Label>Name</Label><Input value={editingRestaurant.name} onChange={(e) => setEditingRestaurant({ ...editingRestaurant, name: e.target.value })} required /></div>
              <div><Label>Cuisine</Label><Input value={editingRestaurant.cuisine} onChange={(e) => setEditingRestaurant({ ...editingRestaurant, cuisine: e.target.value })} required /></div>
              <div><Label>Description</Label><Textarea value={editingRestaurant.description || ""} onChange={(e) => setEditingRestaurant({ ...editingRestaurant, description: e.target.value })} /></div>
              <ImageUpload value={editingRestaurant.image_url || ""} onChange={(val) => setEditingRestaurant({ ...editingRestaurant, image_url: val })} label="Hero image" />
              <div><Label>Delivery time (min)</Label><Input type="number" value={editingRestaurant.delivery_minutes} onChange={(e) => setEditingRestaurant({ ...editingRestaurant, delivery_minutes: Number(e.target.value) })} /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingRestaurant(null)}>Cancel</Button>
                <Button type="submit" className="rounded-full bg-foreground text-background hover:bg-foreground/90">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
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

function CreateRestaurant({ onCreated }: { onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const [f, setF] = useState({ name: "", cuisine: "", description: "", image_url: "", price_for_two: 25, delivery_minutes: 30 });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const isMock = localStorage.getItem("mock_role") !== null;
    if (isMock) {
      const mockRests = JSON.parse(localStorage.getItem("mock_restaurants") || "[]") as Restaurant[];
      const newId = `restaurant-${Math.random().toString(36).substr(2, 9)}`;
      const newRest = {
        id: newId,
        name: f.name,
        cuisine: f.cuisine,
        description: f.description || null,
        image_url: f.image_url || null,
        price_for_two: f.price_for_two,
        delivery_minutes: f.delivery_minutes,
        owner_id: user.id
      };
      mockRests.push(newRest);
      localStorage.setItem("mock_restaurants", JSON.stringify(mockRests));
      toast.success("Restaurant created");
      onCreated(newId);
      return;
    }

    const { data, error } = await supabase.from("restaurants").insert({ ...f, owner_id: user.id }).select("id").single();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Restaurant created");
      onCreated(data.id);
    }
  };
  return (
    <form onSubmit={submit} className="card-flat p-6 max-w-2xl space-y-4">
      <h3 className="text-xl font-bold">Set up your restaurant</h3>
      <div><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>
      <div><Label>Cuisine</Label><Input value={f.cuisine} onChange={(e) => setF({ ...f, cuisine: e.target.value })} placeholder="Italian, Mexican..." required /></div>
      <div><Label>Description</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <ImageUpload value={f.image_url} onChange={(val) => setF({ ...f, image_url: val })} label="Hero image" />
      <div><Label>Delivery time (min)</Label><Input type="number" value={f.delivery_minutes} onChange={(e) => setF({ ...f, delivery_minutes: Number(e.target.value) })} /></div>
      <Button type="submit" className="rounded-full bg-foreground text-background hover:bg-foreground/90">Create</Button>
    </form>
  );
}

const NEXT: Record<string, string | null> = { pending: "accepted", accepted: "preparing", preparing: "ready", ready: "picked_up", picked_up: "on_the_way", on_the_way: "delivered", delivered: null };

function OrdersList({ orders, orderItemsMap, onChange }: { orders: Order[]; orderItemsMap: Record<string, { name: string; qty: number; price: number }[]>; onChange: (id: string, status: string) => void }) {
  const { formatPrice } = useCurrency();
  if (!orders.length) return <div className="card-flat p-12 text-center text-muted-foreground">No orders yet.</div>;
  return (
    <div className="space-y-3">
      {orders.map((o) => {
        const next = NEXT[o.status];
        const items = orderItemsMap[o.id] || [];
        return (
          <div key={o.id} className="card-flat p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="font-bold text-lg">#{o.id.slice(0, 8)}</div>
              <div className="text-sm text-muted-foreground">{o.address_line}</div>
              <div className="mono text-xs text-muted-foreground mt-1">{new Date(o.created_at).toLocaleString()}</div>
              {items.length > 0 && (
                <div className="mt-3 border-t border-border/60 pt-3 space-y-1.5">
                  <p className="label-mono mb-1 text-[10px] text-muted-foreground">(items ordered)</p>
                  {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between max-w-sm text-sm">
                      <span className="font-medium text-foreground">{item.qty} × {item.name}</span>
                      <span className="text-muted-foreground">{formatPrice(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right flex flex-col items-end shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-border/40">
              <div className="mono font-bold text-lg">{formatPrice(o.total)}</div>
              <div className="mono text-xs uppercase tracking-wider text-primary mb-3 mt-1">{o.status.replace(/_/g, " ")}</div>
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

function MenuEditor({ restaurantId, menu, statsMap, onChange }: { restaurantId: string; menu: MenuItem[]; statsMap: Record<string, number>; onChange: () => void }) {
  const [editing, setEditing] = useState<Partial<MenuItem> | null>(null);
  const { formatPrice } = useCurrency();

  const save = async () => {
    if (!editing?.name || editing.price == null) { toast.error("Name and price required"); return; }
    
    const isEdit = !!editing.id;
    const ok = window.confirm(`Are you sure you want to ${isEdit ? "save changes to" : "add"} this menu item, or did you click by mistake?`);
    if (!ok) return;

    const isMock = localStorage.getItem("mock_role") !== null;
    if (isMock) {
      const mockItems = JSON.parse(localStorage.getItem(`mock_menu_${restaurantId}`) || "[]") as MenuItem[];
      if (isEdit) {
        const index = mockItems.findIndex(i => i.id === editing.id);
        if (index !== -1) {
          mockItems[index] = {
            ...mockItems[index],
            name: editing.name!,
            description: editing.description ?? null,
            price: editing.price!,
            image_url: editing.image_url ?? null,
            category: editing.category ?? null,
            is_available: editing.is_available ?? true
          };
        }
      } else {
        const newItem = {
          id: `menu-${Math.random().toString(36).substr(2, 9)}`,
          restaurant_id: restaurantId,
          name: editing.name!,
          description: editing.description ?? null,
          price: editing.price!,
          image_url: editing.image_url ?? null,
          category: editing.category ?? null,
          is_available: editing.is_available ?? true
        };
        mockItems.push(newItem);
      }
      localStorage.setItem(`mock_menu_${restaurantId}`, JSON.stringify(mockItems));
      toast.success(isEdit ? "Successfully edited the item!" : "Successfully added the item!");
      setEditing(null);
      onChange();
      return;
    }

    const payload = { restaurant_id: restaurantId, name: editing.name, description: editing.description ?? null, price: editing.price, image_url: editing.image_url ?? null, category: editing.category ?? null, is_available: editing.is_available ?? true };
    const { error } = editing.id
      ? await supabase.from("menu_items").update(payload).eq("id", editing.id)
      : await supabase.from("menu_items").insert(payload);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(isEdit ? "Successfully edited the item!" : "Successfully added the item!");
      setEditing(null);
      onChange();
    }
  };

  const remove = async (id: string) => {
    const ok = window.confirm("Are you sure you want to delete this menu item, or did you click by mistake?");
    if (!ok) return;

    const isMock = localStorage.getItem("mock_role") !== null;
    if (isMock) {
      const mockItems = JSON.parse(localStorage.getItem(`mock_menu_${restaurantId}`) || "[]") as MenuItem[];
      const filtered = mockItems.filter(i => i.id !== id);
      localStorage.setItem(`mock_menu_${restaurantId}`, JSON.stringify(filtered));
      toast.success("Successfully deleted the item!");
      onChange();
      return;
    }

    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Successfully deleted the item!");
      onChange();
    }
  };

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
            <div className="flex items-center gap-2 pt-6"><Switch checked={editing.is_available ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_available: v })} /><Label>Available</Label></div>
          </div>
          <ImageUpload value={editing.image_url || ""} onChange={(val) => setEditing({ ...editing, image_url: val })} label="Item Image" />
          <div className="flex gap-2 pt-2"><Button onClick={save} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">Save</Button><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>
        </div>
      )}
      <div className="space-y-2">
        {menu.map((m) => (
          <div key={m.id} className="card-flat p-4 flex items-center gap-4">
            <div className="bg-muted h-14 w-14 rounded-lg overflow-hidden flex-shrink-0">{m.image_url && <img src={m.image_url} className="w-full h-full object-cover" />}</div>
            <div className="flex-1">
              <div className="font-semibold">{m.name} {!m.is_available && <span className="text-xs text-destructive">(unavailable)</span>}</div>
              <div className="text-sm text-muted-foreground">{m.category} · {formatPrice(m.price)}</div>
              <div className="text-xs text-primary font-medium mt-0.5">Ordered {statsMap[m.id] || 0} times</div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setEditing(m)}><Edit className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryTab({
  orders,
  deliveries,
  customerProfiles,
  partnerProfiles,
  formatPrice,
}: {
  orders: Order[];
  deliveries: any[];
  customerProfiles: Record<string, { display_name: string; phone?: string }>;
  partnerProfiles: Record<string, { display_name: string }>;
  formatPrice: (amount: number) => string;
}) {
  const customerOrdersMap: Record<string, Order[]> = {};
  orders.forEach((o) => {
    if (!customerOrdersMap[o.customer_id]) {
      customerOrdersMap[o.customer_id] = [];
    }
    customerOrdersMap[o.customer_id].push(o);
  });

  const partnerDeliveriesMap: Record<string, any[]> = {};
  deliveries.forEach((d) => {
    if (d.partner_id) {
      if (!partnerDeliveriesMap[d.partner_id]) {
        partnerDeliveriesMap[d.partner_id] = [];
      }
      partnerDeliveriesMap[d.partner_id].push(d);
    }
  });

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="card-flat p-6 space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">Customer History</h3>
        {Object.keys(customerOrdersMap).length === 0 ? (
          <p className="text-muted-foreground text-sm">No customer orders yet.</p>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {Object.entries(customerOrdersMap).map(([cid, userOrders]) => {
              const profile = customerProfiles[cid] || { display_name: "Guest" };
              const totalSpend = userOrders.reduce((sum, o) => sum + Number(o.total), 0);
              return (
                <div key={cid} className="p-4 border border-border rounded-xl bg-muted/10 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-base">{profile.display_name}</div>
                      {profile.phone && <div className="text-xs text-muted-foreground">{profile.phone}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{userOrders.length} orders</div>
                      <div className="text-xs text-primary font-bold">{formatPrice(totalSpend)} spent</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground border-t border-border/50 pt-2 space-y-1">
                    {userOrders.map((o) => (
                      <div key={o.id} className="flex justify-between">
                        <span>#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString()}</span>
                        <span className="capitalize">{o.status.replace(/_/g, " ")} ({formatPrice(o.total)})</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card-flat p-6 space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">Delivery Partners</h3>
        {Object.keys(partnerDeliveriesMap).length === 0 ? (
          <p className="text-muted-foreground text-sm">No deliveries assigned to partners yet.</p>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {Object.entries(partnerDeliveriesMap).map(([pid, partnerDels]) => {
              const profile = partnerProfiles[pid] || { display_name: "Delivery Partner" };
              return (
                <div key={pid} className="p-4 border border-border rounded-xl bg-muted/10 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-base">{profile.display_name}</div>
                      <div className="text-xs text-muted-foreground">ID: #{pid.slice(0, 8)}</div>
                    </div>
                    <div className="text-right font-semibold text-sm">
                      {partnerDels.length} deliveries
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground border-t border-border/50 pt-2 space-y-1">
                    {partnerDels.map((d) => (
                      <div key={d.id} className="flex justify-between">
                        <span>Order #{d.order_id.slice(0, 8)}</span>
                        <span className="capitalize text-primary font-medium">{d.status.replace(/_/g, " ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
