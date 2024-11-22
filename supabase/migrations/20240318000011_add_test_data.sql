-- First, let's verify and create the users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create users policy
CREATE POLICY "Users can view their own data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Create trigger function for users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create sales table if it doesn't exist (with all required columns)
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stock_number text NOT NULL,
  customer_name text NOT NULL,
  sale_type text CHECK (sale_type IN ('New', 'Used', 'Trade-In')) NOT NULL,
  sale_price numeric(10,2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
  accessories_price numeric(10,2) DEFAULT 0 CHECK (accessories_price >= 0),
  warranty_price numeric(10,2) DEFAULT 0 CHECK (warranty_price >= 0),
  warranty_cost numeric(10,2) DEFAULT 0 CHECK (warranty_cost >= 0),
  maintenance_price numeric(10,2) DEFAULT 0 CHECK (maintenance_price >= 0),
  maintenance_cost numeric(10,2) DEFAULT 0 CHECK (maintenance_cost >= 0),
  shared_with_id uuid REFERENCES auth.users(id),
  shared_with_email text,
  shared_status text CHECK (shared_status IN ('pending', 'accepted', 'rejected')),
  trade_in_commission numeric(10,2) DEFAULT 0 CHECK (trade_in_commission >= 0),
  date date NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT shared_status_check CHECK (
    (shared_with_id IS NULL AND shared_with_email IS NULL AND shared_status IS NULL) OR
    (shared_with_id IS NOT NULL AND shared_with_email IS NOT NULL AND shared_status IS NOT NULL)
  )
);

-- Enable RLS on sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Create spiffs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.spiffs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  note text,
  image_url text,
  date date NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on spiffs
ALTER TABLE public.spiffs ENABLE ROW LEVEL SECURITY;

-- Recreate all policies
DROP POLICY IF EXISTS "Users can view their own sales and sales shared with them" ON public.sales;
CREATE POLICY "Users can view their own sales and sales shared with them"
  ON public.sales FOR SELECT
  USING (
    auth.uid() = user_id OR 
    auth.uid() = shared_with_id
  );

DROP POLICY IF EXISTS "Users can insert their own sales" ON public.sales;
CREATE POLICY "Users can insert their own sales"
  ON public.sales FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sales" ON public.sales;
CREATE POLICY "Users can update their own sales"
  ON public.sales FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own sales" ON public.sales;
CREATE POLICY "Users can delete their own sales"
  ON public.sales FOR DELETE
  USING (auth.uid() = user_id);

-- Spiff policies
DROP POLICY IF EXISTS "Users can view their own spiffs" ON public.spiffs;
CREATE POLICY "Users can view their own spiffs"
  ON public.spiffs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own spiffs" ON public.spiffs;
CREATE POLICY "Users can insert their own spiffs"
  ON public.spiffs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own spiffs" ON public.spiffs;
CREATE POLICY "Users can update their own spiffs"
  ON public.spiffs FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own spiffs" ON public.spiffs;
CREATE POLICY "Users can delete their own spiffs"
  ON public.spiffs FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('sales-documents', 'sales-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
DROP POLICY IF EXISTS "Anyone can view sales documents" ON storage.objects;
CREATE POLICY "Anyone can view sales documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sales-documents');

DROP POLICY IF EXISTS "Authenticated users can upload sales documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload sales documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'sales-documents' 
    AND auth.role() = 'authenticated'
  );