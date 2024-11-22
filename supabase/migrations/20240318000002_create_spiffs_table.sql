-- Create spiffs table
CREATE TABLE IF NOT EXISTS public.spiffs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  note text,
  image_url text,
  date date NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.spiffs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own spiffs"
  ON public.spiffs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own spiffs"
  ON public.spiffs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spiffs"
  ON public.spiffs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own spiffs"
  ON public.spiffs FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER handle_spiffs_updated_at
  BEFORE UPDATE ON public.spiffs
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create index
CREATE INDEX idx_spiffs_user_id ON public.spiffs(user_id);
CREATE INDEX idx_spiffs_date ON public.spiffs(date);

-- Remove spiff columns from sales table
ALTER TABLE public.sales 
  DROP COLUMN IF EXISTS spiff_amount,
  DROP COLUMN IF EXISTS spiff_note,
  DROP COLUMN IF EXISTS spiff_image_url;