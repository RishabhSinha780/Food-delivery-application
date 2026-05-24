-- 1. Fix orders RLS typo (d.order_id = d.id  →  d.order_id = orders.id)
DROP POLICY IF EXISTS "Customers see own orders" ON public.orders;
CREATE POLICY "Customers see own orders" ON public.orders FOR SELECT USING (
  (auth.uid() = customer_id)
  OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = orders.restaurant_id AND r.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.deliveries d WHERE d.order_id = orders.id AND d.partner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'delivery'::app_role)
);

DROP POLICY IF EXISTS "Owners and customer update orders" ON public.orders;
CREATE POLICY "Owners and customer update orders" ON public.orders FOR UPDATE USING (
  (auth.uid() = customer_id)
  OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = orders.restaurant_id AND r.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.deliveries d WHERE d.order_id = orders.id AND d.partner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 2. Reviews rating validator (1..5) via trigger (not CHECK, per project rules)
CREATE OR REPLACE FUNCTION public.validate_review_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.rating IS NULL OR NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_validate_rating ON public.reviews;
CREATE TRIGGER trg_reviews_validate_rating
BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.validate_review_rating();

-- 3. addresses.user_id NOT NULL (audit: 0 nulls)
ALTER TABLE public.addresses ALTER COLUMN user_id SET NOT NULL;

-- 4. Favourites
CREATE TABLE IF NOT EXISTS public.favourites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  restaurant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, restaurant_id)
);
ALTER TABLE public.favourites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own favourites" ON public.favourites;
CREATE POLICY "Own favourites" ON public.favourites
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_favourites_user ON public.favourites(user_id);
CREATE INDEX IF NOT EXISTS idx_favourites_restaurant ON public.favourites(restaurant_id);

-- 5. dish-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('dish-images', 'dish-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Dish images public read" ON storage.objects;
CREATE POLICY "Dish images public read" ON storage.objects
FOR SELECT USING (bucket_id = 'dish-images');

DROP POLICY IF EXISTS "Owners upload dish images" ON storage.objects;
CREATE POLICY "Owners upload dish images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'dish-images'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.owner_id = auth.uid()
        AND (storage.foldername(name))[1] = r.id::text
    )
  )
);

DROP POLICY IF EXISTS "Owners update dish images" ON storage.objects;
CREATE POLICY "Owners update dish images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'dish-images'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.owner_id = auth.uid()
        AND (storage.foldername(name))[1] = r.id::text
    )
  )
);

DROP POLICY IF EXISTS "Owners delete dish images" ON storage.objects;
CREATE POLICY "Owners delete dish images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'dish-images'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.owner_id = auth.uid()
        AND (storage.foldername(name))[1] = r.id::text
    )
  )
);