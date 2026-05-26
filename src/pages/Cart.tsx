import { useNavigate } from "react-router-dom";
import { Trash2, Minus, Plus, ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";
import { useCart } from "@/lib/cart";
import { useCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";

export default function Cart() {
  const { items, setQty, remove, subtotal } = useCart();
  const { formatPrice } = useCurrency();
  const nav = useNavigate();
  const fee = items.length ? 3 : 0;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-12 animate-slide-in">
        <Button variant="ghost" size="sm" className="mb-6 inline-flex items-center gap-1.5 pl-0 text-muted-foreground hover:text-foreground hover:bg-transparent" onClick={() => nav(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <p className="label-mono mb-3">(cart)</p>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-8">Your order</h1>

        {items.length === 0 ? (
          <div className="card-flat p-12 text-center">
            <p className="text-muted-foreground mb-6">Your cart is empty.</p>
            <Button onClick={() => nav("/")} className="rounded-full bg-foreground text-background hover:bg-foreground/90">Browse kitchens</Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">From <b className="text-foreground">{items[0].restaurant_name}</b></p>
            <div className="space-y-3 mb-8">
              {items.map((i) => (
                <div key={i.id} className="card-flat p-4 flex items-center gap-4">
                  <div className="bg-muted h-16 w-16 rounded-lg overflow-hidden flex-shrink-0">
                    {i.image_url && <img src={i.image_url} alt={i.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{i.name}</div>
                    <div className="mono text-sm text-muted-foreground">{formatPrice(i.price)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => setQty(i.id, i.qty - 1)}><Minus className="h-3 w-3" /></Button>
                    <span className="mono w-6 text-center">{i.qty}</span>
                    <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => setQty(i.id, i.qty + 1)}><Plus className="h-3 w-3" /></Button>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
            <div className="card-flat p-6 space-y-2 mono text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{formatPrice(fee)}</span></div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-border"><span>Total</span><span>{formatPrice(subtotal + fee)}</span></div>
            </div>
            <Button onClick={() => nav("/checkout")} className="w-full mt-6 h-14 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold">
              Proceed to checkout
            </Button>
          </>
        )}
      </div>
    </Layout>
  );
}
