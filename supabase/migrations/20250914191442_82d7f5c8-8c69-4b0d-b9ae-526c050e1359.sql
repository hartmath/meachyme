-- Fix security warnings by updating functions with proper search_path

-- Update handle_new_user function to have secure search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email, avatar_url)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$function$;

-- Update update_updated_at_column function to have secure search_path  
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- Update create_notification_preferences function to have secure search_path
CREATE OR REPLACE FUNCTION public.create_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    INSERT INTO public.notification_preferences (user_id)
    VALUES (NEW.user_id);
    RETURN NEW;
END;
$function$;

-- Update update_status_view_count function to have secure search_path
CREATE OR REPLACE FUNCTION public.update_status_view_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  UPDATE public.status_posts 
  SET view_count = view_count + 1 
  WHERE id = NEW.status_id;
  RETURN NEW;
END;
$function$;