-- Drop the existing foreign key constraint on shared_with
ALTER TABLE public.sales
DROP CONSTRAINT IF EXISTS sales_shared_with_fkey;

-- Add a new function to get user_id from email
CREATE OR REPLACE FUNCTION get_user_id_from_email(email_address text)
RETURNS uuid AS $$
BEGIN
  RETURN (SELECT id FROM auth.users WHERE email = email_address LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modify the shared_with column to reference auth.users.id instead of email
ALTER TABLE public.sales
DROP COLUMN IF EXISTS shared_with CASCADE;

ALTER TABLE public.sales
ADD COLUMN shared_with_email text,
ADD COLUMN shared_with_id uuid REFERENCES auth.users(id);

-- Update the shared sale notification function
CREATE OR REPLACE FUNCTION create_shared_sale_notification()
RETURNS trigger AS $$
BEGIN
  IF NEW.shared_with_email IS NOT NULL AND NEW.shared_status = 'pending' THEN
    -- Get the user_id for the shared email
    NEW.shared_with_id := get_user_id_from_email(NEW.shared_with_email);
    
    -- Create notification
    INSERT INTO public.notifications (user_id, sale_id, type)
    VALUES (NEW.shared_with_id, NEW.id, 'shared_sale_pending');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;