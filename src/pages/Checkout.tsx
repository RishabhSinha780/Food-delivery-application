import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { CreditCard, Banknote, MapPin, Plus, ArrowLeft } from "lucide-react";
import { useAddresses } from "./Addresses";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const checkoutSchema = z.object({
  selectedId: z.string(),
  label: z.string().trim().max(50, "Label cannot exceed 50 characters").optional(),
  postal_code: z.string().trim().max(20, "Postal code cannot exceed 20 characters").optional(),
  line1: z.string().trim().max(200, "Street address cannot exceed 200 characters").optional(),
  city: z.string().trim().max(100, "City cannot exceed 100 characters").optional(),
  notes: z.string().trim().max(500, "Notes cannot exceed 500 characters").optional(),
  payment: z.enum(["card", "cod"]),
  save: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.selectedId === "new") {
    if (!data.line1 || data.line1.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Street address is required (min 3 characters)",
        path: ["line1"],
      });
    }
    if (!data.city || data.city.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "City is required (min 2 characters)",
        path: ["city"],
      });
    }
    if (!data.label || data.label.trim().length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Label is required",
        path: ["label"],
      });
    }
  }
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const { items, subtotal, restaurantId, clear } = useCart();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const nav = useNavigate();
  const { addresses, refresh } = useAddresses();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      selectedId: "new",
      label: "Home",
      postal_code: "",
      line1: "",
      city: "Brooklyn",
      notes: "",
      payment: "card",
      save: true
    }
  });

  const selectedId = watch("selectedId");
  const payment = watch("payment");
  const save = watch("save");

  // Redirect if cart is empty
  useEffect(() => {
    if (!items.length) {
      nav("/cart");
    }
  }, [items, nav]);

  // Auto-select first saved address on load
  useEffect(() => {
    if (addresses.length > 0 && selectedId === "new") {
      setValue("selectedId", addresses[0].id);
    }
  }, [addresses]);

  if (!items.length) return null;
  const fee = 3, total = subtotal + fee;

  const selected = addresses.find((a) => a.id === selectedId);

  async function placeOrder(data: CheckoutFormValues) {
    if (!user) { toast.error("Please sign in"); nav("/auth"); return; }

    let line1 = "", city = "Brooklyn";
    if (data.selectedId === "new") {
      line1 = data.line1!.trim();
      city = data.city!.trim();
    } else if (selected) {
      line1 = selected.line1;
      city = selected.city;
    } else {
      toast.error("Please select a delivery address");
      return;
    }

    setLoading(true);

    const isMock = localStorage.getItem("mock_role") !== null;
    let eta = 35;

    if (isMock) {
      const mockRests = JSON.parse(localStorage.getItem("mock_restaurants") || "[]");
      const r = mockRests.find((item: any) => item.id === restaurantId);
      if (r && r.delivery_minutes) eta = Number(r.delivery_minutes);
    } else {
      try {
        const { data: restData } = await supabase
          .from("restaurants")
          .select("delivery_minutes")
          .eq("id", restaurantId!)
          .single();
        if (restData?.delivery_minutes) eta = Number(restData.delivery_minutes);
      } catch (err) {
        console.error("Error fetching restaurant delivery minutes:", err);
      }
    }

    if (isMock) {
      const newOrderId = `order-${Math.random().toString(36).substr(2, 9)}`;
      
      if (data.selectedId === "new" && data.save) {
        const mockAddresses = JSON.parse(localStorage.getItem("mock_addresses") || "[]");
        mockAddresses.push({
          id: `address-${Math.random().toString(36).substr(2, 9)}`,
          user_id: user.id,
          label: data.label!.trim() || "Home",
          line1, city,
          postal_code: data.postal_code?.trim() || null,
        });
        localStorage.setItem("mock_addresses", JSON.stringify(mockAddresses));
      }

      const mockOrdersKey = `mock_orders_${restaurantId}`;
      const mockOrders = JSON.parse(localStorage.getItem(mockOrdersKey) || "[]");
      const newOrder = {
        id: newOrderId,
        customer_id: user.id,
        restaurant_id: restaurantId!,
        subtotal, delivery_fee: fee, total, payment_method: data.payment,
        address_line: line1, city, notes: data.notes || null,
        status: data.payment === "card" ? "accepted" : "pending",
        created_at: new Date().toISOString()
      };
      mockOrders.unshift(newOrder);
      localStorage.setItem(mockOrdersKey, JSON.stringify(mockOrders));

      const customerOrdersKey = `mock_customer_orders_${user.id}`;
      const customerOrders = JSON.parse(localStorage.getItem(customerOrdersKey) || "[]");
      customerOrders.unshift(newOrder);
      localStorage.setItem(customerOrdersKey, JSON.stringify(customerOrders));

      const mockOrderItemsKey = `mock_order_items_${newOrderId}`;
      const lineItems = items.map((i) => ({ order_id: newOrderId, menu_item_id: i.id, name: i.name, price: i.price, qty: i.qty }));
      localStorage.setItem(mockOrderItemsKey, JSON.stringify(lineItems));

      const mockDeliveryKey = `mock_delivery_${newOrderId}`;
      localStorage.setItem(mockDeliveryKey, JSON.stringify({ order_id: newOrderId, eta_minutes: eta, status: data.payment === "card" ? "accepted" : "pending" }));

      const mockAllDeliveries = JSON.parse(localStorage.getItem("mock_all_deliveries") || "[]");
      mockAllDeliveries.push({
        id: `del-${Math.random().toString(36).substr(2, 9)}`,
        order_id: newOrderId,
        eta_minutes: eta,
        status: data.payment === "card" ? "accepted" : "pending",
        partner_id: null,
        created_at: new Date().toISOString()
      });
      localStorage.setItem("mock_all_deliveries", JSON.stringify(mockAllDeliveries));

      setLoading(false);
      clear();
      toast.success(data.payment === "card" ? "Payment successful (mock)" : "Order placed");
      nav(`/track/${newOrderId}`);
      return;
    }

    try {
      if (data.selectedId === "new" && data.save) {
        await supabase.from("addresses").insert({
          user_id: user.id,
          label: data.label!.trim() || "Home",
          line1, city,
          postal_code: data.postal_code?.trim() || null,
        });
        refresh();
      }

      const { data: order, error } = await supabase.from("orders").insert({
        customer_id: user.id, restaurant_id: restaurantId!,
        subtotal, delivery_fee: fee, total, payment_method: data.payment,
        address_line: line1, city, notes: data.notes || null,
        status: data.payment === "card" ? "accepted" : "pending",
      }).select().single();
      if (error || !order) { setLoading(false); toast.error(error?.message || "Failed"); return; }

      const lineItems = items.map((i) => ({ order_id: order.id, menu_item_id: i.id, name: i.name, price: i.price, qty: i.qty }));
      await supabase.from("order_items").insert(lineItems);
      await supabase.from("deliveries").insert({ order_id: order.id, eta_minutes: eta });

      setLoading(false);
      clear();
      toast.success(data.payment === "card" ? "Payment successful (mock)" : "Order placed");
      nav(`/track/${order.id}`);
    } catch (err: any) {
      setLoading(false);
      toast.error(err.message || "Something went wrong placing the order");
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-12 animate-slide-in">
        <Button variant="ghost" size="sm" className="mb-6 inline-flex items-center gap-1.5 pl-0 text-muted-foreground hover:text-foreground hover:bg-transparent" onClick={() => nav("/cart")}>
          <ArrowLeft className="h-4 w-4" /> Back to Cart
        </Button>
        <p className="label-mono mb-3">(checkout)</p>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-8">Almost there.</h1>

        <form onSubmit={handleSubmit(placeOrder)} className="grid md:grid-cols-[1fr_320px] gap-8">
          <div className="space-y-6">
            <div className="card-flat p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Delivery address</h3>
                <Link to="/addresses" className="text-xs label-mono text-primary hover:underline">Manage →</Link>
              </div>

              <RadioGroup value={selectedId} onValueChange={(v) => setValue("selectedId", v)} className="space-y-2">
                {addresses.map((a) => (
                  <label key={a.id} className={`flex items-start gap-3 border rounded-xl p-4 cursor-pointer transition-all ${selectedId === a.id ? "border-primary bg-primary-soft text-primary font-semibold" : "border-border text-muted-foreground hover:bg-muted/10"}`}>
                    <RadioGroupItem value={a.id} className="mt-1" />
                    <MapPin className="h-5 w-5 mt-0.5" />
                    <div className="flex-1 text-foreground">
                      <div className="font-semibold">{a.label}</div>
                      <div className="text-xs text-muted-foreground">{a.line1}</div>
                      <div className="text-xs text-muted-foreground">{a.city}{a.postal_code ? `, ${a.postal_code}` : ""}</div>
                    </div>
                  </label>
                ))}
                <label className={`flex items-center gap-3 border rounded-xl p-4 cursor-pointer transition-all ${selectedId === "new" ? "border-primary bg-primary-soft text-primary font-semibold" : "border-border text-muted-foreground hover:bg-muted/10"}`}>
                  <RadioGroupItem value="new" />
                  <Plus className="h-5 w-5" />
                  <div className="font-semibold text-foreground">Use a new address</div>
                </label>
              </RadioGroup>

              {selectedId === "new" && (
                <div className="space-y-3 mt-4 pt-4 border-t border-border animate-slide-in">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="checkout-label">Label</Label>
                      <Input id="checkout-label" {...register("label")} placeholder="Home, Work..." />
                      {errors.label && <p className="text-xs text-red-500 font-semibold mt-1">{errors.label.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="checkout-postal">Postal code</Label>
                      <Input id="checkout-postal" {...register("postal_code")} />
                      {errors.postal_code && <p className="text-xs text-red-500 font-semibold mt-1">{errors.postal_code.message}</p>}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="checkout-line1">Street address</Label>
                    <Input id="checkout-line1" {...register("line1")} placeholder="123 Bedford Ave, Apt 4B" />
                    {errors.line1 && <p className="text-xs text-red-500 font-semibold mt-1">{errors.line1.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="checkout-city">City</Label>
                    <Input id="checkout-city" {...register("city")} />
                    {errors.city && <p className="text-xs text-red-500 font-semibold mt-1">{errors.city.message}</p>}
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <input type="checkbox" checked={save} onChange={(e) => setValue("save", e.target.checked)} className="rounded border-border text-primary focus:ring-primary" />
                    Save to my address book
                  </label>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-border/40">
                <Label htmlFor="checkout-notes">Notes (optional)</Label>
                <Textarea id="checkout-notes" {...register("notes")} placeholder="Buzzer, gate code, allergies..." rows={2} />
                {errors.notes && <p className="text-xs text-red-500 font-semibold mt-1">{errors.notes.message}</p>}
              </div>
            </div>

            <div className="card-flat p-6">
              <h3 className="font-bold mb-4">Payment method</h3>
              <RadioGroup value={payment} onValueChange={(v) => setValue("payment", v as any)} className="space-y-2">
                <label className={`flex items-center gap-3 border rounded-xl p-4 cursor-pointer transition-all ${payment === "card" ? "border-primary bg-primary-soft text-primary font-semibold" : "border-border text-muted-foreground hover:bg-muted/10"}`}>
                  <RadioGroupItem value="card" /> <CreditCard className="h-5 w-5" />
                  <div className="flex-1 text-foreground"><div className="font-semibold">Card (mock)</div><div className="text-xs text-muted-foreground">Demo only — no charge</div></div>
                </label>
                <label className={`flex items-center gap-3 border rounded-xl p-4 cursor-pointer transition-all ${payment === "cod" ? "border-primary bg-primary-soft text-primary font-semibold" : "border-border text-muted-foreground hover:bg-muted/10"}`}>
                  <RadioGroupItem value="cod" /> <Banknote className="h-5 w-5" />
                  <div className="flex-1 text-foreground"><div className="font-semibold">Cash on delivery</div><div className="text-xs text-muted-foreground">Pay when it arrives</div></div>
                </label>
              </RadioGroup>
            </div>
          </div>

          <div className="card-flat p-6 h-fit space-y-3 mono text-sm sticky top-24">
            <h3 className="font-bold text-base font-sans mb-2">Order summary</h3>
            {items.map((i) => (
              <div key={i.id} className="flex justify-between"><span className="text-muted-foreground">{i.qty}× {i.name}</span><span>{formatPrice(i.price * i.qty)}</span></div>
            ))}
            <div className="border-t border-border pt-3 space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{formatPrice(fee)}</span></div>
              <div className="flex justify-between font-bold text-base font-sans pt-2 border-t border-border"><span>Total</span><span>{formatPrice(total)}</span></div>
            </div>
            <Button type="submit" disabled={loading} className="w-full mt-3 h-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-sm">
              {loading ? "Placing..." : `Place order · ${formatPrice(total)}`}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
