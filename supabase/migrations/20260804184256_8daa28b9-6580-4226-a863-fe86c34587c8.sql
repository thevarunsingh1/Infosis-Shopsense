-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'vendor');
CREATE TYPE public.vendor_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE public.product_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'refunded', 'cancelled');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users read own profile or admins read all" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  description TEXT,
  logo_url TEXT,
  status public.vendor_status NOT NULL DEFAULT 'pending',
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vendors_owner ON public.vendors(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_vendor(_vendor_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.vendors WHERE id = _vendor_id AND owner_id = auth.uid());
$$;

CREATE POLICY "Read own vendor or admin" ON public.vendors
  FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Create own vendor" ON public.vendors
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Update own vendor or admin" ON public.vendors
  FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete vendors" ON public.vendors
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  seo_description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'General',
  image_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  status public.product_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_vendor ON public.products(vendor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own products or admin" ON public.products
  FOR SELECT TO authenticated USING (public.owns_vendor(vendor_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Create own products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.owns_vendor(vendor_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Update own products" ON public.products
  FOR UPDATE TO authenticated USING (public.owns_vendor(vendor_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.owns_vendor(vendor_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Delete own products" ON public.products
  FOR DELETE TO authenticated USING (public.owns_vendor(vendor_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  city TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_vendor ON public.customers(vendor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own customers or admin" ON public.customers
  FOR SELECT TO authenticated USING (public.owns_vendor(vendor_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Create own customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (public.owns_vendor(vendor_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Update own customers" ON public.customers
  FOR UPDATE TO authenticated USING (public.owns_vendor(vendor_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.owns_vendor(vendor_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Delete own customers" ON public.customers
  FOR DELETE TO authenticated USING (public.owns_vendor(vendor_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  reference TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status public.transaction_status NOT NULL DEFAULT 'completed',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_transactions_vendor ON public.transactions(vendor_id);
CREATE INDEX idx_transactions_occurred ON public.transactions(occurred_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own transactions or admin" ON public.transactions
  FOR SELECT TO authenticated USING (public.owns_vendor(vendor_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Create own transactions" ON public.transactions
  FOR INSERT TO authenticated WITH CHECK (public.owns_vendor(vendor_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Update own transactions" ON public.transactions
  FOR UPDATE TO authenticated USING (public.owns_vendor(vendor_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.owns_vendor(vendor_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Delete own transactions" ON public.transactions
  FOR DELETE TO authenticated USING (public.owns_vendor(vendor_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_vendors_updated BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_transactions_updated BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email, NEW.raw_user_meta_data ->> 'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'vendor')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.vendors (id, name, contact_email, phone, city, country, category, description, status, rating, created_at) VALUES
 ('11111111-1111-1111-1111-111111111101','Northwind Supply','hello@northwind.co','+1 415 555 0110','San Francisco','USA','Electronics','Premium consumer electronics distributor.','approved',4.8, now() - interval '200 days'),
 ('11111111-1111-1111-1111-111111111102','Verde Organics','orders@verdeorganics.com','+1 212 555 0142','New York','USA','Grocery','Certified organic produce and pantry goods.','approved',4.6, now() - interval '160 days'),
 ('11111111-1111-1111-1111-111111111103','Atlas Textiles','sales@atlastextiles.in','+91 22 5550 1188','Mumbai','India','Apparel','Sustainable fabrics and finished garments.','approved',4.3, now() - interval '120 days'),
 ('11111111-1111-1111-1111-111111111104','Kite Furniture','contact@kitefurniture.se','+46 8 555 0166','Stockholm','Sweden','Home','Scandinavian flat-pack furniture.','pending',4.1, now() - interval '40 days'),
 ('11111111-1111-1111-1111-111111111105','Solaris Energy','team@solarisenergy.de','+49 30 555 0177','Berlin','Germany','Industrial','Solar hardware and installation kits.','pending',3.9, now() - interval '18 days'),
 ('11111111-1111-1111-1111-111111111106','Bluewave Cosmetics','hi@bluewave.co.uk','+44 20 5550 1199','London','UK','Beauty','Clean beauty and skincare lines.','suspended',3.4, now() - interval '90 days');

INSERT INTO public.products (id, vendor_id, name, sku, description, price, stock, category, status, tags, keywords, created_at) VALUES
 ('22222222-2222-2222-2222-222222222201','11111111-1111-1111-1111-111111111101','Aurora Wireless Headphones','NW-AWH-01','Over-ear ANC headphones with 40h battery.',249.00,320,'Electronics','active','{audio,wireless,anc}','{headphones,"noise cancelling"}', now() - interval '150 days'),
 ('22222222-2222-2222-2222-222222222202','11111111-1111-1111-1111-111111111101','Pulse Smart Watch','NW-PSW-02','Fitness tracking smartwatch with AMOLED display.',189.00,145,'Electronics','active','{wearable,fitness}','{smartwatch,tracker}', now() - interval '140 days'),
 ('22222222-2222-2222-2222-222222222203','11111111-1111-1111-1111-111111111101','Nimbus Bluetooth Speaker','NW-NBS-03','Waterproof portable speaker, 24h playtime.',99.00,0,'Electronics','active','{audio,portable}','{speaker,bluetooth}', now() - interval '100 days'),
 ('22222222-2222-2222-2222-222222222204','11111111-1111-1111-1111-111111111102','Cold-Pressed Olive Oil 1L','VO-CPO-01','Single-origin extra virgin olive oil.',24.50,860,'Grocery','active','{organic,pantry}','{"olive oil",cooking}', now() - interval '130 days'),
 ('22222222-2222-2222-2222-222222222205','11111111-1111-1111-1111-111111111102','Heirloom Coffee Beans 500g','VO-HCB-02','Small-batch roasted arabica beans.',18.90,410,'Grocery','active','{coffee,roasted}','{arabica,beans}', now() - interval '95 days'),
 ('22222222-2222-2222-2222-222222222206','11111111-1111-1111-1111-111111111103','Linen Oversized Shirt','AT-LOS-01','Breathable European linen, unisex fit.',64.00,230,'Apparel','active','{linen,summer}','{shirt,unisex}', now() - interval '80 days'),
 ('22222222-2222-2222-2222-222222222207','11111111-1111-1111-1111-111111111103','Recycled Denim Jacket','AT-RDJ-02','Made from 92% post-consumer denim.',128.00,75,'Apparel','active','{denim,recycled}','{jacket,sustainable}', now() - interval '60 days'),
 ('22222222-2222-2222-2222-222222222208','11111111-1111-1111-1111-111111111104','Oslo Oak Dining Table','KF-OOD-01','Solid oak, seats six, flat-pack.',749.00,32,'Home','active','{oak,dining}','{table,furniture}', now() - interval '35 days'),
 ('22222222-2222-2222-2222-222222222209','11111111-1111-1111-1111-111111111105','400W Solar Panel','SE-SP4-01','Monocrystalline panel with 25-year warranty.',329.00,120,'Industrial','active','{solar,energy}','{panel,renewable}', now() - interval '15 days'),
 ('22222222-2222-2222-2222-222222222210','11111111-1111-1111-1111-111111111106','Marine Collagen Serum','BC-MCS-01','Hydrating serum with marine collagen.',54.00,190,'Beauty','draft','{skincare,serum}','{collagen,hydration}', now() - interval '70 days');

INSERT INTO public.customers (id, vendor_id, name, email, phone, company, city, country, created_at) VALUES
 ('33333333-3333-3333-3333-333333333301','11111111-1111-1111-1111-111111111101','Dana Whitfield','dana@brightretail.com','+1 415 555 0201','Bright Retail','San Francisco','USA', now() - interval '120 days'),
 ('33333333-3333-3333-3333-333333333302','11111111-1111-1111-1111-111111111101','Marcus Lee','marcus@tectonic.io','+1 206 555 0233','Tectonic','Seattle','USA', now() - interval '110 days'),
 ('33333333-3333-3333-3333-333333333303','11111111-1111-1111-1111-111111111102','Sofia Marin','sofia@greengrocer.es','+34 91 555 0244','Green Grocer','Madrid','Spain', now() - interval '90 days'),
 ('33333333-3333-3333-3333-333333333304','11111111-1111-1111-1111-111111111103','Ravi Menon','ravi@urbanthread.in','+91 80 5550 2555','Urban Thread','Bengaluru','India', now() - interval '70 days'),
 ('33333333-3333-3333-3333-333333333305','11111111-1111-1111-1111-111111111104','Elin Karlsson','elin@nordichome.se','+46 8 555 0266','Nordic Home','Stockholm','Sweden', now() - interval '30 days'),
 ('33333333-3333-3333-3333-333333333306','11111111-1111-1111-1111-111111111105','Jonas Weber','jonas@solarfit.de','+49 30 555 0277','SolarFit','Berlin','Germany', now() - interval '12 days');

INSERT INTO public.transactions (vendor_id, customer_id, product_id, reference, quantity, unit_price, total_amount, status, occurred_at)
SELECT
  p.vendor_id,
  c.id,
  p.id,
  'TXN-' || lpad((row_number() OVER ())::text, 5, '0'),
  1 + ((g.n * 3) % 7),
  p.price,
  (p.price * (1 + ((g.n * 3) % 7)))::numeric(14,2),
  (ARRAY['completed','completed','completed','pending','refunded']::public.transaction_status[])[1 + (g.n % 5)],
  now() - ((g.n * 21) || ' days')::interval
FROM public.products p
CROSS JOIN generate_series(0, 8) AS g(n)
JOIN LATERAL (
  SELECT cu.id FROM public.customers cu WHERE cu.vendor_id = p.vendor_id ORDER BY cu.created_at LIMIT 1
) c ON true;

CREATE OR REPLACE FUNCTION public.dashboard_stats()
RETURNS JSON LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT json_build_object(
    'total_sales', COALESCE((SELECT SUM(total_amount) FROM public.transactions WHERE status = 'completed'), 0),
    'transaction_count', (SELECT COUNT(*) FROM public.transactions),
    'product_count', (SELECT COUNT(*) FROM public.products),
    'vendor_count', (SELECT COUNT(*) FROM public.vendors),
    'customer_count', (SELECT COUNT(*) FROM public.customers),
    'pending_vendors', (SELECT COUNT(*) FROM public.vendors WHERE status = 'pending')
  );
$$;

CREATE OR REPLACE FUNCTION public.revenue_by_vendor()
RETURNS TABLE (vendor_id UUID, vendor_name TEXT, revenue NUMERIC, orders BIGINT)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT v.id, v.name, COALESCE(SUM(t.total_amount) FILTER (WHERE t.status = 'completed'), 0)::numeric, COUNT(t.id)
  FROM public.vendors v
  LEFT JOIN public.transactions t ON t.vendor_id = v.id
  GROUP BY v.id, v.name
  ORDER BY 3 DESC;
$$;

CREATE OR REPLACE FUNCTION public.revenue_by_month()
RETURNS TABLE (month TEXT, revenue NUMERIC, orders BIGINT)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT to_char(date_trunc('month', t.occurred_at), 'Mon YYYY'),
         COALESCE(SUM(t.total_amount) FILTER (WHERE t.status = 'completed'), 0)::numeric,
         COUNT(t.id)
  FROM public.transactions t
  GROUP BY date_trunc('month', t.occurred_at)
  ORDER BY date_trunc('month', t.occurred_at);
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.revenue_by_vendor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.revenue_by_month() TO authenticated;