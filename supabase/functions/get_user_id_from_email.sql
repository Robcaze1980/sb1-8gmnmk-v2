-- Function to get user ID from email
CREATE OR REPLACE FUNCTION get_user_id_from_email(email_address text)
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT id 
    FROM auth.users 
    WHERE email = email_address 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;