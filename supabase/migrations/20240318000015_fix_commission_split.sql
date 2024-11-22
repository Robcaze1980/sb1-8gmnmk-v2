-- Drop existing commission_split column if it exists
ALTER TABLE public.sales 
DROP COLUMN IF EXISTS commission_split;

-- Add commission_split column with proper constraints
ALTER TABLE public.sales
ADD COLUMN commission_split integer DEFAULT 50 CHECK (commission_split BETWEEN 0 AND 100);

-- Update notifications query function
CREATE OR REPLACE FUNCTION get_shared_sale_notifications(user_id uuid)
RETURNS TABLE (
  id uuid,
  sale_id uuid,
  type text,
  read boolean,
  created_at timestamptz,
  sale_details jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.sale_id,
    n.type,
    n.read,
    n.created_at,
    jsonb_build_object(
      'id', s.id,
      'stock_number', s.stock_number,
      'customer_name', s.customer_name,
      'sale_type', s.sale_type,
      'sale_price', s.sale_price,
      'commission_split', s.commission_split,
      'date', s.date
    ) as sale_details
  FROM notifications n
  JOIN sales s ON s.id = n.sale_id
  WHERE n.user_id = get_shared_sale_notifications.user_id
  AND n.read = false
  ORDER BY n.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;