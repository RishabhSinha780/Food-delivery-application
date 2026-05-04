import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Star, Clock, Plus } from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Restaurant = { id: string; name: string; description: string | null; cuisine: string; image_url: string | null; rating: number; price_for_two: number; delivery_minutes: number; city: string; };
type MenuItem = { id: string; name: string; description: string | null; price: number; image_url: string | null; category: string | null; is_available: boolean };
type Review = { id: string; rating: number; comment: string | null; created_at: string };

export default function RestaurantDetail() {
  const { id } = useParams();
  const [r, setR] = useState<Restaurant | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const { add } = useCart();

  useEffect(() => {
    if (!id) return;
    supabase.from("restaurants").select("*").eq("id", id).single().then(({ data }) => setR(data as Restaurant));
    supabase.from("menu_items").select("*").eq("restaurant_id", id).then(({ data }) => setItems((data ?? []) as MenuItem[]));
    supabase.from("reviews").select("*").eq("restaurant_id", id).order("created_at", { ascending: false }).then(({ data }) => setReviews((data ?? []) as Review[]));
  }, [id]);

  if (!r) return <Layout><div className="max-w-4xl mx-auto p-12 label-mono">Loading…</div></Layout>;

  const categories = Array.from(new Set(items.map((i) => i.category || "Menu")));

  return (
    <Layout>
      <section className="max-w-7xl mx-auto px-6 pt-8">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="bg-muted aspect-[4/3] rounded-2xl overflow-hidden">
            {r.image_url && <img src={r.image_url} alt={r.name} className="w-full h-full object-cover" />}
          </div>
          <div>
            <p className="label-mono mb-3">({r.cuisine.toLowerCase()})</p>
            <h1 className="text-5xl font-extrabold tracking-tighter mb-3">{r.name}</h1>
            <p className="text-muted-foreground mb-6">{r.description}</p>
            <div className="flex gap-4 mono text-sm">
              <span className="bg-primary-soft text-accent-foreground px-3 py-2 rounded-full inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-current" /> {Number(r.rating).toFixed(1)}
              </span>
              <span className="bg-card border border-border px-3 py-2 rounded-full inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {r.delivery_minutes} min
              </span>
              <span className="bg-card border border-border px-3 py-2 rounded-full">${Number(r.price_for_two)} for two</span>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 mt-16">
        <p className="label-mono mb-2">(menu)</p>
        <h2 className="text-3xl font-bold mb-8">What we're serving</h2>
        {categories.map((cat) => (
          <div key={cat} className="mb-12">
            <h3 className="text-sm mono uppercase tracking-widest text-muted-foreground mb-4">{cat}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {items.filter((i) => (i.category || "Menu") === cat).map((m) => (
                <div key={m.id} className="card-flat p-4 flex gap-4 items-center">
                  <div className="bg-muted h-24 w-24 rounded-xl overflow-hidden flex-shrink-0">
                    {m.image_url && <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <h4 className="font-bold">{m.name}</h4>
                      <span className="mono text-sm">${Number(m.price)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{m.description}</p>
                  </div>
                  <Button size="sm" disabled={!m.is_available} onClick={() => { add({ id: m.id, name: m.name, price: Number(m.price), restaurant_id: r.id, restaurant_name: r.name, image_url: m.image_url }); toast.success(`${m.name} added`); }} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="max-w-7xl mx-auto px-6 mt-16 mb-24">
        <p className="label-mono mb-2">(reviews)</p>
        <h2 className="text-3xl font-bold mb-6">What people are saying</h2>
        {reviews.length === 0 && <p className="text-muted-foreground">No reviews yet.</p>}
        <div className="grid md:grid-cols-2 gap-4">
          {reviews.map((rv) => (
            <div key={rv.id} className="card-flat p-5">
              <div className="mono text-sm mb-2 inline-flex items-center gap-1"><Star className="h-3 w-3 fill-current" /> {rv.rating}/5</div>
              <p className="text-sm">{rv.comment}</p>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
