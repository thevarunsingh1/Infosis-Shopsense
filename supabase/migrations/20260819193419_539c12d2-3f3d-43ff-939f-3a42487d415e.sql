CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- ---------------- inventory movements ----------------
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  change integer NOT NULL,
  reason text NOT NULL DEFAULT 'adjustment',
  note text,
  is_demo boolean NOT NULL DEFAULT false,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own movements or admin" ON public.inventory_movements;
CREATE POLICY "Read own movements or admin" ON public.inventory_movements FOR SELECT TO authenticated
  USING (owns_vendor(vendor_id) OR has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Create own movements" ON public.inventory_movements;
CREATE POLICY "Create own movements" ON public.inventory_movements FOR INSERT TO authenticated
  WITH CHECK (owns_vendor(vendor_id) OR has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Update own movements" ON public.inventory_movements;
CREATE POLICY "Update own movements" ON public.inventory_movements FOR UPDATE TO authenticated
  USING (owns_vendor(vendor_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (owns_vendor(vendor_id) OR has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Delete own movements" ON public.inventory_movements;
CREATE POLICY "Delete own movements" ON public.inventory_movements FOR DELETE TO authenticated
  USING (owns_vendor(vendor_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_movements_product ON public.inventory_movements(product_id, occurred_at DESC);

-- ---------------- product reviews ----------------
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  author_name text,
  rating integer NOT NULL DEFAULT 5,
  title text,
  body text NOT NULL,
  sentiment_label text,
  sentiment_score numeric,
  analyzed_at timestamptz,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own reviews or admin" ON public.product_reviews;
CREATE POLICY "Read own reviews or admin" ON public.product_reviews FOR SELECT TO authenticated
  USING (owns_vendor(vendor_id) OR has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Create own reviews" ON public.product_reviews;
CREATE POLICY "Create own reviews" ON public.product_reviews FOR INSERT TO authenticated
  WITH CHECK (owns_vendor(vendor_id) OR has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Update own reviews" ON public.product_reviews;
CREATE POLICY "Update own reviews" ON public.product_reviews FOR UPDATE TO authenticated
  USING (owns_vendor(vendor_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (owns_vendor(vendor_id) OR has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Delete own reviews" ON public.product_reviews;
CREATE POLICY "Delete own reviews" ON public.product_reviews FOR DELETE TO authenticated
  USING (owns_vendor(vendor_id) OR has_role(auth.uid(), 'admin'::app_role));

-- ---------------- product embeddings ----------------
CREATE TABLE IF NOT EXISTS public.product_embeddings (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding extensions.vector(1536),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_embeddings TO authenticated;
GRANT ALL ON public.product_embeddings TO service_role;
ALTER TABLE public.product_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own embeddings or admin" ON public.product_embeddings;
CREATE POLICY "Read own embeddings or admin" ON public.product_embeddings FOR SELECT TO authenticated
  USING (owns_vendor(vendor_id) OR has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Write own embeddings" ON public.product_embeddings;
CREATE POLICY "Write own embeddings" ON public.product_embeddings FOR INSERT TO authenticated
  WITH CHECK (owns_vendor(vendor_id) OR has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Update own embeddings" ON public.product_embeddings;
CREATE POLICY "Update own embeddings" ON public.product_embeddings FOR UPDATE TO authenticated
  USING (owns_vendor(vendor_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (owns_vendor(vendor_id) OR has_role(auth.uid(), 'admin'::app_role));

-- ---------------- stock automation ----------------
CREATE OR REPLACE FUNCTION public.log_sale_movement()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.product_id IS NOT NULL AND NEW.status = 'completed' THEN
    UPDATE public.products SET stock = GREATEST(stock - NEW.quantity, 0), updated_at = now()
      WHERE id = NEW.product_id;
    INSERT INTO public.inventory_movements (vendor_id, product_id, change, reason, note, is_demo, occurred_at)
      VALUES (NEW.vendor_id, NEW.product_id, -NEW.quantity, 'sale', NEW.reference, NEW.is_demo, NEW.occurred_at);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_transaction_sale_movement ON public.transactions;
CREATE TRIGGER trg_transaction_sale_movement AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_sale_movement();

CREATE OR REPLACE FUNCTION public.adjust_stock(_product_id uuid, _delta integer, _reason text DEFAULT 'adjustment', _note text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE _vendor uuid; _new integer;
BEGIN
  SELECT vendor_id INTO _vendor FROM public.products WHERE id = _product_id;
  IF _vendor IS NULL THEN RAISE EXCEPTION 'Product not found'; END IF;
  UPDATE public.products SET stock = GREATEST(stock + _delta, 0), updated_at = now()
    WHERE id = _product_id RETURNING stock INTO _new;
  IF _new IS NULL THEN RAISE EXCEPTION 'Not permitted'; END IF;
  INSERT INTO public.inventory_movements (vendor_id, product_id, change, reason, note)
    VALUES (_vendor, _product_id, _delta, _reason, _note);
  RETURN _new;
END; $$;

REVOKE ALL ON FUNCTION public.adjust_stock(uuid, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid, integer, text, text) TO authenticated;

-- ---------------- analytics functions ----------------
CREATE OR REPLACE FUNCTION public.inventory_overview()
RETURNS json LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  WITH sold AS (
    SELECT product_id, SUM(quantity) AS units
    FROM public.transactions
    WHERE status = 'completed' AND occurred_at > now() - interval '30 days'
    GROUP BY product_id
  )
  SELECT json_build_object(
    'total_products', (SELECT COUNT(*) FROM public.products),
    'total_units', COALESCE((SELECT SUM(stock) FROM public.products), 0),
    'low_stock', (SELECT COUNT(*) FROM public.products WHERE stock > 0 AND stock <= low_stock_threshold),
    'out_of_stock', (SELECT COUNT(*) FROM public.products WHERE stock = 0),
    'inventory_value', COALESCE((SELECT SUM(stock * price) FROM public.products), 0),
    'fast_movers', (SELECT COUNT(*) FROM sold WHERE units >= 15)
  );
$$;

CREATE OR REPLACE FUNCTION public.inventory_rows()
RETURNS TABLE(product_id uuid, name text, category text, vendor_name text, stock integer, low_stock_threshold integer,
  price numeric, status text, units_sold bigint, units_30d bigint, velocity numeric, last_updated timestamptz)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT p.id, p.name, p.category, v.name, p.stock, p.low_stock_threshold, p.price,
    CASE WHEN p.stock = 0 THEN 'out of stock'
         WHEN p.stock <= GREATEST(p.low_stock_threshold / 2, 1) THEN 'critical'
         WHEN p.stock <= p.low_stock_threshold THEN 'low stock'
         ELSE 'in stock' END,
    COALESCE(SUM(t.quantity) FILTER (WHERE t.status = 'completed'), 0)::bigint,
    COALESCE(SUM(t.quantity) FILTER (WHERE t.status = 'completed' AND t.occurred_at > now() - interval '30 days'), 0)::bigint,
    ROUND(COALESCE(SUM(t.quantity) FILTER (WHERE t.status = 'completed' AND t.occurred_at > now() - interval '30 days'), 0)::numeric / 30, 2),
    p.updated_at
  FROM public.products p
  JOIN public.vendors v ON v.id = p.vendor_id
  LEFT JOIN public.transactions t ON t.product_id = p.id
  GROUP BY p.id, v.name
  ORDER BY p.stock ASC;
$$;

CREATE OR REPLACE FUNCTION public.customer_overview()
RETURNS json LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  WITH spend AS (
    SELECT c.id, COUNT(t.id) FILTER (WHERE t.status='completed') AS orders,
           COALESCE(SUM(t.total_amount) FILTER (WHERE t.status='completed'),0) AS total
    FROM public.customers c LEFT JOIN public.transactions t ON t.customer_id = c.id
    GROUP BY c.id
  )
  SELECT json_build_object(
    'total_customers', (SELECT COUNT(*) FROM public.customers),
    'new_customers', (SELECT COUNT(*) FROM public.customers WHERE created_at > now() - interval '30 days'),
    'returning_customers', (SELECT COUNT(*) FROM spend WHERE orders > 1),
    'total_revenue', COALESCE((SELECT SUM(total) FROM spend), 0),
    'avg_order_value', COALESCE((SELECT AVG(total_amount) FROM public.transactions WHERE status='completed'), 0),
    'avg_customer_spend', COALESCE((SELECT AVG(total) FROM spend WHERE orders > 0), 0)
  );
$$;

CREATE OR REPLACE FUNCTION public.customer_segments()
RETURNS TABLE(segment text, customers bigint, revenue numeric, avg_spend numeric, pct numeric)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  WITH spend AS (
    SELECT c.id, COALESCE(SUM(t.total_amount) FILTER (WHERE t.status='completed'),0) AS total
    FROM public.customers c LEFT JOIN public.transactions t ON t.customer_id = c.id
    GROUP BY c.id
  ), tagged AS (
    SELECT id, total,
      CASE WHEN total >= 20000 THEN 'High Value'
           WHEN total >= 8000 THEN 'Regular'
           WHEN total >= 1000 THEN 'Occasional'
           ELSE 'Low Value' END AS seg
    FROM spend
  )
  SELECT seg, COUNT(*)::bigint, ROUND(SUM(total),2), ROUND(AVG(total),2),
    ROUND(100.0 * COUNT(*) / NULLIF((SELECT COUNT(*) FROM tagged),0), 1)
  FROM tagged GROUP BY seg
  ORDER BY CASE seg WHEN 'High Value' THEN 1 WHEN 'Regular' THEN 2 WHEN 'Occasional' THEN 3 ELSE 4 END;
$$;

CREATE OR REPLACE FUNCTION public.sales_trends(_days integer DEFAULT 30)
RETURNS TABLE(day date, revenue numeric, orders bigint, units bigint)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT d::date,
    COALESCE(SUM(t.total_amount) FILTER (WHERE t.status='completed'),0)::numeric,
    COUNT(t.id)::bigint,
    COALESCE(SUM(t.quantity) FILTER (WHERE t.status='completed'),0)::bigint
  FROM generate_series((now() - (_days || ' days')::interval)::date, now()::date, interval '1 day') d
  LEFT JOIN public.transactions t ON t.occurred_at::date = d::date
  GROUP BY d ORDER BY d;
$$;

CREATE OR REPLACE FUNCTION public.top_products(_limit integer DEFAULT 10, _category text DEFAULT NULL)
RETURNS TABLE(product_id uuid, name text, category text, image_url text, units_sold bigint, revenue numeric, orders bigint)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT p.id, p.name, p.category, p.image_url,
    COALESCE(SUM(t.quantity),0)::bigint,
    COALESCE(SUM(t.total_amount),0)::numeric,
    COUNT(t.id)::bigint
  FROM public.products p
  LEFT JOIN public.transactions t ON t.product_id = p.id AND t.status='completed'
  WHERE _category IS NULL OR p.category = _category
  GROUP BY p.id
  ORDER BY 5 DESC, 6 DESC
  LIMIT GREATEST(_limit, 1);
$$;

CREATE OR REPLACE FUNCTION public.product_sales_history(_product_id uuid, _days integer DEFAULT 90)
RETURNS TABLE(day date, units bigint, revenue numeric)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT d::date,
    COALESCE(SUM(t.quantity),0)::bigint,
    COALESCE(SUM(t.total_amount),0)::numeric
  FROM generate_series((now() - (_days || ' days')::interval)::date, now()::date, interval '1 day') d
  LEFT JOIN public.transactions t ON t.occurred_at::date = d::date AND t.product_id = _product_id AND t.status='completed'
  GROUP BY d ORDER BY d;
$$;

CREATE OR REPLACE FUNCTION public.match_products(_embedding extensions.vector(1536), _limit integer DEFAULT 5, _exclude uuid DEFAULT NULL)
RETURNS TABLE(product_id uuid, name text, category text, price numeric, image_url text, similarity numeric)
LANGUAGE sql STABLE SET search_path TO 'public', 'extensions' AS $$
  SELECT p.id, p.name, p.category, p.price, p.image_url,
    ROUND((1 - (e.embedding OPERATOR(extensions.<=>) _embedding))::numeric, 4)
  FROM public.product_embeddings e
  JOIN public.products p ON p.id = e.product_id
  WHERE e.embedding IS NOT NULL AND (_exclude IS NULL OR p.id <> _exclude)
  ORDER BY e.embedding OPERATOR(extensions.<=>) _embedding
  LIMIT GREATEST(_limit, 1);
$$;

CREATE OR REPLACE FUNCTION public.analytics_validation()
RETURNS json LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT json_build_object(
    'revenue_from_orders', COALESCE((SELECT SUM(total_amount) FROM public.transactions WHERE status='completed'),0),
    'revenue_from_line_items', COALESCE((SELECT SUM(quantity * unit_price) FROM public.transactions WHERE status='completed'),0),
    'units_from_orders', COALESCE((SELECT SUM(quantity) FROM public.transactions WHERE status='completed'),0),
    'units_from_movements', COALESCE((SELECT -SUM(change) FROM public.inventory_movements WHERE reason='sale'),0),
    'customer_spend_total', COALESCE((SELECT SUM(total_amount) FROM public.transactions WHERE status='completed' AND customer_id IS NOT NULL),0),
    'orders_counted', (SELECT COUNT(*) FROM public.transactions WHERE status='completed'),
    'products_tracked', (SELECT COUNT(*) FROM public.products),
    'history_days', COALESCE((SELECT EXTRACT(day FROM now() - MIN(occurred_at))::int FROM public.transactions),0)
  );
$$;

REVOKE ALL ON FUNCTION public.inventory_overview() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.inventory_rows() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.customer_overview() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.customer_segments() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sales_trends(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.top_products(integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.product_sales_history(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.match_products(extensions.vector, integer, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.analytics_validation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inventory_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_rows() TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_segments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_trends(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.top_products(integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.product_sales_history(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_products(extensions.vector, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_validation() TO authenticated;

-- ---------------- demo data for the last 90 days ----------------
UPDATE public.products SET is_demo = true WHERE is_demo = false;
UPDATE public.transactions SET is_demo = true WHERE is_demo = false;

INSERT INTO public.transactions (vendor_id, customer_id, product_id, reference, quantity, unit_price, total_amount, status, occurred_at, is_demo)
SELECT p.vendor_id,
       (SELECT c.id FROM public.customers c ORDER BY md5(c.id::text || d::text || p.id::text) LIMIT 1),
       p.id,
       'DEMO-' || to_char(d, 'YYYYMMDD') || '-' || left(replace(p.id::text,'-',''), 5),
       q.qty,
       p.price,
       ROUND(q.qty * p.price, 2),
       'completed',
       d + interval '9 hours',
       true
FROM generate_series((now() - interval '89 days')::date, now()::date, interval '1 day') d
CROSS JOIN public.products p
CROSS JOIN LATERAL (
  SELECT (1 + (abs(hashtext(p.id::text || d::text)) % 6))::int AS qty
) q
WHERE (abs(hashtext(p.name || d::text)) % 100) < 34;

UPDATE public.products p SET stock = GREATEST(24 + (abs(hashtext(p.name)) % 90) - (CASE WHEN (abs(hashtext(p.id::text)) % 7) = 0 THEN 90 ELSE 0 END), 0),
  low_stock_threshold = 10 + (abs(hashtext(p.category)) % 10);

INSERT INTO public.inventory_movements (vendor_id, product_id, change, reason, note, is_demo, occurred_at)
SELECT p.vendor_id, p.id, 40 + (abs(hashtext(p.id::text || d::text)) % 60), 'restock', 'Scheduled replenishment', true, d + interval '7 hours'
FROM generate_series((now() - interval '84 days')::date, now()::date, interval '14 days') d
CROSS JOIN public.products p;

INSERT INTO public.product_reviews (vendor_id, product_id, customer_id, author_name, rating, title, body, is_demo, created_at)
SELECT p.vendor_id, p.id,
  (SELECT c.id FROM public.customers c ORDER BY md5(c.id::text || r.idx::text || p.id::text) LIMIT 1),
  (SELECT c.name FROM public.customers c ORDER BY md5(c.id::text || r.idx::text || p.id::text) LIMIT 1),
  r.rating, r.title, r.body, true,
  now() - ((abs(hashtext(p.id::text || r.idx::text)) % 80) || ' days')::interval
FROM public.products p
CROSS JOIN (VALUES
  (1, 5, 'Excellent quality', 'Battery life is outstanding and the build quality feels premium. Shipping was quick too.'),
  (2, 4, 'Great value', 'Works exactly as described and the price is fair. Setup took a couple of minutes.'),
  (3, 3, 'Good but slow charging', 'Happy with the performance overall, however the charging speed is slower than I expected.'),
  (4, 2, 'Packaging issues', 'The item arrived with damaged packaging and the instructions were confusing. Support was helpful.'),
  (5, 5, 'Would buy again', 'Comfortable, reliable and the design looks great. Customer service answered my question within a day.'),
  (6, 4, 'Solid everyday pick', 'Does the job well for daily use. Would like a longer warranty period.')
) AS r(idx, rating, title, body);