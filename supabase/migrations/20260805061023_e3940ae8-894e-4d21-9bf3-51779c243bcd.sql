-- 1) Restrict SECURITY DEFINER helper to the calling user only
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id = auth.uid()
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 2) Ownership-scoped storage policies for product-images
DROP POLICY IF EXISTS "Authenticated read product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete product images" ON storage.objects;

CREATE POLICY "Owners or admins read product images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'product-images'
         AND ((storage.foldername(name))[1] = auth.uid()::text
              OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Owners upload product images to own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images'
              AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners or admins update product images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images'
         AND ((storage.foldername(name))[1] = auth.uid()::text
              OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (bucket_id = 'product-images'
              AND ((storage.foldername(name))[1] = auth.uid()::text
                   OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Owners or admins delete product images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images'
         AND ((storage.foldername(name))[1] = auth.uid()::text
              OR public.has_role(auth.uid(), 'admin')));