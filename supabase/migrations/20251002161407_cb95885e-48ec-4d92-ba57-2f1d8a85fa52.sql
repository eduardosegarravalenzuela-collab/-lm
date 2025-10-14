-- Create trackers table
CREATE TABLE IF NOT EXISTS public.trackers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  is_essential boolean DEFAULT false NOT NULL,
  is_at_home boolean DEFAULT true NOT NULL,
  last_reported_lat double precision NOT NULL,
  last_reported_lng double precision NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.trackers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own trackers"
  ON public.trackers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trackers"
  ON public.trackers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trackers"
  ON public.trackers
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trackers"
  ON public.trackers
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.trackers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create user_settings table for home location
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  home_lat double precision NOT NULL DEFAULT 40.7128,
  home_lng double precision NOT NULL DEFAULT -74.0060,
  geofence_radius_meters double precision NOT NULL DEFAULT 80.0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS for user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
CREATE POLICY "Users can view their own settings"
  ON public.user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.user_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER set_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();