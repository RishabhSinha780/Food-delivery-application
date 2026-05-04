
-- Enums
CREATE TYPE public.app_role AS ENUM ('customer','owner','delivery','admin');
CREATE TYPE public.order_status AS ENUM ('pending','accepted','preparing','ready','picked_up','on_the_way','delivered','cancelled','rejected');
CREATE TYPE public.payment_method AS ENUM ('card','cod');
CREATE TYPE public.delivery_status AS ENUM ('assigned','picked_up','on_the_way','delivered');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

-- Auto profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'customer'));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger fn
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Addresses
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home',
  line1 TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT,
  lat NUMERIC,
  lng NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Restaurants
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  cuisine TEXT NOT NULL,
  image_url TEXT,
  city TEXT NOT NULL DEFAULT 'Brooklyn',
  rating NUMERIC NOT NULL DEFAULT 4.5,
  price_for_two NUMERIC NOT NULL DEFAULT 25,
  delivery_minutes INT NOT NULL DEFAULT 35,
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_restaurants_updated BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Menu items
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  image_url TEXT,
  category TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_menu_updated BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  status order_status NOT NULL DEFAULT 'pending',
  payment_method payment_method NOT NULL DEFAULT 'cod',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  delivery_fee NUMERIC NOT NULL DEFAULT 3,
  total NUMERIC NOT NULL DEFAULT 0,
  address_line TEXT NOT NULL,
  city TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  qty INT NOT NULL DEFAULT 1
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Deliveries
CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status delivery_status NOT NULL DEFAULT 'assigned',
  current_lat NUMERIC,
  current_lng NUMERIC,
  eta_minutes INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_deliveries_updated BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  delivery_partner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "Profiles viewable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid()=id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid()=id);

-- user_roles
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- addresses
CREATE POLICY "Own addresses" ON public.addresses FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- restaurants
CREATE POLICY "Public read restaurants" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "Owners insert own restaurants" ON public.restaurants FOR INSERT WITH CHECK (auth.uid()=owner_id AND public.has_role(auth.uid(),'owner'));
CREATE POLICY "Owners update own restaurants" ON public.restaurants FOR UPDATE USING (auth.uid()=owner_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners delete own restaurants" ON public.restaurants FOR DELETE USING (auth.uid()=owner_id OR public.has_role(auth.uid(),'admin'));

-- menu_items
CREATE POLICY "Public read menu" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Owners manage menu" ON public.menu_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id=restaurant_id AND (r.owner_id=auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id=restaurant_id AND (r.owner_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- orders
CREATE POLICY "Customers see own orders" ON public.orders FOR SELECT USING (
  auth.uid()=customer_id
  OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id=restaurant_id AND r.owner_id=auth.uid())
  OR EXISTS (SELECT 1 FROM public.deliveries d WHERE d.order_id=id AND d.partner_id=auth.uid())
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'delivery')
);
CREATE POLICY "Customers create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid()=customer_id);
CREATE POLICY "Owners and customer update orders" ON public.orders FOR UPDATE USING (
  auth.uid()=customer_id
  OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id=restaurant_id AND r.owner_id=auth.uid())
  OR EXISTS (SELECT 1 FROM public.deliveries d WHERE d.order_id=id AND d.partner_id=auth.uid())
  OR public.has_role(auth.uid(),'admin')
);

-- order_items
CREATE POLICY "Read items for visible orders" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id=order_id AND (
    o.customer_id=auth.uid()
    OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id=o.restaurant_id AND r.owner_id=auth.uid())
    OR EXISTS (SELECT 1 FROM public.deliveries d WHERE d.order_id=o.id AND d.partner_id=auth.uid())
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'delivery')
  ))
);
CREATE POLICY "Customers add items to own orders" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id=order_id AND o.customer_id=auth.uid())
);

-- deliveries
CREATE POLICY "Delivery visibility" ON public.deliveries FOR SELECT USING (
  partner_id=auth.uid() OR partner_id IS NULL
  OR public.has_role(auth.uid(),'delivery') OR public.has_role(auth.uid(),'admin')
  OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id=order_id AND (o.customer_id=auth.uid() OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id=o.restaurant_id AND r.owner_id=auth.uid())))
);
CREATE POLICY "Insert deliveries" ON public.deliveries FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id=order_id AND (o.customer_id=auth.uid() OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id=o.restaurant_id AND r.owner_id=auth.uid()) OR public.has_role(auth.uid(),'admin')))
);
CREATE POLICY "Partner update delivery" ON public.deliveries FOR UPDATE USING (
  partner_id=auth.uid() OR partner_id IS NULL OR public.has_role(auth.uid(),'admin')
);

-- reviews
CREATE POLICY "Public read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Customers write own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid()=customer_id);
CREATE POLICY "Customers update own reviews" ON public.reviews FOR UPDATE USING (auth.uid()=customer_id);
CREATE POLICY "Customers delete own reviews" ON public.reviews FOR DELETE USING (auth.uid()=customer_id OR public.has_role(auth.uid(),'admin'));
