import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { CreditCard, Banknote, MapPin, Plus } from "lucide-react";
import { useAddresses } from "./Addresses";

export default function Checkout() {
  const { items, subtotal, restaurantId, clear } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const { addresses, refresh } = useAddresses();
  const [selectedId, setSelectedId] = useState<string>("new");
  const [address, setAddress] = useState({ label: "Home", line1: "", city: "Brooklyn", postal_code: "", notes: "", save: true });
  const [payment, setPayment] = useState<"card" | "cod">("card");
  const [loading, setLoading] = useState(false);

  if (!items.length) { nav("/cart"); return null; }
  const fee = 3, total = subtotal + fee;

  // Auto-select first saved address
  if (selectedId === "new" && addresses.length > 0 && !address.line1) {
    setSelectedId(addresses[0].id);
  }

  const selected = addresses.find((a) => a.id === selectedId);

  async function placeOrder() {
    if (!user) { toast.error("Please sign in"); nav("/auth"); return; }

    let line1 = "", city = "Brooklyn";
    if (selectedId === "new") {
      if (!address.line1.trim()) { toast.error("Address required"); return; }
      line1 = address.line1.trim();
      city = address.city.trim() || "Brooklyn";
    } else if (selected) {
      line1 = selected.line1;
      city = selected.city;
    } else {
      toast.error("Select an address"); return;
    }

    setLoading(true);

    if (selectedId === "new" && address.save) {
      await supabase.from("addresses").insert({
        user_id: user.id,
        label: address.label.trim() || "Home",
        line1, city,
        postal_code: address.postal_code.trim() || null,
      });
      refresh();
    }

    const { data: order, error } = await supabase.from("orders").insert({
      customer_id: user.id, restaurant_id: restaurantId!,
      subtotal, delivery_fee: fee, total, payment_method: payment,
      address_line: line1, city, notes: address.notes || null,
      status: payment === "card" ? "accepted" : "pending",
    }).select().single();
    if (error || !order) { setLoading(false); toast.error(error?.message || "Failed"); return; }

    const lineItems = items.map((i) => ({ order_id: order.id, menu_item_id: i.id, name: i.name, price: i.price, qty: i.qty }));
    await supabase.from("order_items").insert(lineItems);
    await supabase.from("deliveries").insert({ order_id: order.id, eta_minutes: 30 });

    setLoading(false);
    clear();
    toast.success(payment === "card" ? "Payment successful (mock)" : "Order placed");
    nav(`/track/${order.id}`);
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="label-mono mb-3">(checkout)</p>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-8">Almost there.</h1>

        <div className="grid md:grid-cols-[1fr_320px] gap-8">
          <div className="space-y-6">
            <div className="card-flat p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Delivery address</h3>
                <Link to="/addresses" className="text-xs label-mono text-primary hover:underline">Manage →</Link>
              </div>

              <RadioGroup value={selectedId} onValueChange={setSelectedId} className="space-y-2">
                {addresses.map((a) => (
                  <label key={a.id} className={`flex items-start gap-3 border rounded-xl p-4 cursor-pointer ${selectedId === a.id ? "border-primary bg-primary-soft" : "border-border"}`}>
                    <RadioGroupItem value={a.id} className="mt-1" />
                    <MapPin className="h-5 w-5 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold">{a.label}</div>
                      <div className="text-xs text-muted-foreground">{a.line1}</div>
                      <div className="text-xs text-muted-foreground">{a.city}{a.postal_code ? `, ${a.postal_code}` : ""}</div>
                    </div>
                  </label>
                ))}
                <label className={`flex items-center gap-3 border rounded-xl p-4 cursor-pointer ${selectedId === "new" ? "border-primary bg-primary-soft" : "border-border"}`}>
                  <RadioGroupItem value="new" />
                  <Plus className="h-5 w-5" />
                  <div className="font-semibold">Use a new address</div>
                </label>
              </RadioGroup>

              {selectedId === "new" && (
                <div className="space-y-3 mt-4 pt-4 border-t border-border">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><Label>Label</Label><Input maxLength={50} value={address.label} onChange={(e) => setAddress({ ...address, label: e.target.value })} /></div>
                    <div><Label>Postal code</Label><Input maxLength={20} value={address.postal_code} onChange={(e) => setAddress({ ...address, postal_code: e.target.value })} /></div>
                  </div>
                  <div><Label>Street address</Label><Input maxLength={200} value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} placeholder="123 Bedford Ave, Apt 4B" /></div>
                  <div><Label>City</Label><Input maxLength={100} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} /></div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" checked={address.save} onChange={(e) => setAddress({ ...address, save: e.target.checked })} />
                    Save to my address book
                  </label>
                </div>
              )}

              <div className="mt-4">
                <Label>Notes (optional)</Label>
                <Textarea value={address.notes} onChange={(e) => setAddress({ ...address, notes: e.target.value })} placeholder="Buzzer, gate code, allergies..." rows={2} maxLength={500} />
              </div>
            </div>

            <div className="card-flat p-6">
              <h3 className="font-bold mb-4">Payment method</h3>
              <RadioGroup value={payment} onValueChange={(v) => setPayment(v as "card" | "cod")} className="space-y-2">
                <label className={`flex items-center gap-3 border rounded-xl p-4 cursor-pointer ${payment === "card" ? "border-primary bg-primary-soft" : "border-border"}`}>
                  <RadioGroupItem value="card" /> <CreditCard className="h-5 w-5" />
                  <div className="flex-1"><div className="font-semibold">Card (mock)</div><div className="text-xs text-muted-foreground">Demo only — no charge</div></div>
                </label>
                <label className={`flex items-center gap-3 border rounded-xl p-4 cursor-pointer ${payment === "cod" ? "border-primary bg-primary-soft" : "border-border"}`}>
                  <RadioGroupItem value="cod" /> <Banknote className="h-5 w-5" />
                  <div className="flex-1"><div className="font-semibold">Cash on delivery</div><div className="text-xs text-muted-foreground">Pay when it arrives</div></div>
                </label>
              </RadioGroup>
            </div>
          </div>

          <div className="card-flat p-6 h-fit space-y-3 mono text-sm sticky top-24">
            <h3 className="font-bold text-base font-sans mb-2">Order summary</h3>
            {items.map((i) => (
              <div key={i.id} className="flex justify-between"><span className="text-muted-foreground">{i.qty}× {i.name}</span><span>${(i.price * i.qty).toFixed(2)}</span></div>
            ))}
            <div className="border-t border-border pt-3 space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>${fee.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base font-sans pt-2 border-t border-border"><span>Total</span><span>${total.toFixed(2)}</span></div>
            </div>
            <Button onClick={placeOrder} disabled={loading} className="w-full mt-3 h-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
              {loading ? "Placing..." : `Place order · $${total.toFixed(2)}`}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
