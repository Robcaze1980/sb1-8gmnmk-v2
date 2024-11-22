-- Create trade_ins table
CREATE TABLE IF NOT EXISTS public.trade_ins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  comment text NOT NULL,
  date date NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.trade_ins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own trade-ins"
  ON public.trade_ins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trade-ins"
  ON public.trade_ins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trade-ins"
  ON public.trade_ins FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trade-ins"
  ON public.trade_ins FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_trade_ins_user_id ON public.trade_ins(user_id);
CREATE INDEX idx_trade_ins_date ON public.trade_ins(date);

-- Create trigger for updated_at
CREATE TRIGGER handle_trade_ins_updated_at
  BEFORE UPDATE ON public.trade_ins
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();