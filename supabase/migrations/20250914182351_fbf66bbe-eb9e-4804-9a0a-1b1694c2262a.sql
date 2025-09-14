-- Update existing profiles with names based on their email
UPDATE profiles 
SET full_name = CASE 
  WHEN full_name IS NULL OR full_name = '' THEN 
    INITCAP(SPLIT_PART(email, '@', 1))
  ELSE full_name 
END
WHERE full_name IS NULL OR full_name = '';

-- Also set better user_types for variety
UPDATE profiles 
SET user_type = CASE 
  WHEN user_id = '5e6a835b-50c6-4058-9474-e5686fd78145' THEN 'event_organizer'
  WHEN user_id = '89d4a6a8-eab5-4501-a7de-1addfb4f6fcb' THEN 'vendor'
  WHEN user_id = 'c049b288-6c9b-43dc-a966-28b67a6720c3' THEN 'venue_owner'
  WHEN user_id = '20a3594a-eaf3-4699-b1f2-5b268412438f' THEN 'wedding_planner'
  WHEN user_id = '8323528e-f7b5-469a-b105-7bea93af0cc0' THEN 'av_technician'
  ELSE user_type
END;