import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";
import { toast } from "sonner";

export function useFavourites() {
  const { user } = useAuth();
  const [favIds, setFavIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const isMock = import.meta.env.DEV && localStorage.getItem("mock_role") !== null;

  const loadFavourites = async () => {
    if (!user) {
      setFavIds([]);
      return;
    }
    setLoading(true);
    try {
      if (isMock) {
        const mockFavs = JSON.parse(localStorage.getItem("mock_favourites") || "[]") as { restaurant_id: string }[];
        setFavIds(mockFavs.map(f => f.restaurant_id));
      } else {
        const { data, error } = await supabase
          .from("favourites")
          .select("restaurant_id");
        if (error) throw error;
        setFavIds(data.map((f: any) => f.restaurant_id));
      }
    } catch (err: any) {
      console.error("Error loading favourites:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavourites();
  }, [user]);

  const toggleFavourite = async (restaurantId: string) => {
    if (!user) {
      toast.error("Please sign in to add favourites");
      return;
    }
    const isFav = favIds.includes(restaurantId);
    try {
      if (isMock) {
        let mockFavs = JSON.parse(localStorage.getItem("mock_favourites") || "[]") as { user_id: string; restaurant_id: string }[];
        if (isFav) {
          mockFavs = mockFavs.filter(f => f.restaurant_id !== restaurantId);
          toast.success("Removed from favourites");
        } else {
          mockFavs.push({ user_id: user.id, restaurant_id: restaurantId });
          toast.success("Added to favourites");
        }
        localStorage.setItem("mock_favourites", JSON.stringify(mockFavs));
        setFavIds(mockFavs.map(f => f.restaurant_id));
      } else {
        if (isFav) {
          const { error } = await supabase
            .from("favourites")
            .delete()
            .eq("user_id", user.id)
            .eq("restaurant_id", restaurantId);
          if (error) throw error;
          setFavIds(prev => prev.filter(id => id !== restaurantId));
          toast.success("Removed from favourites");
        } else {
          const { error } = await supabase
            .from("favourites")
            .insert({ user_id: user.id, restaurant_id: restaurantId });
          if (error) throw error;
          setFavIds(prev => [...prev, restaurantId]);
          toast.success("Added to favourites");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update favourite");
    }
  };

  return { favIds, toggleFavourite, loading, refresh: loadFavourites };
}
