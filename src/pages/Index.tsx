import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Star, Clock, Filter } from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

type Restaurant = {
  id: string; name: string; description: string | null; cuisine: string;
  image_url: string | null; rating: number; price_for_two: number;
  delivery_minutes: number; city: string;
};

export default function Index() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [q, setQ] = useState("");
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [sort, setSort] = useState<"rating" | "price-asc" | "price-desc">("rating");

  useEffect(() => {
    supabase.from("restaurants").select("*").then(({ data }) => setRestaurants(data ?? []));
  }, []);

  const cuisines = useMemo(() => Array.from(new Set(restaurants.map((r) => r.cuisine))), [restaurants]);
  const filtered = useMemo(() => {
    let list = restaurants.filter((r) =>
      (!cuisine || r.cuisine === cuisine) &&
      (!q || r.name.toLowerCase().includes(q.toLowerCase()) || r.cuisine.toLowerCase().includes(q.toLowerCase()))
    );
    if (sort === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price_for_two - b.price_for_two);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price_for_two - a.price_for_two);
    return list;
  }, [restaurants, q, cuisine, sort]);

  return (
    <Layout>
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-12 animate-slide-in">
        <p className="label-mono mb-4">(a) the city is hungry</p>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-[0.95] text-balance">
          Crave the city,<br />delivered uncompromised.
        </h1>
        <div className="mt-8 max-w-xl relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search for pasta, tacos, or local gems..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-14 pl-12 rounded-2xl bg-card border-border text-base"
          />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 mb-10">
        <div className="flex justify-between items-end mb-4">
          <p className="label-mono">(b) by cuisine</p>
          <select value={sort} onChange={(e) => setSort(e.target.value as "rating" | "price-asc" | "price-desc")} className="mono text-xs uppercase tracking-widest bg-transparent border border-border rounded-full px-4 py-2">
            <option value="rating">sort: rating</option>
            <option value="price-asc">sort: price ↑</option>
            <option value="price-desc">sort: price ↓</option>
          </select>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6">
          <button onClick={() => setCuisine(null)} className={`chip whitespace-nowrap ${!cuisine ? "bg-foreground text-background border-foreground" : ""}`}>All</button>
          {cuisines.map((c) => (
            <button key={c} onClick={() => setCuisine(c === cuisine ? null : c)} className={`chip whitespace-nowrap ${cuisine === c ? "bg-foreground text-background border-foreground" : ""}`}>{c}</button>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-bold">Kitchens near you</h2>
          <span className="label-mono">{filtered.length} results</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((r) => (
            <Link key={r.id} to={`/restaurant/${r.id}`} className="group card-flat p-3 hover:border-primary/60 transition-all hover:-translate-y-1">
              <div className="bg-muted h-52 w-full rounded-xl overflow-hidden mb-4">
                {r.image_url && <img src={r.image_url} alt={r.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
              </div>
              <div className="px-1">
                <div className="flex justify-between items-start mb-1 gap-2">
                  <h3 className="text-lg font-bold leading-tight">{r.name}</h3>
                  <span className="mono text-xs bg-primary-soft text-accent-foreground px-2 py-1 rounded inline-flex items-center gap-1 shrink-0">
                    <Star className="h-3 w-3 fill-current" /> {Number(r.rating).toFixed(1)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-1">{r.cuisine} · {r.description}</p>
                <div className="flex justify-between items-center mono text-xs text-muted-foreground border-t border-border pt-3">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {r.delivery_minutes} min</span>
                  <span>${Number(r.price_for_two)} for two</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Filter className="h-8 w-8 mx-auto mb-3 opacity-40" />
            No kitchens match your filters.
          </div>
        )}
      </section>
    </Layout>
  );
}
