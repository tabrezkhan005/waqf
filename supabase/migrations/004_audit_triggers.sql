-- ============================================
-- Audit Log Triggers
-- ============================================

-- Function to log changes to collections
CREATE OR REPLACE FUNCTION public.log_collection_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    action,
    table_name,
    row_id,
    details
  ) VALUES (
    auth.uid(),
    TG_OP,
    'collections',
    NEW.id::text,
    jsonb_build_object(
      'old', row_to_json(OLD),
      'new', row_to_json(NEW)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for collections
CREATE TRIGGER log_collection_changes
  AFTER INSERT OR UPDATE OR DELETE
  ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.log_collection_changes();

-- Function to log profile changes (admin actions)
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if role or district_id changed (admin actions)
  IF (OLD.role IS DISTINCT FROM NEW.role) OR
     (OLD.district_id IS DISTINCT FROM NEW.district_id) OR
     (OLD.device_id IS DISTINCT FROM NEW.device_id) THEN
    INSERT INTO public.audit_log (
      user_id,
      action,
      table_name,
      row_id,
      details
    ) VALUES (
      auth.uid(),
      TG_OP,
      'profiles',
      NEW.id::text,
      jsonb_build_object(
        'old', row_to_json(OLD),
        'new', row_to_json(NEW)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for profiles
CREATE TRIGGER log_profile_changes
  AFTER UPDATE
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_changes();

-- Function to log institution changes
CREATE OR REPLACE FUNCTION public.log_institution_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    action,
    table_name,
    row_id,
    details
  ) VALUES (
    auth.uid(),
    TG_OP,
    'institutions',
    NEW.id::text,
    jsonb_build_object(
      'old', row_to_json(OLD),
      'new', row_to_json(NEW)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for institutions
CREATE TRIGGER log_institution_changes
  AFTER INSERT OR UPDATE OR DELETE
  ON public.institutions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_institution_changes();




