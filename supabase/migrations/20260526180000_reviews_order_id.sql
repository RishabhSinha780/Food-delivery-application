-- Add order_id to reviews to bind each review to a specific order
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

-- Prevent duplicate reviews for the same order
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_order_id_key;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_order_id_key UNIQUE (order_id);
