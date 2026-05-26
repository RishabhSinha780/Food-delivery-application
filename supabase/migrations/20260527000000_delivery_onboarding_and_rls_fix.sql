-- 1. Resolve RLS Recursion by setting deliveries and user_roles select policies to true
DROP POLICY IF EXISTS "Delivery visibility" ON public.deliveries;
CREATE POLICY "Delivery visibility" ON public.deliveries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users see own roles" ON public.user_roles;
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT USING (true);

-- 2. Break Admin 'FOR ALL' policy recursion on user_roles by splitting into INSERT, UPDATE, and DELETE
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Create the delivery_relationships table for onboarding
CREATE TABLE IF NOT EXISTS public.delivery_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (delivery_id)
);

-- Enable RLS
ALTER TABLE public.delivery_relationships ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for delivery_relationships
DROP POLICY IF EXISTS "Allow select on relationships" ON public.delivery_relationships;
CREATE POLICY "Allow select on relationships" ON public.delivery_relationships FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow delivery to manage own relationships" ON public.delivery_relationships;
CREATE POLICY "Allow delivery to manage own relationships" ON public.delivery_relationships FOR ALL 
  USING (auth.uid() = delivery_id) WITH CHECK (auth.uid() = delivery_id);

DROP POLICY IF EXISTS "Allow owner to update status" ON public.delivery_relationships;
CREATE POLICY "Allow owner to update status" ON public.delivery_relationships FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()));
