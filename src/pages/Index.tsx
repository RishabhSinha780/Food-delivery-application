import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Star, Clock, Filter, Heart, ChefHat, Sparkles } from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import { useFavourites } from "@/lib/favourites";
import { toast } from "sonner";

type Restaurant = {
  id: string; name: string; description: string | null; cuisine: string;
  image_url: string | null; rating: number; price_for_two: number;
  delivery_minutes: number; city: string;
};

export default function Index() {
  const { user, roles, loading } = useAuth();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const { favIds, toggleFavourite } = useFavourites();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});
  const [loadingRests, setLoadingRests] = useState(true);
  const [q, setQ] = useState("");
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [sort, setSort] = useState<"rating" | "price-asc" | "price-desc">("rating");
  const [curatedTab, setCuratedTab] = useState<"trending" | "top" | "nearby">("trending");

  useEffect(() => {
    if (!loading && user) {
      if (roles.includes("admin")) {
        navigate("/admin", { replace: true });
      } else if (roles.includes("owner")) {
        navigate("/owner", { replace: true });
      } else if (roles.includes("delivery")) {
        navigate("/delivery", { replace: true });
      }
    }
  }, [user, roles, loading, navigate]);

  const loadRestaurantsAndCounts = async () => {
    setLoadingRests(true);
    const isMock = localStorage.getItem("mock_role") !== null || localStorage.getItem("mock_restaurants") !== null;

    if (isMock) {
      const data = JSON.parse(localStorage.getItem("mock_restaurants") || "[]") as Restaurant[];
      setRestaurants(data);

      // Load mock order counts
      const counts: Record<string, number> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("mock_orders_")) {
          const orders = JSON.parse(localStorage.getItem(key) || "[]") as any[];
          const restId = key.substring("mock_orders_".length);
          counts[restId] = (counts[restId] || 0) + orders.length;
        }
      }
      setOrderCounts(counts);
      setLoadingRests(false);
      return;
    }

    try {
      const { data: rests, error: restsErr } = await supabase.from("restaurants").select("*");
      if (restsErr) throw restsErr;
      setRestaurants((rests ?? []) as Restaurant[]);

      const { data: orders, error: ordersErr } = await supabase.from("orders").select("restaurant_id");
      if (!ordersErr && orders) {
        const counts: Record<string, number> = {};
        orders.forEach((o) => {
          counts[o.restaurant_id] = (counts[o.restaurant_id] || 0) + 1;
        });
        setOrderCounts(counts);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load kitchens. Please try again.");
    } finally {
      setLoadingRests(false);
    }
  };

  useEffect(() => {
    loadRestaurantsAndCounts();
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

  // Recommendation Lists
  const trendingRests = useMemo(() => {
    return [...restaurants]
      .sort((a, b) => (orderCounts[b.id] || 0) - (orderCounts[a.id] || 0))
      .slice(0, 3);
  }, [restaurants, orderCounts]);

  const topRests = useMemo(() => {
    return [...restaurants]
      .filter((r) => r.rating >= 4.5)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);
  }, [restaurants]);

  const nearbyRests = useMemo(() => {
    return [...restaurants]
      .filter((r) => r.city.toLowerCase() === "brooklyn") // Default city check
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);
  }, [restaurants]);

  const curatedList = curatedTab === "trending" ? trendingRests : curatedTab === "top" ? topRests : nearbyRests;

  return (
    <Layout>
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-12 animate-slide-in">
        {user && (
          <div className="mb-6 bg-primary-soft border border-primary/20 text-foreground px-4 py-3 rounded-2xl inline-flex items-center gap-2 text-sm font-medium animate-slide-in">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0" />
            Welcome, {user.user_metadata?.display_name || user.email?.split("@")[0]}!
          </div>
        )}
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
            className="h-14 pl-12 rounded-2xl bg-card border-border text-base shadow-sm focus:border-primary"
          />
        </div>
      </section>

      {/* Curated Collections Section */}
      {!loadingRests && restaurants.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 mb-16 animate-slide-in">
          <p className="label-mono mb-3 flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-primary" /> (curated collections)</p>
          
          <div className="flex gap-4 border-b border-border/40 pb-2 mb-6">
            <button
              onClick={() => setCuratedTab("trending")}
              className={`pb-2 px-1 text-sm font-semibold transition-all border-b-2 -mb-2.5 ${
                curatedTab === "trending"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              🔥 Most Ordered
            </button>
            <button
              onClick={() => setCuratedTab("top")}
              className={`pb-2 px-1 text-sm font-semibold transition-all border-b-2 -mb-2.5 ${
                curatedTab === "top"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              ⭐ Top Rated
            </button>
            <button
              onClick={() => setCuratedTab("nearby")}
              className={`pb-2 px-1 text-sm font-semibold transition-all border-b-2 -mb-2.5 ${
                curatedTab === "nearby"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              📍 Popular Nearby
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {curatedList.map((r) => (
              <Link key={`curated-${r.id}`} to={`/restaurant/${r.id}`} className="group card-flat p-3 hover:border-primary/60 transition-all hover:-translate-y-1 relative bg-primary-soft/5 border-primary/10">
                <div className="bg-muted h-48 w-full rounded-xl overflow-hidden mb-3 relative border border-border">
                  {r.image_url ? (
                    <img src={r.image_url} alt={r.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-xs text-muted-foreground font-semibold gap-1">
                      <ChefHat className="h-6 w-6 text-muted-foreground/35" />
                      <span>Provender Selection</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFavourite(r.id);
                    }}
                    className="absolute top-3 right-3 p-2 bg-background/80 hover:bg-background text-foreground hover:text-red-500 rounded-full backdrop-blur-sm border border-border shadow-sm transition-all duration-300 z-10"
                  >
                    <Heart
                      className={`h-4 w-4 transition-colors ${
                        favIds.includes(r.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"
                      }`}
                    />
                  </button>
                </div>
                <div className="px-1">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <h3 className="font-bold text-base leading-tight truncate">{r.name}</h3>
                    <span className="mono text-[10px] bg-primary-soft text-accent-foreground px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 shrink-0">
                      <Star className="h-2.5 w-2.5 fill-current text-primary" /> {Number(r.rating).toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{r.cuisine} · {r.city}</p>
                </div>
              </Link>
            ))}
            {curatedList.length === 0 && (
              <div className="col-span-full py-8 text-center text-sm text-muted-foreground bg-muted/20 rounded-2xl border border-border/40">
                No kitchens match this collection collection yet.
              </div>
            )}
          </div>
        </section>
      )}

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

        {loadingRests ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="card-flat p-3 animate-pulse">
                <div className="bg-muted h-52 w-full rounded-xl mb-4" />
                <div className="h-6 bg-muted rounded w-2/3 mb-2" />
                <div className="h-4 bg-muted rounded w-full mb-3" />
                <div className="h-4 bg-muted rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((r) => (
                <Link key={r.id} to={`/restaurant/${r.id}`} className="group card-flat p-3 hover:border-primary/60 transition-all hover:-translate-y-1">
                  <div className="bg-muted h-52 w-full rounded-xl overflow-hidden mb-4 relative border border-border">
                    {r.image_url ? (
                      <img src={r.image_url} alt={r.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-sm text-muted-foreground font-semibold gap-1">
                        <ChefHat className="h-8 w-8 text-muted-foreground/35" />
                        <span>Fresh Kitchen</span>
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleFavourite(r.id);
                      }}
                      className="absolute top-3 right-3 p-2 bg-background/80 hover:bg-background text-foreground hover:text-red-500 rounded-full backdrop-blur-sm border border-border shadow-sm transition-all duration-300 z-10"
                    >
                      <Heart
                        className={`h-4 w-4 transition-colors ${
                          favIds.includes(r.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="px-1">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h3 className="text-lg font-bold leading-tight">{r.name}</h3>
                      <span className="mono text-xs bg-primary-soft text-accent-foreground px-2 py-1 rounded inline-flex items-center gap-1 shrink-0">
                        <Star className="h-3 w-3 fill-current text-primary" /> {Number(r.rating).toFixed(1)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-1">{r.cuisine} · {r.description}</p>
                    <div className="flex justify-between items-center mono text-xs text-muted-foreground border-t border-border pt-3">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {r.delivery_minutes} min</span>
                      <span>{formatPrice(r.price_for_two)} for two</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-20 text-muted-foreground card-flat max-w-xl mx-auto border-dashed">
                <Filter className="h-8 w-8 mx-auto mb-3 opacity-40 text-primary" />
                <h3 className="font-bold text-lg mb-1">No kitchens match your filters</h3>
                <p className="text-sm">Try broadening your search term or select a different cuisine.</p>
              </div>
            )}
          </>
        )}
      </section>
    </Layout>
  );
}
