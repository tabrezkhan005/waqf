-- ============================================
-- Notifications & Announcements System
-- Adds notifications table and rejection_reason to collections
-- ============================================

-- Add rejection_reason to collections table
ALTER TABLE public.collections
ADD COLUMN IF NOT EXISTS rejection_reason text;

COMMENT ON COLUMN public.collections.rejection_reason IS
  'Reason provided by accounts when rejecting a collection';

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type          text NOT NULL CHECK (type IN (
    'announcement',
    'payment_review',
    'payment_verified',
    'payment_rejected',
    'system'
  )),
  title         text NOT NULL,
  message       text NOT NULL,
  related_id    text, -- Can reference collection_id, announcement_id, etc.
  related_type  text, -- 'collection', 'announcement', etc.
  is_read       boolean NOT NULL DEFAULT false,
  read_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- ============================================
-- ANNOUNCEMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.announcements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title         text NOT NULL,
  message       text NOT NULL,
  target_roles  text[] NOT NULL DEFAULT ARRAY[]::text[], -- ['inspector', 'accounts', etc.]
  target_users  uuid[], -- Specific user IDs (optional)
  is_active     boolean NOT NULL DEFAULT true,
  expires_at    timestamptz, -- Optional expiration
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON public.announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Notifications: Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = recipient_id);

-- Notifications: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = recipient_id);

-- Notifications: Admins can create notifications
CREATE POLICY "Admins can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Announcements: Everyone can view active announcements
CREATE POLICY "Everyone can view active announcements"
  ON public.announcements
  FOR SELECT
  USING (is_active = true);

-- Announcements: Only admins can create/update/delete
CREATE POLICY "Admins can manage announcements"
  ON public.announcements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to create notification when collection is sent to accounts
CREATE OR REPLACE FUNCTION notify_accounts_on_payment_review()
RETURNS TRIGGER AS $$
DECLARE
  v_inspector_name text;
  v_institution_name text;
  v_accounts_users uuid[];
BEGIN
  -- Only trigger when status changes to 'sent_to_accounts'
  IF NEW.status = 'sent_to_accounts' AND (OLD.status IS NULL OR OLD.status != 'sent_to_accounts') THEN
    -- Get inspector and institution names
    SELECT p.full_name INTO v_inspector_name
    FROM public.profiles p
    WHERE p.id = NEW.inspector_id;

    SELECT i.name INTO v_institution_name
    FROM public.institutions i
    WHERE i.id = NEW.institution_id;

    -- Get all accounts users
    SELECT ARRAY_AGG(id) INTO v_accounts_users
    FROM public.profiles
    WHERE role = 'accounts';

    -- Create notifications for all accounts users
    IF v_accounts_users IS NOT NULL THEN
      INSERT INTO public.notifications (recipient_id, type, title, message, related_id, related_type)
      SELECT
        user_id,
        'payment_review',
        'Payment Review Required',
        COALESCE(v_inspector_name, 'An inspector') || ' has sent a payment of ₹' ||
        NEW.total_amount::text || ' for ' || COALESCE(v_institution_name, 'an institution') || ' for review.',
        NEW.id::text,
        'collection'
      FROM unnest(v_accounts_users) AS user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for payment review notifications
DROP TRIGGER IF EXISTS trigger_notify_accounts_on_payment_review ON public.collections;
CREATE TRIGGER trigger_notify_accounts_on_payment_review
  AFTER INSERT OR UPDATE OF status ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION notify_accounts_on_payment_review();

-- Function to notify inspector when payment is verified/rejected
CREATE OR REPLACE FUNCTION notify_inspector_on_payment_decision()
RETURNS TRIGGER AS $$
DECLARE
  v_institution_name text;
  v_message text;
  v_notification_type text;
BEGIN
  -- Only trigger when status changes to verified or rejected
  IF (NEW.status = 'verified' OR NEW.status = 'rejected') AND
     (OLD.status IS NULL OR (OLD.status != 'verified' AND OLD.status != 'rejected')) THEN

    SELECT i.name INTO v_institution_name
    FROM public.institutions i
    WHERE i.id = NEW.institution_id;

    IF NEW.status = 'verified' THEN
      v_notification_type := 'payment_verified';
      v_message := 'Your payment of ₹' || NEW.total_amount::text ||
                   ' for ' || COALESCE(v_institution_name, 'an institution') ||
                   ' has been verified and accepted.';
    ELSE
      v_notification_type := 'payment_rejected';
      v_message := 'Your payment of ₹' || NEW.total_amount::text ||
                   ' for ' || COALESCE(v_institution_name, 'an institution') ||
                   ' has been rejected.';
      IF NEW.rejection_reason IS NOT NULL THEN
        v_message := v_message || ' Reason: ' || NEW.rejection_reason;
      END IF;
    END IF;

    -- Create notification for inspector
    INSERT INTO public.notifications (recipient_id, sender_id, type, title, message, related_id, related_type)
    VALUES (
      NEW.inspector_id,
      NEW.verified_by,
      v_notification_type,
      CASE
        WHEN NEW.status = 'verified' THEN 'Payment Verified'
        ELSE 'Payment Rejected'
      END,
      v_message,
      NEW.id::text,
      'collection'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for inspector notifications
DROP TRIGGER IF EXISTS trigger_notify_inspector_on_payment_decision ON public.collections;
CREATE TRIGGER trigger_notify_inspector_on_payment_decision
  AFTER UPDATE OF status, verified_by, verified_at, rejection_reason ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION notify_inspector_on_payment_decision();

-- Function to create notifications when announcement is created
CREATE OR REPLACE FUNCTION notify_users_on_announcement()
RETURNS TRIGGER AS $$
DECLARE
  v_target_users uuid[];
BEGIN
  -- If specific users are targeted
  IF NEW.target_users IS NOT NULL AND array_length(NEW.target_users, 1) > 0 THEN
    v_target_users := NEW.target_users;
  ELSE
    -- Get all users with target roles
    SELECT ARRAY_AGG(id) INTO v_target_users
    FROM public.profiles
    WHERE role = ANY(NEW.target_roles);
  END IF;

  -- Create notifications
  IF v_target_users IS NOT NULL AND array_length(v_target_users, 1) > 0 THEN
    INSERT INTO public.notifications (recipient_id, sender_id, type, title, message, related_id, related_type)
    SELECT
      user_id,
      NEW.created_by,
      'announcement',
      NEW.title,
      NEW.message,
      NEW.id::text,
      'announcement'
    FROM unnest(v_target_users) AS user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for announcements
DROP TRIGGER IF EXISTS trigger_notify_users_on_announcement ON public.announcements;
CREATE TRIGGER trigger_notify_users_on_announcement
  AFTER INSERT ON public.announcements
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION notify_users_on_announcement();

-- Update timestamp trigger for announcements
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_announcements_updated_at ON public.announcements;
CREATE TRIGGER trigger_update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcements_updated_at();

COMMENT ON TABLE public.notifications IS
  'System notifications for users including announcements and payment review updates';
COMMENT ON TABLE public.announcements IS
  'Announcements created by admins to notify specific roles or users';
