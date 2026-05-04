
-- Fix linter warnings: set search_path on functions
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- Revoke public execute on security definer fns
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Seed demo restaurants
INSERT INTO public.restaurants (name, description, cuisine, image_url, city, rating, price_for_two, delivery_minutes) VALUES
('Pasta Laboratory','Hand-cut pasta, slow-fermented dough, organic flour from upstate.','Italian','https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800',  'Brooklyn', 4.9, 28, 35),
('Taco Architect','Al pastor on the trompo, house-fermented salsas, masa ground daily.','Mexican','https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800','Brooklyn', 4.7, 18, 25),
('Kyoto Minimalist','Sustainable sashimi, seasonal greens, omakase by the gram.','Japanese','https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800','Manhattan', 5.0, 45, 50),
('Provender Bakery','Sourdough, croissants, and pastries baked at 4am.','Bakery','https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800','Brooklyn', 4.8, 12, 20),
('Char & Smoke','Wood-fired burgers and dry-aged beef.','American','https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800','Queens', 4.6, 32, 40),
('Saffron Theory','Modern Indian, slow-cooked curries and tandoor specialties.','Indian','https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800','Brooklyn', 4.7, 26, 38);

-- Seed menu items per restaurant
WITH r AS (SELECT id, name FROM public.restaurants)
INSERT INTO public.menu_items (restaurant_id, name, description, price, image_url, category)
SELECT r.id, m.name, m.description, m.price, m.image_url, m.category FROM r JOIN (VALUES
  ('Pasta Laboratory','Tagliatelle al Ragù','Hand-cut tagliatelle, 6-hour beef ragù, parmigiano.', 18, 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600','Mains'),
  ('Pasta Laboratory','Cacio e Pepe','Tonnarelli, pecorino, black pepper.', 16, 'https://images.unsplash.com/photo-1556761223-4c4282c73f77?w=600','Mains'),
  ('Pasta Laboratory','Tiramisu','Mascarpone, espresso, cocoa.', 9, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600','Dessert'),
  ('Taco Architect','Al Pastor Trio','Three tacos al pastor, pineapple, cilantro.', 12, 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600','Tacos'),
  ('Taco Architect','Carnitas Bowl','Slow-braised pork, rice, black beans, salsa verde.', 14, 'https://images.unsplash.com/photo-1543352634-99a5d50ae78e?w=600','Bowls'),
  ('Taco Architect','Elote','Grilled corn, cotija, lime, chili.', 6, 'https://images.unsplash.com/photo-1625937329935-287441889369?w=600','Sides'),
  ('Kyoto Minimalist','Chef Selection Sashimi','12 pieces, daily catch.', 38, 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600','Sashimi'),
  ('Kyoto Minimalist','Salmon Nigiri','4 pieces, hand-pressed.', 14, 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=600','Nigiri'),
  ('Kyoto Minimalist','Miso Soup','House dashi, tofu, wakame.', 5, 'https://images.unsplash.com/photo-1607330289024-1535c6b4e1c1?w=600','Sides'),
  ('Provender Bakery','Sourdough Loaf','Naturally leavened, 36-hour ferment.', 9, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600','Bread'),
  ('Provender Bakery','Almond Croissant','Twice-baked, marzipan, toasted almonds.', 5, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600','Pastry'),
  ('Char & Smoke','Smash Burger','Two patties, cheddar, house sauce, brioche.', 14, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600','Burgers'),
  ('Char & Smoke','Brisket Plate','12hr smoked brisket, slaw, pickles.', 22, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600','BBQ'),
  ('Char & Smoke','Truffle Fries','Hand-cut, parmesan, truffle oil.', 8, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600','Sides'),
  ('Saffron Theory','Butter Chicken','Tomato-cream sauce, fenugreek, basmati.', 17, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600','Mains'),
  ('Saffron Theory','Lamb Biryani','Saffron rice, slow-cooked lamb, raita.', 19, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600','Mains'),
  ('Saffron Theory','Garlic Naan','Tandoor-baked, fresh garlic, butter.', 4, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600','Sides')
) AS m(rname, name, description, price, image_url, category)
ON r.name = m.rname;
