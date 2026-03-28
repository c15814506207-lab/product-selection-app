-- 登录与用户数据隔离：在 Supabase SQL Editor 执行本文件，或使用 supabase db push。
-- 执行前请备份。若表上已有同名 policy，请先 DROP POLICY 再执行对应段落。

-- ---------------------------------------------------------------------------
-- 1. profiles（与 auth.users 一对一）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  INSERT INTO public.profiles (id)
    VALUES (NEW.id)
  ON CONFLICT (id)
    DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user ();

-- ---------------------------------------------------------------------------
-- 2. 业务表增加 user_id（旧数据为 NULL，RLS 下对登录用户不可见）
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id);

ALTER TABLE public.comparison_results
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id);

ALTER TABLE public.product_optimizations
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id);

-- ---------------------------------------------------------------------------
-- 3. products RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select_own" ON public.products;
CREATE POLICY "products_select_own"
  ON public.products FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "products_insert_own" ON public.products;
CREATE POLICY "products_insert_own"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "products_update_own" ON public.products;
CREATE POLICY "products_update_own"
  ON public.products FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "products_delete_own" ON public.products;
CREATE POLICY "products_delete_own"
  ON public.products FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. product_analysis RLS（通过 product 归属判断）
-- ---------------------------------------------------------------------------
ALTER TABLE public.product_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_analysis_select_own" ON public.product_analysis;
CREATE POLICY "product_analysis_select_own"
  ON public.product_analysis FOR SELECT
  TO authenticated
  USING (EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = product_analysis.product_id
        AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "product_analysis_insert_own" ON public.product_analysis;
CREATE POLICY "product_analysis_insert_own"
  ON public.product_analysis FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = product_analysis.product_id
        AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "product_analysis_update_own" ON public.product_analysis;
CREATE POLICY "product_analysis_update_own"
  ON public.product_analysis FOR UPDATE
  TO authenticated
  USING (EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = product_analysis.product_id
        AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = product_analysis.product_id
        AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "product_analysis_delete_own" ON public.product_analysis;
CREATE POLICY "product_analysis_delete_own"
  ON public.product_analysis FOR DELETE
  TO authenticated
  USING (EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = product_analysis.product_id
        AND p.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 5. comparison_results RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.comparison_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comparison_results_select_own" ON public.comparison_results;
CREATE POLICY "comparison_results_select_own"
  ON public.comparison_results FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "comparison_results_insert_own" ON public.comparison_results;
CREATE POLICY "comparison_results_insert_own"
  ON public.comparison_results FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = first_product_id
        AND p.user_id = auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = second_product_id
        AND p.user_id = auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = third_product_id
        AND p.user_id = auth.uid())
    AND (
      winner_product_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.products p
        WHERE p.id = winner_product_id
          AND p.user_id = auth.uid())));

DROP POLICY IF EXISTS "comparison_results_update_own" ON public.comparison_results;
CREATE POLICY "comparison_results_update_own"
  ON public.comparison_results FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "comparison_results_delete_own" ON public.comparison_results;
CREATE POLICY "comparison_results_delete_own"
  ON public.comparison_results FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 6. product_optimizations RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.product_optimizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_optimizations_select_own" ON public.product_optimizations;
CREATE POLICY "product_optimizations_select_own"
  ON public.product_optimizations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "product_optimizations_insert_own" ON public.product_optimizations;
CREATE POLICY "product_optimizations_insert_own"
  ON public.product_optimizations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "product_optimizations_update_own" ON public.product_optimizations;
CREATE POLICY "product_optimizations_update_own"
  ON public.product_optimizations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "product_optimizations_delete_own" ON public.product_optimizations;
CREATE POLICY "product_optimizations_delete_own"
  ON public.product_optimizations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7. Storage：桶名 products，对象路径第一级为 auth.uid()
--    请在控制台将 bucket 设为 private，并删除「公开读整桶」类策略。
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "products_storage_insert_own" ON storage.objects;
CREATE POLICY "products_storage_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'products'
    AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "products_storage_select_own" ON storage.objects;
CREATE POLICY "products_storage_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'products'
    AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "products_storage_update_own" ON storage.objects;
CREATE POLICY "products_storage_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'products'
    AND (storage.foldername(name))[1] = (auth.uid())::text)
  WITH CHECK (
    bucket_id = 'products'
    AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "products_storage_delete_own" ON storage.objects;
CREATE POLICY "products_storage_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'products'
    AND (storage.foldername(name))[1] = (auth.uid())::text);

-- ---------------------------------------------------------------------------
-- 8. 已有 auth 用户补全 profiles（可选）
-- ---------------------------------------------------------------------------
INSERT INTO public.profiles (id)
  SELECT id
  FROM auth.users
  ON CONFLICT (id)
    DO NOTHING;
