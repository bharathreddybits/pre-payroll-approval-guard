-- Add Trial Tracking to Subscriptions
-- Adds trial_end_date and trial_days fields to track free trials

-- Add trial_end_date column
ALTER TABLE public.subscription
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE;

-- Add trial_days column (for reference)
ALTER TABLE public.subscription
ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 7;

-- Add comments
COMMENT ON COLUMN public.subscription.trial_end_date IS 'Date when the free trial ends (NULL if not on trial)';
COMMENT ON COLUMN public.subscription.trial_days IS 'Number of trial days offered (typically 7)';

-- Create function to check if trial has expired
CREATE OR REPLACE FUNCTION public.is_trial_expired(sub_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  subscription_record RECORD;
BEGIN
  SELECT status, trial_end_date
  INTO subscription_record
  FROM public.subscription
  WHERE id = sub_id;

  -- If subscription doesn't exist, consider trial expired
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  -- If status is 'trialing' and trial_end_date has passed
  IF subscription_record.status = 'trialing' AND
     subscription_record.trial_end_date IS NOT NULL AND
     subscription_record.trial_end_date < NOW() THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get days remaining in trial
CREATE OR REPLACE FUNCTION public.trial_days_remaining(sub_id UUID)
RETURNS INTEGER AS $$
DECLARE
  subscription_record RECORD;
  days_left INTEGER;
BEGIN
  SELECT status, trial_end_date
  INTO subscription_record
  FROM public.subscription
  WHERE id = sub_id;

  -- If subscription doesn't exist, return 0
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- If not trialing, return 0
  IF subscription_record.status != 'trialing' OR subscription_record.trial_end_date IS NULL THEN
    RETURN 0;
  END IF;

  -- Calculate days remaining
  days_left := EXTRACT(DAY FROM (subscription_record.trial_end_date - NOW()));

  -- Return 0 if negative (trial expired)
  IF days_left < 0 THEN
    RETURN 0;
  END IF;

  RETURN days_left;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_trial_expired IS 'Checks if a subscription trial has expired';
COMMENT ON FUNCTION public.trial_days_remaining IS 'Returns number of days remaining in trial (0 if expired or not trialing)';
