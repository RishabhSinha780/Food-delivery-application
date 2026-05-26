import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, Clock, Heart, HeartOff } from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import { useFavourites } from "@/lib/favourites";

type Restaurant = {
  id: string; name: string; description: string | null; cuisine: string;
  image_url: string | null; rating: number; price_for_two: number;
  delivery_minutes: number; city: string;
};

export default function Favourites() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const { favIds, toggleFavourite, loading: favsLoading } = useFavourites();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const isMock = import.meta.env.DEV && localStorage.getItem("mock_role") !== null;

  const loadData = async () => {
    if (!user || favIds.length === 0) {
      setRestaurants([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (isMock) {
        const allRests = JSON.parse(localStorage.getItem("mock_restaurants") || "[]") as Restaurant[];
        const filtered = allRests.filter(r => favIds.includes(r.id));
        setRestaurants(filtered);
      } else {
        const { data, error } = await supabase
          .from("restaurants")
          .select("*")
          .in("id", favIds);
        if (error) throw error;
        setRestaurants(data ?? []);
      }
    } catch (err) {
      console.error("Error loading favourite restaurants:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, favIds]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-12 animate-slide-in">
        <p className="label-mono mb-3">(favourites)</p>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-8">Your saved kitchens.</h1>

        {loading || favsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="card-flat p-3 animate-pulse">
                <div className="bg-muted h-52 w-full rounded-xl mb-4" />
                <div className="h-6 bg-muted rounded w-2/3 mb-2" />
                <div className="h-4 bg-muted rounded w-full mb-3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : restaurants.length === 0 ? (
          <div className="card-flat p-12 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[300px]">
            <HeartOff className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <h3 className="font-bold text-lg mb-1">No favourites yet</h3>
            <p className="text-sm max-w-sm mb-6">Explore kitchens on the homepage and tap the heart icon to save them here.</p>
            <Link to="/" className="btn-primary rounded-full px-6 py-2 text-sm font-semibold">Browse Kitchens</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((r) => (
              <Link key={r.id} to={`/restaurant/${r.id}`} className="group card-flat p-3 hover:border-primary/60 transition-all hover:-translate-y-1">
                <div className="bg-muted h-52 w-full rounded-xl overflow-hidden mb-4 relative">
                  {r.image_url && <img src={r.image_url} alt={r.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFavourite(r.id);
                    }}
                    className="absolute top-3 right-3 p-2 bg-background/80 hover:bg-background text-foreground hover:text-red-500 rounded-full backdrop-blur-sm border border-border shadow-sm transition-all duration-300 z-10"
                  >
                    <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                  </button>
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
                    <span>{formatPrice(r.price_for_two)} for two</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
