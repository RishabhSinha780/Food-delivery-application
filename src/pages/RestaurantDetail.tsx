import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, Clock, Plus, ArrowLeft, MessageSquare, AlertCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { useCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

type Restaurant = { id: string; name: string; description: string | null; cuisine: string; image_url: string | null; rating: number; price_for_two: number; delivery_minutes: number; city: string; };
type MenuItem = { id: string; name: string; description: string | null; price: number; image_url: string | null; category: string | null; is_available: boolean };
type Review = { id: string; rating: number; comment: string | null; created_at: string; display_name?: string };

const reviewSchema = z.object({
  rating: z.number().min(1, "Please select at least 1 star").max(5),
  comment: z.string().min(3, "Comment must be at least 3 characters").max(500, "Comment cannot exceed 500 characters"),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

export default function RestaurantDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [r, setR] = useState<Restaurant | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [unreviewedOrders, setUnreviewedOrders] = useState<{ id: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);

  const { add } = useCart();
  const { formatPrice } = useCurrency();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 5, comment: "" }
  });

  const ratingVal = watch("rating");

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    const isMock = localStorage.getItem("mock_role") !== null || localStorage.getItem("mock_restaurants") !== null;

    if (isMock) {
      const mockRests = JSON.parse(localStorage.getItem("mock_restaurants") || "[]") as Restaurant[];
      const rest = mockRests.find((item) => item.id === id);
      setR(rest || null);

      if (rest) {
        const mockMenu = JSON.parse(localStorage.getItem(`mock_menu_${id}`) || "[]") as MenuItem[];
        setItems(mockMenu);
      }

      // Load mock reviews
      const allMockReviews = JSON.parse(localStorage.getItem("mock_reviews") || "[]") as any[];
      const filteredReviews = allMockReviews.filter((rv) => rv.restaurant_id === id);
      setReviews(filteredReviews);

      // Check unreviewed orders in mock mode
      if (user) {
        const customerOrdersKey = `mock_customer_orders_${user.id}`;
        const allOrders = JSON.parse(localStorage.getItem(customerOrdersKey) || "[]") as any[];
        const deliveredOrders = allOrders.filter(o => o.restaurant_id === id && o.status === "delivered");
        
        const reviewedOrderIds = new Set(filteredReviews.filter(rv => rv.customer_id === user.id).map(rv => rv.order_id));
        const unreviewed = deliveredOrders.filter(o => !reviewedOrderIds.has(o.id));
        setUnreviewedOrders(unreviewed);
      }

      setLoading(false);
      return;
    }

    try {
      const { data: rest } = await supabase.from("restaurants").select("*").eq("id", id).single();
      setR(rest as Restaurant);

      const { data: menuItems } = await supabase.from("menu_items").select("*").eq("restaurant_id", id);
      setItems((menuItems ?? []) as MenuItem[]);

      // Fetch reviews and profiles in parallel
      const { data: revs } = await supabase.from("reviews").select("*").eq("restaurant_id", id).order("created_at", { ascending: false });
      if (revs && revs.length > 0) {
        const uids = Array.from(new Set(revs.map((rv) => rv.customer_id)));
        const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", uids);
        const profMap = new Map(profs?.map((p) => [p.id, p.display_name]) || []);
        
        const enriched = revs.map((rv) => ({
          ...rv,
          display_name: profMap.get(rv.customer_id) || "Anonymous Customer"
        }));
        setReviews(enriched);
      } else {
        setReviews([]);
      }

      // Check unreviewed orders in Supabase mode
      if (user) {
        const { data: deliveredOrders } = await supabase
          .from("orders")
          .select("id, created_at")
          .eq("customer_id", user.id)
          .eq("restaurant_id", id)
          .eq("status", "delivered");

        const { data: userReviews } = await (supabase
          .from("reviews") as any)
          .select("order_id")
          .eq("customer_id", user.id)
          .eq("restaurant_id", id);

        const reviewedOrderIds = new Set(((userReviews as any[]) ?? []).map(ur => ur.order_id).filter(Boolean));
        const unreviewed = (deliveredOrders ?? []).filter(o => !reviewedOrderIds.has(o.id));
        setUnreviewedOrders(unreviewed);
      }
    } catch (err) {
      console.error("Error loading restaurant details:", err);
      toast.error("Failed to load details. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, user]);

  const onSubmitReview = async (data: ReviewFormValues) => {
    if (!user || unreviewedOrders.length === 0 || !id) return;
    const targetOrder = unreviewedOrders[0];
    setSubmittingReview(true);

    const isMock = localStorage.getItem("mock_role") !== null || localStorage.getItem("mock_restaurants") !== null;

    try {
      if (isMock) {
        const mockReviews = JSON.parse(localStorage.getItem("mock_reviews") || "[]");
        const newReview = {
          id: `rev-${Math.random().toString(36).substr(2, 9)}`,
          customer_id: user.id,
          restaurant_id: id,
          order_id: targetOrder.id,
          rating: data.rating,
          comment: data.comment,
          created_at: new Date().toISOString(),
          display_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "Anonymous Customer"
        };
        mockReviews.unshift(newReview);
        localStorage.setItem("mock_reviews", JSON.stringify(mockReviews));
        
        toast.success("Review submitted successfully!");
        reset();
        await loadData();
      } else {
        const { error } = await (supabase.from("reviews") as any).insert({
          customer_id: user.id,
          restaurant_id: id,
          order_id: targetOrder.id,
          rating: data.rating,
          comment: data.comment
        });
        if (error) throw error;
        toast.success("Review submitted successfully!");
        reset();
        await loadData();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-6 py-12 animate-pulse">
          <div className="h-6 bg-muted rounded w-32 mb-6" />
          <div className="grid md:grid-cols-2 gap-8 items-center mb-12">
            <div className="bg-muted aspect-[4/3] rounded-2xl" />
            <div>
              <div className="h-4 bg-muted rounded w-20 mb-3" />
              <div className="h-10 bg-muted rounded w-3/4 mb-4" />
              <div className="h-4 bg-muted rounded w-full mb-6" />
              <div className="flex gap-4">
                <div className="h-8 bg-muted rounded-full w-24" />
                <div className="h-8 bg-muted rounded-full w-24" />
              </div>
            </div>
          </div>
          <div className="h-8 bg-muted rounded w-48 mb-8" />
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(n => <div key={n} className="bg-muted h-32 rounded-xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!r) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Kitchen not found</h2>
          <p className="text-muted-foreground mb-6">The kitchen you are looking for does not exist or has been removed.</p>
          <Link to="/" className="btn-primary rounded-full px-6 py-2">Back to Home</Link>
        </div>
      </Layout>
    );
  }

  const categories = Array.from(new Set(items.map((i) => i.category || "Menu")));
  
  // Calculate average rating dynamically
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, rev) => sum + rev.rating, 0) / reviews.length
    : r.rating;

  return (
    <Layout>
      <section className="max-w-7xl mx-auto px-6 pt-8 animate-slide-in">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Kitchens
        </Link>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="bg-muted aspect-[4/3] rounded-2xl overflow-hidden shadow-inner border border-border">
            {r.image_url ? (
              <img src={r.image_url} alt={r.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-sm font-medium">No Image Provided</div>
            )}
          </div>
          <div>
            <p className="label-mono mb-3">({r.cuisine.toLowerCase()})</p>
            <h1 className="text-5xl font-extrabold tracking-tighter mb-3">{r.name}</h1>
            <p className="text-muted-foreground mb-6">{r.description}</p>
            <div className="flex gap-4 mono text-sm flex-wrap">
              <span className="bg-primary-soft text-accent-foreground px-3 py-2 rounded-full inline-flex items-center gap-1.5 shadow-sm">
                <Star className="h-3.5 w-3.5 fill-current text-primary" /> {Number(avgRating).toFixed(1)} ({reviews.length} reviews)
              </span>
              <span className="bg-card border border-border px-3 py-2 rounded-full inline-flex items-center gap-1.5 shadow-sm">
                <Clock className="h-3.5 w-3.5" /> {r.delivery_minutes} min
              </span>
              <span className="bg-card border border-border px-3 py-2 rounded-full font-semibold shadow-sm">{formatPrice(r.price_for_two)} for two</span>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 mt-16">
        <p className="label-mono mb-2">(menu)</p>
        <h2 className="text-3xl font-bold mb-8">What we're serving</h2>
        {categories.length === 0 && <div className="card-flat p-8 text-center text-muted-foreground">This kitchen has no menu items listed yet.</div>}
        {categories.map((cat) => (
          <div key={cat} className="mb-12">
            <h3 className="text-sm mono uppercase tracking-widest text-muted-foreground mb-4">{cat}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {items.filter((i) => (i.category || "Menu") === cat).map((m) => (
                <div key={m.id} className="card-flat p-4 flex gap-4 items-center">
                  <div className="bg-muted h-24 w-24 rounded-xl overflow-hidden flex-shrink-0 border border-border">
                    {m.image_url ? (
                      <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted text-[10px] text-muted-foreground">No Image</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <h4 className="font-bold truncate">{m.name}</h4>
                      <span className="mono text-sm font-semibold shrink-0">{formatPrice(m.price)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{m.description}</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={!m.is_available}
                    onClick={() => {
                      add({
                        id: m.id,
                        name: m.name,
                        price: Number(m.price),
                        restaurant_id: r.id,
                        restaurant_name: r.name,
                        image_url: m.image_url
                      });
                      toast.success(`${m.name} added`);
                    }}
                    className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Review Submission Form Section */}
      {user && unreviewedOrders.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 mt-16 animate-slide-in">
          <div className="card-flat p-6 border-dashed border-primary/55 bg-primary-soft/10">
            <h3 className="font-bold text-xl mb-1 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Write a Review
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Thank you for ordering! Share your thoughts on your order placed on{" "}
              {new Date(unreviewedOrders[0].created_at).toLocaleDateString()}.
            </p>
            <form onSubmit={handleSubmit(onSubmitReview)} className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">Rating</Label>
                <div className="flex gap-1.5 my-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setValue("rating", star)}
                      className="text-primary hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`h-6 w-6 transition-colors ${
                          ratingVal >= star ? "fill-primary text-primary" : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {errors.rating && <p className="text-xs text-red-500 font-semibold">{errors.rating.message}</p>}
              </div>
              <div>
                <Label htmlFor="comment">Comment</Label>
                <Textarea
                  id="comment"
                  {...register("comment")}
                  placeholder="Tell us about the flavor, packaging, or prep speed..."
                  className="mt-1"
                  rows={3}
                />
                {errors.comment && <p className="text-xs text-red-500 font-semibold mt-1">{errors.comment.message}</p>}
              </div>
              <Button type="submit" disabled={submittingReview} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                {submittingReview ? "Submitting..." : "Post Review"}
              </Button>
            </form>
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-6 mt-16 mb-24">
        <p className="label-mono mb-2">(reviews)</p>
        <h2 className="text-3xl font-bold mb-6">What people are saying</h2>
        {reviews.length === 0 && <p className="text-muted-foreground">No reviews yet. Be the first to share your experience!</p>}
        <div className="grid md:grid-cols-2 gap-4">
          {reviews.map((rv) => (
            <div key={rv.id} className="card-flat p-5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="mono text-xs bg-primary-soft text-accent-foreground px-2 py-1 rounded inline-flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current text-primary" /> {rv.rating}/5
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{new Date(rv.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm italic text-foreground/80 mt-1">"{rv.comment}"</p>
              </div>
              <div className="text-xs text-muted-foreground mt-4 font-semibold text-right">
                — {rv.display_name || "Anonymous Customer"}
              </div>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
